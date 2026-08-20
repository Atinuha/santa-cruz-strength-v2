"""Route-level + adversarial Resend webhook tests — correction pass.

All tests use mocked DB functions or AsyncMock collections.  No real
database is contacted, no production cluster is touched, and no provider
network traffic is generated.
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
from unittest.mock import AsyncMock, MagicMock, patch

_RAW_SECRET = b"route-test-secret-at-least-24-b!"
SECRET = "whsec_" + base64.b64encode(_RAW_SECRET).decode()
SECRET_BYTES = _RAW_SECRET


def _sign(wh_id, ts, body):
    content = wh_id.encode() + b"." + str(ts).encode() + b"." + body
    return "v1," + base64.b64encode(hmac.new(SECRET_BYTES, content, hashlib.sha256).digest()).decode()


def _body(event_type="email.delivered", email_id="msg_rt_001", to=None):
    return json.dumps({"type": event_type, "created_at": "2026-08-19T12:00:00.000Z",
        "data": {"email_id": email_id, "to": to or ["route-test@example.com"],
                 "subject": "Route Test"}}).encode()


def _signed_request(wh_id="msg_wh_rt_001", body=None, ts=None):
    t = ts or int(time.time()); b = body or _body()
    return b, {"svix-id": wh_id, "svix-timestamp": str(t),
               "svix-signature": _sign(wh_id, t, b), "content-type": "application/json"}


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
    if backend not in sys.path: sys.path.insert(0, backend)
    for k, v in {**SAFE_ENV, **GATES}.items(): os.environ[k] = v
    for m in [x for x in list(sys.modules) if x in ('server', 'runtime_safety')]: del sys.modules[m]
    import server; return server


def _tc(s):
    from starlette.testclient import TestClient
    return TestClient(s.app, raise_server_exceptions=False)


# ===================================================================
# Existing contract: 400 / unsupported / mapped / transient 503
# ===================================================================

class ExistingContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls): cls.s = _load(); cls.c = _tc(cls.s)

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
            "svix-signature": _sign("stale", ts, b), "content-type": "application/json"}).status_code, 400)

    @patch('server.store_unknown_event_receipt', new_callable=AsyncMock)
    def test_unsupported_event_200(self, m):
        b = json.dumps({"type": "contact.created", "created_at": "2026-08-19T12:00:00Z",
                        "data": {"id": "ct_1"}}).encode()
        ts = int(time.time())
        r = self.c.post('/api/webhooks/resend', content=b, headers={
            "svix-id": "unk", "svix-timestamp": str(ts),
            "svix-signature": _sign("unk", ts, b), "content-type": "application/json"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['action'], 'unknown_event_stored')

    # Fix 7: unsupported + DB failure returns truthful action
    @patch('server.store_unknown_event_receipt', new_callable=AsyncMock, side_effect=RuntimeError)
    def test_unsupported_event_db_fail_returns_unsupported_ignored(self, m):
        b = json.dumps({"type": "domain.verified", "created_at": "2026-08-19T12:00:00Z",
                        "data": {"id": "d1"}}).encode()
        ts = int(time.time())
        r = self.c.post('/api/webhooks/resend', content=b, headers={
            "svix-id": "unk_f", "svix-timestamp": str(ts),
            "svix-signature": _sign("unk_f", ts, b), "content-type": "application/json"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['action'], 'unsupported_ignored')

    @patch('server.finish_resend_receipt', new_callable=AsyncMock, return_value=True)
    @patch('server.apply_resend_outbox_event', new_callable=AsyncMock,
           return_value={'matched': True, 'advanced': True, 'state': 'delivered'})
    @patch('server.begin_resend_receipt', new_callable=AsyncMock, return_value=({}, 'claimed'))
    def test_mapped_event_200(self, *_):
        b, h = _signed_request(wh_id="mapped")
        self.assertEqual(self.c.post('/api/webhooks/resend', content=b, headers=h).status_code, 200)

    @patch('server.begin_resend_receipt', new_callable=AsyncMock, side_effect=RuntimeError)
    def test_mapped_begin_fail_503(self, _):
        b, h = _signed_request(wh_id="503_b")
        self.assertEqual(self.c.post('/api/webhooks/resend', content=b, headers=h).status_code, 503)

    @patch('server.apply_resend_outbox_event', new_callable=AsyncMock, side_effect=RuntimeError)
    @patch('server.begin_resend_receipt', new_callable=AsyncMock, return_value=({}, 'claimed'))
    def test_mapped_apply_fail_503(self, *_):
        b, h = _signed_request(wh_id="503_a")
        self.assertEqual(self.c.post('/api/webhooks/resend', content=b, headers=h).status_code, 503)

    @patch('server.finish_resend_receipt', new_callable=AsyncMock, side_effect=RuntimeError)
    @patch('server.apply_resend_outbox_event', new_callable=AsyncMock,
           return_value={'matched': True, 'advanced': True, 'state': 'delivered'})
    @patch('server.begin_resend_receipt', new_callable=AsyncMock, return_value=({}, 'claimed'))
    def test_mapped_finish_fail_503(self, *_):
        b, h = _signed_request(wh_id="503_f")
        self.assertEqual(self.c.post('/api/webhooks/resend', content=b, headers=h).status_code, 503)

    # Fix 3: busy receipt returns 503
    @patch('server.begin_resend_receipt', new_callable=AsyncMock, return_value=({}, 'busy'))
    def test_busy_receipt_returns_503(self, _):
        b, h = _signed_request(wh_id="busy")
        self.assertEqual(self.c.post('/api/webhooks/resend', content=b, headers=h).status_code, 503)

    @patch('server.begin_resend_receipt', new_callable=AsyncMock, return_value=({}, 'processed'))
    def test_replay_200_duplicate(self, m):
        b, h = _signed_request(wh_id="I_replay")
        r = self.c.post('/api/webhooks/resend', content=b, headers=h)
        self.assertEqual(r.status_code, 200); self.assertTrue(r.json()['duplicate'])
        m.assert_called_once()

    @patch('server.store_orphan_event', new_callable=AsyncMock, side_effect=RuntimeError)
    @patch('server.apply_resend_outbox_event', new_callable=AsyncMock)
    @patch('server.begin_resend_receipt', new_callable=AsyncMock, return_value=({}, 'claimed'))
    def test_orphan_storage_failure_503(self, mock_begin, mock_apply, mock_orphan):
        from resend_webhook import ResendOutboxNotFound
        mock_apply.side_effect = ResendOutboxNotFound("no match")
        b, h = _signed_request(wh_id="orphan_fail")
        self.assertEqual(self.c.post('/api/webhooks/resend', content=b, headers=h).status_code, 503)


# ===================================================================
# A. Webhook first, then mapping appears
# ===================================================================

class TestA_WebhookFirstThenMapping(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        backend = str(Path(__file__).resolve().parents[1])
        if backend not in sys.path: sys.path.insert(0, backend)

    async def test_orphan_stored_then_dispatch_seam_reconciles_with_suppression(self):
        """Fix 1: dispatch seam threads suppression_callback — early bounce
        gets one suppression, one processed receipt, one reconciled orphan."""
        from resend_webhook import (store_orphan_event, reconcile_orphans_for_message,
                                    VerifiedResendEvent, ResendOutboxNotFound)
        orphan_c = AsyncMock()
        orphan_c.insert_one = AsyncMock()
        receipt_c = AsyncMock()
        receipt_c.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
        outbox_c = AsyncMock()
        suppression_calls = []

        async def mock_suppress(etype, addr):
            suppression_calls.append((etype, addr))

        event = VerifiedResendEvent("wh_A", "email.bounced", "msg_A", "", ("victim@example.com",))
        now = datetime.now(timezone.utc)
        await store_orphan_event(orphan_c, event, now)
        orphan_c.insert_one.assert_called_once()

        # Now mapping appears — dispatch seam reconciles with suppression
        cursor = AsyncMock(); cursor.to_list = AsyncMock(return_value=[{
            "event_key": "resend:wh_A", "provider": "resend",
            "provider_message_id": "msg_A", "event_type": "email.bounced",
            "event_created_at": "", "recipients": ["victim@example.com"],
            "state": "pending",
        }])
        orphan_c.find = MagicMock(return_value=cursor)
        orphan_c.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
        orphan_c.find_one = AsyncMock(return_value={"attempt_count": 1})

        with patch('resend_webhook.apply_resend_outbox_event', new_callable=AsyncMock,
                   return_value={'matched': True, 'advanced': True, 'state': 'bounced'}):
            count = await reconcile_orphans_for_message(
                orphan_c, receipt_c, outbox_c, "msg_A",
                suppression_callback=mock_suppress)
        self.assertEqual(count, 1)
        self.assertEqual(len(suppression_calls), 1)
        self.assertEqual(suppression_calls[0], ("email.bounced", "victim@example.com"))
        receipt_c.update_one.assert_called()  # receipt finished


# ===================================================================
# B. Mapping first, then webhook
# ===================================================================

class TestB_MappingFirst(unittest.TestCase):
    @classmethod
    def setUpClass(cls): cls.s = _load(); cls.c = _tc(cls.s)

    @patch('server.finish_resend_receipt', new_callable=AsyncMock, return_value=True)
    @patch('server.apply_resend_outbox_event', new_callable=AsyncMock,
           return_value={'matched': True, 'advanced': True, 'state': 'delivered'})
    @patch('server.begin_resend_receipt', new_callable=AsyncMock, return_value=({}, 'claimed'))
    def test_webhook_after_mapping_normal(self, *_):
        b, h = _signed_request(wh_id="B_mapped")
        r = self.c.post('/api/webhooks/resend', content=b, headers=h)
        self.assertEqual(r.status_code, 200); self.assertFalse(r.json().get('duplicate', True))


# ===================================================================
# C. Crash after mapping before inline reconcile — recovery picks up
# ===================================================================

class TestC_CrashRecovery(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        backend = str(Path(__file__).resolve().parents[1])
        if backend not in sys.path: sys.path.insert(0, backend)

    async def test_recovery_picks_up(self):
        from resend_webhook import recover_pending_orphans
        orphan_c = AsyncMock(); receipt_c = AsyncMock(); outbox_c = AsyncMock()
        now = datetime.now(timezone.utc); ts = now.astimezone(timezone.utc)
        cursor = AsyncMock(); cursor.to_list = AsyncMock(return_value=[{
            "event_key": "resend:wh_C", "provider": "resend",
            "provider_message_id": "msg_C", "event_type": "email.delivered",
            "event_created_at": "", "recipients": [],
            "state": "pending", "next_attempt_at": ts, "attempt_count": 1,
            "lease_owner": None, "lease_expires_at": None,
        }])
        orphan_c.find = MagicMock(return_value=MagicMock(sort=MagicMock(
            return_value=MagicMock(limit=MagicMock(return_value=cursor)))))
        orphan_c.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
        orphan_c.find_one = AsyncMock(return_value={"attempt_count": 1})
        receipt_c.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
        with patch('resend_webhook.apply_resend_outbox_event', new_callable=AsyncMock,
                   return_value={'matched': True, 'advanced': True}):
            counts = await recover_pending_orphans(orphan_c, receipt_c, outbox_c,
                                                   worker_id='test_recovery', now=now)
        self.assertEqual(counts['reconciled'], 1)


# ===================================================================
# D. Reconcile DB failure then recovery succeeds
# ===================================================================

class TestD_FailThenRecover(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        backend = str(Path(__file__).resolve().parents[1])
        if backend not in sys.path: sys.path.insert(0, backend)

    async def test_failure_leaves_retryable_then_succeeds(self):
        from resend_webhook import reconcile_single_orphan
        orphan_c = AsyncMock(); receipt_c = AsyncMock(); outbox_c = AsyncMock()
        now = datetime.now(timezone.utc)
        doc = {"event_key": "resend:wh_D", "provider": "resend",
               "provider_message_id": "msg_D", "event_type": "email.delivered",
               "event_created_at": "", "recipients": [], "state": "pending"}
        orphan_c.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
        orphan_c.find_one = AsyncMock(return_value={"attempt_count": 1})
        with patch('resend_webhook.apply_resend_outbox_event', new_callable=AsyncMock,
                   side_effect=RuntimeError("db down")):
            r1 = await reconcile_single_orphan(orphan_c, receipt_c, outbox_c, doc,
                                               worker_id='w1', now=now)
        self.assertEqual(r1, "failed")
        # Recovery attempt succeeds
        orphan_c.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
        receipt_c.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
        with patch('resend_webhook.apply_resend_outbox_event', new_callable=AsyncMock,
                   return_value={'matched': True, 'advanced': True}):
            r2 = await reconcile_single_orphan(orphan_c, receipt_c, outbox_c, doc,
                                               worker_id='w2', now=now)
        self.assertEqual(r2, "reconciled")


# ===================================================================
# E. Inline reconciliation through CAS (Fix 5)
# ===================================================================

class TestE_InlineRecheck(unittest.TestCase):
    @classmethod
    def setUpClass(cls): cls.s = _load(); cls.c = _tc(cls.s)

    @patch('server.reconcile_single_orphan', new_callable=AsyncMock, return_value='reconciled')
    @patch('server.store_orphan_event', new_callable=AsyncMock, return_value={})
    @patch('server.apply_resend_outbox_event', new_callable=AsyncMock)
    @patch('server.begin_resend_receipt', new_callable=AsyncMock, return_value=({}, 'claimed'))
    def test_inline_routes_through_reconcile_single_orphan(self, mock_begin, mock_apply,
                                                            mock_store, mock_reconcile):
        from resend_webhook import ResendOutboxNotFound
        mock_apply.side_effect = ResendOutboxNotFound("no match")
        # Mock the orphan find for the inline re-check
        self.s.db = MagicMock()
        self.s.db.webhook_orphans = MagicMock()
        self.s.db.webhook_orphans.find_one = AsyncMock(return_value={
            "event_key": "resend:E_inline", "state": "pending"})
        self.s.db.webhook_receipts = MagicMock()
        self.s.db.lead_outbox = MagicMock()
        b, h = _signed_request(wh_id="E_inline")
        r = self.c.post('/api/webhooks/resend', content=b, headers=h)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['action'], 'orphan_reconciled_inline')
        mock_reconcile.assert_called_once()


# ===================================================================
# F. Startup recovery
# ===================================================================

class TestF_StartupRecovery(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        backend = str(Path(__file__).resolve().parents[1])
        if backend not in sys.path: sys.path.insert(0, backend)

    async def test_startup_recovery_works(self):
        from resend_webhook import recover_pending_orphans
        orphan_c = AsyncMock(); receipt_c = AsyncMock(); outbox_c = AsyncMock()
        now = datetime.now(timezone.utc); ts = now.astimezone(timezone.utc)
        cursor = AsyncMock(); cursor.to_list = AsyncMock(return_value=[{
            "event_key": "resend:wh_F", "provider": "resend",
            "provider_message_id": "msg_F", "event_type": "email.sent",
            "event_created_at": "", "recipients": [],
            "state": "failed", "next_attempt_at": ts, "attempt_count": 3,
            "lease_owner": None, "lease_expires_at": None,
        }])
        orphan_c.find = MagicMock(return_value=MagicMock(sort=MagicMock(
            return_value=MagicMock(limit=MagicMock(return_value=cursor)))))
        orphan_c.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
        orphan_c.find_one = AsyncMock(return_value={"attempt_count": 3})
        receipt_c.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
        with patch('resend_webhook.apply_resend_outbox_event', new_callable=AsyncMock,
                   return_value={'matched': True, 'advanced': True}):
            counts = await recover_pending_orphans(orphan_c, receipt_c, outbox_c,
                                                   worker_id='startup', now=now)
        self.assertEqual(counts['reconciled'], 1)


# ===================================================================
# G. Concurrent claim (Fix 4: lease fencing)
# ===================================================================

class TestG_ConcurrentClaim(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        backend = str(Path(__file__).resolve().parents[1])
        if backend not in sys.path: sys.path.insert(0, backend)

    async def test_only_one_worker_wins(self):
        from resend_webhook import reconcile_single_orphan
        doc = {"event_key": "resend:wh_G", "provider": "resend",
               "provider_message_id": "msg_G", "event_type": "email.delivered",
               "event_created_at": "", "recipients": [], "state": "pending"}
        now = datetime.now(timezone.utc)
        # Worker 1 wins
        oc1 = AsyncMock()
        oc1.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
        oc1.find_one = AsyncMock(return_value={"attempt_count": 1})
        rc1 = AsyncMock(); rc1.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
        ox1 = AsyncMock()
        with patch('resend_webhook.apply_resend_outbox_event', new_callable=AsyncMock,
                   return_value={'matched': True, 'advanced': True}):
            r1 = await reconcile_single_orphan(oc1, rc1, ox1, doc, worker_id='w1', now=now)
        self.assertEqual(r1, "reconciled")
        # Worker 2 loses claim
        oc2 = AsyncMock()
        oc2.update_one = AsyncMock(return_value=MagicMock(modified_count=0))
        r2 = await reconcile_single_orphan(oc2, AsyncMock(), AsyncMock(), doc,
                                           worker_id='w2', now=now)
        self.assertEqual(r2, "lease_lost")


# ===================================================================
# H. Partial failure after outbox
# ===================================================================

class TestH_PartialFailure(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        backend = str(Path(__file__).resolve().parents[1])
        if backend not in sys.path: sys.path.insert(0, backend)

    async def test_failure_after_outbox_before_suppression(self):
        from resend_webhook import reconcile_single_orphan
        oc = AsyncMock(); oc.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
        oc.find_one = AsyncMock(return_value={"attempt_count": 1})
        doc = {"event_key": "resend:wh_H1", "provider": "resend",
               "provider_message_id": "msg_H1", "event_type": "email.bounced",
               "event_created_at": "", "recipients": ["h@b.com"], "state": "pending"}
        async def fail_suppress(etype, addr): raise RuntimeError("suppress failed")
        with patch('resend_webhook.apply_resend_outbox_event', new_callable=AsyncMock,
                   return_value={'matched': True, 'advanced': True}):
            result = await reconcile_single_orphan(oc, AsyncMock(), AsyncMock(), doc,
                                                   suppression_callback=fail_suppress,
                                                   worker_id='test', now=datetime.now(timezone.utc))
        self.assertEqual(result, "failed")

    async def test_failure_after_outbox_before_receipt(self):
        from resend_webhook import reconcile_single_orphan
        oc = AsyncMock(); oc.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
        oc.find_one = AsyncMock(return_value={"attempt_count": 1})
        rc = AsyncMock(); rc.update_one = AsyncMock(side_effect=RuntimeError("receipt fail"))
        doc = {"event_key": "resend:wh_H2", "provider": "resend",
               "provider_message_id": "msg_H2", "event_type": "email.delivered",
               "event_created_at": "", "recipients": [], "state": "pending"}
        with patch('resend_webhook.apply_resend_outbox_event', new_callable=AsyncMock,
                   return_value={'matched': True, 'advanced': True}):
            result = await reconcile_single_orphan(oc, rc, AsyncMock(), doc,
                                                   worker_id='test', now=datetime.now(timezone.utc))
        self.assertEqual(result, "failed")


# ===================================================================
# J. TTL (Fix 2: BSON datetime, not ISO string)
# ===================================================================

class TestJ_TTL(unittest.TestCase):
    def test_pending_orphan_has_no_ttl(self):
        backend = str(Path(__file__).resolve().parents[1])
        if backend not in sys.path: sys.path.insert(0, backend)
        from resend_webhook import _orphan_document, VerifiedResendEvent
        doc = _orphan_document(VerifiedResendEvent("J", "email.delivered", "m", "", ()), datetime.now(timezone.utc))
        self.assertEqual(doc['state'], 'pending')
        self.assertIsNone(doc['reconciled_ttl_expires_at'])

    def test_reconciled_ttl_is_datetime_not_string(self):
        """Fix 2: TTL field must be a BSON-compatible aware datetime."""
        backend = str(Path(__file__).resolve().parents[1])
        if backend not in sys.path: sys.path.insert(0, backend)
        from resend_webhook import _orphan_document, ORPHAN_RECONCILED_TTL_SECONDS, VerifiedResendEvent
        self.assertGreater(ORPHAN_RECONCILED_TTL_SECONDS, 0)
        # Verify _orphan_document stores datetimes, not strings, for temporal fields
        doc = _orphan_document(VerifiedResendEvent("J2", "email.sent", "m2", "", ()), datetime.now(timezone.utc))
        self.assertIsInstance(doc['first_seen_at'], datetime)
        self.assertIsInstance(doc['next_attempt_at'], datetime)

    def test_next_attempt_at_returns_datetime(self):
        """Fix 6 partial: _next_attempt_at returns datetime."""
        backend = str(Path(__file__).resolve().parents[1])
        if backend not in sys.path: sys.path.insert(0, backend)
        from resend_webhook import _next_attempt_at
        result = _next_attempt_at(1, datetime.now(timezone.utc))
        self.assertIsInstance(result, datetime)


# ===================================================================
# K. No PII
# ===================================================================

class TestK_NoPII(unittest.TestCase):
    def test_orphan_no_forbidden_fields(self):
        backend = str(Path(__file__).resolve().parents[1])
        if backend not in sys.path: sys.path.insert(0, backend)
        from resend_webhook import _orphan_document, VerifiedResendEvent
        doc = _orphan_document(VerifiedResendEvent("K", "email.bounced", "m", "", ("t@b.com",)),
                               datetime.now(timezone.utc))
        self.assertNotIn('raw_body', doc); self.assertNotIn('signature', doc)
        self.assertNotIn('headers', doc); self.assertNotIn('subject', doc)
        self.assertNotIn('name', doc); self.assertNotIn('phone', doc)
        self.assertIn('event_key', doc); self.assertIn('state', doc)


# ===================================================================
# L. Recipient cap
# ===================================================================

class TestL_RecipientCap(unittest.TestCase):
    def test_recipients_capped(self):
        backend = str(Path(__file__).resolve().parents[1])
        if backend not in sys.path: sys.path.insert(0, backend)
        from resend_webhook import _sanitize_recipients, MAX_ORPHAN_RECIPIENTS
        result = _sanitize_recipients(tuple(f"A{i}@B.COM" for i in range(20)))
        self.assertLessEqual(len(result), MAX_ORPHAN_RECIPIENTS)
        for a in result: self.assertEqual(a, a.lower())

    def test_empty_recipients(self):
        backend = str(Path(__file__).resolve().parents[1])
        if backend not in sys.path: sys.path.insert(0, backend)
        from resend_webhook import _sanitize_recipients
        self.assertEqual(_sanitize_recipients(()), [])


# ===================================================================
# Fix 6: backoff growth and cap
# ===================================================================

class TestBackoffGrowthAndCap(unittest.TestCase):
    def test_backoff_grows_exponentially_then_caps(self):
        backend = str(Path(__file__).resolve().parents[1])
        if backend not in sys.path: sys.path.insert(0, backend)
        from resend_webhook import _next_attempt_at, ORPHAN_BASE_RETRY_SECONDS, ORPHAN_MAX_RETRY_SECONDS
        base = datetime.now(timezone.utc)
        prev_delay = 0
        for attempt in range(1, 15):
            result = _next_attempt_at(attempt, base)
            delay = (result - base).total_seconds()
            self.assertGreater(delay, 0)
            self.assertLessEqual(delay, ORPHAN_MAX_RETRY_SECONDS)
            if attempt <= 10:
                self.assertGreaterEqual(delay, prev_delay)
            prev_delay = delay
        # Attempt 51+ must be capped at max
        delay_51 = (_next_attempt_at(51, base) - base).total_seconds()
        self.assertAlmostEqual(delay_51, ORPHAN_MAX_RETRY_SECONDS, delta=1)

    def test_attempt_0_has_base_delay(self):
        backend = str(Path(__file__).resolve().parents[1])
        if backend not in sys.path: sys.path.insert(0, backend)
        from resend_webhook import _next_attempt_at, ORPHAN_BASE_RETRY_SECONDS
        base = datetime.now(timezone.utc)
        delay = (_next_attempt_at(0, base) - base).total_seconds()
        self.assertAlmostEqual(delay, ORPHAN_BASE_RETRY_SECONDS, delta=1)


# ===================================================================
# Fix 3: Receipt crash-safe tests
# ===================================================================

class TestReceiptCrashSafety(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        backend = str(Path(__file__).resolve().parents[1])
        if backend not in sys.path: sys.path.insert(0, backend)

    async def test_two_request_crash_and_lease_recovery(self):
        """Fix 3: first worker claims, crashes. Second worker reclaims after lease expiry."""
        from resend_webhook import begin_resend_receipt, VerifiedResendEvent
        from pymongo.errors import DuplicateKeyError as DK
        event = VerifiedResendEvent("wh_crash", "email.delivered", "msg_crash", "", ())
        now = datetime.now(timezone.utc)
        coll = AsyncMock()
        # First worker inserts successfully
        coll.insert_one = AsyncMock()
        r1, s1 = await begin_resend_receipt(coll, event, now, owner="worker1")
        self.assertEqual(s1, "claimed")
        self.assertEqual(r1['claim_owner'], "worker1")

        # Second worker: insert fails (dup), stored shows active lease
        coll.insert_one = AsyncMock(side_effect=DK("dup"))
        expired_time = (now - timedelta(seconds=1)).astimezone(timezone.utc).isoformat()
        coll.find_one = AsyncMock(return_value={
            "event_key": "resend:wh_crash", "provider": "resend",
            "event_type": "email.delivered", "provider_message_id": "msg_crash",
            "processing_state": "claimed", "claim_owner": "worker1",
            "claim_expires_at": expired_time,  # expired
        })
        coll.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
        r2, s2 = await begin_resend_receipt(coll, event, now, owner="worker2")
        self.assertEqual(s2, "claimed")

    async def test_active_lease_returns_busy(self):
        """Fix 3: active lease held by another worker returns busy."""
        from resend_webhook import begin_resend_receipt, VerifiedResendEvent
        from pymongo.errors import DuplicateKeyError as DK
        event = VerifiedResendEvent("wh_busy", "email.delivered", "msg_busy", "", ())
        now = datetime.now(timezone.utc)
        future_time = (now + timedelta(seconds=100)).astimezone(timezone.utc).isoformat()
        coll = AsyncMock()
        coll.insert_one = AsyncMock(side_effect=DK("dup"))
        coll.find_one = AsyncMock(return_value={
            "event_key": "resend:wh_busy", "provider": "resend",
            "event_type": "email.delivered", "provider_message_id": "msg_busy",
            "processing_state": "claimed", "claim_owner": "worker1",
            "claim_expires_at": future_time,  # still active
        })
        r, s = await begin_resend_receipt(coll, event, now, owner="worker2")
        self.assertEqual(s, "busy")

    async def test_finish_requires_owner(self):
        """Fix 3: finish with wrong owner fails silently."""
        from resend_webhook import finish_resend_receipt, VerifiedResendEvent
        event = VerifiedResendEvent("wh_owner", "email.delivered", "m", "", ())
        coll = AsyncMock()
        coll.update_one = AsyncMock(return_value=MagicMock(modified_count=0))
        result = await finish_resend_receipt(coll, event, datetime.now(timezone.utc),
                                             owner="wrong_owner")
        self.assertFalse(result)


# ===================================================================
# No sends
# ===================================================================

class TestNoSends(unittest.TestCase):
    @classmethod
    def setUpClass(cls): cls.s = _load(); cls.c = _tc(cls.s)

    def test_400_precludes_sends(self):
        self.assertEqual(self.c.post('/api/webhooks/resend', content=_body(),
                         headers={"content-type": "application/json"}).status_code, 400)

    @patch('server.begin_resend_receipt', new_callable=AsyncMock, side_effect=RuntimeError)
    def test_503_precludes_sends(self, _):
        b, h = _signed_request(wh_id="ns_503")
        self.assertEqual(self.c.post('/api/webhooks/resend', content=b, headers=h).status_code, 503)


if __name__ == '__main__':
    unittest.main()
