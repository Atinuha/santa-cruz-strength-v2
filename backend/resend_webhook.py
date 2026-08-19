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
from datetime import datetime, timezone
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
