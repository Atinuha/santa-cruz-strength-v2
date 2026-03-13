import React from 'react';
import { Link } from 'react-router-dom';
import { GYM_CONFIG } from '../config';
import { MapPin, Phone, Mail, Instagram, Facebook } from 'lucide-react';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_local-gym-hub/artifacts/luzlwc0v_SCS_Circle_Logo_1_20260308_193638_0000.jpg';

export default function Footer() {
  return (
    <footer className="bg-[var(--clr-green)] text-white pt-14 pb-8">
      {/* Wave top */}
      <div className="relative -mt-14 mb-8 overflow-hidden h-14">
        <svg viewBox="0 0 1200 56" preserveAspectRatio="none" className="absolute bottom-0 w-full h-full">
          <path d="M0,56 C300,0 900,56 1200,0 L1200,56 L0,56 Z" fill="var(--clr-green)" />
        </svg>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                <img src={LOGO_URL} alt="SCS" className="w-full h-full object-contain rounded-full" />
              </div>
              <span className="font-display text-white text-xl tracking-wider">SANTA CRUZ STRENGTH</span>
            </div>
            <p className="text-white/70 text-sm leading-relaxed max-w-xs">
              {GYM_CONFIG.tagline}
            </p>
            <p className="text-white/50 text-xs mt-2 leading-relaxed">
              A focused training environment for athletes, lifters, and people who believe strength matters.
            </p>
            <div className="flex gap-3 mt-4">
              <a href={GYM_CONFIG.social.instagram} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors duration-200">
                <Instagram size={15} />
              </a>
              <a href={GYM_CONFIG.social.facebook} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors duration-200">
                <Facebook size={15} />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-white/90 text-xs font-bold uppercase tracking-widest mb-4">Navigate</h3>
            <ul className="space-y-2.5">
              {[
                { to: '/', label: 'Home' },
                { to: '/join', label: 'Membership' },
                { to: '/personal-training', label: 'Personal Training' },
                { to: '/blog', label: 'Blog' },
                { to: '/contact', label: 'Contact' },
              ].map(l => (
                <li key={l.to}>
                  <Link to={l.to} className="text-white/65 hover:text-white text-sm font-semibold transition-colors duration-200">
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <a href="https://myiclubonline.com/iclub/members/signin" target="_blank" rel="noopener noreferrer"
                  className="text-[var(--clr-seafoam)] hover:text-white text-sm font-bold transition-colors duration-200">
                  Member Portal →
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white/90 text-xs font-bold uppercase tracking-widest mb-4">Find Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <MapPin size={15} className="mt-0.5 shrink-0 text-[var(--clr-seafoam)]" />
                <span className="text-white/65 text-sm">{GYM_CONFIG.address.full}</span>
              </li>
              <li>
                <a href={GYM_CONFIG.phoneHref}
                  className="flex items-center gap-2.5 text-white/65 hover:text-white text-sm font-semibold transition-colors duration-200">
                  <Phone size={15} className="text-[var(--clr-seafoam)]" />{GYM_CONFIG.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${GYM_CONFIG.email}`}
                  className="flex items-center gap-2.5 text-white/65 hover:text-white text-sm transition-colors duration-200">
                  <Mail size={15} className="text-[var(--clr-seafoam)]" />{GYM_CONFIG.email}
                </a>
              </li>
              <li className="text-white/45 text-xs pt-1">
                Members: 24/7 via our app &bull; Day passes: 9am–6pm
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/15 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-white/40 text-xs">
            &copy; {new Date().getFullYear()} Santa Cruz Strength. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            <Link to="/privacy" className="text-white/50 hover:text-white text-xs font-semibold transition-colors duration-200">Privacy Policy</Link>
            <Link to="/terms" className="text-white/50 hover:text-white text-xs font-semibold transition-colors duration-200">Terms &amp; Conditions</Link>
            <Link to="/staff/login" className="text-white/50 hover:text-white text-xs font-semibold transition-colors duration-200">
              Staff Login
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
