import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import LeadForm from '../components/LeadForm';
import { GYM_CONFIG } from '../config';
import { CheckCircle2, Target, Zap, Heart, ChevronRight } from 'lucide-react';

const PT_IMG = 'https://images.unsplash.com/photo-1750698545009-679820502908?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=1400';

const PT_BENEFITS = [
  { icon: <Target size={20} className="text-[#D32F2F]" />, title: 'Goal-Driven Programming', desc: 'Every session is built around your specific goals — strength gains, injury prevention, sport performance, or competition prep.' },
  { icon: <Zap size={20} className="text-[#D32F2F]" />, title: 'Technical Mastery', desc: 'Learn to squat, deadlift, press, and move correctly. Proper mechanics build a foundation that lasts.' },
  { icon: <Heart size={20} className="text-[#D32F2F]" />, title: 'Accountability & Support', desc: 'Your coach is in your corner. Consistent check-ins, progress tracking, and adjustments as you improve.' },
];

const PT_WHO = [
  'Beginners who want to build a strong foundation',
  'Athletes returning from injury',
  'Competitive lifters looking for programming help',
  'People with specific performance goals',
  'Those who prefer structure over open gym',
  'Anyone who wants faster, safer progress',
];

export default function PersonalTraining() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />

      {/* Header */}
      <section
        className="relative pt-32 pb-16"
        style={{
          backgroundImage: `url(${PT_IMG})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A]/85 via-[#0A0A0A]/80 to-[#0A0A0A]" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
          <span className="red-accent-line" />
          <p className="text-[#D32F2F] text-xs font-semibold uppercase tracking-widest mb-3">1-on-1 Coaching</p>
          <h1 className="font-display text-5xl sm:text-6xl text-white tracking-wide mb-4">
            PERSONAL TRAINING<br />THAT ACTUALLY WORKS.
          </h1>
          <p className="text-white/60 text-base max-w-xl">
            Work directly with a Santa Cruz Strength coach to build real strength, master technique, and achieve your individual goals.
          </p>
        </div>
      </section>

      {/* PT Benefits */}
      <section className="py-16 bg-[#0A0A0A]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
            {PT_BENEFITS.map((b, i) => (
              <div key={i} className="card-marketing p-6">
                <div className="mb-3">{b.icon}</div>
                <h3 className="text-white font-semibold text-base mb-2">{b.title}</h3>
                <p className="text-white/55 text-sm leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>

          {/* Who PT is for */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <span className="red-accent-line" />
              <h2 className="font-display text-4xl text-white tracking-wide mb-5">IS PT RIGHT FOR YOU?</h2>
              <p className="text-white/60 text-sm leading-relaxed mb-6">
                Personal training at Santa Cruz Strength isn't about hand-holding — it's about accelerating your progress with expert guidance. Here's who it's for:
              </p>
              <ul className="space-y-3">
                {PT_WHO.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-white/70">
                    <CheckCircle2 size={16} className="text-[#D32F2F] mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8 p-5 bg-[#D32F2F]/8 border border-[#D32F2F]/20 rounded-xl">
                <p className="text-white/80 text-sm font-medium mb-1">How it works</p>
                <p className="text-white/55 text-sm leading-relaxed">
                  Reach out below. A coach will get in touch to learn about your goals and schedule a first session. No contracts required to try it out.
                </p>
              </div>
            </div>

            {/* PT Form */}
            <div className="card-marketing p-6">
              <h2 className="font-display text-2xl text-white tracking-wide mb-2">TALK TO A COACH</h2>
              <p className="text-white/50 text-sm mb-5">Tell us about your goals and we'll set up a consultation.</p>
              <LeadForm source="personal_training_inquiry" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 bg-[#111214] border-t border-white/6">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-3xl sm:text-4xl text-white tracking-wide mb-4">
            READY TO INVEST IN YOUR TRAINING?
          </h2>
          <p className="text-white/55 text-sm mb-6">Fill out the form above or call us directly. We'll match you with the right coach for your goals.</p>
          <a
            href={GYM_CONFIG.phoneHref}
            className="btn-scs-primary inline-flex items-center gap-2 px-6 py-3 rounded-md font-semibold text-sm"
          >
            Call Us Now: {GYM_CONFIG.phone}
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
