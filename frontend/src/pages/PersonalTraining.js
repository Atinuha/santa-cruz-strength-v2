import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import LeadForm from '../components/LeadForm';
import { GYM_CONFIG } from '../config';
import { CheckCircle2, Target, Zap, Heart } from 'lucide-react';

const PT_IMG = 'https://images.unsplash.com/photo-1750698545009-679820502908?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=1400';

const PT_BENEFITS = [
  { icon: <Target size={19} className="text-[#1B7A4A]" />, title: 'Goal-Specific Programming', desc: 'Every session is structured around your goals — strength development, injury recovery, performance, or competition preparation.' },
  { icon: <Zap size={19} className="text-[#1B7A4A]" />, title: 'Technical Foundation', desc: 'Build the movement mechanics that last a lifetime. Proper patterns, coached from day one.' },
  { icon: <Heart size={19} className="text-[#1B7A4A]" />, title: 'Long-Term Capability', desc: 'We train for decades, not just months. Programming that keeps you strong and healthy into your 40s, 50s, and beyond.' },
];

const PT_WHO = [
  'First-time lifters building a strong foundation',
  'Athletes recovering from or preventing injury',
  'Competitive lifters wanting expert program design',
  'Outdoor athletes training for performance',
  'People who want structure, not just access',
  'Anyone ready to invest seriously in their training',
];

export default function PersonalTraining() {
  return (
    <div className="min-h-screen bg-[var(--ink)]">
      <Navbar />

      <section className="relative pt-32 pb-16"
        style={{
          backgroundImage: `url(${PT_IMG})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
        }}>
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--ink)]/88 via-[var(--ink)]/82 to-[var(--ink)]" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
          <span className="green-accent-line" />
          <p className="text-[#1B7A4A] text-xs font-semibold uppercase tracking-widest mb-3">1-on-1 Coaching</p>
          <h1 className="font-display text-5xl sm:text-6xl text-white tracking-wide mb-4">
            PERSONAL TRAINING
            <br />THAT RESPECTS YOUR TIME.
          </h1>
          <p className="text-white/55 text-base max-w-xl">
            Work directly with a Santa Cruz Strength coach to build real strength,
            master technique, and train with purpose.
          </p>
        </div>
      </section>

      <section className="py-16 bg-[var(--ink)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
            {PT_BENEFITS.map((b, i) => (
              <div key={i} className="card-marketing p-6">
                <div className="mb-3">{b.icon}</div>
                <h3 className="text-white font-semibold text-sm mb-2">{b.title}</h3>
                <p className="text-white/65 text-sm leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <span className="green-accent-line" />
              <h2 className="font-display text-4xl text-white tracking-wide mb-5">WHO IS THIS FOR?</h2>
              <p className="text-white/55 text-sm leading-relaxed mb-6">
                Personal training at Santa Cruz Strength isn\'t passive. It\'s structured coaching
                for people who want results faster, safer, and with lasting technique.
              </p>
              <ul className="space-y-3">
                {PT_WHO.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-white/65">
                    <CheckCircle2 size={15} className="text-[#1B7A4A] mt-0.5 shrink-0" />{item}
                  </li>
                ))}
              </ul>
              <div className="mt-8 p-5 bg-[#1B7A4A]/8 border border-[#1B7A4A]/18 rounded-xl">
                <p className="text-white/75 text-sm font-medium mb-1">How to get started</p>
                <p className="text-white/65 text-sm leading-relaxed">
                  Reach out below. A coach will contact you, learn about your goals, and
                  schedule a first consultation. No contracts to try it.
                </p>
              </div>
            </div>

            <div className="card-marketing p-6">
              <h2 className="font-display text-2xl text-white tracking-wide mb-2">TALK TO A COACH</h2>
              <p className="text-white/62 text-sm mb-5">Tell us about your goals and we\'ll schedule a consultation.</p>
              <LeadForm source="personal_training_inquiry" ctaLabel="Request a Consultation" />
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 bg-[var(--surface)] border-t border-white/6">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-3xl sm:text-4xl text-white tracking-wide mb-4">
            READY TO TRAIN WITH PURPOSE?
          </h2>
          <p className="text-white/65 text-sm mb-6">Fill out the form above or call us directly.</p>
          <a href={GYM_CONFIG.phoneHref}
            className="btn-scs-primary inline-flex items-center gap-2 px-6 py-3 rounded-md font-semibold text-sm">
            Call Us: {GYM_CONFIG.phone}
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
