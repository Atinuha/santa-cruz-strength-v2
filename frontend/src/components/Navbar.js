import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { GYM_CONFIG } from '../config';
import { SCS_MEDIA } from '../config/media';
import { Menu, X } from 'lucide-react';

const LOGO_URL = SCS_MEDIA.logo;

/* The desktop set is unchanged. Nav labels are muscle memory and an
   analytics dimension, so they are not renamed as a side effect of a
   visual pass. Events keeps its mobile-only position, exactly as
   before; what changed is that Blog no longer appears twice in the
   mobile drawer, which it did. */
const LINKS = [
  { to: '/', label: 'The Gym' },
  { to: '/personal-training', label: 'Coaching' },
  { to: '/join', label: 'Membership' },
  { to: '/about', label: 'About' },
  { to: '/blog', label: 'Blog' },
];

const MOBILE_EXTRA = [
  { to: '/events', label: 'Events' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const isActive = (p) => pathname === p;
  const toggleRef = useRef(null);

  /* A drawer that only closes by tapping the same small button is a
     trap on a phone and unusable from a keyboard. Escape closes it and
     returns focus to the control that opened it, and a route change
     closes it too. */
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 on-dark"
      style={{ backgroundColor: 'var(--scs-forest-deep)', borderBottom: '1px solid var(--scs-border-dark)' }}
      data-testid="marketing-navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* Logo. The real seal, inverted to sit on the forest field.
              Never redrawn, never replaced with a generic mark. */}
          <Link to="/" className="flex items-center gap-3 shrink-0" data-testid="navbar-logo">
            <img src={LOGO_URL} alt="Santa Cruz Strength seal"
              width="36" height="36"
              className="w-9 h-9 object-contain shrink-0"
              style={{ filter: 'brightness(0) invert(1)' }} />
            <span className="hidden sm:block leading-none">
              <span className="font-display-medium text-sm tracking-wide block"
                style={{ color: 'var(--scs-white)', lineHeight: '1.1' }}>
                Santa Cruz Strength
              </span>
              <span className="text-[10px] uppercase tracking-[0.16em] block mt-1"
                style={{ color: 'var(--scs-mint)' }}>
                Strength Gym
              </span>
            </span>
          </Link>

          {/* Desktop links. The active route carries a mint rail rather
              than only a colour change, so state is not carried by hue
              alone. */}
          <div className="hidden md:flex items-center gap-1">
            {LINKS.map(l => (
              <Link key={l.to} to={l.to}
                aria-current={isActive(l.to) ? 'page' : undefined}
                className="relative px-3 py-2 text-sm font-medium uppercase"
                style={{
                  letterSpacing: '0.07em',
                  fontSize: '0.8125rem',
                  color: isActive(l.to) ? 'var(--scs-white)' : 'var(--scs-text-on-dark-muted)',
                  transition: 'color var(--scs-dur) var(--scs-ease)',
                }}>
                {l.label}
                {isActive(l.to) && (
                  <span className="absolute left-3 right-3 -bottom-0.5 h-0.5" style={{ background: 'var(--scs-mint)' }} aria-hidden="true" />
                )}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4 shrink-0">
            <Link to="/contact#tour-request"
              data-testid="navbar-free-tour-btn"
              className="btn-clay px-5 text-xs uppercase font-semibold"
              style={{ letterSpacing: '0.08em', minHeight: '40px', padding: '0.5rem 1.25rem' }}>
              Book a Free Facility Tour
            </Link>
          </div>

          <button className="md:hidden w-11 h-11 grid place-items-center -mr-2"
            ref={toggleRef}
            style={{ color: 'var(--scs-white)' }}
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
            data-testid="marketing-navbar-mobile-open-button">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-navigation" className="md:hidden animate-fade-in"
          style={{ backgroundColor: 'var(--scs-forest-deep)', borderTop: '1px solid var(--scs-border-dark)' }}>
          <div className="px-4 py-3">
            {[...LINKS, ...MOBILE_EXTRA].map(l => (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)}
                aria-current={isActive(l.to) ? 'page' : undefined}
                className="block px-3 py-3.5 text-sm font-medium uppercase tracking-[0.07em]"
                style={{
                  color: isActive(l.to) ? 'var(--scs-white)' : 'var(--scs-text-on-dark-muted)',
                  borderLeft: isActive(l.to) ? '2px solid var(--scs-mint)' : '2px solid transparent',
                }}>
                {l.label}
              </Link>
            ))}
            <div className="pt-4 mt-3" style={{ borderTop: '1px solid var(--scs-border-dark)' }}>
              <a href={GYM_CONFIG.phoneHref}
                className="block px-3 py-2 text-sm" style={{ color: 'var(--scs-text-on-dark)' }}>
                {GYM_CONFIG.phone}
              </a>
              <Link to="/contact#tour-request" onClick={() => setOpen(false)}
                className="btn-clay w-full text-sm mt-3 uppercase tracking-wider">
                Book a Free Facility Tour
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
