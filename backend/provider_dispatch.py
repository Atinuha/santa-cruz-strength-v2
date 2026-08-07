"""Fail-closed delivery worker for Santa Cruz Strength lead outbox jobs.

The public request path stores provider-neutral intent. This module is the only
new-lead delivery boundary. It intentionally has no MailerSend adapter or
fallback and remains disabled until explicit runtime and recipient gates pass.
"""

from __future__ import annotations

import asyncio
import html
import logging
import os
import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Mapping, Optional, Protocol
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

import httpx

try:
    from lead_outbox import (
        claim_due_job,
        defer_claimed_job,
        mark_delivery_begun,
        mark_job_failed,
        mark_job_succeeded,
        redact_error_message,
    )
except ImportError:
    from .lead_outbox import (
        claim_due_job,
        defer_claimed_job,
        mark_delivery_begun,
        mark_job_failed,
        mark_job_succeeded,
        redact_error_message,
    )


logger = logging.getLogger(__name__)

BRAND_ID = "santa_cruz_strength"
LOCATION_ID = "santa_cruz_ca"
TRUE_VALUES = {"1", "true", "yes", "on"}
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def _flag(env: Mapping[str, str], name: str, default: bool = False) -> bool:
    raw = env.get(name)
    return default if raw is None else raw.strip().lower() in TRUE_VALUES


def _items(env: Mapping[str, str], name: str) -> frozenset[str]:
    return frozenset(item.strip().lower() for item in env.get(name, "").split(",") if item.strip())


def _normalized_phone(value: str) -> str:
    digits = "".join(character for character in str(value or "") if character.isdigit())
    if len(digits) == 10:
        return f"+1{digits}"
    if len(digits) == 11 and digits.startswith("1"):
        return f"+{digits}"
    return ""


@dataclass(frozen=True)
class DispatchConfig:
    enabled: bool = False
    resend_enabled: bool = False
    twilio_enabled: bool = False
    schedulers_enabled: bool = False
    database_writes_enabled: bool = False
    email_sends_enabled: bool = False
    sms_sends_enabled: bool = False
    test_recipient_mode: bool = True
    app_env: str = "development"
    production_delivery_approved: bool = False
    primary_owner: str = "Teresa"
    staff_email: str = ""
    timezone_name: str = "America/Los_Angeles"
    quiet_start_hour: int = 20
    quiet_end_hour: int = 8
    batch_size: int = 20
    lease_seconds: int = 60
    provider_timeout_seconds: float = 8.0
    email_allowlist: frozenset[str] = field(default_factory=frozenset)
    sms_allowlist: frozenset[str] = field(default_factory=frozenset)
    resend_api_key: str = field(default="", repr=False)
    resend_from_email: str = ""
    resend_reply_to: str = "management@santacruzstrength.com"
    twilio_account_sid: str = field(default="", repr=False)
    twilio_auth_token: str = field(default="", repr=False)
    twilio_from_number: str = ""
    twilio_status_callback: str = ""

    @classmethod
    def from_env(cls, source: Optional[Mapping[str, str]] = None) -> "DispatchConfig":
        env = source if source is not None else os.environ
        config = cls(
            enabled=_flag(env, "ALLOW_LEAD_OUTBOX_DISPATCH"),
            resend_enabled=_flag(env, "ALLOW_LEAD_RESEND"),
            twilio_enabled=_flag(env, "ALLOW_LEAD_TWILIO"),
            schedulers_enabled=_flag(env, "ALLOW_SCHEDULERS"),
            database_writes_enabled=_flag(env, "ALLOW_DATABASE_WRITES"),
            email_sends_enabled=_flag(env, "ALLOW_EMAIL_SENDS"),
            sms_sends_enabled=_flag(env, "ALLOW_SMS_SENDS"),
            test_recipient_mode=_flag(env, "LEAD_OUTBOX_TEST_RECIPIENT_MODE", True),
            app_env=env.get("APP_ENV", "development").strip().lower(),
            production_delivery_approved=_flag(env, "LEAD_OUTBOX_PRODUCTION_DELIVERY_APPROVED"),
            primary_owner=env.get("SCS_PRIMARY_LEAD_OWNER", "Teresa").strip() or "Teresa",
            staff_email=env.get("SCS_LEAD_STAFF_EMAIL", "").strip().lower(),
            timezone_name=env.get("SCS_LEAD_TIMEZONE", "America/Los_Angeles").strip(),
            quiet_start_hour=int(env.get("SCS_SMS_QUIET_START_HOUR", "20")),
            quiet_end_hour=int(env.get("SCS_SMS_QUIET_END_HOUR", "8")),
            batch_size=int(env.get("LEAD_OUTBOX_BATCH_SIZE", "20")),
            lease_seconds=int(env.get("LEAD_OUTBOX_LEASE_SECONDS", "60")),
            provider_timeout_seconds=float(env.get("LEAD_PROVIDER_TIMEOUT_SECONDS", "8")),
            email_allowlist=_items(env, "LEAD_OUTBOX_EMAIL_ALLOWLIST"),
            sms_allowlist=_items(env, "LEAD_OUTBOX_SMS_ALLOWLIST"),
            resend_api_key=env.get("RESEND_API_KEY", "").strip(),
            resend_from_email=env.get("FROM_EMAIL", "").strip(),
            resend_reply_to=env.get("SCS_LEAD_REPLY_TO", "management@santacruzstrength.com").strip(),
            twilio_account_sid=env.get("TWILIO_ACCOUNT_SID", "").strip(),
            twilio_auth_token=env.get("TWILIO_AUTH_TOKEN", "").strip(),
            twilio_from_number=_normalized_phone(env.get("TWILIO_PHONE_NUMBER", "")),
            twilio_status_callback=env.get("TWILIO_STATUS_CALLBACK_URL", "").strip(),
        )
        config.validate()
        return config

    def validate(self) -> None:
        if not self.enabled:
            if self.resend_enabled or self.twilio_enabled:
                raise ValueError("Lead provider flags require ALLOW_LEAD_OUTBOX_DISPATCH=true")
            return
        if not self.database_writes_enabled or not self.schedulers_enabled:
            raise ValueError("Lead dispatch requires database writes and schedulers")
        if not self.resend_enabled and not self.twilio_enabled:
            raise ValueError("Lead dispatch requires at least one explicitly enabled provider")
        if self.app_env != "production" and not self.test_recipient_mode:
            raise ValueError("Non-production lead dispatch must remain in test-recipient mode")
        if not self.test_recipient_mode and not (
            self.app_env == "production" and self.production_delivery_approved
        ):
            raise ValueError("Non-test recipients require explicit production delivery approval")
        if self.primary_owner.casefold() != "teresa":
            raise ValueError("Santa Cruz primary lead owner must remain Teresa until routing is re-approved")
        if not EMAIL_PATTERN.fullmatch(self.staff_email):
            raise ValueError("SCS_LEAD_STAFF_EMAIL must identify Teresa or the approved Santa Cruz route")
        if not 0 <= self.quiet_start_hour <= 23 or not 0 <= self.quiet_end_hour <= 23:
            raise ValueError("SMS quiet-hour boundaries must be whole hours from 0 to 23")
        if not 1 <= self.batch_size <= 100:
            raise ValueError("LEAD_OUTBOX_BATCH_SIZE must be between 1 and 100")
        if not 15 <= self.lease_seconds <= 600:
            raise ValueError("LEAD_OUTBOX_LEASE_SECONDS must be between 15 and 600")
        if not 1 <= self.provider_timeout_seconds <= self.lease_seconds - 1:
            raise ValueError("Provider timeout must be positive and shorter than the lease")
        try:
            ZoneInfo(self.timezone_name)
        except Exception as exc:
            raise ValueError("SCS_LEAD_TIMEZONE must be a valid IANA timezone") from exc
        if self.resend_enabled:
            if not self.email_sends_enabled:
                raise ValueError("ALLOW_EMAIL_SENDS must be true for lead Resend delivery")
            if not self.resend_api_key or not EMAIL_PATTERN.fullmatch(self.resend_from_email):
                raise ValueError("Lead Resend delivery requires RESEND_API_KEY and a valid FROM_EMAIL")
            if self.test_recipient_mode and (
                not self.email_allowlist or self.staff_email not in self.email_allowlist
            ):
                raise ValueError("Lead email test mode requires an allowlist containing the staff route")
        if self.twilio_enabled:
            if not self.sms_sends_enabled:
                raise ValueError("ALLOW_SMS_SENDS must be true for lead Twilio delivery")
            if not self.twilio_account_sid or not self.twilio_auth_token or not self.twilio_from_number:
                raise ValueError("Lead Twilio delivery requires account, auth, and from-number configuration")
            callback = urlparse(self.twilio_status_callback)
            if callback.scheme != "https" or not callback.hostname:
                raise ValueError("TWILIO_STATUS_CALLBACK_URL must be an absolute HTTPS URL")
            if self.test_recipient_mode and not self.sms_allowlist:
                raise ValueError("Lead SMS test mode requires LEAD_OUTBOX_SMS_ALLOWLIST")


@dataclass(frozen=True)
class DeliveryMessage:
    channel: str
    recipient: str
    idempotency_key: str
    subject: str = ""
    html_body: str = ""
    text_body: str = ""


@dataclass(frozen=True)
class ProviderReceipt:
    provider_message_id: str


class DeliveryError(Exception):
    def __init__(self, code: str, message: str, *, retryable: bool):
        super().__init__(message)
        self.code = str(code or "provider_error")[:120]
        self.retryable = bool(retryable)


class DeliveryAdapter(Protocol):
    async def send(self, message: DeliveryMessage) -> ProviderReceipt:
        ...


class ResendAdapter:
    """Resend HTTP adapter with a provider idempotency key on every request."""

    def __init__(self, config: DispatchConfig, client: Optional[httpx.AsyncClient] = None):
        self.config = config
        self.client = client

    async def send(self, message: DeliveryMessage) -> ProviderReceipt:
        payload = {
            "from": self.config.resend_from_email,
            "to": [message.recipient],
            "subject": message.subject,
            "html": message.html_body,
            "reply_to": self.config.resend_reply_to,
        }
        headers = {
            "Authorization": f"Bearer {self.config.resend_api_key}",
            "Content-Type": "application/json",
            "Idempotency-Key": message.idempotency_key,
        }
        try:
            if self.client:
                response = await self.client.post(
                    "https://api.resend.com/emails",
                    json=payload,
                    headers=headers,
                    timeout=self.config.provider_timeout_seconds,
                )
            else:
                async with httpx.AsyncClient(timeout=self.config.provider_timeout_seconds) as client:
                    response = await client.post(
                        "https://api.resend.com/emails", json=payload, headers=headers
                    )
        except httpx.TimeoutException as exc:
            raise DeliveryError("resend_timeout", str(exc), retryable=True) from exc
        except httpx.TransportError as exc:
            raise DeliveryError("resend_transport", str(exc), retryable=True) from exc
        if response.status_code in {200, 201, 202}:
            try:
                message_id = str(response.json().get("id") or "")
            except Exception:
                message_id = ""
            if not message_id:
                raise DeliveryError("resend_malformed_success", "Provider returned no message id", retryable=True)
            return ProviderReceipt(message_id)
        retryable = response.status_code in {408, 409, 425, 429} or response.status_code >= 500
        raise DeliveryError(
            f"resend_http_{response.status_code}",
            "Resend rejected the delivery request",
            retryable=retryable,
        )


class TwilioAdapter:
    """Twilio-only HTTP adapter. No MailerSend fallback exists in this boundary."""

    def __init__(self, config: DispatchConfig, client: Optional[httpx.AsyncClient] = None):
        self.config = config
        self.client = client

    async def send(self, message: DeliveryMessage) -> ProviderReceipt:
        url = (
            "https://api.twilio.com/2010-04-01/Accounts/"
            f"{self.config.twilio_account_sid}/Messages.json"
        )
        data = {
            "To": message.recipient,
            "From": self.config.twilio_from_number,
            "Body": message.text_body,
            "StatusCallback": self.config.twilio_status_callback,
        }
        auth = httpx.BasicAuth(self.config.twilio_account_sid, self.config.twilio_auth_token)
        try:
            if self.client:
                response = await self.client.post(
                    url, data=data, auth=auth, timeout=self.config.provider_timeout_seconds
                )
            else:
                async with httpx.AsyncClient(timeout=self.config.provider_timeout_seconds) as client:
                    response = await client.post(url, data=data, auth=auth)
        except httpx.ConnectTimeout as exc:
            raise DeliveryError("twilio_connect_timeout", str(exc), retryable=True) from exc
        except (httpx.ReadTimeout, httpx.WriteTimeout) as exc:
            raise DeliveryError(
                "twilio_delivery_unknown", str(exc), retryable=False
            ) from exc
        except httpx.ConnectError as exc:
            raise DeliveryError("twilio_connect_error", str(exc), retryable=True) from exc
        except httpx.TransportError as exc:
            raise DeliveryError("twilio_delivery_unknown", str(exc), retryable=False) from exc
        if response.status_code in {200, 201, 202}:
            try:
                message_id = str(response.json().get("sid") or "")
            except Exception:
                message_id = ""
            if not message_id:
                raise DeliveryError("twilio_malformed_success", "Provider returned no message id", retryable=False)
            return ProviderReceipt(message_id)
        if response.status_code == 429:
            raise DeliveryError("twilio_rate_limited", "Twilio rate limited delivery", retryable=True)
        retryable = response.status_code in {408, 409, 425}
        code = "twilio_delivery_unknown" if response.status_code >= 500 else f"twilio_http_{response.status_code}"
        raise DeliveryError(code, "Twilio rejected the delivery request", retryable=retryable)


def _quiet_until(now: datetime, config: DispatchConfig) -> Optional[datetime]:
    zone = ZoneInfo(config.timezone_name)
    current = now.astimezone(zone)
    start = config.quiet_start_hour
    end = config.quiet_end_hour
    if start == end:
        return None
    in_quiet = current.hour >= start or current.hour < end if start > end else start <= current.hour < end
    if not in_quiet:
        return None
    target_date = current.date() + timedelta(days=1) if start > end and current.hour >= start else current.date()
    allowed_local = datetime.combine(target_date, datetime.min.time(), tzinfo=zone).replace(hour=end)
    return allowed_local.astimezone(timezone.utc)


def _email_suppressed(lead: Mapping[str, Any]) -> bool:
    return any(
        lead.get(field) is True
        for field in (
            "blacklisted",
            "email_opted_out",
            "email_opt_out",
            "email_bounced",
            "email_complained",
        )
    )


def _sms_suppressed(lead: Mapping[str, Any]) -> bool:
    return lead.get("blacklisted") is True or lead.get("sms_opted_out") is True


def _lead_name(lead: Mapping[str, Any]) -> str:
    return " ".join(
        part.strip() for part in (str(lead.get("first_name") or ""), str(lead.get("last_name") or "")) if part.strip()
    )[:160]


def _message_for(job: Mapping[str, Any], lead: Mapping[str, Any], config: DispatchConfig) -> DeliveryMessage:
    payload = job.get("payload") or {}
    channel = job.get("channel")
    audience = payload.get("audience")
    template = payload.get("template_key")
    delivery_key = str(job.get("delivery_key") or job.get("idempotency_key") or "")
    if (payload.get("brand_id"), payload.get("location_id")) != (BRAND_ID, LOCATION_ID):
        raise DeliveryError("routing_contract_mismatch", "Outbox brand or location does not match", retryable=False)
    if lead.get("brand_id", BRAND_ID) != BRAND_ID or lead.get("location_id", LOCATION_ID) != LOCATION_ID:
        raise DeliveryError("lead_contract_mismatch", "Lead brand or location does not match", retryable=False)
    if lead.get("blacklisted") is True:
        raise DeliveryError("lead_suppressed", "Lead is suppressed", retryable=False)

    if channel == "email" and audience == "lead" and template == "lead_received":
        if lead.get("email_operational_opt_in") is not True or _email_suppressed(lead):
            raise DeliveryError("email_suppressed", "Operational email is not permitted", retryable=False)
        recipient = str(lead.get("email") or "").strip().lower()
        if not EMAIL_PATTERN.fullmatch(recipient):
            raise DeliveryError("invalid_email", "Lead email is missing or invalid", retryable=False)
        first_name = html.escape(str(lead.get("first_name") or "there")[:100])
        return DeliveryMessage(
            channel="email",
            recipient=recipient,
            idempotency_key=delivery_key,
            subject="We received your Santa Cruz Strength tour request",
            html_body=(
                f"<p>Hi {first_name},</p>"
                "<p>We received your request. Teresa or another Santa Cruz Strength team member "
                "will follow up to answer your questions and help arrange your visit.</p>"
                "<p>Santa Cruz Strength<br>151 Harvey West Blvd, Santa Cruz, CA</p>"
            ),
        )
    if channel == "email" and audience == "staff" and template == "new_lead_alert":
        name = html.escape(_lead_name(lead) or "Website lead")
        phone = html.escape(str(lead.get("phone") or "Not provided")[:40])
        email = html.escape(str(lead.get("email") or "Not provided")[:254])
        interest = html.escape(str(lead.get("interest_type") or "Membership inquiry")[:200])
        return DeliveryMessage(
            channel="email",
            recipient=config.staff_email,
            idempotency_key=delivery_key,
            subject=f"New Santa Cruz Strength lead: {name}",
            html_body=(
                f"<p>Primary owner: {html.escape(config.primary_owner)}</p>"
                f"<p><strong>{name}</strong><br>Email: {email}<br>Phone: {phone}<br>Interest: {interest}</p>"
                "<p>Open the Santa Cruz Strength CRM and begin the response workflow.</p>"
            ),
        )
    if channel == "sms" and audience == "lead" and template == "lead_received":
        if lead.get("sms_operational_opt_in") is not True or _sms_suppressed(lead):
            raise DeliveryError("sms_suppressed", "Operational SMS is not permitted", retryable=False)
        recipient = _normalized_phone(str(lead.get("phone") or ""))
        if not recipient:
            raise DeliveryError("invalid_phone", "Lead phone is missing or invalid", retryable=False)
        name = str(lead.get("first_name") or "there").strip()[:80]
        return DeliveryMessage(
            channel="sms",
            recipient=recipient,
            idempotency_key=delivery_key,
            text_body=(
                f"Hi {name}, Santa Cruz Strength received your request. Teresa or another team member "
                "will follow up about your visit. Reply STOP to opt out."
            ),
        )
    raise DeliveryError("unsupported_outbox_contract", "Outbox channel or template is unsupported", retryable=False)


def _recipient_allowed(message: DeliveryMessage, config: DispatchConfig) -> bool:
    if not config.test_recipient_mode:
        return True
    if message.channel == "email":
        return message.recipient.lower() in config.email_allowlist
    return _normalized_phone(message.recipient) in config.sms_allowlist


async def dispatch_one(
    outbox_collection,
    lead_collection,
    *,
    config: DispatchConfig,
    adapters: Mapping[str, DeliveryAdapter],
    worker_id: str,
    now: Optional[datetime] = None,
) -> Optional[dict[str, Any]]:
    if not config.enabled:
        return None
    current = now or datetime.now(timezone.utc)
    job = await claim_due_job(
        outbox_collection,
        worker_id=worker_id,
        now=current,
        lease_seconds=config.lease_seconds,
    )
    if not job:
        return None
    job_id = str(job.get("id") or "")
    reservation_token = str(job.get("delivery_reservation_token") or "")
    try:
        lead = await lead_collection.find_one({"id": job.get("lead_id")}, {"_id": 0})
        if not lead:
            raise DeliveryError("lead_missing", "Outbox lead record was not found", retryable=False)
        message = _message_for(job, lead, config)
        adapter = adapters.get(message.channel)
        if not adapter:
            # A valid outbox contract can outlive a staged provider rollout.
            # Preserve that delivery intent without spending an attempt while
            # the channel is disabled or its adapter is not configured. An
            # unsupported channel/template is still rejected by _message_for.
            deferred = await defer_claimed_job(
                outbox_collection,
                job_id=job_id,
                worker_id=worker_id,
                reservation_token=reservation_token,
                available_at=current + timedelta(minutes=5),
                reason_code=f"{message.channel}_provider_unavailable",
                now=current,
            )
            return {
                "job_id": job_id,
                "status": "deferred" if deferred else "lease_lost",
                "state": deferred,
            }
        if not _recipient_allowed(message, config):
            raise DeliveryError("recipient_not_allowlisted", "Recipient is outside the test allowlist", retryable=False)
        if message.channel == "sms":
            quiet_until = _quiet_until(current, config)
            if quiet_until:
                deferred = await defer_claimed_job(
                    outbox_collection,
                    job_id=job_id,
                    worker_id=worker_id,
                    reservation_token=reservation_token,
                    available_at=quiet_until,
                    reason_code="sms_quiet_hours",
                    now=current,
                )
                return {"job_id": job_id, "status": "deferred", "state": deferred}
        begun = await mark_delivery_begun(
            outbox_collection,
            job_id=job_id,
            worker_id=worker_id,
            reservation_token=reservation_token,
            now=current,
        )
        if not begun:
            return {"job_id": job_id, "status": "reservation_lost", "state": None}
        receipt = await asyncio.wait_for(
            adapter.send(message), timeout=config.provider_timeout_seconds
        )
        updated = await mark_job_succeeded(
            outbox_collection,
            job_id=job_id,
            worker_id=worker_id,
            reservation_token=reservation_token,
            provider_message_id=receipt.provider_message_id,
            now=current if now is not None else datetime.now(timezone.utc),
        )
        if not updated:
            return {"job_id": job_id, "status": "lease_lost"}
        logger.info("lead_dispatch_succeeded job_id=%s channel=%s", job_id, message.channel)
        return {"job_id": job_id, "status": "succeeded", "state": updated}
    except asyncio.TimeoutError:
        if job.get("channel") == "sms":
            error = DeliveryError(
                "twilio_delivery_unknown",
                "Twilio exceeded the local timeout after dispatch began",
                retryable=False,
            )
        else:
            error = DeliveryError(
                "provider_timeout",
                "Provider exceeded the local timeout; retry is protected by the email idempotency key",
                retryable=True,
            )
    except DeliveryError as exc:
        error = exc
    except Exception as exc:
        error = DeliveryError("dispatcher_error", redact_error_message(exc), retryable=False)
    updated = await mark_job_failed(
        outbox_collection,
        job_id=job_id,
        worker_id=worker_id,
        reservation_token=reservation_token,
        error_code=error.code,
        error_message=redact_error_message(error),
        retryable=error.retryable,
        now=current if now is not None else datetime.now(timezone.utc),
    )
    logger.warning("lead_dispatch_failed job_id=%s code=%s", job_id, error.code)
    return {
        "job_id": job_id,
        "status": "failed" if updated else "lease_lost",
        "state": updated,
    }


async def dispatch_batch(
    outbox_collection,
    lead_collection,
    *,
    config: DispatchConfig,
    adapters: Mapping[str, DeliveryAdapter],
    worker_id: str,
    now: Optional[datetime] = None,
) -> list[dict[str, Any]]:
    results = []
    for _ in range(config.batch_size):
        result = await dispatch_one(
            outbox_collection,
            lead_collection,
            config=config,
            adapters=adapters,
            worker_id=worker_id,
            now=now,
        )
        if result is None:
            break
        results.append(result)
    return results


def build_adapters(config: DispatchConfig) -> dict[str, DeliveryAdapter]:
    adapters: dict[str, DeliveryAdapter] = {}
    if config.resend_enabled:
        adapters["email"] = ResendAdapter(config)
    if config.twilio_enabled:
        adapters["sms"] = TwilioAdapter(config)
    return adapters
