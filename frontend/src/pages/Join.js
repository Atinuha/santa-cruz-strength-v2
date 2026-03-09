import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import QuizForm from '../components/QuizForm';
import { GYM_CONFIG } from '../config';
import { ArrowRight, CheckCircle2, Key, Dumbbell, Clock } from 'lucide-react';

const JOIN_IMG = 'https://customer-assets.emergentagent.com/job_local-gym-hub/artifacts/zexxrigp_IMG_1134.jpeg';

const MEMBERSHIP_PERKS = [
  '24/7 facility access via our app',
  'Unlimited open gym and coached strength classes',
  'Competition-grade equipment and dedicated platforms',
  'Welcoming community of serious athletes',
  'Month-to-month and commitment options available',
];

export default function Join() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--clr-bg)' }}>
      <Navbar />
      <section className="relative pt-32 pb-16 sm:pb-20"
        style={{ backgroundImage: `url(${JOIN_IMG})`, backgroundSize: 'cover', backgroundPosition: 'center 40%' }}>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(247,245,240,0.92), rgba(247,245,240,1))' }} />
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
          <span className="green-accent-line" />
          <p className="text-[var(--clr-green)] text-xs font-bold uppercase tracking-widest mb-3">Membership</p>
          <h1 className="font-display text-5xl sm:text-6xl tracking-wide mb-4" style={{ color: 'var(--clr-charcoal)' }}>READY TO JOIN?</h1>
          <p className="text-[var(--clr-text)] text-base max-w-xl font-semibold">Two paths. Ready now? Go straight to signup. Not quite? Book a tour first.</p>
        </div>
      </section>

      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-[var(--radius-xl)] p-8" style={{ background: 'var(--clr-bg-green)', border: '2px solid var(--clr-border-green)', boxShadow: 'var(--shadow-md)' }}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-[var(--clr-green)] flex items-center justify-center text-white font-bold text-lg">1</div>
                <div>
                  <h2 className="font-display text-2xl tracking-wide" style={{ color: 'var(--clr-green)' }}>JOIN NOW</h2>
                  <p className="text-[var(--clr-text-muted)] text-xs">Complete enrollment online in minutes</p>
                </div>
              </div>
              <p className="text-[var(--clr-text)] text-sm leading-relaxed mb-6">Ready to commit? Enroll directly through our secure membership portal.</p>
              <ul className="space-y-2.5 mb-8">
                {MEMBERSHIP_PERKS.map((perk, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm font-semibold text-[var(--clr-text)]">
                    <CheckCircle2 size={15} style={{ color: 'var(--clr-green)', marginTop: 2 }} className="shrink-0" />{perk}
                  </li>
                ))}
              </ul>
              <a href={GYM_CONFIG.joinUrl} target="_blank" rel="noopener noreferrer"
                className="btn-primary w-full py-4 text-sm text-center block" data-testid="join-page-join-now-button">
                Start My Membership <ArrowRight size={15} />
              </a>
            </div>

            <div className="card-light p-8">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-[var(--clr-seafoam)] flex items-center justify-center font-bold text-lg" style={{ color: 'var(--clr-green)' }}>2</div>
                <div>
                  <h2 className="font-display text-2xl tracking-wide" style={{ color: 'var(--clr-charcoal)' }}>TOUR FIRST</h2>
                  <p className="text-[var(--clr-text-muted)] text-xs">See the gym before you commit</p>
                </div>
              </div>
              <p className="text-[var(--clr-text)] text-sm leading-relaxed mb-6">Fill out the short form and a coach will set up a no-pressure tour.</p>
              <QuizForm source="website_form" />
            </div>
          </div>
        </div>
      </section>

      <section className="py-10 border-y" style={{ background: 'var(--clr-bg)', borderColor: 'var(--clr-border)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            {[
              { icon: <Key size={18} style={{ color: 'var(--clr-green)' }} />, label: 'Members: 24/7 via App', desc: 'Download our app for access' },
              { icon: <Dumbbell size={18} style={{ color: 'var(--clr-green)' }} />, label: 'Serious Equipment', desc: 'Competition-grade everything' },
              { icon: <Clock size={18} style={{ color: 'var(--clr-green)' }} />, label: 'Day Passes: 9am-6pm', desc: 'Staffed hours vary' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                {item.icon}
                <p className="text-[var(--clr-charcoal)] text-sm font-bold">{item.label}</p>
                <p className="text-[var(--clr-text-light)] text-xs">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
