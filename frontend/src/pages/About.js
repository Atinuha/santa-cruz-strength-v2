import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { GYM_CONFIG } from '../config';
import { getTeamMembers, getSiteContent } from '../lib/api';
import { User, ArrowRight } from 'lucide-react';

export default function About() {
  const [team, setTeam] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [content, setContent] = useState({});

  useEffect(() => {
    window.scrollTo(0, 0);
    getTeamMembers().then(({ data }) => {
      setTeam(data.filter(m => m.category === 'team'));
      setTrainers(data.filter(m => m.category === 'trainer'));
    }).catch(() => {});
    getSiteContent().then(({ data }) => setContent(data)).catch(() => {});
  }, []);

  const c = (key, fallback = '') => content[key] || fallback;

  return (
    <div className="min-h-screen" style={{ background: 'var(--clr-bg)' }}>
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16" data-testid="about-hero">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <span className="green-accent-line mx-auto" />
          <p className="text-[var(--clr-green)] text-xs font-bold uppercase tracking-widest mb-3">About Us</p>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-wide mb-4" style={{ color: 'var(--clr-charcoal)' }}>
            {c('about_headline', 'THIS IS SANTA CRUZ STRENGTH')}
          </h1>
          <div className="inline-block px-5 py-2.5 rounded-full mb-8"
            style={{ background: 'var(--clr-bg-green)', border: '1px solid var(--clr-border-green)' }}>
            <p className="text-[var(--clr-green)] text-sm sm:text-base font-bold italic tracking-wide">
              "{c('about_mission', 'Come as you are, leave how you want!')}"
            </p>
          </div>
          <p className="text-[var(--clr-text)] text-sm sm:text-base leading-relaxed max-w-2xl mx-auto font-medium whitespace-pre-line">
            {c('about_story', '')}
          </p>
        </div>
      </section>

      {/* Meet the Team */}
      {team.length > 0 && (
        <section className="py-16 bg-white" data-testid="about-team-section">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <span className="green-accent-line mx-auto" />
              <p className="text-[var(--clr-green)] text-xs font-bold uppercase tracking-widest mb-3">
                {c('about_team_subtitle', 'The people behind the iron')}
              </p>
              <h2 className="font-display text-4xl sm:text-5xl tracking-wide" style={{ color: 'var(--clr-charcoal)' }}>
                {c('about_team_headline', 'MEET THE TEAM')}
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
              {team.map(t => (
                <div key={t.id} data-testid={`about-team-${t.id}`} className="group text-center">
                  <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-4 border-2 border-transparent group-hover:border-[var(--clr-green)] transition-all duration-300"
                    style={{ boxShadow: 'var(--shadow-md)' }}>
                    {t.photo_url ? (
                      <img src={t.photo_url} alt={t.name}
                        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--clr-bg-green)' }}>
                        <User size={48} style={{ color: 'var(--clr-green)', opacity: 0.4 }} />
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-base" style={{ color: 'var(--clr-charcoal)' }}>{t.name}</h3>
                  <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--clr-green)' }}>{t.role}</p>
                  {t.bio && <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--clr-text-muted)' }}>{t.bio}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Meet our Trainers */}
      {trainers.length > 0 && (
        <section className="py-16 border-t" style={{ background: 'var(--clr-bg)', borderColor: 'var(--clr-border)' }} data-testid="about-trainers-section">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <span className="green-accent-line mx-auto" />
              <p className="text-[var(--clr-green)] text-xs font-bold uppercase tracking-widest mb-3">
                {c('about_trainers_subtitle', 'Expert coaching for every level')}
              </p>
              <h2 className="font-display text-4xl sm:text-5xl tracking-wide" style={{ color: 'var(--clr-charcoal)' }}>
                {c('about_trainers_headline', 'MEET OUR TRAINERS')}
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {trainers.map(t => (
                <div key={t.id} data-testid={`about-trainer-${t.id}`} className="group text-center">
                  <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-4 border-2 border-transparent group-hover:border-[var(--clr-green)] transition-all duration-300"
                    style={{ boxShadow: 'var(--shadow-md)' }}>
                    {t.photo_url ? (
                      <img src={t.photo_url} alt={t.name}
                        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--clr-bg-green)' }}>
                        <User size={48} style={{ color: 'var(--clr-green)', opacity: 0.4 }} />
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-base" style={{ color: 'var(--clr-charcoal)' }}>{t.name}</h3>
                  <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--clr-green)' }}>{t.role}</p>
                  {t.bio && <p className="text-xs mt-2 leading-relaxed" style={{ color: 'var(--clr-text-muted)' }}>{t.bio}</p>}
                </div>
              ))}
            </div>
            <div className="text-center mt-10">
              <Link to="/personal-training"
                className="inline-flex items-center gap-2 text-sm font-bold hover:gap-3 transition-all duration-200"
                style={{ color: 'var(--clr-green)' }}>
                Learn about Personal Training <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16 bg-white" data-testid="about-cta">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-3xl sm:text-4xl tracking-wide mb-4" style={{ color: 'var(--clr-charcoal)' }}>
            {c('about_cta_headline', 'COME SEE FOR YOURSELF')}
          </h2>
          <p className="text-[var(--clr-text-muted)] text-sm leading-relaxed mb-8 max-w-lg mx-auto font-medium">
            {c('about_cta_text', '')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/join" className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-sm" data-testid="about-join-btn">
              View Membership Plans
            </Link>
            <a href={GYM_CONFIG.phoneHref}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-lg border transition-colors duration-200"
              style={{ color: 'var(--clr-green)', borderColor: 'var(--clr-border-green)' }}>
              Call: {GYM_CONFIG.phone}
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
