"""GymMaster prospect adapter. Off unless explicitly enabled, and unbuilt in practice.

This is the only module in the CRM lane that can reach the network. crm_boundary
deliberately has no HTTP client so that its recording path is incapable of a call
regardless of configuration; putting the client here keeps that property true
while still letting a real integration exist in reviewable form.

Nothing about this module is live. It refuses to construct unless
ALLOW_GYMMASTER_PROSPECT_WRITES is explicitly set, refuses to construct without a
durable journal, and refuses to send when any credential is missing. Those are
three separate refusals on purpose: a single flag is one typo away from a real
write into a real gym's CRM.

Why the journal is mandatory rather than optional. GymMaster documents no
idempotency key on prospect creation. It says only that it "will update an
existing prospect if the details match", and it does not document the match rule
or the response shape. That is not something an outbox can be replayed against
safely, so once-only has to be established on our side, before the request, on a
record that survives a restart. See crm_boundary.claim_prospect_write.

Field names and the endpoint path are read from official documentation and cited
in crm_boundary. Nothing here invents a parameter name.

Known blocker, not solvable in code: the gym's GymMaster account is empty and has
no companyid that anyone has read out of it, so this adapter cannot be configured
even if someone wanted to enable it.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any, Mapping, Optional

import httpx

from crm_boundary import (
    GYMMASTER_PROSPECT_PATH,
    build_gymmaster_prospect_fields,
    claim_prospect_write,
    confirm_prospect_claim,
    release_prospect_claim,
    CrmJournalMissing,
)

TRUE_VALUES = {"1", "true", "yes", "on"}

# Marks a claim taken before a request whose outcome was never learned. It is a
# sentinel, not a vendor identifier, and nothing may treat it as one.
PENDING_PREFIX = "gymmaster-pending:"


class GymMasterWritesDisabled(RuntimeError):
    """Raised when something tries to build a live GymMaster adapter."""


def _flag(env: Mapping[str, str], name: str) -> bool:
    raw = env.get(name)
    return False if raw is None else raw.strip().lower() in TRUE_VALUES


@dataclass(frozen=True)
class GymMasterConfig:
    """Configuration for a GymMaster site. Defaults deny.

    `site_name` is the subdomain, because GymMaster is hosted per site at
    https://<sitename>.gymmasteronline.com rather than at one shared host. That
    means a misconfigured site name does not fail safe by 404, it addresses a
    different gym, so it is validated as a bare hostname label and never
    accepted as a full URL.
    """

    writes_enabled: bool = False
    site_name: str = ""
    api_key: str = field(default="", repr=False)
    company_id: str = ""
    timeout_seconds: float = 8.0

    @classmethod
    def from_env(cls, source: Optional[Mapping[str, str]] = None) -> "GymMasterConfig":
        env = source if source is not None else os.environ
        return cls(
            writes_enabled=_flag(env, "ALLOW_GYMMASTER_PROSPECT_WRITES"),
            site_name=env.get("GYMMASTER_SITE_NAME", "").strip().lower(),
            api_key=env.get("GYMMASTER_API_KEY", "").strip(),
            company_id=env.get("GYMMASTER_COMPANY_ID", "").strip(),
            timeout_seconds=float(env.get("GYMMASTER_TIMEOUT_SECONDS", "8")),
        )

    @property
    def base_url(self) -> str:
        return f"https://{self.site_name}.gymmasteronline.com"

    def missing_configuration(self) -> tuple[str, ...]:
        missing = []
        if not self.site_name.replace("-", "").isalnum():
            # Catches the empty string and anything carrying a scheme, a dot or a
            # path, all of which would silently retarget the request.
            missing.append("GYMMASTER_SITE_NAME")
        if not self.api_key:
            missing.append("GYMMASTER_API_KEY")
        if not self.company_id:
            # No one has read a companyid out of the gym's account. Without it
            # the documented required parameter set cannot be satisfied.
            missing.append("GYMMASTER_COMPANY_ID")
        return tuple(missing)


class GymMasterProspectAdapter:
    """Creates a prospect in GymMaster. Satisfies the delivery adapter protocol."""

    def __init__(
        self,
        config: GymMasterConfig,
        journal: Any,
        client: Optional[httpx.AsyncClient] = None,
    ):
        # Refusal one. Construction, not send, is the gate. An adapter that
        # cannot be built cannot be installed in the dispatcher's adapter map by
        # a later edit that forgets to check the flag.
        if not config.writes_enabled:
            raise GymMasterWritesDisabled(
                "GymMaster prospect writes are disabled. Set "
                "ALLOW_GYMMASTER_PROSPECT_WRITES=true to build this adapter."
            )
        # Refusal two. GymMaster offers no idempotency key, so without a durable
        # claim record a replayed outbox job creates a second prospect.
        if journal is None:
            raise GymMasterWritesDisabled(
                "GymMaster prospect writes require a durable journal. The vendor "
                "documents no idempotency key, so once-only is our responsibility."
            )
        self.config = config
        self.journal = journal
        self.client = client

    async def send(self, message: Any) -> Any:
        import json

        from provider_dispatch import DeliveryError, ProviderReceipt

        # Refusal three. Credentials are checked per send rather than only at
        # construction so that a config rebuilt from a partially populated
        # environment cannot slip through.
        missing = self.config.missing_configuration()
        if missing:
            raise DeliveryError(
                "gymmaster_unconfigured",
                "GymMaster prospect creation is missing: " + ", ".join(missing),
                retryable=False,
            )

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
            raise DeliveryError(
                "crm_payload_invalid", "CRM payload was not valid JSON", retryable=False
            )

        fields = build_gymmaster_prospect_fields(payload, company_id=self.config.company_id)
        for required in ("firstname", "surname", "email"):
            if not fields.get(required):
                raise DeliveryError(
                    "gymmaster_missing_required_field",
                    f"GymMaster requires {required} and the lead has none",
                    retryable=False,
                )

        # Claim before sending, never after. If the process dies between the
        # claim and the response the job is quarantined and an operator decides,
        # which is the same shape as the SMS quarantine rule. Claiming after a
        # successful response would leave the window that actually causes the
        # duplicate.
        pending_id = f"{PENDING_PREFIX}{key}"
        try:
            already = await claim_prospect_write(self.journal, key, pending_id)
        except CrmJournalMissing as exc:
            raise DeliveryError("crm_journal_missing", str(exc), retryable=False) from exc
        if already:
            # A held claim is not the same thing as a written prospect. A claim
            # that still carries the pending marker belongs to an attempt whose
            # outcome was never learned, a timeout or a 5xx, and returning a
            # receipt for it would mark the job succeeded on an identifier that
            # no vendor ever issued. That is the failure release_prospect_claim
            # exists to prevent for the known negative case, and it arrives the
            # same way here: the lead is lost with a success in the log.
            #
            # Refusing is not retryable on purpose. Only a human can look in
            # GymMaster and settle whether the prospect exists, which is the
            # same rule the quarantined SMS job follows.
            if already.startswith(PENDING_PREFIX):
                raise DeliveryError(
                    "gymmaster_claim_unresolved",
                    "A previous attempt for this lead never learned its outcome. "
                    "Check GymMaster for the prospect, then either record its id "
                    "on the outbox document or clear the pending claim.",
                    retryable=False,
                )
            return ProviderReceipt(provider_message_id=already)

        url = f"{self.config.base_url}{GYMMASTER_PROSPECT_PATH}"
        # multipart/form-data per the documented endpoint. httpx selects it when
        # the payload is passed as `files`, and the documented memberphoto
        # parameter is a file, so the endpoint expects that encoding.
        form = {name: (None, value) for name, value in fields.items()}
        form["api_key"] = (None, self.config.api_key)
        try:
            if self.client:
                response = await self.client.post(
                    url, files=form, timeout=self.config.timeout_seconds
                )
            else:
                async with httpx.AsyncClient(timeout=self.config.timeout_seconds) as client:
                    response = await client.post(url, files=form)
        except httpx.TimeoutException as exc:
            # The outcome is genuinely unknown, and the claim is already stored,
            # so a retry would be refused as a duplicate rather than creating a
            # second prospect. Not retryable: an operator confirms in GymMaster.
            raise DeliveryError("gymmaster_outcome_unknown", str(exc), retryable=False) from exc
        except httpx.TransportError as exc:
            raise DeliveryError("gymmaster_outcome_unknown", str(exc), retryable=False) from exc

        if response.status_code in {200, 201, 202}:
            try:
                body = response.json()
            except Exception:
                body = {}
            # The response shape is undocumented, so no field is treated as
            # guaranteed. Any id the vendor happens to return is recorded, and
            # its absence is not an error, because inventing a parse of an
            # undocumented body is how a success gets misread as a failure.
            member_id = ""
            if isinstance(body, Mapping):
                for candidate in ("memberid", "member_id", "id", "prospectid"):
                    if body.get(candidate):
                        member_id = str(body[candidate])
                        break
            record_id = f"gymmaster:{member_id or key}"
            # Promote the provisional claim to the real identifier so the outbox
            # document records what was created rather than that something was
            # about to be.
            await confirm_prospect_claim(self.journal, key, record_id)
            return ProviderReceipt(provider_message_id=record_id)

        if response.status_code < 500 and response.status_code != 408:
            # The vendor answered and refused, so nothing was created. Releasing
            # the claim is what lets a retry actually happen. Holding it would
            # turn a rate limit into a permanently lost lead, reported forever
            # after as a duplicate success.
            await release_prospect_claim(self.journal, key, pending_id)
            raise DeliveryError(
                f"gymmaster_http_{response.status_code}",
                "GymMaster rejected the prospect request",
                retryable=response.status_code == 429,
            )

        # A server error or a request timeout leaves the outcome genuinely
        # unknown, so the claim stays and an operator confirms in GymMaster
        # before any replay. Same rule the SMS quarantine already uses.
        raise DeliveryError(
            "gymmaster_outcome_unknown",
            f"GymMaster returned {response.status_code} and the outcome is unknown",
            retryable=False,
        )


def build_gymmaster_adapter(journal: Any, source: Optional[Mapping[str, str]] = None):
    """Build the adapter, or return None when it is not explicitly enabled.

    Returning None rather than raising is what lets a caller install this beside
    the other adapters without a try block, and keeps the default of a plain
    environment being no CRM adapter at all.
    """
    config = GymMasterConfig.from_env(source)
    if not config.writes_enabled:
        return None
    return GymMasterProspectAdapter(config, journal)
