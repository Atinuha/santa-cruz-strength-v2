import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { GYM_CONFIG } from '../config';
import { CheckCircle2, ArrowRight, Phone } from 'lucide-react';

export default function ThankYou() {
  const location = useLocation();
  const source = location.state?.source || 'website_form';

  const getSourceLabel = () => {
    if (source === 'book_a_visit') return 'We received your visit request';
    if (source === 'personal_training_inquiry') return 'We received your personal training inquiry';
    if (source === 'contact_page') return 'We received your message';
    return 'We received your info';
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />

      <section className="pt-32 pb-20 min-h-screen flex items-center">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-green-600/15 border border-green-500/25 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={32} className="text-green-400" />
          </div>

          <h1 className="font-display text-5xl sm:text-6xl text-white tracking-wide mb-4">
            YOU'RE ALL SET!
          </h1>

          <p className="text-white/65 text-base leading-relaxed mb-3">
            {getSourceLabel()}. A coach from Santa Cruz Strength will contact you shortly to help you get started.
          </p>

          <p className="text-white/40 text-sm mb-10">
            Keep an eye on your phone and email — we typically reach out within a few hours during business hours.
          </p>

          {/* Divider */}
          <div className="card-marketing p-6 mb-8 text-left">
            <h3 className="font-display text-xl text-white tracking-wide mb-3">READY TO START NOW?</h3>
            <p className="text-white/55 text-sm leading-relaxed mb-4">
              If you'd like to skip the wait and get your membership started today, you can enroll directly through our online portal.
            </p>
            <a
              href={GYM_CONFIG.joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-scs-primary inline-flex items-center gap-2 px-6 py-3 rounded-md font-semibold text-sm"
            >
              Join Online Now <ArrowRight size={15} />
            </a>
          </div>

          {/* Quick contact */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={GYM_CONFIG.phoneHref}
              className="flex items-center gap-2 px-5 py-2.5 rounded-md btn-scs-secondary text-sm font-medium"
              data-testid="contact-click-to-call-button"
            >
              <Phone size={15} className="text-[#D32F2F]" />
              Call Us: {GYM_CONFIG.phone}
            </a>
            <Link
              to="/"
              className="px-5 py-2.5 text-sm text-white/50 hover:text-white transition-colors duration-200"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
