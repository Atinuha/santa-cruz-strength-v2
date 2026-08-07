import { isPreviewMode } from './previewSafety';

const STORAGE_KEY = 'scs_attribution_v1';
const CLICK_IDS = ['gclid', 'fbclid'];
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

const safeStorage = {
  get() {
    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  },
  set(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
      // Storage can be unavailable in privacy modes. Lead submission still works.
    }
  },
};

const clean = (value, maxLength = 500) => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
};

const externalReferrer = () => {
  if (!document.referrer) return '';
  try {
    const referrer = new URL(document.referrer);
    return referrer.hostname === window.location.hostname ? '' : clean(referrer.href);
  } catch {
    return '';
  }
};

export const captureAttribution = ({ pathname, search }) => {
  if (isPreviewMode()) return null;
  const params = new URLSearchParams(search || '');
  const previous = safeStorage.get();
  const now = new Date().toISOString();
  const landingPage = clean(`${pathname || '/'}${search || ''}`);
  const campaign = {};

  [...UTM_KEYS, ...CLICK_IDS].forEach((key) => {
    const value = clean(params.get(key) || '', 250);
    if (value) campaign[key] = value;
  });

  const referrer = externalReferrer();
  const firstTouch = previous.first_touch || {
    landing_page: landingPage,
    referrer,
    captured_at: now,
    ...campaign,
  };

  const attribution = {
    first_touch: firstTouch,
    last_touch: {
      landing_page: landingPage,
      referrer: referrer || previous.last_touch?.referrer || '',
      captured_at: now,
      ...campaign,
    },
  };

  safeStorage.set(attribution);
  return attribution;
};

export const getLeadAttribution = () => {
  if (typeof window === 'undefined') return null;
  if (isPreviewMode()) return null;
  const attribution = safeStorage.get();
  return attribution.first_touch && attribution.last_touch ? attribution : null;
};
