import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { GYM_CONFIG } from '../config';
import api from '../lib/api';
import { buildCorporateLeadPayload, createLeadRequestId } from '../utils/leadContracts';
import { getLeadAttribution } from '../utils/attribution';
import { toast } from 'sonner';
import {
  Building2, Users, Percent, HandCoins, HelpCircle,
  CheckCircle2, ArrowRight, Coffee, UtensilsCrossed, Beer,
  ShoppingBag, Heart, Waves, Wrench, School, Briefcase, Store,
  Loader2, ChevronRight, ChevronLeft, Phone, Shield, Zap, Check,
} from 'lucide-react';

const CONTRIB_OPTIONS = [
  { value: 'employer_pays_all', label: 'Employer Pays All', desc: 'Company covers 100% of memberships', icon: HandCoins },
  { value: 'employer_pays_part', label: 'Employer Pays Part', desc: 'Company covers a fixed amount or %', icon: Percent },
  { value: 'employee_discount', label: 'Employee Discount Only', desc: 'Employees get a preferred corporate rate', icon: Users },
  { value: 'not_sure', label: 'Not Sure Yet', desc: "We'll help you figure it out", icon: HelpCircle },
];

const HOW_STEPS = [
  { num: '01', title: 'Tell us about your team', desc: 'Quick form: takes under 2 minutes.' },
  { num: '02', title: 'Pick a contribution model', desc: 'Pay all, split, or just offer a discount.' },
  { num: '03', title: 'Get your custom plan', desc: 'We build a signup link or code for your team.' },
  { num: '04', title: 'Your team trains', desc: 'Employees join a real local gym community.' },
];

const BUSINESSES = [
  { icon: Coffee, label: 'Coffee shops' },
  { icon: UtensilsCrossed, label: 'Restaurants' },
  { icon: Beer, label: 'Breweries' },
  { icon: ShoppingBag, label: 'Local retail' },
  { icon: Heart, label: 'Healthcare' },
  { icon: Waves, label: 'Surf & outdoor' },
  { icon: Wrench, label: 'Trades' },
  { icon: Shield, label: 'Nonprofits' },
  { icon: School, label: 'Schools' },
  { icon: Briefcase, label: 'Offices' },
  { icon: Store, label: 'Small biz 3+' },
];

// Quiz form steps
const FORM_STEPS = [
  { id: 'company', title: "What's your business called?", subtitle: 'We work with local Santa Cruz companies of all sizes.' },
  { id: 'contact', title: 'Who should we talk to?', subtitle: 'Name, email, and optionally phone.' },
  { id: 'team', title: 'How big is your team?', subtitle: 'Helps us recommend the right plan.' },
  { id: 'model', title: 'How would you like to contribute?', subtitle: 'Helps us tailor the proposal to your business.' },
  { id: 'details', title: 'Anything else we should know?', subtitle: 'Optional: start date, questions, etc.' },
  { id: 'consent', title: "Almost done: let's stay in touch.", subtitle: 'We will follow up using the details you provide.' },
];

const EMPTY_FORM = {
  business_name: '', contact_name: '', contact_title: '', email: '', phone: '',
  business_address: '', website_or_instagram: '', employee_count: '',
  estimated_enrolled: '', contribution_model: '', desired_start_date: '',
  notes: '', email_consent: false, sms_consent: false,
};

export default function LocalWellness() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState(0);
  const inputRef = useRef(null);

  const current = FORM_STEPS[step];
  const total = FORM_STEPS.length;

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [step]);

  const set = (key, val) => { setForm(p => ({ ...p, [key]: val })); setErrors(p => ({ ...p, [key]: undefined })); };

  const validateStep = () => {
    const e = {};
    if (current.id === 'company') {
      if (!form.business_name.trim()) e.business_name = 'Business name required';
    }
    if (current.id === 'contact') {
      if (!form.contact_name.trim()) e.contact_name = 'Contact name required';
      if (!form.email.trim()) e.email = 'Email required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Valid email required';
    }
    if (current.id === 'consent') {
      if (!form.email_consent) e.email_consent = 'Please agree to email follow-up';
    }
    return e;
  };

  const goNext = () => {
    const errs = validateStep();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    if (step < total - 1) setStep(s => s + 1);
  };

  const goBack = () => { setErrors({}); setStep(s => Math.max(0, s - 1)); };

  const requestIdRef = useRef(null);
  if (!requestIdRef.current) requestIdRef.current = createLeadRequestId();

  const handleSubmit = async () => {
    const errs = validateStep();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      // The member forms were migrated to the v1 lead contract and this one was
      // not, so every corporate submission was rejected 422 "Unsupported form
      // schema version" and no B2B lead ever reached the database. The builder
      // and its test already existed; this page simply never called it.
      const payload = buildCorporateLeadPayload({
        form,
        attribution: getLeadAttribution(),
        requestId: requestIdRef.current,
      });
      await api.post('/corporate-leads', payload);
      // A fresh identifier per successful submission, so a second genuine
      // enquiry from the same visitor is not silently deduplicated into the
      // first one, while a retry of a failed send keeps the old one.
      requestIdRef.current = createLeadRequestId();
      setSubmitted(true);
      toast.success('Request submitted!');
    } catch (err) { toast.error(err.response?.data?.detail || 'Something went wrong'); }
    finally { setLoading(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); step < total - 1 ? goNext() : handleSubmit(); }
  };

  const inputCls = "w-full bg-white border border-[var(--clr-border)] rounded-xl px-4 py-3 text-sm text-[var(--clr-charcoal)] placeholder:text-[var(--clr-text-light)] focus:outline-none focus:ring-2 focus:ring-[var(--clr-green)]/30 focus:border-[var(--clr-green)] transition-all";
  const errCls = "text-[var(--clr-coral)] text-xs mt-1 font-semibold";

  return (
    <div className="min-h-screen" style={{ background: 'var(--clr-bg)' }}>
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-20" data-testid="corporate-hero">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="green-accent-line" />
              <p className="text-[var(--clr-green)] text-xs font-bold uppercase tracking-widest mb-3">Corporate Gym Memberships in Santa Cruz</p>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.5rem] tracking-wide leading-[0.95] mb-5" style={{ color: 'var(--clr-charcoal)' }}>
                A LOCAL GYM PERK<br />YOUR TEAM WILL<br /><span style={{ color: 'var(--clr-green)' }}>ACTUALLY USE.</span>
              </h1>
              <p className="text-[var(--clr-text)] text-base leading-relaxed mb-6 max-w-lg font-medium">
                Corporate wellness memberships for Santa Cruz businesses that want healthier, stronger,
                more supported employees: without the big-box gym energy.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a href="#corporate-form" className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 text-sm" data-testid="corporate-cta-pricing">
                  Request Corporate Pricing <ArrowRight size={14} />
                </a>
                <a href={GYM_CONFIG.phoneHref} className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold rounded-xl border-2 transition-all duration-200 hover:bg-[var(--clr-charcoal)] hover:text-white hover:border-[var(--clr-charcoal)]" style={{ color: 'var(--clr-charcoal)', borderColor: 'var(--clr-charcoal)' }}>
                  <Phone size={14} /> Book a Quick Call
                </a>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: 'var(--clr-border)', boxShadow: 'var(--shadow-md)' }}>
                <h3 className="font-display text-lg tracking-wide mb-1" style={{ color: 'var(--clr-charcoal)' }}>TEAM PRICING</h3>
                <p className="text-xs text-[var(--clr-text-muted)] mb-4">Based on enrolled employees: not total company size.</p>
                <div className="space-y-2.5">
                  {[
                    { range: '3 to 5 enrolled', note: 'Small team discount' },
                    { range: '6 to 10 enrolled', note: 'Growing team discount' },
                    { range: '11 to 20 enrolled', note: 'Mid-size team discount' },
                    { range: '21+ enrolled', note: 'Custom package: let\'s talk' },
                  ].map((t) => (
                    <div key={t.range} className="flex items-center justify-between py-2.5 px-3 rounded-xl" style={{ background: 'var(--clr-bg)' }}>
                      <span className="text-sm font-bold" style={{ color: 'var(--clr-charcoal)' }}>{t.range}</span>
                      <span className="text-xs font-semibold" style={{ color: 'var(--clr-green)' }}>{t.note}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-[var(--clr-text-light)] mt-3 text-center">Volume discounts increase with team size. Request a custom quote below.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="py-16 bg-white border-y" style={{ borderColor: 'var(--clr-border)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <span className="green-accent-line mx-auto" />
          <h2 className="font-display text-3xl sm:text-4xl tracking-wide mb-5" style={{ color: 'var(--clr-charcoal)' }}>
            EMPLOYEE WELLNESS THAT ISN&apos;T WASTED.
          </h2>
          <p className="text-[var(--clr-text)] text-sm leading-relaxed max-w-2xl mx-auto mb-8 font-medium">
            Most employee wellness programs are either too expensive, too complicated, or barely used.
            A meditation app subscription doesn&apos;t cut it. Your team wants something real:
            a local Santa Cruz gym where they can train, build strength, reduce stress, and feel connected.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { icon: Zap, title: 'Strength training that works', desc: 'A real gym, not a globo gym. Focused equipment, serious coaching, results your team can feel.' },
              { icon: Users, title: 'A local community', desc: 'Your employees join a supportive Santa Cruz fitness community: not an anonymous cardio floor.' },
              { icon: Shield, title: 'Simple setup, zero hassle', desc: 'We handle memberships, billing, and onboarding. You pick the contribution model and we do the rest.' },
            ].map((b) => (
              <div key={b.title} className="text-left p-5 rounded-2xl" style={{ background: 'var(--clr-bg)', border: '1px solid var(--clr-border)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: 'var(--clr-bg-green)' }}>
                  <b.icon size={18} style={{ color: 'var(--clr-green)' }} />
                </div>
                <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--clr-charcoal)' }}>{b.title}</h3>
                <p className="text-xs text-[var(--clr-text-muted)] leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16" style={{ background: 'var(--clr-bg)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <span className="green-accent-line mx-auto" />
            <p className="text-[var(--clr-green)] text-xs font-bold uppercase tracking-widest mb-3">Corporate Wellness Program</p>
            <h2 className="font-display text-3xl sm:text-4xl tracking-wide" style={{ color: 'var(--clr-charcoal)' }}>HOW IT WORKS</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_STEPS.map((s) => (
              <div key={s.num}>
                <span className="font-display text-5xl tracking-wide" style={{ color: 'var(--clr-green)', opacity: 0.15 }}>{s.num}</span>
                <h3 className="font-bold text-sm mt-1 mb-2" style={{ color: 'var(--clr-charcoal)' }}>{s.title}</h3>
                <p className="text-xs text-[var(--clr-text-muted)] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plan Options */}
      <section className="py-16 bg-white border-y" style={{ borderColor: 'var(--clr-border)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="green-accent-line mx-auto" />
            <p className="text-[var(--clr-green)] text-xs font-bold uppercase tracking-widest mb-3">Flexible Options</p>
            <h2 className="font-display text-3xl sm:text-4xl tracking-wide" style={{ color: 'var(--clr-charcoal)' }}>
              CORPORATE MEMBERSHIP PLANS
            </h2>
            <p className="text-[var(--clr-text-muted)] text-sm mt-3 max-w-lg mx-auto">
              Choose what works best for your business. Every model gives employees access to Santa Cruz Strength at a preferred rate.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CONTRIB_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <div key={opt.value} className="flex items-start gap-4 p-5 rounded-2xl border transition-all duration-200 hover:border-[var(--clr-green)]" style={{ borderColor: 'var(--clr-border)', background: 'var(--clr-bg)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--clr-bg-green)' }}>
                    <Icon size={18} style={{ color: 'var(--clr-green)' }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm mb-0.5" style={{ color: 'var(--clr-charcoal)' }}>{opt.label}</h3>
                    <p className="text-xs text-[var(--clr-text-muted)] leading-relaxed">{opt.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Best-Fit Businesses */}
      <section className="py-16" style={{ background: 'var(--clr-bg)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="green-accent-line mx-auto" />
            <p className="text-[var(--clr-green)] text-xs font-bold uppercase tracking-widest mb-3">Built for Local Businesses</p>
            <h2 className="font-display text-3xl sm:text-4xl tracking-wide" style={{ color: 'var(--clr-charcoal)' }}>
              PERFECT FOR SANTA CRUZ TEAMS
            </h2>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {BUSINESSES.map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.label} className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-full border" style={{ borderColor: 'var(--clr-border)', boxShadow: 'var(--shadow-sm)' }}>
                  <Icon size={14} style={{ color: 'var(--clr-green)' }} />
                  <span className="text-xs font-bold" style={{ color: 'var(--clr-charcoal)' }}>{b.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Quiz Form */}
      <section id="corporate-form" className="py-16 bg-white border-t" style={{ borderColor: 'var(--clr-border)' }} data-testid="corporate-form-section">
        <div className="max-w-xl mx-auto px-4 sm:px-6">

          {submitted ? (
            <div className="text-center py-12 animate-fade-in-up" data-testid="corporate-form-success">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--clr-bg-green)' }}>
                <CheckCircle2 size={32} style={{ color: 'var(--clr-green)' }} />
              </div>
              <h3 className="font-display text-2xl tracking-wide mb-2" style={{ color: 'var(--clr-charcoal)' }}>WE&apos;RE ON IT.</h3>
              <p className="text-[var(--clr-text-muted)] text-sm mb-6 max-w-md mx-auto">
                Thanks for your interest in corporate wellness at Santa Cruz Strength! We will follow up using the details you provided.
              </p>
              <button onClick={() => navigate('/')} className="btn-primary px-6 py-3 text-sm">Back to Home</button>
            </div>
          ) : (
            <div className="card-light p-6 sm:p-8" data-testid="corporate-quiz">
              {/* Progress */}
              <div className="flex items-center justify-between mb-1">
                <span className="text-[var(--clr-green)] text-[10px] font-bold uppercase tracking-widest">Step {step + 1} of {total}</span>
                {step > 0 && (
                  <button onClick={goBack} className="flex items-center gap-1 text-xs text-[var(--clr-text-muted)] hover:text-[var(--clr-charcoal)] transition-colors">
                    <ChevronLeft size={12} /> Back
                  </button>
                )}
              </div>
              <div className="flex gap-1 mb-6">
                {FORM_STEPS.map((fs, i) => (
                  <div key={fs.id} className="flex-1 h-1 rounded-full transition-all duration-300"
                    style={{ background: i <= step ? 'var(--clr-green)' : 'var(--clr-border)' }} />
                ))}
              </div>

              {/* Step Title */}
              <h3 className="text-[var(--clr-charcoal)] font-bold text-xl leading-tight mb-1">{current.title}</h3>
              <p className="text-[var(--clr-text-muted)] text-sm mb-5">{current.subtitle}</p>

              {/* Step Content */}
              <div className="animate-fade-in-up" key={`step-${step}`}>

                {/* COMPANY */}
                {current.id === 'company' && (
                  <div className="space-y-3" onKeyDown={handleKeyDown}>
                    <div>
                      <input ref={inputRef} value={form.business_name} onChange={e => set('business_name', e.target.value)}
                        className={inputCls} placeholder="Business name *" data-testid="corp-business-name" />
                      {errors.business_name && <p className={errCls}>{errors.business_name}</p>}
                    </div>
                    <input value={form.business_address} onChange={e => set('business_address', e.target.value)}
                      className={inputCls} placeholder="City, State (optional)" />
                    <input value={form.website_or_instagram} onChange={e => set('website_or_instagram', e.target.value)}
                      className={inputCls} placeholder="Website or @instagram (optional)" />
                  </div>
                )}

                {/* CONTACT */}
                {current.id === 'contact' && (
                  <div className="space-y-3" onKeyDown={handleKeyDown}>
                    <div>
                      <input ref={inputRef} value={form.contact_name} onChange={e => set('contact_name', e.target.value)}
                        className={inputCls} placeholder="Your name *" data-testid="corp-contact-name" />
                      {errors.contact_name && <p className={errCls}>{errors.contact_name}</p>}
                    </div>
                    <input value={form.contact_title} onChange={e => set('contact_title', e.target.value)}
                      className={inputCls} placeholder="Role / title (optional)" />
                    <div>
                      <input ref={step === 1 && !form.contact_name ? null : inputRef} type="email" value={form.email} onChange={e => set('email', e.target.value)}
                        className={inputCls} placeholder="Email *" data-testid="corp-email" />
                      {errors.email && <p className={errCls}>{errors.email}</p>}
                    </div>
                    <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                      className={inputCls} placeholder="Phone (optional)" />
                  </div>
                )}

                {/* TEAM SIZE */}
                {current.id === 'team' && (
                  <div className="space-y-3" onKeyDown={handleKeyDown}>
                    <div>
                      <label className="text-xs text-[var(--clr-text-muted)] font-semibold mb-1 block">Total employees at your company</label>
                      <input ref={inputRef} type="number" min="1" value={form.employee_count} onChange={e => set('employee_count', e.target.value)}
                        className={inputCls} placeholder="e.g. 15" data-testid="corp-employee-count" />
                    </div>
                    <div>
                      <label className="text-xs text-[var(--clr-text-muted)] font-semibold mb-1 block">How many would be interested in a gym membership?</label>
                      <input type="number" min="1" value={form.estimated_enrolled} onChange={e => set('estimated_enrolled', e.target.value)}
                        className={inputCls} placeholder="e.g. 8" data-testid="corp-estimated-enrolled" />
                    </div>
                  </div>
                )}

                {/* CONTRIBUTION MODEL */}
                {current.id === 'model' && (
                  <div className="grid grid-cols-1 gap-2.5">
                    {CONTRIB_OPTIONS.map(opt => {
                      const Icon = opt.icon;
                      const selected = form.contribution_model === opt.value;
                      return (
                        <button key={opt.value} type="button"
                          onClick={() => { set('contribution_model', opt.value); setTimeout(goNext, 400); }}
                          data-testid={`corp-model-${opt.value}`}
                          className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                            selected
                              ? 'border-[var(--clr-green)] bg-[var(--clr-bg-green)]'
                              : 'border-[var(--clr-border)] bg-white hover:border-[var(--clr-seafoam-dark)]'
                          }`}>
                          <Icon size={18} style={{ color: selected ? 'var(--clr-green)' : 'var(--clr-text-light)' }} />
                          <div className="flex-1">
                            <p className="text-sm font-bold" style={{ color: selected ? 'var(--clr-green)' : 'var(--clr-charcoal)' }}>{opt.label}</p>
                            <p className="text-xs text-[var(--clr-text-muted)]">{opt.desc}</p>
                          </div>
                          {selected && <Check size={16} style={{ color: 'var(--clr-green)' }} />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* DETAILS */}
                {current.id === 'details' && (
                  <div className="space-y-3" onKeyDown={handleKeyDown}>
                    <div>
                      <label className="text-xs text-[var(--clr-text-muted)] font-semibold mb-1 block">Desired start date</label>
                      <input ref={inputRef} type="date" value={form.desired_start_date} onChange={e => set('desired_start_date', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className="text-xs text-[var(--clr-text-muted)] font-semibold mb-1 block">Notes or questions</label>
                      <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                        className={`${inputCls} resize-none`} rows={3} placeholder="Anything we should know?" />
                    </div>
                  </div>
                )}

                {/* CONSENT */}
                {current.id === 'consent' && (
                  <div className="space-y-4">
                    <label className="flex items-start gap-2.5 cursor-pointer" data-testid="corp-email-consent">
                      <input type="checkbox" checked={form.email_consent} onChange={e => set('email_consent', e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-2 border-[var(--clr-border)] accent-[var(--clr-green)] cursor-pointer shrink-0" />
                      <span className="text-xs leading-relaxed text-[var(--clr-text-muted)]">
                        I agree to receive email follow-up from Santa Cruz Strength about corporate wellness memberships. *
                      </span>
                    </label>
                    {errors.email_consent && <p className={errCls}>{errors.email_consent}</p>}

                    <label className="flex items-start gap-2.5 cursor-pointer" data-testid="corp-sms-consent">
                      <input type="checkbox" checked={form.sms_consent} onChange={e => set('sms_consent', e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-2 border-[var(--clr-border)] accent-[var(--clr-green)] cursor-pointer shrink-0" />
                      <span className="text-xs leading-relaxed text-[var(--clr-text-muted)]">
                        I agree to receive text messages from Santa Cruz Strength about my corporate membership inquiry.
                        Msg &amp; data rates may apply. Reply <strong>STOP</strong> to opt out. <a href="/privacy" target="_blank" className="underline">Privacy</a> &amp; <a href="/terms" target="_blank" className="underline">Terms</a>.
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="mt-6">
                {current.id === 'model' ? (
                  <p className="text-center text-xs text-[var(--clr-text-light)]">Select an option to continue</p>
                ) : current.id === 'consent' ? (
                  <button onClick={handleSubmit} disabled={loading} data-testid="corp-submit-btn"
                    className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-sm font-bold">
                    {loading ? <><Loader2 size={16} className="animate-spin" /> Submitting...</> : <>Submit Request <ChevronRight size={14} /></>}
                  </button>
                ) : (
                  <button onClick={goNext} className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-sm font-bold" data-testid="corp-next-btn">
                    Continue <ChevronRight size={14} />
                  </button>
                )}
                <p className="text-center text-[10px] text-[var(--clr-text-light)] mt-3">
                  We will follow up using the details you provide.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
