"""Fail-closed runtime controls for local and protected staging environments."""

import os
from typing import Optional
from urllib.parse import urlparse


TRUE_VALUES = {"1", "true", "yes", "on"}


def env_flag(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in TRUE_VALUES


APP_ENV = os.environ.get("APP_ENV", "development").strip().lower()
ALLOW_DATABASE_WRITES = env_flag("ALLOW_DATABASE_WRITES")
ALLOW_SCHEDULERS = env_flag("ALLOW_SCHEDULERS")
ALLOW_EMAIL_SENDS = env_flag("ALLOW_EMAIL_SENDS")
ALLOW_SMS_SENDS = env_flag("ALLOW_SMS_SENDS")
ALLOW_SEEDING = env_flag("ALLOW_SEEDING")
ALLOW_ANALYTICS = env_flag("ALLOW_ANALYTICS")
ALLOW_SESSION_REPLAY = env_flag("ALLOW_SESSION_REPLAY")
OUTBOUND_TEST_MODE = env_flag("OUTBOUND_TEST_MODE")
PRODUCTION_CHANGES_APPROVED = env_flag("PRODUCTION_CHANGES_APPROVED")
ALLOW_REMOTE_NONPROD_DATABASE = env_flag("ALLOW_REMOTE_NONPROD_DATABASE")
ALLOW_TWILIO_WEBHOOKS = env_flag("ALLOW_TWILIO_WEBHOOKS")
ALLOW_RESEND_WEBHOOKS = env_flag("ALLOW_RESEND_WEBHOOKS")
ALLOW_MAILERSEND_WEBHOOKS = env_flag("ALLOW_MAILERSEND_WEBHOOKS")
ALLOW_LEAD_OUTBOX_DISPATCH = env_flag("ALLOW_LEAD_OUTBOX_DISPATCH")
ALLOW_LEAD_RESEND = env_flag("ALLOW_LEAD_RESEND")
ALLOW_LEAD_TWILIO = env_flag("ALLOW_LEAD_TWILIO")


def _allowlist(name: str) -> set[str]:
    return {item.strip().lower() for item in os.environ.get(name, "").split(",") if item.strip()}


def outbound_recipient_allowed(channel: str, recipient: str) -> bool:
    if APP_ENV == "production":
        return True
    variable = "TEST_EMAIL_ALLOWLIST" if channel == "email" else "TEST_SMS_ALLOWLIST"
    return recipient.strip().lower() in _allowlist(variable)


def require_frontend_origin(value: Optional[str] = None, app_env: Optional[str] = None) -> str:
    raw = (value if value is not None else os.environ.get("FRONTEND_URL", "")).strip()
    environment = (app_env or APP_ENV).strip().lower()
    if not raw:
        raise RuntimeError("FRONTEND_URL must be configured")
    if "*" in raw:
        raise RuntimeError("FRONTEND_URL must be one exact origin")

    parsed = urlparse(raw)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise RuntimeError("FRONTEND_URL must be an absolute http or https origin")
    if parsed.username or parsed.password:
        raise RuntimeError("FRONTEND_URL must not contain credentials")
    if parsed.query or parsed.fragment or parsed.path not in {"", "/"}:
        raise RuntimeError("FRONTEND_URL must not contain a path, query, or fragment")

    protected_environments = {"preview", "staging", "production"}
    local_hosts = {"localhost", "127.0.0.1", "::1"}
    if environment in protected_environments and parsed.scheme != "https":
        raise RuntimeError("Protected FRONTEND_URL values must use https")
    if environment in protected_environments and parsed.hostname in local_hosts:
        raise RuntimeError("Protected FRONTEND_URL values must not use a local host")

    return f"{parsed.scheme}://{parsed.netloc}".rstrip("/")


def validate_runtime_safety(database_name: str, mongo_url: str = "") -> None:
    if APP_ENV not in {"development", "test", "staging", "preview", "production"}:
        raise RuntimeError("APP_ENV must be development, test, staging, preview, or production")

    if APP_ENV == "production" and not PRODUCTION_CHANGES_APPROVED:
        raise RuntimeError(
            "Production startup is blocked until PRODUCTION_CHANGES_APPROVED=true"
        )

    outbound_enabled = ALLOW_EMAIL_SENDS or ALLOW_SMS_SENDS or ALLOW_SCHEDULERS or ALLOW_TWILIO_WEBHOOKS
    if APP_ENV != "production" and outbound_enabled and not OUTBOUND_TEST_MODE:
        raise RuntimeError(
            "Non-production outbound activity requires OUTBOUND_TEST_MODE=true"
        )

    if APP_ENV != "production" and ALLOW_EMAIL_SENDS and not _allowlist("TEST_EMAIL_ALLOWLIST"):
        raise RuntimeError("Non-production email sends require TEST_EMAIL_ALLOWLIST")

    if APP_ENV != "production" and ALLOW_SMS_SENDS and not _allowlist("TEST_SMS_ALLOWLIST"):
        raise RuntimeError("Non-production SMS sends require TEST_SMS_ALLOWLIST")

    if APP_ENV != "production" and ALLOW_TWILIO_WEBHOOKS and not _allowlist("TEST_SMS_ALLOWLIST"):
        raise RuntimeError("Non-production Twilio webhooks require TEST_SMS_ALLOWLIST")

    if ALLOW_TWILIO_WEBHOOKS:
        if not os.environ.get("TWILIO_AUTH_TOKEN", "").strip():
            raise RuntimeError("Twilio webhooks require TWILIO_AUTH_TOKEN")
        if not os.environ.get("TWILIO_WEBHOOK_BASE_URL", "").strip():
            raise RuntimeError("Twilio webhooks require TWILIO_WEBHOOK_BASE_URL")

    if ALLOW_RESEND_WEBHOOKS:
        raise RuntimeError(
            "Resend webhooks remain disabled until the installed SDK verifier is validated"
        )

    if ALLOW_MAILERSEND_WEBHOOKS:
        raise RuntimeError(
            "MailerSend webhooks remain disabled until a verified signature validator is installed"
        )

    if ALLOW_LEAD_OUTBOX_DISPATCH and not (
        ALLOW_DATABASE_WRITES and ALLOW_SCHEDULERS
    ):
        raise RuntimeError(
            "Lead outbox dispatch requires database writes and schedulers"
        )
    if (ALLOW_LEAD_RESEND or ALLOW_LEAD_TWILIO) and not ALLOW_LEAD_OUTBOX_DISPATCH:
        raise RuntimeError(
            "Lead provider flags require ALLOW_LEAD_OUTBOX_DISPATCH"
        )

    safe_database_markers = ("test", "staging", "preview", "development", "dev", "local")
    if (
        APP_ENV != "production"
        and ALLOW_DATABASE_WRITES
        and not any(marker in database_name.lower() for marker in safe_database_markers)
    ):
        raise RuntimeError(
            "Non-production database writes require a database name containing a safe environment marker"
        )

    if APP_ENV != "production" and ALLOW_DATABASE_WRITES and mongo_url:
        parsed = urlparse(mongo_url.replace("mongodb+srv://", "mongodb://", 1))
        local_hosts = {"localhost", "127.0.0.1", "::1"}
        if parsed.hostname not in local_hosts and not ALLOW_REMOTE_NONPROD_DATABASE:
            raise RuntimeError(
                "Remote non-production database writes require ALLOW_REMOTE_NONPROD_DATABASE=true"
            )


def runtime_summary() -> dict:
    return {
        "app_env": APP_ENV,
        "database_writes": ALLOW_DATABASE_WRITES,
        "schedulers": ALLOW_SCHEDULERS,
        "email_sends": ALLOW_EMAIL_SENDS,
        "sms_sends": ALLOW_SMS_SENDS,
        "seeding": ALLOW_SEEDING,
        "analytics": ALLOW_ANALYTICS,
        "session_replay": ALLOW_SESSION_REPLAY,
        "outbound_test_mode": OUTBOUND_TEST_MODE,
        "remote_nonproduction_database": ALLOW_REMOTE_NONPROD_DATABASE,
        "twilio_webhooks": ALLOW_TWILIO_WEBHOOKS,
        "resend_webhooks": ALLOW_RESEND_WEBHOOKS,
        "mailersend_webhooks": ALLOW_MAILERSEND_WEBHOOKS,
        "lead_outbox_dispatch": ALLOW_LEAD_OUTBOX_DISPATCH,
        "lead_resend": ALLOW_LEAD_RESEND,
        "lead_twilio": ALLOW_LEAD_TWILIO,
    }
