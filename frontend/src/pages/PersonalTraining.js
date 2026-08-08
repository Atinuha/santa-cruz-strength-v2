import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import QuizForm from '../components/QuizForm';
import { GYM_CONFIG } from '../config';
import { SCS_MEDIA } from '../config/media';
import { getTeamMembers, getSiteContent } from '../lib/api';
import { CheckCircle2, User, ArrowRight } from 'lucide-react';

const PT_IMG = SCS_MEDIA.openGym;

export default function PersonalTraining() {
  const [trainers, setTrainers] = useState([]);
  const [c, setC] = useState({});
  useEffect(() => {
    document.title = 'Personal Training | Santa Cruz Strength';
    getTeamMembers().then(({ data }) => setTrainers(data.filter(m => m.category === 'trainer'))).catch(() => {});
    getSiteContent().then(({ data }) => setC(data)).catch(() => {});
  }, []);
  const g = (key, fb) => c[key] || fb;

  return (
    <div className="min-h-screen" style={{ background: 'var(--scs-bg)' }}>
      <Navbar />
      <section className="relative pt-28 pb-14" style={{ background: 'var(--scs-chalk)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] mb-3" style={{ color: 'var(--scs-stone)' }}>Coaching</p>
          <h1 className="font-display text-3xl sm:text-4xl mb-4" style={{ color: 'var(--scs-charcoal)' }}>Personal Training</h1>
          <p className="text-sm max-w-lg" style={{ color: 'var(--scs-text-muted)' }}>{g('training_subtitle', 'Work with a coach to build strength, improve technique, and train with a plan that fits your goals.')}</p>
        </div>
      </section>

      <section className="py-14" style={{ background: 'var(--scs-bg)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="font-display text-xl sm:text-2xl mb-5" style={{ color: 'var(--scs-charcoal)' }}>Who This Is For</h2>
              <ul className="space-y-3 mb-6">
                {['People new to lifting who want proper form from the start', 'Athletes returning from injury or building injury resilience', 'Lifters who want structured programming', 'Anyone who wants a clear plan and direct coaching'].map((item, i) => (
                  <li key={`pt-${i}`} className="flex items-start gap-3 text-sm" style={{ color: 'var(--scs-text)' }}>
                    <span className="w-1 h-1 rounded-full mt-2 shrink-0" style={{ background: 'var(--scs-clay)' }} />{item}
                  </li>
                ))}
              </ul>
              <div className="p-4" style={{ background: 'var(--scs-chalk)', border: '1px solid var(--scs-border)', borderRadius: 'var(--scs-radius)' }}>
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--scs-charcoal)' }}>How to get started</p>
                <p className="text-sm" style={{ color: 'var(--scs-text-muted)' }}>Fill out the form. A coach will learn about your goals and set up a consultation.</p>
              </div>
            </div>
            <div className="p-6" style={{ background: 'var(--scs-warm-white)', border: '1px solid var(--scs-border)', borderRadius: 'var(--scs-radius)' }}>
              <h2 className="font-display-medium text-base mb-1" style={{ color: 'var(--scs-charcoal)' }}>Talk to a Coach</h2>
              <p className="text-sm mb-5" style={{ color: 'var(--scs-text-muted)' }}>Tell us about your goals.</p>
              <QuizForm source="personal_training_inquiry" noAutoFocus />
            </div>
          </div>
        </div>
      </section>

      {trainers.length > 0 && (
        <section className="py-14" style={{ background: 'var(--scs-chalk)', borderTop: '1px solid var(--scs-border)' }} data-testid="meet-trainers-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <h2 className="font-display text-xl sm:text-2xl mb-8" style={{ color: 'var(--scs-charcoal)' }}>Our Trainers</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {trainers.map(t => (
                <div key={t.id} data-testid={`trainer-card-${t.id}`}>
                  <div className="w-full aspect-square overflow-hidden mb-3 scs-photo" style={{ borderRadius: 'var(--scs-radius)' }}>
                    {t.photo_url ? <img src={t.photo_url} alt={`${t.name}, ${t.role}`} className="w-full h-full object-cover object-top" loading="lazy" />
                    : <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--scs-bg)' }}><User size={36} style={{ color: 'var(--scs-stone)', opacity: 0.4 }} /></div>}
                  </div>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--scs-charcoal)' }}>{t.name}</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--scs-stone)' }}>{t.role}</p>
                  {t.bio && <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--scs-text-muted)' }}>{t.bio}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
      <Footer />
    </div>
  );
}
