import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { GYM_CONFIG } from '../config';
import { CheckCircle2, ArrowRight, Phone } from 'lucide-react';

export default function ThankYou() {
  const location = useLocation();
  const source = location.state?.source || 'website_form';

  const getMessage = () => {
    if (source === 'book_a_tour' || source === 'book_a_visit') return 'Your tour request is in.';
    if (source === 'personal_training_inquiry') return 'Your coaching inquiry is in.';
    if (source === 'contact_page') return 'Your message is in.';
    return 'We received your info.';
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />

      <section className="pt-32 pb-20 min-h-screen flex items-center">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <div className="w-14 h-14 rounded-full bg-[#1B7A4A]/15 border border-[#1B7A4A]/25 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={28} className="text-[#7FCCA6]" />
          </div>

          <h1 className="font-display text-5xl sm:text-6xl text-white tracking-wide mb-4">
            {getMessage()}
          </h1>

          <p className="text-white/55 text-base leading-relaxed mb-2">
            A coach from Santa Cruz Strength will contact you shortly
            to help you get started.
          </p>
          <p className="text-white/35 text-sm mb-10">
            We typically reach out within a few hours during staffed hours.
          </p>

          <div className="card-marketing p-6 mb-8 text-left">
            <h3 className="font-display text-xl text-white tracking-wide mb-2">READY TO START NOW?</h3>
            <p className="text-white/50 text-sm leading-relaxed mb-4">
              If you\'d like to skip the wait and get your membership started today, you can
              enroll directly through our online portal.
            </p>
            <a href={GYM_CONFIG.joinUrl} target="_blank" rel="noopener noreferrer"
              className="btn-scs-primary inline-flex items-center gap-2 px-6 py-3 rounded-md font-semibold text-sm">
              Join Online Now <ArrowRight size={14} />
            </a>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href={GYM_CONFIG.phoneHref}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-md btn-scs-secondary text-sm font-medium"
              data-testid="contact-click-to-call-button">
              <Phone size={14} className="text-[#1B7A4A]" />Call Us: {GYM_CONFIG.phone}
            </a>
            <Link to="/" className="px-5 py-2.5 text-sm text-white/40 hover:text-white transition-colors duration-200">
              Back to Home
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
