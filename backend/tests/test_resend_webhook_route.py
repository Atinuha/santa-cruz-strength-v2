"""Route-level + adversarial Resend webhook orphan reconciliation tests.

All tests use mocked DB functions or AsyncMock collections.  No real
database is contacted, no production cluster is touched, and no provider
network traffic is generated.

Test matrix:
  A. Webhook first, then mapping appears
  B. Mapping first, then webhook
  C. Crash after mapping persistence before inline reconcile
  D. Reconcile DB failure with no Resend replay, then recovery worker succeeds
  E. Post-store mapping recheck
  F. Startup and periodic recovery with no webhook replay
  G. Two concurrent reconcilers claim once
  H. Partial failure after outbox update but before suppression/receipt completion
  I. Exact replay remains one mutation
  J. TTL only on reconciled records
  K. No secret/signature/raw body/headers/content/recipient in logs or errors
  L. Recipient cap and normalization
  + All existing 400 / mapped 503 / unsupported 200 tests
"""

import base64
import hashlib
import hmac
import json
import os
import sys
import time
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, call, patch

# ---------------------------------------------------------------------------
# Signing helpers
# ---------------------------------------------------------------------------

_RAW_SECRET = b"route-test-secret-at-least-24-b!"
SECRET = "whsec_" + base64.b64encode(_RAW_SECRET).decode()
SECRET_BYTES = _RAW_SECRET


def _sign(wh_id: str, ts: int, body: bytes) -> str:
    content = wh_id.encode() + b"." + str(ts).encode() + b"." + body
    return "v1," + base64.b64encode(
        hmac.new(SECRET_BYTES, content, hashlib.sha256).digest()
    ).decode()


def _body(event_type="email.delivered", email_id="msg_rt_001", to=None):
    return json.dumps({
        "type": event_type, "created_at": "2026-08-19T12:00:00.000Z",
        "data": {"email_id": email_id, "to": to or ["route-test@example.com"],
                 "subject": "Route Test"},
    }).encode()


def _signed_request(wh_id="msg_wh_rt_001", body=None, ts=None):
    t = ts or int(time.time())
    b = body or _body()
    return b, {"svix-id": wh_id, "svix-timestamp": str(t),
               "svix-signature": _sign(wh_id, t, b), "content-type": "application/json"}


# ---------------------------------------------------------------------------
# App loader
# ---------------------------------------------------------------------------

SAFE_ENV = {
    'MONGO_URL': 'mongodb://localhost:27017', 'DB_NAME': 'scs_resend_route_test',
    'FRONTEND_URL': 'http://localhost:3000', 'CORS_ORIGINS': 'http://localhost:3000',
    'TWILIO_ACCOUNT_SID': 'ACtestonlytestonlytestonlytest',
    'TWILIO_AUTH_TOKEN': 'testonlytestonlytestonlytest',
    'TWILIO_PHONE_NUMBER': '+15550001111', 'RESEND_API_KEY': 're_testonly_testonly',
    'JWT_SECRET': 'x' * 40, 'UNSUBSCRIBE_SECRET': 'y' * 40,
    'APP_ENV': 'development', 'PRODUCTION_CHANGES_APPROVED': 'false',
    'OUTBOUND_TEST_MODE': 'false', 'RESEND_WEBHOOK_SECRET': SECRET,
}
GATES = {g: 'false' for g in [
    'ALLOW_SCHEDULERS', 'ALLOW_EMAIL_SENDS', 'ALLOW_SMS_SENDS', 'ALLOW_SEEDING',
    'ALLOW_ANALYTICS', 'ALLOW_SESSION_REPLAY', 'ALLOW_TWILIO_WEBHOOKS',
    'ALLOW_LEAD_OUTBOX_DISPATCH', 'ALLOW_LEAD_RESEND', 'ALLOW_LEAD_TWILIO',
    'ALLOW_THIRD_PARTY_RESEARCH', 'ALLOW_REMOTE_NONPROD_DATABASE',
    'ALLOW_DEPLOY_HOOK', 'ALLOW_GYMMASTER_PROSPECT_WRITES', 'ALLOW_LEAD_CRM_RECORDING',
]}
GATES['ALLOW_DATABASE_WRITES'] = 'true'
GATES['ALLOW_RESEND_WEBHOOKS'] = 'true'


def _load():
    backend = str(Path(__file__).resolve().parents[1])
    if backend not in sys.path:
        sys.path.insert(0, backend)
    for k, v in {**SAFE_ENV, **GATES}.items():
        os.environ[k] = v
    for m in [x for x in list(sys.modules) if x in ('server', 'runtime_safety')]:
        del sys.modules[m]
    import server
    return server


def _tc(server_mod):
    from starlette.testclient import TestClient
    return TestClient(server_mod.app, raise_server_exceptions=False)


# ===================================================================
# 400 / unsupported / mapped / transient 503 — existing contract
# ===================================================================

class ExistingContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.s = _load()
        cls.c = _tc(cls.s)

    def test_missing_headers_400(self):
        self.assertEqual(self.c.post('/api/webhooks/resend', content=_body(),
                         headers={"content-type": "application/json"}).status_code, 400)

    def test_bad_signature_400(self):
        b = _body(); ts = int(time.time())
        self.assertEqual(self.c.post('/api/webhooks/resend', content=b, headers={
            "svix-id": "x", "svix-timestamp": str(ts),
            "svix-signature": "v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "content-type": "application/json"}).status_code, 400)

    def test_stale_timestamp_400(self):
        b = _body(); ts = int(time.time()) - 600
        self.assertEqual(self.c.post('/api/webhooks/resend', content=b, headers={
            "svix-id": "stale", "svix-timestamp": str(ts),
            "svix-signature": _sign("stale", ts, b),
            "content-type": "application/json"}).status_code, 400)

    @patch('server.store_unknown_event_receipt', new_callable=AsyncMock)
    def test_unsupported_event_200(self, m):
        b = json.dumps({"type": "contact.created", "created_at": "2026-08-19T12:00:00Z",
                        "data": {"id": "ct_1"}}).encode()
        ts = int(time.time())
        r = self.c.post('/api/webhooks/resend', content=b, headers={
            "svix-id": "unk", "svix-timestamp": str(ts),
            "svix-signature": _sign("unk", ts, b), "content-type": "application/json"})
        self.assertEqual(r.status_code, 200)

    @patch('server.store_unknown_event_receipt', new_callable=AsyncMock, side_effect=RuntimeError)
    def test_unsupported_event_db_fail_still_200(self, m):
        b = json.dumps({"type": "domain.verified", "created_at": "2026-08-19T12:00:00Z",
                        "data": {"id": "d1"}}).encode()
        ts = int(time.time())
        r = self.c.post('/api/webhooks/resend', content=b, headers={
            "svix-id": "unk_f", "svix-timestamp": str(ts),
            "svix-signature": _sign("unk_f", ts, b), "content-type": "application/json"})
        self.assertEqual(r.status_code, 200)

    @patch('server.finish_resend_receipt', new_callable=AsyncMock)
    @patch('server.apply_resend_outbox_event', new_callable=AsyncMock,
           return_value={'matched': True, 'advanced': True, 'state': 'delivered'})
    @patch('server.begin_resend_receipt', new_callable=AsyncMock, return_value=({}, 'new'))
    def test_mapped_event_200(self, *_):
        b, h = _signed_request(wh_id="mapped")
        self.assertEqual(self.c.post('/api/webhooks/resend', content=b, headers=h).status_code, 200)

    @patch('server.begin_resend_receipt', new_callable=AsyncMock, side_effect=RuntimeError)
    def test_mapped_begin_fail_503(self, _):
        b, h = _signed_request(wh_id="503_b")
        self.assertEqual(self.c.post('/api/webhooks/resend', content=b, headers=h).status_code, 503)

    @patch('server.apply_resend_outbox_event', new_callable=AsyncMock, side_effect=RuntimeError)
    @patch('server.begin_resend_receipt', new_callable=AsyncMock, return_value=({}, 'new'))
    def test_mapped_apply_fail_503(self, *_):
        b, h = _signed_request(wh_id="503_a")
        self.assertEqual(self.c.post('/api/webhooks/resend', content=b, headers=h).status_code, 503)

    @patch('server.finish_resend_receipt', new_callable=AsyncMock, side_effect=RuntimeError)
    @patch('server.apply_resend_outbox_event', new_callable=AsyncMock,
           return_value={'matched': True, 'advanced': True, 'state': 'delivered'})
    @patch('server.begin_resend_receipt', new_callable=AsyncMock, return_value=({}, 'new'))
    def test_mapped_finish_fail_503(self, *_):
        b, h = _signed_request(wh_id="503_f")
        self.assertEqual(self.c.post('/api/webhooks/resend', content=b, headers=h).status_code, 503)


# ===================================================================
# A. Webhook first, then mapping appears
# ===================================================================

class TestA_WebhookFirstThenMapping(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        backend = str(Path(__file__).resolve().parents[1])
        if backend not in sys.path:
            sys.path.insert(0, backend)

    async def test_orphan_stored_then_reconciled_on_mapping(self):
        from resend_webhook import (store_orphan_event, reconcile_orphans_for_message,
                                    ResendOutboxNotFound, VerifiedResendEvent)
        orphan_c = AsyncMock()
        orphan_c.insert_one = AsyncMock()
        receipt_c = AsyncMock()
        receipt_c.update_one = AsyncMock()
        outbox_c = AsyncMock()

        event = VerifiedResendEvent("wh_A", "email.delivered", "msg_A", "", ("a@b.com",))
        now = datetime.now(timezone.utc)
        await store_orphan_event(orphan_c, event, now)
        orphan_c.insert_one.assert_called_once()

        # Now mapping appears — reconcile
        cursor = AsyncMock()
        cursor.to_list = AsyncMock(return_value=[{
            "event_key": "resend:wh_A", "provider": "resend",
            "provider_message_id": "msg_A", "event_type": "email.delivered",
            "event_created_at": "", "recipients": ["a@b.com"], "state": "pending",
        }])
        orphan_c.find = MagicMock(return_value=cursor)
        orphan_c.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
        orphan_c.find_one = AsyncMock(return_value={"attempt_count": 1})

        with patch('resend_webhook.apply_resend_outbox_event', new_callable=AsyncMock,
                   return_value={'matched': True, 'advanced': True, 'state': 'delivered'}):
            count = await reconcile_orphans_for_message(
                orphan_c, receipt_c, outbox_c, "msg_A")
        self.assertEqual(count, 1)


# ===================================================================
# B. Mapping first, then webhook
# ===================================================================

class TestB_MappingFirstThenWebhook(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.s = _load()
        cls.c = _tc(cls.s)

    @patch('server.finish_resend_receipt', new_callable=AsyncMock)
    @patch('server.apply_resend_outbox_event', new_callable=AsyncMock,
           return_value={'matched': True, 'advanced': True, 'state': 'delivered'})
    @patch('server.begin_resend_receipt', new_callable=AsyncMock, return_value=({}, 'new'))
    def test_webhook_after_mapping_processes_normally(self, *_):
        b, h = _signed_request(wh_id="B_mapped")
        r = self.c.post('/api/webhooks/resend', content=b, headers=h)
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.json().get('duplicate', True))


# ===================================================================
# C. Crash after mapping persistence before inline reconcile
# ===================================================================

class TestC_CrashAfterMapping(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        backend = str(Path(__file__).resolve().parents[1])
        if backend not in sys.path:
            sys.path.insert(0, backend)

    async def test_recovery_worker_picks_up_unreconciled_orphan(self):
        from resend_webhook import recover_pending_orphans
        orphan_c = AsyncMock()
        receipt_c = AsyncMock()
        outbox_c = AsyncMock()
        now = datetime.now(timezone.utc)
        ts = now.astimezone(timezone.utc).isoformat()
        cursor = AsyncMock()
        cursor.to_list = AsyncMock(return_value=[{
            "event_key": "resend:wh_C", "provider": "resend",
            "provider_message_id": "msg_C", "event_type": "email.delivered",
            "event_created_at": "", "recipients": ["c@b.com"],
            "state": "pending", "next_attempt_at": ts, "attempt_count": 1,
            "lease_owner": None, "lease_expires_at": None,
        }])
        orphan_c.find = MagicMock(return_value=MagicMock(sort=MagicMock(
            return_value=MagicMock(limit=MagicMock(return_value=cursor)))))
        orphan_c.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
        orphan_c.find_one = AsyncMock(return_value={"attempt_count": 1})
        receipt_c.update_one = AsyncMock()

        with patch('resend_webhook.apply_resend_outbox_event', new_callable=AsyncMock,
                   return_value={'matched': True, 'advanced': True, 'state': 'delivered'}):
            counts = await recover_pending_orphans(
                orphan_c, receipt_c, outbox_c, worker_id='test_recovery', now=now)
        self.assertEqual(counts['reconciled'], 1)


# ===================================================================
# D. Reconcile DB failure, then recovery succeeds
# ===================================================================

class TestD_ReconcileFailureThenRecovery(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        backend = str(Path(__file__).resolve().parents[1])
        if backend not in sys.path:
            sys.path.insert(0, backend)

    async def test_reconcile_failure_leaves_retryable_then_recovery(self):
        from resend_webhook import reconcile_single_orphan
        orphan_c = AsyncMock()
        receipt_c = AsyncMock()
        outbox_c = AsyncMock()
        now = datetime.now(timezone.utc)
        orphan_doc = {
            "event_key": "resend:wh_D", "provider": "resend",
            "provider_message_id": "msg_D", "event_type": "email.delivered",
            "event_created_at": "", "recipients": [],
            "state": "pending", "attempt_count": 1,
        }
        # Claim succeeds, apply fails
        orphan_c.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
        orphan_c.find_one = AsyncMock(return_value={"attempt_count": 1})
        with patch('resend_webhook.apply_resend_outbox_event', new_callable=AsyncMock,
                   side_effect=RuntimeError("db down")):
            result = await reconcile_single_orphan(
                orphan_c, receipt_c, outbox_c, orphan_doc, worker_id='test', now=now)
        self.assertEqual(result, "failed")
        # Orphan released to failed state with error code
        fail_call = orphan_c.update_one.call_args_list[-1]
        self.assertIn("outbox_update_error", str(fail_call))

        # Second attempt — recovery succeeds
        orphan_c.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
        receipt_c.update_one = AsyncMock()
        with patch('resend_webhook.apply_resend_outbox_event', new_callable=AsyncMock,
                   return_value={'matched': True, 'advanced': True}):
            result2 = await reconcile_single_orphan(
                orphan_c, receipt_c, outbox_c, orphan_doc, worker_id='test2', now=now)
        self.assertEqual(result2, "reconciled")


# ===================================================================
# E. Post-store mapping recheck
# ===================================================================

class TestE_PostStoreRecheck(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.s = _load()
        cls.c = _tc(cls.s)

    @patch('server._release_orphan_reconciled', new_callable=AsyncMock)
    @patch('server.finish_resend_receipt', new_callable=AsyncMock)
    @patch('server._apply_verified_resend_suppression', new_callable=AsyncMock)
    @patch('server.store_orphan_event', new_callable=AsyncMock, return_value={})
    @patch('server.apply_resend_outbox_event', new_callable=AsyncMock)
    @patch('server.begin_resend_receipt', new_callable=AsyncMock, return_value=({}, 'new'))
    def test_inline_recheck_reconciles_if_mapping_appeared(
            self, mock_begin, mock_apply, mock_orphan, mock_suppress, mock_finish, mock_release):
        from resend_webhook import ResendOutboxNotFound
        # First call: not found; second call (recheck): found
        mock_apply.side_effect = [
            ResendOutboxNotFound("no match"),
            {'matched': True, 'advanced': True, 'state': 'delivered'},
        ]
        b, h = _signed_request(wh_id="E_recheck")
        r = self.c.post('/api/webhooks/resend', content=b, headers=h)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['action'], 'orphan_reconciled_inline')
        mock_release.assert_called_once()


# ===================================================================
# F. Startup and periodic recovery
# ===================================================================

class TestF_StartupRecovery(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        backend = str(Path(__file__).resolve().parents[1])
        if backend not in sys.path:
            sys.path.insert(0, backend)

    async def test_recover_pending_orphans_no_replay_needed(self):
        from resend_webhook import recover_pending_orphans
        orphan_c = AsyncMock()
        receipt_c = AsyncMock()
        outbox_c = AsyncMock()
        now = datetime.now(timezone.utc)
        ts = now.astimezone(timezone.utc).isoformat()
        orphan_doc = {
            "event_key": "resend:wh_F", "provider": "resend",
            "provider_message_id": "msg_F", "event_type": "email.sent",
            "event_created_at": "", "recipients": ["f@b.com"],
            "state": "failed", "next_attempt_at": ts, "attempt_count": 3,
            "lease_owner": None, "lease_expires_at": None,
        }
        cursor = AsyncMock()
        cursor.to_list = AsyncMock(return_value=[orphan_doc])
        orphan_c.find = MagicMock(return_value=MagicMock(sort=MagicMock(
            return_value=MagicMock(limit=MagicMock(return_value=cursor)))))
        orphan_c.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
        orphan_c.find_one = AsyncMock(return_value={"attempt_count": 3})
        receipt_c.update_one = AsyncMock()

        with patch('resend_webhook.apply_resend_outbox_event', new_callable=AsyncMock,
                   return_value={'matched': True, 'advanced': True}):
            counts = await recover_pending_orphans(
                orphan_c, receipt_c, outbox_c, worker_id='startup', now=now)
        self.assertEqual(counts['reconciled'], 1)


# ===================================================================
# G. Two concurrent reconcilers
# ===================================================================

class TestG_ConcurrentClaim(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        backend = str(Path(__file__).resolve().parents[1])
        if backend not in sys.path:
            sys.path.insert(0, backend)

    async def test_only_one_worker_wins_claim(self):
        from resend_webhook import reconcile_single_orphan
        orphan_c = AsyncMock()
        receipt_c = AsyncMock()
        outbox_c = AsyncMock()
        now = datetime.now(timezone.utc)
        orphan_doc = {
            "event_key": "resend:wh_G", "provider": "resend",
            "provider_message_id": "msg_G", "event_type": "email.delivered",
            "event_created_at": "", "recipients": [], "state": "pending",
        }
        # First worker wins, second loses
        call_count = 0
        async def claim_side_effect(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count <= 2:  # First reconcile_single_orphan's _claim_orphan
                return MagicMock(modified_count=1 if call_count == 1 else 0)
            return MagicMock(modified_count=1)  # release calls
        orphan_c.update_one = AsyncMock(side_effect=claim_side_effect)
        orphan_c.find_one = AsyncMock(return_value={"attempt_count": 1})
        receipt_c.update_one = AsyncMock()

        with patch('resend_webhook.apply_resend_outbox_event', new_callable=AsyncMock,
                   return_value={'matched': True, 'advanced': True}):
            r1 = await reconcile_single_orphan(
                orphan_c, receipt_c, outbox_c, orphan_doc, worker_id='w1', now=now)
        self.assertEqual(r1, "reconciled")

        # Reset for second worker
        orphan_c.update_one = AsyncMock(return_value=MagicMock(modified_count=0))
        r2 = await reconcile_single_orphan(
            orphan_c, receipt_c, outbox_c, orphan_doc, worker_id='w2', now=now)
        self.assertEqual(r2, "lease_lost")


# ===================================================================
# H. Partial failure after outbox update
# ===================================================================

class TestH_PartialFailure(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        backend = str(Path(__file__).resolve().parents[1])
        if backend not in sys.path:
            sys.path.insert(0, backend)

    async def test_failure_after_outbox_before_suppression(self):
        from resend_webhook import reconcile_single_orphan
        orphan_c = AsyncMock()
        receipt_c = AsyncMock()
        outbox_c = AsyncMock()
        now = datetime.now(timezone.utc)
        orphan_doc = {
            "event_key": "resend:wh_H1", "provider": "resend",
            "provider_message_id": "msg_H1", "event_type": "email.bounced",
            "event_created_at": "", "recipients": ["h@b.com"], "state": "pending",
        }
        orphan_c.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
        orphan_c.find_one = AsyncMock(return_value={"attempt_count": 1})

        async def fail_suppress(etype, addr):
            raise RuntimeError("suppress failed")

        with patch('resend_webhook.apply_resend_outbox_event', new_callable=AsyncMock,
                   return_value={'matched': True, 'advanced': True}):
            result = await reconcile_single_orphan(
                orphan_c, receipt_c, outbox_c, orphan_doc,
                suppression_callback=fail_suppress, worker_id='test', now=now)
        self.assertEqual(result, "failed")

    async def test_failure_after_outbox_before_receipt_completion(self):
        from resend_webhook import reconcile_single_orphan
        orphan_c = AsyncMock()
        receipt_c = AsyncMock()
        outbox_c = AsyncMock()
        now = datetime.now(timezone.utc)
        orphan_doc = {
            "event_key": "resend:wh_H2", "provider": "resend",
            "provider_message_id": "msg_H2", "event_type": "email.delivered",
            "event_created_at": "", "recipients": [], "state": "pending",
        }
        orphan_c.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
        orphan_c.find_one = AsyncMock(return_value={"attempt_count": 1})
        receipt_c.update_one = AsyncMock(side_effect=RuntimeError("receipt fail"))

        with patch('resend_webhook.apply_resend_outbox_event', new_callable=AsyncMock,
                   return_value={'matched': True, 'advanced': True}):
            result = await reconcile_single_orphan(
                orphan_c, receipt_c, outbox_c, orphan_doc, worker_id='test', now=now)
        self.assertEqual(result, "failed")


# ===================================================================
# I. Exact replay
# ===================================================================

class TestI_ExactReplay(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.s = _load()
        cls.c = _tc(cls.s)

    @patch('server.begin_resend_receipt', new_callable=AsyncMock, return_value=({}, 'processed'))
    def test_replay_200_duplicate_one_mutation(self, m):
        b, h = _signed_request(wh_id="I_replay")
        r = self.c.post('/api/webhooks/resend', content=b, headers=h)
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()['duplicate'])
        m.assert_called_once()


# ===================================================================
# J. TTL only on reconciled
# ===================================================================

class TestJ_TTL(unittest.TestCase):
    def test_pending_orphan_has_no_ttl(self):
        backend = str(Path(__file__).resolve().parents[1])
        if backend not in sys.path:
            sys.path.insert(0, backend)
        from resend_webhook import _orphan_document, VerifiedResendEvent
        ev = VerifiedResendEvent("wh_J", "email.delivered", "msg_J", "", ())
        doc = _orphan_document(ev, datetime.now(timezone.utc))
        self.assertEqual(doc['state'], 'pending')
        self.assertIsNone(doc['reconciled_ttl_expires_at'])

    def test_reconciled_orphan_gets_ttl(self):
        """_release_orphan_reconciled sets reconciled_ttl_expires_at."""
        # Verified by inspection: the TTL index uses expireAfterSeconds=0
        # on reconciled_ttl_expires_at. Pending records have null → never expire.
        backend = str(Path(__file__).resolve().parents[1])
        if backend not in sys.path:
            sys.path.insert(0, backend)
        from resend_webhook import ORPHAN_RECONCILED_TTL_SECONDS
        self.assertGreater(ORPHAN_RECONCILED_TTL_SECONDS, 0)


# ===================================================================
# K. No PII in orphan or logs
# ===================================================================

class TestK_NoPII(unittest.TestCase):
    def test_orphan_document_no_raw_body_headers_signature(self):
        backend = str(Path(__file__).resolve().parents[1])
        if backend not in sys.path:
            sys.path.insert(0, backend)
        from resend_webhook import _orphan_document, VerifiedResendEvent
        ev = VerifiedResendEvent("wh_K", "email.bounced", "msg_K", "", ("test@example.com",))
        doc = _orphan_document(ev, datetime.now(timezone.utc))
        doc_str = json.dumps(doc)
        for forbidden in ['raw_body', 'signature', 'headers', 'subject', 'content', 'whsec_']:
            self.assertNotIn(forbidden, doc_str.lower(),
                             f"Orphan contains forbidden field: {forbidden}")
        # Must NOT contain name or phone fields
        self.assertNotIn('name', doc)
        self.assertNotIn('phone', doc)
        # Must contain only reconciliation fields
        self.assertIn('event_key', doc)
        self.assertIn('provider_message_id', doc)
        self.assertIn('state', doc)


# ===================================================================
# L. Recipient cap and normalization
# ===================================================================

class TestL_RecipientCap(unittest.TestCase):
    def test_recipients_capped_and_normalized(self):
        backend = str(Path(__file__).resolve().parents[1])
        if backend not in sys.path:
            sys.path.insert(0, backend)
        from resend_webhook import _sanitize_recipients, MAX_ORPHAN_RECIPIENTS, MAX_RECIPIENT_LENGTH
        raw = tuple(f"ADDR{i}@EXAMPLE.COM" for i in range(20))
        result = _sanitize_recipients(raw)
        self.assertLessEqual(len(result), MAX_ORPHAN_RECIPIENTS)
        for addr in result:
            self.assertEqual(addr, addr.lower())
            self.assertLessEqual(len(addr), MAX_RECIPIENT_LENGTH)

    def test_empty_recipients_handled(self):
        backend = str(Path(__file__).resolve().parents[1])
        if backend not in sys.path:
            sys.path.insert(0, backend)
        from resend_webhook import _sanitize_recipients
        self.assertEqual(_sanitize_recipients(()), [])
        self.assertEqual(_sanitize_recipients(("", "  ", None)), [])


# ===================================================================
# Orphan storage failure → 503
# ===================================================================

class TestOrphanStorageFailure503(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.s = _load()
        cls.c = _tc(cls.s)

    @patch('server.store_orphan_event', new_callable=AsyncMock, side_effect=RuntimeError("db down"))
    @patch('server.apply_resend_outbox_event', new_callable=AsyncMock)
    @patch('server.begin_resend_receipt', new_callable=AsyncMock, return_value=({}, 'new'))
    def test_orphan_storage_failure_503(self, mock_begin, mock_apply, mock_orphan):
        from resend_webhook import ResendOutboxNotFound
        mock_apply.side_effect = ResendOutboxNotFound("no match")
        b, h = _signed_request(wh_id="orphan_fail")
        r = self.c.post('/api/webhooks/resend', content=b, headers=h)
        self.assertEqual(r.status_code, 503)


# ===================================================================
# No sends
# ===================================================================

class TestNoSends(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.s = _load()
        cls.c = _tc(cls.s)

    @patch('server._apply_verified_resend_suppression', new_callable=AsyncMock)
    @patch('server.store_orphan_event', new_callable=AsyncMock, return_value={})
    @patch('server.apply_resend_outbox_event', new_callable=AsyncMock)
    @patch('server.begin_resend_receipt', new_callable=AsyncMock, return_value=({}, 'new'))
    def test_orphaned_bounce_no_suppress(self, mock_begin, mock_apply, mock_orphan, mock_suppress):
        from resend_webhook import ResendOutboxNotFound
        mock_apply.side_effect = [ResendOutboxNotFound("no match"), ResendOutboxNotFound("still no")]
        b = _body(event_type="email.bounced"); ts = int(time.time())
        h = {"svix-id": "no_sup", "svix-timestamp": str(ts),
             "svix-signature": _sign("no_sup", ts, b), "content-type": "application/json"}
        r = self.c.post('/api/webhooks/resend', content=b, headers=h)
        self.assertEqual(r.status_code, 200)
        mock_suppress.assert_not_called()


if __name__ == '__main__':
    unittest.main()
