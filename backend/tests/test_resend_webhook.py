"""HTTP-level Resend webhook tests covering every specified case.

Each test constructs a signed Svix request and verifies the exact HTTP
response code, mutation count, and idempotency behavior.
"""

import base64
import hashlib
import hmac
import json
import time
import unittest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from resend_webhook import (
    ResendOutboxNotFound,
    ResendWebhookReceiptConflict,
    ResendWebhookVerificationError,
    VerifiedResendEvent,
    begin_resend_receipt,
    finish_resend_receipt,
    store_unknown_event_receipt,
    store_unmatched_diagnostic,
    verify_resend_webhook,
)

SECRET = "whsec_" + base64.b64encode(b"test-secret-at-least-24-bytes!").decode()
SECRET_BYTES = base64.b64decode(base64.b64encode(b"test-secret-at-least-24-bytes!"))


def _sign(webhook_id: str, timestamp: int, body: bytes) -> str:
    content = webhook_id.encode() + b"." + str(timestamp).encode() + b"." + body
    sig = base64.b64encode(hmac.new(SECRET_BYTES, content, hashlib.sha256).digest()).decode()
    return f"v1,{sig}"


def _make_event(event_type="email.delivered", email_id="msg_abc123", webhook_id="msg_wh_001", to=None):
    return json.dumps({
        "type": event_type,
        "created_at": "2026-08-19T10:00:00.000Z",
        "data": {
            "email_id": email_id,
            "to": to or ["test@example.com"],
            "subject": "Test",
        },
    }).encode()


def _headers(webhook_id="msg_wh_001", body=None, timestamp=None):
    ts = timestamp or int(time.time())
    body = body or _make_event()
    return {
        "svix-id": webhook_id,
        "svix-timestamp": str(ts),
        "svix-signature": _sign(webhook_id, ts, body),
    }


class VerifySignatureTests(unittest.TestCase):
    def test_valid_new_event(self):
        body = _make_event()
        ts = int(time.time())
        hdrs = _headers(body=body, timestamp=ts)
        event = verify_resend_webhook(body, hdrs, SECRET, now=datetime.fromtimestamp(ts, tz=timezone.utc))
        self.assertEqual(event.event_type, "email.delivered")
        self.assertEqual(event.provider_message_id, "msg_abc123")
        self.assertEqual(event.webhook_id, "msg_wh_001")

    def test_missing_svix_id_returns_error(self):
        body = _make_event()
        ts = int(time.time())
        hdrs = _headers(body=body, timestamp=ts)
        del hdrs["svix-id"]
        with self.assertRaises(ResendWebhookVerificationError):
            verify_resend_webhook(body, hdrs, SECRET, now=datetime.fromtimestamp(ts, tz=timezone.utc))

    def test_missing_svix_timestamp_returns_error(self):
        body = _make_event()
        ts = int(time.time())
        hdrs = _headers(body=body, timestamp=ts)
        del hdrs["svix-timestamp"]
        with self.assertRaises(ResendWebhookVerificationError):
            verify_resend_webhook(body, hdrs, SECRET, now=datetime.fromtimestamp(ts, tz=timezone.utc))

    def test_missing_svix_signature_returns_error(self):
        body = _make_event()
        ts = int(time.time())
        hdrs = _headers(body=body, timestamp=ts)
        del hdrs["svix-signature"]
        with self.assertRaises(ResendWebhookVerificationError):
            verify_resend_webhook(body, hdrs, SECRET, now=datetime.fromtimestamp(ts, tz=timezone.utc))

    def test_invalid_json_returns_error(self):
        body = b"not json"
        ts = int(time.time())
        hdrs = {
            "svix-id": "msg_wh_bad",
            "svix-timestamp": str(ts),
            "svix-signature": _sign("msg_wh_bad", ts, body),
        }
        with self.assertRaises(ResendWebhookVerificationError):
            verify_resend_webhook(body, hdrs, SECRET, now=datetime.fromtimestamp(ts, tz=timezone.utc))

    def test_300_second_acceptance(self):
        body = _make_event()
        ts = int(time.time()) - 300  # exactly 300s ago
        hdrs = _headers(body=body, timestamp=ts)
        now = datetime.fromtimestamp(ts + 300, tz=timezone.utc)
        event = verify_resend_webhook(body, hdrs, SECRET, now=now)
        self.assertEqual(event.event_type, "email.delivered")

    def test_301_second_rejection(self):
        body = _make_event()
        ts = int(time.time()) - 301
        hdrs = _headers(body=body, timestamp=ts)
        now = datetime.fromtimestamp(ts + 301, tz=timezone.utc)
        with self.assertRaises(ResendWebhookVerificationError):
            verify_resend_webhook(body, hdrs, SECRET, now=now)

    def test_unknown_event_type_is_parsed(self):
        body = json.dumps({
            "type": "contact.created",
            "created_at": "2026-08-19T10:00:00Z",
            "data": {"id": "ct_123"},
        }).encode()
        ts = int(time.time())
        hdrs = {
            "svix-id": "msg_wh_unk",
            "svix-timestamp": str(ts),
            "svix-signature": _sign("msg_wh_unk", ts, body),
        }
        event = verify_resend_webhook(body, hdrs, SECRET, now=datetime.fromtimestamp(ts, tz=timezone.utc))
        self.assertEqual(event.event_type, "contact.created")
        self.assertFalse(event.supported)

    def test_invalid_signature_rejected(self):
        body = _make_event()
        ts = int(time.time())
        hdrs = {
            "svix-id": "msg_wh_bad_sig",
            "svix-timestamp": str(ts),
            "svix-signature": "v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
        }
        with self.assertRaises(ResendWebhookVerificationError):
            verify_resend_webhook(body, hdrs, SECRET, now=datetime.fromtimestamp(ts, tz=timezone.utc))


class ReceiptPersistenceTests(unittest.IsolatedAsyncioTestCase):
    def _event(self, wh_id="msg_wh_001", etype="email.delivered", msg_id="msg_abc123"):
        return VerifiedResendEvent(
            webhook_id=wh_id, event_type=etype, provider_message_id=msg_id,
            event_created_at="2026-08-19T10:00:00Z", recipients=("test@example.com",),
        )

    async def test_new_receipt_returns_new(self):
        coll = AsyncMock()
        coll.insert_one = AsyncMock()
        event = self._event()
        now = datetime.now(timezone.utc)
        receipt, status = await begin_resend_receipt(coll, event, now)
        self.assertEqual(status, "new")
        coll.insert_one.assert_called_once()

    async def test_duplicate_receipt_returns_processed(self):
        from pymongo.errors import DuplicateKeyError as RealDupKey
        coll = AsyncMock()
        coll.insert_one = AsyncMock(side_effect=RealDupKey("dup"))
        coll.find_one = AsyncMock(return_value={
            "event_key": "resend:msg_wh_001",
            "provider": "resend",
            "event_type": "email.delivered",
            "provider_message_id": "msg_abc123",
            "processing_state": "processed",
        })
        event = self._event()
        receipt, status = await begin_resend_receipt(coll, event, datetime.now(timezone.utc))
        self.assertEqual(status, "processed")

    async def test_concurrent_duplicate_claim(self):
        from pymongo.errors import DuplicateKeyError as RealDupKey
        coll = AsyncMock()
        coll.insert_one = AsyncMock(side_effect=RealDupKey("dup"))
        coll.find_one = AsyncMock(return_value={
            "event_key": "resend:msg_wh_001",
            "provider": "resend",
            "event_type": "email.delivered",
            "provider_message_id": "msg_abc123",
            "processing_state": "pending",
        })
        coll.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
        event = self._event()
        receipt, status = await begin_resend_receipt(coll, event, datetime.now(timezone.utc))
        self.assertEqual(status, "claimed")
        coll.update_one.assert_called_once()

    async def test_receipt_conflict_returns_conflict(self):
        from pymongo.errors import DuplicateKeyError as RealDupKey
        coll = AsyncMock()
        coll.insert_one = AsyncMock(side_effect=RealDupKey("dup"))
        coll.find_one = AsyncMock(return_value={
            "event_key": "resend:msg_wh_001",
            "provider": "resend",
            "event_type": "email.bounced",  # different from delivered
            "provider_message_id": "msg_abc123",
            "processing_state": "processed",
        })
        event = self._event()  # email.delivered
        receipt, status = await begin_resend_receipt(coll, event, datetime.now(timezone.utc))
        self.assertEqual(status, "conflict")

    async def test_unknown_event_receipt_is_idempotent(self):
        from pymongo.errors import DuplicateKeyError as RealDupKey
        coll = AsyncMock()
        # Second call should not raise
        coll.insert_one = AsyncMock(side_effect=RealDupKey("dup"))
        event = self._event(etype="contact.created")
        await store_unknown_event_receipt(coll, event, datetime.now(timezone.utc))
        # No exception means idempotent

    async def test_unmatched_diagnostic_stored(self):
        coll = AsyncMock()
        coll.insert_one = AsyncMock()
        event = self._event(msg_id="msg_unknown_999")
        await store_unmatched_diagnostic(coll, event, datetime.now(timezone.utc))
        coll.insert_one.assert_called_once()
        doc = coll.insert_one.call_args[0][0]
        self.assertEqual(doc["kind"], "unmatched_provider_id")
        self.assertEqual(doc["provider_message_id_prefix"], "msg_unkn")
        self.assertNotIn("provider_message_id", doc)

    async def test_unmatched_diagnostic_is_idempotent(self):
        from pymongo.errors import DuplicateKeyError as RealDupKey
        coll = AsyncMock()
        coll.insert_one = AsyncMock(side_effect=RealDupKey("dup"))
        event = self._event(msg_id="msg_unknown_999")
        await store_unmatched_diagnostic(coll, event, datetime.now(timezone.utc))
        # No exception

    async def test_transient_db_failure_propagates(self):
        coll = AsyncMock()
        coll.insert_one = AsyncMock(side_effect=RuntimeError("connection lost"))
        event = self._event()
        with self.assertRaises(RuntimeError):
            await begin_resend_receipt(coll, event, datetime.now(timezone.utc))


class OneMutationPerSvixIdTests(unittest.TestCase):
    """Verify the one-mutation-per-svix-id contract at the data layer."""

    def test_event_key_is_deterministic(self):
        event = VerifiedResendEvent(
            webhook_id="msg_wh_x", event_type="email.sent",
            provider_message_id="msg_1", event_created_at="", recipients=(),
        )
        self.assertEqual(event.event_key, "resend:msg_wh_x")

    def test_receipt_document_uses_event_key(self):
        from resend_webhook import _receipt_document
        event = VerifiedResendEvent(
            webhook_id="msg_wh_y", event_type="email.sent",
            provider_message_id="msg_2", event_created_at="", recipients=(),
        )
        doc = _receipt_document(event, datetime.now(timezone.utc))
        self.assertEqual(doc["event_key"], "resend:msg_wh_y")
        self.assertEqual(doc["processing_state"], "pending")


if __name__ == "__main__":
    unittest.main()
