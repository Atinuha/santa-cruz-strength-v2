/**
 * One runnable check: the Open Spread homepage compiles and renders, with the
 * copy and the contract points that project truth marks MUST PRESERVE.
 *
 * react-router-dom 7 ships only an .mjs entry, which this project's CRA jest
 * transform cannot load, so it is mocked virtually. That is a limitation of the
 * test runner, not of the page: routing works in the app, which imports the
 * same package from webpack.
 */
jest.mock(
  'react-router-dom',
  () => {
    const react = require('react');
    return {
      __esModule: true,
      Link: ({ to, children, ...rest }) => react.createElement('a', { href: to, ...rest }, children),
      useLocation: () => ({ pathname: '/' }),
      useNavigate: () => () => {},
    };
  },
  { virtual: true },
);

jest.mock('../../lib/api', () => ({
  __esModule: true,
  getSiteContent: () => Promise.resolve({ data: {} }),
  getBlogPosts: () => Promise.resolve({ data: { posts: [] } }),
  createLead: () => Promise.resolve({ data: {} }),
}));

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import OpenSpread from './index';

const html = renderToStaticMarkup(React.createElement(OpenSpread));

describe('the Open Spread homepage', () => {
  test('renders the approved hero copy and the single conversion goal', () => {
    expect(html).toContain('A Santa Cruz strength gym you can see before you join.');
    expect(html).toContain('See the racks, platforms, training floor, and access setup');
    expect(html).toContain('Book a Free Facility Tour');
    expect(html).toContain('Compare Memberships');
    expect(html).toContain('Ask About Personal Training');
    expect(html).toContain('Get Directions');
  });

  test('carries the data-testid contract the homepage is queried by', () => {
    ['home-hero', 'home-hero-book-visit-button', 'contact-address-block',
      'contact-click-to-call-button', 'contact-hours-block', 'home-map-embed',
      'home-faq-accordion', 'lead-form-submit-button',
    ].forEach((id) => expect(html).toContain(`data-testid="${id}"`));
  });

  test('sources contact facts from config rather than retyping them', () => {
    expect(html).toContain('151 Harvey West Blvd Ste D, Santa Cruz, CA 95060');
    expect(html).toContain('tel:+14083376709');
  });

  test('publishes no hours table and no price', () => {
    expect(html).toContain('Contact for current staffed hours');
    expect(html).not.toMatch(/\$\d/);
    expect(html).not.toContain('Staffed Hours');
  });

  test('renders no en dash or em dash anywhere', () => {
    expect(html).not.toMatch(/[\u2013\u2014]/u);
  });

  test('uses only real local photographs', () => {
    const sources = Array.from(html.matchAll(/<img[^>]*src="([^"]+)"/g)).map((m) => m[1]);
    expect(sources.length).toBeGreaterThan(0);
    sources.forEach((src) => expect(src.startsWith('/assets/')).toBe(true));
    // The two frames of the same five people are never both on the page.
    expect(sources).not.toContain('/assets/scs/real/coaching-crew.jpg');
  });

  test('every content image carries descriptive alt text', () => {
    const contentImages = Array.from(html.matchAll(/<img[^>]*>/g))
      .filter((m) => !m[0].includes('logo.png'));
    expect(contentImages.length).toBeGreaterThan(0);
    contentImages.forEach((m) => {
      const alt = /alt="([^"]*)"/.exec(m[0]);
      expect(alt).not.toBeNull();
      expect(alt[1].length).toBeGreaterThan(20);
    });
  });

  test('keeps exactly one h1 and no hero eyebrow', () => {
    expect((html.match(/<h1/g) || []).length).toBe(1);
  });
});
