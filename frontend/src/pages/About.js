import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { getTeamMembers, getSiteContent } from '../lib/api';
import PublicImage from '../components/PublicImage';
import { SCS_MEDIA } from '../config/media';
import { GYM_CONFIG } from '../config';
import { User, ArrowRight } from 'lucide-react';

export default function About() {
  const [team, setTeam] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [content, setContent] = useState({});
  useEffect(() => {
    getTeamMembers().then(({ data }) => { setTeam(data.filter(m => m.category === 'team')); setTrainers(data.filter(m => m.category === 'trainer')); }).catch(() => {});
    getSiteContent().then(({ data }) => setContent(data)).catch(() => {});
  }, []);
  const c = (key, fb = '') => (content[key] || fb).replace(/[\u2013\u2014]/g, ',');

  return (
    <div className="min-h-screen" style={{ background: 'var(--scs-bg)' }}>
      <Navbar />
      <section className="pt-28 pb-14" style={{ background: 'var(--scs-chalk)' }} data-testid="about-hero">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] mb-3" style={{ color: 'var(--scs-stone)' }}>About</p>
          <h1 className="font-display text-3xl sm:text-4xl mb-4" style={{ color: 'var(--scs-charcoal)' }}>{c('about_headline', 'Santa Cruz Strength')}</h1>
          {c('about_mission') && <p className="text-sm italic mb-6" style={{ color: 'var(--scs-stone)' }}>&ldquo;{c('about_mission')}&rdquo;</p>}
          {c('about_story') && <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--scs-text-muted)' }}>{c('about_story')}</p>}
        </div>
        {/* A real photograph of the room this page describes. It was deleted by
            an unreviewed checkpoint whose message asserted nothing had changed,
            and the owner noticed within the day. The file was vendored the
            whole time. */}
        <figure className="max-w-5xl mx-auto px-4 sm:px-6 mt-10">
          <div className="scs-photo overflow-hidden" style={{ borderRadius: 'var(--scs-radius)' }}>
            <PublicImage src={SCS_MEDIA.communityWide} alt="A large group gathered together on a strength training floor" width="1672" height="941" className="w-full h-auto" />
          </div>
          <figcaption className="text-xs mt-3" style={{ color: 'var(--scs-stone)' }}>Different goals. One room built around consistent work and mutual support.</figcaption>
        </figure>
      </section>

      {team.length > 0 && (
        <section className="py-14" style={{ background: 'var(--scs-bg)' }} data-testid="about-team-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <h2 className="font-display text-xl sm:text-2xl mb-8" style={{ color: 'var(--scs-charcoal)' }}>{c('about_team_headline', 'The Team')}</h2>
            {c('about_team_subtitle') && <p className="text-sm -mt-6 mb-8" style={{ color: 'var(--scs-text-muted)' }}>{c('about_team_subtitle')}</p>}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 max-w-3xl">
              {team.map(t => (
                <div key={t.id} data-testid={`about-team-${t.id}`}>
                  <div className="w-full aspect-square overflow-hidden mb-3 scs-photo" style={{ borderRadius: 'var(--scs-radius)' }}>
                    {t.photo_url ? <img src={t.photo_url} alt={`${t.name}, ${t.role}`} className="w-full h-full object-cover object-top" loading="lazy" />
                    : <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--scs-chalk)' }}><User size={36} style={{ color: 'var(--scs-stone)', opacity: 0.4 }} /></div>}
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

      {trainers.length > 0 && (
        <section className="py-14" style={{ background: 'var(--scs-chalk)', borderTop: '1px solid var(--scs-border)' }} data-testid="about-trainers-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <h2 className="font-display text-xl sm:text-2xl mb-8" style={{ color: 'var(--scs-charcoal)' }}>{c('about_trainers_headline', 'Trainers')}</h2>
            {c('about_trainers_subtitle') && <p className="text-sm -mt-6 mb-8" style={{ color: 'var(--scs-text-muted)' }}>{c('about_trainers_subtitle')}</p>}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {trainers.map(t => (
                <div key={t.id} data-testid={`about-trainer-${t.id}`}>
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

      <section className="py-14" style={{ background: 'var(--scs-bg)', borderTop: '1px solid var(--scs-border)' }} data-testid="about-cta">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-xl sm:text-2xl mb-4" style={{ color: 'var(--scs-charcoal)' }}>{c('about_cta_headline', 'Come See for Yourself')}</h2>
          {c('about_cta_text') && <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--scs-text-muted)' }}>{c('about_cta_text')}</p>}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/contact" className="btn-clay px-6 py-3 text-sm" data-testid="about-tour-btn">Book a Free Facility Tour</Link>
            <Link to="/join" className="btn-outline px-6 py-3 text-sm" data-testid="about-join-btn">Compare Memberships</Link>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 mt-6">
            <Link to="/personal-training" className="text-sm inline-flex items-center gap-1.5" style={{ color: 'var(--scs-clay)' }} data-testid="about-pt-link">Learn about Personal Training <ArrowRight size={14} /></Link>
            <a href={GYM_CONFIG.phoneHref} className="text-sm" style={{ color: 'var(--scs-charcoal)' }} data-testid="about-phone">Call {GYM_CONFIG.phone}</a>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
