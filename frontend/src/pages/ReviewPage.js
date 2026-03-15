import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { GYM_CONFIG } from '../config';
import { Loader2, Star, ChevronRight, Send, CheckCircle2, AlertCircle } from 'lucide-react';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';

const LOGO = 'https://customer-assets.emergentagent.com/job_f0e6860d-0e81-45b1-9e0b-f7bb6a04df72/artifacts/uf08gcdo_20260313_151045_0000.png';

const CATEGORIES = [
  { id: 'equipment',  label: 'Equipment & Facility' },
  { id: 'coaching',   label: 'Coaching & Staff' },
  { id: 'community',  label: 'Community & Vibe' },
  { id: 'pricing',    label: 'Pricing & Membership' },
  { id: 'hours',      label: 'Hours & Access' },
  { id: 'cleanliness',label: 'Cleanliness' },
  { id: 'other',      label: 'Something Else' },
];

const FOLLOWUP_QUESTIONS = {
  equipment:   'What specifically could we improve with the equipment or facility?',
  coaching:    'Tell us more about your experience with our coaches or staff.',
  community:   'How could we make the community feel more welcoming or inclusive?',
  pricing:     'What would make the membership feel like better value to you?',
  hours:       'Which hours or access options would better fit your schedule?',
  cleanliness: 'What areas specifically need more attention?',
  other:       'Tell us more — what can we do better?',
};

function StarRating({ value, onChange, size = 40 }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-2 justify-center">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button"
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
          className="transition-transform duration-100 hover:scale-110 active:scale-95"
          data-testid={`star-${n}`}>
          <Star
            size={size}
            fill={(hovered || value) >= n ? '#F59E0B' : 'none'}
            stroke={(hovered || value) >= n ? '#F59E0B' : '#D1D5DB'}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}

export default function ReviewPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [name, setName]       = useState('');
  const [invalid, setInvalid] = useState('');
  const [step, setStep]       = useState('rate');  // 'rate' | 'questionnaire' | 'done'
  const [rating, setRating]   = useState(0);
  const [category, setCategory] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [extra, setExtra]     = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${BACKEND}/api/review/${token}`)
      .then(r => r.ok ? r.json() : r.json().then(d => Promise.reject(d.detail)))
      .then(d => { setName(d.name); setLoading(false); })
      .catch(err => { setInvalid(err || 'This review link is invalid or has expired.'); setLoading(false); });
  }, [token]);

  const handleRatingSelect = async (stars) => {
    setRating(stars);
    if (stars >= 4) {
      // Positive — submit and redirect to Google
      setSubmitting(true);
      await submit(stars, '', '', '');
      window.location.href = GYM_CONFIG.googleReviewUrl;
    } else {
      setStep('questionnaire');
    }
  };

  const submit = async (r, cat, fu, ex) => {
    try {
      await fetch(`${BACKEND}/api/review/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: r, category: cat, follow_up: fu, extra: ex }),
      });
    } catch { /* silent */ }
  };

  const handleQuestionnaireSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await submit(rating, category, followUp, extra);
    setStep('done');
    setSubmitting(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-[var(--clr-bg)] flex items-center justify-center">
      <Loader2 size={28} className="animate-spin" style={{ color: 'var(--clr-green)' }} />
    </div>
  );

  if (invalid) return (
    <div className="min-h-screen bg-[var(--clr-bg)] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <AlertCircle size={36} className="mx-auto mb-4" style={{ color: 'var(--clr-coral)' }} />
        <h2 className="font-display text-2xl tracking-wide mb-2" style={{ color: 'var(--clr-charcoal)' }}>LINK UNAVAILABLE</h2>
        <p className="text-[var(--clr-text-muted)] text-sm mb-6">{invalid}</p>
        <Link to="/" className="btn-primary px-6 py-2.5 text-sm">Back to Home</Link>
      </div>
    </div>
  );

  const firstName = name.split(' ')[0] || 'there';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--clr-bg)' }}>
      {/* Header */}
      <div className="py-6 flex justify-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--clr-green)] flex items-center justify-center" style={{ padding: '3px' }}>
            <img src={LOGO} alt="SCS" className="w-full h-full object-contain" style={{ filter: 'invert(1) brightness(2)' }} />
          </div>
          <span className="font-display text-xl tracking-wider" style={{ color: 'var(--clr-charcoal)' }}>SANTA CRUZ STRENGTH</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md">

          {/* ── RATING STEP ── */}
          {step === 'rate' && (
            <div className="bg-white rounded-2xl p-8 text-center" style={{ boxShadow: 'var(--shadow-lg)', border: '1px solid var(--clr-border)' }}>
              <p className="text-4xl mb-4">🏋️</p>
              <h2 className="font-display text-3xl tracking-wide mb-2" style={{ color: 'var(--clr-charcoal)' }}>
                HEY {firstName.toUpperCase()}!
              </h2>
              <p className="text-[var(--clr-text-muted)] text-sm leading-relaxed mb-8">
                Welcome to the crew. How was your experience at Santa Cruz Strength so far?
              </p>
              <StarRating value={rating} onChange={handleRatingSelect} size={44} />
              {submitting && (
                <div className="mt-6 flex items-center justify-center gap-2 text-[var(--clr-text-muted)] text-sm">
                  <Loader2 size={14} className="animate-spin" />
                  Taking you to Google Reviews...
                </div>
              )}
              <p className="text-[var(--clr-text-light)] text-xs mt-6">Tap a star to rate your experience</p>
            </div>
          )}

          {/* ── QUESTIONNAIRE STEP ── */}
          {step === 'questionnaire' && (
            <div className="bg-white rounded-2xl p-7" style={{ boxShadow: 'var(--shadow-lg)', border: '1px solid var(--clr-border)' }}>
              <div className="flex gap-1 justify-center mb-2">
                {[1,2,3,4,5].map(n => (
                  <Star key={n} size={20}
                    fill={rating >= n ? '#F59E0B' : 'none'}
                    stroke={rating >= n ? '#F59E0B' : '#D1D5DB'}
                    strokeWidth={1.5} />
                ))}
              </div>
              <h2 className="font-display text-2xl tracking-wide text-center mb-1" style={{ color: 'var(--clr-charcoal)' }}>HELP US IMPROVE</h2>
              <p className="text-[var(--clr-text-muted)] text-sm text-center mb-6">
                We take every piece of feedback seriously. What can we do better?
              </p>
              <form onSubmit={handleQuestionnaireSubmit} className="space-y-5">
                {/* Category chips */}
                <div>
                  <p className="text-xs font-bold text-[var(--clr-charcoal)] mb-2.5 uppercase tracking-wider">What area needs improvement?</p>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                      <button key={cat.id} type="button"
                        onClick={() => { setCategory(cat.label); setFollowUp(''); }}
                        className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition-all duration-150 ${
                          category === cat.label
                            ? 'bg-[var(--clr-charcoal)] text-white border-[var(--clr-charcoal)]'
                            : 'bg-white text-[var(--clr-text-muted)] border-[var(--clr-border)] hover:border-[var(--clr-green)]'
                        }`} data-testid={`cat-${cat.id}`}>
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dynamic follow-up */}
                {category && (
                  <div className="animate-fade-in">
                    <label className="block text-xs font-bold text-[var(--clr-charcoal)] mb-1.5 uppercase tracking-wider">
                      {FOLLOWUP_QUESTIONS[CATEGORIES.find(c => c.label === category)?.id || 'other']}
                    </label>
                    <textarea
                      value={followUp}
                      onChange={e => setFollowUp(e.target.value)}
                      rows={3}
                      placeholder="Share the details..."
                      data-testid="followup-input"
                      className="w-full border border-[var(--clr-border)] rounded-xl px-4 py-3 text-sm text-[var(--clr-text)] focus:outline-none focus:ring-2 focus:ring-[var(--clr-green)]/30 focus:border-[var(--clr-green)] resize-none"
                    />
                  </div>
                )}

                {/* Extra */}
                <div>
                  <label className="block text-xs font-bold text-[var(--clr-charcoal)] mb-1.5 uppercase tracking-wider">Anything else you'd like us to know?</label>
                  <textarea
                    value={extra}
                    onChange={e => setExtra(e.target.value)}
                    rows={2}
                    placeholder="Optional — any other thoughts..."
                    data-testid="extra-input"
                    className="w-full border border-[var(--clr-border)] rounded-xl px-4 py-3 text-sm text-[var(--clr-text)] focus:outline-none focus:ring-2 focus:ring-[var(--clr-green)]/30 focus:border-[var(--clr-green)] resize-none"
                  />
                </div>

                <button type="submit" disabled={submitting || !category}
                  className="w-full btn-primary py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                  data-testid="submit-feedback-btn">
                  {submitting ? <><Loader2 size={14} className="animate-spin" /> Sending...</> : <><Send size={14} /> Submit Feedback</>}
                </button>
              </form>
            </div>
          )}

          {/* ── DONE STEP ── */}
          {step === 'done' && (
            <div className="bg-white rounded-2xl p-8 text-center" style={{ boxShadow: 'var(--shadow-lg)', border: '1px solid var(--clr-border)' }}>
              <div className="w-16 h-16 bg-[var(--clr-bg-green)] rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={28} style={{ color: 'var(--clr-green)' }} />
              </div>
              <h2 className="font-display text-2xl tracking-wide mb-2" style={{ color: 'var(--clr-charcoal)' }}>THANK YOU</h2>
              <p className="text-[var(--clr-text-muted)] text-sm leading-relaxed mb-6">
                We really appreciate you taking the time. Your feedback goes directly to our team and helps us get better every day.
              </p>
              <Link to="/" className="btn-outline-green px-6 py-2.5 text-sm">Back to Santa Cruz Strength</Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
