import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { getTeamMembers, getSiteContent } from '../lib/api';
import { User, ArrowRight } from 'lucide-react';

export default function About() {
  const [team, setTeam] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [content, setContent] = useState({});
  useEffect(() => {
    document.title = 'About | Santa Cruz Strength';
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
      </section>

      {team.length > 0 && (
        <section className="py-14" style={{ background: 'var(--scs-bg)' }} data-testid="about-team-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <h2 className="font-display text-xl sm:text-2xl mb-8" style={{ color: 'var(--scs-charcoal)' }}>{c('about_team_headline', 'The Team')}</h2>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {trainers.map(t => (
                <div key={t.id} data-testid={`about-trainer-${t.id}`}>
                  <div className="w-full aspect-square overflow-hidden mb-3 scs-photo" style={{ borderRadius: 'var(--scs-radius)' }}>
                    {t.photo_url ? <img src={t.photo_url} alt={`${t.name}, ${t.role}`} className="w-full h-full object-cover object-top" loading="lazy" />
                    : <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--scs-bg)' }}><User size={36} style={{ color: 'var(--scs-stone)', opacity: 0.4 }} /></div>}
                  </div>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--scs-charcoal)' }}>{t.name}</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--scs-stone)' }}>{t.role}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-14" style={{ background: 'var(--scs-bg)', borderTop: '1px solid var(--scs-border)' }} data-testid="about-cta">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-xl sm:text-2xl mb-4" style={{ color: 'var(--scs-charcoal)' }}>{c('about_cta_headline', 'Come See for Yourself')}</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/contact" className="btn-clay px-6 py-3 text-sm" data-testid="about-tour-btn">Book a Free Facility Tour</Link>
            <Link to="/join" className="btn-outline px-6 py-3 text-sm" data-testid="about-join-btn">Compare Memberships</Link>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
