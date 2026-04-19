import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import QuizForm from '../components/QuizForm';
import { GYM_CONFIG } from '../config';
import { getSiteContent } from '../lib/api';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

export default function Contact() {
  const [c, setC] = useState({});
  useEffect(() => { getSiteContent().then(({ data }) => setC(data)).catch(() => {}); }, []);
  const g = (key, fallback) => c[key] || fallback;

  return (
    <div className="min-h-screen" style={{ background: 'var(--clr-bg)' }}>
      <Navbar />
      <section className="pt-28 pb-10 bg-white border-b" style={{ borderColor: 'var(--clr-border)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <span className="green-accent-line" />
          <p className="text-[var(--clr-green)] text-xs font-bold uppercase tracking-widest mb-3">Get In Touch</p>
          <h1 className="font-display text-5xl sm:text-6xl tracking-wide mb-3" style={{ color: 'var(--clr-charcoal)' }}>{g('contact_headline', 'CONTACT US')}</h1>
          <p className="text-[var(--clr-text-muted)] text-base max-w-lg font-semibold">{g('contact_subtitle', 'Questions, tour requests, or just want to know more.')}</p>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <div className="card-light p-6 mb-5" data-testid="contact-address-block">
                <h3 className="font-display text-xl tracking-wide mb-5" style={{ color: 'var(--clr-green)' }}>VISIT US</h3>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <MapPin size={17} style={{ color: 'var(--clr-green)', marginTop: 2 }} className="shrink-0" />
                    <div>
                      <p className="text-[var(--clr-charcoal)] text-sm font-bold">{GYM_CONFIG.address.full}</p>
                      <p className="text-[var(--clr-text-light)] text-xs mt-0.5">Harvey West Business Park</p>
                    </div>
                  </li>
                  <li>
                    <a href={GYM_CONFIG.phoneHref} data-testid="contact-click-to-call-button" className="flex items-center gap-3 group">
                      <Phone size={17} style={{ color: 'var(--clr-green)' }} />
                      <span className="font-bold text-[var(--clr-charcoal)] text-sm group-hover:text-[var(--clr-green)] transition-colors">{GYM_CONFIG.phone}</span>
                    </a>
                  </li>
                  <li>
                    <a href={`mailto:${GYM_CONFIG.email}`} className="flex items-center gap-3 group">
                      <Mail size={17} style={{ color: 'var(--clr-green)' }} />
                      <span className="text-[var(--clr-text-muted)] text-sm group-hover:text-[var(--clr-green)] transition-colors">{GYM_CONFIG.email}</span>
                    </a>
                  </li>
                </ul>
              </div>
              <div className="card-light p-6" data-testid="contact-hours-block">
                <div className="flex items-center gap-2 mb-4">
                  <Clock size={15} style={{ color: 'var(--clr-green)' }} />
                  <h3 className="text-[var(--clr-charcoal)] font-bold text-xs uppercase tracking-wider">Access & Hours</h3>
                </div>
                <ul className="space-y-3">
                  {GYM_CONFIG.hours.map((h, i) => (
                    <li key={i} className="py-2 border-b last:border-0" style={{ borderColor: 'var(--clr-border)' }}>
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--clr-text-muted)] font-semibold">{h.days}</span>
                        <span className="text-[var(--clr-charcoal)] font-bold">{h.hours}</span>
                      </div>
                      {h.note && <p className="text-[var(--clr-text-light)] text-xs mt-0.5 text-right">{h.note}</p>}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-5 rounded-[var(--radius-lg)] overflow-hidden h-56" style={{ boxShadow: 'var(--shadow-sm)', border: '1px solid var(--clr-border)' }} data-testid="contact-map-embed">
                <iframe title="Santa Cruz Strength Location Map"
                  src="https://maps.google.com/maps?q=151+Harvey+West+Blvd+Ste+D+Santa+Cruz+CA+95060&output=embed"
                  width="100%" height="100%" style={{ border: 0 }}
                  allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              </div>
            </div>
            <div className="card-light p-6">
              <h2 className="font-display text-2xl tracking-wide mb-2" style={{ color: 'var(--clr-green)' }}>{g('contact_form_headline', 'REACH OUT')}</h2>
              <p className="text-[var(--clr-text-muted)] text-sm mb-5">{g('contact_form_subtitle', 'Fill out the form and we will get back to you within 24 hours.')}</p>
              <QuizForm source="contact_page" />
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
