import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createLead } from '../lib/api';
import { GYM_CONFIG, INTEREST_TYPES, START_TIMELINES, PREFERRED_CONTACTS } from '../config';
import { Loader2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { getLeadAttribution } from '../utils/attribution';
import { trackFormStart, trackLeadSubmit } from '../utils/analytics';
import PreviewNotice from './PreviewNotice';
import { PREVIEW_MODE } from '../utils/previewSafety';
import { buildMemberLeadPayload, createLeadRequestId } from '../utils/leadContracts';
import { getLeadSubmissionErrorMessage } from '../utils/leadSubmission';

const createEmptyForm = (source) => ({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  interest_type: 'General Membership',
  training_goals: '',
  start_timeline: 'ASAP',
  preferred_contact: 'call',
  lead_source: source,
  location: GYM_CONFIG.location,
  sms_consent: false,
});

export default function LeadForm({ source = 'website_form', variant = 'default', ctaLabel, onSuccess }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [previewComplete, setPreviewComplete] = useState(false);
  const formStartTracked = useRef(false);
  const requestIdRef = useRef(null);
  const submitPendingRef = useRef(false);
  const [form, setForm] = useState(() => createEmptyForm(source));

  if (!requestIdRef.current) requestIdRef.current = createLeadRequestId();

  const handleFormStart = () => {
    if (formStartTracked.current) return;
    formStartTracked.current = true;
    trackFormStart({ form_name: 'lead_form', lead_source: source });
  };

  const validate = () => {
    const e = {};
    if (!form.first_name.trim()) e.first_name = 'First name is required';
    if (!form.last_name.trim()) e.last_name = 'Last name is required';
    if (!form.phone.trim()) e.phone = 'Phone number is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Please enter a valid email';
    return e;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitPendingRef.current) return;
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    submitPendingRef.current = true;
    setLoading(true);
    try {
      if (PREVIEW_MODE) {
        setForm(createEmptyForm(source));
        setPreviewComplete(true);
        return;
      }
      const payload = buildMemberLeadPayload({
        form,
        source,
        attribution: getLeadAttribution(),
        requestId: requestIdRef.current,
        formId: 'legacy_lead_form',
        offerId: 'free_facility_tour',
      });
      const response = await createLead(payload);
      const acceptance = response.data;
      requestIdRef.current = createLeadRequestId();
      trackLeadSubmit({ interest_type: form.interest_type, lead_source: source });
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/thank-you', {
          state: {
            source,
            accepted: true,
            leadId: acceptance.lead_id,
            requestId: acceptance.request_id,
          },
        });
      }
    } catch (err) {
      toast.error(getLeadSubmissionErrorMessage(err, 'We could not send the request. Please try again or call the gym.'));
    } finally {
      submitPendingRef.current = false;
      setLoading(false);
    }
  };

  const inputClass = `w-full bg-white/5 border text-white placeholder:text-white/52 rounded-md px-3 py-2.5 text-sm
    focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent transition-colors duration-200`;
  const errorClass = 'text-red-400 text-xs mt-1';

  if (previewComplete) {
    return (
      <div className="scs-preview-success" role="status" data-testid="preview-lead-success">
        <h3>Preview test complete</h3>
        <p>No lead was sent and no form information was stored.</p>
        <button type="button" className="scs-button scs-button-secondary" onClick={() => setPreviewComplete(false)}>Test the form again</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} onFocusCapture={handleFormStart} className="space-y-4" noValidate>
      <PreviewNotice testId="preview-lead-notice">Use test information only. Nothing entered here will be sent or stored.</PreviewNotice>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-white/60 mb-1.5">First Name *</label>
          <input name="first_name" value={form.first_name} onChange={handleChange} placeholder="Alex"
            data-testid="lead-form-name-input"
            className={`${inputClass} ${errors.first_name ? 'border-red-500/50' : 'border-[var(--clr-border)]'}`} />
          {errors.first_name && <p className={errorClass} data-testid="lead-form-error-message">{errors.first_name}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-white/60 mb-1.5">Last Name *</label>
          <input name="last_name" value={form.last_name} onChange={handleChange} placeholder="Smith"
            className={`${inputClass} ${errors.last_name ? 'border-red-500/50' : 'border-[var(--clr-border)]'}`} />
          {errors.last_name && <p className={errorClass}>{errors.last_name}</p>}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-white/60 mb-1.5">Phone *</label>
        <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="(831) 555-0100"
          data-testid="lead-form-phone-input"
          className={`${inputClass} ${errors.phone ? 'border-red-500/50' : 'border-[var(--clr-border)]'}`} />
        {errors.phone && <p className={errorClass}>{errors.phone}</p>}
      </div>

      <div>
        <label className="block text-xs font-medium text-white/60 mb-1.5">Email *</label>
        <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="alex@example.com"
          data-testid="lead-form-email-input"
          className={`${inputClass} ${errors.email ? 'border-red-500/50' : 'border-[var(--clr-border)]'}`} />
        {errors.email && <p className={errorClass}>{errors.email}</p>}
      </div>

      {variant !== 'minimal' && (
        <>
          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">What brings you in?</label>
            <div className="relative">
              <select name="interest_type" value={form.interest_type} onChange={handleChange}
                className={`${inputClass} border-[var(--clr-border)] appearance-none pr-8 cursor-pointer`}
                style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                {INTEREST_TYPES.map((t) => <option key={t} value={t} style={{ background: '#1A1A1A' }}>{t}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/52 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">Timeline to start?</label>
            <div className="grid grid-cols-2 gap-2">
              {START_TIMELINES.map((t) => (
                <button key={t} type="button"
                  onClick={() => setForm((p) => ({ ...p, start_timeline: t }))}
                  className={`py-2 px-3 rounded-md text-xs font-medium transition-colors duration-200 ${
                    form.start_timeline === t
                      ? 'bg-[var(--clr-green)] text-white'
                      : 'bg-white/5 text-white/55 border border-white/10 hover:bg-white/8'
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">Training goals (optional)</label>
            <textarea name="training_goals" value={form.training_goals} onChange={handleChange}
              placeholder="Build strength, improve performance, stay capable..."
              rows={2} data-testid="lead-form-goals-textarea"
              className={`${inputClass} border-[var(--clr-border)] resize-none`} />
          </div>

          <div>
            <label className="block text-xs font-medium text-white/60 mb-1.5">Best way to reach you?</label>
            <div className="flex gap-2">
              {PREFERRED_CONTACTS.map((c) => (
                <button key={c.value} type="button"
                  onClick={() => setForm((p) => ({ ...p, preferred_contact: c.value }))}
                  className={`flex-1 py-2 px-2 rounded-md text-xs font-medium transition-colors duration-200 ${
                    form.preferred_contact === c.value
                      ? 'bg-[var(--clr-green)] text-white'
                      : 'bg-white/5 text-white/55 border border-white/10 hover:bg-white/8'
                  }`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <button type="submit" disabled={loading} data-testid="lead-form-submit-button"
        className="w-full btn-scs-primary py-3 rounded-md font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
        {loading ? <><Loader2 size={15} className="animate-spin" /> Sending...</> : (ctaLabel || 'Request a Tour - No Commitment')}
      </button>

      <p className="text-center text-xs text-white/48">
        A coach will reach out within 24 hours.
      </p>
    </form>
  );
}
