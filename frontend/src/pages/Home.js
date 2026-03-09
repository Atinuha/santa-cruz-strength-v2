import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import QuizForm from '../components/QuizForm';
import { GYM_CONFIG } from '../config';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { Dumbbell, Users, Target, Shield, ChevronRight, Star, MapPin, Phone, Clock, Mountain, Waves, Bike, ArrowRight, Zap } from 'lucide-react';

const HERO_IMG    = 'https://customer-assets.emergentagent.com/job_local-gym-hub/artifacts/hvzhmt0n_Chris_5.JPEG';
const GYM_IMG     = 'https://customer-assets.emergentagent.com/job_local-gym-hub/artifacts/zexxrigp_IMG_1134.jpeg';
const DUMBBELL_IMG= 'https://customer-assets.emergentagent.com/job_local-gym-hub/artifacts/idkicvp5_6502579888812714199.jpg';
const COASTAL_IMG = 'https://customer-assets.emergentagent.com/job_local-gym-hub/artifacts/4ll7bzdl_IMG_4615.jpeg';
const SURFER_IMG  = 'https://customer-assets.emergentagent.com/job_local-gym-hub/artifacts/xco5o291_IMG_3041.jpeg';

const BENEFITS = [
  { icon: <Dumbbell size={22} />, title: 'Serious Equipment', desc: 'Competition-grade racks, specialty bars, and platforms. Built for people who actually train.', color: 'bg-[var(--clr-bg-green)]' },
  { icon: <Users size={22} />, title: 'Real Community', desc: 'Surfers, climbers, cyclists, and coaches. People who respect the space and each other.', color: 'bg-[var(--clr-seafoam)]/60' },
  { icon: <Target size={22} />, title: 'Expert Coaching', desc: 'Coaches who know the difference between a cue and a lecture. Fundamentals first, always.', color: 'bg-[var(--clr-coral)]/10' },
  { icon: <Zap size={22} />, title: '24/7 Access via App', desc: "Train on your schedule. Early mornings before the surf, late nights after work. Always open.", color: 'bg-amber-50' },
];

const WHO_FOR = [
  { label: 'Surfers', icon: <Waves size={14} /> },
  { label: 'Climbers', icon: <Mountain size={14} /> },
  { label: 'Trail Runners', icon: '\uD83C\uDFC3' },
  { label: 'Cyclists', icon: <Bike size={14} /> },
  { label: 'Powerlifters', icon: '\uD83C\uDFCB\uFE0F' },
  { label: 'Tech Workers', icon: '\uD83D\uDCBB' },
  { label: 'Beginners', icon: '\uD83C\uDF31' },
  { label: 'The "I hate gyms" crowd', icon: '\uD83D\uDE4C' },
];

const TESTIMONIALS = [
  { name: 'Marcus T.', detail: 'Member since 2022 · Trail runner', text: 'Best gym in Santa Cruz, full stop. The equipment is legit, the coaches know their stuff, and nobody here is performing for an audience. Switched from a commercial gym and never looked back.' },
  { name: 'Keiko R.', detail: 'Member · Surfer + Lifter', text: 'I was intimidated at first but everyone here is genuinely supportive. My strength has improved more in 6 months here than in 2 years anywhere else.' },
  { name: 'Jake M.', detail: 'Member · Engineer, Santa Cruz', text: 'After years of commercial gym chaos, this place feels like a reset. Clean equipment, respectful members, coaching that doesn\'t waste your time.' },
];

const FAQ_ITEMS = [
  { q: 'Do I need experience to join?', a: 'Not even a little. We work with first-time lifters and competitive athletes. Our coaches will meet you wherever you are and help you build from there.' },
  { q: 'Are there long-term contracts?', a: 'We offer both month-to-month and commitment options. Ask us about pricing and flexibility when you visit — we\'ll find something that works.' },
  { q: 'Can I tour the gym before joining?', a: 'Yes, and we love it when people do. Book a tour through the form on this page and a coach will show you around, answer questions, and zero pressure.' },
  { q: 'What are day pass and member hours?', a: 'Members get 24/7 access via our app. Day passes are available 9 AM – 6 PM, 7 days a week. Staffed hours vary by day.' },
  { q: 'Do you offer personal training?', a: 'Absolutely. Our coaches offer 1-on-1 sessions tailored to your goals — strength foundation, injury recovery, sport performance, or competition prep.' },
  { q: 'What equipment do you have?', a: 'Power racks, barbells, bumper and iron plates, specialty bars (safety squat, hex, cambered), dumbbells to 150lbs, kettlebells, and conditioning equipment.' },
];

function WaveDivider({ flip = false, from = '#F7F5F0', to = '#FFFFFF' }) {
  return (
    <div className="relative h-16 overflow-hidden" style={{ background: to }}>
      <svg viewBox="0 0 1200 64" preserveAspectRatio="none"
        className={`absolute w-full h-full ${flip ? 'scale-y-[-1]' : ''}`}
        style={{ fill: from }}>
        <path d="M0,0 C300,64 900,64 1200,0 L1200,0 L0,0 Z" />
      </svg>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--clr-bg)' }}>
      <Navbar />

      {/* =========== HERO =========== */}
      <section className="relative min-h-screen flex items-center pt-16"
        style={{ backgroundImage: `url(${HERO_IMG})`, backgroundSize: 'cover', backgroundPosition: 'center 20%' }}>
        {/* Light airy overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--clr-bg)]/95 via-[var(--clr-bg)]/70 to-[var(--clr-bg)]/20" />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(600px circle at 5% 50%, rgba(205,234,224,0.5), transparent 55%)' }} />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-20 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            {/* Left */}
            <div className="animate-fade-in-up">
              <div className="inline-flex items-center gap-2 bg-[var(--clr-seafoam)] text-[var(--clr-green)] text-xs font-bold px-4 py-1.5 rounded-full mb-5 uppercase tracking-widest">
                <MapPin size={12} /> Santa Cruz, California
              </div>
              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[1] tracking-wide mb-4"
                style={{ color: 'var(--clr-charcoal)' }}>
                SERIOUS<br />
                <span style={{ color: 'var(--clr-green)' }}>STRENGTH</span><br />
                TRAINING.
              </h1>
              <p className="text-[var(--clr-text)] text-base sm:text-lg leading-relaxed mb-2 max-w-lg font-semibold">
                A focused gym for athletes, lifters, and people who believe strength matters.
              </p>
              <p className="text-[var(--clr-text-muted)] text-sm leading-relaxed mb-8 max-w-md">
                Not a fitness club. Not a commercial chain. A real training environment built for the Santa Cruz community.
              </p>
              <div className="flex flex-wrap gap-2 mb-8">
                {['24/7 via Our App', 'Flexible Membership', 'All Levels Welcome'].map(chip => (
                  <span key={chip} className="bg-white text-[var(--clr-green)] text-xs font-bold px-3.5 py-1.5 rounded-full border border-[var(--clr-border-green)]">
                    {chip}
                  </span>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <a href={GYM_CONFIG.joinUrl} target="_blank" rel="noopener noreferrer"
                  data-testid="home-hero-join-now-button"
                  className="btn-coral px-6 py-3.5 text-sm">
                  Join Now <ArrowRight size={15} />
                </a>
                <a href={`#tour-form`}
                  data-testid="home-hero-book-visit-button"
                  className="btn-outline-green px-6 py-3.5 text-sm"
                  onClick={(e) => { e.preventDefault(); document.getElementById('tour-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}>
                  Book a Tour
                </a>
                <a href={GYM_CONFIG.phoneHref}
                  className="flex items-center gap-2 px-3 py-3.5 text-sm font-bold text-[var(--clr-text-muted)] hover:text-[var(--clr-green)] transition-colors duration-200">
                  <Phone size={14} style={{ color: 'var(--clr-green)' }} />{GYM_CONFIG.phone}
                </a>
              </div>
            </div>

            {/* Quiz Form Card */}
            <div id="tour-form" className="animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
              <div className="bg-white rounded-[var(--radius-xl)] p-7" style={{ boxShadow: 'var(--shadow-lg)', border: '1.5px solid var(--clr-border-green)' }}>
                <div className="mb-5">
                  <h2 className="font-display text-2xl tracking-wide" style={{ color: 'var(--clr-green)' }}>BOOK A FREE TOUR</h2>
                  <p className="text-[var(--clr-text-muted)] text-sm mt-1">30 seconds. No commitment. We love showing the gym off.</p>
                </div>
                <QuizForm source="book_a_tour" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Wave */}
      <WaveDivider from="var(--clr-bg)" to="white" />

      {/* =========== BENEFITS =========== */}
      <section className="py-16 sm:py-20 bg-white" data-testid="home-benefits-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="green-accent-line mx-auto" />
            <p className="text-[var(--clr-green)] text-xs font-bold uppercase tracking-widest mb-3">Why Train Here</p>
            <h2 className="font-display text-4xl sm:text-5xl tracking-wide" style={{ color: 'var(--clr-charcoal)' }}>
              STRENGTH WITHOUT THE NOISE.
            </h2>
            <p className="text-[var(--clr-text-muted)] max-w-xl mx-auto mt-3 text-sm leading-relaxed">
              No cardio theater. No supplement counters. A focused space for people who show up, lift, and improve.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {BENEFITS.map((b, i) => (
              <div key={i} className={`${b.color} rounded-[var(--radius-lg)] p-6 transition-transform duration-200 hover:-translate-y-1`}
                style={{ boxShadow: 'var(--shadow-sm)', border: '1px solid var(--clr-border)' }}>
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-4 text-[var(--clr-green)]"
                  style={{ boxShadow: 'var(--shadow-sm)' }}>
                  {b.icon}
                </div>
                <h3 className="font-bold text-[var(--clr-charcoal)] text-base mb-2">{b.title}</h3>
                <p className="text-[var(--clr-text-muted)] text-sm leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Wave */}
      <WaveDivider from="white" to="var(--clr-bg)" flip />

      {/* =========== TRAINING EXPERIENCE =========== */}
      <section className="py-16 sm:py-20" style={{ background: 'var(--clr-bg)' }} data-testid="home-training-experience-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative rounded-[var(--radius-xl)] overflow-hidden order-2 lg:order-1" style={{ boxShadow: 'var(--shadow-lg)' }}>
              <img src={GYM_IMG} alt="Santa Cruz Strength member competing in a deadlift"
                className="w-full h-72 sm:h-96 object-cover" loading="lazy" />
              <div className="absolute bottom-5 left-5">
                <span className="bg-white text-[var(--clr-green)] text-xs font-bold px-4 py-2 rounded-full" style={{ boxShadow: 'var(--shadow-sm)' }}>
                  151 Harvey West Blvd · Santa Cruz
                </span>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <span className="green-accent-line" />
              <p className="text-[var(--clr-green)] text-xs font-bold uppercase tracking-widest mb-3">The Environment</p>
              <h2 className="font-display text-4xl sm:text-5xl tracking-wide mb-5" style={{ color: 'var(--clr-charcoal)' }}>
                WHAT TRAINING<br />HERE FEELS LIKE
              </h2>
              <p className="text-[var(--clr-text)] leading-relaxed mb-3 font-semibold">
                Walk in and you\'ll notice it immediately. The space is clean. The equipment is serious. People are focused, not performing.
              </p>
              <p className="text-[var(--clr-text-muted)] leading-relaxed mb-6 text-sm">
                No music drowning out your thoughts. No influencer corner. Just chalk, iron, and people who came to work.
              </p>
              <ul className="space-y-3">
                {['Competition-grade racks, barbells, and platforms', 'Coaches who know real strength programming', 'An environment that respects effort over ego', '24/7 access for full members via our app'].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm font-semibold text-[var(--clr-text)]">
                    <div className="w-5 h-5 bg-[var(--clr-bg-green)] rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      <ChevronRight size={12} style={{ color: 'var(--clr-green)' }} />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex gap-3">
                <Link to="/join" className="btn-primary px-5 py-2.5 text-sm">View Membership</Link>
                <Link to="/personal-training" className="btn-outline-green px-5 py-2.5 text-sm">Personal Training</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Wave */}
      <WaveDivider from="var(--clr-bg)" to="var(--clr-seafoam)" />

      {/* =========== WHO IT'S FOR =========== */}
      <section className="py-16 sm:py-20" style={{ background: 'var(--clr-seafoam)' }} data-testid="home-who-its-for-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="green-accent-line" />
              <p className="text-[var(--clr-green)] text-xs font-bold uppercase tracking-widest mb-3">Who Trains Here</p>
              <h2 className="font-display text-4xl sm:text-5xl tracking-wide mb-5" style={{ color: 'var(--clr-charcoal)' }}>
                IF YOU TRAIN,<br />YOU BELONG HERE.
              </h2>
              <p className="text-[var(--clr-text)] leading-relaxed text-sm mb-3 font-semibold">
                Santa Cruz Strength serves the full athletic community of this city. The common thread isn\'t your sport or your level.
              </p>
              <p className="text-[var(--clr-text-muted)] text-sm leading-relaxed mb-8">
                It\'s the belief that being strong makes everything else better — your surfing, your climbing, your work, your decades ahead.
              </p>
              <div className="flex flex-wrap gap-2">
                {WHO_FOR.map((item, i) => (
                  <span key={i} className="flex items-center gap-1.5 bg-white text-[var(--clr-green)] text-sm font-bold px-3.5 py-2 rounded-full"
                    style={{ border: '1.5px solid var(--clr-border-green)', boxShadow: 'var(--shadow-sm)' }}>
                    <span className="text-xs">{typeof item.icon === 'string' ? item.icon : item.icon}</span>
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="relative rounded-[var(--radius-xl)] overflow-hidden" style={{ boxShadow: 'var(--shadow-lg)' }}>
              <img src={SURFER_IMG} alt="Santa Cruz Strength competition podium — members with medals"
                className="w-full h-72 sm:h-96 object-cover" loading="lazy" />
              <div className="absolute bottom-5 left-5 right-5">
                <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-3">
                  <p className="font-display text-lg tracking-wide" style={{ color: 'var(--clr-green)' }}>REAL COMPETITION.</p>
                  <p className="text-[var(--clr-coral)] font-display text-lg tracking-wide">REAL COMMUNITY.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Wave */}
      <WaveDivider from="var(--clr-seafoam)" to="white" flip />

      {/* =========== TESTIMONIALS =========== */}
      <section className="py-16 sm:py-20 bg-white" data-testid="home-testimonials-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="green-accent-line mx-auto" />
            <p className="text-[var(--clr-green)] text-xs font-bold uppercase tracking-widest mb-3">Member Stories</p>
            <h2 className="font-display text-4xl sm:text-5xl tracking-wide" style={{ color: 'var(--clr-charcoal)' }}>HEAR IT FROM THE MEMBERS</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="card-light p-6 hover:-translate-y-1 transition-transform duration-200">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, j) => <Star key={j} size={14} fill="var(--clr-coral)" className="text-[var(--clr-coral)]" />)}
                </div>
                <p className="text-[var(--clr-text)] text-sm leading-relaxed mb-5">"{t.text}"</p>
                <div className="border-t pt-4" style={{ borderColor: 'var(--clr-border)' }}>
                  <p className="text-[var(--clr-charcoal)] font-bold text-sm">{t.name}</p>
                  <p className="text-[var(--clr-text-light)] text-xs mt-0.5">{t.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========== CTA BLOCK =========== */}
      <section className="py-16 sm:py-20 relative overflow-hidden"
        style={{ backgroundImage: `url(${COASTAL_IMG})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="absolute inset-0" style={{ background: 'rgba(13,93,62,0.82)' }} />
        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-block w-12 h-1 bg-[var(--clr-seafoam)] rounded-full mb-5 mx-auto" />
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl text-white tracking-wide mb-4">
            STRENGTH IS THE<br />FOUNDATION.
          </h2>
          <p className="text-white/85 text-base mb-8 font-semibold">
            Whether you surf, climb, run trails, or just want to stay capable for life — it starts here.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href={GYM_CONFIG.joinUrl} target="_blank" rel="noopener noreferrer"
              data-testid="home-final-cta-join-now-button"
              className="bg-[var(--clr-coral)] text-white font-bold rounded-[var(--radius-md)] px-8 py-4 text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:bg-[var(--clr-coral-dark)] hover:-translate-y-0.5"
              style={{ boxShadow: '0 4px 20px rgba(250,90,92,0.35)' }}>
              Join Santa Cruz Strength
            </a>
            <button
              onClick={() => document.getElementById('tour-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              data-testid="home-final-cta-book-visit-button"
              className="bg-white/15 backdrop-blur text-white font-bold rounded-[var(--radius-md)] px-8 py-4 text-sm border-2 border-white/30 hover:bg-white/25 transition-all duration-200">
              Book a Tour First
            </button>
          </div>
          <p className="text-white/55 text-xs mt-5">No commitment required for a tour.</p>
        </div>
      </section>

      {/* Wave */}
      <WaveDivider from="var(--clr-bg)" to="var(--clr-green)" />

      {/* =========== FAQ =========== */}
      <section className="py-16 sm:py-20" style={{ background: 'var(--clr-bg)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="green-accent-line mx-auto" />
            <h2 className="font-display text-4xl sm:text-5xl tracking-wide" style={{ color: 'var(--clr-charcoal)' }} data-testid="home-faq-accordion">
              COMMON QUESTIONS
            </h2>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`}
                className="bg-white rounded-[var(--radius-lg)] px-5 border-none"
                style={{ boxShadow: 'var(--shadow-sm)', border: '1px solid var(--clr-border)' }}>
                <AccordionTrigger
                  className="text-[var(--clr-charcoal)] text-sm font-bold py-4 hover:no-underline hover:text-[var(--clr-green)]">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-[var(--clr-text-muted)] text-sm leading-relaxed pb-4">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* =========== LOCAL SECTION =========== */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="green-accent-line mx-auto" />
            <h2 className="font-display text-4xl sm:text-5xl tracking-wide" style={{ color: 'var(--clr-charcoal)' }}>FIND US IN SANTA CRUZ</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card-light p-6" data-testid="contact-address-block">
              <h3 className="font-display text-2xl tracking-wide mb-5" style={{ color: 'var(--clr-green)' }}>VISIT US</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <MapPin size={17} style={{ color: 'var(--clr-green)', marginTop: 2 }} className="shrink-0" />
                  <div>
                    <p className="text-[var(--clr-charcoal)] text-sm font-bold">{GYM_CONFIG.address.full}</p>
                    <p className="text-[var(--clr-text-light)] text-xs mt-0.5">Harvey West Business Park · Free parking</p>
                  </div>
                </li>
                <li>
                  <a href={GYM_CONFIG.phoneHref} data-testid="contact-click-to-call-button" className="flex items-center gap-3 group">
                    <Phone size={17} style={{ color: 'var(--clr-green)' }} />
                    <span className="font-bold text-sm text-[var(--clr-charcoal)] group-hover:text-[var(--clr-green)] transition-colors duration-200">{GYM_CONFIG.phone}</span>
                  </a>
                </li>
              </ul>
              <div className="mt-5 pt-5 border-t" style={{ borderColor: 'var(--clr-border)' }} data-testid="contact-hours-block">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={14} style={{ color: 'var(--clr-green)' }} />
                  <h4 className="text-[var(--clr-charcoal)] text-xs font-bold uppercase tracking-wider">Access & Hours</h4>
                </div>
                <ul className="space-y-2">
                  {GYM_CONFIG.hours.map((h, i) => (
                    <li key={i}>
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--clr-text-muted)] font-semibold">{h.days}</span>
                        <span className="text-[var(--clr-charcoal)] font-bold">{h.hours}</span>
                      </div>
                      {h.note && <p className="text-[var(--clr-text-light)] text-xs mt-0.5 text-right">{h.note}</p>}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-5">
                <a href={GYM_CONFIG.phoneHref} className="btn-primary w-full py-3 text-sm text-center block">Call to Book a Tour</a>
              </div>
            </div>
            <div className="rounded-[var(--radius-xl)] overflow-hidden h-[400px] md:h-auto" style={{ boxShadow: 'var(--shadow-md)', border: '1px solid var(--clr-border)' }} data-testid="contact-map-embed">
              <iframe title="Santa Cruz Strength Location"
                src="https://maps.google.com/maps?q=151+Harvey+West+Blvd+Ste+D+Santa+Cruz+CA+95060&output=embed"
                width="100%" height="100%" style={{ border: 0, minHeight: '350px' }}
                allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </div>
          </div>
        </div>
      </section>

      {/* =========== FINAL CTA =========== */}
      <section className="py-14" style={{ background: 'var(--clr-coral)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-4xl sm:text-5xl text-white tracking-wide mb-3">READY TO TRAIN SERIOUSLY?</h2>
          <p className="text-white/85 text-base mb-6 font-semibold">Come see what a real strength gym feels like.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href={GYM_CONFIG.joinUrl} target="_blank" rel="noopener noreferrer"
              className="bg-white text-[var(--clr-coral)] font-bold rounded-[var(--radius-md)] px-8 py-3.5 text-sm hover:bg-white/90 transition-all duration-200 active:scale-[0.98]">
              Join Santa Cruz Strength
            </a>
            <Link to="/contact"
              className="border-2 border-white/40 text-white font-bold rounded-[var(--radius-md)] px-8 py-3.5 text-sm hover:bg-white/15 transition-all duration-200">
              Talk to a Coach
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
