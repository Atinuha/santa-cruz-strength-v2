import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Dumbbell,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
  Users,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import QuizForm from '../components/QuizForm';
import PublicImage from '../components/PublicImage';
import { GYM_CONFIG } from '../config';
import { SCS_MEDIA } from '../config/media';
import { getSiteContent } from '../lib/api';
import { trackBookTourClick, trackJoinNowClick } from '../utils/analytics';
import '../scs-ledger.css';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';
const PREVIEW_MODE = process.env.REACT_APP_PREVIEW_MODE === 'true';

const MEDIA = {
  facility: SCS_MEDIA.heroFacility,
  lift: SCS_MEDIA.deadliftEffort,
  podium: SCS_MEDIA.openGym,
  community: SCS_MEDIA.communityFloor,
  coach: SCS_MEDIA.coachingFloor,
};

const TESTIMONIALS = [
  {
    name: 'Jeremy Ball',
    detail: 'Member review',
    text: 'Hands down best gym in Santa Cruz if you are serious about powerlifting or bodybuilding. Open 24/7, with everything you need to get stronger.',
  },
  {
    name: 'Ella Desmond',
    detail: 'Member review',
    text: 'I was greeted with the most amazing community. The people here are kind, supportive, and always happy to spot you and give tips.',
  },
  {
    name: 'Brooke Rodriguez',
    detail: 'Member review',
    text: 'Amazing gym. It has everything you need with a super open and accepting environment. The gym is roomy and in a perfect location.',
  },
];

const FAQ_ITEMS = [
  {
    question: 'Can I visit before I join?',
    answer: 'Yes. Request a free facility tour and the team will follow up to arrange a suitable time. There is no membership commitment for the tour.',
  },
  {
    question: 'Do members have 24/7 access?',
    answer: 'Current full memberships include 24/7 facility access through the member app. Day-pass and staffed access are different, so review the current details before visiting.',
  },
  {
    question: 'Is personal training available?',
    answer: 'Yes. Use the personal training page to review the coaching path and send an inquiry about your goals.',
  },
  {
    question: 'What kind of equipment is on the floor?',
    answer: 'The current facility includes racks, platforms, barbells, plates, specialty bars, dumbbells and conditioning equipment. A tour is the best way to confirm the exact setup you need.',
  },
];

function TourLink({ className = '', children = 'Book a free tour', location = 'homepage' }) {
  return (
    <a
      href="#tour-form"
      className={className}
      onClick={(event) => {
        event.preventDefault();
        trackBookTourClick(location);
        document.getElementById('tour-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }}
    >
      {children}
    </a>
  );
}

export default function Home() {
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [content, setContent] = useState({});

  useEffect(() => {
    if (BACKEND) {
      fetch(`${BACKEND}/api/events?upcoming=true`)
        .then((response) => response.json())
        .then((data) => setUpcomingEvents((data || []).slice(0, 2)))
        .catch(() => {});
    }
    if (!PREVIEW_MODE) getSiteContent().then(({ data }) => setContent(data)).catch(() => {});
  }, []);

  const getCopy = (key, fallback) => content[key] || fallback;

  return (
    <div className="scs-site scs-ledger min-h-screen" data-design-seed="scs-open-training-ledger-v2">
      <Navbar />
      <main id="scs-home-main">
        <section className="scs-hero" aria-labelledby="scs-home-title">
          <div className="scs-shell scs-hero-layout">
            <div className="scs-hero-copy">
              <p className="scs-location-line"><MapPin size={17} aria-hidden="true" /> Harvey West, Santa Cruz</p>
              <h1 id="scs-home-title">
                {getCopy('home_hero_headline_v2', 'A stronger place to train. A better place to belong.')}
              </h1>
              <p className="scs-hero-lead">
                {getCopy('home_hero_subtitle_v2', 'Serious strength equipment, personal coaching and a community that notices when you show up.')}
              </p>
              <div className="scs-hero-actions">
                <TourLink className="scs-button scs-button-primary" location="hero">
                  Book a free tour <ArrowRight size={18} aria-hidden="true" />
                </TourLink>
                <Link
                  to="/join"
                  className="scs-button scs-button-secondary"
                  onClick={() => trackJoinNowClick('hero')}
                >
                  See memberships
                </Link>
              </div>
              <p className="scs-friction-copy">See the room, ask questions and decide without pressure.</p>
            </div>

            <figure className="scs-hero-media">
              <PublicImage
                src={MEDIA.facility}
                alt="Santa Cruz Strength training floor with racks, platforms, barbells and free weights"
                width="1672"
                height="941"
                fetchPriority="high"
              />
              <figcaption>
                <strong>151 Harvey West Blvd, Suite D</strong>
                <span>Members: 24/7 access through the app</span>
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="scs-fact-band" aria-label="Facility facts">
          <div className="scs-shell scs-fact-grid">
            <div><Clock3 aria-hidden="true" /><span><strong>24/7 member access</strong>Through the member app</span></div>
            <div><Dumbbell aria-hidden="true" /><span><strong>Strength-first floor</strong>Racks, platforms and free weights</span></div>
            <div><Users aria-hidden="true" /><span><strong>Coaching available</strong>Personal training for a clear starting path</span></div>
          </div>
        </section>

        <section className="scs-section scs-room" aria-labelledby="room-title">
          <div className="scs-shell">
            <div className="scs-section-heading">
              <h2 id="room-title">Built for training, not posing</h2>
              <p>The room is the proof. Tour the equipment, meet the people and decide whether it supports the work you want to do.</p>
            </div>
            <div className="scs-room-layout">
              <div className="scs-room-image">
                <PublicImage src={MEDIA.lift} alt="A strength athlete deadlifting on a platform while a group offers support" width="1122" height="1402" />
              </div>
              <div className="scs-room-copy">
                <h3>What you can evaluate on a tour</h3>
                <ul className="scs-check-list">
                  <li><Check aria-hidden="true" /> The racks, platforms, bars and loading space</li>
                  <li><Check aria-hidden="true" /> How the room feels during an actual training session</li>
                  <li><Check aria-hidden="true" /> Membership access, current hours and day-pass details</li>
                  <li><Check aria-hidden="true" /> Whether personal training fits your goals</li>
                </ul>
                <div className="scs-inline-actions">
                  <TourLink className="scs-text-link" location="room">Arrange a facility tour <ArrowRight size={17} aria-hidden="true" /></TourLink>
                  <Link className="scs-text-link scs-text-link-muted" to="/personal-training">Explore personal training</Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="scs-section scs-community" aria-labelledby="community-title">
          <div className="scs-shell scs-community-layout">
            <div className="scs-community-copy">
              <h2 id="community-title">Strong people help each other get stronger</h2>
              <p>Santa Cruz Strength is serious about training without making the room feel anonymous. Members describe a supportive place where people spot, share advice and celebrate the work.</p>
              <blockquote>
                “The people here are kind and supportive and are always happy to spot you and give tips.”
                <cite>Ella Desmond, member review</cite>
              </blockquote>
              <Link to="/about" className="scs-text-link">Meet the gym <ArrowRight size={17} aria-hidden="true" /></Link>
            </div>
            <div className="scs-photo-pair" aria-label="Santa Cruz Strength community photographs">
              <PublicImage src={MEDIA.community} alt="A group sharing a light moment between training sessions" width="1672" height="941" />
              <PublicImage src={MEDIA.podium} alt="An active open-gym floor with lifters training together" width="1672" height="941" />
            </div>
          </div>
        </section>

        <section className="scs-section scs-paths" aria-labelledby="paths-title">
          <div className="scs-shell">
            <div className="scs-section-heading scs-section-heading-wide">
              <h2 id="paths-title">Choose the next step that fits</h2>
              <p>You do not need to solve your entire training plan before you walk through the door.</p>
            </div>
            <div className="scs-path-list">
              <Link to="/join" className="scs-path-row" onClick={() => trackJoinNowClick('path_membership')}>
                <span className="scs-path-icon"><ShieldCheck aria-hidden="true" /></span>
                <span><strong>Membership</strong><small>Compare current access, prices and terms.</small></span>
                <ArrowRight aria-hidden="true" />
              </Link>
              <Link to="/personal-training" className="scs-path-row">
                <span className="scs-path-icon"><Dumbbell aria-hidden="true" /></span>
                <span><strong>Personal training</strong><small>Start with coaching and a plan built around your goals.</small></span>
                <ArrowRight aria-hidden="true" />
              </Link>
              <TourLink className="scs-path-row" location="path_tour">
                <span className="scs-path-icon"><MapPin aria-hidden="true" /></span>
                <span><strong>Free facility tour</strong><small>See the room and ask questions before deciding.</small></span>
                <ArrowRight aria-hidden="true" />
              </TourLink>
            </div>
          </div>
        </section>

        <section className="scs-section scs-tour" id="tour-form" aria-labelledby="tour-title">
          <div className="scs-shell scs-tour-layout">
            <div className="scs-tour-intro">
              <p className="scs-location-line"><CalendarDays size={17} aria-hidden="true" /> Your first visit</p>
              <h2 id="tour-title">Book a free tour</h2>
              <p>Tell us what you are looking for. The Santa Cruz team will review the request and contact you to arrange the next step.</p>
            </div>
            <div className="scs-tour-form-panel">
              <QuizForm source="book_a_tour" noAutoFocus />
            </div>
            <div className="scs-tour-support">
              <ol className="scs-tour-steps">
                <li><span>1</span><div><strong>Send your request</strong><small>Share your contact details and what brings you in.</small></div></li>
                <li><span>2</span><div><strong>Coordinate a time</strong><small>The team will follow up about a suitable visit.</small></div></li>
                <li><span>3</span><div><strong>See the floor</strong><small>Tour the space, equipment and membership options.</small></div></li>
              </ol>
              <PublicImage src={MEDIA.coach} alt="A coach guiding an athlete through a barbell deadlift" width="1672" height="941" />
            </div>
          </div>
        </section>

        <section className="scs-section scs-reviews" aria-labelledby="reviews-title">
          <div className="scs-shell">
            <div className="scs-section-heading">
              <h2 id="reviews-title">What members say about the room</h2>
              <p>Feedback shared by members of the Santa Cruz Strength community.</p>
            </div>
            <div className="scs-review-grid">
              {TESTIMONIALS.map((testimonial) => (
                <figure key={testimonial.name} className="scs-review">
                  <div className="scs-stars" aria-label="Five star review">
                    {[0, 1, 2, 3, 4].map((star) => <Star key={star} aria-hidden="true" fill="currentColor" />)}
                  </div>
                  <blockquote>“{testimonial.text}”</blockquote>
                  <figcaption><strong>{testimonial.name}</strong><span>{testimonial.detail}</span></figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {upcomingEvents.length > 0 && (
          <section className="scs-section scs-events" aria-labelledby="events-title">
            <div className="scs-shell">
              <div className="scs-section-heading scs-events-heading">
                <div><h2 id="events-title">Upcoming at the gym</h2><p>Published events from the Santa Cruz Strength calendar.</p></div>
                <Link to="/events" className="scs-text-link">View all events <ArrowRight size={17} aria-hidden="true" /></Link>
              </div>
              <div className="scs-event-list">
                {upcomingEvents.map((event) => (
                  <article key={event.id}>
                    <CalendarDays aria-hidden="true" />
                    <div><h3>{event.title}</h3><p>{new Date(`${event.date}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}{event.time ? ` at ${event.time}` : ''}</p></div>
                    <Link to="/events" aria-label={`Learn more about ${event.title}`}><ArrowRight aria-hidden="true" /></Link>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="scs-section scs-visit" aria-labelledby="visit-title">
          <div className="scs-shell scs-visit-layout">
            <div className="scs-visit-details">
              <h2 id="visit-title">Find Santa Cruz Strength</h2>
              <address>
                <span><MapPin aria-hidden="true" /><strong>{GYM_CONFIG.address.full}</strong></span>
                <a href={GYM_CONFIG.phoneHref}><Phone aria-hidden="true" />{GYM_CONFIG.phone}</a>
              </address>
              <div className="scs-hours">
                {GYM_CONFIG.hours.map((period) => (
                  <div key={period.days}><strong>{period.days}</strong><span>{period.hours}</span><small>{period.note}</small></div>
                ))}
              </div>
              <TourLink className="scs-button scs-button-primary" location="visit">Book a free tour <ArrowRight size={18} aria-hidden="true" /></TourLink>
              <a className="scs-text-link" href={GYM_CONFIG.googleMapsUrl} target="_blank" rel="noopener noreferrer">
                Open directions <MapPin size={17} aria-hidden="true" />
              </a>
            </div>
            <div className="scs-map" data-testid="contact-map-embed">
              <iframe
                title="Santa Cruz Strength location"
                src="https://maps.google.com/maps?q=151+Harvey+West+Blvd+Ste+D+Santa+Cruz+CA+95060&output=embed"
                width="100%"
                height="100%"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </section>

        <section className="scs-section scs-faq" aria-labelledby="faq-title">
          <div className="scs-shell scs-faq-layout">
            <div><h2 id="faq-title">Before you visit</h2><p>Clear answers to the questions people ask when comparing a local strength gym.</p></div>
            <div className="scs-faq-list">
              {FAQ_ITEMS.map((item) => (
                <details key={item.question}>
                  <summary>{item.question}<ChevronDown aria-hidden="true" /></summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="scs-closing" aria-label="Book a tour">
          <div className="scs-shell">
            <h2>Come see the room for yourself.</h2>
            <TourLink className="scs-button scs-button-light" location="closing">Book a free tour <ArrowRight size={18} aria-hidden="true" /></TourLink>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
