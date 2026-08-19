"""Pure consent rules shared by the public lead intake path.

An ordinary website form is not a verified carrier keyword workflow. A prior
SMS STOP therefore remains authoritative until the signed Twilio START path
restores operational messaging.
"""

from typing import Any, Dict, Mapping


def reinquiry_sms_updates(
    existing: Mapping[str, Any],
    *,
    requested_sms_consent: bool,
    marketing_opt_in: bool,
    consent_text_version: Any,
    consent_date: str,
    consent_source_url: Any,
) -> Dict[str, Any]:
    """Return safe SMS updates for a repeat website inquiry."""
    if not requested_sms_consent or existing.get("sms_opted_out") is True:
        return {}
    return {
        "sms_consent": True,
        "sms_operational_opt_in": True,
        "sms_marketing_opt_in": bool(marketing_opt_in),
        "sms_consent_text_version": consent_text_version,
        "sms_consent_date": consent_date,
        "sms_consent_source_url": consent_source_url,
        "sms_opted_out": False,
    }

