import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createLead } from '../lib/api';
import { GYM_CONFIG, INTEREST_TYPES, START_TIMELINES, PREFERRED_CONTACTS } from '../config';
import { Loader2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

export default function LeadForm({ source = 'website_form', variant = 'default', onSuccess }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
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
  });

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
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    try {
      await createLead({ ...form });
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/thank-you', { state: { source } });
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = `w-full bg-black/40 border text-white placeholder:text-white/40 rounded-md px-3 py-2.5 text-sm
    focus:outline-none focus:ring-2 focus:ring-white/60 focus:border-transparent transition-colors duration-200`;

  const errorClass = 'text-red-400 text-xs mt-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Name row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-white/70 mb-1.5">First Name *</label>
          <input
            name="first_name"
            value={form.first_name}
            onChange={handleChange}
            placeholder="Alex"
            data-testid="lead-form-name-input"
            className={`${inputClass} ${
              errors.first_name ? 'border-red-500/60' : 'border-white/12'
            }`}
          />
          {errors.first_name && <p className={errorClass} data-testid="lead-form-error-message">{errors.first_name}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium text-white/70 mb-1.5">Last Name *</label>
          <input
            name="last_name"
            value={form.last_name}
            onChange={handleChange}
            placeholder="Smith"
            className={`${inputClass} ${errors.last_name ? 'border-red-500/60' : 'border-white/12'}`}
          />
          {errors.last_name && <p className={errorClass}>{errors.last_name}</p>}
        </div>
      </div>

      {/* Phone */}
      <div>
        <label className="block text-xs font-medium text-white/70 mb-1.5">Phone Number *</label>
        <input
          name="phone"
          type="tel"
          value={form.phone}
          onChange={handleChange}
          placeholder="(831) 555-0100"
          data-testid="lead-form-phone-input"
          className={`${inputClass} ${errors.phone ? 'border-red-500/60' : 'border-white/12'}`}
        />
        {errors.phone && <p className={errorClass}>{errors.phone}</p>}
      </div>

      {/* Email */}
      <div>
        <label className="block text-xs font-medium text-white/70 mb-1.5">Email Address *</label>
        <input
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="alex@example.com"
          data-testid="lead-form-email-input"
          className={`${inputClass} ${errors.email ? 'border-red-500/60' : 'border-white/12'}`}
        />
        {errors.email && <p className={errorClass}>{errors.email}</p>}
      </div>

      {variant !== 'minimal' && (
        <>
          {/* Interest */}
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">I'm interested in...</label>
            <div className="relative">
              <select
                name="interest_type"
                value={form.interest_type}
                onChange={handleChange}
                className={`${inputClass} border-white/12 appearance-none pr-8 cursor-pointer`}
                style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
              >
                {INTEREST_TYPES.map((t) => (
                  <option key={t} value={t} style={{ background: '#1A1A1A' }}>{t}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
            </div>
          </div>

          {/* Timeline */}
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">When are you looking to start?</label>
            <div className="grid grid-cols-2 gap-2">
              {START_TIMELINES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, start_timeline: t }))}
                  className={`py-2 px-3 rounded-md text-xs font-medium transition-colors duration-200 ${
                    form.start_timeline === t
                      ? 'bg-[#D32F2F] text-white'
                      : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/8'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Goals */}
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">What are your training goals? (optional)</label>
            <textarea
              name="training_goals"
              value={form.training_goals}
              onChange={handleChange}
              placeholder="Build strength, lose weight, compete in powerlifting..."
              rows={2}
              data-testid="lead-form-goals-textarea"
              className={`${inputClass} border-white/12 resize-none`}
            />
          </div>

          {/* Preferred contact */}
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">Best way to reach you?</label>
            <div className="flex gap-2">
              {PREFERRED_CONTACTS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, preferred_contact: c.value }))}
                  className={`flex-1 py-2 px-2 rounded-md text-xs font-medium transition-colors duration-200 ${
                    form.preferred_contact === c.value
                      ? 'bg-[#D32F2F] text-white'
                      : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/8'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <button
        type="submit"
        disabled={loading}
        data-testid="lead-form-submit-button"
        className="w-full btn-scs-primary py-3 rounded-md font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-70"
      >
        {loading ? (
          <><Loader2 size={16} className="animate-spin" /> Submitting...</>
        ) : (
          'Get Started — It\'s Free'
        )}
      </button>

      <p className="text-center text-xs text-white/35">
        No commitment required. A coach will reach out within 24 hours.
      </p>
    </form>
  );
}
