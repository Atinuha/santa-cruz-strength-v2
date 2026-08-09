import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import QuizForm from '../components/QuizForm';
import BlueprintIcon from '../components/BlueprintIcon';
import { GYM_CONFIG } from '../config';
import { photo } from '../config/media';
import MapEmbed from '../components/MapEmbed';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { trackDirectionsClick } from '../utils/analytics';

/* What a tour actually consists of. These four sentences are the ones
   already published on the homepage walkthrough section, restated here
   because this is the page where a visitor decides to ask for one.
   Nothing is added: no duration, no availability window, no promise
   about who will be on the floor, because none of that is confirmed. */
const WHAT_TO_EXPECT = [
  { icon: 'building', title: 'See the full training floor', body: 'You walk through the space and see the racks, platforms, plates and open floor.' },
  { icon: 'own-program', title: 'Ask how access works', body: 'Bring your questions about membership options and access before you decide anything.' },
  { icon: 'contact', title: 'Talk to available staff', body: 'A team member walks you through the gym and answers what they can.' },
  { icon: 'first-timer', title: 'No paperwork to visit', body: 'A tour commits you to nothing. You can leave without signing anything.' },
];

/* The site content fetch that used to live here loaded a payload this
   page never read: every string below is either business configuration
   or approved static copy. Removing it takes one request off the route
   that most needs to be fast. */
export default function Contact() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--scs-bg)' }}>
      <Navbar />

      <main id="main">
        {/* --------------------------------------------------------------
            HERO
            An operational page, so the room appears once at the top to
            say which building this is, then the page becomes a set of
            legible facts and one form.
            -------------------------------------------------------------- */}
        <section className="relative pt-16 on-dark on-photo" style={{ background: 'var(--scs-forest-deep)' }}>
          <img
            {...photo('facility', { sizes: '100vw', eager: true })}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: 'center 70%', filter: 'saturate(0.5) brightness(0.52)' }}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(6,48,31,0.88), rgba(6,48,31,0.96))' }} />
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-14 sm:pt-20 sm:pb-16">
            <h1 className="font-display mb-4" style={{ color: 'var(--scs-white)', fontSize: 'clamp(2.25rem, 5.5vw, 3.75rem)', lineHeight: 0.96 }}>
              Book a Free Facility Tour.
            </h1>
            <p className="text-base sm:text-lg max-w-xl leading-relaxed m-0" style={{ color: 'var(--scs-text-on-dark)' }}>
              Walk through the facility, see the equipment, and ask questions. A team member will walk you through everything.
            </p>
          </div>
        </section>

        <section className="py-14 sm:py-20" style={{ background: 'var(--scs-cream)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

              {/* Visit details. A definition list rather than a card stack,
                  because these are five labelled facts and that is what a
                  definition list is for. */}
              <div className="lg:col-span-5">
                <div data-testid="contact-address-block">
                  <h2 className="font-display text-2xl mb-6" style={{ color: 'var(--scs-forest)' }}>Visit us</h2>
                  <dl className="m-0">
                    <div className="flex items-start gap-3 py-4" style={{ borderTop: '1px solid var(--scs-border)' }}>
                      <MapPin size={17} className="mt-0.5 shrink-0" style={{ color: 'var(--scs-forest)' }} aria-hidden="true" />
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-1" style={{ color: 'var(--scs-text-muted)' }}>Address</dt>
                        <dd className="m-0">
                          <span className="text-base font-semibold block" style={{ color: 'var(--scs-ink)' }}>{GYM_CONFIG.address.full}</span>
                          <span className="text-sm" style={{ color: 'var(--scs-text-muted)' }}>Harvey West Business Park</span>
                        </dd>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 py-4" style={{ borderTop: '1px solid var(--scs-border)' }}>
                      <Phone size={17} className="mt-0.5 shrink-0" style={{ color: 'var(--scs-forest)' }} aria-hidden="true" />
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-1" style={{ color: 'var(--scs-text-muted)' }}>Call or text</dt>
                        <dd className="m-0">
                          <a href={GYM_CONFIG.phoneHref} data-testid="contact-click-to-call-button" className="text-base font-semibold" style={{ color: 'var(--scs-forest)' }}>{GYM_CONFIG.phone}</a>
                        </dd>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 py-4" style={{ borderTop: '1px solid var(--scs-border)' }}>
                      <Mail size={17} className="mt-0.5 shrink-0" style={{ color: 'var(--scs-forest)' }} aria-hidden="true" />
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-1" style={{ color: 'var(--scs-text-muted)' }}>Email</dt>
                        <dd className="m-0">
                          <a href={`mailto:${GYM_CONFIG.email}`} className="text-base break-all" style={{ color: 'var(--scs-forest)' }}>{GYM_CONFIG.email}</a>
                        </dd>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 py-4" data-testid="contact-hours-block" style={{ borderTop: '1px solid var(--scs-border)', borderBottom: '1px solid var(--scs-border)' }}>
                      <Clock size={17} className="mt-0.5 shrink-0" style={{ color: 'var(--scs-forest)' }} aria-hidden="true" />
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-1" style={{ color: 'var(--scs-text-muted)' }}>Hours</dt>
                        {/* Deliberately not a schedule. Three different sets of
                            hours are published across this business and none is
                            confirmed current, so this page asks rather than
                            guesses. See the note in src/config/index.js. */}
                        <dd className="text-sm m-0" style={{ color: 'var(--scs-text-muted)' }}>Contact us for current staffed hours and tour availability.</dd>
                      </div>
                    </div>
                  </dl>
                </div>

                <a
                  href={GYM_CONFIG.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackDirectionsClick('contact_page')}
                  className="btn-outline text-sm mt-6 mb-6 w-full sm:w-auto"
                >
                  <MapPin size={14} aria-hidden="true" /> Get Directions
                </a>

                <MapEmbed className="h-[280px]" />
              </div>

              {/* The form. On its own light card, on the widest column,
                  because it is the reason this route exists. */}
              <div className="lg:col-span-6 lg:col-start-7">
                <div className="p-6 sm:p-8" style={{ background: 'var(--scs-white)', border: '1px solid var(--scs-border)', borderRadius: 'var(--scs-radius-card)' }}>
                  <h2 className="font-display text-2xl mb-1" style={{ color: 'var(--scs-forest)' }}>Request Your Free Facility Tour</h2>
                  <p className="text-sm mb-6" style={{ color: 'var(--scs-text-muted)' }}>Tour requests, questions, or general inquiries.</p>
                  <QuizForm source="contact_page" noAutoFocus />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-20" style={{ background: 'var(--scs-mint)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <h2 className="font-display text-2xl sm:text-3xl mb-10" style={{ color: 'var(--scs-forest)' }}>What to expect on your visit</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {WHAT_TO_EXPECT.map((item, index) => (
                <li key={item.title} data-reveal>
                  <BlueprintIcon name={item.icon} size={52} draw className="mb-4" />
                  <h3 className="font-display-medium text-base mb-1" style={{ color: 'var(--scs-forest)' }}>{item.title}</h3>
                  <p className="text-sm leading-relaxed m-0" style={{ color: 'var(--scs-text-muted)' }}>{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
