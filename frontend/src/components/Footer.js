import React from 'react';
import { Link } from 'react-router-dom';
import { GYM_CONFIG } from '../config';
import { SCS_MEDIA } from '../config/media';
import { MapPin, Phone, Mail } from 'lucide-react';

const LOGO_URL = SCS_MEDIA.logo;

export default function Footer() {
  return (
    <footer style={{ backgroundColor: 'var(--scs-carbon)' }} className="text-[var(--scs-text-on-dark)] pt-14 pb-8" data-testid="site-footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">

          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center border border-[rgba(232,225,214,0.12)]" style={{ padding: '2px' }}>
                <img src={LOGO_URL} alt="Santa Cruz Strength" className="w-full h-full object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
              </div>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--scs-stone)' }}>
              A serious space.<br />Clear support.<br />Built for every lift.
            </p>
          </div>

          {/* The Gym */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] mb-4" style={{ color: 'var(--scs-text-on-dark-muted)' }}>The Gym</h3>
            <ul className="space-y-2">
              <li><Link to="/" className="text-sm hover:text-[var(--scs-chalk)] transition-colors duration-180" style={{ color: 'var(--scs-stone)' }}>Home</Link></li>
              <li><Link to="/join" className="text-sm hover:text-[var(--scs-chalk)] transition-colors duration-180" style={{ color: 'var(--scs-stone)' }}>Membership</Link></li>
              <li><Link to="/contact" className="text-sm hover:text-[var(--scs-chalk)] transition-colors duration-180" style={{ color: 'var(--scs-stone)' }}>Book a Facility Tour</Link></li>
            </ul>
          </div>

          {/* Coaching */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] mb-4" style={{ color: 'var(--scs-text-on-dark-muted)' }}>Coaching</h3>
            <ul className="space-y-2">
              <li><Link to="/personal-training" className="text-sm hover:text-[var(--scs-chalk)] transition-colors duration-180" style={{ color: 'var(--scs-stone)' }}>Personal Training</Link></li>
              <li><Link to="/events" className="text-sm hover:text-[var(--scs-chalk)] transition-colors duration-180" style={{ color: 'var(--scs-stone)' }}>Events</Link></li>
              <li><Link to="/blog" className="text-sm hover:text-[var(--scs-chalk)] transition-colors duration-180" style={{ color: 'var(--scs-stone)' }}>Blog</Link></li>
            </ul>
          </div>

          {/* Visit */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] mb-4" style={{ color: 'var(--scs-text-on-dark-muted)' }}>Visit</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <MapPin size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--scs-stone)' }} />
                <span className="text-sm" style={{ color: 'var(--scs-stone)' }}>{GYM_CONFIG.address.full}</span>
              </li>
              <li>
                <a href={GYM_CONFIG.phoneHref} className="flex items-center gap-2 text-sm hover:text-[var(--scs-chalk)] transition-colors duration-180" style={{ color: 'var(--scs-stone)' }}>
                  <Phone size={14} />{GYM_CONFIG.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${GYM_CONFIG.email}`} className="flex items-center gap-2 text-sm hover:text-[var(--scs-chalk)] transition-colors duration-180" style={{ color: 'var(--scs-stone)' }}>
                  <Mail size={14} />{GYM_CONFIG.email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-3"
          style={{ borderTop: '1px solid var(--scs-border-dark)' }}>
          <p className="text-xs" style={{ color: 'var(--scs-text-on-dark-muted)' }}>
            &copy; {new Date().getFullYear()} Santa Cruz Strength. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            <Link to="/privacy" className="text-xs hover:text-[var(--scs-chalk)] transition-colors duration-180" style={{ color: 'var(--scs-text-on-dark-muted)' }}>Privacy</Link>
            <Link to="/terms" className="text-xs hover:text-[var(--scs-chalk)] transition-colors duration-180" style={{ color: 'var(--scs-text-on-dark-muted)' }}>Terms</Link>
            <Link to="/staff/login" className="text-xs transition-colors duration-180" style={{ color: 'rgba(232,225,214,0.2)' }}>Staff</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
