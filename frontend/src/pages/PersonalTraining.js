import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import QuizForm from '../components/QuizForm';
import { GYM_CONFIG } from '../config';
import { SCS_MEDIA } from '../config/media';
import { getTeamMembers, getSiteContent } from '../lib/api';
import { CheckCircle2, User, ArrowRight } from 'lucide-react';
import { preloaded } from '../lib/preload';

const PT_IMG = SCS_MEDIA.openGym;

export default function PersonalTraining() {
  const [trainers, setTrainers] = useState(() => preloaded('team', []).filter(m => m.category === 'trainer'));
  const [c, setC] = useState(() => preloaded('content', {}));
  useEffect(() => {
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

      {/* The page had a hero, a four-item list and a form. It told a visitor
          the service exists and nothing about what buying it involves: not how
          it starts, not what the first meeting is, not who would coach them.
          That is thin for a person and unanswerable for a machine.

          What follows adds only steps this business actually performs. The
          inquiry goes to a coach, the coach makes contact to understand the
          goal, and a consultation is arranged. Rates, package sizes, session
          length and cancellation terms are all absent, because they are
          published nowhere and nobody has confirmed them. They are listed as
          owner questions in the handoff rather than estimated here. */}
      <section className="py-14" style={{ background: 'var(--scs-bg)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="font-display text-xl sm:text-2xl mb-5" style={{ color: 'var(--scs-charcoal)' }}>Who personal training is for</h2>
              <ul className="space-y-3 mb-6">
                {['People new to lifting who want proper form from the start', 'Athletes returning from injury or building injury resilience', 'Lifters who want structured programming', 'Anyone who wants a clear plan and direct coaching'].map((item, i) => (
                  <li key={`pt-${i}`} className="flex items-start gap-3 text-sm" style={{ color: 'var(--scs-text)' }}>
                    <span className="w-1 h-1 rounded-full mt-2 shrink-0" style={{ background: 'var(--scs-clay)' }} />{item}
                  </li>
                ))}
              </ul>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--scs-text-muted)' }}>
                Coaching is optional and separate from membership. You can train here on your own program, add coaching later, or start with a coach from your first session.
              </p>
            </div>
            <div id="talk-to-a-coach" className="p-6" style={{ background: 'var(--scs-warm-white)', border: '1px solid var(--scs-border)', borderRadius: 'var(--scs-radius)' }}>
              <h2 className="font-display-medium text-base mb-1" style={{ color: 'var(--scs-charcoal)' }}>Start with a conversation</h2>
              <p className="text-sm mb-5" style={{ color: 'var(--scs-text-muted)' }}>Tell us about your goals. No commitment, no card required.</p>
              <QuizForm source="personal_training_inquiry" noAutoFocus />
            </div>
          </div>
        </div>
      </section>

      <section className="py-14" style={{ background: 'var(--scs-warm-white)', borderTop: '1px solid var(--scs-border)' }} data-testid="pt-how-it-works">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="font-display text-xl sm:text-2xl mb-8" style={{ color: 'var(--scs-charcoal)' }}>How personal training works</h2>
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-6 list-none">
            {[
              { n: '01', h: 'You send an inquiry', d: 'Use the form on this page. It asks what you are training for and how to reach you, and it goes to a coach rather than a queue.' },
              { n: '02', h: 'A coach makes contact', d: 'Someone gets in touch to understand your goal, your training history and what your week realistically looks like, then arranges a consultation.' },
              { n: '03', h: 'You meet at the gym', d: 'The consultation happens on the floor, in the room you would be training in, with the equipment you would be using in front of you.' },
            ].map((step) => (
              <li key={step.n} className="p-6" style={{ background: 'var(--scs-bg)', border: '1px solid var(--scs-border)', borderRadius: 'var(--scs-radius)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-3" style={{ color: 'var(--scs-stone)' }}>{step.n}</p>
                <h3 className="font-display-medium text-base mb-2" style={{ color: 'var(--scs-charcoal)' }}>{step.h}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--scs-text-muted)' }}>{step.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-14" style={{ background: 'var(--scs-bg)' }} data-testid="pt-first-consultation">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="font-display text-xl sm:text-2xl mb-5" style={{ color: 'var(--scs-charcoal)' }}>What happens during your first consultation</h2>
          <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--scs-text)' }}>
            The first meeting is a conversation, not a sales appointment. A coach asks what you want to be able to do, what you have done before, what has hurt, and how many days a week you can genuinely train. You walk the floor together and look at the equipment your plan would use.
          </p>
          <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--scs-text)' }}>
            Bring anything a coach would otherwise have to guess at: a current program, a note from a physical therapist, a competition date, a list of the lifts that bother you. Wear something you could train in, in case it makes sense to move.
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--scs-text-muted)' }}>
            You leave knowing what training with a coach here would look like for you. Deciding on the spot is not expected.
          </p>
        </div>
      </section>

      {trainers.length > 0 && (
        <section className="py-14" style={{ background: 'var(--scs-chalk)', borderTop: '1px solid var(--scs-border)' }} data-testid="meet-trainers-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <h2 className="font-display text-xl sm:text-2xl mb-8" style={{ color: 'var(--scs-charcoal)' }}>Meet the coaches</h2>
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
