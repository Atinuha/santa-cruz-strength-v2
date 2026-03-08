import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import LeadForm from '../components/LeadForm';
import { GYM_CONFIG } from '../config';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';
import { Badge } from '../components/ui/badge';
import {
  Dumbbell, Users, Target, MapPin, Phone, Star, ChevronRight,
  Zap, Shield, Heart, Award, ArrowRight, Clock
} from 'lucide-react';

const HERO_IMG = 'https://images.unsplash.com/photo-1585484764802-387ea30e8432?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=1600';
const GYM_IMG = 'https://images.unsplash.com/photo-1738321791421-232f9ee2c487?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=1200';
const DUMBBELL_IMG = 'https://images.unsplash.com/photo-1694579421795-321d349bacf0?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=800';
const COASTAL_IMG = 'https://images.unsplash.com/photo-1760445565562-296b5afdcae2?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=1600';

const BENEFITS = [
  {
    icon: <Dumbbell size={24} className="text-[#D32F2F]" />,
    title: 'Serious Equipment',
    desc: 'Power racks, specialty bars, dumbbells up to 150lbs, platforms, and more. Built for athletes who train hard.',
  },
  {
    icon: <Users size={24} className="text-[#D32F2F]" />,
    title: 'Real Community',
    desc: 'Surfers, climbers, runners, powerlifters — people who take their training seriously and support each other.',
  },
  {
    icon: <Target size={24} className="text-[#D32F2F]" />,
    title: 'Expert Coaching',
    desc: 'Coaching that meets you where you are. Whether you\'re a beginner or a competitive lifter, we\'ll help you get stronger.',
  },
  {
    icon: <Shield size={24} className="text-[#D32F2F]" />,
    title: 'No BS Culture',
    desc: 'No judgment, no posturing. Just work. A gym culture built on respect, effort, and genuine improvement.',
  },
];

const WHO_FOR = [
  { label: 'Powerlifters', icon: '🏋️' },
  { label: 'Strength Athletes', icon: '💪' },
  { label: 'Surfers', icon: '🏄' },
  { label: 'Climbers', icon: '🧗' },
  { label: 'Cyclists', icon: '🚴' },
  { label: 'Runners', icon: '🏃' },
  { label: 'Beginners', icon: '🌱' },
  { label: 'CrossFit Refugees', icon: '⚡' },
];

const TESTIMONIALS = [
  {
    name: 'Marcus T.',
    detail: 'Member since 2022 · Powerlifter',
    text: 'Best gym in Santa Cruz, full stop. The equipment is legit, the coaching is real, and the people here actually train. Switched from a commercial gym and never looked back.',
  },
  {
    name: 'Keiko R.',
    detail: 'Member · Trail Runner + Lifter',
    text: 'I was intimidated at first but everyone here is genuinely supportive. My strength has improved more in 6 months here than in 2 years anywhere else.',
  },
  {
    name: 'Jake M.',
    detail: 'Member · Competitive Surfer',
    text: 'Training here is the foundation of my surf performance. The programming is smart and the coaches actually care about your goals.',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Do I need experience to join?',
    a: 'No. We welcome beginners and experienced lifters alike. Our coaching staff will help you get started safely and effectively, regardless of your current fitness level.',
  },
  {
    q: 'Are there long-term contracts?',
    a: 'We offer flexible membership options. Ask us about month-to-month and commitment plans when you visit or reach out to a coach.',
  },
  {
    q: 'Can I try the gym before joining?',
    a: 'Absolutely. Book a visit through our website and we\'ll give you a tour, introduce you to the coaching team, and answer all your questions. No pressure.',
  },
  {
    q: 'Do you offer personal training?',
    a: 'Yes. Our certified coaches offer one-on-one personal training sessions. Whether you need a full program or just want to learn specific lifts, we can help.',
  },
  {
    q: 'What equipment do you have?',
    a: 'Power racks, barbells, bumper plates, iron plates, specialty bars (safety squat, hex bar, cambered), dumbbells up to 150lbs, kettlebells, conditioning equipment, and more.',
  },
  {
    q: 'Is there open gym time?',
    a: 'Yes. Members have access to open gym during all operating hours. Coached classes and open lifting both available.',
  },
  {
    q: 'Where are you located?',
    a: `We're at ${GYM_CONFIG.address.full}. Parking is available in the Harvey West Business Park lot. Easy access from Highway 1.`,
  },
];

export default function Home() {
  const formRef = useRef(null);

  const scrollToForm = (e) => {
    e.preventDefault();
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />

      {/* ───────── HERO ───────── */}
      <section
        className="relative min-h-screen flex items-center pt-16"
        style={{
          backgroundImage: `url(${HERO_IMG})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A]/95 via-[#0A0A0A]/80 to-[#0A0A0A]/40" />
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(900px circle at 10% 0%, rgba(110,168,183,0.08), transparent 55%), radial-gradient(700px circle at 90% 10%, rgba(211,47,47,0.08), transparent 52%)',
          }}
        />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-20 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left — Content */}
            <div className="animate-fade-in-up">
              <Badge className="mb-4 bg-[#D32F2F]/15 text-[#FF6B6B] border-[#D32F2F]/25 text-xs tracking-widest uppercase">
                Santa Cruz, California
              </Badge>

              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl text-white leading-[1] tracking-wide mb-4">
                TRAIN HARD.
                <br />
                <span className="text-[#D32F2F]">STAY</span> LOCAL.
              </h1>

              <p className="text-white/65 text-base sm:text-lg leading-relaxed mb-8 max-w-lg">
                Santa Cruz Strength is a serious training gym built for the local community.
                Real equipment. Knowledgeable coaches. People who show up and put in the work.
              </p>

              {/* Social proof chips */}
              <div className="flex flex-wrap gap-2 mb-8">
                {['5+ Years in Santa Cruz', 'No Contracts Required', 'All Fitness Levels'].map((chip) => (
                  <span key={chip} className="text-xs text-white/60 bg-white/6 border border-white/10 px-3 py-1 rounded-full">
                    {chip}
                  </span>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={GYM_CONFIG.joinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="home-hero-join-now-button"
                  className="btn-scs-primary px-6 py-3.5 rounded-md font-semibold text-sm text-center flex items-center justify-center gap-2"
                >
                  Join Now <ArrowRight size={15} />
                </a>
                <button
                  onClick={scrollToForm}
                  data-testid="home-hero-book-visit-button"
                  className="btn-scs-secondary px-6 py-3.5 rounded-md font-semibold text-sm"
                >
                  Book a Visit
                </button>
                <a
                  href={GYM_CONFIG.phoneHref}
                  className="flex items-center gap-2 px-4 py-3.5 text-sm text-white/60 hover:text-white transition-colors duration-200"
                >
                  <Phone size={15} className="text-[#D32F2F]" />
                  {GYM_CONFIG.phone}
                </a>
              </div>
            </div>

            {/* Right — Inline Form */}
            <div ref={formRef} id="lead-form" className="animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
              <div className="bg-[#111214]/90 backdrop-blur border border-white/10 rounded-xl p-6 shadow-2xl">
                <div className="mb-5">
                  <h2 className="font-display text-2xl text-white tracking-wide">BOOK A FREE VISIT</h2>
                  <p className="text-white/50 text-sm mt-1">Tell us a bit about yourself and a coach will reach out.</p>
                </div>
                <LeadForm source="book_a_visit" />
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden lg:flex flex-col items-center gap-2">
          <div className="w-0.5 h-10 bg-gradient-to-b from-white/0 via-white/30 to-white/0" />
        </div>
      </section>

      {/* ───────── WHY SCS BENEFITS ───────── */}
      <section className="py-20 sm:py-24 bg-[#111214]" data-testid="home-benefits-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="red-accent-line mx-auto" />
            <p className="text-[#D32F2F] text-xs font-semibold uppercase tracking-widest mb-3">Why Train Here</p>
            <h2 className="font-display text-4xl sm:text-5xl text-white tracking-wide">
              BUILT FOR PEOPLE WHO TRAIN.
            </h2>
            <p className="text-white/50 max-w-xl mx-auto mt-3 text-sm leading-relaxed">
              Not a wellness center. Not a commercial gym. A serious training facility for the Santa Cruz community.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {BENEFITS.map((b, i) => (
              <div
                key={i}
                className="card-marketing p-6 transition-colors duration-200 hover:bg-white/6"
              >
                <div className="mb-4">{b.icon}</div>
                <h3 className="font-semibold text-white text-base mb-2">{b.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── TRAINING EXPERIENCE ───────── */}
      <section className="py-20 sm:py-24 bg-[#0A0A0A]" data-testid="home-training-experience-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Image */}
            <div className="relative rounded-xl overflow-hidden order-2 lg:order-1">
              <img
                src={GYM_IMG}
                alt="Santa Cruz Strength gym interior with racks and equipment"
                className="w-full h-72 sm:h-96 object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/60 to-transparent" />
              <div className="absolute bottom-4 left-4 bg-[#D32F2F]/90 backdrop-blur text-white px-3 py-1.5 rounded text-xs font-semibold">
                Harvey West Business Park, Santa Cruz
              </div>
            </div>

            {/* Content */}
            <div className="order-1 lg:order-2">
              <span className="red-accent-line" />
              <p className="text-[#D32F2F] text-xs font-semibold uppercase tracking-widest mb-3">The Experience</p>
              <h2 className="font-display text-4xl sm:text-5xl text-white tracking-wide mb-5">
                WHAT TO EXPECT WHEN YOU WALK IN
              </h2>
              <p className="text-white/60 leading-relaxed mb-6 text-sm">
                The moment you walk through our doors, you'll notice it's different here. No pop music blasting, no mirror selfie stations, no one trying to upsell you on supplements. Just a serious space where people come to get stronger.
              </p>
              <ul className="space-y-3">
                {[
                  'Competition-grade power racks and free weights',
                  'Coaching staff that actually watches your form',
                  'Programs designed around real strength goals',
                  'Welcoming environment for all experience levels',
                  'Members who motivate without the ego',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-white/70">
                    <ChevronRight size={15} className="text-[#D32F2F] mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex gap-3">
                <Link to="/join" className="btn-scs-primary px-5 py-2.5 rounded-md text-sm font-semibold">
                  Get Started
                </Link>
                <Link to="/personal-training" className="btn-scs-secondary px-5 py-2.5 rounded-md text-sm font-semibold">
                  Personal Training
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── WHO IT'S FOR ───────── */}
      <section className="py-20 sm:py-24 bg-[#111214]" data-testid="home-who-its-for-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="red-accent-line" />
              <p className="text-[#D32F2F] text-xs font-semibold uppercase tracking-widest mb-3">Who Trains Here</p>
              <h2 className="font-display text-4xl sm:text-5xl text-white tracking-wide mb-5">
                IF YOU TRAIN,<br />YOU BELONG HERE.
              </h2>
              <p className="text-white/60 leading-relaxed text-sm mb-8">
                Santa Cruz Strength serves the whole athletic community — from first-time lifters to competitive athletes. The common thread isn't experience level. It's the commitment to showing up.
              </p>
              <div className="flex flex-wrap gap-2">
                {WHO_FOR.map((item, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1.5 bg-white/5 border border-white/10 text-white/70 text-sm px-3 py-1.5 rounded-full"
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="relative rounded-xl overflow-hidden">
              <img
                src={DUMBBELL_IMG}
                alt="Dumbbells and training equipment at Santa Cruz Strength"
                className="w-full h-72 sm:h-96 object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#111214]/70 to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* ───────── TESTIMONIALS ───────── */}
      <section className="py-20 sm:py-24 bg-[#0A0A0A]" data-testid="home-testimonials-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="red-accent-line mx-auto" />
            <p className="text-[#D32F2F] text-xs font-semibold uppercase tracking-widest mb-3">Member Stories</p>
            <h2 className="font-display text-4xl sm:text-5xl text-white tracking-wide">
              STRAIGHT FROM THE MEMBERS
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="card-marketing p-6">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} size={14} fill="#D32F2F" className="text-[#D32F2F]" />
                  ))}
                </div>
                <p className="text-white/70 text-sm leading-relaxed mb-5">"{t.text}"</p>
                <div className="border-t border-white/8 pt-4">
                  <p className="text-white font-semibold text-sm">{t.name}</p>
                  <p className="text-white/40 text-xs mt-0.5">{t.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── CTA BLOCK ───────── */}
      <section
        className="py-20 sm:py-24 relative overflow-hidden"
        style={{
          backgroundImage: `url(${COASTAL_IMG})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-[#0A0A0A]/88" />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <span className="red-accent-line mx-auto" />
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl text-white tracking-wide mb-4">
            READY TO TRAIN?<br />LET'S GO.
          </h2>
          <p className="text-white/60 text-base mb-8">
            Join Santa Cruz's most dedicated strength community.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={GYM_CONFIG.joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="home-final-cta-join-now-button"
              className="btn-scs-primary px-8 py-4 rounded-md font-bold text-sm flex items-center justify-center gap-2"
            >
              Join Now — Get Started Today
            </a>
            <button
              onClick={scrollToForm}
              data-testid="home-final-cta-book-visit-button"
              className="btn-scs-secondary px-8 py-4 rounded-md font-semibold text-sm"
            >
              Book a Free Visit
            </button>
          </div>
          <p className="text-white/35 text-xs mt-6">No commitment required for a visit. Come see if it's the right fit.</p>
        </div>
      </section>

      {/* ───────── FAQ ───────── */}
      <section className="py-20 sm:py-24 bg-[#111214]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="red-accent-line mx-auto" />
            <h2 className="font-display text-4xl sm:text-5xl text-white tracking-wide" data-testid="home-faq-accordion">
              COMMON QUESTIONS
            </h2>
          </div>
          <Accordion type="single" collapsible className="space-y-2">
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="card-marketing border-white/8 rounded-lg px-5"
              >
                <AccordionTrigger className="text-white text-sm font-medium py-4 hover:no-underline hover:text-white/90">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-white/60 text-sm leading-relaxed pb-4">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ───────── LOCAL SECTION ───────── */}
      <section className="py-20 sm:py-24 bg-[#0A0A0A]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="red-accent-line mx-auto" />
            <h2 className="font-display text-4xl sm:text-5xl text-white tracking-wide">FIND US IN SANTA CRUZ</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Card */}
            <div className="card-marketing p-6" data-testid="contact-address-block">
              <h3 className="font-display text-2xl text-white tracking-wide mb-5">VISIT US</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <MapPin size={18} className="text-[#D32F2F] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-white text-sm font-medium">{GYM_CONFIG.address.full}</p>
                    <p className="text-white/40 text-xs mt-0.5">Harvey West Business Park · Free parking available</p>
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
              </ul>

              <div className="mt-6 border-t border-white/8 pt-5" data-testid="contact-hours-block">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={15} className="text-[#D32F2F]" />
                  <h4 className="text-white/80 text-xs font-semibold uppercase tracking-wider">Hours</h4>
                </div>
                <ul className="space-y-1.5">
                  {GYM_CONFIG.hours.map((h, i) => (
                    <li key={i} className="flex justify-between text-sm">
                      <span className="text-white/50">{h.days}</span>
                      <span className="text-white font-medium">{h.hours}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6">
                <a
                  href={GYM_CONFIG.phoneHref}
                  className="btn-scs-primary w-full py-3 rounded-md text-sm font-semibold text-center block"
                >
                  Call to Book a Visit
                </a>
              </div>
            </div>

            {/* Map */}
            <div className="rounded-xl overflow-hidden border border-white/8 h-[400px] md:h-auto" data-testid="contact-map-embed">
              <iframe
                title="Santa Cruz Strength Location"
                src={`https://maps.google.com/maps?q=151+Harvey+West+Blvd+Ste+D+Santa+Cruz+CA+95060&output=embed`}
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: '350px' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ───────── FINAL CTA ───────── */}
      <section className="py-16 bg-[#D32F2F]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-4xl sm:text-5xl text-white tracking-wide mb-3">
            STOP SETTLING FOR AVERAGE GYMS.
          </h2>
          <p className="text-white/80 text-base mb-6">
            Come train somewhere that takes your progress as seriously as you do.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={GYM_CONFIG.joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white text-[#D32F2F] hover:bg-white/90 active:scale-[0.98] px-8 py-3.5 rounded-md font-bold text-sm transition-colors duration-200"
            >
              Join Santa Cruz Strength
            </a>
            <Link
              to="/contact"
              className="border border-white/30 text-white hover:bg-white/10 px-8 py-3.5 rounded-md font-semibold text-sm transition-colors duration-200"
            >
              Talk to a Coach
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
