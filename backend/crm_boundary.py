"""CRM boundary. Records intended writes. Cannot perform them.

The gym intends to migrate to GymMaster. As of this commit no credentials and no
sandbox exist, and the GymMaster account itself is empty: zero members, no active
membership types, no configured billing provider, no custom lead fields. So the
integration remains unbuilt, but the vendor's public documentation has now been
read, and the parts of the contract it actually settles are recorded below with
their citations instead of being left as blanket unknowns.

Two deliberate constraints:

1. There is no HTTP client in this file, and nothing imports one. A flag can be
   flipped by accident; a class with no network capability cannot send. That is
   the boundary, not the flag. The module that does carry an HTTP client is
   gymmaster_adapter, kept separate for exactly this reason.

2. Nothing here guesses vendor field names. Every GymMaster field name in
   GYMMASTER_PROSPECT_FIELDS carries the URL it was read from. Anything the
   documentation does not settle stays in CRM_CONTRACT_UNVERIFIED rather than
   being filled in with a plausible looking key.

The outbox already gives this boundary atomic claiming, leasing, bounded retry,
quarantine on unknown outcome and gated replay. A CRM adapter is one more
channel behind that machinery, which is why the outbox was made provider generic
first. That sequencing was correct and is the reason this ticket is small.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Mapping, Optional


# Read from official GymMaster documentation on 2026-08-07. Recorded as source
# URLs rather than prose so a later reader can re-check the claim instead of
# trusting this file.
GYMMASTER_DOC_PORTAL_API = "https://www.gymmaster.com/gymmaster-api/"
GYMMASTER_DOC_GATEKEEPER_API = "https://www.gymmaster.com/gymmaster-gatekeeper-api/"

# What the documentation does settle. Kept next to the unknowns so the two are
# read together and neither can quietly grow at the other's expense.
CRM_CONTRACT_VERIFIED = (
    (
        "prospect creation endpoint: POST /portal/api/v1/prospect/create, "
        "multipart/form-data",
        GYMMASTER_DOC_PORTAL_API,
    ),
    (
        "required prospect fields: api_key, firstname, surname, email, companyid",
        GYMMASTER_DOC_PORTAL_API,
    ),
    (
        "host format: https://<sitename>.gymmasteronline.com, and the API key is "
        "issued per site from Settings > Integrations",
        GYMMASTER_DOC_GATEKEEPER_API,
    ),
    (
        "authentication: an api_key parameter on the portal API; a login returns a "
        "token whose lifespan in seconds is returned with it, generally 1 hour",
        GYMMASTER_DOC_PORTAL_API,
    ),
)

# Every item here is still a question that must be answered against the vendor,
# a sandbox, or the gym's own account. Anything asserted about the vendor without
# a citation is a blocker, not a design decision.
#
# The first three used to be unknowns and are now in CRM_CONTRACT_VERIFIED. What
# is left is not paperwork. Items two and three are the reason this integration
# cannot be trusted to deduplicate itself, which is why RecordingCrmAdapter now
# takes a durable journal instead of a set in memory.
CRM_CONTRACT_UNVERIFIED = (
    "the gym's own GymMaster sitename and companyid, neither of which is public",
    "the match rule behind 'will update an existing prospect if the details match'",
    "no idempotency key parameter is documented on prospect/create",
    "the response shape, including whether an updated duplicate returns its id",
    "rate limits and their retry semantics, documented nowhere public",
    "where lead source and UTM data belong: the account has no custom lead fields",
    "which system owns the member record while both run in parallel",
)

# Mapping from this project's neutral prospect vocabulary onto GymMaster's
# documented parameter names. Each entry carries the URL it was read from,
# because a field name without a citation is a guess wearing a costume.
#
# `source` is deliberately absent. The documented parameter list has no lead
# source or UTM field, and the read-only account audit found custom lead fields
# empty, so there is nowhere verified to put it. It travels in `notes` where a
# human can at least see it, and the real home stays an open question above.
GYMMASTER_PROSPECT_FIELDS = {
    "first_name": ("firstname", "Firstname of the new prospect", GYMMASTER_DOC_PORTAL_API),
    "last_name": ("surname", "Surname of the new prospect", GYMMASTER_DOC_PORTAL_API),
    "email": ("email", "Email of the new prospect", GYMMASTER_DOC_PORTAL_API),
    "phone": ("phonecell", "Cellphone number of the new prospect", GYMMASTER_DOC_PORTAL_API),
    "company_id": ("companyid", "Club the prospect is joining", GYMMASTER_DOC_PORTAL_API),
    "notes": ("notes", "Any additional information about the prospect", GYMMASTER_DOC_PORTAL_API),
}

GYMMASTER_PROSPECT_REQUIRED = ("api_key", "firstname", "surname", "email", "companyid")
GYMMASTER_PROSPECT_PATH = "/portal/api/v1/prospect/create"

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
        # Carried apart as well as joined. GymMaster requires firstname and
        # surname as two separate required parameters, so a payload that only
        # holds the joined name cannot be mapped onto it without splitting a
        # human name back up, which is guesswork for anyone whose name does not
        # happen to be two words.
        "first_name": str(lead.get("first_name") or "").strip()[:80],
        "last_name": str(lead.get("last_name") or "").strip()[:80],
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


def build_gymmaster_prospect_fields(
    payload: Mapping[str, Any],
    *,
    company_id: str,
) -> dict[str, str]:
    """Translate the neutral prospect payload into GymMaster's documented names.

    Separate from build_prospect_payload on purpose. The neutral shape is what
    this project stores and replays; this is the vendor's shape, and keeping the
    translation in one small function means there is exactly one place to fix
    when the documentation turns out to be incomplete.

    Only documented parameters are emitted. `api_key` is not added here because
    a credential does not belong in a mapping function that anything may call
    and log; the adapter attaches it at the moment of the request.
    """
    lead_source = str(payload.get("source") or "").strip()
    interest = str(payload.get("interest") or "").strip()
    consent = payload.get("consent") or {}

    # Everything below goes into `notes` because GymMaster documents no field
    # for lead source, campaign or consent, and the gym's account has no custom
    # lead fields defined. Losing it silently would be worse than parking it in
    # free text, but free text is not a real home and is recorded as an open
    # contract item, not a solution.
    note_lines = [
        f"Lead ID: {payload.get('lead_id') or 'unknown'}",
        f"Source: {lead_source or 'unknown'}",
        f"Interest: {interest or 'unspecified'}",
        f"Email opt in: {bool(consent.get('email_operational_opt_in'))}",
        f"SMS opt in: {bool(consent.get('sms_operational_opt_in'))}",
        f"Idempotency key: {payload.get('idempotency_key') or ''}",
    ]

    fields = {
        "firstname": str(payload.get("first_name") or "").strip(),
        "surname": str(payload.get("last_name") or "").strip(),
        "email": str(payload.get("email") or "").strip().lower(),
        "companyid": str(company_id or "").strip(),
        "notes": "\n".join(note_lines),
    }
    phone = str(payload.get("phone") or "").strip()
    if phone:
        fields["phonecell"] = phone
    return fields


@dataclass
class RecordedCrmWrite:
    idempotency_key: str
    lead_id: Optional[str]
    payload: dict[str, Any]


class CrmJournalMissing(RuntimeError):
    """Raised when a durable once-only record cannot be established."""


async def claim_prospect_write(journal, key: str, record_id: str) -> Optional[str]:
    """Claim the right to write this prospect exactly once, durably.

    The claim lives on the outbox document, which is the only record that
    already survives a restart and is already keyed by the delivery key. Nothing
    new is introduced to keep in sync with it.

    Returns None when this caller won the claim and should perform the write,
    or the previously stored record id when the prospect was already written.
    Raises CrmJournalMissing when there is no outbox document to claim against,
    because a write with no durable place to record itself cannot be once-only
    and must not be attempted.

    The conditional update is what actually provides the guarantee. The read
    before it is only a fast path: two workers can both pass the read, and the
    filter on a null marker means exactly one of them modifies the document.
    """
    existing = await journal.find_one({"idempotency_key": key}, {"_id": 0})
    if existing is None:
        raise CrmJournalMissing(
            f"No outbox document for delivery key {key!r}. A CRM write cannot be "
            "made once-only without one."
        )
    already = existing.get("crm_prospect_record_id")
    if already:
        return str(already)

    # In MongoDB a filter of None matches both a null field and an absent one,
    # so this claims the marker whether or not the document predates it.
    result = await journal.update_one(
        {"idempotency_key": key, "crm_prospect_record_id": None},
        {"$set": {"crm_prospect_record_id": record_id}},
    )
    if getattr(result, "modified_count", 0) == 0:
        # Lost the race. Re-read rather than assume our own id was stored.
        current = await journal.find_one({"idempotency_key": key}, {"_id": 0})
        return str((current or {}).get("crm_prospect_record_id") or record_id)
    return None


async def release_prospect_claim(journal, key: str, record_id: str) -> None:
    """Release a claim when the vendor definitively did not create anything.

    Claiming before the request is what stops a duplicate, but it leaves a
    matching hazard: a request the vendor rejected outright still holds a claim,
    so every later retry would see it, report a duplicate and quietly never
    create the prospect. The lead would be lost with a success in the log.

    Only call this when the outcome is known negative, meaning the vendor
    answered and refused. An unknown outcome, a timeout or a server error must
    keep its claim, because the alternative is creating a second prospect for a
    write that may well have landed.

    The record_id filter means a release can never clear someone else's claim.
    """
    await journal.update_one(
        {"idempotency_key": key, "crm_prospect_record_id": record_id},
        {"$set": {"crm_prospect_record_id": None}},
    )


async def confirm_prospect_claim(journal, key: str, record_id: str) -> None:
    """Replace a provisional claim with the real vendor identifier."""
    await journal.update_one(
        {"idempotency_key": key},
        {"$set": {"crm_prospect_record_id": record_id}},
    )


@dataclass
class RecordingCrmAdapter:
    """Satisfies the delivery adapter protocol by recording, never sending.

    Returns a receipt whose identifier is prefixed so a recorded write can never
    be mistaken for a real provider identifier in logs or in the outbox.

    Pass `journal` to get durable once-only behaviour. It is the outbox
    collection, and the claim is written onto the outbox document itself.
    """

    # `journal` is the outbox collection. When it is present, deduplication is
    # keyed off the outbox document and therefore survives a process restart,
    # which is what an operator replaying a quarantined job after a restart
    # actually needs.
    journal: Any = None

    # KNOWN LIMIT, and the reason `journal` exists. These two are process
    # memory: the adapter is built once at startup and reused, so they are empty
    # again after a restart. Without a journal the exactly-once claim holds
    # within a process and not across one, so a replayed job would record the
    # prospect a second time. This path is retained only for tests and for the
    # current default wiring, which passes no journal. It must not be the path
    # in use when this channel is pointed at a real CRM.
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

        record_id = f"recorded:{key}"
        if self.journal is not None:
            try:
                already = await claim_prospect_write(self.journal, key, record_id)
            except CrmJournalMissing as exc:
                raise DeliveryError(
                    "crm_journal_missing", str(exc), retryable=False
                ) from exc
            if already:
                return ProviderReceipt(provider_message_id=f"recorded-duplicate:{key}")
        elif key in self.seen_keys:
            # Local stand in for vendor side deduplication, which is unverified.
            # See the known limit above: this branch does not survive a restart.
            return ProviderReceipt(provider_message_id=f"recorded-duplicate:{key}")

        self.seen_keys.add(key)
        self.writes.append(RecordedCrmWrite(
            idempotency_key=key,
            lead_id=payload.get("lead_id"),
            payload=payload,
        ))
        return ProviderReceipt(provider_message_id=record_id)


def live_crm_adapter(*_args: Any, **_kwargs: Any):
    """No live adapter is reachable from here, and calling this says why.

    gymmaster_adapter now holds a real implementation, but it is not returned
    from this module. Reaching it requires importing it deliberately and setting
    an explicit flag, and it still cannot be configured because the items below
    are unanswered. Keeping this function refusing means the recording boundary
    has no path to the network even by accident.
    """
    raise CrmContractUnverified(
        "No live CRM adapter is available from the recording boundary. The vendor "
        "contract is unverified: " + "; ".join(CRM_CONTRACT_UNVERIFIED)
    )
