import React from 'react';
import { ArrowRight, Clock3, Mail, MapPin, Phone } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import QuizForm from '../components/QuizForm';
import PublicImage from '../components/PublicImage';
import { GYM_CONFIG } from '../config';
import { SCS_MEDIA } from '../config/media';

export default function Contact() {
  return (
    <div className="scs-site scs-subpage min-h-screen">
      <Navbar />
      <main>
        <section className="scs-subhero scs-contact-hero">
          <div className="scs-shell scs-subhero-layout">
            <div>
              <p className="scs-location-line"><MapPin size={17} aria-hidden="true" /> Harvey West, Santa Cruz</p>
              <h1>Come see the room before you decide</h1>
              <p>Request a facility tour, ask about current membership access, or contact the team directly.</p>
              <a href="#contact-form" className="scs-button scs-button-primary">Request a free tour <ArrowRight size={17} aria-hidden="true" /></a>
            </div>
            <figure>
              <PublicImage src={SCS_MEDIA.heroFacility} alt="The Santa Cruz Strength training floor in Harvey West" width="1672" height="941" />
              <figcaption>{GYM_CONFIG.address.full}</figcaption>
            </figure>
          </div>
        </section>

        <section className="scs-section scs-contact-section" aria-labelledby="visit-contact-title">
          <div className="scs-shell scs-contact-layout">
            <div className="scs-contact-details" data-testid="contact-address-block">
              <div className="scs-section-heading"><h2 id="visit-contact-title">Visit or contact the gym</h2><p>Tour times and day-pass access are arranged with the team.</p></div>
              <address>
                <span><MapPin aria-hidden="true" /><strong>{GYM_CONFIG.address.full}</strong></span>
                <a href={GYM_CONFIG.phoneHref} data-testid="contact-click-to-call-button"><Phone aria-hidden="true" /><strong>{GYM_CONFIG.phone}</strong></a>
                <a href={`mailto:${GYM_CONFIG.email}`}><Mail aria-hidden="true" /><strong>{GYM_CONFIG.email}</strong></a>
              </address>
              <div className="scs-hours" data-testid="contact-hours-block">
                <h3><Clock3 aria-hidden="true" /> Access details</h3>
                {GYM_CONFIG.hours.map((period) => (
                  <div key={period.days}><strong>{period.days}</strong><span>{period.hours}</span><small>{period.note}</small></div>
                ))}
              </div>
            </div>
            <div className="scs-map" data-testid="contact-map-embed">
              <iframe
                title="Santa Cruz Strength location"
                src={GYM_CONFIG.mapEmbedUrl}
                width="100%"
                height="100%"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </section>

        <section className="scs-section scs-membership-help" id="contact-form" aria-labelledby="contact-form-title">
          <div className="scs-shell scs-tour-layout">
            <div className="scs-tour-intro">
              <p className="scs-location-line"><Phone size={17} aria-hidden="true" /> A direct next step</p>
              <h2 id="contact-form-title">Tell us what you want to see</h2>
              <p>The team will review your request and contact you to arrange a suitable visit or answer your question.</p>
              <PublicImage src={SCS_MEDIA.communityHandshake} alt="A group of strength athletes greeting one another on the training floor" width="1448" height="1086" />
            </div>
            <div className="scs-tour-form-panel"><QuizForm source="contact_page" noAutoFocus /></div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
