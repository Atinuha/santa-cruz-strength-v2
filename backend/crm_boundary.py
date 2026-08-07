"""CRM boundary. Records intended writes. Cannot perform them.

The gym intends to migrate to GymMaster. As of this commit that integration does
not exist: no credentials, no sandbox, no confirmed schema. Everything about the
vendor's API is therefore unverified, and this module is written so that being
wrong about it is harmless.

Two deliberate constraints:

1. There is no HTTP client in this file, and nothing imports one. A flag can be
   flipped by accident; a class with no network capability cannot send. That is
   the boundary, not the flag.

2. Nothing here guesses vendor field names. The payload is expressed in this
   project's own vocabulary. Translating it into whatever GymMaster actually
   expects is a separate step that must happen against real documentation, and
   the unknowns are enumerated below rather than papered over with plausible
   looking keys.

The outbox already gives this boundary atomic claiming, leasing, bounded retry,
quarantine on unknown outcome and gated replay. A CRM adapter is one more
channel behind that machinery, which is why the outbox was made provider generic
first. That sequencing was correct and is the reason this ticket is small.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Mapping, Optional


# Every item here is a question that must be answered against official vendor
# documentation or a sandbox. Anything asserted about the vendor without a
# citation is a blocker, not a design decision.
CRM_CONTRACT_UNVERIFIED = (
    "base URL and API version",
    "authentication scheme and credential format",
    "prospect creation endpoint and its required fields",
    "exact field names and types for name, email, phone and source",
    "whether prospect creation is idempotent, and on which key",
    "how the vendor reports a duplicate: error, or the existing record",
    "rate limits and their retry semantics",
    "which system owns the member record while both run in parallel",
)

# Ownership rule for the dual running period. Stated here because an integration
# without one produces two systems that each believe they are authoritative.
#
#   The incumbent membership provider owns the membership transaction, billing
#   and the member record. The CRM owns prospect and lifecycle state only. This
#   boundary must not move without an explicit, dated decision, because moving
#   it silently is how a member ends up billed twice or not at all.
MEMBERSHIP_RECORD_OWNER = "abc_fitness"
PROSPECT_RECORD_OWNER = "gymmaster"


class CrmContractUnverified(RuntimeError):
    """Raised when something tries to perform a real CRM write."""


def build_prospect_payload(lead: Mapping[str, Any], *, delivery_key: str) -> dict[str, Any]:
    """Map a lead onto a neutral prospect shape in this project's vocabulary.

    Deliberately not the vendor's shape. Inventing their field names would make
    this look finished while guaranteeing it is wrong, and the guess would be
    invisible once it was buried in a request body.

    `delivery_key` is the idempotency key. A retried outbox job must never
    create a second prospect, so whatever the vendor offers for deduplication
    has to be driven from this value. If the vendor offers nothing, this key
    must be stored on our side and checked before every create.
    """
    name = " ".join(
        part for part in (
            str(lead.get("first_name") or "").strip(),
            str(lead.get("last_name") or "").strip(),
        ) if part
    )[:160]
    return {
        "idempotency_key": delivery_key,
        "lead_id": lead.get("id"),
        "name": name,
        "email": str(lead.get("email") or "").strip().lower(),
        "phone": str(lead.get("phone") or "").strip(),
        "interest": str(lead.get("interest_type") or "").strip(),
        "source": str(lead.get("lead_source") or "").strip(),
        "consent": {
            "email_operational_opt_in": lead.get("email_operational_opt_in") is True,
            "sms_operational_opt_in": lead.get("sms_operational_opt_in") is True,
        },
        "record_ownership": {
            "membership": MEMBERSHIP_RECORD_OWNER,
            "prospect": PROSPECT_RECORD_OWNER,
        },
        "contract_status": "unverified",
    }


@dataclass
class RecordedCrmWrite:
    idempotency_key: str
    lead_id: Optional[str]
    payload: dict[str, Any]


@dataclass
class RecordingCrmAdapter:
    """Satisfies the delivery adapter protocol by recording, never sending.

    Returns a receipt whose identifier is prefixed so a recorded write can never
    be mistaken for a real provider identifier in logs or in the outbox.
    """

    writes: list[RecordedCrmWrite] = field(default_factory=list)
    seen_keys: set[str] = field(default_factory=set)

    async def send(self, message: Any) -> Any:
        from provider_dispatch import DeliveryError, ProviderReceipt

        key = getattr(message, "idempotency_key", "") or ""
        if not key:
            raise DeliveryError(
                "crm_missing_idempotency_key",
                "A CRM write without an idempotency key could create a duplicate prospect",
                retryable=False,
            )
        try:
            payload = json.loads(getattr(message, "text_body", "") or "{}")
        except json.JSONDecodeError:
            raise DeliveryError("crm_payload_invalid", "CRM payload was not valid JSON", retryable=False)

        # Local stand in for vendor side deduplication, which is unverified.
        # A replayed job records once, exactly as a correct integration must
        # create one prospect.
        if key in self.seen_keys:
            return ProviderReceipt(provider_message_id=f"recorded-duplicate:{key}")

        self.seen_keys.add(key)
        self.writes.append(RecordedCrmWrite(
            idempotency_key=key,
            lead_id=payload.get("lead_id"),
            payload=payload,
        ))
        return ProviderReceipt(provider_message_id=f"recorded:{key}")


def live_crm_adapter(*_args: Any, **_kwargs: Any):
    """There is no live adapter, and calling this says why rather than failing oddly."""
    raise CrmContractUnverified(
        "No live CRM adapter exists. The vendor contract is unverified: "
        + "; ".join(CRM_CONTRACT_UNVERIFIED)
    )
