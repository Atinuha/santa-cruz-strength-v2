import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import LeadForm from '../components/LeadForm';
import { GYM_CONFIG } from '../config';
import { ArrowRight, CheckCircle2, Users, Dumbbell, Clock } from 'lucide-react';

const JOIN_IMG = 'https://images.unsplash.com/photo-1688521010779-5a04998b6d1d?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85&w=1400';

const MEMBERSHIP_PERKS = [
  'Unlimited access during all open gym hours',
  'Access to coached strength classes',
  'Competition-grade equipment and platforms',
  'Supportive community of serious athletes',
  'New member orientation with a coach',
  'Month-to-month and commitment options',
];

export default function Join() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />

      {/* Header */}
      <section
        className="relative pt-32 pb-16 sm:pb-20"
        style={{
          backgroundImage: `url(${JOIN_IMG})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 40%',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A]/90 via-[#0A0A0A]/80 to-[#0A0A0A]" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6">
          <span className="red-accent-line" />
          <p className="text-[#D32F2F] text-xs font-semibold uppercase tracking-widest mb-3">Membership</p>
          <h1 className="font-display text-5xl sm:text-6xl text-white tracking-wide mb-4">
            READY TO JOIN?<br />LET'S MAKE IT HAPPEN.
          </h1>
          <p className="text-white/60 text-base max-w-xl">
            Choose your path. Ready to sign up right now? Go straight to our online enrollment. Not quite ready? Fill in the form and a coach will reach out.
          </p>
        </div>
      </section>

      {/* Two Paths */}
      <section className="py-16 sm:py-20 bg-[#0A0A0A]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Path 1: Ready to Join */}
            <div className="card-marketing p-8 border-[#D32F2F]/30 bg-[#D32F2F]/5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-[#D32F2F] flex items-center justify-center text-white font-bold text-lg">
                  1
                </div>
                <div>
                  <h2 className="font-display text-2xl text-white tracking-wide">READY TO JOIN NOW</h2>
                  <p className="text-white/50 text-xs">Complete enrollment online in minutes</p>
                </div>
              </div>

              <p className="text-white/65 text-sm leading-relaxed mb-6">
                If you're ready to commit, you can complete your enrollment directly through our membership platform. It takes just a few minutes and you'll be set to train.
              </p>

              <ul className="space-y-2.5 mb-8">
                {MEMBERSHIP_PERKS.map((perk, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-white/70">
                    <CheckCircle2 size={16} className="text-[#D32F2F] mt-0.5 shrink-0" />
                    {perk}
                  </li>
                ))}
              </ul>

              <a
                href={GYM_CONFIG.joinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-scs-primary w-full py-4 rounded-md font-bold text-sm text-center flex items-center justify-center gap-2"
                data-testid="join-page-join-now-button"
              >
                Start My Membership <ArrowRight size={16} />
              </a>
              <p className="text-center text-xs text-white/30 mt-3">Secure enrollment via ABC Fitness platform</p>
            </div>

            {/* Path 2: Not Ready Yet */}
            <div className="card-marketing p-8">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white font-bold text-lg">
                  2
                </div>
                <div>
                  <h2 className="font-display text-2xl text-white tracking-wide">NOT READY YET?</h2>
                  <p className="text-white/50 text-xs">Talk to a coach first — no pressure</p>
                </div>
              </div>

              <p className="text-white/65 text-sm leading-relaxed mb-6">
                Have questions? Want to tour the gym first? Fill out the form below and a coach will reach out within 24 hours to answer your questions and set up a free visit.
              </p>

              <LeadForm source="website_form" />
            </div>
          </div>
        </div>
      </section>

      {/* Info strip */}
      <section className="py-10 bg-[#111214] border-y border-white/6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            {[
              { icon: <Users size={20} className="text-[#D32F2F]" />, label: 'All levels welcome', desc: 'From first timers to competitors' },
              { icon: <Dumbbell size={20} className="text-[#D32F2F]" />, label: 'Serious equipment', desc: 'Competition-grade everything' },
              { icon: <Clock size={20} className="text-[#D32F2F]" />, label: 'Flexible hours', desc: 'Early morning to evening' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                {item.icon}
                <p className="text-white text-sm font-semibold">{item.label}</p>
                <p className="text-white/40 text-xs">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
