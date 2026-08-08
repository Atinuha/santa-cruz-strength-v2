"""The GymMaster adapter must be unbuildable by accident and unsendable by default.

crm_boundary is safe structurally: it holds no HTTP client, so no configuration
can make it call out. This module does hold one, so it cannot lean on that
argument and has to earn its safety with gates instead. Three of them, tested
separately here, because a single flag is one typo away from writing into a real
gym's CRM:

  1. it refuses to construct unless an explicit ALLOW_ flag is set;
  2. it refuses to construct without a durable journal, since GymMaster
     documents no idempotency key and once-only is therefore ours to provide;
  3. it refuses to send when any credential is missing.

Every test here uses a fake client. Nothing in this file may perform a real
request, and the recording adapter's own network-incapability test still guards
the other module.
"""

import asyncio
import json
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from crm_boundary import build_prospect_payload  # noqa: E402
from gymmaster_adapter import (  # noqa: E402
    GymMasterConfig,
    GymMasterProspectAdapter,
    GymMasterWritesDisabled,
    build_gymmaster_adapter,
)
from lead_outbox import enqueue_outbox_job  # noqa: E402
from provider_dispatch import DeliveryMessage  # noqa: E402
from test_lead_outbox import MemoryCollection  # noqa: E402

LEAD = {
    'id': 'lead-1', 'first_name': 'Alex', 'last_name': 'Rivera',
    'email': 'Alex@Example.com', 'phone': '+15551234567',
    'interest_type': 'General Membership', 'lead_source': 'website_form',
    'email_operational_opt_in': True, 'sms_operational_opt_in': False,
}

ENABLED_ENV = {
    'ALLOW_GYMMASTER_PROSPECT_WRITES': 'true',
    'GYMMASTER_SITE_NAME': 'santacruzstrength',
    'GYMMASTER_API_KEY': 'test-key-not-a-real-credential',
    'GYMMASTER_COMPANY_ID': '7',
}


def _run(coro):
    return asyncio.run(coro)


def _message(key='lead-1:crm:prospect'):
    return DeliveryMessage(
        channel='crm', recipient='lead-1', idempotency_key=key,
        text_body=json.dumps(build_prospect_payload(LEAD, delivery_key=key)),
    )


class FakeClient:
    """Records the request it was asked to make and returns a canned response."""

    def __init__(self, status_code=200, body=None):
        self.status_code = status_code
        self.body = body if body is not None else {'memberid': 4321}
        self.calls = []

    async def post(self, url, files=None, timeout=None, **kwargs):
        self.calls.append({'url': url, 'files': files, 'timeout': timeout})
        return SimpleNamespace(
            status_code=self.status_code,
            json=lambda: self.body,
        )


def _outbox(key='lead-1:crm:prospect'):
    collection = MemoryCollection()
    _run(enqueue_outbox_job(
        collection,
        idempotency_key=key,
        lead_id='lead-1',
        event_type='lead.prospect.requested',
        channel='crm',
    ))
    return collection


class ConstructionGateTests(unittest.TestCase):
    def test_the_adapter_refuses_to_construct_without_an_explicit_flag(self):
        config = GymMasterConfig.from_env({
            'GYMMASTER_SITE_NAME': 'santacruzstrength',
            'GYMMASTER_API_KEY': 'k',
            'GYMMASTER_COMPANY_ID': '7',
        })
        self.assertFalse(config.writes_enabled)
        with self.assertRaises(GymMasterWritesDisabled) as ctx:
            GymMasterProspectAdapter(config, _outbox())
        self.assertIn('ALLOW_GYMMASTER_PROSPECT_WRITES', str(ctx.exception))

    def test_an_empty_environment_yields_a_disabled_config(self):
        config = GymMasterConfig.from_env({})
        self.assertFalse(config.writes_enabled)
        self.assertEqual(config.missing_configuration(), (
            'GYMMASTER_SITE_NAME', 'GYMMASTER_API_KEY', 'GYMMASTER_COMPANY_ID',
        ))

    def test_the_builder_returns_nothing_unless_explicitly_enabled(self):
        self.assertIsNone(build_gymmaster_adapter(_outbox(), {}))
        self.assertIsNone(build_gymmaster_adapter(_outbox(), {
            'GYMMASTER_SITE_NAME': 'santacruzstrength',
        }))

    def test_the_adapter_refuses_to_construct_without_a_durable_journal(self):
        config = GymMasterConfig.from_env(ENABLED_ENV)
        with self.assertRaises(GymMasterWritesDisabled) as ctx:
            GymMasterProspectAdapter(config, None)
        self.assertIn('idempotency key', str(ctx.exception))

    def test_a_site_name_that_is_not_a_bare_label_is_rejected(self):
        # A site name is a subdomain, so anything with a scheme, dot or path
        # would address a different host entirely rather than fail safely.
        for hostile in ('https://evil.example.com', 'gym.example.com', 'a/b', ''):
            with self.subTest(site_name=hostile):
                config = GymMasterConfig.from_env({**ENABLED_ENV, 'GYMMASTER_SITE_NAME': hostile})
                self.assertIn('GYMMASTER_SITE_NAME', config.missing_configuration())


class SendGateTests(unittest.TestCase):
    def _adapter(self, client=None, env=None, journal=None):
        config = GymMasterConfig.from_env(env or ENABLED_ENV)
        return GymMasterProspectAdapter(config, journal or _outbox(), client=client)

    def test_it_refuses_to_send_when_unconfigured(self):
        client = FakeClient()
        adapter = self._adapter(
            client=client,
            env={'ALLOW_GYMMASTER_PROSPECT_WRITES': 'true'},
        )
        with self.assertRaises(Exception) as ctx:
            _run(adapter.send(_message()))
        self.assertIn('GYMMASTER_API_KEY', str(ctx.exception))
        self.assertEqual(client.calls, [], 'an unconfigured adapter still made a request')

    def test_a_configured_send_uses_the_documented_path_and_field_names(self):
        client = FakeClient()
        receipt = _run(self._adapter(client=client).send(_message()))
        self.assertEqual(len(client.calls), 1)
        call = client.calls[0]
        self.assertEqual(
            call['url'],
            'https://santacruzstrength.gymmasteronline.com/portal/api/v1/prospect/create',
        )
        sent = {name: value for name, (_, value) in call['files'].items()}
        self.assertEqual(sent['firstname'], 'Alex')
        self.assertEqual(sent['surname'], 'Rivera')
        self.assertEqual(sent['email'], 'alex@example.com')
        self.assertEqual(sent['phonecell'], '+15551234567')
        self.assertEqual(sent['companyid'], '7')
        self.assertEqual(sent['api_key'], 'test-key-not-a-real-credential')
        self.assertEqual(receipt.provider_message_id, 'gymmaster:4321')

    def test_a_replay_after_a_restart_does_not_create_a_second_prospect(self):
        outbox = _outbox()
        first_client = FakeClient()
        _run(self._adapter(client=first_client, journal=outbox).send(_message()))
        self.assertEqual(len(first_client.calls), 1)

        # Restart: a new adapter and a new client, the same durable outbox.
        second_client = FakeClient()
        _run(self._adapter(client=second_client, journal=outbox).send(_message()))
        self.assertEqual(second_client.calls, [], 'replay sent a second prospect to GymMaster')

    def test_a_rejected_request_is_classified_for_retry(self):
        for status, retryable in ((429, True), (503, False), (400, False), (401, False)):
            with self.subTest(status=status):
                adapter = self._adapter(client=FakeClient(status_code=status))
                with self.assertRaises(Exception) as ctx:
                    _run(adapter.send(_message()))
                self.assertEqual(getattr(ctx.exception, 'retryable', None), retryable)

    def test_a_rate_limited_request_can_still_be_created_later(self):
        # The claim is taken before the request, so a rejection that created
        # nothing has to release it. Holding it would report every later attempt
        # as a duplicate and lose the lead entirely while logging success.
        outbox = _outbox()
        rejected = self._adapter(client=FakeClient(status_code=429), journal=outbox)
        with self.assertRaises(Exception):
            _run(rejected.send(_message()))
        stored = _run(outbox.find_one({'idempotency_key': 'lead-1:crm:prospect'}))
        self.assertIsNone(stored['crm_prospect_record_id'], 'a rejection kept its claim')

        retry_client = FakeClient()
        receipt = _run(self._adapter(client=retry_client, journal=outbox).send(_message()))
        self.assertEqual(len(retry_client.calls), 1, 'the retry never reached GymMaster')
        self.assertEqual(receipt.provider_message_id, 'gymmaster:4321')

    def test_an_unknown_outcome_keeps_its_claim(self):
        # A server error may or may not have created the prospect. Releasing the
        # claim here is what would produce a duplicate, so it must be held and
        # an operator must confirm in GymMaster.
        outbox = _outbox()
        adapter = self._adapter(client=FakeClient(status_code=503), journal=outbox)
        with self.assertRaises(Exception) as ctx:
            _run(adapter.send(_message()))
        self.assertEqual(ctx.exception.code, 'gymmaster_outcome_unknown')
        stored = _run(outbox.find_one({'idempotency_key': 'lead-1:crm:prospect'}))
        self.assertTrue(stored['crm_prospect_record_id'].startswith('gymmaster-pending:'))

        blocked = FakeClient()
        with self.assertRaises(Exception) as replay:
            _run(self._adapter(client=blocked, journal=outbox).send(_message()))
        self.assertEqual(blocked.calls, [], 'an unknown outcome was retried into a duplicate')
        # Not calling the vendor again is only half of it. Returning a receipt
        # here would mark the job succeeded on the pending sentinel, which no
        # vendor ever issued, and the lead would be lost with a success in the
        # log. The replay has to refuse and send it to a human.
        self.assertEqual(replay.exception.code, 'gymmaster_claim_unresolved')
        self.assertFalse(replay.exception.retryable)

    def test_a_confirmed_write_still_replays_to_its_real_identifier(self):
        # The refusal above must be scoped to the pending sentinel. A claim that
        # carries a real vendor id is a genuine duplicate and must still short
        # circuit quietly rather than raise.
        outbox = _outbox()
        first = FakeClient()
        _run(self._adapter(client=first, journal=outbox).send(_message()))
        replayed = FakeClient()
        receipt = _run(self._adapter(client=replayed, journal=outbox).send(_message()))
        self.assertEqual(replayed.calls, [])
        self.assertEqual(receipt.provider_message_id, 'gymmaster:4321')

    def test_a_success_records_the_real_identifier_on_the_outbox_document(self):
        outbox = _outbox()
        _run(self._adapter(client=FakeClient(), journal=outbox).send(_message()))
        stored = _run(outbox.find_one({'idempotency_key': 'lead-1:crm:prospect'}))
        self.assertEqual(stored['crm_prospect_record_id'], 'gymmaster:4321')

    def test_an_undocumented_response_body_is_not_treated_as_a_failure(self):
        # The success shape is not documented, so a body without a recognisable
        # id must still count as success rather than trigger a retry that would
        # be refused as a duplicate anyway.
        adapter = self._adapter(client=FakeClient(body={'status': 'ok'}))
        receipt = _run(adapter.send(_message()))
        self.assertEqual(receipt.provider_message_id, 'gymmaster:lead-1:crm:prospect')

    def test_a_lead_without_a_surname_is_refused_before_any_request(self):
        client = FakeClient()
        adapter = self._adapter(client=client)
        payload = build_prospect_payload({**LEAD, 'last_name': ''}, delivery_key='k')
        message = DeliveryMessage(
            channel='crm', recipient='lead-1', idempotency_key='k',
            text_body=json.dumps(payload),
        )
        with self.assertRaises(Exception) as ctx:
            _run(adapter.send(message))
        self.assertIn('surname', str(ctx.exception))
        self.assertEqual(client.calls, [])


if __name__ == '__main__':
    unittest.main()
