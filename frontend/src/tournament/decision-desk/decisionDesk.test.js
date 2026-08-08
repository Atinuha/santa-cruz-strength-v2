import fs from 'fs';
import path from 'path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MEMBERSHIP_TIERS, MEMBERSHIP_FEE_NOTE, GYM_CONFIG } from '../../config';
import { MEMBER_STORIES } from '../../config/testimonials';

/**
 * This project ships no component testing dependency, and jest cannot resolve
 * react-router-dom v7 in this tree at all, so every existing test here is a
 * source assertion. That is a real gap for a page whose whole claim is that it
 * renders the business's published facts and not a retyped copy of them.
 *
 * A virtual mock closes it. jest.mock with { virtual: true } does not resolve
 * the real package, so the router import stops being the wall, and the page can
 * be rendered to static markup and read.
 *
 * Two things are checked, and they are the two that break silently:
 *   the page renders at all, with its approved copy and its CTA labels intact;
 *   every published price reaches the page from config, and none is retyped
 *   into this directory.
 *
 * The dash rule is not re-tested. scripts/validate-seo.mjs walks every text
 * file under frontend/ and owns it.
 */

jest.mock(
  'react-router-dom',
  () => {
    // Required inside the factory: jest hoists mocks above the imports.
    const react = require('react');
    return {
      Link: ({ to, children, ...rest }) =>
        react.createElement('a', { href: String(to), ...rest }, children),
      useLocation: () => ({ pathname: '/' }),
      useNavigate: () => () => {},
    };
  },
  { virtual: true },
);

// axios ships ESM and jest does not transform node_modules here. The page never
// calls it during a static render, so a factory that satisfies the module level
// wiring in src/lib/api.js is enough to get past the import.
jest.mock('axios', () => {
  const noop = () => {};
  const client = {
    get: () => Promise.resolve({ data: {} }),
    post: () => Promise.resolve({ data: {} }),
    put: () => Promise.resolve({ data: {} }),
    delete: () => Promise.resolve({ data: {} }),
    interceptors: { request: { use: noop }, response: { use: noop } },
  };
  return { __esModule: true, default: { ...client, create: () => client } };
});

// eslint-disable-next-line import/first
const DecisionDesk = require('./index').default;

const source = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
const markup = renderToStaticMarkup(React.createElement(DecisionDesk));
const text = markup.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/\s+/g, ' ');

describe('the decision desk renders', () => {
  test('it produces a page', () => {
    expect(typeof DecisionDesk).toBe('function');
    expect(markup.length).toBeGreaterThan(5000);
  });

  test('the approved hero copy is on it, once, as the only h1', () => {
    expect(text).toContain('A Santa Cruz strength gym you can see before you join.');
    expect(text).toContain('See the racks, platforms, training floor, and access setup');
    expect(markup.match(/<h1/g)).toHaveLength(1);
  });

  test('every CTA label is present and each intent has exactly one label', () => {
    // The tour label repeats on purpose: one label, one intent, used everywhere.
    expect(text).toContain('Book a Free Facility Tour');
    expect(text).toContain('Compare Memberships');
    expect(text).toContain('Ask About Personal Training');
    expect(text).toContain('Get Directions');
    // Competing labels for the same intent are the failure this guards.
    for (const rival of ['Book a tour', 'Schedule a visit', 'Get started', 'Join now', 'See plans']) {
      expect(text).not.toContain(rival);
    }
  });

  test('the required test hooks survive', () => {
    for (const id of [
      'home-hero',
      'home-hero-book-visit-button',
      'contact-address-block',
      'contact-click-to-call-button',
      'contact-hours-block',
      'home-map-embed',
      'home-faq-accordion',
      'lead-form-submit-button',
    ]) {
      expect(markup).toContain(`data-testid="${id}"`);
    }
  });

  test('all nine published prices reach the page, with the fee note', () => {
    const missing = MEMBERSHIP_TIERS.filter((tier) => !text.includes(tier.price));
    expect(missing.map((tier) => tier.id)).toEqual([]);
    expect(text).toContain(MEMBERSHIP_FEE_NOTE);
  });

  test('nothing on the page sells a membership', () => {
    expect(markup).not.toContain(GYM_CONFIG.joinUrl);
    for (const word of ['Add to cart', 'Buy now', 'Sign up now', 'Checkout', 'Subscribe']) {
      expect(text).not.toContain(word);
    }
  });

  test('member statements render verbatim, with their provenance line', () => {
    // The shipped homepage renders these. Reproducing them means reproducing
    // the punctuation the member used, so this asserts the quote is untouched
    // rather than tidied into house style.
    for (const story of MEMBER_STORIES) {
      expect(text).toContain(story.quote.replace(/\s+/g, ' '));
      expect(text).toContain(story.name);
      expect(markup).toContain(`data-testid="home-testimonial-${story.name.split(' ')[0].toLowerCase()}"`);
    }
    expect(markup).toContain('data-testid="home-testimonials-section"');
    expect(text).toContain('Published on our site as written. Nothing edited.');
    // No rating is published anywhere, so none may be rendered.
    expect(text).not.toMatch(/\bstars?\b/i);
    expect(markup).not.toContain('aria-label="rating"');
  });

  test('the homepage still publishes no hours table', () => {
    expect(text).toContain('Contact for current staffed hours');
    for (const segment of GYM_CONFIG.hours) {
      if (segment.days === 'Members') continue; // the access term, not a staffed hours claim
      expect(text).not.toContain(segment.hours);
    }
  });
});

describe('the decision desk retypes nothing', () => {
  test('no published price and no contact detail is a literal in this directory', () => {
    const literals = [
      ...MEMBERSHIP_TIERS.map((tier) => tier.price),
      GYM_CONFIG.phone,
      GYM_CONFIG.email,
      GYM_CONFIG.address.full,
    ];
    // The address is the one exception, and only because it sits inside the FAQ
    // answer that has to stay byte identical to src/seo/home-schema.json.
    const retyped = literals.filter(
      (value) => source.includes(value) && value !== GYM_CONFIG.address.full,
    );
    expect(retyped).toEqual([]);
  });

  test('the ledger groups every tier the business publishes, not a subset', () => {
    const grouped = source.match(/ids: \[([^\]]*)\]/g).join(' ');
    const ids = [...grouped.matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]);
    expect(ids.slice().sort()).toEqual(MEMBERSHIP_TIERS.map((t) => t.id).sort());
  });

  test('the five FAQ pairs match src/seo/home-schema.json exactly', () => {
    const schema = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../../seo/home-schema.json'), 'utf8'),
    );
    const faq = schema['@graph'].find((node) => node['@type'] === 'FAQPage');
    for (const entry of faq.mainEntity) {
      expect(source).toContain(entry.name);
      expect(source).toContain(entry.acceptedAnswer.text);
    }
  });
});
