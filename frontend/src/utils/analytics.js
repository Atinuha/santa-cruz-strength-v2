/**
 * Santa Cruz Strength — Analytics Utility
 * Wraps Google Analytics 4 (gtag) and Meta Pixel (fbq).
 * All calls are safe-guarded so they never throw if the scripts haven't loaded.
 *
 * GA4 Measurement ID : G-GJVM3NJVJH
 * Meta Pixel ID      : add to index.html when ready
 */

const GA_ID = 'G-GJVM3NJVJH';

// ─── Core helpers ────────────────────────────────────────────────────────────

const gtag = (...args) => {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag(...args);
  }
};

const fbq = (...args) => {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    window.fbq(...args);
  }
};

// ─── Page view (called on every route change by RouteTracker) ────────────────

export const trackPageView = (path) => {
  gtag('config', GA_ID, { page_path: path });
  fbq('track', 'PageView');
};

// ─── Conversion events ───────────────────────────────────────────────────────

/**
 * Fired when the quiz / lead form is submitted successfully.
 * Maps to GA4 recommended event "generate_lead" and Meta "Lead".
 */
export const trackLeadSubmit = ({ interest_type = '', lead_source = 'website_form' } = {}) => {
  gtag('event', 'generate_lead', {
    event_category: 'lead_capture',
    interest_type,
    lead_source,
  });
  fbq('track', 'Lead', { content_category: interest_type });
};

/**
 * Fired when any "Join Now" CTA is clicked (external ABC Fitness link).
 * Maps to GA4 "begin_checkout" + Meta "InitiateCheckout".
 */
export const trackJoinNowClick = (location = '') => {
  gtag('event', 'begin_checkout', {
    event_category: 'conversion',
    event_label: 'join_now',
    click_location: location,
  });
  fbq('track', 'InitiateCheckout', { content_name: 'Gym Membership', content_category: location });
};

/**
 * Fired when a "Book a Tour" CTA is clicked.
 * Maps to GA4 "schedule" + Meta "Schedule".
 */
export const trackBookTourClick = (location = '') => {
  gtag('event', 'schedule', {
    event_category: 'lead_capture',
    event_label: 'book_tour',
    click_location: location,
  });
  fbq('track', 'Schedule', { content_name: 'Gym Tour', content_category: location });
};

/**
 * Fired when someone clicks "Call Us" / the phone number.
 */
export const trackPhoneClick = () => {
  gtag('event', 'contact', {
    event_category: 'engagement',
    event_label: 'phone_click',
  });
  fbq('track', 'Contact');
};

/**
 * Fired when someone lands on /thank-you (confirmed lead).
 */
export const trackThankYouPageView = () => {
  gtag('event', 'conversion', {
    event_category: 'lead_capture',
    event_label: 'thank_you_page',
  });
  fbq('track', 'SubmitApplication');
};
