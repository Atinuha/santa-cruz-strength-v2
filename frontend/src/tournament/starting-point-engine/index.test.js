import fs from 'fs';
import path from 'path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INTEREST_OPTIONS, PATHS, TIMELINE_OPTIONS, TIMELINE_RESOLUTION } from './paths';

/**
 * Compile, render and contract guard for tournament direction 3.
 *
 * jest cannot resolve react-router-dom v7 in this tree, so the router is a
 * virtual mock. That turns what would otherwise be a source scan into a real
 * render, which is what this direction needs: its claim is that the page is
 * useful before the mechanic is touched, and that the two answers the page
 * collects arrive in the form. Both of those are render facts.
 *
 * The state changes that follow a click cannot be driven without a component
 * testing dependency, which this project does not ship. What is covered here is
 * the unanswered page, the routing tables behind the answered one, and the form
 * rendered with answers already supplied, which is the state the mechanic hands
 * it. The click path itself is verified by hand, not by this file.
 */

jest.mock(
  'react-router-dom',
  () => {
    // Required inside the factory: jest hoists mocks above the imports.
    const react = require('react');
    return {
      Link: ({ to, children, ...rest }) => react.createElement('a', { href: String(to), ...rest }, children),
      useLocation: () => ({ pathname: '/' }),
      useNavigate: () => () => {},
    };
  },
  { virtual: true },
);

// The API transport imports axios, which ships ESM that this jest setup does
// not transform. The page never calls it during a static render anyway.
jest.mock('../../lib/api', () => ({
  getSiteContent: () => Promise.resolve({ data: {} }),
  getBlogPosts: () => Promise.resolve({ data: { posts: [] } }),
  createLead: () => Promise.resolve({ data: {} }),
}));

// The shadcn accordion imports through the webpack '@' alias, which jest has no
// mapping for. Same treatment, same reason.
jest.mock(
  '@/lib/utils',
  () => ({ cn: (...values) => values.filter(Boolean).join(' ') }),
  { virtual: true },
);

// eslint-disable-next-line import/first
const StartingPointEngineHome = require('./index').default;
// eslint-disable-next-line import/first
const RoutedTourForm = require('./RoutedTourForm').default;

const DIR = __dirname;
const sources = fs
  .readdirSync(DIR)
  .filter((name) => name.endsWith('.js') && !name.endsWith('.test.js'))
  .map((name) => ({ name, body: fs.readFileSync(path.join(DIR, name), 'utf8') }));
const allSource = sources.map(({ body }) => body).join('\n');

const flatten = (markup) =>
  markup
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ');

const markup = renderToStaticMarkup(React.createElement(StartingPointEngineHome));
const text = flatten(markup);

describe('the starting point engine renders', () => {
  test('it produces a page', () => {
    expect(typeof StartingPointEngineHome).toBe('function');
    expect(markup.length).toBeGreaterThan(5000);
  });

  test('the approved hero copy is on it, once, as the only h1', () => {
    expect(text).toContain('A Santa Cruz strength gym you can see before you join.');
    expect(text).toContain('See the racks, platforms, training floor, and access setup');
    expect(markup.match(/<h1/g)).toHaveLength(1);
  });

  test('every CTA label is present and each intent has exactly one label', () => {
    expect(text).toContain('Book a Free Facility Tour');
    expect(text).toContain('Compare Memberships');
    expect(text).toContain('Ask About Personal Training');
    expect(text).toContain('Request my free tour');
    expect(text).toContain('Get Directions');
    for (const rival of ['Book a tour', 'Schedule a visit', 'Get started', 'Join now', 'See plans']) {
      expect(text).not.toContain(rival);
    }
  });

  test('the page is complete for a visitor who never touches the mechanic', () => {
    // This is the direction's own failure mode. All four starting points must
    // read in full before anything is chosen.
    for (const entry of PATHS) {
      expect(text).toContain(entry.title);
      expect(text).toContain(entry.summary);
    }
    expect(text).toContain('Walk through the space');
    expect(text).toContain('Practical coaching for people who want a plan.');
    expect(text).toContain('Common Questions');
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
      'lead-form-name-input',
      'lead-form-phone-input',
      'lead-form-email-input',
      'lead-form-goals-textarea',
      'sms-consent-checkbox',
      'lead-form-submit-button',
    ]) {
      expect(markup).toContain(`data-testid="${id}"`);
    }
  });

  test('nothing forbidden reached the page', () => {
    // Hours stay off the homepage until T-04 clears, no testimonial is admitted
    // through the withheld proof gate, and no price appears.
    expect(text).not.toContain('Staffed Hours');
    expect(text).not.toContain('24 / 7 Access');
    expect(text).toContain('Contact for current staffed hours');
    expect(text).not.toMatch(/\$\d/);
    expect(markup).not.toMatch(/[\u2013\u2014]/);
  });

  test('the consent surface is intact and opt in', () => {
    expect(text).toContain('Reply STOP to cancel or HELP for help.');
    expect(text).toContain('No membership commitment and no card required.');
    expect(markup).toMatch(/type="checkbox"/);
    expect(markup).not.toMatch(/type="checkbox"[^>]*checked/);
  });
});

describe('the answers carry from the page into the form', () => {
  const answered = renderToStaticMarkup(
    React.createElement(RoutedTourForm, {
      source: 'book_a_tour',
      answers: { interest_type: 'Open Gym', start_timeline: 'ASAP' },
      onAnswer: () => {},
    }),
  );

  test('an answer given upstream arrives pressed, and is still changeable', () => {
    expect(answered).toContain('aria-pressed="true"');
    expect(answered).toContain('aria-pressed="false"');
    expect(flatten(answered)).toContain('Carried down from your answers above.');
  });

  test('with no answers the form asks the questions itself', () => {
    const blank = renderToStaticMarkup(
      React.createElement(RoutedTourForm, {
        source: 'book_a_tour',
        answers: { interest_type: '', start_timeline: '' },
        onAnswer: () => {},
      }),
    );
    // Exactly one pressed control, and it is the preferred reply default, which
    // ships pre-selected as 'call'. Neither routing answer is defaulted.
    expect(blank.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(flatten(blank)).toContain('What brings you in?');
    expect(flatten(blank)).toContain('When are you thinking of starting?');
  });
});

describe('the routing tables', () => {
  test('the answer values are the lead payload contract, character for character', () => {
    // These are what the CRM receives. QuizForm keeps the same two tables as
    // module private constants, so they are duplicated rather than imported,
    // and this is the check that keeps the duplicate honest.
    expect(INTEREST_OPTIONS.map((option) => option.value)).toEqual([
      'General Membership',
      'Personal Training',
      'Performance / Sport Training',
      'Open Gym',
    ]);
    expect(TIMELINE_OPTIONS.map((option) => option.value)).toEqual([
      'ASAP',
      '1-2 weeks',
      '1 month',
      'Just exploring',
    ]);
  });

  test('every interest value routes somewhere and every timeline value resolves', () => {
    for (const option of INTEREST_OPTIONS) {
      expect(PATHS.find((entry) => entry.value === option.value)).toBeDefined();
    }
    for (const option of TIMELINE_OPTIONS) {
      expect(typeof TIMELINE_RESOLUTION[option.value]).toBe('string');
    }
  });
});

describe('the source obeys the guardrails', () => {
  test('the lead payload is built by the contract helper, not by hand', () => {
    const form = sources.find(({ name }) => name === 'RoutedTourForm.js').body;
    for (const helper of [
      'buildTourLeadPayload',
      'createLeadRequestId',
      'getLeadAttribution',
      'trackFormStart',
      'trackLeadSubmit',
    ]) {
      expect(form).toMatch(helper);
    }
  });

  test('the address, phone and prices are never retyped as literals', () => {
    expect(allSource).not.toContain('408) 337-6709');
    expect(allSource).not.toMatch(/\$\d/);
    // The address appears exactly once, inside the fifth FAQ answer, which is
    // mirrored verbatim into seo/home-schema.json and therefore cannot be
    // rewritten to read from config. Everywhere else it comes from GYM_CONFIG.
    const addressHits = allSource.match(/151 Harvey West Blvd Ste D, Santa Cruz, CA 95060/g) || [];
    expect(addressHits).toHaveLength(1);
    expect(allSource).toContain('GYM_CONFIG.address.full');
  });

  test('every animation is gated on reduced motion', () => {
    for (const { name, body } of sources) {
      if (!body.includes("from 'framer-motion'")) continue;
      expect(`${name} honours reduced motion: ${body.includes('useReducedMotion')}`).toBe(
        `${name} honours reduced motion: true`,
      );
    }
  });

  test('no en dash or em dash anywhere in the direction, literal or escaped', () => {
    // Mirrors both checks in scripts/validate-seo.mjs. The literal scan first,
    // then the escaped scan with the one sanctioned character class removed,
    // because the blog dash stripper has to spell the characters somehow.
    const DASHES = /[\u2013\u2014]/u;
    const offenders = sources
      .filter(({ body }) => DASHES.test(body) || /\\u201[34]/.test(body.split(DASHES.source).join('')))
      .map(({ name }) => name);
    expect(offenders).toEqual([]);
  });
});
