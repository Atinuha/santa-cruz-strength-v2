import React, { useState, useRef, useEffect } from 'react';
import { GYM_CONFIG } from '../config';
import api from '../lib/api';
import { toast } from 'sonner';
import { CheckCircle2, ChevronRight, ChevronLeft, Loader2, Dumbbell, Calendar, Users, ArrowRight } from 'lucide-react';

const EXPIRY = new Date('2026-08-01T00:00:00');
const ABC_GUEST_LINK = 'https://onlinejoin.abcfitness.com/guest/plan?club=31691';
const ABC_JOIN_LINK = 'https://onlinejoin.abcfitness.com/signup/plan?club=31691';

const GOALS = [
  { id: 'day_pass', label: 'Free Day Pass', desc: 'Try us out — no strings attached.', icon: Dumbbell, cta: 'Get Your Free Day Pass', link: ABC_GUEST_LINK },
  { id: 'membership', label: "I'm Ready to Join", desc: 'Skip the trial — sign me up.', icon: Users, cta: 'Start Your Membership', link: ABC_JOIN_LINK },
  { id: 'tour', label: 'Book a Tour', desc: 'Come see the space first.', icon: Calendar, cta: 'Schedule a Tour', link: null },
];

const STEPS = [
  { id: 'info', title: "Let's get you in.", subtitle: 'Quick info so we can set you up.' },
  { id: 'goal', title: 'What are you looking for?', subtitle: 'Pick one and we\'ll get you there.' },
];

export default function Pride() {
  const [expired, setExpired] = useState(new Date() >= EXPIRY);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [done, setDone] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { if (inputRef.current) inputRef.current.focus(); }, [step]);

  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--clr-bg)' }}>
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--clr-bg-green)' }}>
            <Dumbbell size={28} style={{ color: 'var(--clr-green)' }} />
          </div>
          <h1 className="font-display text-3xl tracking-wide mb-3" style={{ color: 'var(--clr-charcoal)' }}>THIS OFFER HAS ENDED</h1>
          <p className="text-[var(--clr-text-muted)] text-sm mb-6 leading-relaxed">
            Thanks for checking us out! This promotion has expired, but we'd still love to have you.
            Check back soon or visit us anytime.
          </p>
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

  const goNext = () => {
    if (step === 0) {
      const errs = validateInfo();
      if (Object.keys(errs).length) { setErrors(errs); return; }
    }
    setErrors({});
    setStep(1);
  };

  const handleSelectGoal = async (goal) => {
    setSelectedGoal(goal);
    setLoading(true);
    try {
      await api.post('/leads', {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim() || '',
        email: form.email.trim(),
        phone: form.phone.trim(),
        interest_type: goal.id === 'day_pass' ? 'Free Day Pass' : goal.id === 'membership' ? 'General Membership' : 'Tour Request',
        lead_source: 'pride_2026',
        start_timeline: 'Immediately',
        training_goals: `Pride 2026 — ${goal.label}`,
        notes: `Pride QR landing page — selected: ${goal.label}`,
        sms_consent: true,
      });
      setDone(true);
      // Auto-redirect for day pass and membership after 3 seconds
      if (goal.link) {
        setTimeout(() => { window.location.href = goal.link; }, 3000);
      }
    } catch (err) {
      toast.error('Something went wrong — please try again');
    } finally { setLoading(false); }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); goNext(); } };

  const inputCls = "w-full bg-white border-2 border-[var(--clr-border)] rounded-xl px-4 py-3.5 text-base text-[var(--clr-charcoal)] placeholder:text-[var(--clr-text-light)] focus:outline-none focus:ring-2 focus:ring-[var(--clr-green)]/30 focus:border-[var(--clr-green)] transition-all";
  const errCls = "text-[var(--clr-coral)] text-xs mt-1 font-semibold";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--clr-bg)' }}>
      {/* Minimal header */}
      <header className="py-4 px-4 text-center">
        <p className="font-display text-lg tracking-[0.2em]" style={{ color: 'var(--clr-charcoal)' }}>SANTA CRUZ STRENGTH</p>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-8">
        <div className="w-full max-w-md">

          {done && selectedGoal ? (
            <div className="text-center animate-fade-in-up" data-testid="pride-success">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--clr-bg-green)' }}>
                <CheckCircle2 size={32} style={{ color: 'var(--clr-green)' }} />
              </div>
              <h2 className="font-display text-2xl tracking-wide mb-2" style={{ color: 'var(--clr-charcoal)' }}>YOU'RE ALL SET!</h2>
              <p className="text-[var(--clr-text-muted)] text-sm mb-6 leading-relaxed">
                {selectedGoal.id === 'day_pass' && "Redirecting you to grab your free day pass..."}
                {selectedGoal.id === 'membership' && "Redirecting you to start your membership..."}
                {selectedGoal.id === 'tour' && "We'll reach out within 24 hours to schedule your tour. See you soon!"}
              </p>
              {selectedGoal.link ? (
                <a href={selectedGoal.link} className="btn-primary inline-flex items-center gap-2 px-6 py-3.5 text-sm" data-testid="pride-redirect-link">
                  {selectedGoal.cta} <ArrowRight size={14} />
                </a>
              ) : (
                <a href={`tel:${GYM_CONFIG.phone.replace(/[^\d+]/g, '')}`} className="btn-primary inline-flex items-center gap-2 px-6 py-3.5 text-sm">
                  Call Us: {GYM_CONFIG.phone}
                </a>
              )}
              <p className="text-[10px] text-[var(--clr-text-light)] mt-4">
                151 Harvey West Blvd Ste D, Santa Cruz CA
              </p>
            </div>
          ) : (
            <div data-testid="pride-form">
              {/* Progress */}
              <div className="flex gap-1.5 mb-6">
                {STEPS.map((_, i) => (
                  <div key={i} className="flex-1 h-1.5 rounded-full transition-all duration-300"
                    style={{ background: i <= step ? 'var(--clr-green)' : 'var(--clr-border)' }} />
                ))}
              </div>

              <div className="mb-1 flex items-center justify-between">
                <span className="text-[var(--clr-green)] text-[10px] font-bold uppercase tracking-widest">
                  {step === 0 ? 'Santa Cruz Pride 2026' : 'Step 2 of 2'}
                </span>
                {step > 0 && (
                  <button onClick={() => setStep(0)} className="flex items-center gap-1 text-xs text-[var(--clr-text-muted)] hover:text-[var(--clr-charcoal)]">
                    <ChevronLeft size={12} /> Back
                  </button>
                )}
              </div>

              <h2 className="font-display text-2xl sm:text-3xl tracking-wide mb-1 leading-tight" style={{ color: 'var(--clr-charcoal)' }}>
                {STEPS[step].title}
              </h2>
              <p className="text-[var(--clr-text-muted)] text-sm mb-6">{STEPS[step].subtitle}</p>

              {/* STEP 1: Contact Info */}
              {step === 0 && (
                <div className="space-y-3 animate-fade-in-up" onKeyDown={handleKeyDown}>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input ref={inputRef} value={form.first_name} onChange={e => set('first_name', e.target.value)}
                        className={inputCls} placeholder="First name *" data-testid="pride-first-name" />
                      {errors.first_name && <p className={errCls}>{errors.first_name}</p>}
                    </div>
                    <div>
                      <input value={form.last_name} onChange={e => set('last_name', e.target.value)}
                        className={inputCls} placeholder="Last name" data-testid="pride-last-name" />
                    </div>
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

                  <button onClick={goNext} data-testid="pride-next-btn"
                    className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-sm font-bold mt-2">
                    Continue <ChevronRight size={14} />
                  </button>

                  <p className="text-center text-[10px] text-[var(--clr-text-light)] leading-relaxed mt-2">
                    By continuing, you agree to receive texts &amp; emails from Santa Cruz Strength.
                    Msg &amp; data rates may apply. Reply STOP to opt out.
                    <a href="/privacy" target="_blank" className="underline ml-0.5">Privacy</a> &amp;
                    <a href="/terms" target="_blank" className="underline ml-0.5">Terms</a>.
                  </p>
                </div>
              )}

              {/* STEP 2: Choose Goal */}
              {step === 1 && (
                <div className="space-y-3 animate-fade-in-up">
                  {GOALS.map(goal => {
                    const Icon = goal.icon;
                    return (
                      <button key={goal.id} onClick={() => handleSelectGoal(goal)} disabled={loading}
                        data-testid={`pride-goal-${goal.id}`}
                        className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all duration-200 border-[var(--clr-border)] bg-white hover:border-[var(--clr-green)] hover:shadow-md disabled:opacity-50">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--clr-bg-green)' }}>
                          <Icon size={22} style={{ color: 'var(--clr-green)' }} />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-base" style={{ color: 'var(--clr-charcoal)' }}>{goal.label}</p>
                          <p className="text-xs text-[var(--clr-text-muted)] mt-0.5">{goal.desc}</p>
                        </div>
                        <ChevronRight size={16} style={{ color: 'var(--clr-text-light)' }} />
                      </button>
                    );
                  })}
                  {loading && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 size={20} className="animate-spin" style={{ color: 'var(--clr-green)' }} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="py-4 px-4 text-center">
        <p className="text-[10px] text-[var(--clr-text-light)]">
          Santa Cruz Strength &middot; 151 Harvey West Blvd Ste D &middot; Santa Cruz, CA 95060
        </p>
      </footer>
    </div>
  );
}
