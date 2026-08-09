import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  Compass,
  Dumbbell,
  Goal,
  Loader2,
  Search,
  ShieldCheck,
  Trophy,
  UserRound,
} from 'lucide-react';
import { createLead } from '../lib/api';
import { GYM_CONFIG, PREFERRED_CONTACTS } from '../config';
import { trackFormStart, trackLeadSubmit } from '../utils/analytics';
import { getLeadAttribution } from '../utils/attribution';
import { buildTourLeadPayload, createInitialTourForm, isTourPreviewMode } from '../utils/tourLead';
import { createLeadRequestId } from '../utils/leadContracts';

const INTEREST_OPTIONS = [
  { value: 'General Membership', label: 'General membership', icon: Dumbbell },
  { value: 'Personal Training', label: 'Personal training', icon: UserRound },
  { value: 'Performance / Sport Training', label: 'Sport performance', icon: Trophy },
  { value: 'Open Gym', label: 'Explore the gym', icon: Search },
];

const TIMELINE_OPTIONS = [
  { value: 'ASAP', label: 'Ready now', icon: Goal },
  { value: '1-2 weeks', label: 'Within two weeks', icon: CalendarClock },
  { value: '1 month', label: 'Within a month', icon: ShieldCheck },
  { value: 'Just exploring', label: 'Still exploring', icon: Compass },
];

const STEP_COPY = [
  { title: 'Start with your contact details', subtitle: 'The team will use these details to reply about your visit.' },
  { title: 'What would you like to explore?', subtitle: 'Choose the closest fit and tell us when you are thinking of starting.' },
  { title: 'Help us prepare for your visit', subtitle: 'Add any useful context and choose how the team should reply.' },
];

export default function QuizForm({ source = 'book_a_tour', onSuccess, noAutoFocus = false }) {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const firstInputRef = useRef(null);
  const formStarted = useRef(false);
  const requestIdRef = useRef(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [previewComplete, setPreviewComplete] = useState(false);
  const [form, setForm] = useState(() => createInitialTourForm({ source, location: GYM_CONFIG.location }));
  const previewMode = isTourPreviewMode();

  if (!requestIdRef.current) requestIdRef.current = createLeadRequestId();

  // Bring the new step into view under the fixed navbar, then focus.
  //
  // focus() scrolls the element into view on its own, but only minimally, so
  // advancing a step put the next control flush against the top of the
  // viewport and therefore underneath the fixed 64px navbar. On the tour form
  // that meant the interest buttons were physically unclickable after step
  // one: a visitor saw the form jump and had to scroll up to find the controls
  // it had just moved them to. Found by driving the funnel in a browser, where
  // the click landed on the navbar instead of the button.
  //
  // The navbar is measured rather than assumed, so this keeps working if its
  // height changes. focus takes preventScroll so it does not undo the scroll
  // that just happened.
  useEffect(() => {
    if (noAutoFocus && step === 0) return;

    const focusTimer = window.setTimeout(() => {
      if (step > 0 && formRef.current) {
        const navHeight = document.querySelector('nav')?.getBoundingClientRect().height ?? 64;
        const target = formRef.current.getBoundingClientRect().top + window.scrollY - navHeight - 16;
        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: Math.max(0, target), behavior: reduceMotion ? 'auto' : 'smooth' });
      }
      firstInputRef.current?.focus({ preventScroll: true });
    }, 120);

    return () => window.clearTimeout(focusTimer);
  }, [step, noAutoFocus]);

  const markStarted = () => {
    if (formStarted.current) return;
    formStarted.current = true;
    trackFormStart({ form_name: 'tour_quiz', lead_source: source });
  };

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError('');
  };

  const validateStep = () => {
    const nextErrors = {};
    if (step === 0) {
      if (!form.first_name.trim()) nextErrors.first_name = 'Enter your first name.';
      if (!form.phone.trim()) nextErrors.phone = 'Enter a phone number.';
      if (!form.email.trim()) nextErrors.email = 'Enter an email address.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) nextErrors.email = 'Enter a valid email address.';
    }
    if (step === 1) {
      if (!form.interest_type) nextErrors.interest_type = 'Choose what you want to explore.';
      if (!form.start_timeline) nextErrors.start_timeline = 'Choose a starting timeframe.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const nextStep = () => {
    if (!validateStep()) return;
    setStep((current) => Math.min(current + 1, STEP_COPY.length - 1));
  };

  const previousStep = () => {
    setErrors({});
    setSubmitError('');
    setStep((current) => Math.max(current - 1, 0));
  };

  const submitForm = async (event) => {
    event.preventDefault();
    if (step < STEP_COPY.length - 1) {
      nextStep();
      return;
    }

    setLoading(true);
    setSubmitError('');
    try {
      const payload = buildTourLeadPayload({
        form,
        source,
        attribution: getLeadAttribution(),
        requestId: requestIdRef.current,
      });
      if (previewMode) {
        setForm(createInitialTourForm({ source, location: GYM_CONFIG.location }));
        setPreviewComplete(true);
        return;
      }
      await createLead(payload);
      requestIdRef.current = createLeadRequestId();
      trackLeadSubmit({ interest_type: form.interest_type, lead_source: source || 'website_form' });
      if (onSuccess) onSuccess();
      else navigate('/thank-you', { state: { source } });
    } catch (error) {
      setSubmitError(error.response?.data?.detail || 'We could not send the request. Please try again or call the gym.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field) => `input-light ${errors[field] ? 'border-[var(--clr-coral)] ring-2 ring-[var(--clr-coral)]/20' : ''}`;

  if (previewComplete) {
    return (
      <div role="status" className="scs-preview-success" data-testid="preview-tour-success">
        <Check size={26} aria-hidden="true" />
        <h3>Preview test complete</h3>
        <p>No request was sent, and no form information was stored. Production mode will use the approved CRM lead endpoint.</p>
        <button type="button" className="scs-button scs-button-secondary" onClick={() => { setStep(0); setPreviewComplete(false); }}>
          Test the form again
        </button>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={submitForm} onFocusCapture={markStarted} onPointerDownCapture={markStarted} noValidate>
      {previewMode && (
        <div className="scs-preview-notice" role="note" data-testid="preview-tour-notice">
          Preview test mode. Use test information only. Nothing entered here will be sent or stored.
        </div>
      )}
      <div className="mb-6" aria-label={`Step ${step + 1} of ${STEP_COPY.length}`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-[var(--clr-green)] uppercase tracking-widest font-bold">Step {step + 1} of {STEP_COPY.length}</span>
          {step > 0 && (
            <button type="button" onClick={previousStep} className="flex items-center gap-1 min-h-11 text-sm text-[var(--clr-text-muted)] hover:text-[var(--clr-green)] transition-colors duration-150 font-semibold">
              <ArrowLeft size={14} aria-hidden="true" /> Back
            </button>
          )}
        </div>
        <div className="flex gap-2" aria-hidden="true">
          {STEP_COPY.map((_, index) => (
            <span key={index} className={`h-1.5 flex-1 ${index <= step ? 'bg-[var(--clr-green)]' : 'bg-[var(--clr-seafoam)]'}`} />
          ))}
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-[var(--clr-charcoal)] font-bold text-xl leading-tight mb-2">{STEP_COPY[step].title}</h3>
        <p className="text-[var(--clr-text-muted)] text-base leading-relaxed">{STEP_COPY[step].subtitle}</p>
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <div>
            <label htmlFor="tour-first-name" className="block text-base font-bold text-[var(--clr-charcoal)] mb-2">First name <span aria-hidden="true">*</span></label>
            <input id="tour-first-name" ref={firstInputRef} value={form.first_name} onChange={(event) => updateField('first_name', event.target.value)} placeholder="Your first name" autoComplete="given-name" className={inputClass('first_name')} aria-invalid={Boolean(errors.first_name)} aria-describedby={errors.first_name ? 'tour-first-name-error' : undefined} data-testid="lead-form-name-input" />
            {errors.first_name && <p id="tour-first-name-error" role="alert" className="text-[var(--clr-coral)] text-sm mt-1 font-semibold">{errors.first_name}</p>}
          </div>
          <div>
            <label htmlFor="tour-last-name" className="block text-base font-bold text-[var(--clr-charcoal)] mb-2">Last name <span className="font-normal text-[var(--clr-text-muted)]">(optional)</span></label>
            <input id="tour-last-name" value={form.last_name} onChange={(event) => updateField('last_name', event.target.value)} placeholder="Your last name" autoComplete="family-name" className="input-light" />
          </div>
          <div>
            <label htmlFor="tour-phone" className="block text-base font-bold text-[var(--clr-charcoal)] mb-2">Phone number <span aria-hidden="true">*</span></label>
            {/* "Your phone number", not a formatted example. The placeholder here
                was (408) 555-0123, which shares its area code with this gym's own
                number, (408) 337-6709. A visitor glancing at a greyed-out phone
                number in a form on a business's own site can reasonably read it
                as the business's number, and 555 only reads as fictional to
                people who know the convention. */}
            <input id="tour-phone" type="tel" inputMode="tel" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="Your phone number" autoComplete="tel" className={inputClass('phone')} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'tour-phone-error' : undefined} data-testid="lead-form-phone-input" />
            {errors.phone && <p id="tour-phone-error" role="alert" className="text-[var(--clr-coral)] text-sm mt-1 font-semibold">{errors.phone}</p>}
          </div>
          <div>
            <label htmlFor="tour-email" className="block text-base font-bold text-[var(--clr-charcoal)] mb-2">Email address <span aria-hidden="true">*</span></label>
            <input id="tour-email" type="email" inputMode="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} placeholder="you@example.com" autoComplete="email" className={inputClass('email')} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'tour-email-error' : undefined} data-testid="lead-form-email-input" />
            {errors.email && <p id="tour-email-error" role="alert" className="text-[var(--clr-coral)] text-sm mt-1 font-semibold">{errors.email}</p>}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-6">
          <fieldset>
            <legend className="text-base font-bold text-[var(--clr-charcoal)] mb-3">What brings you in?</legend>
            <div className="grid grid-cols-2 gap-3">
              {INTEREST_OPTIONS.map((option, index) => {
                const OptionIcon = option.icon;
                const selected = form.interest_type === option.value;
                return (
                  <button key={option.value} ref={index === 0 ? firstInputRef : undefined} type="button" onClick={() => updateField('interest_type', option.value)} aria-pressed={selected} className={`min-h-[96px] p-4 border text-sm font-bold flex flex-col items-start justify-between gap-3 transition-colors duration-150 ${selected ? 'border-[var(--clr-green)] bg-[var(--clr-bg-green)] text-[var(--clr-green)]' : 'border-[var(--clr-border)] bg-white text-[var(--clr-text)] hover:border-[var(--clr-green)]'}`}>
                    <OptionIcon size={23} aria-hidden="true" />{option.label}
                  </button>
                );
              })}
            </div>
            {errors.interest_type && <p role="alert" className="text-[var(--clr-coral)] text-sm mt-2 font-semibold">{errors.interest_type}</p>}
          </fieldset>

          <fieldset>
            <legend className="text-base font-bold text-[var(--clr-charcoal)] mb-3">When are you thinking of starting?</legend>
            <div className="grid grid-cols-2 gap-3">
              {TIMELINE_OPTIONS.map((option) => {
                const OptionIcon = option.icon;
                const selected = form.start_timeline === option.value;
                return (
                  <button key={option.value} type="button" onClick={() => updateField('start_timeline', option.value)} aria-pressed={selected} className={`min-h-[90px] p-4 border text-sm font-bold flex flex-col items-start justify-between gap-3 transition-colors duration-150 ${selected ? 'border-[var(--clr-green)] bg-[var(--clr-bg-green)] text-[var(--clr-green)]' : 'border-[var(--clr-border)] bg-white text-[var(--clr-text)] hover:border-[var(--clr-green)]'}`}>
                    <OptionIcon size={22} aria-hidden="true" />{option.label}
                  </button>
                );
              })}
            </div>
            {errors.start_timeline && <p role="alert" className="text-[var(--clr-coral)] text-sm mt-2 font-semibold">{errors.start_timeline}</p>}
          </fieldset>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div>
            <label htmlFor="tour-goals" className="block text-base font-bold text-[var(--clr-charcoal)] mb-2">Training goals or questions <span className="font-normal text-[var(--clr-text-muted)]">(optional)</span></label>
            <textarea id="tour-goals" ref={firstInputRef} value={form.training_goals} onChange={(event) => updateField('training_goals', event.target.value)} placeholder="What would make this a useful visit?" rows={4} data-testid="lead-form-goals-textarea" className="input-light resize-none" />
          </div>

          <fieldset>
            <legend className="text-base font-bold text-[var(--clr-charcoal)] mb-2">Preferred reply</legend>
            <div className="flex flex-wrap gap-2">
              {PREFERRED_CONTACTS.map((contact) => (
                <button key={contact.value} type="button" onClick={() => updateField('preferred_contact', contact.value)} aria-pressed={form.preferred_contact === contact.value} className={`min-h-11 flex-1 px-3 border text-sm font-bold transition-colors duration-150 ${form.preferred_contact === contact.value ? 'border-[var(--clr-green)] bg-[var(--clr-bg-green)] text-[var(--clr-green)]' : 'border-[var(--clr-border)] bg-white text-[var(--clr-text-muted)] hover:border-[var(--clr-green)]'}`}>
                  {contact.label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="flex items-start gap-3 cursor-pointer" data-testid="sms-consent-checkbox">
            <input type="checkbox" checked={form.sms_consent} onChange={(event) => updateField('sms_consent', event.target.checked)} className="mt-0.5 w-5 h-5 border-2 border-[var(--clr-border)] accent-[var(--clr-green)] cursor-pointer shrink-0" />
            <span className="text-base leading-relaxed text-[var(--clr-text-muted)]">
              Optional: I agree to receive automated operational texts from Santa Cruz Strength about this inquiry and visit, including confirmations, reminders and replies. This does not enroll me in promotional marketing texts. Consent is not a condition of purchase. Message frequency varies. Message and data rates may apply. Reply <strong>STOP</strong> to cancel or <strong>HELP</strong> for help. See the <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline">Privacy Policy</a> and <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline">Terms</a>.
            </span>
          </label>
        </div>
      )}

      {submitError && (
        <div role="alert" className="mt-5 border border-red-300 bg-red-50 text-red-800 p-4 text-sm">
          {submitError} <a href={GYM_CONFIG.phoneHref} className="font-bold underline">Call {GYM_CONFIG.phone}</a>.
        </div>
      )}

      <div className="mt-6">
        <button type="submit" disabled={loading} className="btn-primary w-full text-base py-3.5 disabled:opacity-50 disabled:cursor-not-allowed" data-testid="lead-form-submit-button">
          {loading ? <><Loader2 size={17} className="animate-spin" aria-hidden="true" /> Sending request...</> : step < STEP_COPY.length - 1 ? <>Continue <ArrowRight size={17} aria-hidden="true" /></> : <><Check size={17} aria-hidden="true" /> Request my free tour</>}
        </button>
        <p className="text-center text-base leading-relaxed text-[var(--clr-text-muted)] mt-3">No membership commitment and no card required. Someone from the gym will get back to you.</p>
        {step === 2 && (
          <p className="text-center text-base leading-relaxed mt-3 text-[var(--clr-text-muted)]">
            By submitting, you agree that Santa Cruz Strength may use the information provided to respond by phone or email. Optional SMS consent is controlled separately above.
          </p>
        )}
      </div>
    </form>
  );
}
