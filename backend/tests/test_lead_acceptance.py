import asyncio
import copy
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from lead_acceptance import (  # noqa: E402
    LeadIdempotencyConflict,
    enqueue_and_confirm_lead_outbox,
    lead_request_digest,
    require_matching_request_digest,
)


NOW = datetime(2026, 8, 18, 20, 0, tzinfo=timezone.utc)


class LeadCollection:
    def __init__(self, lead):
        self.lead = copy.deepcopy(lead)

    async def update_one(self, query, update):
        if self.lead.get('id') != query.get('id'):
            return SimpleNamespace(matched_count=0, modified_count=0)
        before = copy.deepcopy(self.lead)
        self.lead.update(copy.deepcopy(update.get('$set', {})))
        for key, value in update.get('$addToSet', {}).items():
            values = self.lead.setdefault(key, [])
            if value not in values:
                values.append(copy.deepcopy(value))
        for key, value in update.get('$pull', {}).items():
            self.lead[key] = [item for item in self.lead.get(key, []) if item != value]
        return SimpleNamespace(matched_count=1, modified_count=int(before != self.lead))


class LeadAcceptanceTests(unittest.TestCase):
    def run_async(self, coroutine):
        return asyncio.run(coroutine)

    def test_digest_is_canonical_and_changed_payload_conflicts(self):
        first = {'email': 'person@example.test ', 'name': ' Test ', 'consent': {'sms': False}}
        same = {'consent': {'sms': False}, 'name': 'Test', 'email': 'person@example.test'}
        changed = {'consent': {'sms': True}, 'name': 'Test', 'email': 'person@example.test'}

        digest = lead_request_digest(first)
        self.assertEqual(digest, lead_request_digest(same))
        self.assertNotEqual(digest, lead_request_digest(changed))
        require_matching_request_digest(
            {'request_payload_digests': {'request-1': digest}}, 'request-1', digest
        )
        with self.assertRaises(LeadIdempotencyConflict):
            require_matching_request_digest(
                {'request_payload_digests': {'request-1': digest}},
                'request-1',
                lead_request_digest(changed),
            )
        with self.assertRaises(LeadIdempotencyConflict):
            require_matching_request_digest({}, 'legacy-request', digest)

    def test_outbox_marker_clears_only_after_all_jobs_are_confirmed(self):
        lead = {'id': 'lead-1', 'outbox_pending_request_ids': []}
        leads = LeadCollection(lead)
        outbox = object()

        async def successful_enqueue(collection, stored_lead, request_id, now):
            self.assertIs(collection, outbox)
            self.assertEqual(stored_lead['id'], 'lead-1')
            self.assertIn(request_id, leads.lead['outbox_pending_request_ids'])
            return [{'id': 'job-1'}, {'id': 'job-2'}]

        jobs = self.run_async(enqueue_and_confirm_lead_outbox(
            leads, outbox, lead, 'request-1', NOW, enqueue=successful_enqueue,
        ))
        self.assertEqual(len(jobs), 2)
        self.assertEqual(leads.lead['outbox_pending_request_ids'], [])
        self.assertEqual(leads.lead['outbox_last_confirmed_request_id'], 'request-1')

    def test_outbox_marker_survives_partial_enqueue_failure_for_replay(self):
        lead = {'id': 'lead-1', 'outbox_pending_request_ids': []}
        leads = LeadCollection(lead)

        async def failed_enqueue(collection, stored_lead, request_id, now):
            raise RuntimeError('synthetic enqueue failure')

        with self.assertRaisesRegex(RuntimeError, 'synthetic enqueue failure'):
            self.run_async(enqueue_and_confirm_lead_outbox(
                leads, object(), lead, 'request-2', NOW, enqueue=failed_enqueue,
            ))
        self.assertEqual(leads.lead['outbox_pending_request_ids'], ['request-2'])
        self.assertNotIn('outbox_last_confirmed_request_id', leads.lead)

    def test_enqueue_does_not_start_when_pending_marker_cannot_be_persisted(self):
        leads = LeadCollection({'id': 'different-lead'})
        enqueue_called = False

        async def enqueue(collection, stored_lead, request_id, now):
            nonlocal enqueue_called
            enqueue_called = True
            return []

        with self.assertRaisesRegex(RuntimeError, 'marker could not be persisted'):
            self.run_async(enqueue_and_confirm_lead_outbox(
                leads,
                object(),
                {'id': 'missing-lead'},
                'request-3',
                NOW,
                enqueue=enqueue,
            ))
        self.assertFalse(enqueue_called)


if __name__ == '__main__':
    unittest.main()
