import { buildTourLeadPayload, createInitialTourForm, isTourPreviewMode } from './tourLead';

describe('Santa Cruz tour lead consent', () => {
  test('starts with optional SMS consent unchecked', () => {
    const form = createInitialTourForm({ source: 'book_a_tour', location: 'Santa Cruz' });
    expect(form.sms_consent).toBe(false);
  });

  test('keeps operational and marketing SMS consent separate', () => {
    const form = createInitialTourForm({ source: 'book_a_tour', location: 'Santa Cruz' });
    const withoutSms = buildTourLeadPayload({ form, source: 'book_a_tour', attribution: {}, requestId: 'request-1' });
    expect(withoutSms.consent.sms_operational_opt_in).toBe(false);
    expect(withoutSms.consent.sms_marketing_opt_in).toBe(false);
    expect(withoutSms.consent.sms_consent_text_version).toBeNull();

    const withSms = buildTourLeadPayload({ form: { ...form, sms_consent: true }, source: 'book_a_tour', attribution: {}, requestId: 'request-2' });
    expect(withSms.consent.sms_operational_opt_in).toBe(true);
    expect(withSms.consent.sms_marketing_opt_in).toBe(false);
    expect(withSms.consent.sms_consent_text_version).toBe('scs-operational-v1-2026-08-03');
  });

  test('enables local no-send behavior only for an explicit true value', () => {
    expect(isTourPreviewMode('true')).toBe(true);
    expect(isTourPreviewMode('false')).toBe(false);
    expect(isTourPreviewMode()).toBe(false);
  });
});
