import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { GYM_CONFIG } from '../config';

export default function NotFound() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--scs-bg)' }}>
      <Navbar />
      <section className="pt-32 pb-20 min-h-[70vh] flex items-center" data-testid="not-found-page">
        <div className="max-w-lg mx-auto px-4 sm:px-6 text-center">
          <p className="font-display text-7xl mb-3" style={{ color: 'var(--scs-stone)', opacity: 0.3 }}>404</p>
          <h1 className="font-display text-2xl sm:text-3xl mb-3" style={{ color: 'var(--scs-charcoal)' }}>
            Page Not Found
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--scs-text-muted)' }}>
            This page does not exist or has been moved.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/" data-testid="not-found-home-link" className="btn-primary px-6 py-3 text-sm">Back to Home</Link>
            <Link to="/contact" data-testid="not-found-contact-link" className="btn-outline px-6 py-3 text-sm">Book a Free Facility Tour</Link>
          </div>
          <p className="text-xs mt-8" style={{ color: 'var(--scs-text-light)' }}>
            {GYM_CONFIG.address.full} &middot; {GYM_CONFIG.phone}
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
}
