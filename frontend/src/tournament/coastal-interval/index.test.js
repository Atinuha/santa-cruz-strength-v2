// Render check for the Coastal Interval candidate.
//
// The point is narrow and deliberate: prove the component compiles and mounts,
// and prove that the things the tournament guardrails say must survive are
// actually in the output. It is not a design test.
//
// No testing library is installed in this project and this candidate is not
// allowed to add a dependency, so this drives react-dom directly.

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

// react-router-dom 7 declares a "main" field that does not exist on disk, and
// the Jest that ships with react-scripts 5 resolves "main" rather than
// "exports", so requiring it inside a test fails even though webpack resolves
// it correctly at build and dev time. Stubbed here rather than worked around
// outside this directory.
jest.mock('react-router-dom', () => {
  const ReactModule = require('react');
  const anchor = (resolve) =>
    ReactModule.forwardRef(({ to, children, className, style, end, ...rest }, ref) =>
      ReactModule.createElement(
        'a',
        {
          href: typeof to === 'string' ? to : '#',
          ref,
          className: resolve(className),
          style: resolve(style),
          ...rest,
        },
        children,
      ),
    );
  const plain = (value) => (typeof value === 'function' ? value({ isActive: false }) : value);
  return { Link: anchor(plain), NavLink: anchor(plain), useNavigate: () => () => {} };
}, { virtual: true });

jest.mock('../../lib/api', () => ({
  getSiteContent: () => Promise.resolve({ data: {} }),
  getBlogPosts: () => Promise.resolve({ data: { posts: [] } }),
  createLead: () => Promise.resolve({ data: {} }),
}));

beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  if (!window.matchMedia) {
    window.matchMedia = (query) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    });
  }
  if (!window.IntersectionObserver) {
    class Observer {
      observe() {}

      unobserve() {}

      disconnect() {}

      takeRecords() {
        return [];
      }
    }
    window.IntersectionObserver = Observer;
    global.IntersectionObserver = Observer;
  }
});

let host;
let root;

const mount = async () => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  // eslint-disable-next-line global-require
  const CoastalInterval = require('./index').default;
  await act(async () => {
    root.render(<CoastalInterval />);
  });
  return host;
};

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  if (host) host.remove();
  root = undefined;
  host = undefined;
});

const testId = (node, id) => node.querySelector(`[data-testid="${id}"]`);

describe('coastal interval homepage', () => {
  it('renders the hero with the approved headline and the tour CTA', async () => {
    const node = await mount();
    expect(testId(node, 'home-hero')).toBeTruthy();
    expect(node.textContent).toContain('A Santa Cruz strength gym you can see before you join.');
    expect(node.textContent).toContain(
      'See the racks, platforms, training floor, and access setup before you choose a membership.',
    );
    expect(testId(node, 'home-hero-book-visit-button').textContent).toContain('Book a Free Facility Tour');
  });

  it('keeps the navigation, contact and lead capture contracts', async () => {
    const node = await mount();
    const required = [
      'marketing-navbar',
      'navbar-logo',
      'navbar-free-tour-btn',
      'marketing-navbar-mobile-open-button',
      'contact-address-block',
      'contact-click-to-call-button',
      'contact-hours-block',
      'home-map-embed',
      'home-faq-accordion',
      'lead-form-name-input',
      'lead-form-phone-input',
      'lead-form-email-input',
      'lead-form-submit-button',
      'site-footer',
    ];
    const missing = required.filter((id) => !testId(node, id));
    expect(missing).toEqual([]);
  });

  it('renders one h1, publishes no hours, and shows no price', async () => {
    const node = await mount();
    expect(node.querySelectorAll('h1')).toHaveLength(1);
    expect(testId(node, 'contact-hours-block').textContent).toContain('Contact for current staffed hours');
    expect(node.textContent).not.toMatch(/24 ?\/ ?7 Access/);
    expect(node.textContent).not.toMatch(/\$\d/);
  });

  it('carries no en dash or em dash in anything this direction authored', async () => {
    const node = await mount();
    // Member quotes are excluded: they are real customers' punctuation, held
    // verbatim in src/config/testimonials.js, which the SEO validator exempts.
    const quotes = Array.from(node.querySelectorAll('blockquote')).map((element) => element.textContent);
    let text = node.textContent;
    for (const quote of quotes) text = text.split(quote).join('');
    expect(text).not.toMatch(/[\u2013\u2014]/);
  });
});
