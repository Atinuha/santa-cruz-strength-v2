import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { requireAcceptedLeadResponse, getLeadSubmissionErrorMessage } from '../utils/leadSubmission';
import api from '../lib/api';
import { GYM_CONFIG } from '../config';

export default function Volunteer() {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [consent, setConsent] = useState(false);
  const submitted = useRef(false);
  const navigate = useNavigate();

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitted.current || submitting) return;
    if (!consent) { setError('Please agree to the consent notice to continue.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const requestId = crypto.randomUUID();
      const response = await api.post('/api/v1/leads', {
        request_id: requestId,
        schema_version: '1.0.0',
        brand_id: 'santa_cruz_strength',
        location_id: 'santa_cruz_ca',
        form_id: 'volunteer_interest',
        offer_id: 'community_volunteer',
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone || undefined,
        interest_type: 'Volunteer',
        lead_source: 'volunteer_page',
        sms_consent: false,
        email_consent: true,
        consent: {
          privacy_notice_version: '2026-08-03',
          email_consent_text_version: 'volunteer-interest-v1',
        },
        message: form.message || undefined,
      }, { headers: { 'Idempotency-Key': requestId } });
      const result = requireAcceptedLeadResponse(response.data, requestId);
      submitted.current = true;
      navigate('/thank-you', { state: { accepted: true, requestId: result.request_id, source: 'volunteer' }, replace: true });
    } catch (err) {
      if (err?.response?.status === 409) {
        setError('This request was already submitted.');
      } else {
        setError('Something went wrong. Please try again or call us.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--scs-bg)' }}>
      <Navbar />
      <main id="main">
        <section className="pt-28 pb-16 sm:pb-24" style={{ background: 'var(--scs-cream)' }}>
          <div className="max-w-2xl mx-auto px-4 sm:px-6">
            <h1 className="font-display text-3xl sm:text-4xl mb-4" style={{ color: 'var(--scs-forest)' }} data-testid="volunteer-headline">
              Volunteer with Santa Cruz Strength
            </h1>
            <p className="text-base leading-relaxed mb-8" style={{ color: 'var(--scs-text)' }}>
              Interested in volunteering at our events or in the gym? Fill out the form below and a team member will reach out.
            </p>

            <form onSubmit={handleSubmit} data-testid="volunteer-form" className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input type="text" placeholder="First name" required value={form.first_name} onChange={set('first_name')}
                  className="scs-input" data-testid="volunteer-first-name" />
                <input type="text" placeholder="Last name" value={form.last_name} onChange={set('last_name')}
                  className="scs-input" data-testid="volunteer-last-name" />
              </div>
              <input type="email" placeholder="Email" required value={form.email} onChange={set('email')}
                className="scs-input" data-testid="volunteer-email" />
              <input type="tel" placeholder="Phone (optional)" value={form.phone} onChange={set('phone')}
                className="scs-input" data-testid="volunteer-phone" />
              <textarea placeholder="Tell us about your interest in volunteering" rows={4} value={form.message} onChange={set('message')}
                className="scs-input" data-testid="volunteer-message" />

              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1" data-testid="volunteer-consent" />
                <span className="text-sm" style={{ color: 'var(--scs-text-muted)' }}>
                  I agree to be contacted by Santa Cruz Strength about volunteer opportunities. My information will be handled according to the <a href="/privacy" className="underline">privacy policy</a>.
                </span>
              </label>

              {error && <p className="text-sm text-red-600" data-testid="volunteer-error">{error}</p>}

              <button type="submit" disabled={submitting} className="btn-primary w-full" data-testid="volunteer-submit">
                {submitting ? 'Submitting...' : 'Submit Volunteer Interest'}
              </button>
            </form>

            <p className="text-sm mt-6" style={{ color: 'var(--scs-text-muted)' }}>
              Questions? Call us at <a href={GYM_CONFIG.phoneHref}>{GYM_CONFIG.phone}</a>.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
