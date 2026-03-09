import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { GYM_CONFIG } from '../config';
import { CheckCircle2, ArrowRight, Phone } from 'lucide-react';

export default function ThankYou() {
  const { state } = useLocation();
  const source = state?.source || 'website_form';
  const msg = source === 'book_a_tour' || source === 'book_a_visit'
    ? "Your tour request is in."
    : source === 'personal_training_inquiry' ? 'Your coaching inquiry is in.'
    : source === 'contact_page' ? 'Your message is in.'
    : 'We received your info.';
  return (
    <div className="min-h-screen" style={{ background: 'var(--clr-bg)' }}>
      <Navbar />
      <section className="pt-32 pb-20 min-h-screen flex items-center">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--clr-bg-green)] flex items-center justify-center mx-auto mb-6" style={{ border: '2px solid var(--clr-border-green)' }}>
            <CheckCircle2 size={32} style={{ color: 'var(--clr-green)' }} />
          </div>
          <h1 className="font-display text-5xl sm:text-6xl tracking-wide mb-4" style={{ color: 'var(--clr-charcoal)' }}>YOU ARE ALL SET!</h1>
          <p className="text-[var(--clr-text)] text-base leading-relaxed mb-2 font-semibold">{msg}</p>
          <p className="text-[var(--clr-text-muted)] text-sm mb-10">A coach from Santa Cruz Strength will contact you shortly.</p>
          <div className="card-light p-6 mb-8 text-left">
            <h3 className="font-display text-xl tracking-wide mb-2" style={{ color: 'var(--clr-green)' }}>READY TO START NOW?</h3>
            <p className="text-[var(--clr-text-muted)] text-sm leading-relaxed mb-4">Skip the wait and enroll directly through our online portal.</p>
            <a href={GYM_CONFIG.joinUrl} target="_blank" rel="noopener noreferrer"
              className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-sm">
              Join Online Now <ArrowRight size={14} />
            </a>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href={GYM_CONFIG.phoneHref} className="btn-outline-green inline-flex items-center gap-2 px-5 py-2.5 text-sm"
              data-testid="contact-click-to-call-button">
              <Phone size={14} />Call Us: {GYM_CONFIG.phone}
            </a>
            <Link to="/" className="px-5 py-2.5 text-sm font-semibold text-[var(--clr-text-muted)] hover:text-[var(--clr-green)] transition-colors duration-200">
              Back to Home
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
