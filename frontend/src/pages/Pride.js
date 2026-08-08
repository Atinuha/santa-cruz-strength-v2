import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GYM_CONFIG } from '../config';
import { SCS_MEDIA } from '../config/media';
import api from '../lib/api';
import { toast } from 'sonner';
import {
  CheckCircle2, ChevronRight, ChevronLeft, Loader2,
  Dumbbell, Calendar, Users, ArrowRight, MapPin, Phone,
} from 'lucide-react';

const EXPIRY = new Date('2026-08-01T00:00:00');
const ABC_GUEST_LINK = 'https://onlinejoin.abcfitness.com/guest/plan?club=31691';
const HERO_IMG = SCS_MEDIA.openGym;

const GOALS = [
  { id: 'day_pass', label: 'Free Day Pass', desc: 'Try the gym for a day and see if it fits.', icon: Dumbbell, bg: '#EBF5F0', border: '#3A7D5C', color: '#3A7D5C' },
  { id: 'membership', label: "I'm Ready to Join", desc: "Show me membership options.", icon: Users, bg: '#FFF0ED', border: '#E8614D', color: '#E8614D' },
  { id: 'tour', label: 'Book a Tour First', desc: 'I want to see the space before I commit.', icon: Calendar, bg: '#EEF2FF', border: '#3B82F6', color: '#3B82F6' },
];

const TOUR_STEPS = [
  { id: 'goals', title: "What are you looking to get out of training?", options: ['Build strength', 'Lose weight', 'Feel better overall', 'Train for a sport', 'Just need a gym'] },
  { id: 'timeline', title: 'When are you looking to start?', options: ['This week', 'This month', 'Just exploring'] },
  { id: 'contact_pref', title: 'Best way for us to reach you?', options: ['Call me', 'Text me', 'Email me'] },
];

export default function Pride() {
  const navigate = useNavigate();
  const [expired] = useState(new Date() >= EXPIRY);
  const [step, setStep] = useState('info');
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '' });
  const [tourData, setTourData] = useState({ goals: '', timeline: '', contact_pref: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const inputRef = useRef(null);


  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);
  useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, [step]);

  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--clr-bg)' }}>
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center" style={{ background: 'var(--clr-bg-green)' }}>
            <Dumbbell size={32} style={{ color: 'var(--clr-green)' }} />
          </div>
          <h1 className="font-display text-3xl tracking-wide mb-3" style={{ color: 'var(--clr-charcoal)' }}>THIS OFFER HAS ENDED</h1>
          <p className="text-[var(--clr-text-muted)] text-sm mb-6 leading-relaxed">Thanks for checking us out! This promotion has expired, but we&apos;d still love to have you.</p>
          <a href="https://santacruzstrength.com" className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-sm">
            Visit Santa Cruz Strength <ArrowRight size={14} />
          </a>
        </div>
      </div>
    );
  }

  const set = (key, val) => { setForm(p => ({ ...p, [key]: val })); setErrors(p => ({ ...p, [key]: undefined })); };
  const validateInfo = () => {
    const e = {};
    if (!form.first_name.trim()) e.first_name = 'First name required';
    if (!form.email.trim()) e.email = 'Email required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Valid email required';
    if (!form.phone.trim()) e.phone = 'Phone required';
    return e;
  };
  const goNextInfo = () => { const errs = validateInfo(); if (Object.keys(errs).length) { setErrors(errs); return; } setErrors({}); setStep('goal'); };

  const createLead = async (interest, notes, extraFields = {}) => {
    const contactPrefMap = { 'Call me': 'call', 'Text me': 'text', 'Email me': 'email' };
    await api.post('/leads', {
      first_name: form.first_name.trim(), last_name: form.last_name.trim() || '',
      email: form.email.trim(), phone: form.phone.trim(),
      interest_type: interest, lead_source: 'pride_2026', start_timeline: extraFields.timeline || 'Immediately',
      training_goals: extraFields.goals || `Pride 2026: ${interest}`,
      preferred_contact: contactPrefMap[extraFields.contact_pref] || 'call',
      notes, sms_consent: true,
    });
  };

  const handleSelectGoal = async (goal) => {
    setSelectedGoal(goal); setLoading(true);
    try {
      if (goal.id === 'day_pass') { await createLead('Free Day Pass', 'Pride 2026 QR: Free Day Pass'); window.location.href = ABC_GUEST_LINK; return; }
      if (goal.id === 'membership') { await createLead('General Membership', 'Pride 2026 QR: Ready to Join'); navigate('/join'); return; }
      if (goal.id === 'tour') { setStep('tour_0'); setLoading(false); }
    } catch { toast.error('Something went wrong'); setLoading(false); }
  };

  const handleTourOption = (idx, value) => {
    const key = TOUR_STEPS[idx].id;
    const updated = { ...tourData, [key]: value }; setTourData(updated);
    if (idx < TOUR_STEPS.length - 1) { setStep(`tour_${idx + 1}`); return; }
    setLoading(true);
    createLead('Tour Request', `Pride 2026 QR: Tour | Goals: ${updated.goals} | Timeline: ${updated.timeline} | Contact: ${updated.contact_pref}`, updated)
      .then(() => setStep('done')).catch(() => toast.error('Something went wrong')).finally(() => setLoading(false));
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); goNextInfo(); } };

  const inputCls = "w-full bg-white border-2 border-[var(--clr-border)] rounded-xl px-4 py-3.5 text-base text-[var(--clr-charcoal)] placeholder:text-[var(--clr-text-light)] focus:outline-none focus:ring-2 focus:ring-[var(--clr-green)]/30 focus:border-[var(--clr-green)] transition-all";
  const errCls = "text-[var(--clr-coral)] text-xs mt-1 font-semibold";

  const totalSteps = selectedGoal?.id === 'tour' ? 5 : 2;
  const currentStepNum = step === 'info' ? 0 : step === 'goal' ? 1 : step.startsWith('tour_') ? 2 + parseInt(step.split('_')[1]) : totalSteps;

  return (
    <div className="min-h-screen flex flex-col relative" style={{ background: 'var(--clr-bg)' }}>
      {/* Hero background */}
      <div className="absolute inset-0 z-0">
        <img src={HERO_IMG} alt="" className="w-full h-full object-cover" style={{ opacity: 0.12 }} loading="eager" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(247,245,240,0.5) 0%, rgba(247,245,240,0.85) 40%, var(--clr-bg) 70%)' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 pt-6 pb-3 px-4 text-center">
        <p className="font-display text-xl tracking-[0.25em] mb-2" style={{ color: 'var(--clr-charcoal)' }}>SANTA CRUZ STRENGTH</p>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full" style={{ background: 'var(--clr-bg-green)', border: '1px solid var(--clr-border-green)' }}>
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--clr-green)' }} />
          <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: 'var(--clr-green)' }}>Pride 2026 &middot; Free Day Pass</span>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 pb-8">
        <div className="w-full max-w-md">

          {/* Progress */}
          <div className="flex gap-1.5 mb-6">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className="flex-1 h-1.5 rounded-full transition-all duration-500"
                style={{ background: i <= currentStepNum ? 'var(--clr-green)' : 'var(--clr-border)' }} />
            ))}
          </div>

          {/* STEP: Contact Info */}
          {step === 'info' && (
            <div className="animate-fade-in-up" data-testid="pride-form">
              <h2 className="font-display text-3xl sm:text-4xl tracking-wide mb-1 leading-[0.95]" style={{ color: 'var(--clr-charcoal)' }}>
                WELCOME TO<br /><span style={{ color: 'var(--clr-green)' }}>THE STRENGTH.</span>
              </h2>
              <p className="text-[var(--clr-text-muted)] text-sm mb-5">Enter your details to get started.</p>

              <div className="space-y-3" onKeyDown={handleKeyDown}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input ref={inputRef} value={form.first_name} onChange={e => set('first_name', e.target.value)}
                      className={inputCls} placeholder="First name *" data-testid="pride-first-name" />
                    {errors.first_name && <p className={errCls}>{errors.first_name}</p>}
                  </div>
                  <input value={form.last_name} onChange={e => set('last_name', e.target.value)}
                    className={inputCls} placeholder="Last name" data-testid="pride-last-name" />
                </div>
                <div>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                    className={inputCls} placeholder="Email *" data-testid="pride-email" />
                  {errors.email && <p className={errCls}>{errors.email}</p>}
                </div>
                <div>
                  <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                    className={inputCls} placeholder="Phone *" data-testid="pride-phone" />
                  {errors.phone && <p className={errCls}>{errors.phone}</p>}
                </div>

                <button onClick={goNextInfo} data-testid="pride-next-btn"
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-sm font-bold mt-1">
                  Continue <ChevronRight size={14} />
                </button>
              </div>

              {/* Location */}
              <div className="mt-6 p-4 rounded-2xl bg-white border" style={{ borderColor: 'var(--clr-border)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <MapPin size={12} style={{ color: 'var(--clr-green)' }} />
                    <span className="text-[11px] font-semibold text-[var(--clr-text-muted)]">151 Harvey West Blvd, Santa Cruz</span>
                  </div>
                  <span className="text-[11px] text-[var(--clr-text-light)]">&middot;</span>
                  <span className="text-[11px] font-semibold text-[var(--clr-text-muted)]">Strength Gym</span>
                </div>
              </div>

              <p className="text-center text-[9px] text-[var(--clr-text-light)] leading-relaxed mt-4">
                By continuing you agree to receive texts &amp; emails from Santa Cruz Strength.
                Msg &amp; data rates may apply. Reply STOP to opt out.{' '}
                <a href="/privacy" target="_blank" className="underline">Privacy</a> &amp;{' '}
                <a href="/terms" target="_blank" className="underline">Terms</a>.
              </p>
            </div>
          )}

          {/* STEP: Choose Goal */}
          {step === 'goal' && (
            <div className="animate-fade-in-up">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--clr-green)' }}>Almost there</span>
                <button onClick={() => setStep('info')} className="flex items-center gap-1 text-xs text-[var(--clr-text-muted)] hover:text-[var(--clr-charcoal)] transition-colors">
                  <ChevronLeft size={12} /> Back
                </button>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl tracking-wide mb-1" style={{ color: 'var(--clr-charcoal)' }}>
                HEY {form.first_name.toUpperCase() || 'THERE'}!
              </h2>
              <p className="text-[var(--clr-text-muted)] text-sm mb-5">What sounds right for you?</p>

              <div className="space-y-3">
                {GOALS.map(goal => {
                  const Icon = goal.icon;
                  return (
                    <button key={goal.id} onClick={() => handleSelectGoal(goal)} disabled={loading}
                      data-testid={`pride-goal-${goal.id}`}
                      className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all duration-200 hover:shadow-lg disabled:opacity-50 group"
                      style={{ background: goal.bg, borderColor: 'transparent' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = goal.border}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}>
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${goal.color}15` }}>
                        <Icon size={22} style={{ color: goal.color }} />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-base" style={{ color: goal.color }}>{goal.label}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--clr-text-muted)' }}>{goal.desc}</p>
                      </div>
                      <ChevronRight size={16} style={{ color: goal.color, opacity: 0.4 }} className="group-hover:opacity-100 transition-opacity" />
                    </button>
                  );
                })}
              </div>
              {loading && (
                <div className="flex items-center justify-center py-4 mt-3">
                  <Loader2 size={20} className="animate-spin" style={{ color: 'var(--clr-green)' }} />
                  <span className="text-sm text-[var(--clr-text-muted)] ml-2">Setting you up...</span>
                </div>
              )}
            </div>
          )}

          {/* TOUR STEPS */}
          {step.startsWith('tour_') && (() => {
            const idx = parseInt(step.split('_')[1]);
            const tourStep = TOUR_STEPS[idx];
            return (
              <div className="animate-fade-in-up">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--clr-green)' }}>Tour booking</span>
                  <button onClick={() => setStep(idx === 0 ? 'goal' : `tour_${idx - 1}`)} className="flex items-center gap-1 text-xs text-[var(--clr-text-muted)] hover:text-[var(--clr-charcoal)] transition-colors">
                    <ChevronLeft size={12} /> Back
                  </button>
                </div>
                <h2 className="font-display text-xl sm:text-2xl tracking-wide mb-5 leading-tight" style={{ color: 'var(--clr-charcoal)' }}>
                  {tourStep.title}
                </h2>
                <div className="space-y-2.5">
                  {tourStep.options.map(opt => (
                    <button key={opt} onClick={() => handleTourOption(idx, opt)} disabled={loading}
                      data-testid={`tour-opt-${opt.toLowerCase().replace(/\s+/g, '-')}`}
                      className="w-full p-4 rounded-xl border-2 text-left text-sm font-semibold transition-all duration-200 disabled:opacity-50 bg-white hover:shadow-md"
                      style={{ color: 'var(--clr-charcoal)', borderColor: 'var(--clr-border)' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--clr-green)'; e.currentTarget.style.background = 'var(--clr-bg-green)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--clr-border)'; e.currentTarget.style.background = '#fff'; }}>
                      {opt}
                    </button>
                  ))}
                </div>
                {loading && (
                  <div className="flex items-center justify-center py-4 mt-3">
                    <Loader2 size={20} className="animate-spin" style={{ color: 'var(--clr-green)' }} />
                    <span className="text-sm text-[var(--clr-text-muted)] ml-2">Booking your tour...</span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* DONE: Tour booked */}
          {step === 'done' && (
            <div className="text-center animate-fade-in-up" data-testid="pride-tour-done">
              <div className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center" style={{ background: 'var(--clr-bg-green)' }}>
                <CheckCircle2 size={36} style={{ color: 'var(--clr-green)' }} />
              </div>
              <h2 className="font-display text-2xl sm:text-3xl tracking-wide mb-2" style={{ color: 'var(--clr-charcoal)' }}>
                WE&apos;LL BE IN TOUCH, {form.first_name.toUpperCase() || 'FRIEND'}!
              </h2>
              <p className="text-[var(--clr-text-muted)] text-sm mb-8 leading-relaxed max-w-sm mx-auto">
                We will follow up to schedule your tour.
                We&apos;re at 151 Harvey West Blvd. Looking forward to showing you around.
              </p>
              <div className="flex flex-col gap-3">
                <a href={`tel:${GYM_CONFIG.phone.replace(/[^\d+]/g, '')}`}
                  className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm">
                  <Phone size={14} /> Call Us: {GYM_CONFIG.phone}
                </a>
                <a href="https://maps.google.com/?q=151+Harvey+West+Blvd+Santa+Cruz+CA"
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold rounded-xl border-2 transition-all duration-200 hover:bg-[var(--clr-charcoal)] hover:text-white hover:border-[var(--clr-charcoal)]"
                  style={{ color: 'var(--clr-charcoal)', borderColor: 'var(--clr-charcoal)' }}>
                  <MapPin size={14} /> Get Directions
                </a>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="relative z-10 py-4 px-4 text-center">
        <p className="text-[10px] text-[var(--clr-text-light)]">
          Santa Cruz Strength &middot; 151 Harvey West Blvd Ste D &middot; Santa Cruz, CA 95060
        </p>
      </footer>
    </div>
  );
}
