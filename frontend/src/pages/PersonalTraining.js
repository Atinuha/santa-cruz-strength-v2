import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import QuizForm from '../components/QuizForm';
import BlueprintIcon from '../components/BlueprintIcon';
import CoachPlate from '../components/CoachPlate';
import { photo } from '../config/media';
import { getTeamMembers, getSiteContent } from '../lib/api';
import { preloaded } from '../lib/preload';

/* Who the service is for. The four audiences are the approved ones,
   unchanged; what is new is that each carries the equipment mark that
   matches it, so the list reads as four different people rather than
   four bullets. */
/* Inline prose links. Same weight and underline the rest of the site uses
   inside a sentence, so a link in body copy reads as part of the sentence
   rather than as a button someone bolted on. */
const INLINE_LINK = 'font-semibold underline underline-offset-4 decoration-1';
const INLINE_LINK_STYLE = { color: 'var(--scs-forest)' };

const AUDIENCES = [
  {
    icon: 'first-timer',
    text: (
      <>
        People <Link to="/blog/beginner-strength-training-santa-cruz" className={INLINE_LINK} style={INLINE_LINK_STYLE}>new to lifting</Link> who want proper form from the start
      </>
    ),
  },
  {
    icon: 'plate',
    text: (
      <>
        Athletes <Link to="/blog/return-to-lifting-after-injury" className={INLINE_LINK} style={INLINE_LINK_STYLE}>returning from injury</Link> or building injury resilience
      </>
    ),
  },
  { icon: 'own-program', text: 'Lifters who want structured programming' },
  { icon: 'competitor', text: 'Anyone who wants a clear plan and direct coaching' },
];

const STEPS = [
  { n: '01', icon: 'inquiry', h: 'You send an inquiry', d: 'Use the form on this page. It asks what you are training for and how to reach you, and it goes to a coach rather than a queue.' },
  { n: '02', icon: 'contact', h: 'A coach makes contact', d: 'Someone gets in touch to understand your goal, your training history and what your week realistically looks like, then arranges a consultation.' },
  { n: '03', icon: 'meet-here', h: 'You meet at the gym', d: 'The consultation happens on the floor, in the room you would be training in, with the equipment you would be using in front of you.' },
];

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

      <main id="main">
        {/* --------------------------------------------------------------
            HERO
            The coaches, the proposition and the way in, in one view.
            This page sells a conversation, so the form is the hero's
            right hand rather than something to scroll for.
            -------------------------------------------------------------- */}
        <section className="relative pt-16 on-dark on-photo" style={{ background: 'var(--scs-forest-deep)' }}>
          <img
            {...photo('coaching-crew', { sizes: '100vw', eager: true })}
            alt="Coaches on the lifting platform at Santa Cruz Strength"
            className="absolute inset-0 w-full h-full object-cover scs-photo"
            style={{ objectPosition: 'center 30%' }}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(100deg, rgba(6,48,31,0.95) 0%, rgba(6,48,31,0.80) 32%, rgba(6,48,31,0.28) 62%, rgba(6,48,31,0.10) 100%)' }} />
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              <div className="lg:col-span-6">
                <h1 className="font-display mb-5" style={{ color: 'var(--scs-white)', fontSize: 'clamp(2.25rem, 5.5vw, 3.75rem)', lineHeight: 0.96 }}>
                  Personal Training
                </h1>
                <p className="text-base sm:text-lg leading-relaxed max-w-lg m-0" style={{ color: 'var(--scs-text-on-dark)' }}>
                  {g('training_subtitle', 'Work with a coach to build strength, improve technique, and train with a plan that fits your goals.')}
                </p>
              </div>

              <div id="talk-to-a-coach" className="lg:col-span-5 lg:col-start-8 p-6 sm:p-7" style={{ background: 'var(--scs-white)', borderRadius: 'var(--scs-radius-card)', color: 'var(--scs-text)' }}>
                <h2 className="font-display-medium text-xl mb-1" style={{ color: 'var(--scs-forest)' }}>Start with a conversation</h2>
                <p className="text-sm mb-5" style={{ color: 'var(--scs-text-muted)' }}>Tell us about your goals. No commitment, no card required.</p>
                <QuizForm source="personal_training_inquiry" noAutoFocus />
              </div>
            </div>
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
        <section className="py-16 sm:py-20" style={{ background: 'var(--scs-cream)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl mb-10 max-w-xl" style={{ color: 'var(--scs-forest)', lineHeight: 0.98 }}>
              Who personal training is for
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {AUDIENCES.map((item, index) => (
                <li key={item.icon} data-reveal>
                  <BlueprintIcon name={item.icon} size={56} draw className="mb-4" />
                  <p className="text-base leading-relaxed m-0" style={{ color: 'var(--scs-text)' }}>{item.text}</p>
                </li>
              ))}
            </ul>
            <p className="text-base leading-relaxed mt-12 pt-8 max-w-[68ch]" style={{ color: 'var(--scs-text-muted)', borderTop: '1px solid var(--scs-border)' }}>
              Coaching is optional and separate from membership. You can train here on your own program, add coaching later, or start with a coach from your first session. <Link to="/join" className={INLINE_LINK} style={INLINE_LINK_STYLE}>Membership plans and prices</Link> are listed on their own page, and <Link to="/blog/personal-trainer-vs-open-gym-santa-cruz" className={INLINE_LINK} style={INLINE_LINK_STYLE}>personal trainer vs open gym</Link> compares the two ways of training.
            </p>
          </div>
        </section>

        <section className="py-16 sm:py-20 on-dark" style={{ background: 'var(--scs-forest-deep)' }} data-testid="pt-how-it-works">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl mb-12" style={{ color: 'var(--scs-white)' }}>How personal training works</h2>
            <ol className="scs-rail scs-rail-h grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8 pl-10 md:pl-0" style={{ color: 'var(--scs-mint)' }}>
              {STEPS.map((step) => (
                <li key={step.n}>
                  <span className="scs-rail-node absolute md:relative" style={{ left: 0, marginLeft: '-1px' }} aria-hidden="true" />
                  <div className="md:mt-7">
                    <BlueprintIcon name={step.icon} size={64} draw className="scs-blueprint-light mb-5" />
                    <h3 className="font-display-medium text-lg mb-2" style={{ color: 'var(--scs-white)' }}>{step.h}</h3>
                    <p className="text-sm leading-relaxed m-0" style={{ color: 'var(--scs-text-on-dark-muted)' }}>{step.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* --------------------------------------------------------------
            FIRST CONSULTATION

            No photograph here on purpose. There is no honest picture of a
            consultation at this gym in the asset set, and the media policy
            forbids substituting a different subject or generating one, so
            the section is typographic. When a real consultation frame
            exists it belongs on the left of this text.
            -------------------------------------------------------------- */}
        <section className="py-16 sm:py-20" style={{ background: 'var(--scs-mint)' }} data-testid="pt-first-consultation">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-4">
                <BlueprintIcon name="meet-here" size={112} draw className="mb-6" />
                <h2 className="font-display text-2xl sm:text-3xl m-0" style={{ color: 'var(--scs-forest)', lineHeight: 0.98 }}>
                  What happens during your first consultation
                </h2>
              </div>
              <div className="lg:col-span-7 lg:col-start-6">
                <p className="text-base leading-relaxed mb-5 max-w-[68ch]" style={{ color: 'var(--scs-text)' }}>
                  The first meeting is a conversation, not a sales appointment. A coach asks what you want to be able to do, what you have done before, what has hurt, and how many days a week you can genuinely train. You walk the floor together and look at the equipment your plan would use.
                </p>
                <p className="text-base leading-relaxed mb-5 max-w-[68ch]" style={{ color: 'var(--scs-text)' }}>
                  Bring anything a coach would otherwise have to guess at: a current program, a note from a physical therapist, a competition date, a list of the lifts that bother you. Wear something you could train in, in case it makes sense to move.
                </p>
                <p className="text-base leading-relaxed m-0 max-w-[68ch]" style={{ color: 'var(--scs-text-muted)' }}>
                  You leave knowing what training with a coach here would look like for you. Deciding on the spot is not expected. If you would rather see the room before you talk about coaching, you can <Link to="/contact" className={INLINE_LINK} style={INLINE_LINK_STYLE}>book a free facility tour</Link> instead.
                </p>
              </div>
            </div>
          </div>
        </section>

        {trainers.length > 0 && (
          <section className="py-16 sm:py-20" style={{ background: 'var(--scs-cream)' }} data-testid="meet-trainers-section">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
              <h2 className="font-display text-2xl sm:text-3xl mb-10" style={{ color: 'var(--scs-forest)' }}>Meet the coaches</h2>
              <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
                {trainers.map(t => (
                  <li key={t.id} data-testid={`trainer-card-${t.id}`}>
                    <div className="w-full aspect-square overflow-hidden mb-4 scs-frame">
                      {t.photo_url
                        ? <img src={t.photo_url} alt={`${t.name}, ${t.role}`} className="w-full h-full object-cover object-top scs-photo" loading="lazy" />
                        : <CoachPlate name={t.name} />}
                    </div>
                    <h3 className="font-display-medium text-base m-0" style={{ color: 'var(--scs-forest)' }}>{t.name}</h3>
                    <p className="text-xs uppercase tracking-[0.10em] mt-1 m-0" style={{ color: 'var(--scs-text-muted)' }}>{t.role}</p>
                    {t.bio && <p className="text-sm mt-2 leading-relaxed m-0" style={{ color: 'var(--scs-text-muted)' }}>{t.bio}</p>}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
