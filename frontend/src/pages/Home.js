import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import LeadForm from '../components/LeadForm';
import { GYM_CONFIG } from '../config';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '../components/ui/accordion';
import { Badge } from '../components/ui/badge';
import {
  Dumbbell, Users, Target, MapPin, Phone, Star, ChevronRight,
  Shield, ArrowRight, Clock, Mountain, Waves, Bike
} from 'lucide-react';

const HERO_IMG = 'https://customer-assets.emergentagent.com/job_local-gym-hub/artifacts/78eczi55_348s.jpg';
const GYM_IMG = 'https://images.unsplash.com/photo-1526408984842-5f1323d42469?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=1200';
const DUMBBELL_IMG = 'https://images.unsplash.com/photo-1526401485004-46910ecc8e51?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=800';
const COASTAL_IMG = 'https://images.unsplash.com/photo-1770670588301-2769fd50a060?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=1800';
const SURFER_IMG = 'https://images.unsplash.com/photo-1619303642113-fe8576da3f5b?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=900';

const BENEFITS = [
  {
    icon: <Dumbbell size={22} className="text-[#1B7A4A]" />,
    title: 'Serious Equipment',
    desc: 'Competition-grade power racks, specialty bars, platforms, and free weights. Built for athletes who train with intention.',
  },
  {
    icon: <Users size={22} className="text-[#1B7A4A]" />,
    title: 'Intentional Community',
    desc: 'Surfers, climbers, trail runners, tech workers, and lifters. People who train seriously and respect the space.',
  },
  {
    icon: <Target size={22} className="text-[#1B7A4A]" />,
    title: 'Expert Coaching',
    desc: 'Coaching grounded in fundamentals. Whether you\'re building your first program or training for competition — we can help.',
  },
  {
    icon: <Shield size={22} className="text-[#1B7A4A]" />,
    title: 'Members 24/7',
    desc: 'Train when it fits your life. Early morning before the surf, late night after work. Full access, always.',
  },
];

const WHO_FOR = [
  { label: 'Surfers', icon: <Waves size={14} /> },
  { label: 'Climbers', icon: <Mountain size={14} /> },
  { label: 'Trail Runners', icon: '\uD83C\uDFC3' },
  { label: 'Mountain Bikers', icon: <Bike size={14} /> },
  { label: 'Powerlifters', icon: '\uD83C\uDFCB\uFE0F' },
  { label: 'Tech Workers', icon: '\uD83D\uDCBB' },
  { label: 'Beginners', icon: '\uD83C\uDF31' },
  { label: 'Returning Athletes', icon: '\u26A1' },
];

const TESTIMONIALS = [
  {
    name: 'Marcus T.',
    detail: 'Member since 2022 · Trail runner',
    text: 'I\'ve been to gyms all over the Bay Area. Santa Cruz Strength is different. No ego, serious equipment, and coaches who actually know what they\'re talking about. This is the only gym I\'ve stayed at for more than a year.',
  },
  {
    name: 'Keiko R.',
    detail: 'Member · Surfer + Lifter',
    text: 'I started lifting to improve my surfing. Six months in and I\'m stronger than I\'ve ever been. The programming is smart and the environment is exactly what I needed — focused without being intimidating.',
  },
  {
    name: 'Jake M.',
    detail: 'Member · Engineer, Santa Cruz',
    text: 'After years of commercial gym chaos, this place feels like a reset. Clean equipment, respectful members, and coaching that doesn\'t waste your time. Best decision I made this year.',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Do I need experience to join?',
    a: 'No. We work with every level from first-time lifters to experienced competitors. Our coaches will help you build a solid foundation from the start.',
  },
  {
    q: 'What are the membership options?',
    a: 'We offer flexible month-to-month and commitment memberships. All members get 24/7 keycard access. Talk to a coach about what makes sense for your schedule and goals.',
  },
  {
    q: 'Can I visit before committing?',
    a: 'Absolutely. Request a tour and we\'ll show you around, introduce you to the space and coaching team, and answer your questions with zero pressure.',
  },
  {
    q: 'What are day pass hours?',
    a: 'Day passes are available 9 AM – 6 PM, 7 days a week. Full members have 24/7 keycard access to the facility.',
  },
  {
    q: 'Do you offer personal training?',
    a: 'Yes. Our certified coaches offer 1-on-1 personal training. Whether you\'re building a strength foundation, returning from injury, or preparing for competition, we can design a program for you.',
  },
  {
    q: 'What equipment do you have?',
    a: 'Power racks, barbells, bumper and iron plates, specialty bars (safety squat, hex, cambered), dumbbells up to 150lbs, kettlebells, platforms, and conditioning equipment.',
  },
  {
    q: 'Who is this gym for?',
    a: 'Anyone who wants to train seriously and respects the space. We have surfers, climbers, cyclists, tech workers, powerlifters, and beginners all training side by side. What they share is intentionality.',
  },
  {
    q: 'Where are you located?',
    a: `${GYM_CONFIG.address.full}. Free parking in the Harvey West Business Park lot. Easy access from Highway 1.`,
  },
];

export default function Home() {
  const formRef = useRef(null);

  const scrollToForm = (e) => {
    e.preventDefault();
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="min-h-screen bg-[var(--ink)]">
      <Navbar />

      {/* HERO */}
      <section
        className="relative min-h-screen flex items-center pt-16"
        style={{
          backgroundImage: `url(${HERO_IMG})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 35%',
        }}
      >
        {/* Strong base overlay */}
        <div className="absolute inset-0 bg-[#0C1420]/75" />
        {/* Left heavy — keep text area darker */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0C1420]/80 via-[#0C1420]/50 to-[#0C1420]/10" />
        {/* Subtle brand accent — barely visible */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(600px circle at 8% 50%, rgba(27,122,74,0.06), transparent 50%)',
        }} />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-20 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            {/* Left */}
            <div className="animate-fade-in-up">
              <Badge className="mb-5 bg-[#1B7A4A]/12 text-[#7FCCA6] border-[#1B7A4A]/25 text-xs tracking-widest uppercase">
                Santa Cruz, California
              </Badge>

              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl text-white leading-[1] tracking-wide mb-4">
                SERIOUS<br />
                STRENGTH<br />
                <span className="text-[#1B7A4A]">TRAINING.</span>
              </h1>

              <p className="text-white/55 text-base sm:text-lg leading-relaxed mb-3 max-w-lg">
                A focused gym for athletes, lifters, and people who believe strength matters.
              </p>
              <p className="text-white/58 text-sm leading-relaxed mb-8 max-w-md">
                Not a fitness club. Not a commercial gym chain. A strength training environment built
                for the Santa Cruz community.
              </p>

              <div className="flex flex-wrap gap-2 mb-8">
                {['24/7 Access via Our App', 'Flexible Membership Options', 'All Experience Levels'].map((chip) => (
                  <span key={chip} className="text-xs text-white/65 bg-white/5 border border-white/8 px-3 py-1 rounded-full">
                    {chip}
                  </span>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <a href={GYM_CONFIG.joinUrl} target="_blank" rel="noopener noreferrer"
                  data-testid="home-hero-join-now-button"
                  className="btn-scs-primary px-6 py-3.5 rounded-md font-semibold text-sm text-center flex items-center justify-center gap-2">
                  Join Now <ArrowRight size={14} />
                </a>
                <button onClick={scrollToForm}
                  data-testid="home-hero-book-visit-button"
                  className="btn-scs-secondary px-6 py-3.5 rounded-md font-semibold text-sm">
                  Book a Tour
                </button>
                <a href={GYM_CONFIG.phoneHref}
                  className="flex items-center gap-2 px-3 py-3.5 text-sm text-white/65 hover:text-white transition-colors duration-200">
                  <Phone size={14} className="text-[#1B7A4A]" />{GYM_CONFIG.phone}
                </a>
              </div>
            </div>

            {/* Right — Form */}
            <div ref={formRef} id="lead-form" className="animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
              <div className="bg-[#0C1420]/96 backdrop-blur-md border border-white/14 rounded-xl p-6 shadow-2xl">
                <div className="mb-5">
                  <h2 className="font-display text-2xl text-white tracking-wide">BOOK A TOUR</h2>
                  <p className="text-white/62 text-sm mt-1">Tell us a bit about yourself. We\'ll reach out to schedule a visit.</p>
                </div>
                <LeadForm source="book_a_tour" ctaLabel="Request a Tour" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY SCS */}
      <section className="py-20 sm:py-24 bg-[var(--surface)]" data-testid="home-benefits-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="green-accent-line mx-auto" />
            <p className="text-[#1B7A4A] text-xs font-semibold uppercase tracking-widest mb-3">Why Train Here</p>
            <h2 className="font-display text-4xl sm:text-5xl text-white tracking-wide">
              STRENGTH WITHOUT THE NOISE.
            </h2>
            <p className="text-white/62 max-w-xl mx-auto mt-3 text-sm leading-relaxed">
              No cardio theater. No supplement counters. A focused space for people who show up, lift, and improve.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {BENEFITS.map((b, i) => (
              <div key={i} className="card-marketing p-6 transition-colors duration-200 hover:bg-white/6">
                <div className="mb-4">{b.icon}</div>
                <h3 className="font-semibold text-white text-sm mb-2">{b.title}</h3>
                <p className="text-white/62 text-sm leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRAINING EXPERIENCE */}
      <section className="py-20 sm:py-24 bg-[var(--ink)]" data-testid="home-training-experience-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative rounded-xl overflow-hidden order-2 lg:order-1">
              <img src={GYM_IMG} alt="Santa Cruz Strength gym equipment and training floor"
                className="w-full h-72 sm:h-96 object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/50 to-transparent" />
              <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur text-white px-3 py-1.5 rounded text-xs">
                151 Harvey West Blvd · Santa Cruz
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <span className="green-accent-line" />
              <p className="text-[#1B7A4A] text-xs font-semibold uppercase tracking-widest mb-3">The Environment</p>
              <h2 className="font-display text-4xl sm:text-5xl text-white tracking-wide mb-5">
                WHAT TRAINING HERE FEELS LIKE
              </h2>
              <p className="text-white/55 leading-relaxed mb-3 text-sm">
                Walk in and you'll notice it immediately. The space is clean. The equipment is serious.
                People are focused, not performing.
              </p>
              <p className="text-white/58 leading-relaxed mb-6 text-sm">
                No music drowning out your thoughts. No influencer corner. Just chalk, iron,
                and people who came to work.
              </p>
              <ul className="space-y-3">
                {[
                  'Competition-grade racks, barbells, and platforms',
                  'Coaches who understand real strength programming',
                  'An environment that respects effort over ego',
                  'Members from all walks of Santa Cruz life',
                  '24/7 keycard access for full members',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-white/65">
                    <ChevronRight size={14} className="text-[#1B7A4A] mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex gap-3">
                <Link to="/join" className="btn-scs-primary px-5 py-2.5 rounded-md text-sm font-semibold">
                  View Membership
                </Link>
                <Link to="/personal-training" className="btn-scs-secondary px-5 py-2.5 rounded-md text-sm font-semibold">
                  Personal Training
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHO IT’S FOR */}
      <section className="py-20 sm:py-24 bg-[var(--surface)]" data-testid="home-who-its-for-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="green-accent-line" />
              <p className="text-[#1B7A4A] text-xs font-semibold uppercase tracking-widest mb-3">Who Trains Here</p>
              <h2 className="font-display text-4xl sm:text-5xl text-white tracking-wide mb-5">
                STRENGTH BUILT FOR
                <br />LIFE ON THE COAST.
              </h2>
              <p className="text-white/55 leading-relaxed text-sm mb-3">
                Santa Cruz Strength serves the full spectrum of the local athletic community.
                The common thread isn\'t your sport or your background.
              </p>
              <p className="text-white/58 text-sm leading-relaxed mb-8">
                It\'s the belief that being strong makes everything else better —
                your surfing, your climbing, your work, your years ahead.
              </p>
              <div className="flex flex-wrap gap-2">
                {WHO_FOR.map((item, i) => (
                  <span key={i} className="flex items-center gap-1.5 bg-white/5 border border-white/8 text-white/60 text-sm px-3 py-1.5 rounded-full">
                    <span className="text-xs">{typeof item.icon === 'string' ? item.icon : item.icon}</span>
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="relative rounded-xl overflow-hidden">
              <img src={SURFER_IMG} alt="Surfer athlete walking on beach in Santa Cruz"
                className="w-full h-72 sm:h-96 object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface)]/70 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5">
                <p className="text-white font-display text-xl tracking-wide">TRAIN HARD.</p>
                <p className="text-[#7FCCA6] font-display text-xl tracking-wide">PADDLE OUT. REPEAT.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-20 sm:py-24 bg-[var(--ink)]" data-testid="home-testimonials-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="green-accent-line mx-auto" />
            <p className="text-[#1B7A4A] text-xs font-semibold uppercase tracking-widest mb-3">Member Stories</p>
            <h2 className="font-display text-4xl sm:text-5xl text-white tracking-wide">
              HEAR IT FROM THE MEMBERS
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="card-marketing p-6">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} size={13} fill="#1B7A4A" className="text-[#1B7A4A]" />
                  ))}
                </div>
                <p className="text-white/65 text-sm leading-relaxed mb-5">"{t.text}"</p>
                <div className="border-t border-white/8 pt-4">
                  <p className="text-white font-semibold text-sm">{t.name}</p>
                  <p className="text-white/52 text-xs mt-0.5">{t.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BLOCK */}
      <section
        className="py-20 sm:py-24 relative overflow-hidden"
        style={{
          backgroundImage: `url(${COASTAL_IMG})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-[#0C1420]/92" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <span className="green-accent-line mx-auto" />
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl text-white tracking-wide mb-3">
            STRENGTH IS THE
            <br />FOUNDATION.
          </h2>
          <p className="text-white/80 text-base mb-8 max-w-lg mx-auto">
            Whether you surf, climb, run trails, or just want to stay capable for life —
            it starts here.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href={GYM_CONFIG.joinUrl} target="_blank" rel="noopener noreferrer"
              data-testid="home-final-cta-join-now-button"
              className="btn-scs-primary px-8 py-4 rounded-md font-bold text-sm flex items-center justify-center gap-2">
              Join Santa Cruz Strength
            </a>
            <button onClick={scrollToForm}
              data-testid="home-final-cta-book-visit-button"
              className="btn-scs-secondary px-8 py-4 rounded-md font-semibold text-sm">
              Book a Tour First
            </button>
          </div>
          <p className="text-white/62 text-xs mt-5">No commitment required for a tour.</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 sm:py-24 bg-[var(--surface)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="green-accent-line mx-auto" />
            <h2 className="font-display text-4xl sm:text-5xl text-white tracking-wide" data-testid="home-faq-accordion">
              COMMON QUESTIONS
            </h2>
          </div>
          <Accordion type="single" collapsible className="space-y-2">
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`}
                className="card-marketing border-white/8 rounded-lg px-5">
                <AccordionTrigger className="text-white text-sm font-medium py-4 hover:no-underline hover:text-[#7FCCA6]">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-white/55 text-sm leading-relaxed pb-4">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* LOCAL SECTION */}
      <section className="py-20 sm:py-24 bg-[var(--ink)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="green-accent-line mx-auto" />
            <h2 className="font-display text-4xl sm:text-5xl text-white tracking-wide">FIND US IN SANTA CRUZ</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card-marketing p-6" data-testid="contact-address-block">
              <h3 className="font-display text-2xl text-white tracking-wide mb-5">VISIT US</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <MapPin size={17} className="text-[#1B7A4A] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-white text-sm font-medium">{GYM_CONFIG.address.full}</p>
                    <p className="text-white/52 text-xs mt-0.5">Harvey West Business Park · Free parking</p>
                  </div>
                </li>
                <li>
                  <a href={GYM_CONFIG.phoneHref} data-testid="contact-click-to-call-button"
                    className="flex items-center gap-3 group">
                    <Phone size={17} className="text-[#1B7A4A]" />
                    <span className="text-white group-hover:text-[#7FCCA6] transition-colors duration-200 text-sm font-medium">
                      {GYM_CONFIG.phone}
                    </span>
                  </a>
                </li>
              </ul>

              <div className="mt-6 border-t border-white/8 pt-5" data-testid="contact-hours-block">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={14} className="text-[#1B7A4A]" />
                  <h4 className="text-white/70 text-xs font-semibold uppercase tracking-wider">Access & Hours</h4>
                </div>
                <ul className="space-y-2">
                  {GYM_CONFIG.hours.map((h, i) => (
                    <li key={i} className="">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/65">{h.days}</span>
                        <span className="text-white font-medium">{h.hours}</span>
                      </div>
                      {h.note && <p className="text-white/48 text-xs mt-0.5 text-right">{h.note}</p>}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5">
                <a href={GYM_CONFIG.phoneHref}
                  className="btn-scs-primary w-full py-3 rounded-md text-sm font-semibold text-center block">
                  Call to Book a Tour
                </a>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden border border-white/8 h-[400px] md:h-auto" data-testid="contact-map-embed">
              <iframe
                title="Santa Cruz Strength Location"
                src="https://maps.google.com/maps?q=151+Harvey+West+Blvd+Ste+D+Santa+Cruz+CA+95060&output=embed"
                width="100%" height="100%" style={{ border: 0, minHeight: '350px' }}
                allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-16 bg-[#1B7A4A]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-4xl sm:text-5xl text-white tracking-wide mb-3">
            READY TO TRAIN SERIOUSLY?
          </h2>
          <p className="text-white/75 text-base mb-6">
            Come see what a real strength gym feels like.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href={GYM_CONFIG.joinUrl} target="_blank" rel="noopener noreferrer"
              className="bg-white text-[#1B7A4A] hover:bg-white/90 active:scale-[0.98] px-8 py-3.5 rounded-md font-bold text-sm transition-colors duration-200">
              Join Santa Cruz Strength
            </a>
            <Link to="/contact"
              className="border border-white/30 text-white hover:bg-white/10 px-8 py-3.5 rounded-md font-semibold text-sm transition-colors duration-200">
              Talk to a Coach
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
