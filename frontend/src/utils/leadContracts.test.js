import {
  buildCorporateLeadPayload,
  buildMemberLeadPayload,
  createLeadRequestId,
} from './leadContracts';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('Santa Cruz canonical lead contracts', () => {
  test('creates a backend-compatible UUID request ID', () => {
    const fixed = '9c0f805c-1354-4c02-8311-f5a495da1ac8';
    expect(createLeadRequestId({ randomUUID: () => fixed })).toBe(fixed);
    expect(createLeadRequestId({})).toMatch(UUID_V4);
  });

  test('builds a Pride member lead with explicit identity, attribution, and channel consent', () => {
    const attribution = { first_touch: { utm_source: 'instagram' }, last_touch: { utm_source: 'instagram' } };
    const payload = buildMemberLeadPayload({
      form: { first_name: 'Alex', sms_consent: true },
      source: 'pride_2026',
      attribution,
      requestId: '9c0f805c-1354-4c02-8311-f5a495da1ac8',
      formId: 'pride_2026_interest',
      offerId: 'free_day_pass',
    });

    expect(payload).toMatchObject({
      schema_version: '1.0.0',
      brand_id: 'santa_cruz_strength',
      location_id: 'santa_cruz_ca',
      form_id: 'pride_2026_interest',
      offer_id: 'free_day_pass',
      lead_source: 'pride_2026',
      attribution,
    });
    expect(payload.consent.sms_operational_opt_in).toBe(true);
    expect(payload.consent.sms_marketing_opt_in).toBe(false);
    expect(payload.consent.email_marketing_opt_in).toBe(false);
    // Omitting this field made the backend default it to false, which made
    // provider_dispatch permanently suppress the acknowledgement email for
    // every consumer lead. Assert it, so the omission cannot return quietly.
    expect(payload.consent.email_operational_opt_in).toBe(true);
  });

  test('acknowledgement email stays eligible even when a lead declines SMS', () => {
    const payload = buildMemberLeadPayload({
      form: { first_name: 'Alex', sms_consent: false },
      formId: 'pride_member_interest',
      offerId: 'membership_inquiry',
      source: 'website_form',
      requestId: '9c0f805c-1354-4c02-8311-f5a495da1ac8',
      attribution: { first_touch: {}, last_touch: {} },
    });
    expect(payload.consent.email_operational_opt_in).toBe(true);
    expect(payload.consent.sms_operational_opt_in).toBe(false);
    expect(payload.consent.email_marketing_opt_in).toBe(false);
  });

  test('builds a corporate lead with numeric counts and separate operational consent', () => {
    const payload = buildCorporateLeadPayload({
      form: {
        business_name: 'Example Co',
        employee_count: '12',
        estimated_enrolled: '7',
        email_consent: true,
        sms_consent: false,
      },
      attribution: null,
      requestId: '8c9f1d74-9e2d-4e7a-9c1d-c61267f91ef1',
    });

    expect(payload).toMatchObject({
      schema_version: '1.0.0',
      brand_id: 'santa_cruz_strength',
      location_id: 'santa_cruz_ca',
      form_id: 'local_wellness_corporate_inquiry',
      offer_id: 'corporate_membership_pricing',
      lead_source: 'corporate_landing_page',
      employee_count: 12,
      estimated_enrolled: 7,
    });
    expect(payload.consent.email_operational_opt_in).toBe(true);
    expect(payload.consent.email_marketing_opt_in).toBe(false);
    expect(payload.consent.sms_operational_opt_in).toBe(false);
    expect(payload.consent.sms_marketing_opt_in).toBe(false);
  });
});

