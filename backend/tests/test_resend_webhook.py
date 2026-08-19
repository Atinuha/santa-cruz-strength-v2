import asyncio
import base64
import copy
import hashlib
import hmac
import json
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from resend_webhook import (  # noqa: E402
    DELIVERY_STATE_RANKS,
    ResendOutboxNotFound,
    ResendWebhookReceiptConflict,
    ResendWebhookVerificationError,
    VerifiedResendEvent,
    apply_resend_outbox_event,
    begin_resend_receipt,
    finish_resend_receipt,
    verify_resend_webhook,
)


NOW = datetime(2026, 8, 18, 20, 0, tzinfo=timezone.utc)
SECRET_BYTES = b'santa-cruz-resend-test-secret'
SECRET = 'whsec_' + base64.b64encode(SECRET_BYTES).decode('ascii')


class MemoryCollection:
    def __init__(self):
        self.documents = []

    async def update_one(self, query, update, upsert=False):
        document = next(
            (item for item in self.documents if all(item.get(k) == v for k, v in query.items())),
            None,
        )
        if document is None and upsert:
            document = copy.deepcopy(update.get('$setOnInsert', {}))
            self.documents.append(document)
            return SimpleNamespace(matched_count=0, modified_count=0, upserted_id='new')
        if document is None:
            return SimpleNamespace(matched_count=0, modified_count=0, upserted_id=None)
        before = copy.deepcopy(document)
        document.update(copy.deepcopy(update.get('$set', {})))
        return SimpleNamespace(
            matched_count=1, modified_count=int(before != document), upserted_id=None,
        )

    async def find_one(self, query, projection=None):
        document = next(
            (item for item in self.documents if all(item.get(k) == v for k, v in query.items())),
            None,
        )
        return copy.deepcopy(document) if document else None


class MemoryOutbox:
    def __init__(self, documents=None):
        self.documents = copy.deepcopy(documents or [])

    @staticmethod
    def _matches(document, query):
        for key, expected in query.items():
            if isinstance(expected, dict) and '$exists' in expected:
                if (key in document) is not bool(expected['$exists']):
                    return False
            elif document.get(key) != expected:
                return False
        return True

    async def find_one(self, query, projection=None):
        document = next(
            (item for item in self.documents if self._matches(item, query)),
            None,
        )
        if not document:
            return None
        if not projection:
            return copy.deepcopy(document)
        return {
            key: copy.deepcopy(value)
            for key, value in document.items()
            if projection.get(key)
        }

    async def update_one(self, query, update):
        document = next(
            (item for item in self.documents if self._matches(item, query)),
            None,
        )
        if not document:
            return SimpleNamespace(matched_count=0, modified_count=0)
        before = copy.deepcopy(document)
        document.update(copy.deepcopy(update.get('$set', {})))
        return SimpleNamespace(matched_count=1, modified_count=int(before != document))


def verified_event(event_type, webhook_id):
    return VerifiedResendEvent(
        webhook_id=webhook_id,
        event_type=event_type,
        provider_message_id='email_123',
        event_created_at='2026-08-18T20:00:00Z',
        recipients=('person@example.test',),
    )


def signed_request(payload, *, webhook_id='msg_test_1', now=NOW):
    body = json.dumps(payload, separators=(',', ':')).encode('utf-8')
    timestamp = str(int(now.timestamp()))
    content = webhook_id.encode() + b'.' + timestamp.encode() + b'.' + body
    signature = base64.b64encode(
        hmac.new(SECRET_BYTES, content, hashlib.sha256).digest()
    ).decode('ascii')
    return body, {
        'svix-id': webhook_id,
        'svix-timestamp': timestamp,
        'svix-signature': f'v1,{signature}',
    }


def email_event(event_type='email.bounced', email_id='email_123'):
    return {
        'type': event_type,
        'created_at': '2026-08-18T20:00:00Z',
        'data': {
            'email_id': email_id,
            'to': ['person@example.test'],
            'from': 'sender@example.test',
            'subject': 'Private subject',
        },
    }


class ResendWebhookTests(unittest.TestCase):
    def run_async(self, coroutine):
        return asyncio.run(coroutine)

    def test_valid_raw_body_signature_is_verified_and_minimized(self):
        body, headers = signed_request(email_event())
        event = verify_resend_webhook(body, headers, SECRET, now=NOW)

        self.assertEqual(event.webhook_id, 'msg_test_1')
        self.assertEqual(event.event_type, 'email.bounced')
        self.assertEqual(event.provider_message_id, 'email_123')
        self.assertEqual(event.recipients, ('person@example.test',))
        self.assertTrue(event.supported)

    def test_changed_body_bad_signature_and_stale_timestamp_fail_closed(self):
        body, headers = signed_request(email_event())
        with self.assertRaises(ResendWebhookVerificationError):
            verify_resend_webhook(body + b' ', headers, SECRET, now=NOW)
        with self.assertRaises(ResendWebhookVerificationError):
            verify_resend_webhook(body, {**headers, 'svix-signature': 'v1,invalid'}, SECRET, now=NOW)
        with self.assertRaises(ResendWebhookVerificationError):
            verify_resend_webhook(body, headers, SECRET, now=NOW + timedelta(minutes=6))

    def test_supported_event_receipt_is_minimal_idempotent_and_resumable(self):
        body, headers = signed_request(email_event())
        event = verify_resend_webhook(body, headers, SECRET, now=NOW)
        receipts = MemoryCollection()

        first, first_done = self.run_async(begin_resend_receipt(receipts, event, NOW))
        retry, retry_done = self.run_async(begin_resend_receipt(receipts, event, NOW))
        self.assertFalse(first_done)
        self.assertFalse(retry_done)
        self.assertEqual(len(receipts.documents), 1)
        self.assertEqual(first, retry)
        self.assertNotIn('person@example.test', repr(first))
        self.assertNotIn('Private subject', repr(first))
        self.assertEqual(first['processing_state'], 'pending')

        self.run_async(finish_resend_receipt(receipts, event, NOW))
        _, completed_duplicate = self.run_async(begin_resend_receipt(receipts, event, NOW))
        self.assertTrue(completed_duplicate)
        self.assertEqual(receipts.documents[0]['processing_state'], 'processed')

    def test_reused_provider_event_id_with_different_data_is_rejected(self):
        receipts = MemoryCollection()
        first_body, first_headers = signed_request(email_event(), webhook_id='msg_same')
        second_body, second_headers = signed_request(
            email_event(event_type='email.delivered'), webhook_id='msg_same'
        )
        first = verify_resend_webhook(first_body, first_headers, SECRET, now=NOW)
        second = verify_resend_webhook(second_body, second_headers, SECRET, now=NOW)
        self.run_async(begin_resend_receipt(receipts, first, NOW))

        with self.assertRaises(ResendWebhookReceiptConflict):
            self.run_async(begin_resend_receipt(receipts, second, NOW))

    def test_unmatched_message_receipt_stays_pending_then_retries_safely(self):
        event = verified_event('email.delivered', 'event_retry')
        receipts = MemoryCollection()
        outbox = MemoryOutbox()
        self.run_async(begin_resend_receipt(receipts, event, NOW))

        with self.assertRaises(ResendOutboxNotFound):
            self.run_async(apply_resend_outbox_event(outbox, event, NOW))
        self.assertEqual(receipts.documents[0]['processing_state'], 'pending')

        outbox.documents.append({'_id': 'job-1', 'provider_message_id': 'email_123'})
        result = self.run_async(apply_resend_outbox_event(outbox, event, NOW))
        self.assertTrue(result['advanced'])
        self.run_async(finish_resend_receipt(receipts, event, NOW))
        self.assertEqual(receipts.documents[0]['processing_state'], 'processed')
        self.assertEqual(outbox.documents[0]['provider_delivery_state'], 'delivered')

    def test_out_of_order_events_cannot_regress_and_suppression_is_terminal(self):
        outbox = MemoryOutbox([{'_id': 'job-1', 'provider_message_id': 'email_123'}])

        for event_type, expected_state in (
            ('email.sent', 'sent'),
            ('email.delivered', 'delivered'),
            ('email.sent', 'delivered'),
            ('email.bounced', 'bounced'),
            ('email.delivered', 'bounced'),
            ('email.complained', 'complained'),
            ('email.failed', 'complained'),
        ):
            with self.subTest(event_type=event_type):
                result = self.run_async(apply_resend_outbox_event(
                    outbox,
                    verified_event(event_type, f'event_{event_type}_{expected_state}'),
                    NOW,
                ))
                self.assertTrue(result['matched'])
                self.assertEqual(outbox.documents[0]['provider_delivery_state'], expected_state)

        self.assertTrue(outbox.documents[0]['provider_delivery_terminal'])
        self.assertEqual(
            outbox.documents[0]['provider_delivery_rank'],
            DELIVERY_STATE_RANKS['complained'],
        )

        failed_outbox = MemoryOutbox([{'_id': 'job-2', 'provider_message_id': 'email_123'}])
        self.run_async(apply_resend_outbox_event(
            failed_outbox, verified_event('email.failed', 'event_failed'), NOW
        ))
        self.run_async(apply_resend_outbox_event(
            failed_outbox, verified_event('email.delivered', 'event_late_delivered'), NOW
        ))
        self.assertEqual(failed_outbox.documents[0]['provider_delivery_state'], 'failed')
        self.assertTrue(failed_outbox.documents[0]['provider_delivery_terminal'])


if __name__ == '__main__':
    unittest.main()
