import React, { useEffect, useRef } from 'react';
import { Instagram, ExternalLink, Camera } from 'lucide-react';

/**
 * InstagramFeed
 *
 * Two modes:
 *  - feedId empty  → branded placeholder with "Follow us" CTA
 *  - feedId set    → loads the Behold.so widget (free, no token needed)
 *
 * Setup instructions for staff:
 *  1. Go to https://behold.so (free account)
 *  2. Connect @[instagramHandle] Instagram
 *  3. Create a feed → choose "Widget" type → copy the Feed ID
 *  4. Paste the Feed ID into src/config/index.js → beholdFeedId
 */
export default function InstagramFeed({ feedId, handle, profileUrl }) {
  const scriptLoaded = useRef(false);

  useEffect(() => {
    if (!feedId || scriptLoaded.current) return;

    // Dynamically inject the Behold widget script once
    const existing = document.querySelector('script[data-behold]');
    if (existing) {
      scriptLoaded.current = true;
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://w.behold.so/widget.js';
    script.type = 'module';
    script.setAttribute('data-behold', 'true');
    document.head.appendChild(script);
    scriptLoaded.current = true;

    return () => {
      // Leave the script in place — removing it while mounted breaks re-renders
    };
  }, [feedId]);

  return (
    <div className="mt-12 pt-10 border-t" style={{ borderColor: 'rgba(13,93,62,0.2)' }}>
      {/* Section header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-7">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white"
            style={{ boxShadow: 'var(--shadow-sm)', border: '1.5px solid var(--clr-border-green)' }}>
            <Instagram size={16} style={{ color: 'var(--clr-green)' }} />
          </div>
          <div>
            <p className="text-[var(--clr-green)] text-xs font-bold uppercase tracking-widest">Instagram</p>
            <p className="font-display text-xl tracking-wide" style={{ color: 'var(--clr-charcoal)' }}>
              FOLLOW THE JOURNEY
            </p>
          </div>
        </div>
        <a
          href={profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="instagram-follow-link"
          className="flex items-center gap-1.5 text-sm font-bold text-[var(--clr-green)] hover:text-[var(--clr-green-dark)] transition-colors duration-200 group"
        >
          @{handle}
          <ExternalLink size={13} className="opacity-60 group-hover:opacity-100 transition-opacity duration-200" />
        </a>
      </div>

      {feedId ? (
        /* ─── LIVE BEHOLD WIDGET ─── */
        <div
          className="rounded-[var(--radius-xl)] overflow-hidden"
          style={{ boxShadow: 'var(--shadow-sm)' }}
        >
          <div id={`behold-widget-${feedId}`} />
        </div>
      ) : (
        /* ─── PLACEHOLDER (shown until Behold ID is configured) ─── */
        <PlaceholderFeed handle={handle} profileUrl={profileUrl} />
      )}
    </div>
  );
}

function PlaceholderFeed({ handle, profileUrl }) {
  // Six placeholder "post" shapes — mimic an Instagram grid row
  const placeholders = [
    { shade: 'bg-[var(--clr-bg-green)]', label: 'Squat day 🏋️' },
    { shade: 'bg-[var(--clr-seafoam)]', label: 'Coach Kyle at SCS' },
    { shade: 'bg-[var(--clr-coral)]/10', label: 'Community vibes' },
    { shade: 'bg-amber-50', label: 'Deadlift PR 💪' },
    { shade: 'bg-[var(--clr-bg-green)]', label: 'Morning crew' },
    { shade: 'bg-[var(--clr-seafoam)]', label: 'Open floor' },
  ];

  return (
    <div className="relative">
      {/* Scrollable placeholder row */}
      <div
        className="flex gap-3 overflow-x-auto pb-3"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {placeholders.map((p, i) => (
          <a
            key={i}
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${p.shade} shrink-0 w-44 h-44 rounded-[var(--radius-lg)] flex flex-col items-center justify-center gap-2 group cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-md relative overflow-hidden`}
            style={{ border: '1px solid var(--clr-border)', boxShadow: 'var(--shadow-sm)' }}
          >
            <Camera size={22} style={{ color: 'var(--clr-green)', opacity: 0.5 }} />
            <span className="text-[10px] font-semibold text-center px-3 leading-snug"
              style={{ color: 'var(--clr-text-muted)' }}>
              {p.label}
            </span>
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-[var(--clr-green)]/0 group-hover:bg-[var(--clr-green)]/8 transition-all duration-200 flex items-center justify-center">
              <Instagram size={20} className="text-[var(--clr-green)] opacity-0 group-hover:opacity-70 transition-opacity duration-200" />
            </div>
          </a>
        ))}
      </div>

      {/* CTA overlay card */}
      <div className="mt-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white rounded-[var(--radius-lg)] px-5 py-4"
        style={{ boxShadow: 'var(--shadow-sm)', border: '1px solid var(--clr-border-green)' }}>
        <div className="flex-1">
          <p className="font-bold text-sm" style={{ color: 'var(--clr-charcoal)' }}>
            Live Instagram feed coming soon
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--clr-text-muted)' }}>
            Connect @{handle} via{' '}
            <a href="https://behold.so" target="_blank" rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-[var(--clr-green)] transition-colors duration-200">
              behold.so
            </a>{' '}
            (free) and paste the Feed ID into <code className="text-[10px] bg-gray-100 px-1 py-0.5 rounded">config/index.js → beholdFeedId</code>
          </p>
        </div>
        <a
          href={profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="instagram-follow-cta"
          className="btn-outline-green px-4 py-2 text-xs shrink-0 flex items-center gap-1.5"
        >
          <Instagram size={13} />
          Follow @{handle}
        </a>
      </div>
    </div>
  );
}
