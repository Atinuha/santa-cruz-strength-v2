import asyncio
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from lead_outbox import (  # noqa: E402
    RETRY_SCHEDULED, SUCCEEDED, TERMINAL_FAILED,
    enqueue_lead_received_jobs, enqueue_outbox_job,
)
from provider_dispatch import (  # noqa: E402
    DeliveryError, DispatchConfig, ProviderReceipt, dispatch_batch, dispatch_one,
)
from test_lead_outbox import MemoryCollection  # noqa: E402

NOW = datetime(2026, 8, 3, 17, 0, tzinfo=timezone.utc)


class FakeAdapter:
    def __init__(self, outcomes=None):
        self.messages = []
        self.outcomes = list(outcomes or [])

    async def send(self, message):
        self.messages.append(message)
        if self.outcomes:
            outcome = self.outcomes.pop(0)
            if isinstance(outcome, Exception):
                raise outcome
        return ProviderReceipt(f'fake-{len(self.messages)}')


class SlowAdapter(FakeAdapter):
    async def send(self, message):
        self.messages.append(message)
        await asyncio.sleep(0.05)
        return ProviderReceipt('too-late')


class WorkerCrash(BaseException):
    pass


class CrashAfterProviderCallAdapter(FakeAdapter):
    async def send(self, message):
        self.messages.append(message)
        raise WorkerCrash('worker stopped after the provider call began')


def make_config(**overrides):
    values = {
        'enabled': True, 'resend_enabled': True, 'twilio_enabled': True,
        'schedulers_enabled': True, 'database_writes_enabled': True,
        'email_sends_enabled': True, 'sms_sends_enabled': True,
        'test_recipient_mode': True, 'staff_email': 'teresa@example.test',
        'email_allowlist': frozenset({'lead@example.test', 'teresa@example.test'}),
        'sms_allowlist': frozenset({'+14085550123'}),
        'provider_timeout_seconds': 0.01, 'lease_seconds': 60,
    }
    values.update(overrides)
    return DispatchConfig(**values)


def make_lead(**overrides):
    value = {
        'id': 'lead-1', 'brand_id': 'santa_cruz_strength',
        'location_id': 'santa_cruz_ca', 'first_name': 'Test', 'last_name': 'Lead',
        'email': 'lead@example.test', 'phone': '+14085550123',
        'email_operational_opt_in': True, 'sms_operational_opt_in': True,
        'sms_opted_out': False, 'blacklisted': False,
    }
    value.update(overrides)
    return value


def enqueue_job(test, outbox, channel, audience='lead'):
    return test.run_async(enqueue_outbox_job(
        outbox, idempotency_key=f'scs:req:{channel}:{audience}', lead_id='lead-1',
        event_type='lead.acknowledgement.requested', channel=channel,
        payload={'brand_id': 'santa_cruz_strength', 'location_id': 'santa_cruz_ca',
                 'audience': audience,
                 'template_key': 'new_lead_alert' if audience == 'staff' else 'lead_received'},
        created_at=NOW,
    ))


class ProviderDispatchTests(unittest.TestCase):
    def run_async(self, coroutine):
        return asyncio.run(coroutine)

    def test_duplicate_enqueue_dispatches_each_delivery_key_once(self):
        outbox, leads = MemoryCollection(), MemoryCollection()
        leads.documents.append(make_lead())
        request_id = '5818ac86-bcb4-4de7-adc2-cc826dfe3e59'
        self.run_async(enqueue_lead_received_jobs(outbox, make_lead(), request_id, NOW))
        self.run_async(enqueue_lead_received_jobs(outbox, make_lead(), request_id, NOW))
        email, sms = FakeAdapter(), FakeAdapter()
        first = self.run_async(dispatch_batch(
            outbox, leads, config=make_config(), adapters={'email': email, 'sms': sms},
            worker_id='worker-1', now=NOW,
        ))
        second = self.run_async(dispatch_batch(
            outbox, leads, config=make_config(), adapters={'email': email, 'sms': sms},
            worker_id='worker-1', now=NOW,
        ))
        self.assertEqual(len(outbox.documents), 3)
        self.assertEqual([item['status'] for item in first], ['succeeded'] * 3)
        self.assertEqual(second, [])
        self.assertEqual((len(email.messages), len(sms.messages)), (2, 1))
        self.assertEqual(len({m.idempotency_key for m in email.messages + sms.messages}), 3)

    def test_sms_is_forbidden_without_operational_consent(self):
        outbox, leads = MemoryCollection(), MemoryCollection()
        leads.documents.append(make_lead(sms_operational_opt_in=False))
        enqueue_job(self, outbox, 'sms')
        sms = FakeAdapter()
        result = self.run_async(dispatch_one(
            outbox, leads, config=make_config(), adapters={'sms': sms},
            worker_id='worker-1', now=NOW,
        ))
        self.assertEqual(result['state']['status'], TERMINAL_FAILED)
        self.assertEqual(result['state']['last_error_code'], 'sms_suppressed')
        self.assertEqual(sms.messages, [])

    def test_timeout_is_bounded_and_retry_scheduled(self):
        outbox, leads = MemoryCollection(), MemoryCollection()
        leads.documents.append(make_lead())
        enqueue_job(self, outbox, 'email')
        result = self.run_async(dispatch_one(
            outbox, leads, config=make_config(), adapters={'email': SlowAdapter()},
            worker_id='worker-1', now=NOW,
        ))
        self.assertEqual(result['state']['status'], RETRY_SCHEDULED)
        self.assertEqual(result['state']['last_error_code'], 'provider_timeout')

    def test_sms_timeout_is_terminal_when_provider_outcome_is_unknown(self):
        outbox, leads = MemoryCollection(), MemoryCollection()
        leads.documents.append(make_lead())
        enqueue_job(self, outbox, 'sms')
        result = self.run_async(dispatch_one(
            outbox, leads, config=make_config(), adapters={'sms': SlowAdapter()},
            worker_id='worker-1', now=NOW,
        ))
        self.assertEqual(result['state']['status'], TERMINAL_FAILED)
        self.assertEqual(result['state']['last_error_code'], 'twilio_delivery_unknown')

    def test_partial_failure_preserves_successful_independent_job(self):
        outbox, leads = MemoryCollection(), MemoryCollection()
        leads.documents.append(make_lead(sms_operational_opt_in=False))
        self.run_async(enqueue_lead_received_jobs(
            outbox, make_lead(sms_operational_opt_in=False),
            '5818ac86-bcb4-4de7-adc2-cc826dfe3e59', NOW,
        ))
        email = FakeAdapter([None, DeliveryError('resend_timeout', 'timeout', retryable=True)])
        self.run_async(dispatch_batch(
            outbox, leads, config=make_config(), adapters={'email': email},
            worker_id='worker-1', now=NOW,
        ))
        states = {job['payload']['audience']: job['status'] for job in outbox.documents}
        self.assertEqual(states, {'lead': SUCCEEDED, 'staff': RETRY_SCHEDULED})

    def test_resend_only_rollout_defers_sms_without_consuming_attempt(self):
        outbox, leads = MemoryCollection(), MemoryCollection()
        leads.documents.append(make_lead())
        self.run_async(enqueue_lead_received_jobs(
            outbox,
            make_lead(),
            '5818ac86-bcb4-4de7-adc2-cc826dfe3e59',
            NOW,
        ))
        email = FakeAdapter()
        results = self.run_async(dispatch_batch(
            outbox,
            leads,
            config=make_config(
                twilio_enabled=False,
                sms_sends_enabled=False,
                sms_allowlist=frozenset(),
            ),
            adapters={'email': email},
            worker_id='worker-1',
            now=NOW,
        ))

        sms_job = next(job for job in outbox.documents if job['channel'] == 'sms')
        self.assertEqual([result['status'] for result in results], [
            'succeeded', 'succeeded', 'deferred',
        ])
        self.assertEqual(len(email.messages), 2)
        self.assertEqual(sms_job['status'], RETRY_SCHEDULED)
        self.assertEqual(sms_job['attempt_count'], 0)
        self.assertEqual(sms_job['total_attempt_count'], 1)
        self.assertEqual(sms_job['last_error_code'], 'sms_provider_unavailable')
        self.assertEqual(sms_job['available_at'], datetime(
            2026, 8, 3, 17, 5, tzinfo=timezone.utc
        ).isoformat())

    def test_unsupported_contract_remains_terminal_without_adapter(self):
        outbox, leads = MemoryCollection(), MemoryCollection()
        leads.documents.append(make_lead())
        self.run_async(enqueue_outbox_job(
            outbox,
            idempotency_key='scs:req:email:unsupported',
            lead_id='lead-1',
            event_type='lead.acknowledgement.requested',
            channel='email',
            payload={
                'brand_id': 'santa_cruz_strength',
                'location_id': 'santa_cruz_ca',
                'audience': 'lead',
                'template_key': 'unknown_template',
            },
            created_at=NOW,
        ))
        result = self.run_async(dispatch_one(
            outbox,
            leads,
            config=make_config(),
            adapters={},
            worker_id='worker-1',
            now=NOW,
        ))

        self.assertEqual(result['status'], 'failed')
        self.assertEqual(result['state']['status'], TERMINAL_FAILED)
        self.assertEqual(result['state']['last_error_code'], 'unsupported_outbox_contract')

    def test_observability_redacts_contact_and_secret_values(self):
        outbox, leads = MemoryCollection(), MemoryCollection()
        leads.documents.append(make_lead())
        enqueue_job(self, outbox, 'email')
        adapter = FakeAdapter([DeliveryError(
            'rejected', 'person@example.com +14085550123 token=super-secret', retryable=False,
        )])
        result = self.run_async(dispatch_one(
            outbox, leads, config=make_config(), adapters={'email': adapter},
            worker_id='worker-1', now=NOW,
        ))
        message = result['state']['last_error_message']
        self.assertEqual(result['state']['status'], TERMINAL_FAILED)
        self.assertNotIn('person@example.com', message)
        self.assertNotIn('+14085550123', message)
        self.assertNotIn('super-secret', message)
        self.assertIn('[redacted-email]', message)

    def test_sms_quiet_hours_defer_without_consuming_attempt(self):
        outbox, leads = MemoryCollection(), MemoryCollection()
        leads.documents.append(make_lead())
        enqueue_job(self, outbox, 'sms')
        quiet_time = datetime(2026, 8, 4, 5, 0, tzinfo=timezone.utc)
        sms = FakeAdapter()
        result = self.run_async(dispatch_one(
            outbox, leads, config=make_config(), adapters={'sms': sms},
            worker_id='worker-1', now=quiet_time,
        ))
        self.assertEqual(result['status'], 'deferred')
        self.assertEqual(result['state']['status'], RETRY_SCHEDULED)
        self.assertEqual(result['state']['attempt_count'], 0)
        self.assertEqual(result['state']['last_error_code'], 'sms_quiet_hours')
        self.assertEqual(sms.messages, [])

    def test_dispatch_config_is_disabled_by_default_and_fails_closed(self):
        self.assertFalse(DispatchConfig.from_env({}).enabled)
        with self.assertRaisesRegex(ValueError, 'require ALLOW_LEAD_OUTBOX_DISPATCH'):
            DispatchConfig.from_env({'ALLOW_LEAD_RESEND': 'true'})

    def test_post_send_worker_crash_is_quarantined_without_a_second_sms_call(self):
        outbox, leads = MemoryCollection(), MemoryCollection()
        leads.documents.append(make_lead())
        enqueue_job(self, outbox, 'sms')
        sms = CrashAfterProviderCallAdapter()

        with self.assertRaises(WorkerCrash):
            self.run_async(dispatch_one(
                outbox,
                leads,
                config=make_config(lease_seconds=15),
                adapters={'sms': sms},
                worker_id='worker-1',
                now=NOW,
            ))
        stored_after_crash = dict(outbox.documents[0])
        second = self.run_async(dispatch_one(
            outbox,
            leads,
            config=make_config(lease_seconds=15),
            adapters={'sms': sms},
            worker_id='worker-2',
            now=NOW + timedelta(seconds=16),
        ))

        self.assertEqual(len(sms.messages), 1)
        self.assertEqual(stored_after_crash['delivery_state'], 'begun')
        self.assertIsNone(second)
        self.assertEqual(outbox.documents[0]['status'], TERMINAL_FAILED)
        self.assertEqual(outbox.documents[0]['delivery_state'], 'quarantined')
        self.assertEqual(
            outbox.documents[0]['last_error_code'],
            'delivery_outcome_unknown_after_lease_expiry',
        )

    def test_resend_safe_retry_keeps_the_same_provider_idempotency_key(self):
        outbox, leads = MemoryCollection(), MemoryCollection()
        leads.documents.append(make_lead())
        enqueue_job(self, outbox, 'email')
        email = FakeAdapter([
            DeliveryError('resend_unavailable', 'Provider unavailable', retryable=True),
            None,
        ])

        first = self.run_async(dispatch_one(
            outbox,
            leads,
            config=make_config(),
            adapters={'email': email},
            worker_id='worker-1',
            now=NOW,
        ))
        second = self.run_async(dispatch_one(
            outbox,
            leads,
            config=make_config(),
            adapters={'email': email},
            worker_id='worker-2',
            now=NOW + timedelta(seconds=31),
        ))

        self.assertEqual(first['state']['status'], RETRY_SCHEDULED)
        self.assertEqual(second['state']['status'], SUCCEEDED)
        self.assertEqual(len(email.messages), 2)
        self.assertEqual(
            email.messages[0].idempotency_key,
            email.messages[1].idempotency_key,
        )


if __name__ == '__main__':
    unittest.main()
