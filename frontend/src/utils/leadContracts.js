const SCHEMA_VERSION = '1.0.0';
const BRAND_ID = 'santa_cruz_strength';
const LOCATION_ID = 'santa_cruz_ca';
const PRIVACY_NOTICE_VERSION = '2026-08-03';
const SMS_CONSENT_TEXT_VERSION = 'scs-operational-v1-2026-08-03';
const EMAIL_CONSENT_TEXT_VERSION = 'scs-corporate-follow-up-v1-2026-08-03';

function fallbackUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function createLeadRequestId(cryptoProvider = globalThis.crypto) {
  return cryptoProvider?.randomUUID?.() || fallbackUuid();
}

export function buildMemberLeadPayload({
  form,
  source,
  attribution,
  requestId,
  formId,
  offerId,
}) {
  return {
    ...form,
    schema_version: SCHEMA_VERSION,
    request_id: requestId,
    brand_id: BRAND_ID,
    location_id: LOCATION_ID,
    form_id: formId,
    offer_id: offerId,
    interest_type: form.interest_type || 'General Membership',
    start_timeline: form.start_timeline || 'Just exploring',
    lead_source: source,
    attribution,
    consent: {
      privacy_notice_version: PRIVACY_NOTICE_VERSION,
      // Operational, not marketing. The lead supplied this address on a form
      // asking us to contact them, so acknowledging that request is
      // transactional. Marketing stays opt-in below. Without this the backend
      // defaults the field to false and provider_dispatch permanently
      // suppresses the acknowledgement email for every consumer lead.
      email_operational_opt_in: true,
      email_marketing_opt_in: false,
      sms_operational_opt_in: Boolean(form.sms_consent),
      sms_marketing_opt_in: false,
      sms_consent_text_version: form.sms_consent ? SMS_CONSENT_TEXT_VERSION : null,
    },
  };
}

export function buildCorporateLeadPayload({ form, attribution, requestId }) {
  return {
    ...form,
    employee_count: Number.parseInt(form.employee_count, 10) || 0,
    estimated_enrolled: Number.parseInt(form.estimated_enrolled, 10) || 0,
    schema_version: SCHEMA_VERSION,
    request_id: requestId,
    brand_id: BRAND_ID,
    location_id: LOCATION_ID,
    form_id: 'local_wellness_corporate_inquiry',
    offer_id: 'corporate_membership_pricing',
    lead_source: 'corporate_landing_page',
    attribution,
    consent: {
      privacy_notice_version: PRIVACY_NOTICE_VERSION,
      email_operational_opt_in: Boolean(form.email_consent),
      email_marketing_opt_in: false,
      email_consent_text_version: form.email_consent ? EMAIL_CONSENT_TEXT_VERSION : null,
      sms_operational_opt_in: Boolean(form.sms_consent),
      sms_marketing_opt_in: false,
      sms_consent_text_version: form.sms_consent ? SMS_CONSENT_TEXT_VERSION : null,
    },
  };
}

