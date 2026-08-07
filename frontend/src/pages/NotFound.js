import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function NotFound() {
  return (
    <div className="scs-site min-h-screen" style={{ background: 'var(--clr-bg)' }}>
      <Navbar />
      <main id="main-content" className="min-h-[75vh] flex items-center pt-28 pb-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--clr-green)] mb-3">
            Page not found
          </p>
          <h1 className="font-display text-5xl sm:text-6xl tracking-wide text-[var(--clr-charcoal)] mb-4">
            THIS PAGE IS NOT HERE
          </h1>
          <p className="text-[var(--clr-text-muted)] leading-relaxed mb-8">
            The address may have changed. Return home or review current membership options.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/" className="btn-primary px-6 py-3 text-sm" data-testid="not-found-home-link">
              Return Home
            </Link>
            <Link to="/join" className="btn-outline-green px-6 py-3 text-sm" data-testid="not-found-membership-link">
              View Memberships
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
