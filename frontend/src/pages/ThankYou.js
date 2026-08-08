import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { GYM_CONFIG } from '../config';
import { Check, ArrowRight, Phone } from 'lucide-react';
import { trackThankYouPageView } from '../utils/analytics';

export default function ThankYou() {
  const { state } = useLocation();
  const source = state?.source || 'website_form';

  useEffect(() => {
    document.title = 'Tour Request Saved | Santa Cruz Strength';
    trackThankYouPageView();
  }, []);

  return (
    <div className="min-h-screen" style={{ background: 'var(--scs-bg)' }}>
      <Navbar />
      <section className="pt-32 pb-20 min-h-[70vh] flex items-center" data-testid="thank-you">
        <div className="max-w-lg mx-auto px-4 sm:px-6 text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: 'var(--scs-chalk)', border: '1px solid var(--scs-border)' }}>
            <Check size={24} style={{ color: 'var(--scs-charcoal)' }} />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl mb-4" style={{ color: 'var(--scs-charcoal)' }}>
            Thanks. Your tour request is saved.
          </h1>
          <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--scs-text-muted)' }}>
            A team member will follow up using the details you provided.
          </p>

          <div className="p-5 mb-6 text-left" style={{ background: 'var(--scs-warm-white)', border: '1px solid var(--scs-border)', borderRadius: 'var(--scs-radius)' }}>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--scs-charcoal)' }}>Ready to compare memberships?</p>
            <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--scs-text-muted)' }}>Browse plans while you wait.</p>
            <Link to="/join" className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm">
              Compare Memberships <ArrowRight size={14} />
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href={GYM_CONFIG.phoneHref} className="btn-outline inline-flex items-center gap-2 px-5 py-2.5 text-sm" data-testid="contact-click-to-call-button">
              <Phone size={14} />Call Santa Cruz Strength
            </a>
            <Link to="/" className="px-5 py-2.5 text-sm font-medium transition-colors duration-180" style={{ color: 'var(--scs-text-muted)' }}>
              Back to Home
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
