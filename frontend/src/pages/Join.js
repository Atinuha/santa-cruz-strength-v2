import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import LeadForm from '../components/LeadForm';
import { GYM_CONFIG } from '../config';
import { ArrowRight, CheckCircle2, Users, Dumbbell, Clock, Key } from 'lucide-react';

const JOIN_IMG = 'https://images.unsplash.com/photo-1688521010779-5a04998b6d1d?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=1400';

const MEMBERSHIP_PERKS = [
  '24/7 facility access via our app',
  'Unlimited open gym and coached strength classes',
  'Competition-grade equipment and dedicated platforms',
  'Welcoming community of serious athletes',
  'Month-to-month and commitment options available',
];

export default function Join() {
  return (
    <div className="min-h-screen bg-[var(--ink)]">
      <Navbar />

      <section className="relative pt-32 pb-16 sm:pb-20"
        style={{
          backgroundImage: `url(${JOIN_IMG})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
        }}>
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--ink)]/92 via-[var(--ink)]/80 to-[var(--ink)]" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
          <span className="green-accent-line" />
          <p className="text-[#1B7A4A] text-xs font-semibold uppercase tracking-widest mb-3">Membership</p>
          <h1 className="font-display text-5xl sm:text-6xl text-white tracking-wide mb-4">
            READY TO JOIN?
          </h1>
          <p className="text-white/55 text-base max-w-xl">
            Two paths. One for people ready to start today, one for people who want to see the space first.
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-20 bg-[var(--ink)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Path 1 */}
            <div className="card-marketing p-8 border-[#1B7A4A]/25 bg-[#1B7A4A]/5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-[#1B7A4A] flex items-center justify-center text-white font-bold text-lg">1</div>
                <div>
                  <h2 className="font-display text-2xl text-white tracking-wide">JOIN NOW</h2>
                  <p className="text-white/62 text-xs">Complete enrollment online in a few minutes</p>
                </div>
              </div>

              <p className="text-white/55 text-sm leading-relaxed mb-6">
                Ready to commit? Enroll directly through our secure membership portal.
                Once confirmed, you\'ll receive your keycard access and onboarding details.
              </p>

              <ul className="space-y-2.5 mb-8">
                {MEMBERSHIP_PERKS.map((perk, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-white/65">
                    <CheckCircle2 size={15} className="text-[#1B7A4A] mt-0.5 shrink-0" />{perk}
                  </li>
                ))}
              </ul>

              <a href={GYM_CONFIG.joinUrl} target="_blank" rel="noopener noreferrer"
                className="btn-scs-primary w-full py-4 rounded-md font-bold text-sm text-center flex items-center justify-center gap-2"
                data-testid="join-page-join-now-button">
                Start My Membership <ArrowRight size={15} />
              </a>
              <p className="text-center text-xs text-white/42 mt-3">Secure enrollment via ABC Fitness platform</p>
            </div>

            {/* Path 2 */}
            <div className="card-marketing p-8">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-white/8 border border-white/12 flex items-center justify-center text-white font-bold text-lg">2</div>
                <div>
                  <h2 className="font-display text-2xl text-white tracking-wide">TOUR FIRST</h2>
                  <p className="text-white/62 text-xs">See the gym before you commit</p>
                </div>
              </div>

              <p className="text-white/55 text-sm leading-relaxed mb-6">
                Want to see the space and meet a coach before deciding? Fill out the form.
                We\'ll set up a no-pressure tour and answer all your questions.
              </p>

              <LeadForm source="website_form" ctaLabel="Request a Tour" />
            </div>
          </div>
        </div>
      </section>

      <section className="py-10 bg-[var(--surface)] border-y border-white/6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            {[
              { icon: <Key size={18} className="text-[#1B7A4A]" />, label: 'Members: 24/7 via App', desc: 'Download our app for access' },
              { icon: <Dumbbell size={18} className="text-[#1B7A4A]" />, label: 'Serious Equipment', desc: 'Competition-grade everything' },
              { icon: <Clock size={18} className="text-[#1B7A4A]" />, label: 'Day Passes: 9am–6pm', desc: 'Staffed hours vary by day' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                {item.icon}
                <p className="text-white text-sm font-semibold">{item.label}</p>
                <p className="text-white/52 text-xs">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
