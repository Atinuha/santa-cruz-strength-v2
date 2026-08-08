import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { createLead } from '../../lib/api';
import { GYM_CONFIG, PREFERRED_CONTACTS } from '../../config';
import { trackFormStart, trackLeadSubmit } from '../../utils/analytics';
import { getLeadAttribution } from '../../utils/attribution';
import { buildTourLeadPayload, createInitialTourForm, isTourPreviewMode } from '../../utils/tourLead';
import { createLeadRequestId } from '../../utils/leadContracts';
import AnswerChips from './AnswerChips';
import { INTEREST_OPTIONS, TIMELINE_OPTIONS } from './paths';

/**
 * The resolution of the mechanic: one screen, and the two questions the page
 * already asked are already answered.
 *
 * This is a local form rather than the shared QuizForm component for one
 * reason, recorded in the README: QuizForm takes no initial values, so an
 * answer given at the top of
 * the page cannot be handed to it, and the visitor would have to answer the
 * same two questions twice. Everything the contract cares about is preserved
 * exactly: the required fields and their messages, the email pattern, the
 * role="alert" and aria-describedby and aria-invalid wiring, the unchecked SMS
 * opt in and its verbatim label, the reassurance and disclosure paragraphs, the
 * analytics calls, every data-testid, preview mode, and the payload built by
 * buildTourLeadPayload so schema version, request id, form id, offer id,
 * attribution and the versioned consent block all arrive intact.
 *
 * interest_type and start_timeline are owned by the page, not by this form, so
 * changing one here updates the routed plate above and vice versa.
 */
export default function RoutedTourForm({
  source = 'book_a_tour',
  answers,
  onAnswer,
  headingRef,
}) {
  const navigate = useNavigate();
  const formStarted = useRef(false);
  const requestIdRef = useRef(null);
  const reduce = useReducedMotion();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [previewComplete, setPreviewComplete] = useState(false);
  const [fields, setFields] = useState(() =>
    createInitialTourForm({ source, location: GYM_CONFIG.location }),
  );
  const previewMode = isTourPreviewMode();

  if (!requestIdRef.current) requestIdRef.current = createLeadRequestId();

  const carried = Boolean(answers.interest_type && answers.start_timeline);

  const markStarted = () => {
    if (formStarted.current) return;
    formStarted.current = true;
    trackFormStart({ form_name: 'tour_quiz', lead_source: source });
  };

  const updateField = (field, value) => {
    setFields((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError('');
  };

  const updateAnswer = (field, value) => {
    markStarted();
    onAnswer(field, value);
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError('');
  };

  const validate = () => {
    const next = {};
    if (!fields.first_name.trim()) next.first_name = 'Enter your first name.';
    if (!fields.phone.trim()) next.phone = 'Enter a phone number.';
    if (!fields.email.trim()) next.email = 'Enter an email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) next.email = 'Enter a valid email address.';
    if (!answers.interest_type) next.interest_type = 'Choose what you want to explore.';
    if (!answers.start_timeline) next.start_timeline = 'Choose a starting timeframe.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submitForm = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setSubmitError('');
    try {
      const payload = buildTourLeadPayload({
        form: { ...fields, interest_type: answers.interest_type, start_timeline: answers.start_timeline },
        source,
        attribution: getLeadAttribution(),
        requestId: requestIdRef.current,
      });
      if (previewMode) {
        setFields(createInitialTourForm({ source, location: GYM_CONFIG.location }));
        setPreviewComplete(true);
        return;
      }
      await createLead(payload);
      requestIdRef.current = createLeadRequestId();
      trackLeadSubmit({ interest_type: answers.interest_type, lead_source: source || 'website_form' });
      navigate('/thank-you', { state: { source } });
    } catch (error) {
      setSubmitError(
        error.response?.data?.detail || 'We could not send the request. Please try again or call the gym.',
      );
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field) =>
    `input-light ${errors[field] ? 'border-[color:var(--scs-clay)] ring-2 ring-[color:var(--scs-clay)]/20' : ''}`;

  const labelClass = 'block text-sm font-semibold mb-1.5 text-[color:var(--scs-text)]';

  if (previewComplete) {
    return (
      <div role="status" className="scs-preview-success" data-testid="preview-tour-success">
        <Check size={26} aria-hidden="true" />
        <h3>Preview test complete</h3>
        <p>
          No request was sent, and no form information was stored. Production mode will use the approved CRM
          lead endpoint.
        </p>
        <button
          type="button"
          className="scs-button scs-button-secondary"
          onClick={() => setPreviewComplete(false)}
        >
          Test the form again
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submitForm}
      onFocusCapture={markStarted}
      onPointerDownCapture={markStarted}
      noValidate
      aria-labelledby="spe-form-heading"
    >
      {previewMode && (
        <div className="scs-preview-notice" role="note" data-testid="preview-tour-notice">
          Preview test mode. Use test information only. Nothing entered here will be sent or stored.
        </div>
      )}

      <h2
        id="spe-form-heading"
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-2xl sm:text-3xl text-[color:var(--scs-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--scs-charcoal)]"
      >
        Request your free facility tour
      </h2>

      {/* The two answers the page already asked for. Owned by the page, shown
          here so they can still be changed, and so a visitor who scrolled
          straight past the mechanic is asked properly rather than defaulted. */}
      <div className="mt-6 space-y-5">
        <AnswerChips
          legend="What brings you in?"
          options={INTEREST_OPTIONS}
          value={answers.interest_type}
          onChange={(value) => updateAnswer('interest_type', value)}
          error={errors.interest_type}
          compact
        />
        <AnswerChips
          legend="When are you thinking of starting?"
          options={TIMELINE_OPTIONS}
          value={answers.start_timeline}
          onChange={(value) => updateAnswer('start_timeline', value)}
          error={errors.start_timeline}
          compact
        />
        <AnimatePresence initial={false}>
          {carried && (
            <motion.p
              key="carried"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduce ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.2 }}
              className="text-xs leading-relaxed text-[color:var(--scs-text-muted)]"
            >
              Carried down from your answers above. Change either one here if you want.
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div
        className="mt-7 pt-7 space-y-4"
        style={{ borderTop: '1px solid var(--scs-border)' }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="tour-first-name" className={labelClass}>
              First name <span aria-hidden="true" className="text-[color:var(--scs-clay)]">*</span>
            </label>
            <input
              id="tour-first-name"
              value={fields.first_name}
              onChange={(event) => updateField('first_name', event.target.value)}
              placeholder="Your first name"
              autoComplete="given-name"
              className={inputClass('first_name')}
              aria-invalid={Boolean(errors.first_name)}
              aria-describedby={errors.first_name ? 'tour-first-name-error' : undefined}
              data-testid="lead-form-name-input"
            />
            {errors.first_name && (
              <p id="tour-first-name-error" role="alert" className="text-sm mt-1 font-semibold text-[color:var(--scs-clay)]">
                {errors.first_name}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="tour-last-name" className={labelClass}>
              Last name <span className="font-normal text-[color:var(--scs-text-muted)]">(optional)</span>
            </label>
            <input
              id="tour-last-name"
              value={fields.last_name}
              onChange={(event) => updateField('last_name', event.target.value)}
              placeholder="Your last name"
              autoComplete="family-name"
              className="input-light"
            />
          </div>
          <div>
            <label htmlFor="tour-phone" className={labelClass}>
              Phone number <span aria-hidden="true" className="text-[color:var(--scs-clay)]">*</span>
            </label>
            <input
              id="tour-phone"
              type="tel"
              inputMode="tel"
              value={fields.phone}
              onChange={(event) => updateField('phone', event.target.value)}
              placeholder="(408) 555-0123"
              autoComplete="tel"
              className={inputClass('phone')}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? 'tour-phone-error' : undefined}
              data-testid="lead-form-phone-input"
            />
            {errors.phone && (
              <p id="tour-phone-error" role="alert" className="text-sm mt-1 font-semibold text-[color:var(--scs-clay)]">
                {errors.phone}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="tour-email" className={labelClass}>
              Email address <span aria-hidden="true" className="text-[color:var(--scs-clay)]">*</span>
            </label>
            <input
              id="tour-email"
              type="email"
              inputMode="email"
              value={fields.email}
              onChange={(event) => updateField('email', event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className={inputClass('email')}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'tour-email-error' : undefined}
              data-testid="lead-form-email-input"
            />
            {errors.email && (
              <p id="tour-email-error" role="alert" className="text-sm mt-1 font-semibold text-[color:var(--scs-clay)]">
                {errors.email}
              </p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="tour-goals" className={labelClass}>
            Training goals or questions{' '}
            <span className="font-normal text-[color:var(--scs-text-muted)]">(optional)</span>
          </label>
          <textarea
            id="tour-goals"
            value={fields.training_goals}
            onChange={(event) => updateField('training_goals', event.target.value)}
            placeholder="What would make this a useful visit?"
            rows={3}
            data-testid="lead-form-goals-textarea"
            className="input-light resize-none"
          />
        </div>

        <fieldset>
          <legend className={labelClass}>Preferred reply</legend>
          <div className="flex flex-wrap gap-2">
            {PREFERRED_CONTACTS.map((contact) => {
              const selected = fields.preferred_contact === contact.value;
              return (
                <button
                  key={contact.value}
                  type="button"
                  onClick={() => updateField('preferred_contact', contact.value)}
                  aria-pressed={selected}
                  className={`min-h-11 flex-1 px-3 border text-sm font-semibold transition-[background-color,border-color,color] duration-150 active:translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--scs-charcoal)] ${
                    selected
                      ? 'bg-[color:var(--scs-charcoal)] text-[color:var(--scs-chalk)] border-[color:var(--scs-charcoal)]'
                      : 'bg-[color:var(--scs-warm-white)] text-[color:var(--scs-text-muted)] border-[color:var(--scs-border)] hover:border-[color:var(--scs-charcoal)]'
                  }`}
                  style={{ borderRadius: 'var(--scs-radius)' }}
                >
                  {contact.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <label className="flex items-start gap-3 cursor-pointer" data-testid="sms-consent-checkbox">
          <input
            type="checkbox"
            checked={fields.sms_consent}
            onChange={(event) => updateField('sms_consent', event.target.checked)}
            className="mt-0.5 w-5 h-5 border-2 border-[color:var(--scs-border)] accent-[color:var(--scs-charcoal)] cursor-pointer shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--scs-charcoal)]"
          />
          <span className="text-xs leading-relaxed text-[color:var(--scs-text-muted)]">
            Optional: I agree to receive automated operational texts from Santa Cruz Strength about this
            inquiry and visit, including confirmations, reminders and replies. This does not enroll me in
            promotional marketing texts. Consent is not a condition of purchase. Message frequency varies.
            Message and data rates may apply. Reply <strong>STOP</strong> to cancel or <strong>HELP</strong>{' '}
            for help. See the{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline">
              Privacy Policy
            </a>{' '}
            and{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline">
              Terms
            </a>
            .
          </span>
        </label>
      </div>

      {submitError && (
        <div role="alert" className="mt-5 border border-red-300 bg-red-50 text-red-800 p-4 text-sm">
          {submitError}{' '}
          <a href={GYM_CONFIG.phoneHref} className="font-bold underline">
            Call {GYM_CONFIG.phone}
          </a>
          .
        </div>
      )}

      <div className="mt-6">
        <button
          type="submit"
          disabled={loading}
          className="btn-clay w-full py-3.5 text-sm uppercase tracking-wider font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="lead-form-submit-button"
        >
          {loading ? (
            <>
              <Loader2 size={17} className="animate-spin" aria-hidden="true" /> Sending request...
            </>
          ) : (
            <>
              <Check size={16} aria-hidden="true" /> Request my free tour
            </>
          )}
        </button>
        <p className="text-sm leading-relaxed text-[color:var(--scs-text-muted)] mt-3">
          No membership commitment and no card required. Someone from the gym will get back to you.
        </p>
        <p className="text-xs leading-relaxed mt-2 text-[color:var(--scs-text-muted)]">
          By submitting, you agree that Santa Cruz Strength may use the information provided to respond by
          phone or email. Optional SMS consent is controlled separately above.
        </p>
      </div>
    </form>
  );
}
