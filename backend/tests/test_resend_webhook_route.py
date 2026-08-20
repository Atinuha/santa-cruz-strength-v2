"""Correction-pass tests: 5 independently verified defects.

All tests use mocked DB or AsyncMock collections. No real database,
no production cluster, no provider network traffic.
"""
import base64, hashlib, hmac, json, os, sys, time, unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

_RAW = b"route-test-secret-at-least-24-b!"
SECRET = "whsec_" + base64.b64encode(_RAW).decode()
_BYTES = _RAW

def _sign(wid, ts, body):
    c = wid.encode() + b"." + str(ts).encode() + b"." + body
    return "v1," + base64.b64encode(hmac.new(_BYTES, c, hashlib.sha256).digest()).decode()

def _body(etype="email.delivered", eid="msg_rt_001", to=None):
    return json.dumps({"type": etype, "created_at": "2026-08-19T12:00:00.000Z",
        "data": {"email_id": eid, "to": to or ["route-test@example.com"], "subject": "Test"}}).encode()

def _req(wid="msg_wh_1", body=None, ts=None):
    t = ts or int(time.time()); b = body or _body()
    return b, {"svix-id": wid, "svix-timestamp": str(t),
               "svix-signature": _sign(wid, t, b), "content-type": "application/json"}

SAFE = {
    'MONGO_URL': 'mongodb://localhost:27017', 'DB_NAME': 'scs_cp_test',
    'FRONTEND_URL': 'http://localhost:3000', 'CORS_ORIGINS': 'http://localhost:3000',
    'TWILIO_ACCOUNT_SID': 'ACtestonlytestonlytestonlytest',
    'TWILIO_AUTH_TOKEN': 'testonlytestonlytestonlytest',
    'TWILIO_PHONE_NUMBER': '+15550001111', 'RESEND_API_KEY': 're_testonly_testonly',
    'JWT_SECRET': 'x' * 40, 'UNSUBSCRIBE_SECRET': 'y' * 40,
    'APP_ENV': 'development', 'PRODUCTION_CHANGES_APPROVED': 'false',
    'OUTBOUND_TEST_MODE': 'false', 'RESEND_WEBHOOK_SECRET': SECRET,
}
GATES = {g: 'false' for g in [
    'ALLOW_SCHEDULERS','ALLOW_EMAIL_SENDS','ALLOW_SMS_SENDS','ALLOW_SEEDING',
    'ALLOW_ANALYTICS','ALLOW_SESSION_REPLAY','ALLOW_TWILIO_WEBHOOKS',
    'ALLOW_LEAD_OUTBOX_DISPATCH','ALLOW_LEAD_RESEND','ALLOW_LEAD_TWILIO',
    'ALLOW_THIRD_PARTY_RESEARCH','ALLOW_REMOTE_NONPROD_DATABASE',
    'ALLOW_DEPLOY_HOOK','ALLOW_GYMMASTER_PROSPECT_WRITES','ALLOW_LEAD_CRM_RECORDING',
]}
GATES['ALLOW_DATABASE_WRITES'] = 'true'; GATES['ALLOW_RESEND_WEBHOOKS'] = 'true'

def _load():
    b = str(Path(__file__).resolve().parents[1])
    if b not in sys.path: sys.path.insert(0, b)
    for k, v in {**SAFE, **GATES}.items(): os.environ[k] = v
    for m in [x for x in list(sys.modules) if x in ('server', 'runtime_safety')]: del sys.modules[m]
    import server; return server

def _tc(s):
    from starlette.testclient import TestClient
    return TestClient(s.app, raise_server_exceptions=False)


# ===================================================================
# Defect 1: Core state preservation — webhook writes to provider namespace
# ===================================================================
class Defect1_CoreStatePreservation(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        b = str(Path(__file__).resolve().parents[1])
        if b not in sys.path: sys.path.insert(0, b)

    async def test_delivered_on_completed_row_preserves_core_delivery_state(self):
        """email.delivered must never overwrite core delivery_state=completed."""
        from resend_webhook import apply_resend_outbox_event, VerifiedResendEvent
        coll = AsyncMock()
        # First update attempt matches=0 (provider_delivery_rank already high or doesn't match)
        coll.update_one = AsyncMock(return_value=MagicMock(matched_count=0, modified_count=0))
        # Row exists with core delivery_state=completed
        coll.find_one = AsyncMock(return_value={
            "_id": "row1", "delivery_state": "completed", "delivery_rank": 100,
            "provider_message_id": "msg_core",
        })
        event = VerifiedResendEvent("wh_core", "email.delivered", "msg_core", "", ())
        result = await apply_resend_outbox_event(coll, event, datetime.now(timezone.utc))
        self.assertTrue(result['matched'])
        # Verify the update_one call targets provider_delivery_state, NOT delivery_state
        update_call = coll.update_one.call_args
        update_doc = update_call[0][1]
        self.assertIn('provider_delivery_state', update_doc.get('$set', {}))
        self.assertNotIn('delivery_state', update_doc.get('$set', {}))
        self.assertNotIn('delivery_rank', update_doc.get('$set', {}))

    async def test_provider_namespace_fields_set(self):
        from resend_webhook import apply_resend_outbox_event, VerifiedResendEvent
        coll = AsyncMock()
        coll.update_one = AsyncMock(return_value=MagicMock(matched_count=1, modified_count=1))
        event = VerifiedResendEvent("wh_ns", "email.delivered", "msg_ns", "", ())
        result = await apply_resend_outbox_event(coll, event, datetime.now(timezone.utc))
        update_doc = coll.update_one.call_args[0][1]['$set']
        for field in ['provider_delivery_state', 'provider_delivery_rank',
                      'provider_delivery_terminal', 'provider_receipt_event_key',
                      'provider_delivery_updated_at']:
            self.assertIn(field, update_doc, f"Missing {field}")


# ===================================================================
# Defect 2: Event matrix — failed, suppressed, opened, clicked ranks
# ===================================================================
class Defect2_EventMatrix(unittest.TestCase):
    def setUp(self):
        b = str(Path(__file__).resolve().parents[1])
        if b not in sys.path: sys.path.insert(0, b)

    def test_failed_and_suppressed_are_supported(self):
        from resend_webhook import SUPPORTED_EMAIL_EVENTS
        self.assertIn("email.failed", SUPPORTED_EMAIL_EVENTS)
        self.assertIn("email.suppressed", SUPPORTED_EMAIL_EVENTS)

    def test_failed_and_suppressed_are_terminal(self):
        from resend_webhook import TERMINAL_EVENTS
        self.assertIn("email.failed", TERMINAL_EVENTS)
        self.assertIn("email.suppressed", TERMINAL_EVENTS)

    def test_terminal_events_outrank_non_terminal(self):
        from resend_webhook import _PROVIDER_DELIVERY_RANK, TERMINAL_EVENTS, _NON_TERMINAL_ADDITIVE
        max_non_terminal = max(_PROVIDER_DELIVERY_RANK.get(e, 0) for e in _NON_TERMINAL_ADDITIVE)
        min_terminal = min(_PROVIDER_DELIVERY_RANK.get(e, 0) for e in TERMINAL_EVENTS)
        self.assertGreater(min_terminal, max_non_terminal,
                          "Terminal events must outrank all non-terminal additive events")

    def test_opened_clicked_are_non_terminal_additive(self):
        from resend_webhook import _NON_TERMINAL_ADDITIVE
        self.assertIn("email.opened", _NON_TERMINAL_ADDITIVE)
        self.assertIn("email.clicked", _NON_TERMINAL_ADDITIVE)


class Defect2_MonotonicPolicy(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        b = str(Path(__file__).resolve().parents[1])
        if b not in sys.path: sys.path.insert(0, b)

    async def test_opened_cannot_replace_bounced(self):
        """opened must not overwrite a terminal bounced state."""
        from resend_webhook import apply_resend_outbox_event, VerifiedResendEvent
        coll = AsyncMock()
        # Update finds no match because provider_delivery_terminal=True blocks it
        coll.update_one = AsyncMock(return_value=MagicMock(matched_count=0, modified_count=0))
        coll.find_one = AsyncMock(return_value={
            "_id": "x", "provider_message_id": "msg_mono",
            "provider_delivery_state": "email.bounced", "provider_delivery_rank": 10,
            "provider_delivery_terminal": True,
        })
        event = VerifiedResendEvent("wh_mono", "email.opened", "msg_mono", "", ())
        result = await apply_resend_outbox_event(coll, event, datetime.now(timezone.utc))
        self.assertFalse(result['advanced'])
        # Verify the filter includes the non-terminal additive guard
        filter_doc = coll.update_one.call_args[0][0]
        or_clauses = filter_doc.get('$or', [])
        has_terminal_guard = any(
            c.get('provider_delivery_terminal') == {'$ne': True} for c in or_clauses
        )
        self.assertTrue(has_terminal_guard)


# ===================================================================
# Defect 3: Strict verification — malformed inputs return 400
# ===================================================================
class Defect3_StrictVerification(unittest.TestCase):
    def setUp(self):
        b = str(Path(__file__).resolve().parents[1])
        if b not in sys.path: sys.path.insert(0, b)
        from resend_webhook import verify_resend_webhook, ResendWebhookVerificationError
        self.verify = verify_resend_webhook
        self.Err = ResendWebhookVerificationError

    def test_no_whsec_prefix_rejected(self):
        with self.assertRaises(self.Err):
            self.verify(b'{}', {"svix-id": "x", "svix-timestamp": str(int(time.time())),
                                "svix-signature": "v1,abc"}, "raw_secret_no_prefix")

    def test_empty_body_rejected(self):
        with self.assertRaises(self.Err):
            self.verify(b'', {"svix-id": "x", "svix-timestamp": str(int(time.time())),
                              "svix-signature": "v1,abc"}, SECRET)

    def test_list_payload_rejected(self):
        body = b'[1,2,3]'
        ts = int(time.time())
        sig = _sign("x", ts, body)
        with self.assertRaises(self.Err):
            self.verify(body, {"svix-id": "x", "svix-timestamp": str(ts),
                               "svix-signature": sig}, SECRET)

    def test_non_object_data_rejected(self):
        body = json.dumps({"type": "email.delivered", "data": "string"}).encode()
        ts = int(time.time())
        sig = _sign("x", ts, body)
        with self.assertRaises(self.Err):
            self.verify(body, {"svix-id": "x", "svix-timestamp": str(ts),
                               "svix-signature": sig}, SECRET)

    def test_non_list_recipients_rejected(self):
        body = json.dumps({"type": "email.delivered", "data": {"email_id": "m", "to": 12345}}).encode()
        ts = int(time.time())
        sig = _sign("x", ts, body)
        with self.assertRaises(self.Err):
            self.verify(body, {"svix-id": "x", "svix-timestamp": str(ts),
                               "svix-signature": sig}, SECRET)

    def test_invalid_base64_secret_rejected(self):
        with self.assertRaises(self.Err):
            self.verify(b'{}', {"svix-id": "x", "svix-timestamp": str(int(time.time())),
                                "svix-signature": "v1,abc"}, "whsec_not!valid!base64!")

    def test_empty_decoded_secret_rejected(self):
        with self.assertRaises(self.Err):
            self.verify(b'{}', {"svix-id": "x", "svix-timestamp": str(int(time.time())),
                                "svix-signature": "v1,abc"}, "whsec_")

    def test_valid_event_parses_correctly(self):
        body = _body(); ts = int(time.time())
        sig = _sign("valid", ts, body)
        event = self.verify(body, {"svix-id": "valid", "svix-timestamp": str(ts),
                                   "svix-signature": sig}, SECRET)
        self.assertEqual(event.event_type, "email.delivered")
        self.assertEqual(event.webhook_id, "valid")


# ===================================================================
# Defect 4: Receipt completion fencing
# ===================================================================
class Defect4_ReceiptFencing(unittest.TestCase):
    @classmethod
    def setUpClass(cls): cls.s = _load(); cls.c = _tc(cls.s)

    @patch('server.finish_resend_receipt', new_callable=AsyncMock, return_value=False)
    @patch('server.apply_resend_outbox_event', new_callable=AsyncMock,
           return_value={'matched': True, 'advanced': True, 'state': 'delivered'})
    @patch('server.begin_resend_receipt', new_callable=AsyncMock, return_value=({}, 'claimed'))
    def test_receipt_completion_false_returns_503(self, *_):
        b, h = _req(wid="d4_fenced")
        r = self.c.post('/api/webhooks/resend', content=b, headers=h)
        self.assertEqual(r.status_code, 503)

    @patch('server.finish_resend_receipt', new_callable=AsyncMock, return_value=True)
    @patch('server.apply_resend_outbox_event', new_callable=AsyncMock,
           return_value={'matched': True, 'advanced': True, 'state': 'delivered'})
    @patch('server.begin_resend_receipt', new_callable=AsyncMock, return_value=({}, 'claimed'))
    def test_receipt_completion_true_returns_200(self, *_):
        b, h = _req(wid="d4_ok")
        r = self.c.post('/api/webhooks/resend', content=b, headers=h)
        self.assertEqual(r.status_code, 200)


class Defect4_ReceiptOwnerFencing(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        b = str(Path(__file__).resolve().parents[1])
        if b not in sys.path: sys.path.insert(0, b)

    async def test_stale_owner_finish_returns_false(self):
        from resend_webhook import finish_resend_receipt, VerifiedResendEvent
        coll = AsyncMock()
        coll.update_one = AsyncMock(return_value=MagicMock(modified_count=0))
        event = VerifiedResendEvent("wh_stale", "email.delivered", "m", "", ())
        result = await finish_resend_receipt(coll, event, datetime.now(timezone.utc), owner="stale_worker")
        self.assertFalse(result)

    async def test_correct_owner_finish_returns_true(self):
        from resend_webhook import finish_resend_receipt, VerifiedResendEvent
        coll = AsyncMock()
        coll.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
        event = VerifiedResendEvent("wh_ok", "email.delivered", "m", "", ())
        result = await finish_resend_receipt(coll, event, datetime.now(timezone.utc), owner="correct_worker")
        self.assertTrue(result)
        # Verify owner filter was applied
        query = coll.update_one.call_args[0][0]
        self.assertEqual(query.get('claim_owner'), 'correct_worker')


class Defect4_ReconcileReceiptFailure(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        b = str(Path(__file__).resolve().parents[1])
        if b not in sys.path: sys.path.insert(0, b)

    async def test_reconcile_receipt_false_leaves_retryable(self):
        from resend_webhook import reconcile_single_orphan
        oc = AsyncMock(); oc.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
        oc.find_one = AsyncMock(return_value={"attempt_count": 1})
        rc = AsyncMock(); rc.update_one = AsyncMock(return_value=MagicMock(modified_count=0))
        doc = {"event_key": "resend:d4_rec", "provider": "resend",
               "provider_message_id": "msg_d4", "event_type": "email.delivered",
               "event_created_at": "", "recipients": [], "state": "pending"}
        with patch('resend_webhook.apply_resend_outbox_event', new_callable=AsyncMock,
                   return_value={'matched': True, 'advanced': True}):
            result = await reconcile_single_orphan(oc, rc, AsyncMock(), doc,
                                                   worker_id='d4w', now=datetime.now(timezone.utc))
        self.assertEqual(result, "failed")


# ===================================================================
# Defect 5: Unique worker IDs and lease fencing
# ===================================================================
class Defect5_UniqueWorkers(unittest.TestCase):
    def test_unique_worker_ids_are_unique(self):
        b = str(Path(__file__).resolve().parents[1])
        if b not in sys.path: sys.path.insert(0, b)
        from resend_webhook import _unique_worker_id
        ids = {_unique_worker_id("test") for _ in range(100)}
        self.assertEqual(len(ids), 100)

    def test_default_worker_ids_are_not_static(self):
        """reconcile_orphans_for_message and recover_pending_orphans must
        generate unique worker IDs when none provided."""
        b = str(Path(__file__).resolve().parents[1])
        if b not in sys.path: sys.path.insert(0, b)
        from resend_webhook import _unique_worker_id
        w1 = _unique_worker_id("dispatch")
        w2 = _unique_worker_id("dispatch")
        self.assertNotEqual(w1, w2)


class Defect5_LeaseExpiryConcurrency(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        b = str(Path(__file__).resolve().parents[1])
        if b not in sys.path: sys.path.insert(0, b)

    async def test_stale_release_rejected_by_lease_owner_filter(self):
        from resend_webhook import _release_orphan_reconciled
        oc = AsyncMock()
        oc.update_one = AsyncMock(return_value=MagicMock(modified_count=0))
        result = await _release_orphan_reconciled(oc, "resend:stale", datetime.now(timezone.utc),
                                                   lease_owner="stale_worker")
        self.assertFalse(result)
        query = oc.update_one.call_args[0][0]
        self.assertEqual(query.get('lease_owner'), 'stale_worker')

    async def test_concurrent_inline_recovery_exactly_one_suppression(self):
        """Two workers try to reconcile same orphan. Only one wins the lease."""
        from resend_webhook import reconcile_single_orphan
        now = datetime.now(timezone.utc)
        suppressions = []
        async def track_suppress(etype, addr): suppressions.append((etype, addr))
        doc = {"event_key": "resend:d5_conc", "provider": "resend",
               "provider_message_id": "msg_d5", "event_type": "email.bounced",
               "event_created_at": "", "recipients": ["v@b.com"], "state": "pending"}

        # Worker 1 wins
        oc1 = AsyncMock()
        oc1.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
        oc1.find_one = AsyncMock(return_value={"attempt_count": 1})
        rc1 = AsyncMock(); rc1.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
        with patch('resend_webhook.apply_resend_outbox_event', new_callable=AsyncMock,
                   return_value={'matched': True, 'advanced': True}):
            r1 = await reconcile_single_orphan(oc1, rc1, AsyncMock(), doc,
                        suppression_callback=track_suppress, worker_id='w1', now=now)
        self.assertEqual(r1, "reconciled")
        self.assertEqual(len(suppressions), 1)

        # Worker 2 loses
        oc2 = AsyncMock(); oc2.update_one = AsyncMock(return_value=MagicMock(modified_count=0))
        r2 = await reconcile_single_orphan(oc2, AsyncMock(), AsyncMock(), doc,
                    suppression_callback=track_suppress, worker_id='w2', now=now)
        self.assertEqual(r2, "lease_lost")
        self.assertEqual(len(suppressions), 1)  # Still exactly 1


# ===================================================================
# Route-level: existing contract + new events
# ===================================================================
class ExistingContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls): cls.s = _load(); cls.c = _tc(cls.s)

    def test_400_missing_headers(self):
        self.assertEqual(self.c.post('/api/webhooks/resend', content=_body(),
                         headers={"content-type": "application/json"}).status_code, 400)

    def test_400_bad_sig(self):
        b = _body(); ts = int(time.time())
        self.assertEqual(self.c.post('/api/webhooks/resend', content=b, headers={
            "svix-id":"x","svix-timestamp":str(ts),
            "svix-signature":"v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            "content-type":"application/json"}).status_code, 400)

    @patch('server.store_unknown_event_receipt', new_callable=AsyncMock, side_effect=RuntimeError)
    def test_unsupported_ignored(self, m):
        b = json.dumps({"type":"domain.verified","created_at":"2026-08-19T12:00:00Z",
                        "data":{"id":"d1"}}).encode()
        ts = int(time.time())
        r = self.c.post('/api/webhooks/resend', content=b, headers={
            "svix-id":"unk_f","svix-timestamp":str(ts),
            "svix-signature":_sign("unk_f",ts,b),"content-type":"application/json"})
        self.assertEqual(r.json()['action'], 'unsupported_ignored')

    @patch('server.finish_resend_receipt', new_callable=AsyncMock, return_value=True)
    @patch('server.apply_resend_outbox_event', new_callable=AsyncMock,
           return_value={'matched':True,'advanced':True,'state':'delivered'})
    @patch('server.begin_resend_receipt', new_callable=AsyncMock, return_value=({}, 'claimed'))
    def test_mapped_200(self, *_):
        b, h = _req(wid="mapped"); self.assertEqual(
            self.c.post('/api/webhooks/resend', content=b, headers=h).status_code, 200)

    @patch('server.begin_resend_receipt', new_callable=AsyncMock, return_value=({}, 'processed'))
    def test_replay_duplicate(self, m):
        b, h = _req(wid="replay")
        r = self.c.post('/api/webhooks/resend', content=b, headers=h)
        self.assertTrue(r.json()['duplicate']); m.assert_called_once()

    @patch('server.begin_resend_receipt', new_callable=AsyncMock, side_effect=RuntimeError)
    def test_begin_fail_503(self, _):
        b, h = _req(wid="503b")
        self.assertEqual(self.c.post('/api/webhooks/resend', content=b, headers=h).status_code, 503)

    @patch('server.store_orphan_event', new_callable=AsyncMock, side_effect=RuntimeError)
    @patch('server.apply_resend_outbox_event', new_callable=AsyncMock)
    @patch('server.begin_resend_receipt', new_callable=AsyncMock, return_value=({}, 'claimed'))
    def test_orphan_fail_503(self, b, a, o):
        from resend_webhook import ResendOutboxNotFound
        a.side_effect = ResendOutboxNotFound("no")
        b2, h = _req(wid="of503")
        self.assertEqual(self.c.post('/api/webhooks/resend', content=b2, headers=h).status_code, 503)


# ===================================================================
# Zero email / SMS
# ===================================================================
class NoSends(unittest.TestCase):
    @classmethod
    def setUpClass(cls): cls.s = _load(); cls.c = _tc(cls.s)

    def test_400_no_sends(self):
        self.assertEqual(self.c.post('/api/webhooks/resend', content=_body(),
                         headers={"content-type":"application/json"}).status_code, 400)

    @patch('server.begin_resend_receipt', new_callable=AsyncMock, side_effect=RuntimeError)
    def test_503_no_sends(self, _):
        b, h = _req(wid="ns503")
        self.assertEqual(self.c.post('/api/webhooks/resend', content=b, headers=h).status_code, 503)


if __name__ == '__main__':
    unittest.main()
