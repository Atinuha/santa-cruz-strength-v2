import React from 'react';
import { Link } from 'react-router-dom';
import { GYM_CONFIG } from '../config';
import { MapPin, Phone, Mail, Instagram, Facebook } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#0A0A0A] border-t border-white/8 pt-12 pb-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-[#D32F2F] rounded flex items-center justify-center">
                <span className="font-display text-white text-sm">S</span>
              </div>
              <span className="font-display text-white text-lg tracking-wider">SANTA CRUZ STRENGTH</span>
            </div>
            <p className="text-white/50 text-sm leading-relaxed max-w-xs">
              Serious strength training for the Santa Cruz community. Real equipment. Real coaching. Real results.
            </p>
            <div className="flex gap-3 mt-4">
              <a href={GYM_CONFIG.social.instagram} target="_blank" rel="noopener noreferrer"
                className="text-white/40 hover:text-white transition-colors duration-200">
                <Instagram size={18} />
              </a>
              <a href={GYM_CONFIG.social.facebook} target="_blank" rel="noopener noreferrer"
                className="text-white/40 hover:text-white transition-colors duration-200">
                <Facebook size={18} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-3">Quick Links</h3>
            <ul className="space-y-2">
              {[
                { to: '/', label: 'Home' },
                { to: '/join', label: 'Join Now' },
                { to: '/personal-training', label: 'Personal Training' },
                { to: '/contact', label: 'Contact' },
              ].map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-white/50 hover:text-white text-sm transition-colors duration-200">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-3">Find Us</h3>
            <ul className="space-y-2.5">
              <li className="flex items-start gap-2 text-sm text-white/50">
                <MapPin size={15} className="mt-0.5 shrink-0 text-[#D32F2F]" />
                <span>{GYM_CONFIG.address.full}</span>
              </li>
              <li>
                <a href={GYM_CONFIG.phoneHref}
                  className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors duration-200">
                  <Phone size={15} className="text-[#D32F2F]" />
                  {GYM_CONFIG.phone}
                </a>
              </li>
              <li>
                <a href={`mailto:${GYM_CONFIG.email}`}
                  className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors duration-200">
                  <Mail size={15} className="text-[#D32F2F]" />
                  {GYM_CONFIG.email}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-white/30 text-xs">
            &copy; {new Date().getFullYear()} Santa Cruz Strength. All rights reserved.
          </p>
          <Link to="/staff/login" className="text-white/20 hover:text-white/40 text-xs transition-colors duration-200">
            Staff Login
          </Link>
        </div>
      </div>
    </footer>
  );
}
