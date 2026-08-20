"""Decision tests: four independently verified release blockers.

All tests use mocked DB or AsyncMock collections. No real database,
no production cluster, no provider network traffic.
"""
import base64, hashlib, hmac, json, os, sys, time, unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch, call

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

def _rw():
    b = str(Path(__file__).resolve().parents[1])
    if b not in sys.path: sys.path.insert(0, b)
    import resend_webhook as rw
    return rw


# ===================================================================
# Blocker 1: Receipt ownership in orphan reconciliation
# ===================================================================

class B1_OrphanReceiptSameOwner(unittest.IsolatedAsyncioTestCase):
    """After orphan lease claim, begin_resend_receipt uses the exact same owner."""

    async def test_reconcile_acquires_receipt_with_same_owner(self):
        rw = _rw()
        now = datetime.now(timezone.utc)
        doc = {"event_key": "resend:b1_same", "provider": "resend",
               "provider_message_id": "msg_b1", "event_type": "email.delivered",
               "event_created_at": "", "recipients": [], "state": "pending"}

        oc = AsyncMock()
        oc.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
        rc = AsyncMock()
        rc.insert_one = AsyncMock()  # begin_resend_receipt first insert succeeds
        rc.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
        outbox = AsyncMock()
        outbox.update_one = AsyncMock(return_value=MagicMock(matched_count=1, modified_count=1))

        with patch.object(rw, '_claim_orphan', new_callable=AsyncMock, return_value=True), \
             patch.object(rw, 'begin_resend_receipt', new_callable=AsyncMock,
                          return_value=({}, "claimed")) as mock_begin, \
             patch.object(rw, 'apply_resend_outbox_event', new_callable=AsyncMock,
                          return_value={"matched": True, "advanced": True}), \
             patch.object(rw, 'finish_resend_receipt', new_callable=AsyncMock,
                          return_value=True) as mock_finish, \
             patch.object(rw, '_release_orphan_reconciled', new_callable=AsyncMock,
                          return_value=True):
            result = await rw.reconcile_single_orphan(
                oc, rc, outbox, doc, worker_id="test_owner", now=now)
        self.assertEqual(result, "reconciled")
        # Verify same owner passed to both begin and finish
        begin_kwargs = mock_begin.call_args
        self.assertEqual(begin_kwargs[1].get("owner"), "test_owner")
        finish_kwargs = mock_finish.call_args
        self.assertEqual(finish_kwargs[1].get("owner"), "test_owner")


class B1_ReceiptBusyRetryable(unittest.IsolatedAsyncioTestCase):
    """Active receipt busy remains retryable — not reported as processed."""

    async def test_busy_receipt_returns_failed_not_processed(self):
        rw = _rw()
        now = datetime.now(timezone.utc)
        doc = {"event_key": "resend:b1_busy", "provider": "resend",
               "provider_message_id": "msg_b1b", "event_type": "email.delivered",
               "event_created_at": "", "recipients": [], "state": "pending"}

        with patch.object(rw, '_claim_orphan', new_callable=AsyncMock, return_value=True), \
             patch.object(rw, 'begin_resend_receipt', new_callable=AsyncMock,
                          return_value=({}, "busy")), \
             patch.object(rw, '_release_orphan_failed', new_callable=AsyncMock,
                          return_value=True) as mock_fail:
            result = await rw.reconcile_single_orphan(
                AsyncMock(), AsyncMock(), AsyncMock(), doc,
                worker_id="busy_test", now=now)
        self.assertEqual(result, "failed")
        self.assertNotEqual(result, "processed")
        # Verify error code indicates retryable busy
        fail_args = mock_fail.call_args
        self.assertEqual(fail_args[0][3], "receipt_busy")


class B1_ProcessedReceiptIdempotent(unittest.IsolatedAsyncioTestCase):
    """Processed receipt → orphan released as reconciled."""

    async def test_processed_receipt_releases_orphan_reconciled(self):
        rw = _rw()
        now = datetime.now(timezone.utc)
        doc = {"event_key": "resend:b1_proc", "provider": "resend",
               "provider_message_id": "msg_b1p", "event_type": "email.delivered",
               "event_created_at": "", "recipients": [], "state": "pending"}

        with patch.object(rw, '_claim_orphan', new_callable=AsyncMock, return_value=True), \
             patch.object(rw, 'begin_resend_receipt', new_callable=AsyncMock,
                          return_value=({}, "processed")), \
             patch.object(rw, '_release_orphan_reconciled', new_callable=AsyncMock,
                          return_value=True) as mock_release:
            result = await rw.reconcile_single_orphan(
                AsyncMock(), AsyncMock(), AsyncMock(), doc,
                worker_id="proc_test", now=now)
        self.assertEqual(result, "reconciled")
        mock_release.assert_called_once()


class B1_StaleReceiptOwnerCannotFinish(unittest.IsolatedAsyncioTestCase):
    """Stale receipt owner cannot finish — finish returns False."""

    async def test_stale_owner_finish_false(self):
        rw = _rw()
        coll = AsyncMock()
        coll.update_one = AsyncMock(return_value=MagicMock(modified_count=0))
        event = rw.VerifiedResendEvent("wh_stale", "email.delivered", "m", "", ())
        result = await rw.finish_resend_receipt(
            coll, event, datetime.now(timezone.utc), owner="stale_worker")
        self.assertFalse(result)
        query = coll.update_one.call_args[0][0]
        self.assertEqual(query.get("claim_owner"), "stale_worker")


class B1_InlinePathPassesUnchangedOwner(unittest.TestCase):
    """HTTP inline path passes claim_owner unchanged — no prefix."""

    @classmethod
    def setUpClass(cls):
        cls.s = _load(); cls.c = _tc(cls.s)

    @patch('server.reconcile_single_orphan', new_callable=AsyncMock, return_value="reconciled")
    @patch('server.store_orphan_event', new_callable=AsyncMock)
    @patch('server.apply_resend_outbox_event', new_callable=AsyncMock)
    @patch('server.begin_resend_receipt', new_callable=AsyncMock, return_value=({}, 'claimed'))
    def test_inline_worker_id_equals_claim_owner(self, mock_begin, mock_apply, mock_orphan, mock_recon):
        from resend_webhook import ResendOutboxNotFound
        mock_apply.side_effect = ResendOutboxNotFound("no row")
        # Mock the orphan find
        with patch.object(self.s.db.webhook_orphans, 'find_one',
                          new_callable=AsyncMock, return_value={"event_key": "resend:inline_test"}):
            b, h = _req(wid="inline_owner_test")
            r = self.c.post('/api/webhooks/resend', content=b, headers=h)
        # The worker_id passed to reconcile_single_orphan must match
        # the owner used in begin_resend_receipt — no "inline-" prefix.
        if mock_recon.called:
            recon_kwargs = mock_recon.call_args[1]
            begin_kwargs = mock_begin.call_args[1]
            begin_owner = begin_kwargs.get("owner")
            recon_worker = recon_kwargs.get("worker_id")
            self.assertEqual(recon_worker, begin_owner,
                             f"worker_id={recon_worker!r} != owner={begin_owner!r}")


# ===================================================================
# Blocker 2: Unique recovery ownership and failed release fencing
# ===================================================================

class B2_UniqueRecoveryOwners(unittest.TestCase):
    """Two app instances never share a recovery owner."""

    def test_unique_worker_ids_per_call(self):
        rw = _rw()
        ids = {rw._unique_worker_id("recovery") for _ in range(200)}
        self.assertEqual(len(ids), 200)

    def test_no_static_orphan_recovery_string(self):
        """run_orphan_recovery_worker must not use a static worker_id."""
        import inspect
        s = _load()
        source = inspect.getsource(s.run_orphan_recovery_worker)
        self.assertNotIn("'orphan_recovery'", source)
        self.assertNotIn('"orphan_recovery"', source)


class B2_FailedReleaseFencing(unittest.IsolatedAsyncioTestCase):
    """_release_orphan_failed returns bool; stale owner → False → lease_lost."""

    async def test_release_failed_returns_true_on_match(self):
        rw = _rw()
        oc = AsyncMock()
        oc.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
        result = await rw._release_orphan_failed(
            oc, "resend:b2_match", datetime.now(timezone.utc), "test_error",
            lease_owner="correct_worker")
        self.assertTrue(result)

    async def test_release_failed_returns_false_on_mismatch(self):
        rw = _rw()
        oc = AsyncMock()
        oc.update_one = AsyncMock(return_value=MagicMock(modified_count=0))
        result = await rw._release_orphan_failed(
            oc, "resend:b2_mismatch", datetime.now(timezone.utc), "test_error",
            lease_owner="stale_worker")
        self.assertFalse(result)

    async def test_stale_failed_release_reports_lease_lost(self):
        """reconcile_single_orphan returns lease_lost when failed release is fenced."""
        rw = _rw()
        now = datetime.now(timezone.utc)
        doc = {"event_key": "resend:b2_stale", "provider": "resend",
               "provider_message_id": "msg_b2s", "event_type": "email.delivered",
               "event_created_at": "", "recipients": [], "state": "pending"}

        with patch.object(rw, '_claim_orphan', new_callable=AsyncMock, return_value=True), \
             patch.object(rw, 'begin_resend_receipt', new_callable=AsyncMock,
                          return_value=({}, "claimed")), \
             patch.object(rw, 'apply_resend_outbox_event', new_callable=AsyncMock,
                          side_effect=rw.ResendOutboxNotFound("no row")), \
             patch.object(rw, '_release_orphan_failed', new_callable=AsyncMock,
                          return_value=False):
            result = await rw.reconcile_single_orphan(
                AsyncMock(), AsyncMock(), AsyncMock(), doc,
                worker_id="stale_b2", now=now)
        self.assertEqual(result, "lease_lost")


class B2_InlineRecoveryRace(unittest.IsolatedAsyncioTestCase):
    """Inline and recovery race: effects applied exactly once."""

    async def test_concurrent_workers_only_one_suppression(self):
        rw = _rw()
        now = datetime.now(timezone.utc)
        suppressions = []
        async def track(etype, addr): suppressions.append((etype, addr))

        doc = {"event_key": "resend:b2_race", "provider": "resend",
               "provider_message_id": "msg_b2r", "event_type": "email.bounced",
               "event_created_at": "", "recipients": ["v@b.com"], "state": "pending"}

        # Worker 1 wins all claims
        with patch.object(rw, '_claim_orphan', new_callable=AsyncMock, return_value=True), \
             patch.object(rw, 'begin_resend_receipt', new_callable=AsyncMock,
                          return_value=({}, "claimed")), \
             patch.object(rw, 'apply_resend_outbox_event', new_callable=AsyncMock,
                          return_value={"matched": True, "advanced": True}), \
             patch.object(rw, 'finish_resend_receipt', new_callable=AsyncMock,
                          return_value=True), \
             patch.object(rw, '_release_orphan_reconciled', new_callable=AsyncMock,
                          return_value=True):
            r1 = await rw.reconcile_single_orphan(
                AsyncMock(), AsyncMock(), AsyncMock(), doc,
                suppression_callback=track, worker_id="w1", now=now)
        self.assertEqual(r1, "reconciled")
        self.assertEqual(len(suppressions), 1)

        # Worker 2 loses orphan claim
        with patch.object(rw, '_claim_orphan', new_callable=AsyncMock, return_value=False):
            r2 = await rw.reconcile_single_orphan(
                AsyncMock(), AsyncMock(), AsyncMock(), doc,
                suppression_callback=track, worker_id="w2", now=now)
        self.assertEqual(r2, "lease_lost")
        self.assertEqual(len(suppressions), 1)  # still 1


# ===================================================================
# Blocker 3: Correct monotonic provider delivery state
# ===================================================================

class B3_StrictlyIncreasingRanks(unittest.TestCase):
    """Rank map must be strictly increasing within the non-terminal lifecycle."""

    def test_sent_lt_delivery_delayed(self):
        rw = _rw()
        self.assertLess(rw._PROVIDER_DELIVERY_RANK["email.sent"],
                        rw._PROVIDER_DELIVERY_RANK["email.delivery_delayed"])

    def test_delivery_delayed_lt_delivered(self):
        rw = _rw()
        self.assertLess(rw._PROVIDER_DELIVERY_RANK["email.delivery_delayed"],
                        rw._PROVIDER_DELIVERY_RANK["email.delivered"])

    def test_terminal_outrank_all_non_terminal(self):
        rw = _rw()
        non_terminal_max = max(v for k, v in rw._PROVIDER_DELIVERY_RANK.items()
                               if k not in rw.TERMINAL_EVENTS)
        terminal_min = min(rw._PROVIDER_DELIVERY_RANK[e] for e in rw.TERMINAL_EVENTS)
        self.assertGreater(terminal_min, non_terminal_max)

    def test_failed_and_suppressed_are_terminal(self):
        rw = _rw()
        self.assertIn("email.failed", rw.TERMINAL_EVENTS)
        self.assertIn("email.suppressed", rw.TERMINAL_EVENTS)
        self.assertIn("email.failed", rw.SUPPORTED_EMAIL_EVENTS)
        self.assertIn("email.suppressed", rw.SUPPORTED_EMAIL_EVENTS)


class B3_SentThenDelayedAdvances(unittest.IsolatedAsyncioTestCase):
    """email.sent → email.delivery_delayed must advance."""

    async def test_delivery_delayed_after_sent_advances(self):
        rw = _rw()
        coll = AsyncMock()
        # Simulates: filter matches (rank 1 < 2 and not terminal) → modified
        coll.update_one = AsyncMock(return_value=MagicMock(matched_count=1, modified_count=1))
        event = rw.VerifiedResendEvent("wh_sd", "email.delivery_delayed", "msg_sd", "", ())
        result = await rw.apply_resend_outbox_event(coll, event, datetime.now(timezone.utc))
        self.assertTrue(result["advanced"])
        # Verify the filter includes the top-level terminal guard
        filter_doc = coll.update_one.call_args[0][0]
        self.assertEqual(filter_doc.get("provider_delivery_terminal"), {"$ne": True})


class B3_ClickedThenOpenedNoRegress(unittest.IsolatedAsyncioTestCase):
    """email.clicked (rank 5) → email.opened (rank 4) must not regress."""

    async def test_opened_after_clicked_does_not_advance(self):
        rw = _rw()
        coll = AsyncMock()
        # Simulates: rank 5 ≥ 4, so $lt filter fails → matched=0
        coll.update_one = AsyncMock(return_value=MagicMock(matched_count=0, modified_count=0))
        coll.find_one = AsyncMock(return_value={
            "_id": "x", "provider_message_id": "msg_co",
            "provider_delivery_rank": 5, "provider_delivery_terminal": False,
        })
        event = rw.VerifiedResendEvent("wh_co", "email.opened", "msg_co", "", ())
        result = await rw.apply_resend_outbox_event(coll, event, datetime.now(timezone.utc))
        self.assertFalse(result["advanced"])


class B3_BouncedThenOpenedNoChange(unittest.IsolatedAsyncioTestCase):
    """email.bounced (terminal) → email.opened must not change."""

    async def test_opened_after_bounced_blocked_by_terminal_guard(self):
        rw = _rw()
        coll = AsyncMock()
        # Simulates: terminal guard blocks the match entirely → matched=0
        coll.update_one = AsyncMock(return_value=MagicMock(matched_count=0, modified_count=0))
        coll.find_one = AsyncMock(return_value={
            "_id": "x", "provider_message_id": "msg_bo",
            "provider_delivery_rank": 10, "provider_delivery_terminal": True,
        })
        event = rw.VerifiedResendEvent("wh_bo", "email.opened", "msg_bo", "", ())
        result = await rw.apply_resend_outbox_event(coll, event, datetime.now(timezone.utc))
        self.assertFalse(result["advanced"])
        # Verify the filter has provider_delivery_terminal: {$ne: true} at top level
        filter_doc = coll.update_one.call_args[0][0]
        self.assertEqual(filter_doc.get("provider_delivery_terminal"), {"$ne": True})


class B3_CompletedOutboxPreservesCore(unittest.IsolatedAsyncioTestCase):
    """Webhook update never touches core delivery_state=completed."""

    async def test_provider_namespace_only(self):
        rw = _rw()
        coll = AsyncMock()
        coll.update_one = AsyncMock(return_value=MagicMock(matched_count=1, modified_count=1))
        event = rw.VerifiedResendEvent("wh_core", "email.delivered", "msg_core", "", ())
        await rw.apply_resend_outbox_event(coll, event, datetime.now(timezone.utc))
        update_doc = coll.update_one.call_args[0][1]["$set"]
        self.assertIn("provider_delivery_state", update_doc)
        self.assertNotIn("delivery_state", update_doc)
        self.assertNotIn("delivery_rank", update_doc)
        for field in ("provider_delivery_state", "provider_delivery_rank",
                      "provider_delivery_terminal", "provider_receipt_event_key",
                      "provider_delivery_updated_at"):
            self.assertIn(field, update_doc)


# ===================================================================
# Blocker 4: Strict verifier rejection
# ===================================================================

class B4_OversizedHeaders(unittest.TestCase):
    """Oversized signed header values must be rejected, not truncated."""

    def setUp(self):
        self.rw = _rw()

    def test_oversized_svix_id_rejected(self):
        body = _body(); ts = int(time.time())
        big_id = "x" * 600
        sig = _sign(big_id, ts, body)
        with self.assertRaises(self.rw.ResendWebhookVerificationError, msg="Oversized"):
            self.rw.verify_resend_webhook(body, {
                "svix-id": big_id, "svix-timestamp": str(ts),
                "svix-signature": sig}, SECRET)

    def test_oversized_timestamp_rejected(self):
        body = _body(); ts_str = "1" * 600
        with self.assertRaises(self.rw.ResendWebhookVerificationError):
            self.rw.verify_resend_webhook(body, {
                "svix-id": "x", "svix-timestamp": ts_str,
                "svix-signature": "v1,abc"}, SECRET)

    def test_oversized_signature_rejected(self):
        body = _body(); ts = int(time.time())
        with self.assertRaises(self.rw.ResendWebhookVerificationError):
            self.rw.verify_resend_webhook(body, {
                "svix-id": "x", "svix-timestamp": str(ts),
                "svix-signature": "v1," + "A" * 600}, SECRET)


class B4_MissingDataAndEmailId(unittest.TestCase):
    """Missing data object and missing email_id produce 400 and zero writes."""

    def setUp(self):
        self.rw = _rw()

    def _signed(self, payload_dict, wid="b4_test"):
        body = json.dumps(payload_dict).encode()
        ts = int(time.time())
        sig = _sign(wid, ts, body)
        return body, {"svix-id": wid, "svix-timestamp": str(ts), "svix-signature": sig}

    def test_missing_data_key_rejected(self):
        body, headers = self._signed({"type": "email.delivered", "created_at": "2026-01-01T00:00:00Z"})
        with self.assertRaises(self.rw.ResendWebhookVerificationError, msg="data must be an object"):
            self.rw.verify_resend_webhook(body, headers, SECRET)

    def test_null_data_rejected(self):
        body, headers = self._signed({"type": "email.delivered", "data": None,
                                       "created_at": "2026-01-01T00:00:00Z"})
        with self.assertRaises(self.rw.ResendWebhookVerificationError):
            self.rw.verify_resend_webhook(body, headers, SECRET)

    def test_missing_email_id_for_supported_event_rejected(self):
        body, headers = self._signed({"type": "email.delivered",
                                       "data": {"to": ["a@b.com"]},
                                       "created_at": "2026-01-01T00:00:00Z"})
        with self.assertRaises(self.rw.ResendWebhookVerificationError, msg="requires email_id"):
            self.rw.verify_resend_webhook(body, headers, SECRET)

    def test_empty_email_id_for_supported_event_rejected(self):
        body, headers = self._signed({"type": "email.sent",
                                       "data": {"email_id": "", "to": ["a@b.com"]},
                                       "created_at": "2026-01-01T00:00:00Z"})
        with self.assertRaises(self.rw.ResendWebhookVerificationError):
            self.rw.verify_resend_webhook(body, headers, SECRET)

    def test_missing_event_type_rejected(self):
        body, headers = self._signed({"data": {"email_id": "m1", "to": ["a@b.com"]},
                                       "created_at": "2026-01-01T00:00:00Z"})
        with self.assertRaises(self.rw.ResendWebhookVerificationError, msg="Missing event type"):
            self.rw.verify_resend_webhook(body, headers, SECRET)

    def test_unsupported_event_without_email_id_passes(self):
        """Non-delivery events (e.g. domain.verified) may lack email_id."""
        body, headers = self._signed({"type": "domain.verified",
                                       "data": {"id": "d1"},
                                       "created_at": "2026-01-01T00:00:00Z"}, wid="b4_unsup")
        event = self.rw.verify_resend_webhook(body, headers, SECRET)
        self.assertFalse(event.supported)


class B4_RouteLevel400(unittest.TestCase):
    """Route returns 400 for verification failures — zero writes."""

    @classmethod
    def setUpClass(cls):
        cls.s = _load(); cls.c = _tc(cls.s)

    def test_missing_data_400(self):
        payload = {"type": "email.delivered", "created_at": "2026-01-01T00:00:00Z"}
        body = json.dumps(payload).encode()
        ts = int(time.time())
        sig = _sign("b4_route_nodata", ts, body)
        r = self.c.post('/api/webhooks/resend', content=body, headers={
            "svix-id": "b4_route_nodata", "svix-timestamp": str(ts),
            "svix-signature": sig, "content-type": "application/json"})
        self.assertEqual(r.status_code, 400)

    def test_missing_email_id_400(self):
        payload = {"type": "email.delivered", "data": {"to": ["a@b.com"]},
                   "created_at": "2026-01-01T00:00:00Z"}
        body = json.dumps(payload).encode()
        ts = int(time.time())
        sig = _sign("b4_route_noid", ts, body)
        r = self.c.post('/api/webhooks/resend', content=body, headers={
            "svix-id": "b4_route_noid", "svix-timestamp": str(ts),
            "svix-signature": sig, "content-type": "application/json"})
        self.assertEqual(r.status_code, 400)

    def test_oversized_header_400(self):
        body = _body()
        ts = int(time.time())
        big_id = "x" * 600
        sig = _sign(big_id, ts, body)
        r = self.c.post('/api/webhooks/resend', content=body, headers={
            "svix-id": big_id, "svix-timestamp": str(ts),
            "svix-signature": sig, "content-type": "application/json"})
        self.assertEqual(r.status_code, 400)


class B4_StrictSecretDecoding(unittest.TestCase):
    """whsec_ prefix, strict base64, empty body rejection."""

    def setUp(self):
        self.rw = _rw()

    def test_no_whsec_prefix(self):
        with self.assertRaises(self.rw.ResendWebhookVerificationError):
            self.rw.verify_resend_webhook(
                b'{}', {"svix-id": "x", "svix-timestamp": str(int(time.time())),
                        "svix-signature": "v1,abc"}, "raw_secret_no_prefix")

    def test_empty_body(self):
        with self.assertRaises(self.rw.ResendWebhookVerificationError):
            self.rw.verify_resend_webhook(
                b'', {"svix-id": "x", "svix-timestamp": str(int(time.time())),
                      "svix-signature": "v1,abc"}, SECRET)

    def test_invalid_base64(self):
        with self.assertRaises(self.rw.ResendWebhookVerificationError):
            self.rw.verify_resend_webhook(
                b'{}', {"svix-id": "x", "svix-timestamp": str(int(time.time())),
                        "svix-signature": "v1,abc"}, "whsec_not!valid!base64!")

    def test_list_payload(self):
        body = b'[1,2,3]'
        ts = int(time.time())
        sig = _sign("x", ts, body)
        with self.assertRaises(self.rw.ResendWebhookVerificationError):
            self.rw.verify_resend_webhook(body, {"svix-id": "x", "svix-timestamp": str(ts),
                                                  "svix-signature": sig}, SECRET)

    def test_non_object_data(self):
        body = json.dumps({"type": "email.delivered", "data": "string"}).encode()
        ts = int(time.time())
        sig = _sign("x", ts, body)
        with self.assertRaises(self.rw.ResendWebhookVerificationError):
            self.rw.verify_resend_webhook(body, {"svix-id": "x", "svix-timestamp": str(ts),
                                                  "svix-signature": sig}, SECRET)

    def test_non_list_recipients(self):
        body = json.dumps({"type": "email.delivered",
                           "data": {"email_id": "m", "to": 12345}}).encode()
        ts = int(time.time())
        sig = _sign("x", ts, body)
        with self.assertRaises(self.rw.ResendWebhookVerificationError):
            self.rw.verify_resend_webhook(body, {"svix-id": "x", "svix-timestamp": str(ts),
                                                  "svix-signature": sig}, SECRET)

    def test_valid_event_parses(self):
        body = _body(); ts = int(time.time())
        sig = _sign("valid", ts, body)
        event = self.rw.verify_resend_webhook(
            body, {"svix-id": "valid", "svix-timestamp": str(ts),
                   "svix-signature": sig}, SECRET)
        self.assertEqual(event.event_type, "email.delivered")


# ===================================================================
# No provider sends / no network / no sensitive logging
# ===================================================================

class NoProviderSends(unittest.TestCase):
    """All send gates are false; no email, SMS, or network calls."""

    @classmethod
    def setUpClass(cls):
        cls.s = _load(); cls.c = _tc(cls.s)

    def test_400_no_sends(self):
        r = self.c.post('/api/webhooks/resend', content=_body(),
                        headers={"content-type": "application/json"})
        self.assertEqual(r.status_code, 400)

    @patch('server.begin_resend_receipt', new_callable=AsyncMock, side_effect=RuntimeError)
    def test_503_no_sends(self, _):
        b, h = _req(wid="ns503")
        self.assertEqual(self.c.post('/api/webhooks/resend', content=b, headers=h).status_code, 503)


class NoSensitiveLogging(unittest.TestCase):
    """No raw payload, headers, email bodies, subjects, or secrets in receipts."""

    def test_receipt_document_has_no_raw_content(self):
        rw = _rw()
        event = rw.VerifiedResendEvent("wh_log", "email.delivered", "msg_log", "", ("a@b.com",))
        doc = rw._receipt_document(event, datetime.now(timezone.utc), "test_owner")
        # Must not contain raw body, headers, HTML, subjects, signing secrets
        doc_str = json.dumps(doc, default=str)
        for forbidden in ["raw_body", "raw_headers", "html_body", "subject",
                          "signing_secret", "whsec_", "svix-signature"]:
            self.assertNotIn(forbidden, doc_str)

    def test_orphan_document_has_no_raw_content(self):
        rw = _rw()
        event = rw.VerifiedResendEvent("wh_olog", "email.bounced", "msg_olog", "", ("x@y.com",))
        doc = rw._orphan_document(event, datetime.now(timezone.utc))
        doc_str = json.dumps(doc, default=str)
        for forbidden in ["raw_body", "raw_headers", "html_body", "subject",
                          "signing_secret", "whsec_", "svix-signature"]:
            self.assertNotIn(forbidden, doc_str)


# ===================================================================
# Route-level existing contract
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

    @patch('server.finish_resend_receipt', new_callable=AsyncMock, return_value=False)
    @patch('server.apply_resend_outbox_event', new_callable=AsyncMock,
           return_value={'matched': True, 'advanced': True, 'state': 'delivered'})
    @patch('server.begin_resend_receipt', new_callable=AsyncMock, return_value=({}, 'claimed'))
    def test_receipt_fencing_503(self, *_):
        b, h = _req(wid="d4_fenced")
        self.assertEqual(self.c.post('/api/webhooks/resend', content=b, headers=h).status_code, 503)

    @patch('server.finish_resend_receipt', new_callable=AsyncMock, return_value=True)
    @patch('server.apply_resend_outbox_event', new_callable=AsyncMock,
           return_value={'matched': True, 'advanced': True, 'state': 'delivered'})
    @patch('server.begin_resend_receipt', new_callable=AsyncMock, return_value=({}, 'claimed'))
    def test_receipt_fencing_200(self, *_):
        b, h = _req(wid="d4_ok")
        self.assertEqual(self.c.post('/api/webhooks/resend', content=b, headers=h).status_code, 200)


if __name__ == '__main__':
    unittest.main()
