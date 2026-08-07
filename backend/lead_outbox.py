"""Durable, provider-independent lead outbox.

The outbox stores intent only. It never imports or calls Resend, Twilio,
MailerSend, GymMaster, analytics, or any other external provider.
"""

import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Iterable, Optional

try:
    from pymongo.errors import DuplicateKeyError
except ImportError:  # Unit policy tests run without the production database driver.
    class DuplicateKeyError(Exception):
        pass


RETURN_AFTER = True


PENDING = "pending"
PROCESSING = "processing"
RETRY_SCHEDULED = "retry_scheduled"
SUCCEEDED = "succeeded"
TERMINAL_FAILED = "terminal_failed"
OUTBOX_STATUSES = (PENDING, PROCESSING, RETRY_SCHEDULED, SUCCEEDED, TERMINAL_FAILED)


class QuarantinedReplayRefused(Exception):
    """Raised when an operator replays a job whose provider outcome is unknown."""


def redact_error_message(value: Any) -> str:
    """Return an operator-useful error without storing contact data or secrets."""
    text = str(value or "").strip()
    text = re.sub(r"[^\s@]+@[^\s@]+", "[redacted-email]", text)
    text = re.sub(r"(?<!\w)\+?\d[\d\s().-]{7,}\d(?!\w)", "[redacted-phone]", text)
    text = re.sub(
        r"(?i)\b(api[-_ ]?key|authorization|bearer|token|secret|password)\b\s*[:=]\s*[^\s,;]+",
        r"\1=[redacted-secret]",
        text,
    )
    return text[:500]


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso_timestamp(value: datetime | None = None) -> str:
    current = value or utc_now()
    if current.tzinfo is None:
        current = current.replace(tzinfo=timezone.utc)
    return current.astimezone(timezone.utc).isoformat()


def _clean_payload(value: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not isinstance(value, dict):
        return {}
    allowed = {
        "brand_id",
        "location_id",
        "lead_id",
        "request_id",
        "template_key",
        "audience",
        "message_kind",
        "source_event",
    }
    cleaned: Dict[str, Any] = {}
    for key in allowed:
        item = value.get(key)
        if item is None or isinstance(item, (bool, int, float)):
            cleaned[key] = item
        elif isinstance(item, str):
            cleaned[key] = item.strip()[:500]
    return cleaned


def retry_delay_seconds(attempt_count: int, base_seconds: int = 30, cap_seconds: int = 3600) -> int:
    exponent = max(0, int(attempt_count) - 1)
    return min(max(1, int(base_seconds)) * (2 ** exponent), max(1, int(cap_seconds)))


async def enqueue_outbox_job(
    collection,
    *,
    idempotency_key: str,
    lead_id: str,
    event_type: str,
    channel: str,
    payload: Optional[Dict[str, Any]] = None,
    max_attempts: int = 5,
    available_at: datetime | None = None,
    created_at: datetime | None = None,
) -> Dict[str, Any]:
    key = str(idempotency_key or "").strip()
    if not key or len(key) > 500:
        raise ValueError("idempotency_key must contain 1 to 500 characters")
    if not lead_id:
        raise ValueError("lead_id is required")
    if max_attempts < 1 or max_attempts > 20:
        raise ValueError("max_attempts must be between 1 and 20")

    now = created_at or utc_now()
    now_iso = iso_timestamp(now)
    available_iso = iso_timestamp(available_at or now)
    job = {
        "id": str(uuid.uuid4()),
        "idempotency_key": key,
        "delivery_key": key,
        "lead_id": lead_id,
        "event_type": str(event_type or "").strip()[:160],
        "channel": str(channel or "").strip().lower()[:40],
        "payload": _clean_payload(payload),
        "status": PENDING,
        "attempt_count": 0,
        "total_attempt_count": 0,
        "max_attempts": int(max_attempts),
        "available_at": available_iso,
        "locked_by": None,
        "locked_until": None,
        "delivery_reservation_token": None,
        "delivery_begun_at": None,
        "delivery_state": "not_started",
        "last_error_code": None,
        "last_error_message": None,
        "last_failed_at": None,
        "terminal_failure_at": None,
        "succeeded_at": None,
        "provider_message_id": None,
        "replay_count": 0,
        "replay_history": [],
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    try:
        await collection.update_one(
            {"idempotency_key": key},
            {"$setOnInsert": job},
            upsert=True,
        )
    except DuplicateKeyError:
        pass
    stored = await collection.find_one({"idempotency_key": key}, {"_id": 0})
    if not stored:
        raise RuntimeError("Outbox enqueue could not be confirmed")
    return stored


async def enqueue_lead_received_jobs(
    collection,
    lead: Dict[str, Any],
    request_id: str,
    now: datetime | None = None,
) -> list[Dict[str, Any]]:
    lead_id = str(lead.get("id") or "").strip()
    if not lead_id:
        raise ValueError("lead id is required before outbox enqueue")
    event_key = str(request_id or "").strip()
    if not event_key:
        raise ValueError("request id is required before outbox enqueue")

    common = {
        "brand_id": lead.get("brand_id") or "santa_cruz_strength",
        "location_id": lead.get("location_id") or "santa_cruz_ca",
        "lead_id": lead_id,
        "request_id": event_key,
        "source_event": "lead_received",
    }
    definitions = [
        ("email", "lead", "lead_received", "transactional"),
        ("email", "staff", "new_lead_alert", "internal"),
    ]
    if lead.get("sms_operational_opt_in") is True and lead.get("sms_opted_out") is not True:
        definitions.append(("sms", "lead", "lead_received", "operational"))

    jobs = []
    for channel, audience, template_key, message_kind in definitions:
        payload = {
            **common,
            "template_key": template_key,
            "audience": audience,
            "message_kind": message_kind,
        }
        jobs.append(
            await enqueue_outbox_job(
                collection,
                idempotency_key=(
                    f"santa_cruz_strength:{event_key}:{channel}:{audience}:{template_key}"
                ),
                lead_id=lead_id,
                event_type="lead.acknowledgement.requested" if audience == "lead" else "lead.staff_alert.requested",
                channel=channel,
                payload=payload,
                created_at=now,
            )
        )
    return jobs


async def claim_due_job(
    collection,
    *,
    worker_id: str,
    now: datetime | None = None,
    lease_seconds: int = 60,
) -> Optional[Dict[str, Any]]:
    if not str(worker_id or "").strip():
        raise ValueError("worker_id is required")
    current = now or utc_now()
    now_iso = iso_timestamp(current)
    locked_until = iso_timestamp(current + timedelta(seconds=max(1, int(lease_seconds))))
    reservation_token = str(uuid.uuid4())

    # Once a provider call begins, an expired lease cannot prove whether the
    # provider accepted the message. Quarantine that job before selecting more
    # work so a second worker can never send it automatically.
    await quarantine_expired_delivery_begun_job(collection, now=current)

    # A worker can disappear after claiming its final permitted attempt. Move
    # that expired job to an operator-visible terminal state before selecting
    # more work. The claim query below independently enforces the same attempt
    # boundary, so concurrent workers cannot reclaim an exhausted job between
    # recovery and claim.
    await terminalize_expired_exhausted_job(collection, now=current)

    return await collection.find_one_and_update(
        {
            "status": {"$in": [PENDING, RETRY_SCHEDULED, PROCESSING]},
            "available_at": {"$lte": now_iso},
            "delivery_begun_at": None,
            "$expr": {
                "$lt": [
                    {"$ifNull": ["$attempt_count", 0]},
                    {"$ifNull": ["$max_attempts", 1]},
                ]
            },
            "$or": [
                {"locked_until": None},
                {"locked_until": {"$lte": now_iso}},
                {"locked_until": {"$exists": False}},
            ],
        },
        {
            "$set": {
                "status": PROCESSING,
                "locked_by": worker_id,
                "locked_until": locked_until,
                "delivery_reservation_token": reservation_token,
                "delivery_state": "reserved",
                "updated_at": now_iso,
            },
            "$inc": {"attempt_count": 1, "total_attempt_count": 1},
        },
        sort=[("available_at", 1), ("created_at", 1)],
        return_document=RETURN_AFTER,
        projection={"_id": 0},
    )


async def mark_delivery_begun(
    collection,
    *,
    job_id: str,
    worker_id: str,
    reservation_token: str,
    now: datetime | None = None,
) -> Optional[Dict[str, Any]]:
    """Atomically cross the provider-send boundary for the current attempt."""
    timestamp = iso_timestamp(now)
    return await collection.find_one_and_update(
        {
            "id": job_id,
            "status": PROCESSING,
            "locked_by": worker_id,
            "locked_until": {"$gt": timestamp},
            "delivery_reservation_token": reservation_token,
            "delivery_begun_at": None,
        },
        {
            "$set": {
                "delivery_begun_at": timestamp,
                "delivery_state": "begun",
                "updated_at": timestamp,
            }
        },
        return_document=RETURN_AFTER,
        projection={"_id": 0},
    )


async def quarantine_expired_delivery_begun_job(
    collection,
    *,
    now: datetime | None = None,
) -> Optional[Dict[str, Any]]:
    """Quarantine an ambiguous provider attempt instead of auto-retrying it."""
    timestamp = iso_timestamp(now)
    return await collection.find_one_and_update(
        {
            "status": PROCESSING,
            "delivery_state": "begun",
            "locked_until": {"$lte": timestamp},
        },
        {
            "$set": {
                "status": TERMINAL_FAILED,
                "locked_by": None,
                "locked_until": None,
                "delivery_state": "quarantined",
                "last_error_code": "delivery_outcome_unknown_after_lease_expiry",
                "last_error_message": (
                    "Provider delivery began but the worker lease expired before "
                    "the outcome was committed; manual reconciliation is required"
                ),
                "last_failed_at": timestamp,
                "terminal_failure_at": timestamp,
                "updated_at": timestamp,
            }
        },
        sort=[("available_at", 1), ("created_at", 1)],
        return_document=RETURN_AFTER,
        projection={"_id": 0},
    )


async def terminalize_expired_exhausted_job(
    collection,
    *,
    now: datetime | None = None,
) -> Optional[Dict[str, Any]]:
    """Make an exhausted, unlocked delivery visible for explicit replay.

    This recovery path performs no provider call. It closes the crash window
    where a worker consumed the final attempt but never reported success or
    failure before its lease expired.
    """
    current = now or utc_now()
    timestamp = iso_timestamp(current)
    return await collection.find_one_and_update(
        {
            "status": {"$in": [PENDING, RETRY_SCHEDULED, PROCESSING]},
            "available_at": {"$lte": timestamp},
            "delivery_begun_at": None,
            "$expr": {
                "$gte": [
                    {"$ifNull": ["$attempt_count", 0]},
                    {"$ifNull": ["$max_attempts", 1]},
                ]
            },
            "$or": [
                {"locked_until": None},
                {"locked_until": {"$lte": timestamp}},
                {"locked_until": {"$exists": False}},
            ],
        },
        {
            "$set": {
                "status": TERMINAL_FAILED,
                "locked_by": None,
                "locked_until": None,
                "last_error_code": "attempts_exhausted_before_claim",
                "last_error_message": (
                    "Delivery attempt budget was exhausted before a worker "
                    "could record a terminal outcome"
                ),
                "last_failed_at": timestamp,
                "terminal_failure_at": timestamp,
                "delivery_state": "terminal",
                "updated_at": timestamp,
            }
        },
        sort=[("available_at", 1), ("created_at", 1)],
        return_document=RETURN_AFTER,
        projection={"_id": 0},
    )


async def mark_job_succeeded(
    collection,
    *,
    job_id: str,
    worker_id: str,
    reservation_token: str,
    provider_message_id: str = "",
    now: datetime | None = None,
) -> Optional[Dict[str, Any]]:
    timestamp = iso_timestamp(now)
    return await collection.find_one_and_update(
        {
            "id": job_id,
            "status": PROCESSING,
            "locked_by": worker_id,
            "locked_until": {"$gt": timestamp},
            "delivery_reservation_token": reservation_token,
            "delivery_state": "begun",
        },
        {
            "$set": {
                "status": SUCCEEDED,
                "succeeded_at": timestamp,
                "provider_message_id": str(provider_message_id or "").strip()[:200] or None,
                "delivery_state": "completed",
                "locked_by": None,
                "locked_until": None,
                "last_error_code": None,
                "last_error_message": None,
                "updated_at": timestamp,
            }
        },
        return_document=RETURN_AFTER,
        projection={"_id": 0},
    )


async def mark_job_failed(
    collection,
    *,
    job_id: str,
    worker_id: str,
    reservation_token: str,
    error_code: str,
    error_message: str,
    retryable: bool,
    now: datetime | None = None,
) -> Optional[Dict[str, Any]]:
    current = now or utc_now()
    job = await collection.find_one(
        {
            "id": job_id,
            "status": PROCESSING,
            "locked_by": worker_id,
            "locked_until": {"$gt": iso_timestamp(current)},
            "delivery_reservation_token": reservation_token,
        },
        {"_id": 0},
    )
    if not job:
        return None
    attempt_count = int(job.get("attempt_count", 0))
    max_attempts = int(job.get("max_attempts", 1))
    terminal = not retryable or attempt_count >= max_attempts
    timestamp = iso_timestamp(current)
    update = {
        "status": TERMINAL_FAILED if terminal else RETRY_SCHEDULED,
        "locked_by": None,
        "locked_until": None,
        "last_error_code": str(error_code or "unknown_error").strip()[:120],
        "last_error_message": redact_error_message(error_message),
        "last_failed_at": timestamp,
        "terminal_failure_at": timestamp if terminal else None,
        "delivery_state": "terminal" if terminal else "not_started",
        "delivery_begun_at": job.get("delivery_begun_at") if terminal else None,
        "updated_at": timestamp,
    }
    if not terminal:
        delay = retry_delay_seconds(attempt_count)
        update["available_at"] = iso_timestamp(current + timedelta(seconds=delay))
    return await collection.find_one_and_update(
        {
            "id": job_id,
            "status": PROCESSING,
            "locked_by": worker_id,
            "locked_until": {"$gt": timestamp},
            "delivery_reservation_token": reservation_token,
        },
        {"$set": update},
        return_document=RETURN_AFTER,
        projection={"_id": 0},
    )


async def defer_claimed_job(
    collection,
    *,
    job_id: str,
    worker_id: str,
    reservation_token: str,
    available_at: datetime,
    reason_code: str,
    now: datetime | None = None,
) -> Optional[Dict[str, Any]]:
    """Release a valid lease without consuming a delivery attempt.

    Policy deferrals such as quiet hours are not provider attempts. The total
    claim counter remains monotonic for operations visibility, while the retry
    attempt counter is restored so a quiet-hour deferral cannot exhaust retries.
    """
    current = now or utc_now()
    timestamp = iso_timestamp(current)
    return await collection.find_one_and_update(
        {
            "id": job_id,
            "status": PROCESSING,
            "locked_by": worker_id,
            "locked_until": {"$gt": timestamp},
            "delivery_reservation_token": reservation_token,
            "delivery_begun_at": None,
        },
        {
            "$set": {
                "status": RETRY_SCHEDULED,
                "available_at": iso_timestamp(available_at),
                "locked_by": None,
                "locked_until": None,
                "last_error_code": str(reason_code or "policy_deferred").strip()[:120],
                "last_error_message": None,
                "delivery_state": "not_started",
                "updated_at": timestamp,
            },
            "$inc": {"attempt_count": -1},
        },
        return_document=RETURN_AFTER,
        projection={"_id": 0},
    )


async def replay_terminal_failure(
    collection,
    *,
    job_id: str,
    actor_id: str,
    reason: str,
    confirmed_not_sent: bool = False,
    now: datetime | None = None,
) -> Optional[Dict[str, Any]]:
    clean_reason = str(reason or "").strip()
    if not clean_reason:
        raise ValueError("A replay reason is required")
    timestamp = iso_timestamp(now)
    terminal_job = await collection.find_one(
        {"id": job_id, "status": TERMINAL_FAILED}, {"_id": 0}
    )
    if not terminal_job:
        return None

    # A quarantined job is one whose provider outcome is genuinely unknown: the
    # call began and the lease expired before we learned the result. Email is
    # safe to replay because the Resend adapter sends an Idempotency-Key, but
    # Twilio's API accepts no such key, so replaying an SMS whose original send
    # actually succeeded delivers a second real message to a member's phone.
    # Require the operator to confirm against the provider log first.
    if terminal_job.get("delivery_state") == "quarantined" and not confirmed_not_sent:
        raise QuarantinedReplayRefused(
            "Provider outcome is unknown for this job. Confirm in the provider "
            "log that no message was delivered, then replay with "
            "confirmed_not_sent."
        )
    history_entry = {
        "actor_id": str(actor_id or "").strip()[:160],
        "reason": clean_reason[:500],
        "requested_at": timestamp,
        "attempt_count": int(terminal_job.get("attempt_count", 0)),
        "error_code": terminal_job.get("last_error_code"),
    }
    return await collection.find_one_and_update(
        {"id": job_id, "status": TERMINAL_FAILED},
        {
            "$set": {
                "status": RETRY_SCHEDULED,
                "attempt_count": 0,
                "available_at": timestamp,
                "locked_by": None,
                "locked_until": None,
                "delivery_reservation_token": None,
                "delivery_begun_at": None,
                "delivery_state": "not_started",
                "terminal_failure_at": None,
                "updated_at": timestamp,
            },
            "$inc": {"replay_count": 1},
            "$push": {"replay_history": history_entry},
        },
        return_document=RETURN_AFTER,
        projection={"_id": 0},
    )
