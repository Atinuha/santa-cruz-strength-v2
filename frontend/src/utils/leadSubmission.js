const DEFAULT_MESSAGE = 'We could not send the request. Please try again or call the gym.';

export class LeadSubmissionError extends Error {
  constructor(message = DEFAULT_MESSAGE, options = {}) {
    super(message);
    this.name = 'LeadSubmissionError';
    this.userMessage = message;
    this.cause = options.cause;
  }
}

/**
 * A 2xx response is transport success, not lead acceptance.
 *
 * The public v1 endpoint owns the durable acceptance decision. Require its
 * explicit status, identifiers, and the same request id before any success UI
 * or conversion event can run.
 */
export function requireAcceptedLeadResponse(response, expectedRequestId) {
  const data = response?.data;
  const accepted = data?.status === 'accepted'
    && Boolean(data?.lead_id)
    && Boolean(data?.request_id)
    && data.request_id === expectedRequestId;

  if (!accepted) {
    throw new LeadSubmissionError(DEFAULT_MESSAGE);
  }

  return data;
}

export function getLeadSubmissionErrorMessage(error, fallback = DEFAULT_MESSAGE) {
  if (typeof error?.userMessage === 'string' && error.userMessage.trim()) {
    return error.userMessage;
  }

  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => (typeof item?.msg === 'string' ? item.msg.trim() : ''))
      .filter(Boolean);
    if (messages.length > 0) return messages.join(' ');
  }

  return fallback;
}
