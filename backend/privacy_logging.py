"""Allowlisted operational log events with no user-controlled fields."""

from __future__ import annotations


SAFE_OPERATIONAL_EVENTS = frozenset({
    "auth_device_token_issued",
    "auth_device_tokens_revoked",
    "auth_login_succeeded",
    "corporate_unsubscribed",
    "email_marketing_lead_missing",
    "email_provider_not_configured",
    "email_send_failed",
    "email_send_succeeded",
    "email_suppressed",
    "lead_csv_import_failed",
    "review_request_failed",
    "review_request_scheduled",
    "review_request_sent",
    "sms_followup_sent",
    "sms_provider_unavailable",
    "sms_send_failed",
    "sms_send_succeeded",
    "twilio_background_failed",
    "twilio_inbound_failed",
    "twilio_inbound_received",
    "twilio_reply_forwarded",
    "twilio_start_processed",
    "twilio_status_failure",
    "twilio_status_received",
    "twilio_stop_processed",
    "upload_completed",
})


def log_operational_event(logger, level: int, event: str) -> None:
    """Log only a reviewed event code. Arbitrary text is rejected."""
    if event not in SAFE_OPERATIONAL_EVENTS:
        raise ValueError("Operational log event is not allowlisted")
    logger.log(level, "operational_event=%s", event)
