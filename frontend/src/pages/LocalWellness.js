import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { GYM_CONFIG } from '../config';
import api from '../lib/api';
import { toast } from 'sonner';
import {
  Building2, Users, Percent, HandCoins, HelpCircle,
  CheckCircle2, ArrowRight, Coffee, UtensilsCrossed, Beer,
  ShoppingBag, Heart, Waves, Wrench, School, Briefcase, Store,
  Loader2, ChevronRight, Phone, Shield, Zap, Check,
} from 'lucide-react';

const CONTRIB_OPTIONS = [
  { value: 'employer_pays_all', label: 'Employer Pays All', desc: 'Company covers 100% of memberships', icon: HandCoins },
  { value: 'employer_pays_part', label: 'Employer Pays Part', desc: 'Company covers a fixed amount or percentage', icon: Percent },
  { value: 'employee_discount', label: 'Employee Discount Only', desc: 'Employees get a preferred corporate rate', icon: Users },
  { value: 'not_sure', label: 'Not Sure Yet', desc: "We'll help you figure out the best model", icon: HelpCircle },
];

const TIERS = [
  { range: '3–5 employees', discount: '10% off', color: 'var(--clr-green)' },
  { range: '6–10 employees', discount: '15% off', color: 'var(--clr-green)' },
  { range: '11–20 employees', discount: '20% off', color: 'var(--clr-green)' },
  { range: '21+ employees', discount: 'Custom pricing', color: 'var(--clr-coral)' },
];

const STEPS = [
  { num: '01', title: 'Tell us about your team', desc: 'Fill out the quick form with your company info and team size.' },
  { num: '02', title: 'Choose your contribution model', desc: 'Decide how much the company wants to contribute — all, part, or none.' },
  { num: '03', title: 'Get your custom plan', desc: 'We create a custom employee membership link, signup code, or onboarding process.' },
  { num: '04', title: 'Your team trains', desc: 'Employees train, get stronger, and become part of the Santa Cruz Strength community.' },
];

const BUSINESSES = [
  { icon: Coffee, label: 'Coffee shops' },
  { icon: UtensilsCrossed, label: 'Restaurants' },
  { icon: Beer, label: 'Breweries' },
  { icon: ShoppingBag, label: 'Local retail' },
  { icon: Heart, label: 'Healthcare offices' },
  { icon: Waves, label: 'Surf & outdoor' },
  { icon: Wrench, label: 'Trades & contractors' },
  { icon: Shield, label: 'Nonprofits' },
  { icon: School, label: 'Schools' },
  { icon: Briefcase, label: 'Local offices' },
  { icon: Store, label: 'Small businesses 3+' },
];

const EMPTY_FORM = {
  business_name: '', contact_name: '', contact_title: '', email: '', phone: '',
  business_address: '', website_or_instagram: '', employee_count: '',
  estimated_enrolled: '', contribution_model: 'not_sure', desired_start_date: '',
  notes: '', email_consent: false, sms_consent: false,
};

export default function LocalWellness() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (key, val) => { setForm(p => ({ ...p, [key]: val })); setErrors(p => ({ ...p, [key]: undefined })); };

  const validate = () => {
    const e = {};
    if (!form.business_name.trim()) e.business_name = 'Required';
    if (!form.contact_name.trim()) e.contact_name = 'Required';
    if (!form.email.trim()) e.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Valid email required';
    if (!form.email_consent) e.email_consent = 'Please agree to receive follow-up';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await api.post('/corporate-leads', {
        ...form,
        employee_count: parseInt(form.employee_count) || 0,
        estimated_enrolled: parseInt(form.estimated_enrolled) || 0,
      });
      setSubmitted(true);
      toast.success('Request submitted!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Something went wrong');
    } finally { setLoading(false); }
  };

  const inputCls = "w-full bg-white border border-[var(--clr-border)] rounded-xl px-4 py-3 text-sm text-[var(--clr-charcoal)] placeholder:text-[var(--clr-text-light)] focus:outline-none focus:ring-2 focus:ring-[var(--clr-green)]/30 focus:border-[var(--clr-green)] transition-all";
  const labelCls = "block text-xs font-bold uppercase tracking-wider text-[var(--clr-text-muted)] mb-1.5";
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
              <p className="text-[var(--clr-green)] text-xs font-bold uppercase tracking-widest mb-3">Local Wellness</p>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.5rem] tracking-wide leading-[0.95] mb-5" style={{ color: 'var(--clr-charcoal)' }}>
                A LOCAL GYM PERK<br />YOUR TEAM WILL<br /><span style={{ color: 'var(--clr-green)' }}>ACTUALLY USE.</span>
              </h1>
              <p className="text-[var(--clr-text)] text-base leading-relaxed mb-6 max-w-lg font-medium">
                Corporate memberships for Santa Cruz businesses that want healthier, stronger,
                more supported employees — without the big-box gym energy.
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
            <div className="hidden lg:grid grid-cols-2 gap-3">
              {TIERS.map((t, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 border" style={{ borderColor: 'var(--clr-border)', boxShadow: 'var(--shadow-sm)' }}>
                  <p className="text-sm font-bold mb-1" style={{ color: 'var(--clr-charcoal)' }}>{t.range}</p>
                  <p className="text-2xl font-display tracking-wide" style={{ color: t.color }}>{t.discount}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="py-16 bg-white border-y" style={{ borderColor: 'var(--clr-border)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <span className="green-accent-line mx-auto" />
          <h2 className="font-display text-3xl sm:text-4xl tracking-wide mb-5" style={{ color: 'var(--clr-charcoal)' }}>
            MOST WELLNESS PERKS COLLECT DUST.
          </h2>
          <p className="text-[var(--clr-text)] text-sm leading-relaxed max-w-2xl mx-auto mb-8 font-medium">
            Let's be real — most employee wellness programs are either too expensive, too complicated, or barely used.
            A meditation app subscription doesn't cut it. Your people want something real.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { icon: Zap, title: 'Real training', desc: 'Not a globo gym. A focused strength facility your team will actually enjoy.' },
              { icon: Users, title: 'Real community', desc: 'Your employees join a supportive local community, not an anonymous cardio floor.' },
              { icon: Shield, title: 'Real simple', desc: 'We handle setup, billing, and onboarding. You just pick how much to contribute.' },
            ].map((b, i) => (
              <div key={i} className="text-left p-5 rounded-2xl" style={{ background: 'var(--clr-bg)', border: '1px solid var(--clr-border)' }}>
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
            <h2 className="font-display text-3xl sm:text-4xl tracking-wide" style={{ color: 'var(--clr-charcoal)' }}>HOW IT WORKS</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s, i) => (
              <div key={i} className="relative">
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
            <p className="text-[var(--clr-green)] text-xs font-bold uppercase tracking-widest mb-3">Choose Your Model</p>
            <h2 className="font-display text-3xl sm:text-4xl tracking-wide" style={{ color: 'var(--clr-charcoal)' }}>PLAN OPTIONS</h2>
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
          {/* Discount tiers - mobile visible */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 lg:hidden">
            {TIERS.map((t, i) => (
              <div key={i} className="bg-[var(--clr-bg)] rounded-xl p-4 border text-center" style={{ borderColor: 'var(--clr-border)' }}>
                <p className="text-xs font-bold mb-0.5" style={{ color: 'var(--clr-charcoal)' }}>{t.range}</p>
                <p className="text-lg font-display tracking-wide" style={{ color: t.color }}>{t.discount}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Best-Fit Businesses */}
      <section className="py-16" style={{ background: 'var(--clr-bg)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="green-accent-line mx-auto" />
            <p className="text-[var(--clr-green)] text-xs font-bold uppercase tracking-widest mb-3">Perfect For</p>
            <h2 className="font-display text-3xl sm:text-4xl tracking-wide" style={{ color: 'var(--clr-charcoal)' }}>LOCAL BUSINESSES LIKE YOURS</h2>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {BUSINESSES.map((b, i) => {
              const Icon = b.icon;
              return (
                <div key={i} className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-full border" style={{ borderColor: 'var(--clr-border)', boxShadow: 'var(--shadow-sm)' }}>
                  <Icon size={14} style={{ color: 'var(--clr-green)' }} />
                  <span className="text-xs font-bold" style={{ color: 'var(--clr-charcoal)' }}>{b.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Lead Form */}
      <section id="corporate-form" className="py-16 bg-white border-t" style={{ borderColor: 'var(--clr-border)' }} data-testid="corporate-form-section">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="green-accent-line mx-auto" />
            <h2 className="font-display text-3xl sm:text-4xl tracking-wide mb-3" style={{ color: 'var(--clr-charcoal)' }}>
              REQUEST CORPORATE PRICING
            </h2>
            <p className="text-[var(--clr-text-muted)] text-sm max-w-lg mx-auto">
              Tell us about your business and we'll put together the best option for your team.
            </p>
          </div>

          {submitted ? (
            <div className="text-center py-12 animate-fade-in-up" data-testid="corporate-form-success">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--clr-bg-green)' }}>
                <CheckCircle2 size={32} style={{ color: 'var(--clr-green)' }} />
              </div>
              <h3 className="font-display text-2xl tracking-wide mb-2" style={{ color: 'var(--clr-charcoal)' }}>WE'RE ON IT.</h3>
              <p className="text-[var(--clr-text-muted)] text-sm mb-6 max-w-md mx-auto">
                Thanks for your interest! A member of our team will review your info and follow up within 1 business day.
              </p>
              <button onClick={() => navigate('/')} className="btn-primary px-6 py-3 text-sm">
                Back to Home
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Business Name *</label>
                  <input data-testid="corp-business-name" value={form.business_name} onChange={e => set('business_name', e.target.value)} className={inputCls} placeholder="e.g. Verve Coffee" />
                  {errors.business_name && <p className={errCls}>{errors.business_name}</p>}
                </div>
                <div>
                  <label className={labelCls}>Contact Name *</label>
                  <input data-testid="corp-contact-name" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} className={inputCls} placeholder="Your name" />
                  {errors.contact_name && <p className={errCls}>{errors.contact_name}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Role / Title</label>
                  <input value={form.contact_title} onChange={e => set('contact_title', e.target.value)} className={inputCls} placeholder="e.g. Operations Manager" />
                </div>
                <div>
                  <label className={labelCls}>Email *</label>
                  <input data-testid="corp-email" type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} placeholder="you@company.com" />
                  {errors.email && <p className={errCls}>{errors.email}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Phone</label>
                  <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} placeholder="(831) 555-1234" />
                </div>
                <div>
                  <label className={labelCls}>Business Address</label>
                  <input value={form.business_address} onChange={e => set('business_address', e.target.value)} className={inputCls} placeholder="City, State" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Website or Instagram</label>
                <input value={form.website_or_instagram} onChange={e => set('website_or_instagram', e.target.value)} className={inputCls} placeholder="@handle or website URL" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Total Employees</label>
                  <input type="number" min="1" value={form.employee_count} onChange={e => set('employee_count', e.target.value)} className={inputCls} placeholder="e.g. 15" />
                </div>
                <div>
                  <label className={labelCls}>Estimated Interested</label>
                  <input type="number" min="1" value={form.estimated_enrolled} onChange={e => set('estimated_enrolled', e.target.value)} className={inputCls} placeholder="e.g. 8" />
                </div>
              </div>

              {/* Contribution Model */}
              <div>
                <label className={labelCls}>Preferred Contribution Model</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  {CONTRIB_OPTIONS.map(opt => {
                    const Icon = opt.icon;
                    const selected = form.contribution_model === opt.value;
                    return (
                      <button key={opt.value} type="button"
                        onClick={() => set('contribution_model', opt.value)}
                        data-testid={`corp-model-${opt.value}`}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all duration-200 ${
                          selected
                            ? 'border-[var(--clr-green)] bg-[var(--clr-bg-green)]'
                            : 'border-[var(--clr-border)] bg-white hover:border-[var(--clr-seafoam-dark)]'
                        }`}>
                        <Icon size={16} style={{ color: selected ? 'var(--clr-green)' : 'var(--clr-text-light)' }} />
                        <div>
                          <p className="text-xs font-bold" style={{ color: selected ? 'var(--clr-green)' : 'var(--clr-charcoal)' }}>{opt.label}</p>
                        </div>
                        {selected && <Check size={14} style={{ color: 'var(--clr-green)' }} className="ml-auto shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className={labelCls}>Desired Start Date</label>
                <input type="date" value={form.desired_start_date} onChange={e => set('desired_start_date', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Notes / Questions</label>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)} className={`${inputCls} resize-none`} rows={3} placeholder="Anything else we should know?" />
              </div>

              {/* Consent */}
              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer" data-testid="corp-email-consent">
                  <input type="checkbox" checked={form.email_consent} onChange={e => set('email_consent', e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-2 border-[var(--clr-border)] accent-[var(--clr-green)] cursor-pointer shrink-0" />
                  <span className="text-xs leading-relaxed text-[var(--clr-text-muted)]">
                    I agree to receive email follow-up from Santa Cruz Strength about my corporate membership inquiry. *
                  </span>
                </label>
                {errors.email_consent && <p className={errCls}>{errors.email_consent}</p>}

                <label className="flex items-start gap-2.5 cursor-pointer" data-testid="corp-sms-consent">
                  <input type="checkbox" checked={form.sms_consent} onChange={e => set('sms_consent', e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-2 border-[var(--clr-border)] accent-[var(--clr-green)] cursor-pointer shrink-0" />
                  <span className="text-xs leading-relaxed text-[var(--clr-text-muted)]">
                    I agree to receive text messages from Santa Cruz Strength about my corporate membership inquiry.
                    Message and data rates may apply. Reply <strong>STOP</strong> to opt out.
                  </span>
                </label>
              </div>

              <button type="submit" disabled={loading} data-testid="corp-submit-btn"
                className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-sm font-bold">
                {loading ? <><Loader2 size={16} className="animate-spin" /> Submitting...</> : <>Request Corporate Pricing <ChevronRight size={14} /></>}
              </button>

              <p className="text-center text-[10px] text-[var(--clr-text-light)]">
                We'll follow up within 1 business day. No spam, ever.
              </p>
            </form>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
