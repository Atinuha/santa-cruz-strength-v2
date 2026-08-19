import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CoachPlate from '../components/CoachPlate';
import BlueprintIcon from '../components/BlueprintIcon';
import { getTeamMembers, getSiteContent } from '../lib/api';
import { photo } from '../config/media';
import { GYM_CONFIG } from '../config';
import { ArrowRight } from 'lucide-react';
import { preloaded } from '../lib/preload';

export default function About() {
  const [team, setTeam] = useState(() => preloaded('team', []).filter(m => m.category === 'team'));
  const [trainers, setTrainers] = useState(() => preloaded('team', []).filter(m => m.category === 'trainer'));
  const [content, setContent] = useState(() => preloaded('content', {}));
  useEffect(() => {
    getTeamMembers().then(({ data }) => { setTeam(data.filter(m => m.category === 'team')); setTrainers(data.filter(m => m.category === 'trainer')); }).catch(() => {});
    getSiteContent().then(({ data }) => setContent(data)).catch(() => {});
  }, []);
  const c = (key, fb = '') => (content[key] || fb).replace(/[\u2013\u2014]/g, ',');

  return (
    <div className="min-h-screen" style={{ background: 'var(--scs-bg)' }}>
      <Navbar />

      <main id="main">
        {/* --------------------------------------------------------------
            OPENING

            The story used to be a centred column that read like a
            manifesto pinned to a wall. It is now an editorial spread:
            the owner's line set large on the left where a pull quote
            belongs, the story at a readable measure on the right. The
            words are the approved ones, from the content manager, and
            neither the mission nor the story is invented if the field
            is empty: the block simply does not render.
            -------------------------------------------------------------- */}
        <section className="pt-28 pb-14 sm:pb-20" style={{ background: 'var(--scs-cream)' }} data-testid="about-hero">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <h1 className="font-display mb-10" style={{ color: 'var(--scs-forest)', fontSize: 'clamp(2.5rem, 6.5vw, 4.5rem)', lineHeight: 0.94 }}>
              {c('about_headline', 'Santa Cruz Strength')}
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
              {c('about_mission') && (
                <figure className="lg:col-span-5 m-0">
                  <BlueprintIcon name="plate" size={44} className="mb-6" />
                  <blockquote className="scs-quote-lead font-display-medium m-0" style={{ color: 'var(--scs-forest)', textTransform: 'none', letterSpacing: '0' }}>
                    {c('about_mission')}
                  </blockquote>
                </figure>
              )}
              {c('about_story') && (
                <div className={c('about_mission') ? 'lg:col-span-6 lg:col-start-7' : 'lg:col-span-8'}>
                  <p className="text-base leading-relaxed whitespace-pre-line max-w-[68ch] m-0" style={{ color: 'var(--scs-text)' }}>
                    {c('about_story')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* A real photograph of the room this page describes. It was deleted by
              an unreviewed checkpoint whose message asserted nothing had changed,
              and the owner noticed within the day. The file was vendored the
              whole time. */}
          <figure className="max-w-7xl mx-auto px-4 sm:px-6 mt-14 mb-0">
            <div className="scs-frame">
              <img
                {...photo('community-medals', { sizes: '(min-width: 1280px) 1200px, 100vw' })}
                alt="A large group gathered together on a strength training floor"
                className="w-full h-auto scs-photo"
              />
            </div>
            <figcaption className="text-sm mt-3" style={{ color: 'var(--scs-text-muted)' }}>
              Different goals. One room built around consistent work and mutual support.
            </figcaption>
          </figure>
        </section>

        {team.length > 0 && (
          <section className="py-16 sm:py-20" style={{ background: 'var(--scs-mint)' }} data-testid="about-team-section">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
              <h2 className="font-display text-2xl sm:text-3xl mb-2" style={{ color: 'var(--scs-forest)' }}>{c('about_team_headline', 'The Team')}</h2>
              {c('about_team_subtitle') && <p className="text-base mb-10 max-w-[62ch]" style={{ color: 'var(--scs-text-muted)' }}>{c('about_team_subtitle')}</p>}
              <ul className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl">
                {team.map(t => (
                  <li key={t.id} data-testid={`about-team-${t.id}`}>
                    <div className="w-full aspect-square overflow-hidden mb-4 scs-frame">
                      {t.photo_url
                        ? <img src={t.photo_url} alt={`${t.name}, ${t.role}`} className="w-full h-full object-cover object-top scs-photo" loading="lazy" />
                        : <CoachPlate name={t.name} />}
                    </div>
                    <h3 className="font-display-medium text-lg m-0" style={{ color: 'var(--scs-forest)' }}>{t.name}</h3>
                    <p className="text-xs uppercase tracking-[0.10em] mt-1 m-0" style={{ color: 'var(--scs-text-muted)' }}>{t.role}</p>
                    {t.bio && <p className="text-sm mt-2 leading-relaxed m-0" style={{ color: 'var(--scs-text-muted)' }}>{t.bio}</p>}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {trainers.length > 0 && (
          <section className="py-16 sm:py-20" style={{ background: 'var(--scs-cream)' }} data-testid="about-trainers-section">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
              <h2 className="font-display text-2xl sm:text-3xl mb-2" style={{ color: 'var(--scs-forest)' }}>{c('about_trainers_headline', 'Trainers')}</h2>
              {c('about_trainers_subtitle') && <p className="text-base mb-10 max-w-[62ch]" style={{ color: 'var(--scs-text-muted)' }}>{c('about_trainers_subtitle')}</p>}
              <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
                {trainers.map(t => (
                  <li key={t.id} data-testid={`about-trainer-${t.id}`}>
                    <div className="w-full aspect-square overflow-hidden mb-4 scs-frame">
                      {t.photo_url
                        ? <img src={t.photo_url} alt={`${t.name}, ${t.role}`} className="w-full h-full object-cover object-top scs-photo" loading="lazy" />
                        : <CoachPlate name={t.name} tone="mint" />}
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

        <section className="py-16 sm:py-20 on-dark" style={{ background: 'var(--scs-forest-deep)' }} data-testid="about-cta">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
              <div className="lg:col-span-7">
                <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl mb-4" style={{ color: 'var(--scs-white)', lineHeight: 0.96 }}>
                  {c('about_cta_headline', 'Come See for Yourself')}
                </h2>
                {c('about_cta_text') && (
                  <p className="text-base leading-relaxed max-w-[62ch] m-0" style={{ color: 'var(--scs-text-on-dark-muted)' }}>
                    {c('about_cta_text')}
                  </p>
                )}
              </div>
              <div className="lg:col-span-4 lg:col-start-9">
                <div className="flex flex-col gap-3">
                  <Link to="/contact#tour-request" className="btn-clay text-sm" data-testid="about-tour-btn">Book a Free Facility Tour</Link>
                  <Link to="/join" className="btn-outline btn-outline-on-dark text-sm" data-testid="about-join-btn">Compare Memberships</Link>
                </div>
                <div className="flex flex-col gap-3 mt-6 pt-6" style={{ borderTop: '1px solid var(--scs-border-dark)' }}>
                  <Link to="/personal-training" className="scs-advance text-sm inline-flex items-center gap-2 py-1.5" style={{ color: 'var(--scs-mint)' }} data-testid="about-pt-link">
                    Learn about Personal Training <ArrowRight size={14} />
                  </Link>
                  <a href={GYM_CONFIG.phoneHref} className="text-sm py-1.5 inline-block" style={{ color: 'var(--scs-text-on-dark)' }} data-testid="about-phone">Call {GYM_CONFIG.phone}</a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
