import React from 'react';
import { Link } from 'react-router-dom';
import { GYM_CONFIG } from '../config';
import { SCS_MEDIA } from '../config/media';
import { MapPin, Phone, Mail, Instagram, Facebook } from 'lucide-react';

const LOGO_URL = SCS_MEDIA.logo;

export default function Footer() {
  return (
    <footer
      className="on-dark pt-16 pb-8"
      style={{ backgroundColor: 'var(--scs-forest-dark)', color: 'var(--scs-text-on-dark)' }}
      data-testid="site-footer"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8 mb-14">

          {/* Brand */}
          <div className="md:col-span-4">
            <div className="flex items-center gap-3 mb-5">
              <img src={LOGO_URL} alt="Santa Cruz Strength" width="44" height="44"
                className="w-11 h-11 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
              <span className="font-display-medium text-base leading-tight" style={{ color: 'var(--scs-white)' }}>
                Santa Cruz Strength
              </span>
            </div>
            <p className="text-sm leading-relaxed max-w-[34ch] m-0" style={{ color: 'var(--scs-text-on-dark-muted)' }}>
              A serious space.<br />Clear support.<br />Built for every lift.
            </p>
            <div className="flex items-center gap-3 mt-6">
              <a href={GYM_CONFIG.social.instagram} target="_blank" rel="noopener noreferrer"
                className="w-11 h-11 grid place-items-center" aria-label="Santa Cruz Strength on Instagram"
                style={{ border: '1px solid var(--scs-border-dark)', borderRadius: 'var(--scs-radius)', color: 'var(--scs-mint)' }}>
                <Instagram size={17} />
              </a>
              <a href={GYM_CONFIG.social.facebook} target="_blank" rel="noopener noreferrer"
                className="w-11 h-11 grid place-items-center" aria-label="Santa Cruz Strength on Facebook"
                style={{ border: '1px solid var(--scs-border-dark)', borderRadius: 'var(--scs-radius)', color: 'var(--scs-mint)' }}>
                <Facebook size={17} />
              </a>
            </div>
          </div>

          <nav className="md:col-span-2" aria-label="The gym">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-4" style={{ color: 'var(--scs-mint)' }}>The Gym</h2>
            <ul className="space-y-2.5">
              <li><Link to="/" className="text-sm" style={{ color: 'var(--scs-text-on-dark-muted)' }}>Home</Link></li>
              <li><Link to="/join" className="text-sm" style={{ color: 'var(--scs-text-on-dark-muted)' }}>Membership</Link></li>
              <li><Link to="/contact#tour-request" className="text-sm" style={{ color: 'var(--scs-text-on-dark-muted)' }}>Book a Free Facility Tour</Link></li>
            </ul>
          </nav>

          <nav className="md:col-span-2" aria-label="Coaching and community">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-4" style={{ color: 'var(--scs-mint)' }}>Coaching</h2>
            <ul className="space-y-2.5">
              <li><Link to="/personal-training" className="text-sm" style={{ color: 'var(--scs-text-on-dark-muted)' }}>Personal Training</Link></li>
              <li><Link to="/events" className="text-sm" style={{ color: 'var(--scs-text-on-dark-muted)' }}>Events</Link></li>
              <li><Link to="/blog" className="text-sm" style={{ color: 'var(--scs-text-on-dark-muted)' }}>Blog</Link></li>
              <li><Link to="/about" className="text-sm" style={{ color: 'var(--scs-text-on-dark-muted)' }}>About the gym</Link></li>
            </ul>
          </nav>

          {/* Visit. A real address block, marked up as one. */}
          <div className="md:col-span-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-4" style={{ color: 'var(--scs-mint)' }}>Visit</h2>
            <address className="not-italic">
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <MapPin size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--scs-mint)' }} aria-hidden="true" />
                  <span className="text-sm" style={{ color: 'var(--scs-text-on-dark-muted)' }}>{GYM_CONFIG.address.full}</span>
                </li>
                <li>
                  <a href={GYM_CONFIG.phoneHref} className="flex items-center gap-3 text-sm" style={{ color: 'var(--scs-text-on-dark)' }}>
                    <Phone size={16} style={{ color: 'var(--scs-mint)' }} aria-hidden="true" />{GYM_CONFIG.phone}
                  </a>
                </li>
                <li>
                  <a href={`mailto:${GYM_CONFIG.email}`} className="flex items-center gap-3 text-sm break-all" style={{ color: 'var(--scs-text-on-dark)' }}>
                    <Mail size={16} className="shrink-0" style={{ color: 'var(--scs-mint)' }} aria-hidden="true" />{GYM_CONFIG.email}
                  </a>
                </li>
              </ul>
            </address>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-4"
          style={{ borderTop: '1px solid var(--scs-border-dark)' }}>
          <p className="text-xs m-0" style={{ color: 'var(--scs-text-on-dark-muted)' }}>
            &copy; {new Date().getFullYear()} Santa Cruz Strength. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="text-xs" style={{ color: 'var(--scs-text-on-dark-muted)' }}>Privacy</Link>
            <Link to="/terms" className="text-xs" style={{ color: 'var(--scs-text-on-dark-muted)' }}>Terms</Link>
            <Link to="/staff/login" className="text-xs" style={{ color: 'rgba(183,206,194,0.45)' }}>Staff</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
