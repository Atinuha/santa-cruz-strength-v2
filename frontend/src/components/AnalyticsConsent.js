import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  getTrackingPreferences,
  saveTrackingPreferences,
} from '../utils/analyticsConsent';
import { resetAnalyticsPageState } from '../utils/analytics';

export const OPEN_ANALYTICS_CHOICES_EVENT = 'scs:open-analytics-choices';

export default function AnalyticsConsent() {
  const location = useLocation();
  const dialogRef = useRef(null);
  const openerRef = useRef(null);
  const [preferences, setPreferences] = useState(() => getTrackingPreferences());
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [draft, setDraft] = useState({ analytics: false, marketing: false });
  const undecided = preferences.analytics === null && preferences.marketing === null;

  // The prompt is fixed to the bottom of the viewport, so without this the last
  // 68px of every page sits underneath it. That silently hides footer contact
  // details, and more on mobile where the bar wraps to two or three lines.
  // Measure the real height rather than hardcoding it, since the text wraps.
  useEffect(() => {
    const root = document.body;
    if (!undecided) {
      root.style.removeProperty('padding-bottom');
      return undefined;
    }
    const apply = () => {
      const bar = document.querySelector('.scs-consent-prompt');
      if (bar) root.style.setProperty('padding-bottom', `${Math.ceil(bar.getBoundingClientRect().height)}px`);
    };
    apply();
    window.addEventListener('resize', apply);
    return () => {
      window.removeEventListener('resize', apply);
      root.style.removeProperty('padding-bottom');
    };
  }, [undecided]);

  const openDetails = (opener = null) => {
    const current = getTrackingPreferences();
    openerRef.current = opener;
    setDraft({
      analytics: current.analytics === 'granted',
      marketing: current.marketing === 'granted',
    });
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    window.requestAnimationFrame(() => openerRef.current?.focus?.());
  };

  useEffect(() => {
    const openChoices = () => openDetails(document.activeElement);
    window.addEventListener(OPEN_ANALYTICS_CHOICES_EVENT, openChoices);
    return () => window.removeEventListener(OPEN_ANALYTICS_CHOICES_EVENT, openChoices);
  }, []);

  useEffect(() => {
    if (!detailsOpen) return undefined;
    window.requestAnimationFrame(() => dialogRef.current?.focus());
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeDetails();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [detailsOpen]);

  if (location.pathname.startsWith('/staff') || location.pathname === '/implementation-preview' || (!undecided && !detailsOpen)) return null;

  const save = (analytics, marketing) => {
    resetAnalyticsPageState();
    saveTrackingPreferences({ analytics, marketing });
    setPreferences(getTrackingPreferences());
    setDetailsOpen(false);
    if (analytics) window.dispatchEvent(new Event('scs:analytics-consent-granted'));
  };

  return (
    <>
      {undecided && !detailsOpen && (
        <aside className="scs-consent-prompt" aria-label="Optional privacy choices" data-testid="analytics-consent-control">
          <p><strong>Optional measurement is off.</strong> Choose whether analytics or advertising measurement may run.</p>
          <div>
            <button type="button" className="scs-consent-keep" onClick={() => save(false, false)}>Keep off</button>
            <button type="button" className="scs-consent-review" onClick={(event) => openDetails(event.currentTarget)}>Review choices</button>
          </div>
        </aside>
      )}

      {detailsOpen && (
        <div className="scs-consent-backdrop" role="presentation">
          <section
            className="scs-consent-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="scs-consent-title"
            ref={dialogRef}
            tabIndex="-1"
          >
            <div className="scs-consent-heading">
              <p className="scs-eyebrow">Privacy choices</p>
              <h2 id="scs-consent-title">Control optional measurement</h2>
              <p>Lead forms work without optional tracking. Analytics and advertising measurement are separate choices.</p>
            </div>

            <div className="scs-consent-options">
              <label>
                <input
                  type="checkbox"
                  checked={draft.analytics}
                  onChange={(event) => setDraft((current) => ({ ...current, analytics: event.target.checked }))}
                />
                <span><strong>Analytics</strong><small>Understand which pages and actions help visitors.</small></span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={draft.marketing}
                  onChange={(event) => setDraft((current) => ({ ...current, marketing: event.target.checked }))}
                />
                <span><strong>Advertising measurement</strong><small>Measure advertising activity after you allow it.</small></span>
              </label>
            </div>

            <div className="scs-consent-dialog-actions">
              <Link to="/privacy" onClick={() => setDetailsOpen(false)}>Read the privacy policy</Link>
              <button type="button" className="scs-consent-cancel" onClick={closeDetails}>Cancel</button>
              <button type="button" className="scs-consent-save" onClick={() => save(draft.analytics, draft.marketing)}>Save choices</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
