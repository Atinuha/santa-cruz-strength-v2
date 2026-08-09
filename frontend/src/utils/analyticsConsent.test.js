import {
  ANALYTICS_CONSENT_KEY,
  ANALYTICS_DENIED,
  ANALYTICS_GRANTED,
  ANALYTICS_PREFERENCE_KEY,
  MARKETING_CONSENT_KEY,
  SCS_GA_ID,
  deleteAnalyticsCookies,
  getAnalyticsConsent,
  getTrackingPreferences,
  saveAnalyticsConsent,
  saveTrackingPreferences,
} from './analyticsConsent';

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

describe('analytics privacy choice', () => {
  test('has no consent before a visitor makes a choice', () => {
    expect(getAnalyticsConsent(createStorage())).toBeNull();
  });

  test('stores denial and disables GA', () => {
    const storage = createStorage();
    const gtag = jest.fn();
    const windowRef = { localStorage: storage, location: { hostname: 'santacruzstrength.com' }, gtag };
    const documentRef = { location: { hostname: 'santacruzstrength.com' }, cookie: '_ga=test' };
    expect(saveAnalyticsConsent(ANALYTICS_DENIED, { storage, windowRef, documentRef })).toBe(true);
    expect(storage.getItem(ANALYTICS_CONSENT_KEY)).toBeNull();
    expect(storage.getItem(ANALYTICS_PREFERENCE_KEY)).toBe(ANALYTICS_DENIED);
    expect(windowRef[`ga-disable-${SCS_GA_ID}`]).toBe(true);
    expect(gtag).toHaveBeenCalledWith('consent', 'update', { analytics_storage: 'denied' });
  });

  test('a build that was not told it may load analytics never loads it', () => {
    // ALLOW_ANALYTICS was a backend variable that never reached a browser, so
    // the flag advertised as controlling analytics could not stop it. This is
    // that flag, made real, and it fails closed when unset.
    delete process.env.REACT_APP_ALLOW_ANALYTICS;
    const storage = createStorage();
    const appendChild = jest.fn();
    const documentRef = {
      location: { hostname: 'santacruzstrength.com' },
      cookie: '',
      querySelector: jest.fn(() => null),
      createElement: jest.fn(() => ({ dataset: {} })),
      head: { appendChild },
    };
    const windowRef = { localStorage: storage, location: { hostname: 'santacruzstrength.com' } };

    saveAnalyticsConsent(ANALYTICS_GRANTED, { storage, windowRef, documentRef });

    expect(appendChild).not.toHaveBeenCalled();
  });

  test('loads GA only after a grant on the production hostname', () => {
    process.env.REACT_APP_ALLOW_ANALYTICS = 'true';
    const storage = createStorage();
    const appendChild = jest.fn();
    const documentRef = {
      location: { hostname: 'santacruzstrength.com' },
      cookie: '',
      querySelector: jest.fn(() => null),
      createElement: jest.fn(() => ({ dataset: {} })),
      head: { appendChild },
    };
    const windowRef = { localStorage: storage, location: { hostname: 'santacruzstrength.com' } };
    expect(saveAnalyticsConsent(ANALYTICS_GRANTED, { storage, windowRef, documentRef })).toBe(true);
    expect(storage.getItem(ANALYTICS_CONSENT_KEY)).toBe(ANALYTICS_GRANTED);
    expect(appendChild).toHaveBeenCalledTimes(1);
  });

  test('stores analytics and advertising measurement as separate choices', () => {
    process.env.REACT_APP_ALLOW_ANALYTICS = 'true';
    const storage = createStorage();
    const appendChild = jest.fn();
    const documentRef = {
      location: { hostname: 'santacruzstrength.com' },
      cookie: '',
      querySelector: jest.fn(() => null),
      createElement: jest.fn(() => ({ dataset: {} })),
      head: { appendChild },
    };
    const windowRef = { localStorage: storage, location: { hostname: 'santacruzstrength.com' } };

    expect(saveTrackingPreferences(
      { analytics: true, marketing: false },
      { storage, windowRef, documentRef },
    )).toBe(true);
    expect(getTrackingPreferences(storage)).toEqual({ analytics: ANALYTICS_GRANTED, marketing: ANALYTICS_DENIED });
    expect(storage.getItem(MARKETING_CONSENT_KEY)).toBe(ANALYTICS_DENIED);
    expect(appendChild).toHaveBeenCalledTimes(1);
  });

  test('deletes analytics cookies on both host and root domain with valid attributes', () => {
    const writes = [];
    const documentRef = { location: { hostname: 'www.santacruzstrength.com' } };
    Object.defineProperty(documentRef, 'cookie', {
      get: () => '_ga=one; _ga_TEST=two; unrelated=keep',
      set: (value) => writes.push(value),
    });

    deleteAnalyticsCookies(documentRef);

    expect(writes).toEqual([
      '_ga=; Max-Age=0; path=/; SameSite=Lax',
      '_ga=; Max-Age=0; path=/; domain=.santacruzstrength.com; SameSite=Lax',
      '_ga_TEST=; Max-Age=0; path=/; SameSite=Lax',
      '_ga_TEST=; Max-Age=0; path=/; domain=.santacruzstrength.com; SameSite=Lax',
    ]);
  });
});
