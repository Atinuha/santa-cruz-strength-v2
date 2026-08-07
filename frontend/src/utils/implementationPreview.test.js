import { buildImplementationJourney } from './implementationPreview';

test('Santa Cruz preview journey preserves brand, routing, consent and privacy boundaries', () => {
  const journey = buildImplementationJourney({
    requestId: '22222222-2222-4222-8222-222222222222',
    channelGroup: 'organic_search',
    smsConsent: true,
  });

  expect(journey.brand_id).toBe('santa_cruz_strength');
  expect(journey.location_id).toBe('santa_cruz_ca');
  expect(journey.owner).toBe('teresa');
  expect(journey.steps.find((step) => step.key === 'sms').title).toBe('Operational SMS eligible');
  expect(JSON.stringify(journey)).not.toMatch(/@|\+1\d{10}|first_name|last_name/i);
  expect(journey.membership_event_id).not.toContain('22222222-2222-4222-8222-222222222222');
});

