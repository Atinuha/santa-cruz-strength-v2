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
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Mapping

try:
    from pymongo.errors import DuplicateKeyError
except ImportError:  # Pure unit tests do not require the production driver.
    class DuplicateKeyError(Exception):  # type: ignore[no-redef]
        pass

# ---------------------------------------------------------------------------
# Verification structures
# ---------------------------------------------------------------------------

SUPPORTED_EMAIL_EVENTS = {
    "email.sent",
    "email.delivered",
    "email.delivery_delayed",
    "email.bounced",
    "email.complained",
    "email.opened",
    "email.clicked",
}

SUPPRESSION_EVENTS = {"email.bounced", "email.complained"}

TIMESTAMP_TOLERANCE_SECONDS = 300


class ResendWebhookVerificationError(ValueError):
    pass


class ResendOutboxNotFound(LookupError):
    pass


class ResendWebhookReceiptConflict(RuntimeError):
    pass


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


# ---------------------------------------------------------------------------
# Signature verification
# ---------------------------------------------------------------------------

def verify_resend_webhook(
    raw_body: bytes,
    headers: Mapping[str, str],
    signing_secret: str,
    *,
    now: datetime | None = None,
) -> VerifiedResendEvent:
    """Verify a Resend webhook and return a minimal verified event."""
    webhook_id = (headers.get("svix-id") or "").strip()
    timestamp_str = (headers.get("svix-timestamp") or "").strip()
    signature_header = (headers.get("svix-signature") or "").strip()

    if not webhook_id or not timestamp_str or not signature_header:
        raise ResendWebhookVerificationError("Missing required svix headers")

    try:
        timestamp = int(timestamp_str)
    except (ValueError, TypeError):
        raise ResendWebhookVerificationError("Malformed svix-timestamp")

    current = now or datetime.now(timezone.utc)
    now_ts = int(current.timestamp())
    if abs(now_ts - timestamp) > TIMESTAMP_TOLERANCE_SECONDS:
        raise ResendWebhookVerificationError(
            f"Timestamp {timestamp} is outside the {TIMESTAMP_TOLERANCE_SECONDS}s tolerance window"
        )

    # Decode the secret: strip "whsec_" prefix and base64-decode
    secret_raw = signing_secret
    if secret_raw.startswith("whsec_"):
        secret_raw = secret_raw[6:]
    try:
        secret_bytes = base64.b64decode(secret_raw)
    except Exception:
        raise ResendWebhookVerificationError("Invalid signing secret encoding")

    # Compute expected signature
    content = webhook_id.encode() + b"." + str(timestamp).encode() + b"." + raw_body
    expected_sig = base64.b64encode(
        hmac.new(secret_bytes, content, hashlib.sha256).digest()
    ).decode()

    # Verify at least one signature matches
    provided_sigs = [
        s.strip().removeprefix("v1,")
        for s in signature_header.split(" ")
        if s.strip().startswith("v1,")
    ]
    if not any(hmac.compare_digest(expected_sig, sig) for sig in provided_sigs):
        raise ResendWebhookVerificationError("Signature verification failed")

    # Parse the body
    try:
        payload = json.loads(raw_body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise ResendWebhookVerificationError("Malformed JSON body")

    event_type = str(payload.get("type") or "").strip()
    data = payload.get("data") or {}
    email_id = str(data.get("email_id") or "").strip()
    recipients_raw = data.get("to") or []
    if isinstance(recipients_raw, str):
        recipients_raw = [recipients_raw]
    recipients = tuple(str(r).strip().lower() for r in recipients_raw if r)
    event_created_at = str(payload.get("created_at") or "").strip()

    return VerifiedResendEvent(
        webhook_id=webhook_id,
        event_type=event_type,
        provider_message_id=email_id,
        event_created_at=event_created_at,
        recipients=recipients,
    )


# ---------------------------------------------------------------------------
# Outbox state — monotonic delivery-rank update
# ---------------------------------------------------------------------------

_DELIVERY_RANK: dict[str, int] = {
    "email.sent": 1,
    "email.delivered": 2,
    "email.delivery_delayed": 1,
    "email.opened": 3,
    "email.clicked": 4,
    "email.bounced": 10,
    "email.complained": 11,
}


async def apply_resend_outbox_event(
    outbox_collection,
    event: VerifiedResendEvent,
    received_at: datetime,
) -> dict[str, Any]:
    """Apply a verified event to the outbox row for this provider_message_id.

    Uses monotonic rank: only the highest-ranked state survives. Lower-ranked
    replays are acknowledged idempotently without overwriting.

    Raises ResendOutboxNotFound if no outbox row has this provider_message_id.
    """
    if not event.provider_message_id:
        raise ResendOutboxNotFound("No provider_message_id in event")

    rank = _DELIVERY_RANK.get(event.event_type, 0)
    timestamp = received_at.astimezone(timezone.utc).isoformat()

    result = await outbox_collection.update_one(
        {
            "provider_message_id": event.provider_message_id,
            "$or": [
                {"delivery_rank": {"$exists": False}},
                {"delivery_rank": {"$lt": rank}},
            ],
        },
        {
            "$set": {
                "delivery_state": event.event_type,
                "delivery_rank": rank,
                "delivery_state_updated_at": timestamp,
            }
        },
    )
    matched = getattr(result, "matched_count", 0)

    if matched == 0:
        # Check if the row exists with a higher rank (idempotent acknowledgement)
        exists = await outbox_collection.find_one(
            {"provider_message_id": event.provider_message_id},
            {"_id": 1},
        )
        if not exists:
            raise ResendOutboxNotFound(
                f"No outbox row for provider_message_id (prefix: {event.provider_message_id[:8]})"
            )
        # Row exists but rank is already higher or equal — idempotent ack
        return {"matched": True, "advanced": False, "state": event.event_type}

    return {
        "matched": True,
        "advanced": getattr(result, "modified_count", 0) > 0,
        "state": event.event_type,
    }


# ---------------------------------------------------------------------------
# Receipt persistence — crash-safe owner+lease claim
# ---------------------------------------------------------------------------

def _receipt_document(event: VerifiedResendEvent, received_at: datetime,
                      owner: str, *, kind: str = "event") -> dict[str, Any]:
    timestamp = received_at.astimezone(timezone.utc).isoformat()
    lease_end = (received_at + timedelta(seconds=120)).astimezone(timezone.utc).isoformat()
    return {
        "event_key": event.event_key,
        "provider": "resend",
        "provider_event_id": event.webhook_id,
        "event_type": event.event_type,
        "provider_message_id": event.provider_message_id or None,
        "event_created_at": event.event_created_at or None,
        "kind": kind,
        "processing_state": "claimed",
        "claim_owner": owner,
        "claim_expires_at": lease_end,
        "fencing_token": 1,
        "received_at": timestamp,
        "processed_at": None,
    }


async def begin_resend_receipt(
    collection, event: VerifiedResendEvent, received_at: datetime,
    *, owner: str | None = None,
) -> tuple[dict, str]:
    """Atomic owner+lease claim.

    First insert is immediately claimed by owner.  A duplicate key means
    the receipt exists:
      - processed → return "processed"
      - claimed by owner with active lease → "claimed" (re-entrant)
      - claimed by another with active lease → "busy" (caller should 503)
      - expired claim → reclaim atomically

    Returns (receipt_doc, status).
    """
    claim_owner = owner or f"wh-{uuid.uuid4().hex[:12]}"
    receipt = _receipt_document(event, received_at, claim_owner)
    try:
        await collection.insert_one(receipt)
        return receipt, "claimed"
    except DuplicateKeyError:
        pass

    stored = await collection.find_one({"event_key": event.event_key}, {"_id": 0})
    if not stored:
        raise RuntimeError("Resend receipt persistence could not be confirmed")

    # Identity match
    if (
        stored.get("provider") != "resend"
        or stored.get("event_type") != event.event_type
        or (stored.get("provider_message_id") or "") != (event.provider_message_id or "")
    ):
        return stored, "conflict"

    if stored.get("processing_state") == "processed":
        return stored, "processed"

    # Check lease
    now_iso = received_at.astimezone(timezone.utc).isoformat()
    stored_owner = stored.get("claim_owner")
    stored_expires = stored.get("claim_expires_at") or ""

    if stored_owner == claim_owner:
        return stored, "claimed"

    if stored_expires > now_iso:
        # Active lease held by another — busy
        return stored, "busy"

    # Expired lease — reclaim atomically
    lease_end = (received_at + timedelta(seconds=120)).astimezone(timezone.utc).isoformat()
    result = await collection.update_one(
        {
            "event_key": event.event_key,
            "processing_state": {"$in": ["pending", "claimed"]},
            "$or": [
                {"claim_expires_at": {"$lte": now_iso}},
                {"claim_expires_at": None},
            ],
        },
        {
            "$set": {
                "processing_state": "claimed",
                "claim_owner": claim_owner,
                "claim_expires_at": lease_end,
            },
            "$inc": {"fencing_token": 1},
        },
    )
    if getattr(result, "modified_count", 0) == 0:
        refreshed = await collection.find_one({"event_key": event.event_key}, {"_id": 0})
        if refreshed and refreshed.get("processing_state") == "processed":
            return refreshed, "processed"
        return refreshed or stored, "busy"

    updated = await collection.find_one({"event_key": event.event_key}, {"_id": 0})
    return updated or stored, "claimed"


async def finish_resend_receipt(
    collection, event: VerifiedResendEvent, processed_at: datetime,
    *, owner: str | None = None,
) -> bool:
    """Mark receipt processed.  Owner-fenced when owner is provided."""
    timestamp = processed_at.astimezone(timezone.utc).isoformat()
    query: dict[str, Any] = {"event_key": event.event_key, "provider": "resend"}
    if owner:
        query["claim_owner"] = owner
    result = await collection.update_one(
        query,
        {"$set": {"processing_state": "processed", "processed_at": timestamp}},
    )
    return getattr(result, "modified_count", 0) > 0


async def store_unknown_event_receipt(
    collection, event: VerifiedResendEvent, received_at: datetime,
) -> None:
    """Store a minimal receipt for an unsupported event type. One mutation."""
    owner = f"unsup-{uuid.uuid4().hex[:8]}"
    receipt = _receipt_document(event, received_at, owner, kind="unknown_event")
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


def _next_attempt_at(attempt_count: int, base: datetime) -> datetime:
    """Exponential backoff capped at ORPHAN_MAX_RETRY_SECONDS. Returns aware datetime."""
    delay = min(ORPHAN_BASE_RETRY_SECONDS * (2 ** min(attempt_count, 10)),
                ORPHAN_MAX_RETRY_SECONDS)
    return (base + timedelta(seconds=delay)).astimezone(timezone.utc)


def _orphan_document(event: VerifiedResendEvent, received_at: datetime) -> dict[str, Any]:
    """Minimized replayable orphan record.

    Contains only the fields consumed by apply_resend_outbox_event plus
    reconciliation metadata.  No raw body, headers, signature, email
    content, phone numbers, names, or unrelated PII.

    Temporal fields are BSON-compatible aware datetimes.
    """
    ts = received_at.astimezone(timezone.utc)
    return {
        "event_key": event.event_key,
        "provider": "resend",
        "provider_message_id": event.provider_message_id or None,
        "event_type": event.event_type,
        "event_created_at": event.event_created_at or None,
        "recipients": _sanitize_recipients(event.recipients),
        "first_seen_at": ts,
        "last_seen_at": ts,
        "attempt_count": 1,
        "state": "pending",
        "next_attempt_at": ts,
        "lease_owner": None,
        "lease_expires_at": None,
        "last_error_code": None,
        "reconciled_at": None,
        "reconciled_ttl_expires_at": None,  # only set on reconciled
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
    ts = received_at.astimezone(timezone.utc)
    doc = _orphan_document(event, received_at)
    try:
        await orphan_collection.insert_one(doc)
        return doc
    except DuplicateKeyError:
        pass
    # Replay — update attempt metadata only, no state change
    await orphan_collection.update_one(
        {"event_key": event.event_key},
        {"$set": {"last_seen_at": ts}, "$inc": {"attempt_count": 1}},
    )
    return await orphan_collection.find_one({"event_key": event.event_key}, {"_id": 0}) or doc


async def _claim_orphan(orphan_collection, event_key: str, worker_id: str,
                        now: datetime, lease_seconds: int = 60) -> bool:
    """Atomic compare-and-set claim.  Returns True if this worker won."""
    ts = now.astimezone(timezone.utc)
    lease_end = ts + timedelta(seconds=lease_seconds)
    result = await orphan_collection.update_one(
        {
            "event_key": event_key,
            "state": {"$in": ["pending", "failed"]},
            "$or": [
                {"lease_owner": None},
                {"lease_expires_at": {"$lt": ts}},
            ],
        },
        {"$set": {
            "lease_owner": worker_id,
            "lease_expires_at": lease_end,
        }},
    )
    return getattr(result, "modified_count", 0) == 1


async def _release_orphan_reconciled(orphan_collection, event_key: str,
                                     now: datetime, *, lease_owner: str | None = None) -> bool:
    """Lease-fenced release to reconciled state.  TTL set as BSON datetime."""
    ts = now.astimezone(timezone.utc)
    ttl_expires = ts + timedelta(seconds=ORPHAN_RECONCILED_TTL_SECONDS)
    query: dict[str, Any] = {"event_key": event_key}
    if lease_owner:
        query["lease_owner"] = lease_owner
    result = await orphan_collection.update_one(
        query,
        {"$set": {
            "state": "reconciled",
            "reconciled_at": ts,
            "lease_owner": None,
            "lease_expires_at": None,
            "last_error_code": None,
            "reconciled_ttl_expires_at": ttl_expires,
        }},
    )
    return getattr(result, "modified_count", 0) > 0


async def _release_orphan_failed(orphan_collection, event_key: str,
                                 now: datetime, error_code: str,
                                 *, lease_owner: str | None = None) -> None:
    """Lease-fenced release to failed state with atomic attempt_count increment."""
    ts = now.astimezone(timezone.utc)
    query: dict[str, Any] = {"event_key": event_key}
    if lease_owner:
        query["lease_owner"] = lease_owner
    # Atomic increment + backoff from the new count
    await orphan_collection.update_one(
        query,
        [
            {"$set": {
                "state": "failed",
                "lease_owner": None,
                "lease_expires_at": None,
                "last_error_code": error_code[:80],
                "last_seen_at": ts,
                "attempt_count": {"$add": [{"$ifNull": ["$attempt_count", 0]}, 1]},
            }},
            {"$set": {
                "next_attempt_at": {
                    "$dateAdd": {
                        "startDate": ts,
                        "unit": "second",
                        "amount": {
                            "$min": [
                                ORPHAN_MAX_RETRY_SECONDS,
                                {"$multiply": [
                                    ORPHAN_BASE_RETRY_SECONDS,
                                    {"$pow": [2, {"$min": ["$attempt_count", 10]}]},
                                ]},
                            ]
                        },
                    }
                },
            }},
        ],
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
    Lease-fenced: all releases filter by lease_owner.
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
        await _release_orphan_failed(orphan_collection, event_key, received_at,
                                     "outbox_not_found", lease_owner=worker_id)
        return "not_found"
    except Exception:
        await _release_orphan_failed(orphan_collection, event_key, received_at,
                                     "outbox_update_error", lease_owner=worker_id)
        return "failed"

    if suppression_callback and event.event_type in SUPPRESSION_EVENTS:
        try:
            for recipient in event.recipients[:MAX_ORPHAN_RECIPIENTS]:
                await suppression_callback(event.event_type, recipient)
        except Exception:
            await _release_orphan_failed(orphan_collection, event_key, received_at,
                                         "suppression_error", lease_owner=worker_id)
            return "failed"

    try:
        await finish_resend_receipt(receipt_collection, event, received_at)
    except Exception:
        await _release_orphan_failed(orphan_collection, event_key, received_at,
                                     "receipt_finish_error", lease_owner=worker_id)
        return "failed"

    await _release_orphan_reconciled(orphan_collection, event_key, received_at,
                                     lease_owner=worker_id)
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

    Callable at startup, periodically via lifecycle, or directly from tests.
    Never sends email or SMS.  Only reconciles stored webhook state.
    """
    received_at = now or datetime.now(timezone.utc)
    ts = received_at.astimezone(timezone.utc)
    cursor = orphan_collection.find(
        {
            "state": {"$in": ["pending", "failed"]},
            "next_attempt_at": {"$lte": ts},
            "$or": [
                {"lease_owner": None},
                {"lease_expires_at": {"$lt": ts}},
            ],
        },
        {"_id": 0},
    ).sort("next_attempt_at", 1).limit(batch_size)
    orphans = await cursor.to_list(batch_size)
    counts: dict[str, int] = {"reconciled": 0, "not_found": 0, "failed": 0, "skipped": 0, "lease_lost": 0}
    for orphan_doc in orphans:
        result = await reconcile_single_orphan(
            orphan_collection, receipt_collection, outbox_collection,
            orphan_doc, suppression_callback=suppression_callback,
            worker_id=worker_id, now=received_at,
        )
        counts[result] = counts.get(result, 0) + 1
    return counts
