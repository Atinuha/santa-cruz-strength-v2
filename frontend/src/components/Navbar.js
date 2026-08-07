import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Phone, X } from 'lucide-react';
import { GYM_CONFIG } from '../config';
import { trackBookTourClick } from '../utils/analytics';

const LINKS = [
  { to: '/join', label: 'Memberships' },
  { to: '/personal-training', label: 'Training' },
  { to: '/about', label: 'The Gym' },
  { to: '/events', label: 'Events' },
  { to: '/blog', label: 'Articles' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);

  const tourTarget = pathname === '/' ? '#tour-form' : '/contact';
  const skipTarget = pathname === '/' ? '#scs-home-main' : '#main-content';

  return (
    <header className="scs-nav-wrap">
      <a className="scs-skip-link" href={skipTarget}>Skip to content</a>
      <nav className="scs-nav" aria-label="Primary navigation">
        <div className="scs-shell scs-nav-inner">
          <Link to="/" className="scs-brand" aria-label="Santa Cruz Strength home">
            <img src="/assets/scs/logo.png" alt="" width="48" height="48" />
            <span>Santa Cruz Strength</span>
          </Link>

          <div className="scs-nav-links">
            {LINKS.map((link) => (
              <Link key={link.to} to={link.to} aria-current={pathname === link.to ? 'page' : undefined}>
                {link.label}
              </Link>
            ))}
          </div>

          <div className="scs-nav-actions">
            <a href={GYM_CONFIG.phoneHref} className="scs-nav-phone" aria-label={`Call Santa Cruz Strength at ${GYM_CONFIG.phone}`}>
              <Phone size={17} aria-hidden="true" /><span>{GYM_CONFIG.phone}</span>
            </a>
            <a href={tourTarget} className="scs-button scs-button-primary scs-nav-cta" onClick={() => trackBookTourClick('navigation')}>
              Book a tour
            </a>
          </div>

          <button
            type="button"
            className="scs-menu-button"
            aria-expanded={open}
            aria-controls="scs-mobile-navigation"
            aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setOpen((current) => !current)}
          >
            {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>

        {open && (
          <div id="scs-mobile-navigation" className="scs-mobile-nav">
            <div className="scs-shell">
              {LINKS.map((link) => (
                <Link key={link.to} to={link.to} aria-current={pathname === link.to ? 'page' : undefined}>
                  {link.label}
                </Link>
              ))}
              <Link to="/contact">Contact and location</Link>
              <a href={GYM_CONFIG.phoneHref}>Call {GYM_CONFIG.phone}</a>
              <a href={tourTarget} className="scs-button scs-button-primary" onClick={() => trackBookTourClick('mobile_navigation')}>
                Book a free tour
              </a>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
