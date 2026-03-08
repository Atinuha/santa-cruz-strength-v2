import React from 'react';
import { Link } from 'react-router-dom';
import { GYM_CONFIG } from '../config';
import { MapPin, Phone, Mail, Instagram, Facebook } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[var(--ink)] border-t border-white/8 pt-12 pb-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-[#1B7A4A] rounded flex items-center justify-center">
                <span className="font-display text-white text-sm">S</span>
              </div>
              <span className="font-display text-white text-lg tracking-wider">SANTA CRUZ STRENGTH</span>
            </div>
            <p className="text-white/62 text-sm leading-relaxed max-w-xs">
              {GYM_CONFIG.tagline}
            </p>
            <p className="text-white/48 text-xs mt-2 leading-relaxed max-w-xs">
              A focused training environment for athletes, lifters, and people who believe strength matters.
            </p>
            <div className="flex gap-3 mt-4">
              <a href={GYM_CONFIG.social.instagram} target="_blank" rel="noopener noreferrer"
                className="text-white/52 hover:text-white transition-colors duration-200">
                <Instagram size={17} />
              </a>
              <a href={GYM_CONFIG.social.facebook} target="_blank" rel="noopener noreferrer"
                className="text-white/52 hover:text-white transition-colors duration-200">
                <Facebook size={17} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-3">Navigate</h3>
            <ul className="space-y-2">
              {[
                { to: '/', label: 'Home' },
                { to: '/join', label: 'Membership' },
                { to: '/personal-training', label: 'Personal Training' },
                { to: '/blog', label: 'Blog' },
                { to: '/contact', label: 'Contact' },
              ].map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-white/62 hover:text-white text-sm transition-colors duration-200">
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href="https://myiclubonline.com/iclub/members/signin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#7FCCA6]/70 hover:text-[#7FCCA6] text-sm transition-colors duration-200 font-medium"
                >
                  Member Portal →
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-3">Find Us</h3>
            <ul className="space-y-2.5">
              <li className="flex items-start gap-2 text-sm text-white/62">
                <MapPin size={14} className="mt-0.5 shrink-0 text-[#1B7A4A]" />
                <span>{GYM_CONFIG.address.full}</span>
              </li>
              <li>
                <a href={GYM_CONFIG.phoneHref}
                  className="flex items-center gap-2 text-sm text-white/62 hover:text-white transition-colors duration-200">
                  <Phone size={14} className="text-[#1B7A4A]" />{GYM_CONFIG.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${GYM_CONFIG.email}`}
                  className="flex items-center gap-2 text-sm text-white/62 hover:text-white transition-colors duration-200">
                  <Mail size={14} className="text-[#1B7A4A]" />{GYM_CONFIG.email}
                </a>
              </li>
              <li className="text-xs text-white/48 mt-1">
                Members: 24/7 via app &bull; Day passes: 9am–6pm
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-white/42 text-xs">
            &copy; {new Date().getFullYear()} Santa Cruz Strength. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            <a
              href="https://myiclubonline.com/iclub/members/signin"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#7FCCA6]/80 hover:text-[#7FCCA6] text-xs transition-colors duration-200 font-medium"
            >
              Member Portal
            </a>
            <Link
              to="/staff/login"
              className="text-white/65 hover:text-white text-xs transition-colors duration-200 font-medium"
            >
              Staff / Admin Login
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
