import {
  LeadSubmissionError,
  getLeadSubmissionErrorMessage,
  requireAcceptedLeadResponse,
} from './leadSubmission';

describe('tour lead acceptance', () => {
  const requestId = '9c0f805c-1354-4c02-8311-f5a495da1ac8';

  test('accepts only the explicit backend acknowledgement for this request', () => {
    const data = {
      status: 'accepted',
      lead_id: 'lead-123',
      request_id: requestId,
      duplicate: false,
    };

    expect(requireAcceptedLeadResponse({ data }, requestId)).toBe(data);
  });

  test.each([
    ['an empty resolved response', undefined],
    ['a generic success response', { data: { status: 'ok' } }],
    ['an acknowledgement without a lead ID', { data: { status: 'accepted', request_id: requestId } }],
    ['an acknowledgement for a different request', { data: { status: 'accepted', lead_id: 'lead-123', request_id: 'different' } }],
  ])('rejects %s', (_label, response) => {
    expect(() => requireAcceptedLeadResponse(response, requestId)).toThrow(LeadSubmissionError);
  });
});

describe('tour lead error messages', () => {
  test('keeps a backend message actionable', () => {
    const error = { response: { data: { detail: 'Please enter a valid phone number.' } } };
    expect(getLeadSubmissionErrorMessage(error)).toBe('Please enter a valid phone number.');
  });

  test('turns FastAPI validation details into readable text', () => {
    const error = {
      response: {
        data: {
          detail: [
            { loc: ['body', 'email'], msg: 'Enter a valid email address.' },
            { loc: ['body', 'phone'], msg: 'Enter a phone number.' },
          ],
        },
      },
    };

    expect(getLeadSubmissionErrorMessage(error)).toBe('Enter a valid email address. Enter a phone number.');
  });

  test('uses the safe fallback for an unknown error shape', () => {
    expect(getLeadSubmissionErrorMessage({ response: { data: { detail: { code: 'unknown' } } } }))
      .toBe('We could not send the request. Please try again or call the gym.');
  });
});
