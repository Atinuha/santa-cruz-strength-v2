import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BlueprintIcon from '../components/BlueprintIcon';
import { GYM_CONFIG } from '../config';

/* A 404 is still a page of this website, so it gets the same field
   system and the same routes out rather than a centred apology. The
   links are the four a lost visitor actually wants. */
export default function NotFound() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--scs-bg)' }}>
      <Navbar />
      <main id="main">
        <section className="pt-32 pb-20 min-h-[70vh] flex items-center" style={{ background: 'var(--scs-cream)' }} data-testid="not-found-page">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 w-full">
            <BlueprintIcon name="own-program" size={72} className="mb-8" />
            <h1 className="font-display mb-4" style={{ color: 'var(--scs-forest)', fontSize: 'clamp(2rem, 5vw, 3.25rem)', lineHeight: 0.98 }}>
              This page does not exist
            </h1>
            <p className="text-base mb-9 max-w-[58ch]" style={{ color: 'var(--scs-text-muted)' }}>
              The address you followed has moved or was never here. The gym is still exactly where it was.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <Link to="/" data-testid="not-found-home-link" className="btn-primary px-7 text-sm">Back to the gym</Link>
              <Link to="/contact#tour-request" data-testid="not-found-contact-link" className="btn-outline px-7 text-sm">Book a Free Facility Tour</Link>
            </div>
            <ul className="flex flex-wrap gap-x-8 gap-y-2 pt-6 mb-8" style={{ borderTop: '1px solid var(--scs-border)' }}>
              <li><Link to="/join" className="text-sm font-semibold" style={{ color: 'var(--scs-forest)' }}>Membership and pricing</Link></li>
              <li><Link to="/personal-training" className="text-sm font-semibold" style={{ color: 'var(--scs-forest)' }}>Personal training</Link></li>
              <li><Link to="/blog" className="text-sm font-semibold" style={{ color: 'var(--scs-forest)' }}>Articles</Link></li>
              <li><Link to="/events" className="text-sm font-semibold" style={{ color: 'var(--scs-forest)' }}>Events</Link></li>
            </ul>
            <p className="text-sm m-0" style={{ color: 'var(--scs-text-muted)' }}>
              {GYM_CONFIG.address.full} &middot; {GYM_CONFIG.phone}
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
