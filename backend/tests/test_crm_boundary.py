"""The CRM boundary must record and must not send.

The integration does not exist yet: no credentials, no sandbox, no confirmed
schema. These tests protect the two properties that make that safe rather than
merely unfinished.

The first is structural. There is no HTTP client in crm_boundary, so the adapter
is incapable of a network call regardless of configuration. A test on a flag
would only prove the flag; this asserts the capability is absent.

The second is idempotency. The outbox replays jobs, so a replayed CRM write must
produce one prospect and not two. That is asserted here against the local stand
in, because the vendor's own deduplication behaviour is unverified and cannot be
relied on until someone reads their documentation.
"""

import asyncio
import json
import sys
import unittest
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from crm_boundary import (  # noqa: E402
    CRM_CONTRACT_UNVERIFIED,
    CrmContractUnverified,
    MEMBERSHIP_RECORD_OWNER,
    PROSPECT_RECORD_OWNER,
    RecordingCrmAdapter,
    build_prospect_payload,
    live_crm_adapter,
)
from provider_dispatch import DeliveryMessage, DispatchConfig  # noqa: E402

LEAD = {
    'id': 'lead-1', 'first_name': 'Alex', 'last_name': 'Rivera',
    'email': 'Alex@Example.com', 'phone': '+15551234567',
    'interest_type': 'General Membership', 'lead_source': 'website_form',
    'email_operational_opt_in': True, 'sms_operational_opt_in': False,
}


def _run(coro):
    return asyncio.run(coro)


def _message(key='lead-1:crm:prospect'):
    return DeliveryMessage(
        channel='crm', recipient='lead-1', idempotency_key=key,
        text_body=json.dumps(build_prospect_payload(LEAD, delivery_key=key)),
    )


class CrmBoundaryTests(unittest.TestCase):
    def test_the_module_cannot_reach_the_network_at_all(self):
        source = (BACKEND / 'crm_boundary.py').read_text(encoding='utf-8')
        for forbidden in ('httpx', 'requests', 'urllib.request', 'aiohttp', 'socket'):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, source)

    def test_a_write_is_recorded_rather_than_performed(self):
        adapter = RecordingCrmAdapter()
        receipt = _run(adapter.send(_message()))
        self.assertEqual(len(adapter.writes), 1)
        self.assertTrue(receipt.provider_message_id.startswith('recorded:'))
        self.assertEqual(adapter.writes[0].lead_id, 'lead-1')

    def test_a_replayed_write_creates_one_prospect_not_two(self):
        adapter = RecordingCrmAdapter()
        _run(adapter.send(_message()))
        receipt = _run(adapter.send(_message()))
        self.assertEqual(len(adapter.writes), 1, 'replay created a duplicate prospect')
        self.assertTrue(receipt.provider_message_id.startswith('recorded-duplicate:'))

    def test_a_write_without_an_idempotency_key_is_refused(self):
        adapter = RecordingCrmAdapter()
        with self.assertRaises(Exception) as ctx:
            _run(adapter.send(_message(key='')))
        self.assertIn('idempotency', str(ctx.exception).lower())

    def test_payload_carries_consent_and_the_ownership_rule(self):
        payload = build_prospect_payload(LEAD, delivery_key='k')
        self.assertEqual(payload['consent']['email_operational_opt_in'], True)
        self.assertEqual(payload['consent']['sms_operational_opt_in'], False)
        self.assertEqual(payload['record_ownership']['membership'], MEMBERSHIP_RECORD_OWNER)
        self.assertEqual(payload['record_ownership']['prospect'], PROSPECT_RECORD_OWNER)
        self.assertEqual(payload['contract_status'], 'unverified')

    def test_asking_for_a_live_adapter_explains_the_blockers(self):
        with self.assertRaises(CrmContractUnverified) as ctx:
            live_crm_adapter()
        self.assertIn('unverified', str(ctx.exception))
        self.assertTrue(len(CRM_CONTRACT_UNVERIFIED) >= 5)

    def test_recording_is_off_by_default_and_needs_dispatch_enabled(self):
        config = DispatchConfig.from_env({})
        self.assertFalse(config.crm_recording_enabled)
        with self.assertRaises(ValueError):
            DispatchConfig.from_env({'ALLOW_LEAD_CRM_RECORDING': 'true'})


if __name__ == '__main__':
    unittest.main()
