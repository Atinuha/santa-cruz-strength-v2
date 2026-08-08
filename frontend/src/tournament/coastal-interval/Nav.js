// The Coastal Interval, navigation.
//
// Posture: transparent while it sits over the dark hero, carbon once it does
// not. PROJECT-TRUTH 8.7 makes navigation posture disposable; labels and
// destinations are not, so both are identical to the shipped Navbar, as are
// every data-testid a QA agent queries.
//
// Animation, justified in one sentence: the bar becomes opaque exactly when it
// stops sitting over the dark hero, so the labels never lose the background
// they were designed against. The scroll position drives a discrete boolean
// through a motion value event, not a state update per frame, and there is no
// scroll event listener anywhere.

import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useMotionValueEvent, useScroll } from 'framer-motion';
import { GYM_CONFIG } from '../../config';
import { SCS_MEDIA } from '../../config/media';
import { HAIR_DARK, ON_DARK } from './rhythm';

const LINKS = [
  { label: 'The Gym', to: '/' },
  { label: 'Coaching', to: '/personal-training' },
  { label: 'Membership', to: '/join' },
  { label: 'About', to: '/about' },
  { label: 'Blog', to: '/blog' },
];

const DRAWER_LINKS = [...LINKS.slice(0, 4), { label: 'Events', to: '/events' }, { label: 'Blog', to: '/blog' }];

function Seal({ size = 36 }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full overflow-hidden shrink-0"
      style={{ width: size, height: size, border: `1px solid ${HAIR_DARK}`, padding: 2 }}
    >
      <img
        src={SCS_MEDIA.logo}
        alt="Santa Cruz Strength seal"
        className="w-full h-full object-contain"
        style={{ filter: 'brightness(0) invert(1)' }}
      />
    </span>
  );
}

export default function Nav() {
  const [solid, setSolid] = useState(false);
  const [open, setOpen] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (value) => {
    const next = value > 72;
    setSolid((current) => (current === next ? current : next));
  });

  return (
    <nav
      data-testid="marketing-navbar"
      className="fixed top-0 left-0 right-0 z-50 transition-colors duration-300"
      style={{
        backgroundColor: solid || open ? 'var(--scs-carbon)' : 'transparent',
        borderBottom: `1px solid ${solid || open ? HAIR_DARK : 'transparent'}`,
      }}
    >
      <div className="mx-auto w-full max-w-[1280px] px-5 sm:px-8 lg:px-10">
        <div className="h-16 flex items-center justify-between gap-6">
          <Link to="/" data-testid="navbar-logo" className="flex items-center gap-3 min-w-0">
            <Seal />
            <span className="hidden sm:block leading-tight min-w-0">
              <span
                className="block text-sm truncate"
                style={{ fontFamily: "'Barlow Condensed', Impact, system-ui", fontWeight: 600, color: 'var(--scs-chalk)' }}
              >
                Santa Cruz Strength
              </span>
              <span className="block text-[10px] uppercase tracking-[0.18em]" style={{ color: ON_DARK }}>
                Strength Gym
              </span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1 shrink-0">
            {LINKS.map((link) => (
              <NavLink
                key={link.label}
                to={link.to}
                end={link.to === '/'}
                className="px-3 py-2 text-[0.8125rem] font-medium transition-opacity duration-200 hover:opacity-100 whitespace-nowrap"
                style={({ isActive }) => ({
                  color: 'var(--scs-chalk)',
                  opacity: isActive ? 1 : 0.62,
                  letterSpacing: '0.03em',
                })}
              >
                {link.label}
              </NavLink>
            ))}
            <Link
              to="/contact"
              data-testid="navbar-free-tour-btn"
              className="btn-clay ml-4 px-5 py-2.5 text-[0.8125rem] whitespace-nowrap active:translate-y-px"
            >
              Book a Free Facility Tour
            </Link>
          </div>

          <button
            type="button"
            data-testid="marketing-navbar-mobile-open-button"
            aria-label="Toggle navigation menu"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="md:hidden p-2 -mr-2"
            style={{ color: 'var(--scs-chalk)' }}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden" style={{ borderTop: `1px solid ${HAIR_DARK}` }}>
          <div className="px-5 py-6 flex flex-col gap-1">
            {DRAWER_LINKS.map((link) => (
              <NavLink
                key={link.label}
                to={link.to}
                end={link.to === '/'}
                onClick={() => setOpen(false)}
                className="py-3 text-sm min-h-11 flex items-center"
                style={{ color: 'var(--scs-chalk)' }}
              >
                {link.label}
              </NavLink>
            ))}
            <span className="block h-px my-4" style={{ background: HAIR_DARK }} />
            <a href={GYM_CONFIG.phoneHref} className="py-2 text-sm min-h-11 flex items-center" style={{ color: ON_DARK }}>
              {GYM_CONFIG.phone}
            </a>
            <Link
              to="/contact"
              onClick={() => setOpen(false)}
              className="btn-clay mt-2 w-full text-center px-5 py-3.5 text-sm active:translate-y-px"
            >
              Book a Free Facility Tour
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
