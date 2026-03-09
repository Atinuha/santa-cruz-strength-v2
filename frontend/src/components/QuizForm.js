import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createLead } from '../lib/api';
import { GYM_CONFIG, INTEREST_TYPES, PREFERRED_CONTACTS } from '../config';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { trackLeadSubmit } from '../utils/analytics';

const STEPS = [
  {
    id: 'name',
    title: "First, what's your name?",
    subtitle: "No judgment. Just your name.",
    type: 'name',
  },
  {
    id: 'contact',
    title: 'How do we reach you?',
    subtitle: "We won't blow up your phone. Seriously.",
    type: 'contact',
  },
  {
    id: 'interest',
    title: 'What brings you in?',
    subtitle: 'Pick the one that fits best. (No wrong answers.)',
    type: 'choice',
    autoAdvance: true,
    options: [
      { value: 'General Membership', label: 'Lift heavy things', emoji: '🏋️' },
      { value: 'Personal Training', label: 'Work with a coach', emoji: '🎯' },
      { value: 'Performance / Sport Training', label: 'Train for my sport', emoji: '🏄' },
      { value: 'Open Gym', label: 'Just explore the gym', emoji: '👀' },
    ],
  },
  {
    id: 'timeline',
    title: 'When are you thinking?',
    subtitle: 'No pressure. We just want to plan ahead.',
    type: 'choice',
    autoAdvance: true,
    options: [
      { value: 'ASAP', label: 'ASAP — I\'m ready now', emoji: '⚡' },
      { value: '1-2 weeks', label: 'In a couple weeks', emoji: '📅' },
      { value: '1 month', label: 'Within the month', emoji: '🗓️' },
      { value: 'Just exploring', label: 'Just looking around', emoji: '🧭' },
    ],
  },
  {
    id: 'goals',
    title: 'Anything we should know?',
    subtitle: "Optional, but it helps us prepare. How should we reach you?",
    type: 'goals',
  },
];

export default function QuizForm({ source = 'book_a_tour', onSuccess }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [animDir, setAnimDir] = useState('right');
  const [loading, setLoading] = useState(false);
  const [pendingAdvance, setPendingAdvance] = useState(false);
  const firstInputRef = useRef(null);

  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', email: '',
    interest_type: '', start_timeline: '', training_goals: '',
    preferred_contact: 'call', lead_source: source, location: GYM_CONFIG.location,
    notes: '',
  });
  const [errors, setErrors] = useState({});

  const current = STEPS[step];
  const totalSteps = STEPS.length;

  // Focus first input on step change
  useEffect(() => {
    const t = setTimeout(() => firstInputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, [step]);

  const validate = () => {
    const e = {};
    if (current.id === 'name') {
      if (!form.first_name.trim()) e.first_name = 'First name required';
    }
    if (current.id === 'contact') {
      if (!form.phone.trim()) e.phone = 'Phone number required';
      if (!form.email.trim()) e.email = 'Email required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Valid email required';
    }
    return e;
  };

  const goNext = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    if (step < totalSteps - 1) {
      setAnimDir('right');
      setStep(s => s + 1);
    }
  };

  const goBack = () => {
    setAnimDir('left');
    setStep(s => Math.max(0, s - 1));
    setErrors({});
  };

  const handleChoice = (field, value) => {
    setForm(p => ({ ...p, [field]: value }));
    if (current.autoAdvance) {
      setPendingAdvance(true);
      setTimeout(() => {
        setPendingAdvance(false);
        setAnimDir('right');
        setStep(s => s + 1);
      }, 1200);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && current.type !== 'goals') goNext();
  };

  const handleSubmit = async () => {
    if (!form.first_name || !form.phone || !form.email) {
      toast.error('Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      await createLead({
        ...form,
        interest_type: form.interest_type || 'General Membership',
        start_timeline: form.start_timeline || 'Just exploring',
      });
      trackLeadSubmit({ interest_type: form.interest_type, lead_source: source || 'website_form' });
      if (onSuccess) onSuccess();
      else navigate('/thank-you', { state: { source } });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  const inputCls = (field) =>
    `input-light ${ errors[field] ? 'border-[var(--clr-coral)] ring-2 ring-[var(--clr-coral)]/20' : '' }`;

  return (
    <div className="w-full">
      {/* Progress */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-700 text-[var(--clr-green)] uppercase tracking-widest font-bold">
            Step {step + 1} of {totalSteps}
          </span>
          {step > 0 && (
            <button onClick={goBack}
              className="flex items-center gap-1 text-xs text-[var(--clr-text-muted)] hover:text-[var(--clr-green)] transition-colors duration-200 font-semibold">
              <ArrowLeft size={12} /> Back
            </button>
          )}
        </div>
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full overflow-hidden bg-[var(--clr-seafoam)]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: i <= step ? '100%' : '0%',
                  backgroundColor: i < step ? 'var(--clr-green)' : i === step ? 'var(--clr-coral)' : 'transparent',
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Step title */}
      <div className={`mb-5 animate-fade-in-up`} key={`title-${step}`}>
        <h3 className="text-[var(--clr-charcoal)] font-bold text-xl leading-tight mb-1">
          {current.title}
        </h3>
        <p className="text-[var(--clr-text-muted)] text-sm">{current.subtitle}</p>
      </div>

      {/* Step content */}
      <div className={`animate-fade-in-up`} key={`content-${step}`}>

        {/* NAME */}
        {current.type === 'name' && (
          <div className="space-y-3" onKeyDown={handleKeyDown}>
            <div>
              <input ref={firstInputRef} value={form.first_name}
                onChange={e => { setForm(p => ({...p, first_name: e.target.value})); setErrors(p => ({...p, first_name: undefined})); }}
                placeholder="First name" className={inputCls('first_name')}
                data-testid="lead-form-name-input" />
              {errors.first_name && <p className="text-[var(--clr-coral)] text-xs mt-1 font-semibold">{errors.first_name}</p>}
            </div>
            <input value={form.last_name}
              onChange={e => setForm(p => ({...p, last_name: e.target.value}))}
              placeholder="Last name (optional)" className="input-light" />
          </div>
        )}

        {/* CONTACT */}
        {current.type === 'contact' && (
          <div className="space-y-3" onKeyDown={handleKeyDown}>
            <div>
              <input ref={firstInputRef} type="tel" value={form.phone}
                onChange={e => { setForm(p => ({...p, phone: e.target.value})); setErrors(p => ({...p, phone: undefined})); }}
                placeholder="Phone number" className={inputCls('phone')}
                data-testid="lead-form-phone-input" />
              {errors.phone && <p className="text-[var(--clr-coral)] text-xs mt-1 font-semibold">{errors.phone}</p>}
            </div>
            <div>
              <input type="email" value={form.email}
                onChange={e => { setForm(p => ({...p, email: e.target.value})); setErrors(p => ({...p, email: undefined})); }}
                placeholder="Email address" className={inputCls('email')}
                data-testid="lead-form-email-input" />
              {errors.email && <p className="text-[var(--clr-coral)] text-xs mt-1 font-semibold">{errors.email}</p>}
            </div>
          </div>
        )}

        {/* CHOICE */}
        {current.type === 'choice' && (
          <div className="grid grid-cols-2 gap-2.5">
            {current.options.map(opt => {
              const isSelected = form[current.id === 'interest' ? 'interest_type' : 'start_timeline'] === opt.value;
              return (
                <button key={opt.value} type="button"
                  onClick={() => handleChoice(
                    current.id === 'interest' ? 'interest_type' : 'start_timeline',
                    opt.value
                  )}
                  disabled={pendingAdvance}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-sm font-bold transition-all duration-200 ${
                    isSelected
                      ? 'border-[var(--clr-green)] bg-[var(--clr-bg-green)] text-[var(--clr-green)] shadow-md'
                      : 'border-[var(--clr-border)] bg-white text-[var(--clr-text)] hover:border-[var(--clr-seafoam-dark)] hover:bg-[var(--clr-seafoam)]/30'
                  }`}
                >
                  {isSelected && (
                    <span className="absolute top-2 right-2 w-4 h-4 bg-[var(--clr-green)] rounded-full flex items-center justify-center">
                      <Check size={10} className="text-white" />
                    </span>
                  )}
                  <span className="text-2xl">{opt.emoji}</span>
                  <span className="text-center leading-tight">{opt.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* GOALS */}
        {current.type === 'goals' && (
          <div className="space-y-3">
            <textarea value={form.training_goals}
              onChange={e => setForm(p => ({...p, training_goals: e.target.value}))}
              placeholder="Training goals, injuries, questions... (optional)"
              rows={3}
              data-testid="lead-form-goals-textarea"
              className="input-light resize-none" />
            <div>
              <p className="text-xs font-semibold text-[var(--clr-text-muted)] mb-2">Best way to reach you?</p>
              <div className="flex gap-2">
                {PREFERRED_CONTACTS.map(c => (
                  <button key={c.value} type="button"
                    onClick={() => setForm(p => ({...p, preferred_contact: c.value}))}
                    className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-bold border-2 transition-all duration-200 ${
                      form.preferred_contact === c.value
                        ? 'border-[var(--clr-green)] bg-[var(--clr-bg-green)] text-[var(--clr-green)]'
                        : 'border-[var(--clr-border)] bg-white text-[var(--clr-text-muted)] hover:border-[var(--clr-seafoam-dark)]'
                    }`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action button */}
      <div className="mt-6">
        {step < totalSteps - 1 && current.type !== 'choice' && (
          <button onClick={goNext}
            className="btn-primary w-full text-base py-3.5"
            data-testid="lead-form-submit-button">
            Continue <ArrowRight size={16} />
          </button>
        )}
        {step === totalSteps - 1 && (
          <button onClick={handleSubmit} disabled={loading}
            className="btn-coral w-full text-base py-3.5"
            data-testid="lead-form-submit-button">
            {loading
              ? <><Loader2 size={16} className="animate-spin" /> Sending...</>
              : <><Check size={16} /> Request My Tour — It's Free</>}
          </button>
        )}
        {current.type === 'choice' && pendingAdvance && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <Loader2 size={14} className="animate-spin text-[var(--clr-green)]" />
            <span className="text-xs text-[var(--clr-text-muted)]">Moving on...</span>
          </div>
        )}
        <p className="text-center text-xs text-[var(--clr-text-light)] mt-3">
          No commitment. A coach will reach out within 24 hours.
        </p>
      </div>
    </div>
  );
}
