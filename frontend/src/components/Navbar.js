import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { GYM_CONFIG } from '../config';
import { Menu, X, Phone } from 'lucide-react';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/join', label: 'Membership' },
    { to: '/personal-training', label: 'Training' },
    { to: '/blog', label: 'Blog' },
    { to: '/contact', label: 'Contact' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--ink)]/95 backdrop-blur-sm border-b border-white/8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-[#1B7A4A] rounded flex items-center justify-center transition-colors duration-200 group-hover:bg-[#145F3A]">
              <span className="font-display text-white text-sm tracking-wider">S</span>
            </div>
            <div className="hidden sm:block">
              <span className="font-display text-white text-xl tracking-wider">SANTA CRUZ STRENGTH</span>
            </div>
            <div className="block sm:hidden">
              <span className="font-display text-white text-lg tracking-wider">SCS</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium transition-colors duration-200 ${
                  isActive(link.to)
                    ? 'text-white'
                    : 'text-white/55 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="https://myiclubonline.com/iclub/members/signin"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white/55 hover:text-white transition-colors duration-200 font-medium"
            >
              Member Login
            </a>
            <a
              href={GYM_CONFIG.phoneHref}
              className="flex items-center gap-1.5 text-sm text-white/62 hover:text-white transition-colors duration-200"
            >
              <Phone size={13} />
              <span className="hidden lg:block">{GYM_CONFIG.phone}</span>
            </a>
            <a
              href={GYM_CONFIG.joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="home-hero-join-now-button"
              className="btn-scs-primary px-4 py-2 rounded-md text-sm font-semibold"
            >
              Join Now
            </a>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-white/80 hover:text-white p-1"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[var(--surface)] border-t border-white/8 animate-fade-in">
          <div className="px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`block py-2.5 px-3 rounded-md text-sm font-medium transition-colors duration-200 ${
                  isActive(link.to)
                    ? 'bg-white/8 text-white'
                    : 'text-white/65 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-white/8 flex flex-col gap-2">
              <a
                href="https://myiclubonline.com/iclub/members/signin"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 py-2.5 px-3 text-sm text-white/65 font-medium"
              >
                Member Login
              </a>
              <a href={GYM_CONFIG.phoneHref} className="flex items-center gap-2 py-2.5 px-3 text-sm text-white/60"
                data-testid="contact-click-to-call-button">
                <Phone size={14} />{GYM_CONFIG.phone}
              </a>
              <a href={GYM_CONFIG.joinUrl} target="_blank" rel="noopener noreferrer"
                className="btn-scs-primary px-4 py-2.5 rounded-md text-sm font-semibold text-center">
                Join Now
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
