"""Canonical lead lifecycle and explicit human-contact policy.

This module is provider independent. It contains no network calls and does not
read customer data. The existing CRM ``status`` field remains a presentation
and workflow field. Canonical lifecycle and human-contact evidence are stored
separately so an ordinary status or note edit cannot manufacture contact.
"""

from datetime import datetime, timezone
from typing import Any, Dict, Iterable


LIFECYCLE_STATES = (
    "new",
    "acknowledged",
    "contact_attempted",
    "contacted",
    "tour_booked",
    "tour_confirmed",
    "attended",
    "no_show",
    "trial",
    "membership",
    "lost",
    "reactivation_eligible",
)

HUMAN_CONTACT_STATES = ("not_attempted", "attempted", "contacted")
CONTACT_CHANNELS = ("phone", "sms", "email", "in_person")
CONTACT_OUTCOMES = (
    "attempted",
    "no_answer",
    "voicemail",
    "reached",
    "inbound",
)

ALLOWED_TRANSITIONS = {
    "new": {"acknowledged", "contact_attempted", "contacted", "tour_booked", "lost"},
    "acknowledged": {"contact_attempted", "contacted", "tour_booked", "lost"},
    "contact_attempted": {"contacted", "tour_booked", "lost", "reactivation_eligible"},
    "contacted": {"tour_booked", "lost", "reactivation_eligible"},
    "tour_booked": {"tour_confirmed", "attended", "no_show", "lost"},
    "tour_confirmed": {"attended", "no_show", "lost"},
    "attended": {"trial", "membership", "lost"},
    "no_show": {"tour_booked", "reactivation_eligible", "lost"},
    "trial": {"membership", "lost", "reactivation_eligible"},
    "membership": {"reactivation_eligible"},
    "lost": {"reactivation_eligible"},
    "reactivation_eligible": {"contact_attempted", "contacted", "tour_booked", "lost"},
}


class InvalidLifecycleTransition(ValueError):
    """Raised when a requested canonical transition is not permitted."""


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso_timestamp(value: datetime | None = None) -> str:
    current = value or utc_now()
    if current.tzinfo is None:
        current = current.replace(tzinfo=timezone.utc)
    return current.astimezone(timezone.utc).isoformat()


def normalize_lifecycle_state(value: Any, default: str = "new") -> str:
    state = str(value or default).strip().lower()
    if state not in LIFECYCLE_STATES:
        raise ValueError(f"Unknown lifecycle state: {state}")
    return state


def validate_lifecycle_transition(current: Any, target: Any) -> bool:
    current_state = normalize_lifecycle_state(current)
    target_state = normalize_lifecycle_state(target)
    if current_state == target_state:
        return False
    if target_state not in ALLOWED_TRANSITIONS[current_state]:
        raise InvalidLifecycleTransition(
            f"Lifecycle transition {current_state} -> {target_state} is not allowed"
        )
    return True


def lifecycle_event(
    *,
    event_id: str,
    lead_id: str,
    current_state: Any,
    target_state: Any,
    actor_id: str,
    actor_name: str,
    reason: str = "",
    occurred_at: datetime | None = None,
) -> Dict[str, Any]:
    changed = validate_lifecycle_transition(current_state, target_state)
    timestamp = iso_timestamp(occurred_at)
    return {
        "event_id": event_id,
        "lead_id": lead_id,
        "from_state": normalize_lifecycle_state(current_state),
        "to_state": normalize_lifecycle_state(target_state),
        "changed": changed,
        "reason": str(reason or "").strip()[:500],
        "actor_id": actor_id,
        "actor_name": str(actor_name or "").strip()[:160],
        "occurred_at": timestamp,
        "created_at": timestamp,
    }


def _require_member(value: Any, allowed: Iterable[str], label: str) -> str:
    normalized = str(value or "").strip().lower()
    if normalized not in allowed:
        raise ValueError(f"Unknown {label}: {normalized}")
    return normalized


def human_contact_event(
    *,
    event_id: str,
    lead_id: str,
    current_state: Any,
    channel: Any,
    outcome: Any,
    actor_id: str,
    actor_name: str,
    note: str = "",
    occurred_at: datetime | None = None,
) -> Dict[str, Any]:
    contact_state = _require_member(
        current_state or "not_attempted", HUMAN_CONTACT_STATES, "human contact state"
    )
    normalized_channel = _require_member(channel, CONTACT_CHANNELS, "contact channel")
    normalized_outcome = _require_member(outcome, CONTACT_OUTCOMES, "contact outcome")
    reached = normalized_outcome in {"reached", "inbound"}
    next_state = "contacted" if reached else "attempted"
    if contact_state == "contacted":
        next_state = "contacted"
    timestamp = iso_timestamp(occurred_at)
    return {
        "event_id": event_id,
        "lead_id": lead_id,
        "from_state": contact_state,
        "to_state": next_state,
        "channel": normalized_channel,
        "outcome": normalized_outcome,
        "reached": reached,
        "note": str(note or "").strip()[:500],
        "actor_id": actor_id,
        "actor_name": str(actor_name or "").strip()[:160],
        "occurred_at": timestamp,
        "created_at": timestamp,
    }


def new_lead_lifecycle_fields(created_at: datetime | None = None) -> Dict[str, Any]:
    timestamp = iso_timestamp(created_at)
    return {
        "lifecycle_state": "new",
        "lifecycle_state_changed_at": timestamp,
        "human_contact_state": "not_attempted",
        "human_contact_event_count": 0,
        "last_contact_attempt_at": None,
        "last_human_contact_at": None,
    }
