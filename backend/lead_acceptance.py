"""Idempotency and recoverable outbox helpers for public lead acceptance."""

from __future__ import annotations

import hashlib
import hmac
import json
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable, Mapping


class LeadIdempotencyConflict(ValueError):
    """A request identifier was reused with a different or unverifiable body."""


def _canonical_value(value: Any) -> Any:
    if isinstance(value, Mapping):
        return {
            str(key): _canonical_value(item)
            for key, item in sorted(value.items(), key=lambda entry: str(entry[0]))
        }
    if isinstance(value, (list, tuple)):
        return [_canonical_value(item) for item in value]
    if isinstance(value, str):
        return value.strip()
    if value is None or isinstance(value, (bool, int, float)):
        return value
    return str(value)


def lead_request_digest(payload: Mapping[str, Any]) -> str:
    """Return a stable digest without storing another copy of visitor data."""
    canonical = json.dumps(
        _canonical_value(payload),
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    ).encode("utf-8")
    return hashlib.sha256(canonical).hexdigest()


def require_matching_request_digest(
    stored_lead: Mapping[str, Any], request_id: str, expected_digest: str
) -> None:
    """Reject a changed payload and legacy replay results that cannot be proved."""
    digests = stored_lead.get("request_payload_digests")
    stored_digest = digests.get(request_id) if isinstance(digests, Mapping) else None
    if not stored_digest:
        raise LeadIdempotencyConflict("Stored request digest is unavailable")
    if not hmac.compare_digest(str(stored_digest), str(expected_digest)):
        raise LeadIdempotencyConflict("Request payload does not match the accepted request")


def iso_timestamp(value: datetime | None = None) -> str:
    current = value or datetime.now(timezone.utc)
    if current.tzinfo is None:
        current = current.replace(tzinfo=timezone.utc)
    return current.astimezone(timezone.utc).isoformat()


async def enqueue_and_confirm_lead_outbox(
    lead_collection,
    outbox_collection,
    lead: Mapping[str, Any],
    request_id: str,
    now: datetime,
    *,
    enqueue: Callable[..., Awaitable[list[dict]]],
) -> list[dict]:
    """Make partial outbox work visible and safely repairable by request replay.

    MongoDB deployments without transaction support cannot atomically commit the
    lead and every outbox job. The pending marker closes the silent-failure gap:
    it is written before enqueue, remains when enqueue fails, and is cleared only
    after every deterministic outbox job can be read back.
    """
    lead_id = str(lead.get("id") or "").strip()
    request_key = str(request_id or "").strip()
    if not lead_id or not request_key:
        raise ValueError("lead id and request id are required for outbox confirmation")
    timestamp = iso_timestamp(now)
    pending_result = await lead_collection.update_one(
        {"id": lead_id},
        {
            "$addToSet": {"outbox_pending_request_ids": request_key},
            "$set": {"updated_at": timestamp},
        },
    )
    if getattr(pending_result, "matched_count", 0) != 1:
        raise RuntimeError("Lead outbox marker could not be persisted")
    jobs = await enqueue(outbox_collection, dict(lead), request_key, now)
    confirmed_result = await lead_collection.update_one(
        {"id": lead_id},
        {
            "$pull": {"outbox_pending_request_ids": request_key},
            "$set": {
                "outbox_last_confirmed_request_id": request_key,
                "outbox_last_confirmed_at": timestamp,
                "updated_at": timestamp,
            },
        },
    )
    if getattr(confirmed_result, "matched_count", 0) != 1:
        raise RuntimeError("Lead outbox confirmation could not be persisted")
    return jobs
