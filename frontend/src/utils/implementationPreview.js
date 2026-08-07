const CHANNELS = new Set(['direct_or_unknown', 'organic_search', 'organic_social', 'paid_search', 'paid_social', 'referral']);

function safeRequestId(value) {
  if (typeof value === 'string' && /^[a-z0-9-]{8,64}$/i.test(value)) return value;
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `preview-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildImplementationJourney({
  requestId,
  channelGroup = 'direct_or_unknown',
  smsConsent = false,
} = {}) {
  const id = safeRequestId(requestId);
  const channel = CHANNELS.has(channelGroup) ? channelGroup : 'direct_or_unknown';
  const shortId = id.replace(/-/g, '').slice(0, 12);
  const leadId = `preview-scs-${shortId}`;
  const membershipEventId = `membership:santa_cruz_strength:pseudo-${shortId}:active:v1`;
  const messageCount = smsConsent ? 3 : 2;

  return {
    brand_id: 'santa_cruz_strength',
    location_id: 'santa_cruz_ca',
    request_id: id,
    lead_id: leadId,
    owner: 'teresa',
    channel_group: channel,
    sms_consent: Boolean(smsConsent),
    membership_event_id: membershipEventId,
    steps: [
      { key: 'form', system: 'Website', title: 'Tour form contract accepted', detail: 'Brand, location, offer, request ID, consent and attribution validated.' },
      { key: 'crm', system: 'CRM', title: 'Lead persisted once', detail: `Synthetic lead ${leadId} created with first-touch and latest-touch attribution.` },
      { key: 'outbox', system: 'Outbox', title: `${messageCount} delivery intents created`, detail: smsConsent ? 'Lead email, Teresa alert and consented operational SMS queued.' : 'Lead email and Teresa alert queued. SMS withheld because consent is off.' },
      { key: 'email', system: 'Resend', title: 'Acknowledgement prepared', detail: 'Santa Cruz branding and one stable delivery key stay attached to the message.' },
      { key: 'staff', system: 'Routing', title: 'Teresa assigned', detail: 'The Santa Cruz queue owns the lead. Sacramento routing cannot receive it.' },
      { key: 'sms', system: 'Twilio', title: smsConsent ? 'Operational SMS eligible' : 'Operational SMS suppressed', detail: smsConsent ? 'Quiet hours, durable STOP state and test-recipient allowlist are checked before delivery.' : 'The tour request remains valid without text consent.' },
      { key: 'tour', system: 'Lifecycle', title: 'Tour requested, confirmed and attended', detail: 'Every transition is explicit. Acknowledgement is not counted as a staff response.' },
      { key: 'gymmaster', system: 'GymMaster', title: 'Prospect and member mapping checked', detail: 'Dry-run mapping protects brand identity, member IDs and the billing boundary.' },
      { key: 'measurement', system: 'Measurement', title: 'Membership source projected', detail: `GA4 and Meta receive the same privacy-safe event ID: ${membershipEventId}` },
    ],
  };
}

