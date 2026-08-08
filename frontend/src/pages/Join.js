import React, { useState, useRef, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import QuizForm from '../components/QuizForm';
import { ArrowRight, CheckCircle2, Clock, Users, Zap, Calendar, Star, CreditCard, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { GYM_CONFIG } from '../config';

const PRIMARY_PLANS = [
  { id: 'daypass', name: 'Day Pass', price: '$20', per: '', highlight: false, tag: 'Try Us Out',
    features: ['Valid for same-day use', 'Staffed hours only'], terms: [],
    // A twenty dollar drop-in should not need a tour booking and a callback.
    // Call or walk in during staffed hours.
    direct: 'call', cta: 'Call to arrange' },
  { id: 'huscler-12', name: 'Huscler', subtitle: '12-Month', price: '$75', per: '/mo', highlight: true, tag: 'Most Popular',
    savings: 'Save 38%', compareText: 'vs. $120/mo month-to-month',
    features: ['Full facility access', 'Unlimited open gym', 'All available equipment'],
    terms: ['12-month agreement', 'Auto-renews month-to-month', '30-day cancellation notice', '$50 Annual Enhancement Fee'],
    cta: 'Join Now' },
  { id: 'annual', name: 'Annual Huscler', subtitle: 'Paid in Full', price: '$825', per: ' one-time', highlight: false, tag: 'Best Value',
    savings: 'Save 47%', monthlyEquiv: '$63/mo effective',
    features: ['Full facility access', '13 months total', 'Unlimited open gym'],
    terms: ['Paid in full at signup', 'Auto-renews month-to-month', '30-day cancellation notice', '$50 Annual Enhancement Fee'],
    cta: 'Get 13 Months' },
];

const MORE_PLANS = [
  { id: 'flex', name: 'Flex Huscler', subtitle: 'Month-to-Month', price: '$120', per: '/mo',
    features: ['Full facility access', 'No agreement required'],
    terms: ['Billed monthly', '30-day cancellation notice', '$50 Annual Enhancement Fee'] },
  { id: 'huscler-6', name: 'Huscler 6-Month', subtitle: '6-Month', price: '$82', per: '/mo', savings: 'Save 32%',
    features: ['Full facility access'], terms: ['6-month agreement', 'Auto-renews month-to-month', '$50 Annual Enhancement Fee'] },
  { id: 'couples-12', name: 'Couples 12-Month', subtitle: '2 Members', price: '$120', per: '/mo', extra: '$60/person', savings: 'Save 50%',
    features: ['Includes 2 members', 'Full facility access'], terms: ['12-month agreement', '$50 Annual Enhancement Fee'] },
  { id: 'couples-6', name: 'Couples 6-Month', subtitle: '2 Members', price: '$136', per: '/mo', extra: '$68/person',
    features: ['Includes 2 members', 'Full facility access'], terms: ['6-month agreement', '$50 Annual Enhancement Fee'] },
  { id: 'weekend-12', name: 'Weekend Warrior 12-Mo', subtitle: 'Fri to Sun only', price: '$45', per: '/mo', savings: 'Save 63%',
    features: ['Friday to Sunday access'], terms: ['12-month agreement', '$50 Annual Enhancement Fee'] },
  { id: 'weekend-6', name: 'Weekend Warrior 6-Mo', subtitle: 'Fri to Sun only', price: '$55', per: '/mo', savings: 'Save 54%',
    features: ['Friday to Sunday access'], terms: ['6-month agreement', '$50 Annual Enhancement Fee'] },
];

function PlanCard({ plan }) {
  const pop = plan.highlight;
  return (
    <div className={`relative flex flex-col h-full p-5 ${pop ? 'p-6' : ''}`}
      style={{ background: 'var(--scs-warm-white)', border: pop ? '2px solid var(--scs-charcoal)' : '1px solid var(--scs-border)', borderRadius: 'var(--scs-radius)' }}
      data-testid={`plan-${plan.id}`}>
      {pop && <span className="absolute -top-3 left-4 text-[10px] font-semibold uppercase tracking-wider px-3 py-1" style={{ background: 'var(--scs-charcoal)', color: 'var(--scs-chalk)', borderRadius: 'var(--scs-radius)' }}>Most Popular</span>}
      {!pop && plan.tag && <span className="text-[10px] font-semibold uppercase tracking-wider mb-2 inline-block" style={{ color: 'var(--scs-stone)' }}>{plan.tag}</span>}
      <h3 className="font-display-medium text-base" style={{ color: 'var(--scs-charcoal)' }}>{plan.name}</h3>
      {plan.subtitle && <p className="text-xs mb-2" style={{ color: 'var(--scs-text-muted)' }}>{plan.subtitle}</p>}
      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-2xl font-bold" style={{ color: 'var(--scs-charcoal)' }}>{plan.price}</span>
        <span className="text-sm" style={{ color: 'var(--scs-text-muted)' }}>{plan.per}</span>
      </div>
      {plan.monthlyEquiv && <p className="text-xs font-semibold mb-1" style={{ color: 'var(--scs-clay)' }}>{plan.monthlyEquiv}</p>}
      {plan.savings && <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 inline-block mb-3" style={{ background: 'var(--scs-clay)', color: 'white', borderRadius: 'var(--scs-radius)' }}>{plan.savings}</span>}
      <ul className="space-y-1.5 mb-4 flex-1">
        {plan.features.map((f, i) => <li key={`f-${plan.id}-${i}`} className="flex items-start gap-2 text-xs" style={{ color: 'var(--scs-text)' }}><CheckCircle2 size={13} className="shrink-0 mt-0.5" style={{ color: 'var(--scs-charcoal)' }} />{f}</li>)}
      </ul>
      {plan.terms?.length > 0 && <div className="pt-2 mb-3" style={{ borderTop: '1px solid var(--scs-border)' }}>{plan.terms.map((t, i) => <p key={`t-${plan.id}-${i}`} className="text-[10px] leading-relaxed" style={{ color: 'var(--scs-text-light)' }}>{t}</p>)}</div>}
      <a href={plan.direct === 'call' ? GYM_CONFIG.phoneHref : '#book-a-tour'} data-testid={`join-${plan.id}`}
        className={`w-full py-3 text-sm text-center block font-semibold transition-colors duration-180 ${pop ? 'btn-clay' : 'btn-primary'}`}>{plan.direct === 'call' ? `Call ${GYM_CONFIG.phone}` : 'Book a tour'}</a>
    </div>
  );
}

function MobileCarousel({ children }) {
  const ref = useRef(null);
  const [active, setActive] = useState(1);
  const count = React.Children.count(children);
  const updateActive = useCallback(() => { const el = ref.current; if (!el) return; setActive(Math.round(el.scrollLeft / (el.scrollWidth / count))); }, [count]);
  useEffect(() => { const el = ref.current; if (!el) return; const t = setTimeout(() => { el.scrollLeft = (el.scrollWidth / count) * 1; setActive(1); }, 100); el.addEventListener('scroll', updateActive, { passive: true }); return () => { clearTimeout(t); el.removeEventListener('scroll', updateActive); }; }, [count, updateActive]);
  const scrollTo = (i) => { const el = ref.current; if (el) el.scrollTo({ left: (el.scrollWidth / count) * i, behavior: 'smooth' }); };
  return (
    <div className="relative">
      {active > 0 && <button onClick={() => scrollTo(active - 1)} aria-label="Previous" className="absolute left-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center shadow" style={{ background: 'var(--scs-warm-white)', color: 'var(--scs-charcoal)', borderRadius: 'var(--scs-radius)' }}><ChevronLeft size={18} /></button>}
      {active < count - 1 && <button onClick={() => scrollTo(active + 1)} aria-label="Next" className="absolute right-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center shadow" style={{ background: 'var(--scs-warm-white)', color: 'var(--scs-charcoal)', borderRadius: 'var(--scs-radius)' }}><ChevronRight size={18} /></button>}
      <div ref={ref} className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth px-4 pb-4 -mx-4" style={{ scrollbarWidth: 'none' }}>
        {React.Children.map(children, (child, i) => <div key={`mc-${i}`} className="snap-center shrink-0" style={{ width: '85vw', maxWidth: '340px' }}>{child}</div>)}
      </div>
      <div className="flex justify-center gap-2 mt-3">
        {Array.from({ length: count }).map((_, i) => <button key={`d-${i}`} onClick={() => scrollTo(i)} aria-label={`Plan ${i+1}`} className={`transition-all duration-200 ${i === active ? 'w-5 h-1' : 'w-1.5 h-1 opacity-40'}`} style={{ background: i === active ? 'var(--scs-charcoal)' : 'var(--scs-stone)', borderRadius: '1px' }} />)}
      </div>
    </div>
  );
}

export default function Join() {
  const [showMore, setShowMore] = useState(false);
  const [showFaq, setShowFaq] = useState(null);
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const faqs = [
    { q: 'What is the $50 Annual Enhancement Fee?', a: 'A $50 fee applied once per year to all memberships. It supports equipment maintenance and facility upkeep.' },
    { q: 'How do cancellations work?', a: 'All memberships require 30-day cancellation notice. Commitment terms cannot be canceled early. After the term, they auto-renew month-to-month.' },
    { q: 'Can I freeze my membership?', a: 'Yes. Talk to staff about temporary hold options.' },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--scs-bg)' }}>
      <Navbar />
      <section className="pt-24 pb-6 sm:pt-28 sm:pb-8" style={{ background: 'var(--scs-chalk)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] mb-3" style={{ color: 'var(--scs-stone)' }}>Membership</p>
          <h1 className="font-display text-3xl sm:text-4xl mb-2" style={{ color: 'var(--scs-charcoal)' }}>What Membership Costs</h1>
          <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--scs-text-muted)' }}>Every plan includes full equipment access. Longer commitments cost less per month. Book a visit and a coach will set you up.</p>
        </div>
      </section>

      <section className="pb-8">
        <div className="hidden md:block max-w-5xl mx-auto px-4 sm:px-6 mt-8">
          <div className="grid grid-cols-3 gap-5 items-stretch">{PRIMARY_PLANS.map(p => <PlanCard key={p.id} plan={p} />)}</div>
        </div>
        <div className="md:hidden mt-6"><MobileCarousel>{PRIMARY_PLANS.map(p => <PlanCard key={p.id} plan={p} />)}</MobileCarousel></div>
      </section>

      <section className="pb-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <button onClick={() => setShowMore(!showMore)} data-testid="show-more-plans"
            className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold border-2 border-dashed transition-colors duration-180"
            style={{ color: 'var(--scs-charcoal)', borderColor: 'var(--scs-border)', borderRadius: 'var(--scs-radius)' }}>
            {showMore ? 'Hide plans' : 'See more plans'} {showMore ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showMore && (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {MORE_PLANS.map(p => (
                <div key={p.id} className="p-4 flex flex-col h-full" style={{ background: 'var(--scs-warm-white)', border: '1px solid var(--scs-border)', borderRadius: 'var(--scs-radius)' }} data-testid={`plan-${p.id}`}>
                  <div className="flex justify-between mb-1"><h4 className="font-display-medium text-sm" style={{ color: 'var(--scs-charcoal)' }}>{p.name}</h4><span className="text-sm font-semibold" style={{ color: 'var(--scs-clay)' }}>{p.price}{p.per}</span></div>
                  <p className="text-xs mb-2" style={{ color: 'var(--scs-text-muted)' }}>{p.subtitle}</p>
                  {p.extra && <p className="text-xs font-semibold mb-1" style={{ color: 'var(--scs-charcoal)' }}>{p.extra}</p>}
                  {p.savings && <span className="text-[10px] font-semibold uppercase px-2 py-0.5 inline-block mb-2 self-start" style={{ background: 'var(--scs-clay)', color: 'white', borderRadius: 'var(--scs-radius)' }}>{p.savings}</span>}
                  <p className="text-[10px] mb-auto" style={{ color: 'var(--scs-text-light)' }}>{p.terms?.[0]}</p>
                  <a href="#book-a-tour" data-testid={`join-${p.id}`} className="btn-primary w-full text-center text-sm py-2.5 mt-3 block">Book a tour</a>
                </div>
              ))}
              <p className="sm:col-span-2 lg:col-span-3 text-[10px] text-center mt-1" style={{ color: 'var(--scs-text-light)' }}>All memberships: $50 Annual Enhancement Fee. 30-day cancellation notice required.</p>
            </div>
          )}
        </div>
      </section>

      <section className="py-12" style={{ background: 'var(--scs-chalk)', borderTop: '1px solid var(--scs-border)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="font-display text-lg mb-5 text-center" style={{ color: 'var(--scs-charcoal)' }}>Membership FAQ</h2>
          <div className="space-y-2">
            {faqs.map((f, i) => (
              <div key={`faq-${i}`} className="overflow-hidden" style={{ border: '1px solid var(--scs-border)', background: 'var(--scs-warm-white)', borderRadius: 'var(--scs-radius)' }}>
                <button onClick={() => setShowFaq(showFaq === i ? null : i)} className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium" style={{ color: 'var(--scs-charcoal)' }} data-testid={`faq-toggle-${i}`}>
                  {f.q} {showFaq === i ? <ChevronUp size={16} className="shrink-0 ml-2" /> : <ChevronDown size={16} className="shrink-0 ml-2" />}
                </button>
                {showFaq === i && <div className="px-5 pb-4 text-sm leading-relaxed" style={{ color: 'var(--scs-text-muted)', borderTop: '1px solid var(--scs-border)' }}>{f.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="book-a-tour" className="py-14" style={{ background: 'var(--scs-bg)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-6">
            <h2 className="font-display text-lg mb-2" style={{ color: 'var(--scs-charcoal)' }}>Start With a Visit</h2>
            <p className="text-sm" style={{ color: 'var(--scs-text-muted)' }}>See the space, ask your questions, and set up your membership with a coach in person.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8" data-testid="how-joining-works">
            {[
              { n: '1', h: 'Tell us about you', b: 'Answer a few questions below. It takes about a minute.' },
              { n: '2', h: 'We reach out', b: 'A coach contacts you to agree a time that works.' },
              { n: '3', h: 'Visit and join', b: 'Walk the space, then set up the plan that fits. We handle the paperwork.' },
            ].map(s => (
              <div key={s.n} className="p-4" style={{ background: 'var(--scs-warm-white)', border: '1px solid var(--scs-border)', borderRadius: 'var(--scs-radius)' }} data-testid={`joining-step-${s.n}`}>
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--scs-clay)' }}>Step {s.n}</span>
                <h3 className="font-display-medium text-sm mt-1 mb-1" style={{ color: 'var(--scs-charcoal)' }}>{s.h}</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--scs-text-muted)' }}>{s.b}</p>
              </div>
            ))}
          </div>

          <QuizForm source="membership_page" noAutoFocus />
        </div>
      </section>
      <Footer />
    </div>
  );
}
