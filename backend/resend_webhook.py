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
    "email.failed",
    "email.suppressed",
    "email.opened",
    "email.clicked",
}

SUPPRESSION_EVENTS = {"email.bounced", "email.complained"}

TERMINAL_EVENTS = {"email.bounced", "email.complained", "email.failed", "email.suppressed"}

TIMESTAMP_TOLERANCE_SECONDS = 300

MAX_HEADER_LENGTH = 512
MAX_EVENT_TYPE_LENGTH = 64
MAX_PROVIDER_ID_LENGTH = 200
MAX_RECIPIENT_COUNT = 50
MAX_RECIPIENT_LENGTH = 254


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
    """Strict fail-closed webhook verification.

    Requires whsec_ prefix, strict base64 with validate=True, non-empty key,
    capped headers, non-empty byte payload, JSON object payload, object data,
    capped event type and provider IDs, and validated bounded recipients.
    """
    # --- Header validation (reject oversized; never truncate) ---
    webhook_id = (headers.get("svix-id") or "").strip()
    timestamp_str = (headers.get("svix-timestamp") or "").strip()
    signature_header = (headers.get("svix-signature") or "").strip()

    if not webhook_id or not timestamp_str or not signature_header:
        raise ResendWebhookVerificationError("Missing required svix headers")

    if (len(webhook_id) > MAX_HEADER_LENGTH
            or len(timestamp_str) > MAX_HEADER_LENGTH
            or len(signature_header) > MAX_HEADER_LENGTH):
        raise ResendWebhookVerificationError("Oversized svix header value")

    try:
        timestamp = int(timestamp_str)
    except (ValueError, TypeError):
        raise ResendWebhookVerificationError("Malformed svix-timestamp")

    current = now or datetime.now(timezone.utc)
    now_ts = int(current.timestamp())
    if abs(now_ts - timestamp) > TIMESTAMP_TOLERANCE_SECONDS:
        raise ResendWebhookVerificationError("Timestamp outside tolerance window")

    # --- Secret validation: require whsec_ prefix ---
    if not signing_secret.startswith("whsec_"):
        raise ResendWebhookVerificationError("Signing secret must use whsec_ prefix")
    secret_b64 = signing_secret[6:]
    if not secret_b64:
        raise ResendWebhookVerificationError("Empty signing secret payload")
    try:
        secret_bytes = base64.b64decode(secret_b64, validate=True)
    except Exception:
        raise ResendWebhookVerificationError("Invalid signing secret encoding")
    if not secret_bytes:
        raise ResendWebhookVerificationError("Decoded signing secret is empty")

    # --- Body validation ---
    if not raw_body:
        raise ResendWebhookVerificationError("Empty request body")

    # --- Signature computation and verification ---
    content = webhook_id.encode() + b"." + str(timestamp).encode() + b"." + raw_body
    expected_sig = base64.b64encode(
        hmac.new(secret_bytes, content, hashlib.sha256).digest()
    ).decode()

    provided_sigs = [
        s.strip().removeprefix("v1,")
        for s in signature_header.split(" ")
        if s.strip().startswith("v1,")
    ]
    if not any(hmac.compare_digest(expected_sig, sig) for sig in provided_sigs):
        raise ResendWebhookVerificationError("Signature verification failed")

    # --- Payload validation ---
    try:
        payload = json.loads(raw_body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise ResendWebhookVerificationError("Malformed JSON body")

    if not isinstance(payload, dict):
        raise ResendWebhookVerificationError("JSON payload must be an object")

    data = payload.get("data")
    if not isinstance(data, dict):
        raise ResendWebhookVerificationError("Payload data must be an object")

    event_type = str(payload.get("type") or "").strip()
    if not event_type:
        raise ResendWebhookVerificationError("Missing event type")
    if len(event_type) > MAX_EVENT_TYPE_LENGTH:
        raise ResendWebhookVerificationError("Oversized event type")

    email_id = str(data.get("email_id") or "").strip()
    if len(email_id) > MAX_PROVIDER_ID_LENGTH:
        raise ResendWebhookVerificationError("Oversized provider message ID")
    if event_type in SUPPORTED_EMAIL_EVENTS and not email_id:
        raise ResendWebhookVerificationError("Supported delivery event requires email_id")

    # --- Recipient validation ---
    recipients_raw = data.get("to") or []
    if isinstance(recipients_raw, str):
        recipients_raw = [recipients_raw]
    if not isinstance(recipients_raw, list):
        raise ResendWebhookVerificationError("Recipients must be a list or string")
    recipients_raw = recipients_raw[:MAX_RECIPIENT_COUNT]
    recipients: list[str] = []
    for r in recipients_raw:
        if not isinstance(r, str):
            continue
        cleaned = r.strip().lower()[:MAX_RECIPIENT_LENGTH]
        if cleaned:
            recipients.append(cleaned)

    event_created_at = str(payload.get("created_at") or "").strip()[:64]

    return VerifiedResendEvent(
        webhook_id=webhook_id,
        event_type=event_type,
        provider_message_id=email_id,
        event_created_at=event_created_at,
        recipients=tuple(recipients),
    )


# ---------------------------------------------------------------------------
# Outbox state — provider delivery namespace (separate from core state machine)
# ---------------------------------------------------------------------------

# Monotonic rank for provider delivery events.  Strictly increasing within
# the non-terminal lifecycle so every successive stage advances.  Terminal
# events outrank all non-terminal events and cannot regress once applied.
_PROVIDER_DELIVERY_RANK: dict[str, int] = {
    "email.sent": 1,
    "email.delivery_delayed": 2,
    "email.delivered": 3,
    "email.opened": 4,
    "email.clicked": 5,
    "email.bounced": 10,      # terminal
    "email.complained": 11,   # terminal
    "email.failed": 12,       # terminal
    "email.suppressed": 13,   # terminal
}


async def apply_resend_outbox_event(
    outbox_collection,
    event: VerifiedResendEvent,
    received_at: datetime,
) -> dict[str, Any]:
    """Apply a verified event to the PROVIDER delivery namespace on the outbox row.

    Uses provider_delivery_state / provider_delivery_rank — never touches the
    core delivery_state or delivery_rank fields owned by lead_outbox.py.

    Monotonic: only higher-ranked events advance.  Non-terminal additive events
    (opened, clicked) cannot replace terminal events (bounced, complained,
    failed, suppressed).

    Raises ResendOutboxNotFound if no outbox row has this provider_message_id.
    """
    if not event.provider_message_id:
        raise ResendOutboxNotFound("No provider_message_id in event")

    rank = _PROVIDER_DELIVERY_RANK.get(event.event_type, 0)
    is_terminal = event.event_type in TERMINAL_EVENTS
    timestamp = received_at.astimezone(timezone.utc).isoformat()

    # Top-level terminal guard: once terminal, no event can advance.
    # Rank $or: advance only if rank is absent or strictly lower.
    result = await outbox_collection.update_one(
        {
            "provider_message_id": event.provider_message_id,
            "provider_delivery_terminal": {"$ne": True},
            "$or": [
                {"provider_delivery_rank": {"$exists": False}},
                {"provider_delivery_rank": {"$lt": rank}},
            ],
        },
        {
            "$set": {
                "provider_delivery_state": event.event_type,
                "provider_delivery_rank": rank,
                "provider_delivery_terminal": is_terminal,
                "provider_receipt_event_key": event.event_key,
                "provider_delivery_updated_at": timestamp,
            }
        },
    )
    matched = getattr(result, "matched_count", 0)

    if matched == 0:
        exists = await outbox_collection.find_one(
            {"provider_message_id": event.provider_message_id},
            {"_id": 1},
        )
        if not exists:
            raise ResendOutboxNotFound(
                f"No outbox row for provider_message_id (prefix: {event.provider_message_id[:8]})"
            )
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

def _unique_worker_id(prefix: str = "wh") -> str:
    """Generate a unique per-task claim owner."""
    return f"{prefix}-{uuid.uuid4().hex[:12]}"


MAX_ORPHAN_RECIPIENTS = 5
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
                                 *, lease_owner: str | None = None) -> bool:
    """Owner-fenced release to failed state with atomic attempt_count increment.

    Returns True if this owner's release matched.  False means the lease was
    lost to another worker; the caller must report lease_lost, not success.
    """
    ts = now.astimezone(timezone.utc)
    query: dict[str, Any] = {"event_key": event_key}
    if lease_owner:
        query["lease_owner"] = lease_owner
    # Atomic increment + backoff from the new count
    result = await orphan_collection.update_one(
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
    return getattr(result, "modified_count", 0) > 0


async def reconcile_single_orphan(
    orphan_collection,
    receipt_collection,
    outbox_collection,
    orphan_doc: Mapping[str, Any],
    *,
    suppression_callback=None,
    worker_id: str | None = None,
    now: datetime | None = None,
) -> str:
    """Attempt to reconcile one orphan.

    Returns one of: "reconciled", "skipped", "not_found", "failed", "lease_lost".

    Ownership contract:
      1. Claim the orphan lease with claim_owner.
      2. Acquire or reclaim the receipt with the exact same claim_owner.
      3. Apply outbox + suppression effects.
      4. Finish receipt with owner=claim_owner.
      5. Release orphan with lease_owner=claim_owner.

    Every failure-path release is owner-fenced.  If the fenced release does
    not match (another worker took the lease), return "lease_lost".
    """
    received_at = now or datetime.now(timezone.utc)
    claim_owner = worker_id or _unique_worker_id("recon")
    event_key = str(orphan_doc.get("event_key", ""))
    event = _event_from_orphan(orphan_doc)
    if not event.supported or not event.provider_message_id:
        return "skipped"

    if not await _claim_orphan(orphan_collection, event_key, claim_owner, received_at):
        return "lease_lost"

    # --- Step 2: acquire or reclaim the receipt with the same owner ---
    try:
        _receipt, receipt_status = await begin_resend_receipt(
            receipt_collection, event, received_at, owner=claim_owner)
    except Exception:
        released = await _release_orphan_failed(
            orphan_collection, event_key, received_at,
            "receipt_begin_error", lease_owner=claim_owner)
        return "failed" if released else "lease_lost"

    if receipt_status == "processed":
        # Already finalized — release orphan as reconciled
        released = await _release_orphan_reconciled(
            orphan_collection, event_key, received_at, lease_owner=claim_owner)
        return "reconciled" if released else "lease_lost"

    if receipt_status == "busy":
        released = await _release_orphan_failed(
            orphan_collection, event_key, received_at,
            "receipt_busy", lease_owner=claim_owner)
        return "failed" if released else "lease_lost"

    if receipt_status == "conflict":
        released = await _release_orphan_failed(
            orphan_collection, event_key, received_at,
            "receipt_conflict", lease_owner=claim_owner)
        return "failed" if released else "lease_lost"

    # receipt_status == "claimed" — this worker owns both orphan and receipt

    # --- Step 3: apply outbox event ---
    try:
        await apply_resend_outbox_event(outbox_collection, event, received_at)
    except ResendOutboxNotFound:
        released = await _release_orphan_failed(
            orphan_collection, event_key, received_at,
            "outbox_not_found", lease_owner=claim_owner)
        return "not_found" if released else "lease_lost"
    except Exception:
        released = await _release_orphan_failed(
            orphan_collection, event_key, received_at,
            "outbox_update_error", lease_owner=claim_owner)
        return "failed" if released else "lease_lost"

    # --- Step 3b: suppression callback ---
    if suppression_callback and event.event_type in SUPPRESSION_EVENTS:
        try:
            for recipient in event.recipients[:MAX_ORPHAN_RECIPIENTS]:
                await suppression_callback(event.event_type, recipient)
        except Exception:
            released = await _release_orphan_failed(
                orphan_collection, event_key, received_at,
                "suppression_error", lease_owner=claim_owner)
            return "failed" if released else "lease_lost"

    # --- Step 4: finish receipt with owner fence ---
    try:
        completed = await finish_resend_receipt(
            receipt_collection, event, received_at, owner=claim_owner)
        if not completed:
            released = await _release_orphan_failed(
                orphan_collection, event_key, received_at,
                "receipt_finish_fenced", lease_owner=claim_owner)
            return "failed" if released else "lease_lost"
    except Exception:
        released = await _release_orphan_failed(
            orphan_collection, event_key, received_at,
            "receipt_finish_error", lease_owner=claim_owner)
        return "failed" if released else "lease_lost"

    # --- Step 5: release orphan as reconciled ---
    released = await _release_orphan_reconciled(
        orphan_collection, event_key, received_at, lease_owner=claim_owner)
    if not released:
        return "lease_lost"
    return "reconciled"


async def reconcile_orphans_for_message(
    orphan_collection,
    receipt_collection,
    outbox_collection,
    provider_message_id: str,
    *,
    suppression_callback=None,
    worker_id: str | None = None,
    now: datetime | None = None,
) -> int:
    """Reconcile pending/failed orphans after provider_message_id mapping is persisted."""
    received_at = now or datetime.now(timezone.utc)
    claim_owner = worker_id or _unique_worker_id("dispatch")
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
            worker_id=claim_owner, now=received_at,
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
    worker_id: str | None = None,
    now: datetime | None = None,
    batch_size: int = 50,
) -> dict[str, int]:
    """Independent recovery path for pending and failed orphans.

    Callable at startup, periodically via lifecycle, or directly from tests.
    Never sends email or SMS.  Only reconciles stored webhook state.
    """
    received_at = now or datetime.now(timezone.utc)
    claim_owner = worker_id or _unique_worker_id("recovery")
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
            worker_id=claim_owner, now=received_at,
        )
        counts[result] = counts.get(result, 0) + 1
    return counts
