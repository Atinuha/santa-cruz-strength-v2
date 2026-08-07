import asyncio
import copy
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys
from types import SimpleNamespace


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from lead_outbox import (  # noqa: E402
    PROCESSING,
    QuarantinedReplayRefused,
    RETRY_SCHEDULED,
    SUCCEEDED,
    TERMINAL_FAILED,
    claim_due_job,
    enqueue_lead_received_jobs,
    enqueue_outbox_job,
    mark_delivery_begun,
    mark_job_failed,
    mark_job_succeeded,
    replay_terminal_failure,
    quarantine_expired_delivery_begun_job,
    terminalize_expired_exhausted_job,
)


NOW = datetime(2026, 8, 3, 12, 0, tzinfo=timezone.utc)


def _expression_value(document, expression):
    if isinstance(expression, str) and expression.startswith('$'):
        return document.get(expression[1:])
    if isinstance(expression, dict) and '$ifNull' in expression:
        value, fallback = expression['$ifNull']
        resolved = _expression_value(document, value)
        return fallback if resolved is None else resolved
    return expression


def _matches(document, query):
    for key, expected in query.items():
        if key == '$or':
            if not any(_matches(document, item) for item in expected):
                return False
            continue
        if key == '$expr':
            if '$lt' in expected:
                left, right = expected['$lt']
                if not (_expression_value(document, left) < _expression_value(document, right)):
                    return False
            elif '$gte' in expected:
                left, right = expected['$gte']
                if not (_expression_value(document, left) >= _expression_value(document, right)):
                    return False
            else:
                raise AssertionError(f'Unsupported expression in test double: {expected}')
            continue
        actual = document.get(key)
        if isinstance(expected, dict):
            for operator, value in expected.items():
                if operator == '$in' and actual not in value:
                    return False
                if operator == '$lte' and (actual is None or actual > value):
                    return False
                if operator == '$gt' and (actual is None or actual <= value):
                    return False
                if operator == '$ne' and actual == value:
                    return False
                if operator == '$exists' and (key in document) is not bool(value):
                    return False
        elif actual != expected:
            return False
    return True


def _apply_update(document, update, inserted=False):
    if inserted:
        document.update(copy.deepcopy(update.get('$setOnInsert', {})))
    document.update(copy.deepcopy(update.get('$set', {})))
    for key, amount in update.get('$inc', {}).items():
        document[key] = document.get(key, 0) + amount
    for key, value in update.get('$push', {}).items():
        document.setdefault(key, []).append(copy.deepcopy(value))


class MemoryCollection:
    def __init__(self):
        self.documents = []

    async def update_one(self, query, update, upsert=False):
        for document in self.documents:
            if _matches(document, query):
                before = copy.deepcopy(document)
                _apply_update(document, update)
                return SimpleNamespace(modified_count=int(before != document), upserted_id=None)
        if not upsert:
            return SimpleNamespace(modified_count=0, upserted_id=None)
        document = {}
        _apply_update(document, update, inserted=True)
        self.documents.append(document)
        return SimpleNamespace(modified_count=0, upserted_id=document.get('id'))

    async def find_one(self, query, projection=None):
        for document in self.documents:
            if _matches(document, query):
                return copy.deepcopy(document)
        return None

    async def find_one_and_update(
        self,
        query,
        update,
        sort=None,
        return_document=None,
        projection=None,
    ):
        candidates = [document for document in self.documents if _matches(document, query)]
        if not candidates:
            return None
        if sort:
            candidates.sort(key=lambda item: tuple(item.get(key) or '' for key, _ in sort))
        document = candidates[0]
        _apply_update(document, update)
        return copy.deepcopy(document)


class LeadOutboxTests(unittest.TestCase):
    def run_async(self, coroutine):
        return asyncio.run(coroutine)

    def test_enqueue_is_idempotent_and_keeps_one_stable_delivery_key(self):
        collection = MemoryCollection()
        first = self.run_async(enqueue_outbox_job(
            collection,
            idempotency_key='lead-1:email:ack',
            lead_id='lead-1',
            event_type='lead.acknowledgement.requested',
            channel='email',
            created_at=NOW,
        ))
        second = self.run_async(enqueue_outbox_job(
            collection,
            idempotency_key='lead-1:email:ack',
            lead_id='lead-1',
            event_type='lead.acknowledgement.requested',
            channel='email',
            created_at=NOW + timedelta(minutes=1),
        ))

        self.assertEqual(len(collection.documents), 1)
        self.assertEqual(first['id'], second['id'])
        self.assertEqual(first['delivery_key'], second['delivery_key'])

    def test_lead_jobs_are_consent_safe_and_contain_no_contact_pii(self):
        collection = MemoryCollection()
        jobs = self.run_async(enqueue_lead_received_jobs(
            collection,
            {
                'id': 'lead-1',
                'brand_id': 'santa_cruz_strength',
                'location_id': 'santa_cruz_ca',
                'email': 'person@example.com',
                'phone': '+14085550123',
                'sms_operational_opt_in': False,
            },
            '9a944ef9-2e31-4301-954b-23b2d38f0817',
            NOW,
        ))

        self.assertEqual([job['channel'] for job in jobs], ['email', 'email'])
        serialized = repr(jobs)
        self.assertNotIn('person@example.com', serialized)
        self.assertNotIn('+14085550123', serialized)

    def test_consented_operational_sms_is_queued_once(self):
        collection = MemoryCollection()
        lead = {
            'id': 'lead-1',
            'sms_operational_opt_in': True,
            'sms_opted_out': False,
        }
        first = self.run_async(enqueue_lead_received_jobs(
            collection, lead, '5818ac86-bcb4-4de7-adc2-cc826dfe3e59', NOW
        ))
        second = self.run_async(enqueue_lead_received_jobs(
            collection, lead, '5818ac86-bcb4-4de7-adc2-cc826dfe3e59', NOW
        ))

        self.assertEqual(len(first), 3)
        self.assertEqual(len(second), 3)
        self.assertEqual(len(collection.documents), 3)
        self.assertEqual(sum(job['channel'] == 'sms' for job in collection.documents), 1)

    def test_retry_keeps_identity_and_terminal_failure_is_visible(self):
        collection = MemoryCollection()
        job = self.run_async(enqueue_outbox_job(
            collection,
            idempotency_key='lead-1:email:ack',
            lead_id='lead-1',
            event_type='lead.acknowledgement.requested',
            channel='email',
            max_attempts=2,
            created_at=NOW,
        ))
        claimed = self.run_async(claim_due_job(collection, worker_id='worker-1', now=NOW))
        retry = self.run_async(mark_job_failed(
            collection,
            job_id=claimed['id'],
            worker_id='worker-1',
            reservation_token=claimed['delivery_reservation_token'],
            error_code='timeout',
            error_message='Provider timed out',
            retryable=True,
            now=NOW,
        ))
        claimed_again = self.run_async(claim_due_job(
            collection,
            worker_id='worker-2',
            now=NOW + timedelta(seconds=31),
        ))
        terminal = self.run_async(mark_job_failed(
            collection,
            job_id=claimed_again['id'],
            worker_id='worker-2',
            reservation_token=claimed_again['delivery_reservation_token'],
            error_code='timeout',
            error_message='Provider timed out again',
            retryable=True,
            now=NOW + timedelta(seconds=31),
        ))

        self.assertEqual(claimed['status'], PROCESSING)
        self.assertEqual(retry['status'], RETRY_SCHEDULED)
        self.assertEqual(claimed_again['attempt_count'], 2)
        self.assertEqual(terminal['status'], TERMINAL_FAILED)
        self.assertEqual(job['id'], terminal['id'])
        self.assertEqual(job['delivery_key'], terminal['delivery_key'])
        self.assertIsNotNone(terminal['terminal_failure_at'])

    def test_success_requires_current_worker_lease(self):
        collection = MemoryCollection()
        self.run_async(enqueue_outbox_job(
            collection,
            idempotency_key='lead-1:email:ack',
            lead_id='lead-1',
            event_type='lead.acknowledgement.requested',
            channel='email',
            created_at=NOW,
        ))
        claimed = self.run_async(claim_due_job(collection, worker_id='worker-1', now=NOW))
        begun = self.run_async(mark_delivery_begun(
            collection,
            job_id=claimed['id'],
            worker_id='worker-1',
            reservation_token=claimed['delivery_reservation_token'],
            now=NOW,
        ))
        denied = self.run_async(mark_job_succeeded(
            collection,
            job_id=claimed['id'],
            worker_id='worker-2',
            reservation_token=claimed['delivery_reservation_token'],
            now=NOW,
        ))
        succeeded = self.run_async(mark_job_succeeded(
            collection,
            job_id=claimed['id'],
            worker_id='worker-1',
            reservation_token=claimed['delivery_reservation_token'],
            provider_message_id='provider-1',
            now=NOW,
        ))

        self.assertIsNone(denied)
        self.assertEqual(begun['delivery_state'], 'begun')
        self.assertEqual(succeeded['status'], SUCCEEDED)
        self.assertEqual(succeeded['provider_message_id'], 'provider-1')

    def test_expired_processing_lease_can_be_reclaimed_but_stale_owner_cannot_commit(self):
        collection = MemoryCollection()
        self.run_async(enqueue_outbox_job(
            collection,
            idempotency_key='lead-1:email:ack',
            lead_id='lead-1',
            event_type='lead.acknowledgement.requested',
            channel='email',
            created_at=NOW,
        ))
        first = self.run_async(claim_due_job(
            collection, worker_id='worker-1', now=NOW, lease_seconds=15
        ))
        before_expiry = self.run_async(claim_due_job(
            collection, worker_id='worker-2', now=NOW + timedelta(seconds=14)
        ))
        second = self.run_async(claim_due_job(
            collection, worker_id='worker-2', now=NOW + timedelta(seconds=16)
        ))
        stale_commit = self.run_async(mark_job_succeeded(
            collection,
            job_id=first['id'],
            worker_id='worker-1',
            reservation_token=first['delivery_reservation_token'],
            now=NOW + timedelta(seconds=16),
        ))

        self.assertIsNone(before_expiry)
        self.assertEqual(second['locked_by'], 'worker-2')
        self.assertEqual(second['attempt_count'], 2)
        self.assertIsNone(stale_commit)

    def test_maxed_out_expired_job_is_terminalized_and_cannot_be_reclaimed(self):
        collection = MemoryCollection()
        self.run_async(enqueue_outbox_job(
            collection,
            idempotency_key='lead-1:email:ack',
            lead_id='lead-1',
            event_type='lead.acknowledgement.requested',
            channel='email',
            max_attempts=1,
            created_at=NOW,
        ))
        first = self.run_async(claim_due_job(
            collection, worker_id='worker-1', now=NOW, lease_seconds=15
        ))
        reclaimed = self.run_async(claim_due_job(
            collection, worker_id='worker-2', now=NOW + timedelta(seconds=16)
        ))

        stored = collection.documents[0]
        self.assertEqual(first['attempt_count'], 1)
        self.assertIsNone(reclaimed)
        self.assertEqual(stored['attempt_count'], 1)
        self.assertEqual(stored['total_attempt_count'], 1)
        self.assertEqual(stored['status'], TERMINAL_FAILED)
        self.assertEqual(stored['last_error_code'], 'attempts_exhausted_before_claim')
        self.assertEqual(
            stored['terminal_failure_at'],
            (NOW + timedelta(seconds=16)).isoformat(),
        )

    def test_expired_processing_job_retries_then_terminalizes_deterministically(self):
        collection = MemoryCollection()
        self.run_async(enqueue_outbox_job(
            collection,
            idempotency_key='lead-1:email:ack',
            lead_id='lead-1',
            event_type='lead.acknowledgement.requested',
            channel='email',
            max_attempts=2,
            created_at=NOW,
        ))
        first = self.run_async(claim_due_job(
            collection, worker_id='worker-1', now=NOW, lease_seconds=15
        ))
        second = self.run_async(claim_due_job(
            collection, worker_id='worker-2', now=NOW + timedelta(seconds=16), lease_seconds=15
        ))
        third = self.run_async(claim_due_job(
            collection, worker_id='worker-3', now=NOW + timedelta(seconds=32)
        ))

        stored = collection.documents[0]
        self.assertEqual(first['attempt_count'], 1)
        self.assertEqual(second['attempt_count'], 2)
        self.assertIsNone(third)
        self.assertEqual(stored['status'], TERMINAL_FAILED)
        self.assertEqual(stored['attempt_count'], 2)
        self.assertEqual(stored['total_attempt_count'], 2)

    def test_terminal_recovery_is_idempotent_and_requires_expired_lease(self):
        collection = MemoryCollection()
        self.run_async(enqueue_outbox_job(
            collection,
            idempotency_key='lead-1:email:ack',
            lead_id='lead-1',
            event_type='lead.acknowledgement.requested',
            channel='email',
            max_attempts=1,
            created_at=NOW,
        ))
        self.run_async(claim_due_job(
            collection, worker_id='worker-1', now=NOW, lease_seconds=15
        ))

        before_expiry = self.run_async(terminalize_expired_exhausted_job(
            collection, now=NOW + timedelta(seconds=14)
        ))
        recovered = self.run_async(terminalize_expired_exhausted_job(
            collection, now=NOW + timedelta(seconds=16)
        ))
        repeated = self.run_async(terminalize_expired_exhausted_job(
            collection, now=NOW + timedelta(seconds=17)
        ))

        self.assertIsNone(before_expiry)
        self.assertEqual(recovered['status'], TERMINAL_FAILED)
        self.assertIsNone(repeated)

    def test_terminal_replay_is_explicit_and_does_not_create_a_new_job(self):
        collection = MemoryCollection()
        self.run_async(enqueue_outbox_job(
            collection,
            idempotency_key='lead-1:email:ack',
            lead_id='lead-1',
            event_type='lead.acknowledgement.requested',
            channel='email',
            max_attempts=1,
            created_at=NOW,
        ))
        claimed = self.run_async(claim_due_job(collection, worker_id='worker-1', now=NOW))
        terminal = self.run_async(mark_job_failed(
            collection,
            job_id=claimed['id'],
            worker_id='worker-1',
            reservation_token=claimed['delivery_reservation_token'],
            error_code='rejected',
            error_message='Permanent rejection',
            retryable=False,
            now=NOW,
        ))
        replay = self.run_async(replay_terminal_failure(
            collection,
            job_id=terminal['id'],
            actor_id='admin-1',
            reason='Configuration was corrected',
            now=NOW + timedelta(minutes=5),
        ))

        self.assertEqual(len(collection.documents), 1)
        self.assertEqual(replay['status'], RETRY_SCHEDULED)
        self.assertEqual(replay['attempt_count'], 0)
        self.assertEqual(replay['total_attempt_count'], 1)
        self.assertEqual(replay['replay_count'], 1)
        self.assertEqual(replay['replay_history'][0]['actor_id'], 'admin-1')
        self.assertEqual(replay['delivery_key'], terminal['delivery_key'])

    def test_expired_delivery_begun_is_quarantined_and_never_auto_reclaimed(self):
        collection = MemoryCollection()
        self.run_async(enqueue_outbox_job(
            collection,
            idempotency_key='lead-1:sms:ack',
            lead_id='lead-1',
            event_type='lead.acknowledgement.requested',
            channel='sms',
            created_at=NOW,
        ))
        claimed = self.run_async(claim_due_job(
            collection, worker_id='worker-1', now=NOW, lease_seconds=15
        ))
        self.run_async(mark_delivery_begun(
            collection,
            job_id=claimed['id'],
            worker_id='worker-1',
            reservation_token=claimed['delivery_reservation_token'],
            now=NOW,
        ))
        quarantined = self.run_async(quarantine_expired_delivery_begun_job(
            collection, now=NOW + timedelta(seconds=16)
        ))
        reclaimed = self.run_async(claim_due_job(
            collection, worker_id='worker-2', now=NOW + timedelta(seconds=17)
        ))

        self.assertEqual(quarantined['status'], TERMINAL_FAILED)
        self.assertEqual(quarantined['delivery_state'], 'quarantined')
        self.assertEqual(
            quarantined['last_error_code'],
            'delivery_outcome_unknown_after_lease_expiry',
        )
        self.assertIsNone(reclaimed)

    def test_expired_pre_send_attempt_retries_with_a_new_reservation_token(self):
        collection = MemoryCollection()
        self.run_async(enqueue_outbox_job(
            collection,
            idempotency_key='lead-1:email:ack',
            lead_id='lead-1',
            event_type='lead.acknowledgement.requested',
            channel='email',
            created_at=NOW,
        ))
        first = self.run_async(claim_due_job(
            collection, worker_id='worker-1', now=NOW, lease_seconds=15
        ))
        second = self.run_async(claim_due_job(
            collection, worker_id='worker-2', now=NOW + timedelta(seconds=16), lease_seconds=15
        ))

        self.assertEqual(second['attempt_count'], 2)
        self.assertNotEqual(
            first['delivery_reservation_token'],
            second['delivery_reservation_token'],
        )
        self.assertIsNone(second['delivery_begun_at'])

    def test_stale_worker_token_cannot_mutate_a_manually_replayed_attempt(self):
        collection = MemoryCollection()
        self.run_async(enqueue_outbox_job(
            collection,
            idempotency_key='lead-1:sms:ack',
            lead_id='lead-1',
            event_type='lead.acknowledgement.requested',
            channel='sms',
            created_at=NOW,
        ))
        first = self.run_async(claim_due_job(collection, worker_id='worker-1', now=NOW))
        self.run_async(mark_delivery_begun(
            collection,
            job_id=first['id'],
            worker_id='worker-1',
            reservation_token=first['delivery_reservation_token'],
            now=NOW,
        ))
        terminal = self.run_async(mark_job_failed(
            collection,
            job_id=first['id'],
            worker_id='worker-1',
            reservation_token=first['delivery_reservation_token'],
            error_code='twilio_delivery_unknown',
            error_message='Outcome unknown',
            retryable=False,
            now=NOW,
        ))
        self.run_async(replay_terminal_failure(
            collection,
            job_id=terminal['id'],
            actor_id='admin-1',
            reason='Provider history reconciled before replay',
            now=NOW + timedelta(minutes=1),
        ))
        second = self.run_async(claim_due_job(
            collection,
            worker_id='worker-2',
            now=NOW + timedelta(minutes=1),
        ))
        stale = self.run_async(mark_job_failed(
            collection,
            job_id=first['id'],
            worker_id='worker-1',
            reservation_token=first['delivery_reservation_token'],
            error_code='stale',
            error_message='Stale worker',
            retryable=False,
            now=NOW + timedelta(minutes=1),
        ))

        self.assertIsNone(stale)
        self.assertEqual(collection.documents[0]['locked_by'], 'worker-2')
        self.assertEqual(
            collection.documents[0]['delivery_reservation_token'],
            second['delivery_reservation_token'],
        )
        self.assertNotEqual(
            first['delivery_reservation_token'],
            second['delivery_reservation_token'],
        )

    def _quarantined_sms_job(self, collection):
        """Drive a real SMS job into the outcome-unknown quarantine state."""
        self.run_async(enqueue_outbox_job(
            collection,
            idempotency_key='lead-1:sms:ack',
            lead_id='lead-1',
            event_type='lead.acknowledgement.requested',
            channel='sms',
            max_attempts=3,
            created_at=NOW,
        ))
        claimed = self.run_async(claim_due_job(
            collection, worker_id='worker-1', now=NOW, lease_seconds=15
        ))
        self.run_async(mark_delivery_begun(
            collection,
            job_id=claimed['id'],
            worker_id='worker-1',
            reservation_token=claimed['delivery_reservation_token'],
            now=NOW,
        ))
        return self.run_async(quarantine_expired_delivery_begun_job(
            collection, now=NOW + timedelta(seconds=30)
        ))

    def test_quarantined_replay_is_refused_without_operator_confirmation(self):
        # Twilio accepts no idempotency key, so replaying a job whose provider
        # outcome is unknown would deliver a second real SMS to a member.
        collection = MemoryCollection()
        quarantined = self._quarantined_sms_job(collection)
        self.assertEqual(quarantined['status'], TERMINAL_FAILED)
        self.assertEqual(quarantined['delivery_state'], 'quarantined')

        with self.assertRaises(QuarantinedReplayRefused):
            self.run_async(replay_terminal_failure(
                collection,
                job_id=quarantined['id'],
                actor_id='admin-1',
                reason='Looks like it never went out',
                now=NOW + timedelta(minutes=5),
            ))

        unchanged = collection.documents[0]
        self.assertEqual(unchanged['status'], TERMINAL_FAILED)
        self.assertEqual(unchanged.get('replay_count', 0), 0)

    def test_quarantined_replay_proceeds_once_the_operator_confirms(self):
        collection = MemoryCollection()
        quarantined = self._quarantined_sms_job(collection)

        replayed = self.run_async(replay_terminal_failure(
            collection,
            job_id=quarantined['id'],
            actor_id='admin-1',
            reason='Twilio log confirms no message was delivered',
            confirmed_not_sent=True,
            now=NOW + timedelta(minutes=5),
        ))

        self.assertEqual(replayed['status'], RETRY_SCHEDULED)
        self.assertEqual(replayed['replay_count'], 1)
        self.assertIsNone(replayed['delivery_begun_at'])

    def test_ordinary_terminal_failure_still_replays_without_confirmation(self):
        # The guard must narrow to quarantined jobs only. A plainly rejected
        # job carries no delivery ambiguity and stays one click away.
        collection = MemoryCollection()
        self.run_async(enqueue_outbox_job(
            collection,
            idempotency_key='lead-2:email:ack',
            lead_id='lead-2',
            event_type='lead.acknowledgement.requested',
            channel='email',
            max_attempts=1,
            created_at=NOW,
        ))
        claimed = self.run_async(claim_due_job(collection, worker_id='worker-1', now=NOW))
        terminal = self.run_async(mark_job_failed(
            collection,
            job_id=claimed['id'],
            worker_id='worker-1',
            reservation_token=claimed['delivery_reservation_token'],
            error_code='rejected',
            error_message='Permanent rejection',
            retryable=False,
            now=NOW,
        ))
        self.assertNotEqual(terminal.get('delivery_state'), 'quarantined')

        replayed = self.run_async(replay_terminal_failure(
            collection,
            job_id=terminal['id'],
            actor_id='admin-1',
            reason='Configuration was corrected',
            now=NOW + timedelta(minutes=5),
        ))
        self.assertEqual(replayed['status'], RETRY_SCHEDULED)


if __name__ == '__main__':
    unittest.main()
