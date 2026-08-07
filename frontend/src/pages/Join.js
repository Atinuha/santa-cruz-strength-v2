import React from 'react';
import { ArrowRight, Check, Clock3, Dumbbell, ShieldCheck } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import QuizForm from '../components/QuizForm';
import PublicImage from '../components/PublicImage';
import { SCS_MEDIA } from '../config/media';

import { MEMBERSHIP_TIERS, MEMBERSHIP_FEE_NOTE } from '../config';

// Tiers, prices, terms and plan links all come from config. This page decides
// only which of them to feature, never what they say.
const FEATURED_IDS = ['daypass', 'huscler-12', 'annual'];
const PLANS = MEMBERSHIP_TIERS.filter((tier) => FEATURED_IDS.includes(tier.id));
const MORE_PLANS = MEMBERSHIP_TIERS.filter((tier) => !FEATURED_IDS.includes(tier.id));

export default function Join() {
  return (
    <div className="scs-site scs-subpage min-h-screen">
      <Navbar />
      <main>
        <section className="scs-subhero scs-membership-hero">
          <div className="scs-shell scs-subhero-layout">
            <div>
              <p className="scs-location-line"><ShieldCheck size={17} aria-hidden="true" /> Current membership options</p>
              <h1>Choose access that matches how you train</h1>
              <p>Compare the current prices, access and commitment terms before opening the gym's membership checkout.</p>
              <a href="#membership-options" className="scs-button scs-button-primary">Compare memberships <ArrowRight size={17} aria-hidden="true" /></a>
            </div>
            <figure>
              <PublicImage src={SCS_MEDIA.heroFacility} alt="Racks, platforms and free weights across a strength-focused training floor" width="1672" height="941" />
              <figcaption>Members receive 24/7 facility access through the app. Day-pass access is different.</figcaption>
            </figure>
          </div>
        </section>

        <section className="scs-section" id="membership-options" aria-labelledby="membership-title">
          <div className="scs-shell">
            <div className="scs-section-heading scs-section-heading-wide">
              <h2 id="membership-title">Current membership paths</h2>
              <p>Online enrollment opens the gym's current membership checkout in a new tab.</p>
            </div>
            <div className="scs-plan-grid">
              {PLANS.map((plan) => (
                <article key={plan.id} className={`scs-plan ${plan.featured ? 'scs-plan-featured' : ''}`} data-testid={`plan-${plan.id}`}>
                  {plan.tag && <span className="scs-plan-label">{plan.tag}</span>}
                  <h3>{plan.name}</h3>
                  <div className="scs-plan-price"><strong>{plan.price}</strong><span>{plan.cadence}</span></div>
                  {plan.subtitle && <p>{plan.subtitle}</p>}
                  {plan.note && <p className="scs-plan-note-inline">{plan.note}</p>}
                  <ul>
                    {plan.terms.map((term) => <li key={term}><Check aria-hidden="true" />{term}</li>)}
                  </ul>
                  <a href={plan.link} target="_blank" rel="noopener noreferrer" className="scs-button scs-button-primary" data-testid={`join-${plan.id}`}>
                    {plan.action} <ArrowRight size={16} aria-hidden="true" />
                  </a>
                </article>
              ))}
            </div>
            <p className="scs-plan-note">Membership terms shown here reflect the current website source. Confirm the agreement presented in checkout before purchasing.</p>
          </div>
        </section>

        <section className="scs-section scs-more-memberships" aria-labelledby="more-memberships-title">
          <div className="scs-shell">
            <div className="scs-section-heading">
              <h2 id="more-memberships-title">More ways to join</h2>
              <p>Flexible, couples and weekend options currently available through the same membership checkout.</p>
            </div>
            <div className="scs-membership-list">
              {MORE_PLANS.map((tier) => (
                <article key={tier.id} className="scs-membership-row">
                  <Dumbbell aria-hidden="true" />
                  <span><strong>{tier.name}</strong><small>{[tier.subtitle, tier.note].filter(Boolean).join(' · ')}</small></span>
                  <b>{tier.price} {tier.cadence}</b>
                  <a href={tier.link} target="_blank" rel="noopener noreferrer" className="scs-plan-review-link" data-testid={`review-${tier.id}`}>
                    Review this plan <ArrowRight size={16} aria-hidden="true" />
                  </a>
                </article>
              ))}
            </div>
            <p className="scs-plan-note">{MEMBERSHIP_FEE_NOTE}</p>
          </div>
        </section>

        <section className="scs-section scs-membership-help" aria-labelledby="membership-help-title">
          <div className="scs-shell scs-tour-layout">
            <div className="scs-tour-intro">
              <p className="scs-location-line"><Clock3 size={17} aria-hidden="true" /> Decide after you see the room</p>
              <h2 id="membership-help-title">Not sure which option fits?</h2>
              <p>Request a free facility tour. The team can answer questions about access, day passes and current agreements before you choose.</p>
              <PublicImage src={SCS_MEDIA.barLoading} alt="A lifter preparing a loaded barbell on a training platform" width="1122" height="1402" />
            </div>
            <div className="scs-tour-form-panel"><QuizForm source="membership_page" noAutoFocus /></div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
