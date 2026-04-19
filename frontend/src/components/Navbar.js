import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { GYM_CONFIG } from '../config';
import { Menu, X, Phone } from 'lucide-react';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_f0e6860d-0e81-45b1-9e0b-f7bb6a04df72/artifacts/uf08gcdo_20260313_151045_0000.png';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const isActive = (p) => pathname === p;

  // 5 clean links — logo already handles "Home"
  const links = [
    { to: '/join',              label: 'Membership' },
    { to: '/personal-training', label: 'Training' },
    { to: '/about',             label: 'About' },
    { to: '/events',            label: 'Events' },
    { to: '/blog',              label: 'Blog' },
    { to: '/contact',           label: 'Contact' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/92 backdrop-blur-md border-b border-[var(--clr-border)]"
      style={{ boxShadow: '0 2px 20px rgba(13,93,62,0.06)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* Logo → Home */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-[var(--clr-green)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200" style={{ padding: '3px' }}>
              <img src={LOGO_URL} alt="SCS" className="w-full h-full object-contain"
                style={{ filter: 'brightness(0) invert(1)' }} />
            </div>
            <span className="font-display text-[var(--clr-green)] text-lg tracking-wider hidden sm:block">
              SANTA CRUZ STRENGTH
            </span>
            <span className="font-display text-[var(--clr-green)] text-base tracking-wider block sm:hidden">
              SCS
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-0.5">
            {links.map(l => (
              <Link key={l.to} to={l.to}
                className={`px-3 py-2 rounded-lg text-sm font-bold transition-all duration-200 whitespace-nowrap ${
                  isActive(l.to)
                    ? 'bg-[var(--clr-bg-green)] text-[var(--clr-green)]'
                    : 'text-[var(--clr-text-muted)] hover:text-[var(--clr-green)] hover:bg-[var(--clr-seafoam)]/40'
                }`}>
                {l.label}
              </Link>
            ))}
          </div>

          {/* Right side — phone + Join Now only (clean) */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <a href={GYM_CONFIG.phoneHref}
              className="flex items-center gap-1.5 text-sm font-semibold text-[var(--clr-text-muted)] hover:text-[var(--clr-green)] transition-colors duration-200 px-2 py-1.5 rounded-lg hover:bg-[var(--clr-seafoam)]/40">
              <Phone size={13} />
              <span className="hidden lg:block">{GYM_CONFIG.phone}</span>
            </a>
            <Link to="/join"
              data-testid="navbar-join-btn"
              className="btn-primary px-5 py-2 text-sm">
              Join Now
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden p-2 rounded-xl text-[var(--clr-green)] hover:bg-[var(--clr-seafoam)]/40 transition-colors duration-200"
            onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden bg-white border-t border-[var(--clr-border)] animate-fade-in">
          <div className="px-4 py-4 space-y-1">
            {links.map(l => (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)}
                className={`block px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                  isActive(l.to)
                    ? 'bg-[var(--clr-bg-green)] text-[var(--clr-green)]'
                    : 'text-[var(--clr-text)] hover:bg-[var(--clr-seafoam)]/40 hover:text-[var(--clr-green)]'
                }`}>
                {l.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-[var(--clr-border)] flex flex-col gap-2">
              <a href="https://myiclubonline.com/iclub/members/signin" target="_blank" rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="block px-4 py-2.5 rounded-xl text-sm font-semibold text-[var(--clr-text-muted)] hover:bg-[var(--clr-seafoam)]/40">
                Member Portal →
              </a>
              <a href={GYM_CONFIG.phoneHref}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-[var(--clr-text-muted)]">
                <Phone size={14} /> {GYM_CONFIG.phone}
              </a>
              <Link to="/join"
                onClick={() => setOpen(false)}
                className="btn-primary w-full text-center text-sm py-3 block">
                Join Now
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
