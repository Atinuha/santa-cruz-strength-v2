import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Mail, MapPin, Phone } from 'lucide-react';
import { GYM_CONFIG } from '../config';
import { OPEN_ANALYTICS_CHOICES_EVENT } from './AnalyticsConsent';

export default function Footer() {
  return (
    <footer className="scs-footer">
      <div className="scs-shell">
        <div className="scs-footer-main">
          <div className="scs-footer-brand">
            <Link to="/" className="scs-brand scs-brand-inverse" aria-label="Santa Cruz Strength home">
              <img src="/assets/scs/logo.png" alt="" width="56" height="56" />
              <span>Santa Cruz Strength</span>
            </Link>
            <p>A local training floor for strength, coaching and community in Harvey West.</p>
            <div className="scs-social-links">
              <a href={GYM_CONFIG.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="Santa Cruz Strength on Instagram"><Instagram aria-hidden="true" /></a>
              <a href={GYM_CONFIG.social.facebook} target="_blank" rel="noopener noreferrer" aria-label="Santa Cruz Strength on Facebook"><Facebook aria-hidden="true" /></a>
            </div>
          </div>

          <div className="scs-footer-links">
            <h2>Explore</h2>
            <Link to="/join">Memberships</Link>
            <Link to="/personal-training">Personal training</Link>
            <Link to="/events">Events</Link>
            <Link to="/blog">Articles</Link>
            <Link to="/contact">Book a tour</Link>
          </div>

          <div className="scs-footer-contact">
            <h2>Visit</h2>
            <span><MapPin aria-hidden="true" />{GYM_CONFIG.address.full}</span>
            <a href={GYM_CONFIG.phoneHref}><Phone aria-hidden="true" />{GYM_CONFIG.phone}</a>
            <a href={`mailto:${GYM_CONFIG.email}`}><Mail aria-hidden="true" />{GYM_CONFIG.email}</a>
            <small>Members: 24/7 access through the app</small>
          </div>
        </div>

        <div className="scs-footer-legal">
          <p>&copy; {new Date().getFullYear()} Santa Cruz Strength</p>
          <div>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_ANALYTICS_CHOICES_EVENT))}>Privacy choices</button>
            <Link to="/staff/login">Staff login</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
