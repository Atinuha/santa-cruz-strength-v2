"""Verify and record Resend webhook events without provider activation.

Resend signs webhook requests with the Svix scheme. Verification must use the
exact raw request body. This module uses only the Python standard library so a
missing optional SDK cannot turn signature verification into an accept path.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Mapping

try:
    from pymongo.errors import DuplicateKeyError
except ImportError:  # Pure unit tests do not require the production driver.
    class DuplicateKeyError(Exception):
        pass


SUPPORTED_EMAIL_EVENTS = frozenset(
    {
        "email.sent",
        "email.delivered",
        "email.delivery_delayed",
        "email.bounced",
        "email.complained",
        "email.failed",
        "email.suppressed",
    }
)
SUPPRESSION_EVENTS = frozenset({"email.bounced", "email.complained"})
DEFAULT_TIMESTAMP_TOLERANCE_SECONDS = 300
DELIVERY_STATE_RANKS = {
    "sent": 10,
    "delivery_delayed": 20,
    "delivered": 30,
    "failed": 40,
    "bounced": 50,
    "complained": 60,
    "suppressed": 70,
}
TERMINAL_DELIVERY_STATES = frozenset({"failed", "bounced", "complained", "suppressed"})


class ResendWebhookVerificationError(ValueError):
    """The request could not be authenticated or parsed safely."""


class ResendWebhookReceiptConflict(RuntimeError):
    """One provider event identifier was reused for different event data."""


class ResendOutboxNotFound(RuntimeError):
    """The verified provider message does not yet belong to a durable outbox row."""


@dataclass(frozen=True)
class VerifiedResendEvent:
    webhook_id: str
    event_type: str
    provider_message_id: str
    event_created_at: str
    recipients: tuple[str, ...]

    @property
    def supported(self) -> bool:
        return self.event_type in SUPPORTED_EMAIL_EVENTS

    @property
    def event_key(self) -> str:
        return f"resend:{self.webhook_id}"


def _header(headers: Mapping[str, str], name: str) -> str:
    direct = headers.get(name)
    if direct is not None:
        return str(direct).strip()
    target = name.casefold()
    for key, value in headers.items():
        if str(key).casefold() == target:
            return str(value).strip()
    return ""


def _decode_signing_secret(secret: str) -> bytes:
    value = str(secret or "").strip()
    if not value.startswith("whsec_"):
        raise ResendWebhookVerificationError("invalid signing secret")
    encoded = value[6:]
    if not encoded:
        raise ResendWebhookVerificationError("invalid signing secret")
    encoded += "=" * (-len(encoded) % 4)
    try:
        decoded = base64.b64decode(encoded, validate=True)
    except Exception as error:
        raise ResendWebhookVerificationError("invalid signing secret") from error
    if not decoded:
        raise ResendWebhookVerificationError("invalid signing secret")
    return decoded


def _unix_time(value: datetime | None = None) -> int:
    current = value or datetime.now(timezone.utc)
    if current.tzinfo is None:
        current = current.replace(tzinfo=timezone.utc)
    return int(current.timestamp())


def verify_resend_webhook(
    raw_body: bytes,
    headers: Mapping[str, str],
    signing_secret: str,
    *,
    now: datetime | None = None,
    tolerance_seconds: int = DEFAULT_TIMESTAMP_TOLERANCE_SECONDS,
) -> VerifiedResendEvent:
    """Authenticate a raw Resend webhook and return a minimized event view."""
    if not isinstance(raw_body, bytes) or not raw_body:
        raise ResendWebhookVerificationError("missing raw body")
    webhook_id = _header(headers, "svix-id")
    timestamp_text = _header(headers, "svix-timestamp")
    signature_header = _header(headers, "svix-signature")
    if not webhook_id or not timestamp_text or not signature_header:
        raise ResendWebhookVerificationError("missing signature headers")
    if len(webhook_id) > 200 or len(timestamp_text) > 32 or len(signature_header) > 4096:
        raise ResendWebhookVerificationError("invalid signature headers")
    try:
        timestamp = int(timestamp_text)
    except ValueError as error:
        raise ResendWebhookVerificationError("invalid timestamp") from error
    tolerance = max(0, int(tolerance_seconds))
    if abs(_unix_time(now) - timestamp) > tolerance:
        raise ResendWebhookVerificationError("stale timestamp")

    signed_content = (
        webhook_id.encode("utf-8")
        + b"."
        + timestamp_text.encode("ascii")
        + b"."
        + raw_body
    )
    expected = base64.b64encode(
        hmac.new(_decode_signing_secret(signing_secret), signed_content, hashlib.sha256).digest()
    ).decode("ascii")
    signatures = [
        token[3:]
        for token in signature_header.split()
        if token.startswith("v1,") and len(token) > 3
    ]
    if not signatures or not any(hmac.compare_digest(expected, value) for value in signatures):
        raise ResendWebhookVerificationError("invalid signature")

    try:
        payload = json.loads(raw_body)
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ResendWebhookVerificationError("invalid payload") from error
    if not isinstance(payload, dict):
        raise ResendWebhookVerificationError("invalid payload")
    event_type = str(payload.get("type") or "").strip()
    if not event_type or len(event_type) > 120:
        raise ResendWebhookVerificationError("invalid event type")
    data = payload.get("data")
    if not isinstance(data, dict):
        raise ResendWebhookVerificationError("invalid event data")
    provider_message_id = str(data.get("email_id") or data.get("id") or "").strip()[:200]
    event_created_at = str(payload.get("created_at") or data.get("created_at") or "").strip()[:80]
    raw_recipients: Any = data.get("to")
    if isinstance(raw_recipients, str):
        raw_recipients = [raw_recipients]
    recipients = tuple(
        value
        for value in (
            str(item or "").strip().lower()[:254]
            for item in (raw_recipients if isinstance(raw_recipients, list) else [])
        )
        if value
    )
    return VerifiedResendEvent(
        webhook_id=webhook_id,
        event_type=event_type,
        provider_message_id=provider_message_id,
        event_created_at=event_created_at,
        recipients=recipients,
    )


# ---------------------------------------------------------------------------
# Receipt persistence — one mutation per svix-id
# ---------------------------------------------------------------------------

def _receipt_document(event: VerifiedResendEvent, received_at: datetime, *, kind: str = "event") -> dict[str, Any]:
    timestamp = received_at.astimezone(timezone.utc).isoformat()
    return {
        "event_key": event.event_key,
        "provider": "resend",
        "provider_event_id": event.webhook_id,
        "event_type": event.event_type,
        "provider_message_id": event.provider_message_id or None,
        "event_created_at": event.event_created_at or None,
        "kind": kind,
        "processing_state": "pending",
        "received_at": timestamp,
        "processed_at": None,
    }


async def begin_resend_receipt(
    collection, event: VerifiedResendEvent, received_at: datetime,
) -> tuple[dict, str]:
    """Insert one receipt or atomically claim an existing pending receipt.

    Returns (receipt_doc, status) where status is one of:
      "new"       — first insert, caller owns processing
      "claimed"   — atomic claim succeeded, caller owns processing
      "processed" — already finished by a prior worker
      "conflict"  — event_key reused for different event data (permanent)
    """
    receipt = _receipt_document(event, received_at)
    try:
        await collection.insert_one(receipt)
        return receipt, "new"
    except DuplicateKeyError:
        pass

    stored = await collection.find_one({"event_key": event.event_key}, {"_id": 0})
    if not stored:
        raise RuntimeError("Resend receipt persistence could not be confirmed")

    # Verify identity match
    if (
        stored.get("provider") != "resend"
        or stored.get("event_type") != event.event_type
        or (stored.get("provider_message_id") or "") != (event.provider_message_id or "")
    ):
        return stored, "conflict"

    if stored.get("processing_state") == "processed":
        return stored, "processed"

    # Atomic claim: only one worker transitions pending -> claimed
    claim_result = await collection.update_one(
        {"event_key": event.event_key, "processing_state": {"$in": ["pending", "claimed"]}},
        {"$set": {"processing_state": "claimed"}},
    )
    if getattr(claim_result, "modified_count", 0) == 0:
        # Another worker claimed or finished it
        stored = await collection.find_one({"event_key": event.event_key}, {"_id": 0})
        if stored and stored.get("processing_state") == "processed":
            return stored, "processed"
        return stored or {}, "processed"  # Treat as complete

    return stored, "claimed"


async def finish_resend_receipt(collection, event: VerifiedResendEvent, processed_at: datetime) -> None:
    """Mark a receipt complete only after all durable effects succeed."""
    timestamp = processed_at.astimezone(timezone.utc).isoformat()
    await collection.update_one(
        {"event_key": event.event_key, "provider": "resend"},
        {"$set": {"processing_state": "processed", "processed_at": timestamp}},
    )


async def store_unknown_event_receipt(
    collection, event: VerifiedResendEvent, received_at: datetime,
) -> None:
    """Store a minimal receipt for an unsupported event type. One mutation."""
    receipt = _receipt_document(event, received_at, kind="unknown_event")
    receipt["processing_state"] = "processed"
    receipt["processed_at"] = receipt["received_at"]
    try:
        await collection.insert_one(receipt)
    except DuplicateKeyError:
        pass  # Idempotent


async def store_unmatched_diagnostic(
    collection, event: VerifiedResendEvent, received_at: datetime,
) -> None:
    """Store one redacted diagnostic when the provider_message_id has no outbox row."""
    timestamp = received_at.astimezone(timezone.utc).isoformat()
    doc = {
        "event_key": event.event_key,
        "provider": "resend",
        "kind": "unmatched_provider_id",
        "event_type": event.event_type,
        "provider_message_id_prefix": (event.provider_message_id or "")[:8] or None,
        "processing_state": "processed",
        "received_at": timestamp,
        "processed_at": timestamp,
    }
    try:
        await collection.insert_one(doc)
    except DuplicateKeyError:
        pass  # Idempotent


# ---------------------------------------------------------------------------
# Orphan event persistence — durable reconciliation for early webhooks
# ---------------------------------------------------------------------------

MAX_ORPHAN_RECIPIENTS = 5
MAX_RECIPIENT_LENGTH = 254
ORPHAN_RECONCILED_TTL_SECONDS = 7 * 24 * 3600  # 7 days
ORPHAN_BASE_RETRY_SECONDS = 60
ORPHAN_MAX_RETRY_SECONDS = 3600


def _sanitize_recipients(raw: tuple[str, ...]) -> list[str]:
    """Cap and normalize recipients for orphan storage."""
    out: list[str] = []
    for addr in raw[:MAX_ORPHAN_RECIPIENTS]:
        cleaned = str(addr or "").strip().lower()[:MAX_RECIPIENT_LENGTH]
        if cleaned:
            out.append(cleaned)
    return out


def _next_attempt_at(attempt_count: int, base: datetime) -> str:
    delay = min(ORPHAN_BASE_RETRY_SECONDS * (2 ** min(attempt_count, 10)),
                ORPHAN_MAX_RETRY_SECONDS)
    return (base + timedelta(seconds=delay)).astimezone(timezone.utc).isoformat()


def _orphan_document(event: VerifiedResendEvent, received_at: datetime) -> dict[str, Any]:
    """Minimized replayable orphan record.

    Contains only the fields consumed by apply_resend_outbox_event plus
    reconciliation metadata.  No raw body, headers, signature, email
    content, phone numbers, names, or unrelated PII.
    """
    timestamp = received_at.astimezone(timezone.utc).isoformat()
    return {
        "event_key": event.event_key,
        "provider": "resend",
        "provider_message_id": event.provider_message_id or None,
        "event_type": event.event_type,
        "event_created_at": event.event_created_at or None,
        "recipients": _sanitize_recipients(event.recipients),
        "first_seen_at": timestamp,
        "last_seen_at": timestamp,
        "attempt_count": 1,
        "state": "pending",
        "next_attempt_at": timestamp,
        "lease_owner": None,
        "lease_expires_at": None,
        "last_error_code": None,
        "reconciled_at": None,
        "reconciled_ttl_expires_at": None,
    }


def _event_from_orphan(doc: Mapping[str, Any]) -> VerifiedResendEvent:
    """Reconstruct a VerifiedResendEvent from an orphan document."""
    return VerifiedResendEvent(
        webhook_id=str(doc.get("event_key", "")).removeprefix("resend:"),
        event_type=str(doc.get("event_type") or ""),
        provider_message_id=str(doc.get("provider_message_id") or ""),
        event_created_at=str(doc.get("event_created_at") or ""),
        recipients=tuple(doc.get("recipients") or []),
    )


async def store_orphan_event(
    orphan_collection,
    event: VerifiedResendEvent,
    received_at: datetime,
) -> dict[str, Any]:
    """Persist one minimized orphan record, or update attempt metadata on replay.

    Uses event_key (svix-id based) as the unique idempotency key.
    Returns the stored/updated document.  Raises on transient DB failure.
    """
    timestamp = received_at.astimezone(timezone.utc).isoformat()
    doc = _orphan_document(event, received_at)
    try:
        await orphan_collection.insert_one(doc)
        return doc
    except DuplicateKeyError:
        pass
    # Replay — update attempt metadata only, no state change
    await orphan_collection.update_one(
        {"event_key": event.event_key},
        {"$set": {"last_seen_at": timestamp}, "$inc": {"attempt_count": 1}},
    )
    return await orphan_collection.find_one({"event_key": event.event_key}, {"_id": 0}) or doc


async def _claim_orphan(orphan_collection, event_key: str, worker_id: str,
                        now: datetime, lease_seconds: int = 60) -> bool:
    """Atomic compare-and-set claim.  Returns True if this worker won."""
    timestamp = now.astimezone(timezone.utc).isoformat()
    lease_end = (now + timedelta(seconds=lease_seconds)).astimezone(timezone.utc).isoformat()
    result = await orphan_collection.update_one(
        {
            "event_key": event_key,
            "state": {"$in": ["pending", "failed"]},
            "$or": [
                {"lease_owner": None},
                {"lease_expires_at": {"$lt": timestamp}},
            ],
        },
        {"$set": {
            "lease_owner": worker_id,
            "lease_expires_at": lease_end,
        }},
    )
    return getattr(result, "modified_count", 0) == 1


async def _release_orphan_reconciled(orphan_collection, event_key: str,
                                     now: datetime) -> None:
    timestamp = now.astimezone(timezone.utc).isoformat()
    ttl_expires = (now + timedelta(seconds=ORPHAN_RECONCILED_TTL_SECONDS)).astimezone(timezone.utc).isoformat()
    await orphan_collection.update_one(
        {"event_key": event_key},
        {"$set": {
            "state": "reconciled",
            "reconciled_at": timestamp,
            "lease_owner": None,
            "lease_expires_at": None,
            "last_error_code": None,
            "reconciled_ttl_expires_at": ttl_expires,
        }},
    )


async def _release_orphan_failed(orphan_collection, event_key: str,
                                 now: datetime, error_code: str) -> None:
    timestamp = now.astimezone(timezone.utc).isoformat()
    doc = await orphan_collection.find_one({"event_key": event_key}, {"attempt_count": 1})
    attempt = int((doc or {}).get("attempt_count", 1))
    next_at = _next_attempt_at(attempt, now)
    await orphan_collection.update_one(
        {"event_key": event_key},
        {"$set": {
            "state": "failed",
            "lease_owner": None,
            "lease_expires_at": None,
            "last_error_code": error_code[:80],
            "last_seen_at": timestamp,
            "next_attempt_at": next_at,
        }},
    )


async def reconcile_single_orphan(
    orphan_collection,
    receipt_collection,
    outbox_collection,
    orphan_doc: Mapping[str, Any],
    *,
    suppression_callback=None,
    worker_id: str = "webhook_inline",
    now: datetime | None = None,
) -> str:
    """Attempt to reconcile one orphan.

    Returns one of: "reconciled", "skipped", "not_found", "failed", "lease_lost".
    Performs outbox state update, optional suppression, and receipt completion
    as a single logical transaction.  Does NOT send email or SMS.
    """
    received_at = now or datetime.now(timezone.utc)
    event_key = str(orphan_doc.get("event_key", ""))
    event = _event_from_orphan(orphan_doc)
    if not event.supported or not event.provider_message_id:
        return "skipped"

    if not await _claim_orphan(orphan_collection, event_key, worker_id, received_at):
        return "lease_lost"

    try:
        await apply_resend_outbox_event(outbox_collection, event, received_at)
    except ResendOutboxNotFound:
        # Mapping still absent — release lease, leave retryable
        await _release_orphan_failed(orphan_collection, event_key, received_at, "outbox_not_found")
        return "not_found"
    except Exception:
        await _release_orphan_failed(orphan_collection, event_key, received_at, "outbox_update_error")
        return "failed"

    # Suppression (bounce/complaint) — only when mapping exists
    if suppression_callback and event.event_type in SUPPRESSION_EVENTS:
        try:
            for recipient in event.recipients[:MAX_ORPHAN_RECIPIENTS]:
                await suppression_callback(event.event_type, recipient)
        except Exception:
            await _release_orphan_failed(orphan_collection, event_key, received_at, "suppression_error")
            return "failed"

    # Receipt completion
    try:
        await finish_resend_receipt(receipt_collection, event, received_at)
    except Exception:
        await _release_orphan_failed(orphan_collection, event_key, received_at, "receipt_finish_error")
        return "failed"

    await _release_orphan_reconciled(orphan_collection, event_key, received_at)
    return "reconciled"


async def reconcile_orphans_for_message(
    orphan_collection,
    receipt_collection,
    outbox_collection,
    provider_message_id: str,
    *,
    suppression_callback=None,
    worker_id: str = "dispatch_inline",
    now: datetime | None = None,
) -> int:
    """Reconcile pending/failed orphans after provider_message_id mapping is persisted."""
    received_at = now or datetime.now(timezone.utc)
    cursor = orphan_collection.find(
        {"provider_message_id": provider_message_id,
         "state": {"$in": ["pending", "failed"]}},
        {"_id": 0},
    )
    orphans = await cursor.to_list(100)
    reconciled = 0
    for orphan_doc in orphans:
        result = await reconcile_single_orphan(
            orphan_collection, receipt_collection, outbox_collection,
            orphan_doc, suppression_callback=suppression_callback,
            worker_id=worker_id, now=received_at,
        )
        if result == "reconciled":
            reconciled += 1
    return reconciled


async def recover_pending_orphans(
    orphan_collection,
    receipt_collection,
    outbox_collection,
    *,
    suppression_callback=None,
    worker_id: str = "recovery_worker",
    now: datetime | None = None,
    batch_size: int = 50,
) -> dict[str, int]:
    """Independent recovery path for pending and failed orphans.

    Callable at startup, periodically via scheduler, or directly from tests.
    Never sends email or SMS.  Only reconciles stored webhook state.
    """
    received_at = now or datetime.now(timezone.utc)
    timestamp = received_at.astimezone(timezone.utc).isoformat()
    cursor = orphan_collection.find(
        {
            "state": {"$in": ["pending", "failed"]},
            "next_attempt_at": {"$lte": timestamp},
            "$or": [
                {"lease_owner": None},
                {"lease_expires_at": {"$lt": timestamp}},
            ],
        },
        {"_id": 0},
    ).sort("next_attempt_at", 1).limit(batch_size)
    orphans = await cursor.to_list(batch_size)
    counts = {"reconciled": 0, "not_found": 0, "failed": 0, "skipped": 0, "lease_lost": 0}
    for orphan_doc in orphans:
        result = await reconcile_single_orphan(
            orphan_collection, receipt_collection, outbox_collection,
            orphan_doc, suppression_callback=suppression_callback,
            worker_id=worker_id, now=received_at,
        )
        counts[result] = counts.get(result, 0) + 1
    return counts


# ---------------------------------------------------------------------------
# Outbox state application — monotonic delivery rank
# ---------------------------------------------------------------------------

def _stored_delivery_rank(document: Mapping[str, Any]) -> int:
    state_rank = DELIVERY_STATE_RANKS.get(str(document.get("provider_delivery_state") or ""), 0)
    try:
        stored_rank = int(document.get("provider_delivery_rank") or 0)
    except (TypeError, ValueError):
        stored_rank = 0
    return max(state_rank, stored_rank)


async def apply_resend_outbox_event(
    collection,
    event: VerifiedResendEvent,
    received_at: datetime,
) -> dict[str, Any]:
    """Apply one monotonic delivery state to the owning outbox row.

    A missing row raises ResendOutboxNotFound.
    A lower-ranked late event is acknowledged after confirming the row exists.
    """
    message_id = str(event.provider_message_id or "").strip()
    incoming_state = event.event_type.removeprefix("email.")
    incoming_rank = DELIVERY_STATE_RANKS.get(incoming_state)
    if not message_id or incoming_rank is None:
        raise ResendOutboxNotFound("Verified Resend message has no matching outbox row")

    for _ in range(3):
        current = await collection.find_one(
            {"provider_message_id": message_id},
            {"_id": 1, "provider_delivery_state": 1, "provider_delivery_rank": 1},
        )
        if not current:
            raise ResendOutboxNotFound("Verified Resend message has no matching outbox row")

        current_rank = _stored_delivery_rank(current)
        if incoming_rank <= current_rank:
            return {"matched": True, "advanced": False, "state": str(current.get("provider_delivery_state") or "")}

        compare = {"_id": current["_id"], "provider_message_id": message_id}
        for field in ("provider_delivery_state", "provider_delivery_rank"):
            if field in current:
                compare[field] = current[field]
            else:
                compare[field] = {"$exists": False}
        timestamp = received_at.astimezone(timezone.utc).isoformat()
        result = await collection.update_one(
            compare,
            {"$set": {
                "provider_delivery_state": incoming_state,
                "provider_delivery_rank": incoming_rank,
                "provider_delivery_terminal": incoming_state in TERMINAL_DELIVERY_STATES,
                "provider_receipt_event_key": event.event_key,
                "provider_delivery_updated_at": timestamp,
                "updated_at": timestamp,
            }},
        )
        if getattr(result, "matched_count", 0) == 1:
            return {"matched": True, "advanced": True, "state": incoming_state}

    raise RuntimeError("Resend delivery state changed too many times during update")
