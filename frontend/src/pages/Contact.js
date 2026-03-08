import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import LeadForm from '../components/LeadForm';
import { GYM_CONFIG } from '../config';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

export default function Contact() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />

      {/* Header */}
      <section className="pt-32 pb-12 bg-[#111214] border-b border-white/6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <span className="red-accent-line" />
          <p className="text-[#D32F2F] text-xs font-semibold uppercase tracking-widest mb-3">Get In Touch</p>
          <h1 className="font-display text-5xl sm:text-6xl text-white tracking-wide mb-3">
            CONTACT US
          </h1>
          <p className="text-white/55 text-base max-w-lg">
            Questions, tour requests, or just want to know more about the gym — we're here to help.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Contact Info */}
            <div>
              <div className="card-marketing p-6 mb-5" data-testid="contact-address-block">
                <h3 className="font-display text-xl text-white tracking-wide mb-5">VISIT US</h3>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <MapPin size={18} className="text-[#D32F2F] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-white text-sm font-medium">{GYM_CONFIG.address.full}</p>
                      <p className="text-white/40 text-xs mt-0.5">Harvey West Business Park</p>
                    </div>
                  </li>
                  <li>
                    <a
                      href={GYM_CONFIG.phoneHref}
                      data-testid="contact-click-to-call-button"
                      className="flex items-center gap-3 group"
                    >
                      <Phone size={18} className="text-[#D32F2F]" />
                      <span className="text-white group-hover:text-[#D32F2F] transition-colors duration-200 text-sm font-medium">
                        {GYM_CONFIG.phone}
                      </span>
                    </a>
                  </li>
                  <li>
                    <a
                      href={`mailto:${GYM_CONFIG.email}`}
                      className="flex items-center gap-3 group"
                    >
                      <Mail size={18} className="text-[#D32F2F]" />
                      <span className="text-white/70 group-hover:text-white transition-colors duration-200 text-sm">
                        {GYM_CONFIG.email}
                      </span>
                    </a>
                  </li>
                </ul>
              </div>

              <div className="card-marketing p-6" data-testid="contact-hours-block">
                <div className="flex items-center gap-2 mb-4">
                  <Clock size={16} className="text-[#D32F2F]" />
                  <h3 className="text-white font-semibold text-sm uppercase tracking-wider">Hours of Operation</h3>
                </div>
                <ul className="space-y-2">
                  {GYM_CONFIG.hours.map((h, i) => (
                    <li key={i} className="flex justify-between text-sm py-1 border-b border-white/5 last:border-0">
                      <span className="text-white/55">{h.days}</span>
                      <span className="text-white font-medium">{h.hours}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-white/30 text-xs mt-4">*Hours subject to change on holidays</p>
              </div>

              {/* Map */}
              <div className="mt-5 rounded-xl overflow-hidden border border-white/8 h-56" data-testid="contact-map-embed">
                <iframe
                  title="Santa Cruz Strength Location Map"
                  src="https://maps.google.com/maps?q=151+Harvey+West+Blvd+Ste+D+Santa+Cruz+CA+95060&output=embed"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>

            {/* Contact Form */}
            <div className="card-marketing p-6">
              <h2 className="font-display text-2xl text-white tracking-wide mb-2">SEND US A MESSAGE</h2>
              <p className="text-white/50 text-sm mb-5">Fill out the form and we'll get back to you within 24 hours.</p>
              <LeadForm source="contact_page" />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
