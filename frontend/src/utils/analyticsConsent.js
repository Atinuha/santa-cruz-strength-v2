export const ANALYTICS_CONSENT_KEY = 'scs_analytics_consent';
export const ANALYTICS_PREFERENCE_KEY = 'scs_analytics_preference';
export const MARKETING_CONSENT_KEY = 'scs_marketing_consent';
export const ANALYTICS_GRANTED = 'granted';
export const ANALYTICS_DENIED = 'denied';
export const SCS_GA_ID = 'G-GJVM3NJVJH';

export function getAnalyticsConsent(storage = typeof window !== 'undefined' ? window.localStorage : null) {
  if (!storage) return null;
  const value = storage.getItem(ANALYTICS_CONSENT_KEY);
  if (value === ANALYTICS_GRANTED) return ANALYTICS_GRANTED;
  if (value === ANALYTICS_DENIED || storage.getItem(ANALYTICS_PREFERENCE_KEY) === ANALYTICS_DENIED) return ANALYTICS_DENIED;
  return null;
}

export function getMarketingConsent(storage = typeof window !== 'undefined' ? window.localStorage : null) {
  if (!storage) return null;
  const value = storage.getItem(MARKETING_CONSENT_KEY);
  if (value === ANALYTICS_GRANTED) return ANALYTICS_GRANTED;
  if (value === ANALYTICS_DENIED) return ANALYTICS_DENIED;
  return null;
}

export function getTrackingPreferences(storage = typeof window !== 'undefined' ? window.localStorage : null) {
  return {
    analytics: getAnalyticsConsent(storage),
    marketing: getMarketingConsent(storage),
  };
}

export function deleteAnalyticsCookies(documentRef) {
  if (!documentRef) return;
  const host = documentRef.location?.hostname || '';
  const rootDomain = host.replace(/^www\./, '');
  const canUseDomain = rootDomain.includes('.') && !/^\d{1,3}(\.\d{1,3}){3}$/.test(rootDomain);
  documentRef.cookie.split(';').forEach((cookie) => {
    const name = cookie.split('=')[0].trim();
    if (name === '_ga' || name.startsWith('_ga_')) {
      documentRef.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
      if (canUseDomain) {
        documentRef.cookie = `${name}=; Max-Age=0; path=/; domain=.${rootDomain}; SameSite=Lax`;
      }
    }
  });
}

export function loadGoogleAnalytics(windowRef = typeof window !== 'undefined' ? window : null, documentRef = typeof document !== 'undefined' ? document : null) {
  if (!windowRef || !documentRef || windowRef.location.hostname !== 'santacruzstrength.com') return false;
  if (documentRef.querySelector('script[data-scs-analytics="ga4"]')) return true;

  windowRef.dataLayer = windowRef.dataLayer || [];
  windowRef.gtag = windowRef.gtag || function gtag() { windowRef.dataLayer.push(arguments); };
  windowRef[`ga-disable-${SCS_GA_ID}`] = false;
  windowRef.gtag('consent', 'update', { analytics_storage: 'granted' });
  windowRef.gtag('js', new Date());
  windowRef.gtag('config', SCS_GA_ID, {
    send_page_view: false,
    cookie_flags: 'SameSite=None;Secure',
  });

  const script = documentRef.createElement('script');
  script.async = true;
  script.dataset.scsAnalytics = 'ga4';
  script.src = `https://www.googletagmanager.com/gtag/js?id=${SCS_GA_ID}`;
  documentRef.head.appendChild(script);
  return true;
}

export function saveAnalyticsConsent(value, options = {}) {
  const windowRef = options.windowRef || (typeof window !== 'undefined' ? window : null);
  const documentRef = options.documentRef || (typeof document !== 'undefined' ? document : null);
  const storage = options.storage || windowRef?.localStorage;

  if (!storage || ![ANALYTICS_GRANTED, ANALYTICS_DENIED].includes(value)) return false;
  if (value === ANALYTICS_GRANTED) {
    storage.setItem(ANALYTICS_CONSENT_KEY, ANALYTICS_GRANTED);
    storage.removeItem?.(ANALYTICS_PREFERENCE_KEY);
    return loadGoogleAnalytics(windowRef, documentRef);
  }

  storage.removeItem?.(ANALYTICS_CONSENT_KEY);
  storage.setItem(ANALYTICS_PREFERENCE_KEY, ANALYTICS_DENIED);

  if (windowRef) {
    windowRef[`ga-disable-${SCS_GA_ID}`] = true;
    windowRef.gtag?.('consent', 'update', { analytics_storage: 'denied' });
  }
  deleteAnalyticsCookies(documentRef);
  return true;
}

export function saveMarketingConsent(value, options = {}) {
  const windowRef = options.windowRef || (typeof window !== 'undefined' ? window : null);
  const storage = options.storage || windowRef?.localStorage;
  if (!storage || ![ANALYTICS_GRANTED, ANALYTICS_DENIED].includes(value)) return false;

  storage.setItem(MARKETING_CONSENT_KEY, value);
  if (windowRef?.fbq) windowRef.fbq('consent', value === ANALYTICS_GRANTED ? 'grant' : 'revoke');
  return true;
}

export function saveTrackingPreferences({ analytics, marketing }, options = {}) {
  const analyticsSaved = saveAnalyticsConsent(
    analytics ? ANALYTICS_GRANTED : ANALYTICS_DENIED,
    options,
  );
  const marketingSaved = saveMarketingConsent(
    marketing ? ANALYTICS_GRANTED : ANALYTICS_DENIED,
    options,
  );
  return analyticsSaved && marketingSaved;
}
