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
    CRM_CONTRACT_VERIFIED,
    GYMMASTER_PROSPECT_FIELDS,
    GYMMASTER_PROSPECT_PATH,
    GYMMASTER_PROSPECT_REQUIRED,
    CrmContractUnverified,
    MEMBERSHIP_RECORD_OWNER,
    PROSPECT_RECORD_OWNER,
    RecordingCrmAdapter,
    build_gymmaster_prospect_fields,
    build_prospect_payload,
    live_crm_adapter,
)
from lead_outbox import enqueue_outbox_job  # noqa: E402
from provider_dispatch import DeliveryMessage, DispatchConfig  # noqa: E402
from test_lead_outbox import MemoryCollection  # noqa: E402

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

    def test_the_module_does_not_import_the_module_that_can(self):
        # gymmaster_adapter holds an HTTP client and imports crm_boundary. That
        # direction must never reverse: importing it here would give this module
        # a transitive network capability while the source-level check above
        # still passed, which is precisely the failure that check exists to stop.
        # Named in prose is fine and is how the reader finds it. Imported is not.
        source = (BACKEND / 'crm_boundary.py').read_text(encoding='utf-8')
        for forbidden in ('import gymmaster_adapter', 'from gymmaster_adapter'):
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


class DurableIdempotencyTests(unittest.TestCase):
    """Deduplication must survive a restart, not merely a retry.

    The in-process set was documented as a known limit: an operator replaying a
    quarantined job after a restart would record the prospect twice. These tests
    hold the fix to the standard that actually matters, which is a second
    adapter instance with empty memory reading a claim the first one left behind.
    """

    def _outbox_with_job(self, key='lead-1:crm:prospect'):
        collection = MemoryCollection()
        _run(enqueue_outbox_job(
            collection,
            idempotency_key=key,
            lead_id='lead-1',
            event_type='lead.prospect.requested',
            channel='crm',
        ))
        return collection

    def test_deduplication_survives_a_restart(self):
        outbox = self._outbox_with_job()
        before = RecordingCrmAdapter(journal=outbox)
        first = _run(before.send(_message()))
        self.assertEqual(len(before.writes), 1)
        self.assertTrue(first.provider_message_id.startswith('recorded:'))

        # The restart. A new adapter with empty process memory, the same durable
        # outbox. This is the exact case the old known limit got wrong.
        after = RecordingCrmAdapter(journal=outbox)
        self.assertEqual(after.seen_keys, set())
        second = _run(after.send(_message()))
        self.assertEqual(len(after.writes), 0, 'replay after restart created a second prospect')
        self.assertTrue(second.provider_message_id.startswith('recorded-duplicate:'))

    def test_without_a_journal_a_restart_still_duplicates(self):
        # Pins the known limit rather than leaving it as prose, so the value of
        # passing a journal stays visible and nobody quietly drops it.
        before = RecordingCrmAdapter()
        _run(before.send(_message()))
        after = RecordingCrmAdapter()
        _run(after.send(_message()))
        self.assertEqual(len(after.writes), 1)

    def test_the_claim_is_written_onto_the_outbox_document(self):
        outbox = self._outbox_with_job()
        _run(RecordingCrmAdapter(journal=outbox).send(_message()))
        stored = _run(outbox.find_one({'idempotency_key': 'lead-1:crm:prospect'}))
        self.assertEqual(stored['crm_prospect_record_id'], 'recorded:lead-1:crm:prospect')

    def test_a_write_with_no_outbox_document_is_refused(self):
        # No durable place to record the claim means no way to be once-only, so
        # the write must not happen at all.
        adapter = RecordingCrmAdapter(journal=MemoryCollection())
        with self.assertRaises(Exception) as ctx:
            _run(adapter.send(_message()))
        self.assertIn('once-only', str(ctx.exception))
        self.assertEqual(len(adapter.writes), 0)


class GymMasterMappingTests(unittest.TestCase):
    """The mapping is only as good as its citations."""

    def test_every_mapped_field_carries_a_documentation_url(self):
        for local_name, (vendor_name, description, url) in GYMMASTER_PROSPECT_FIELDS.items():
            with self.subTest(field=local_name):
                self.assertTrue(vendor_name)
                self.assertTrue(description)
                self.assertTrue(url.startswith('https://www.gymmaster.com/'))

    def test_the_mapping_uses_the_documented_vendor_names(self):
        payload = build_prospect_payload(LEAD, delivery_key='k')
        fields = build_gymmaster_prospect_fields(payload, company_id='7')
        self.assertEqual(fields['firstname'], 'Alex')
        self.assertEqual(fields['surname'], 'Rivera')
        self.assertEqual(fields['email'], 'alex@example.com')
        self.assertEqual(fields['phonecell'], '+15551234567')
        self.assertEqual(fields['companyid'], '7')
        # GymMaster documents firstname and surname, not name or lastname.
        self.assertNotIn('name', fields)
        self.assertNotIn('lastname', fields)
        self.assertNotIn('phone', fields)

    def test_the_documented_required_set_is_satisfiable(self):
        payload = build_prospect_payload(LEAD, delivery_key='k')
        fields = build_gymmaster_prospect_fields(payload, company_id='7')
        for required in GYMMASTER_PROSPECT_REQUIRED:
            with self.subTest(required=required):
                # api_key is attached by the adapter at request time, never by
                # the mapping, so it is legitimately absent here.
                if required == 'api_key':
                    self.assertNotIn(required, fields)
                    continue
                self.assertTrue(fields.get(required))

    def test_lead_source_is_carried_in_notes_because_no_field_exists_for_it(self):
        payload = build_prospect_payload(LEAD, delivery_key='k')
        fields = build_gymmaster_prospect_fields(payload, company_id='7')
        self.assertIn('website_form', fields['notes'])
        self.assertIn('lead-1', fields['notes'])
        # The absence of a real home for this is an open contract item, not a
        # solved one, so it must still be listed as unverified.
        self.assertTrue(any('lead source' in item for item in CRM_CONTRACT_UNVERIFIED))

    def test_the_verified_contract_items_cite_their_source(self):
        self.assertTrue(len(CRM_CONTRACT_VERIFIED) >= 4)
        for claim, url in CRM_CONTRACT_VERIFIED:
            with self.subTest(claim=claim):
                self.assertTrue(url.startswith('https://www.gymmaster.com/'))
        self.assertEqual(GYMMASTER_PROSPECT_PATH, '/portal/api/v1/prospect/create')

    def test_unresolved_vendor_questions_are_still_recorded(self):
        # Reading the documentation closed some unknowns and left others. The
        # ones it left open are the ones that make a live write unsafe.
        joined = ' '.join(CRM_CONTRACT_UNVERIFIED)
        self.assertIn('idempotency key', joined)
        self.assertIn('rate limits', joined)
        self.assertIn('companyid', joined)


if __name__ == '__main__':
    unittest.main()
