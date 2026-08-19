/**
 * Santa Cruz Strength analytics utility.
 *
 * GA4 and Meta calls are guarded so missing credentials never break a page.
 * The initial GA4 config uses send_page_view:false in public/index.html.
 */

import { ANALYTICS_GRANTED, getAnalyticsConsent, getMarketingConsent } from './analyticsConsent';

const GA_ID = 'G-GJVM3NJVJH';
let lastTrackedPage = '';

const gtag = (...args) => {
  if (getAnalyticsConsent() === ANALYTICS_GRANTED && typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag(...args);
  }
};

const fbq = (...args) => {
  if (getMarketingConsent() === ANALYTICS_GRANTED && typeof window !== 'undefined' && typeof window.fbq === 'function') {
    window.fbq(...args);
  }
};

const createEventId = (prefix) => {
  const token = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${token}`;
};

export const trackPageView = (path) => {
  if (getAnalyticsConsent() !== ANALYTICS_GRANTED) {
    lastTrackedPage = '';
    return;
  }
  if (!path || path === lastTrackedPage) return;
  lastTrackedPage = path;

  const pageLocation = typeof window !== 'undefined'
    ? `${window.location.origin}${path}`
    : path;

  gtag('event', 'page_view', {
    page_path: path,
    page_location: pageLocation,
    page_title: typeof document !== 'undefined' ? document.title : '',
  });
  fbq('track', 'PageView');
};

export const resetAnalyticsPageState = () => {
  lastTrackedPage = '';
};

export const trackFormStart = ({ form_name = 'lead_form', lead_source = 'website_form' } = {}) => {
  gtag('event', 'form_start', {
    form_name,
    lead_source,
  });
  fbq('trackCustom', 'FormStart', {
    form_name,
    lead_source,
  });
};

export const trackLeadSubmit = ({ interest_type = '', lead_source = 'website_form' } = {}) => {
  const eventId = createEventId('lead');
  const parameters = {
    event_category: 'lead_capture',
    interest_type,
    lead_source,
    event_id: eventId,
  };

  gtag('event', 'generate_lead', parameters);
  if (['book_a_tour', 'book_a_visit', 'contact_page'].includes(lead_source)) {
    gtag('event', 'tour_request', parameters);
  }

  fbq(
    'track',
    'Lead',
    { content_category: interest_type, lead_source },
    { eventID: eventId }
  );

  return eventId;
};

export const trackJoinNowClick = (location = '') => {
  gtag('event', 'begin_checkout', {
    event_category: 'conversion',
    event_label: 'join_now',
    click_location: location,
  });
  fbq('track', 'InitiateCheckout', {
    content_name: 'Gym Membership',
    content_category: location,
  });
};

export const trackBookTourClick = (location = '') => {
  gtag('event', 'tour_cta_click', {
    event_category: 'lead_capture',
    click_location: location,
  });
  fbq('trackCustom', 'TourCtaClick', { click_location: location });
};

export const trackPhoneClick = (phoneTarget = '') => {
  gtag('event', 'click_to_call', {
    event_category: 'engagement',
    phone_target: phoneTarget,
  });
  fbq('track', 'Contact', { contact_method: 'phone' });
};

export const trackThankYouPageView = () => {
  gtag('event', 'lead_confirmation_view', {
    event_category: 'lead_capture',
  });
};

/**
 * The two conversion signals this file did not already have.
 *
 * A pre-launch brief asked for eight named events. Six of them already exist
 * here under names GA4 has been configured against, and renaming a live event
 * loses its history, so the mapping is recorded rather than the events
 * rewritten:
 *
 *   facility_tour_start      -> form_start with form_name 'tour_form'
 *   facility_tour_submit     -> lead_submit from the tour funnel
 *   membership_cta_click     -> join_now_click
 *   personal_training_start  -> form_start with form_name 'personal_training'
 *   personal_training_submit -> lead_submit with that interest_type
 *   click_to_call            -> phone_click
 *
 * That left two with nothing behind them at all, and they are the two that say
 * whether the pricing page and the address are doing any work. Both are below.
 *
 * Both go through the same consent gate as everything else in this file: no
 * consent, no call, and nothing queued for later.
 */

/** Fired once when the membership pricing page is actually looked at. */
export const trackMembershipView = (plans_shown = 0) => {
  gtag('event', 'membership_view', {
    page_path: typeof window !== 'undefined' ? window.location.pathname : '/join',
    plans_shown,
  });
};

/**
 * A click on the map or address link. The strongest intent signal a local
 * business gets that is not a form: somebody is working out how to drive there.
 */
export const trackDirectionsClick = (location = '') => {
  gtag('event', 'get_directions', {
    link_location: location,
  });
};
