import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import QuizForm from '../components/QuizForm';
import { GYM_CONFIG } from '../config';
import MapEmbed from '../components/MapEmbed';
import { getSiteContent } from '../lib/api';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

export default function Contact() {
  const [c, setC] = useState({});
  useEffect(() => {
    document.title = 'Book a Free Facility Tour | Santa Cruz Strength';
    getSiteContent().then(({ data }) => setC(data)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen" style={{ background: 'var(--scs-bg)' }}>
      <Navbar />
      <section className="pt-28 pb-8" style={{ background: 'var(--scs-chalk)', borderBottom: '1px solid var(--scs-border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] mb-3" style={{ color: 'var(--scs-stone)' }}>Free Facility Tour</p>
          <h1 className="font-display text-3xl sm:text-4xl mb-3" style={{ color: 'var(--scs-charcoal)' }}>
            Book a Free Facility Tour.
          </h1>
          <p className="text-sm max-w-md" style={{ color: 'var(--scs-text-muted)' }}>
            Walk through the facility, see the equipment, and ask questions. A team member will walk you through everything.
          </p>
        </div>
      </section>

      <section className="py-14 sm:py-18">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <div className="p-6 mb-5" style={{ background: 'var(--scs-warm-white)', border: '1px solid var(--scs-border)', borderRadius: 'var(--scs-radius)' }} data-testid="contact-address-block">
                <h2 className="font-display-medium text-base mb-4" style={{ color: 'var(--scs-charcoal)' }}>Visit Us</h2>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <MapPin size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--scs-stone)' }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--scs-charcoal)' }}>{GYM_CONFIG.address.full}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--scs-text-light)' }}>Harvey West Business Park</p>
                    </div>
                  </li>
                  <li><a href={GYM_CONFIG.phoneHref} data-testid="contact-click-to-call-button" className="flex items-center gap-3 group"><Phone size={15} style={{ color: 'var(--scs-stone)' }} /><span className="text-sm font-semibold group-hover:opacity-70 transition-opacity duration-180" style={{ color: 'var(--scs-charcoal)' }}>{GYM_CONFIG.phone}</span></a></li>
                  <li><a href={`mailto:${GYM_CONFIG.email}`} className="flex items-center gap-3 group"><Mail size={15} style={{ color: 'var(--scs-stone)' }} /><span className="text-sm group-hover:opacity-70 transition-opacity duration-180" style={{ color: 'var(--scs-text-muted)' }}>{GYM_CONFIG.email}</span></a></li>
                </ul>
              </div>
              <div className="p-6" style={{ background: 'var(--scs-warm-white)', border: '1px solid var(--scs-border)', borderRadius: 'var(--scs-radius)' }} data-testid="contact-hours-block">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={13} style={{ color: 'var(--scs-stone)' }} />
                  <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--scs-charcoal)' }}>Hours</h3>
                </div>
                <p className="text-sm" style={{ color: 'var(--scs-text-muted)' }}>
                  Contact us for current staffed hours and tour availability.
                </p>
              </div>
              <div className="mt-5"><MapEmbed className="h-[260px]" /></div>
            </div>
            <div className="p-6" style={{ background: 'var(--scs-warm-white)', border: '1px solid var(--scs-border)', borderRadius: 'var(--scs-radius)' }}>
              <h2 className="font-display-medium text-base mb-1" style={{ color: 'var(--scs-charcoal)' }}>Request Your Free Facility Tour</h2>
              <p className="text-sm mb-5" style={{ color: 'var(--scs-text-muted)' }}>Tour requests, questions, or general inquiries.</p>
              <QuizForm source="contact_page" noAutoFocus />
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
