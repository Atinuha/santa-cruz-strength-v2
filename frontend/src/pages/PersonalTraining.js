import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, ClipboardList, Dumbbell, Eye, Users } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import QuizForm from '../components/QuizForm';
import PublicImage from '../components/PublicImage';
import { getTeamMembers } from '../lib/api';
import { SCS_MEDIA } from '../config/media';

const PREVIEW_MODE = process.env.REACT_APP_PREVIEW_MODE === 'true';

const COACHING_STEPS = [
  { icon: Eye, title: 'Start with observation', text: 'Talk through your goals, training history and the movements you want help with.' },
  { icon: ClipboardList, title: 'Build a practical plan', text: 'Use coaching to organize sessions, exercise choices and progression around your current ability.' },
  { icon: Dumbbell, title: 'Practice with feedback', text: 'Refine technique and make adjustments while you train on the equipment you will actually use.' },
];

const GOOD_FITS = [
  'Newer lifters who want a clear starting point',
  'Members who want more structure than open-gym access alone',
  'Lifters preparing for a strength goal or competition',
  'People who want direct feedback on technique and programming',
];

export default function PersonalTraining() {
  const [trainers, setTrainers] = useState([]);

  useEffect(() => {
    if (!PREVIEW_MODE) getTeamMembers().then(({ data }) => setTrainers(data.filter((member) => member.category === 'trainer'))).catch(() => {});
  }, []);

  return (
    <div className="scs-site scs-subpage min-h-screen">
      <Navbar />
      <main>
        <section className="scs-subhero scs-coaching-hero">
          <div className="scs-shell scs-subhero-layout">
            <div>
              <p className="scs-location-line"><Users size={17} aria-hidden="true" /> Personal training in Santa Cruz</p>
              <h1>Get a plan, a coach and useful feedback</h1>
              <p>Personal training at Santa Cruz Strength gives you a structured path through the room, with coaching tied to your goals and current experience.</p>
              <a href="#coach-form" className="scs-button scs-button-primary">Talk to a coach <ArrowRight size={17} aria-hidden="true" /></a>
            </div>
            <figure>
              <PublicImage src={SCS_MEDIA.coachingCloseup} alt="A coach giving an athlete focused feedback beside a loaded barbell" width="1122" height="1402" />
              <figcaption>Start with a conversation about what you want from training.</figcaption>
            </figure>
          </div>
        </section>

        <section className="scs-section scs-coaching-process" aria-labelledby="coaching-process-title">
          <div className="scs-shell">
            <div className="scs-section-heading scs-section-heading-wide">
              <h2 id="coaching-process-title">What coaching should make clearer</h2>
              <p>A useful coaching relationship turns uncertainty into a repeatable training process.</p>
            </div>
            <div className="scs-process-grid">
              {COACHING_STEPS.map(({ icon: Icon, title, text }, index) => (
                <article key={title}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <Icon aria-hidden="true" />
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="scs-section scs-coaching-fit" aria-labelledby="coaching-fit-title">
          <div className="scs-shell scs-room-layout">
            <div className="scs-room-image"><PublicImage src={SCS_MEDIA.coachingFloor} alt="A coach cueing an athlete during a deadlift session" width="1672" height="941" /></div>
            <div className="scs-room-copy">
              <h2 id="coaching-fit-title">Who personal training can help</h2>
              <ul className="scs-check-list">
                {GOOD_FITS.map((item) => <li key={item}><Check aria-hidden="true" />{item}</li>)}
              </ul>
              <p>Coaching availability, trainer fit and scheduling are confirmed directly with the team.</p>
            </div>
          </div>
        </section>

        {trainers.length > 0 && (
          <section className="scs-section" aria-labelledby="trainers-title" data-testid="meet-trainers-section">
            <div className="scs-shell">
              <div className="scs-section-heading"><h2 id="trainers-title">Current trainers</h2><p>Profiles currently published by the Santa Cruz Strength team.</p></div>
              <div className="scs-trainer-grid">
                {trainers.map((trainer) => (
                  <article key={trainer.id} data-testid={`trainer-card-${trainer.id}`}>
                    {trainer.photo_url && <img src={trainer.photo_url} alt={trainer.name} loading="lazy" />}
                    <h3>{trainer.name}</h3>
                    {trainer.specialty && <p>{trainer.specialty}</p>}
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="scs-section scs-membership-help" id="coach-form" aria-labelledby="coach-form-title">
          <div className="scs-shell scs-tour-layout">
            <div className="scs-tour-intro">
              <p className="scs-location-line"><Dumbbell size={17} aria-hidden="true" /> Start the conversation</p>
              <h2 id="coach-form-title">Tell the team what you want to work on</h2>
              <p>Share your current experience and goal. The team will review the inquiry and coordinate the next step.</p>
              <ol className="scs-tour-steps">
                <li><span>1</span><div><strong>Describe the goal</strong><small>Give the coach useful context.</small></div></li>
                <li><span>2</span><div><strong>Discuss fit</strong><small>Confirm coaching and scheduling options.</small></div></li>
                <li><span>3</span><div><strong>Choose the next step</strong><small>Arrange a consultation or facility visit.</small></div></li>
              </ol>
            </div>
            <div className="scs-tour-form-panel"><QuizForm source="personal_training_inquiry" noAutoFocus /></div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
