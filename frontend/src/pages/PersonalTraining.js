import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import QuizForm from '../components/QuizForm';
import { GYM_CONFIG } from '../config';
import { CheckCircle2, Target, Zap, Heart } from 'lucide-react';

const PT_IMG = 'https://customer-assets.emergentagent.com/job_local-gym-hub/artifacts/hvzhmt0n_Chris_5.JPEG';

const PT_BENEFITS = [
  { icon: <Target size={19} style={{ color: 'var(--clr-green)' }} />, title: 'Goal-Specific Programming', desc: 'Every session is structured around your goals: strength, injury recovery, performance, or competition prep.' },
  { icon: <Zap size={19} style={{ color: 'var(--clr-green)' }} />, title: 'Technical Foundation', desc: 'Build the movement mechanics that last a lifetime. Proper patterns, coached from day one.' },
  { icon: <Heart size={19} style={{ color: 'var(--clr-green)' }} />, title: 'Long-Term Capability', desc: 'We train for decades, not just months. Programming that keeps you strong and healthy for life.' },
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
    <div className="min-h-screen" style={{ background: 'var(--clr-bg)' }}>
      <Navbar />
      <section className="relative pt-32 pb-16"
        style={{ backgroundImage: `url(${PT_IMG})`, backgroundSize: 'cover', backgroundPosition: 'center 30%' }}>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(247,245,240,0.90), rgba(247,245,240,1))' }} />
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
          <span className="green-accent-line" />
          <p className="text-[var(--clr-green)] text-xs font-bold uppercase tracking-widest mb-3">1-on-1 Coaching</p>
          <h1 className="font-display text-5xl sm:text-6xl tracking-wide mb-4" style={{ color: 'var(--clr-charcoal)' }}>PERSONAL TRAINING<br />THAT RESPECTS YOUR TIME.</h1>
          <p className="text-[var(--clr-text)] text-base max-w-xl font-semibold">Work directly with a Santa Cruz Strength coach to build real strength, master technique, and train with purpose.</p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
            {PT_BENEFITS.map((b, i) => (
              <div key={i} className="card-light p-6">
                <div className="w-10 h-10 bg-[var(--clr-bg-green)] rounded-xl flex items-center justify-center mb-3">{b.icon}</div>
                <h3 className="text-[var(--clr-charcoal)] font-bold text-sm mb-2">{b.title}</h3>
                <p className="text-[var(--clr-text-muted)] text-sm leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <span className="green-accent-line" />
              <h2 className="font-display text-4xl tracking-wide mb-5" style={{ color: 'var(--clr-charcoal)' }}>WHO IS THIS FOR?</h2>
              <p className="text-[var(--clr-text)] text-sm leading-relaxed mb-6 font-semibold">Structured coaching for people who want results faster, safer, and with lasting technique.</p>
              <ul className="space-y-3">
                {PT_WHO.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm font-semibold text-[var(--clr-text)]">
                    <CheckCircle2 size={15} style={{ color: 'var(--clr-green)', marginTop: 2 }} className="shrink-0" />{item}
                  </li>
                ))}
              </ul>
              <div className="mt-8 p-5 rounded-[var(--radius-lg)]" style={{ background: 'var(--clr-bg-green)', border: '1px solid var(--clr-border-green)' }}>
                <p className="text-[var(--clr-charcoal)] text-sm font-bold mb-1">How to get started</p>
                <p className="text-[var(--clr-text-muted)] text-sm leading-relaxed">Fill out the form. A coach will contact you, learn about your goals, and schedule a first consultation.</p>
              </div>
            </div>
            <div className="card-light p-6">
              <h2 className="font-display text-2xl tracking-wide mb-2" style={{ color: 'var(--clr-green)' }}>TALK TO A COACH</h2>
              <p className="text-[var(--clr-text-muted)] text-sm mb-5">Tell us about your goals and we will schedule a consultation.</p>
              <QuizForm source="personal_training_inquiry" />
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 border-t" style={{ background: 'var(--clr-bg)', borderColor: 'var(--clr-border)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-3xl sm:text-4xl tracking-wide mb-4" style={{ color: 'var(--clr-charcoal)' }}>READY TO TRAIN WITH PURPOSE?</h2>
          <a href={GYM_CONFIG.phoneHref} className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-sm">
            Call Us: {GYM_CONFIG.phone}
          </a>
        </div>
      </section>
      <Footer />
    </div>
  );
}
