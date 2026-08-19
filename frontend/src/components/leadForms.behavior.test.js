import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

const mockNavigate = jest.fn();
const mockTrackFormStart = jest.fn();
const mockTrackLeadSubmit = jest.fn();
const mockToastError = jest.fn();
const mockApiPost = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}), { virtual: true });

jest.mock('../utils/analytics', () => ({
  trackFormStart: (...args) => mockTrackFormStart(...args),
  trackLeadSubmit: (...args) => mockTrackLeadSubmit(...args),
}));

jest.mock('../utils/attribution', () => ({
  getLeadAttribution: () => ({ first_touch: {}, last_touch: {} }),
}));

jest.mock('sonner', () => ({
  toast: { error: (...args) => mockToastError(...args) },
}));

jest.mock('axios', () => ({
  create: () => ({
    post: (...args) => mockApiPost(...args),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  }),
}), { virtual: true });

import LeadForm from './LeadForm';
import QuizForm from './QuizForm';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const makeRequestError = (status, detail) => Object.assign(new Error(`HTTP ${status}`), {
  response: { status, data: detail === undefined ? {} : { detail } },
});

const findButton = (container, text) => {
  const button = [...container.querySelectorAll('button')]
    .find((candidate) => candidate.textContent.includes(text));
  if (!button) throw new Error(`Could not find button containing: ${text}`);
  return button;
};

const fireSubmit = (form) => form.dispatchEvent(new Event('submit', {
  bubbles: true,
  cancelable: true,
}));

async function setValue(element, value) {
  const prototype = element instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
  await act(async () => {
    setter.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function click(element) {
  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
}

async function submitAndFlush(form) {
  await act(async () => {
    fireSubmit(form);
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('rendered lead form submission safety', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    window.scrollTo = jest.fn();
    window.matchMedia = jest.fn(() => ({ matches: true }));
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    mockApiPost.mockReset();
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  async function renderQuiz() {
    await act(async () => root.render(<QuizForm source="contact_page" noAutoFocus />));

    await setValue(container.querySelector('#tour-first-name'), 'Alex');
    await setValue(container.querySelector('#tour-phone'), '8315550100');
    await setValue(container.querySelector('#tour-email'), 'alex@example.com');
    await submitAndFlush(container.querySelector('form'));

    await click(findButton(container, 'General membership'));
    await click(findButton(container, 'Ready now'));
    await submitAndFlush(container.querySelector('form'));

    return container.querySelector('form');
  }

  async function renderLead() {
    await act(async () => root.render(<LeadForm source="website_form" variant="minimal" />));
    await setValue(container.querySelector('[name="first_name"]'), 'Alex');
    await setValue(container.querySelector('[name="last_name"]'), 'Smith');
    await setValue(container.querySelector('[name="phone"]'), '8315550100');
    await setValue(container.querySelector('[name="email"]'), 'alex@example.com');
    return container.querySelector('form');
  }

  async function expectQuizFailure(response, message) {
    mockApiPost.mockImplementationOnce(response);
    const form = await renderQuiz();
    await submitAndFlush(form);

    expect(mockApiPost).toHaveBeenCalledTimes(1);
    expect(mockTrackLeadSubmit).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]').textContent).toContain(message);
  }

  async function expectLeadFailure(response, message) {
    mockApiPost.mockImplementationOnce(response);
    const form = await renderLead();
    await submitAndFlush(form);

    expect(mockApiPost).toHaveBeenCalledTimes(1);
    expect(mockTrackLeadSubmit).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalledWith(message);
  }

  test('QuizForm sends once while pending and reports an accepted duplicate only after acknowledgement', async () => {
    let accept;
    mockApiPost.mockImplementation((_path, payload) => new Promise((resolve) => {
      accept = () => resolve({
        data: {
          status: 'accepted',
          lead_id: 'lead-quiz',
          request_id: payload.request_id,
          duplicate: true,
        },
      });
    }));
    const form = await renderQuiz();

    await act(async () => {
      fireSubmit(form);
      fireSubmit(form);
      await Promise.resolve();
    });

    expect(mockApiPost).toHaveBeenCalledTimes(1);
    expect(mockTrackLeadSubmit).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();

    const requestId = mockApiPost.mock.calls[0][1].request_id;
    await act(async () => {
      accept();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockTrackLeadSubmit).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/thank-you', {
      state: {
        source: 'contact_page',
        accepted: true,
        leadId: 'lead-quiz',
        requestId,
      },
    });
  });

  test('QuizForm rejects a malformed 2xx response', async () => {
    await expectQuizFailure(
      () => Promise.resolve({
        data: { status: 'accepted', lead_id: 'lead-wrong', request_id: 'wrong-request' },
      }),
      'We could not send the request.',
    );
  });

  test('QuizForm keeps a 409 conflict actionable', async () => {
    await expectQuizFailure(
      () => Promise.reject(makeRequestError(409, 'This request conflicts with an earlier submission.')),
      'This request conflicts with an earlier submission.',
    );
  });

  test('QuizForm keeps a 500 failure actionable', async () => {
    await expectQuizFailure(
      () => Promise.reject(makeRequestError(500)),
      'We could not send the request.',
    );
  });

  test('LeadForm sends once while pending and reports an accepted duplicate only after acknowledgement', async () => {
    let accept;
    mockApiPost.mockImplementation((_path, payload) => new Promise((resolve) => {
      accept = () => resolve({
        data: {
          status: 'accepted',
          lead_id: 'lead-legacy',
          request_id: payload.request_id,
          duplicate: true,
        },
      });
    }));
    const form = await renderLead();

    await act(async () => {
      fireSubmit(form);
      fireSubmit(form);
      await Promise.resolve();
    });

    expect(mockApiPost).toHaveBeenCalledTimes(1);
    expect(mockTrackLeadSubmit).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();

    const requestId = mockApiPost.mock.calls[0][1].request_id;
    await act(async () => {
      accept();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockTrackLeadSubmit).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/thank-you', {
      state: {
        source: 'website_form',
        accepted: true,
        leadId: 'lead-legacy',
        requestId,
      },
    });
  });

  test('LeadForm rejects a malformed 2xx response', async () => {
    await expectLeadFailure(
      () => Promise.resolve({
        data: { status: 'accepted', lead_id: 'lead-wrong', request_id: 'wrong-request' },
      }),
      'We could not send the request. Please try again or call the gym.',
    );
  });

  test('LeadForm keeps a 409 conflict actionable', async () => {
    await expectLeadFailure(
      () => Promise.reject(makeRequestError(409, 'This request conflicts with an earlier submission.')),
      'This request conflicts with an earlier submission.',
    );
  });

  test('LeadForm keeps a 500 failure actionable', async () => {
    await expectLeadFailure(
      () => Promise.reject(makeRequestError(500)),
      'We could not send the request. Please try again or call the gym.',
    );
  });
});
