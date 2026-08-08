import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { GYM_CONFIG } from '../config';
import { SCS_MEDIA } from '../config/media';
import { Menu, X } from 'lucide-react';

const LOGO_URL = SCS_MEDIA.logo;

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const isActive = (p) => pathname === p;

  const links = [
    { to: '/',                  label: 'The Gym' },
    { to: '/personal-training', label: 'Coaching' },
    { to: '/join',              label: 'Membership' },
    { to: '/about',             label: 'About' },
    { to: '/blog',              label: 'Blog' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50"
      style={{ backgroundColor: 'var(--scs-carbon)', borderBottom: '1px solid var(--scs-border-dark)' }}
      data-testid="marketing-navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 shrink-0" data-testid="navbar-logo">
            <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shrink-0 border border-[rgba(232,225,214,0.15)]"
              style={{ padding: '2px' }}>
              <img src={LOGO_URL} alt="Santa Cruz Strength seal"
                className="w-full h-full object-contain"
                style={{ filter: 'brightness(0) invert(1)' }} />
            </div>
            <div className="hidden sm:block leading-none">
              <span className="font-display-medium text-sm tracking-wide block"
                style={{ color: 'var(--scs-chalk)', lineHeight: '1.1' }}>
                Santa Cruz Strength
              </span>
              <span className="text-[10px] uppercase tracking-[0.15em] block mt-0.5"
                style={{ color: 'var(--scs-stone)' }}>
                Strength Gym
              </span>
            </div>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map(l => (
              <Link key={l.to} to={l.to}
                className={`px-3 py-2 text-sm font-medium tracking-wide uppercase transition-colors duration-180 ${
                  isActive(l.to)
                    ? 'text-[var(--scs-chalk)]'
                    : 'text-[var(--scs-stone)] hover:text-[var(--scs-chalk)]'
                }`}
                style={{ letterSpacing: '0.06em', fontSize: '0.8125rem' }}>
                {l.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4 shrink-0">
            <Link to="/contact"
              data-testid="navbar-free-tour-btn"
              className="btn-clay px-5 py-2 text-xs uppercase tracking-wider font-semibold"
              style={{ letterSpacing: '0.08em' }}>
              Book a Free Facility Tour
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden p-2"
            style={{ color: 'var(--scs-chalk)' }}
            onClick={() => setOpen(!open)}
            aria-label="Toggle navigation menu"
            data-testid="marketing-navbar-mobile-open-button">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden animate-fade-in"
          style={{ backgroundColor: 'var(--scs-carbon)', borderTop: '1px solid var(--scs-border-dark)' }}>
          <div className="px-4 py-4 space-y-1">
            {links.map(l => (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)}
                className={`block px-4 py-3 text-sm font-medium uppercase tracking-wider ${
                  isActive(l.to)
                    ? 'text-[var(--scs-chalk)]'
                    : 'text-[var(--scs-stone)] hover:text-[var(--scs-chalk)]'
                }`}>
                {l.label}
              </Link>
            ))}
            <Link to="/events" onClick={() => setOpen(false)}
              className="block px-4 py-3 text-sm font-medium uppercase tracking-wider text-[var(--scs-stone)] hover:text-[var(--scs-chalk)]">
              Events
            </Link>
            <Link to="/blog" onClick={() => setOpen(false)}
              className="block px-4 py-3 text-sm font-medium uppercase tracking-wider text-[var(--scs-stone)] hover:text-[var(--scs-chalk)]">
              Blog
            </Link>
            <div className="pt-3 mt-2" style={{ borderTop: '1px solid var(--scs-border-dark)' }}>
              <a href={GYM_CONFIG.phoneHref}
                className="block px-4 py-2 text-sm text-[var(--scs-stone)]">
                {GYM_CONFIG.phone}
              </a>
              <Link to="/contact" onClick={() => setOpen(false)}
                className="btn-clay w-full text-center text-sm py-3 mt-2 block uppercase tracking-wider">
                Book a Free Facility Tour
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
