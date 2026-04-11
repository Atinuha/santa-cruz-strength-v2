import React, { useState, useRef, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import QuizForm from '../components/QuizForm';
import { ArrowRight, CheckCircle2, Clock, Users, Zap, Calendar, Star, CreditCard, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';

/* ── Plan Data ─────────────────────────────────────────────────────── */

const PRIMARY_PLANS = [
  {
    id: 'daypass',
    name: 'Day Pass',
    price: '$20',
    per: '',
    highlight: false,
    tag: 'Try Us Out',
    tagColor: 'bg-amber-500/15 text-amber-700 border-amber-500/25',
    icon: <Clock size={20} />,
    features: [
      'Valid for same-day use only',
      'Access during staffed hours (9am-9pm)',
    ],
    terms: [],
    link: 'https://onlinejoin.abcfitness.com/signup/plan?club=31691&planId=50837530f58641c38108fea62255030b',
    cta: 'Get a Day Pass',
  },
  {
    id: 'huscler-12',
    name: 'Huscler',
    subtitle: '12-Month Membership',
    price: '$75',
    per: '/mo',
    highlight: true,
    tag: 'Most Popular',
    tagColor: '',
    icon: <Star size={20} />,
    savings: 'Save 38%',
    compareText: 'vs. $120/mo month-to-month',
    features: [
      '24/7 facility access via app',
      'Unlimited open gym',
      'Competition-grade equipment',
    ],
    terms: [
      '12-month initial agreement',
      'Auto-renews to month-to-month at end of term',
      '30-day cancellation notice required',
      '$50 Annual Enhancement Fee',
    ],
    link: 'https://onlinejoin.abcfitness.com/signup/plan?club=31691&planId=823263ef0c354fd29bade28c18f280f2',
    cta: 'Join Now',
  },
  {
    id: 'annual',
    name: 'Annual Huscler',
    subtitle: 'Paid-in-Full \u2022 Get 1 Month FREE',
    price: '$825',
    per: ' one-time',
    highlight: false,
    tag: 'Best Value',
    tagColor: 'bg-[var(--clr-green)]/10 text-[var(--clr-green)] border-[var(--clr-green)]/20',
    icon: <CreditCard size={20} />,
    savings: 'Save 47%',
    monthlyEquiv: '$63/mo effective',
    features: [
      '24/7 facility access via app',
      '13 months total (1 month FREE)',
      'Auto-renews at end of term',
      'Unlimited open gym',
    ],
    terms: [
      'Paid in full at signup',
      'Auto-renews to month-to-month at end of term',
      '30-day cancellation notice required',
      '$50 Annual Enhancement Fee',
    ],
    link: 'https://onlinejoin.abcfitness.com/signup/plan?club=31691&planId=7a1dd8cec5cd4f30af82429e4f5957c5',
    cta: 'Get 13 Months',
  },
];

const MORE_PLANS = [
  {
    id: 'flex',
    name: 'Flex Huscler',
    subtitle: 'Month-to-Month \u2022 No Commitment',
    price: '$120',
    per: '/mo',
    icon: <Zap size={18} />,
    features: [
      '24/7 facility access via app',
      'No agreement required',
    ],
    terms: [
      'Billed monthly until canceled',
      '30-day cancellation notice required',
      '$50 Annual Enhancement Fee',
    ],
    link: 'https://onlinejoin.abcfitness.com/signup/plan?club=31691&planId=a772569e9c38408c90fab7b9bda49fca',
  },
  {
    id: 'huscler-6',
    name: 'Huscler 6-Month',
    subtitle: '6-Month Agreement',
    price: '$82',
    per: '/mo',
    savings: 'Save 32%',
    icon: <Star size={18} />,
    features: [
      '24/7 facility access via app',
    ],
    terms: [
      '6-month initial agreement',
      'Auto-renews to month-to-month at end of term',
      '30-day cancellation notice required',
      '$50 Annual Enhancement Fee',
    ],
    link: '#',
    placeholder: true,
  },
  {
    id: 'couples-12',
    name: 'Couples 12-Month',
    subtitle: '2 Members \u2022 12-Month Agreement',
    price: '$120',
    per: '/mo',
    extra: '$60/person',
    savings: 'Save 50%',
    icon: <Users size={18} />,
    features: [
      'Includes 2 members',
      '24/7 facility access via app',
    ],
    terms: [
      '12-month initial agreement',
      'Auto-renews to month-to-month at end of term',
      '30-day cancellation notice required',
      '$50 Annual Enhancement Fee',
    ],
    link: 'https://onlinejoin.abcfitness.com/signup/plan?club=31691&planId=fdf12470797b47a1a6ac3c11c764d46e',
  },
  {
    id: 'couples-6',
    name: 'Couples 6-Month',
    subtitle: '2 Members \u2022 6-Month Agreement',
    price: '$136',
    per: '/mo',
    extra: '$68/person',
    icon: <Users size={18} />,
    features: [
      'Includes 2 members',
      '24/7 facility access via app',
    ],
    terms: [
      '6-month initial agreement',
      'Auto-renews to month-to-month at end of term',
      '30-day cancellation notice required',
      '$50 Annual Enhancement Fee',
    ],
    link: '#',
    placeholder: true,
  },
  {
    id: 'weekend-12',
    name: 'Weekend Warrior 12-Month',
    subtitle: 'Friday\u2013Sunday Access Only',
    price: '$45',
    per: '/mo',
    savings: 'Save 63%',
    icon: <Calendar size={18} />,
    features: [
      'Access limited to Friday\u2013Sunday',
    ],
    terms: [
      '12-month initial agreement',
      'Auto-renews to month-to-month at end of term',
      '30-day cancellation notice required',
      '$50 Annual Enhancement Fee',
    ],
    link: 'https://onlinejoin.abcfitness.com/signup/plan?club=31691&planId=11b156f6da6e43289a145de648034aa9',
  },
  {
    id: 'weekend-6',
    name: 'Weekend Warrior 6-Month',
    subtitle: 'Friday\u2013Sunday Access Only',
    price: '$55',
    per: '/mo',
    savings: 'Save 54%',
    icon: <Calendar size={18} />,
    features: [
      'Access limited to Friday\u2013Sunday',
    ],
    terms: [
      '6-month initial agreement',
      'Auto-renews to month-to-month at end of term',
      '30-day cancellation notice required',
      '$50 Annual Enhancement Fee',
    ],
    link: '#',
    placeholder: true,
  },
];

/* ── Components ────────────────────────────────────────────────────── */

function SavingsBadge({ text }) {
  return (
    <span className="inline-flex items-center text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full"
      style={{ background: 'var(--clr-coral)', color: '#fff' }}>
      {text}
    </span>
  );
}

function PrimaryCard({ plan }) {
  const isPopular = plan.highlight;

  return (
    <div className={`relative rounded-[var(--radius-xl)] flex flex-col h-full transition-all duration-300 ${
      isPopular
        ? 'p-7 bg-white scale-[1.02] z-10'
        : 'p-6 card-light'
    }`}
      style={isPopular ? { boxShadow: '0 0 0 2.5px var(--clr-green), 0 20px 60px rgba(13,93,62,0.15)' } : {}}
      data-testid={`plan-${plan.id}`}>

      {isPopular && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 text-[11px] font-bold uppercase tracking-wider px-5 py-1.5 rounded-full"
          style={{ background: 'var(--clr-green)', color: '#fff', letterSpacing: '0.08em' }}>
          Most Popular
        </span>
      )}

      {!isPopular && plan.tag && (
        <span className={`self-start text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border mb-3 ${plan.tagColor}`}>
          {plan.tag}
        </span>
      )}

      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--clr-bg-green)', color: 'var(--clr-green)' }}>
          {plan.icon}
        </div>
        <div>
          <h3 className="font-display text-xl tracking-wide" style={{ color: 'var(--clr-charcoal)' }}>{plan.name}</h3>
          {plan.subtitle && <p className="text-[var(--clr-text-muted)] text-xs">{plan.subtitle}</p>}
        </div>
      </div>

      <div className="flex items-baseline gap-1 mb-1">
        <span className={`font-bold ${isPopular ? 'text-4xl' : 'text-3xl'}`} style={{ color: 'var(--clr-charcoal)' }}>{plan.price}</span>
        <span className="text-sm text-[var(--clr-text-muted)]">{plan.per}</span>
      </div>

      {plan.monthlyEquiv && <p className="text-sm font-bold" style={{ color: 'var(--clr-green)' }}>{plan.monthlyEquiv}</p>}

      <div className="flex flex-wrap items-center gap-2 mt-1.5 mb-4">
        {plan.savings && <SavingsBadge text={plan.savings} />}
        {plan.compareText && <span className="text-xs text-[var(--clr-text-light)]">{plan.compareText}</span>}
      </div>

      <ul className="space-y-2.5 mb-4 flex-1">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[13px] font-medium text-[var(--clr-text)]">
            <CheckCircle2 size={15} style={{ color: 'var(--clr-green)', marginTop: 1 }} className="shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      {plan.terms && plan.terms.length > 0 && (
        <div className="border-t pt-3 mb-5" style={{ borderColor: 'var(--clr-border)' }}>
          {plan.terms.map((t, i) => (
            <p key={i} className="text-[11px] text-[var(--clr-text-light)] leading-relaxed">{t}</p>
          ))}
        </div>
      )}

      <a href={plan.link} target="_blank" rel="noopener noreferrer"
        data-testid={`join-${plan.id}`}
        className={`w-full py-3.5 text-sm text-center block font-bold rounded-[var(--radius-md)] transition-all duration-200 ${
          isPopular
            ? 'btn-coral'
            : 'btn-primary'
        }`}>
        {plan.cta} <ArrowRight size={14} className="inline ml-1" />
      </a>
    </div>
  );
}

function MorePlanRow({ plan }) {
  return (
    <div className="flex items-center justify-between py-4 border-b last:border-b-0" style={{ borderColor: 'var(--clr-border)' }}
      data-testid={`plan-${plan.id}`}>
      <div className="flex items-center gap-3 flex-1">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--clr-bg-green)', color: 'var(--clr-green)' }}>
          {plan.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-display text-sm tracking-wide" style={{ color: 'var(--clr-charcoal)' }}>{plan.name}</h4>
            {plan.savings && (
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                style={{ background: 'var(--clr-coral)', color: '#fff' }}>{plan.savings}</span>
            )}
          </div>
          <p className="text-xs text-[var(--clr-text-muted)] truncate">{plan.subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0 ml-4">
        <div className="text-right">
          <span className="text-lg font-bold" style={{ color: 'var(--clr-charcoal)' }}>{plan.price}</span>
          <span className="text-xs text-[var(--clr-text-muted)]">{plan.per}</span>
          {plan.extra && <p className="text-xs font-semibold" style={{ color: 'var(--clr-green)' }}>{plan.extra}</p>}
        </div>
        {plan.placeholder ? (
          <span className="text-xs font-semibold text-gray-400 px-4 py-2 rounded-lg bg-gray-100">Coming Soon</span>
        ) : (
          <a href={plan.link} target="_blank" rel="noopener noreferrer"
            data-testid={`join-${plan.id}`}
            className="btn-primary px-5 py-2 text-xs whitespace-nowrap">
            Join <ArrowRight size={12} className="inline ml-1" />
          </a>
        )}
      </div>
    </div>
  );
}

/* ── Mobile Carousel ───────────────────────────────────────────────── */

function MobileCarousel({ children }) {
  const scrollRef = useRef(null);
  const [active, setActive] = useState(1); // Start on "Most Popular" (index 1)
  const count = React.Children.count(children);

  const updateActive = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.scrollWidth / count;
    const idx = Math.round(el.scrollLeft / cardWidth);
    setActive(idx);
  }, [count]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Scroll to "Most Popular" (index 1) on mount with slight delay for layout
    const timer = setTimeout(() => {
      const cardWidth = el.scrollWidth / count;
      el.scrollLeft = cardWidth * 1;
      setActive(1);
    }, 100);
    el.addEventListener('scroll', updateActive, { passive: true });
    return () => {
      clearTimeout(timer);
      el.removeEventListener('scroll', updateActive);
    };
  }, [count, updateActive]);

  const scrollTo = (idx) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.scrollWidth / count;
    el.scrollTo({ left: cardWidth * idx, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      {/* Swipe hint arrows */}
      {active > 0 && (
        <button onClick={() => scrollTo(active - 1)}
          className="absolute left-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-md"
          style={{ color: 'var(--clr-charcoal)' }}>
          <ChevronLeft size={18} />
        </button>
      )}
      {active < count - 1 && (
        <button onClick={() => scrollTo(active + 1)}
          className="absolute right-1 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-md"
          style={{ color: 'var(--clr-charcoal)' }}>
          <ChevronRight size={18} />
        </button>
      )}

      <div ref={scrollRef}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth px-4 pb-4 -mx-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
        {React.Children.map(children, (child, i) => (
          <div key={i} className="snap-center shrink-0" style={{ width: '85vw', maxWidth: '340px' }}>
            {child}
          </div>
        ))}
      </div>

      {/* Dots + swipe hint */}
      <div className="flex flex-col items-center gap-2 mt-3">
        <div className="flex gap-2">
          {Array.from({ length: count }).map((_, i) => (
            <button key={i} onClick={() => scrollTo(i)}
              className={`rounded-full transition-all duration-300 ${
                i === active ? 'w-6 h-2' : 'w-2 h-2 opacity-40'
              }`}
              style={{ background: i === active ? 'var(--clr-green)' : 'var(--clr-charcoal)' }} />
          ))}
        </div>
        <p className="text-[11px] text-[var(--clr-text-light)] animate-pulse">Swipe to compare plans</p>
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────── */

export default function Join() {
  const [showMore, setShowMore] = useState(false);
  const [showFaq, setShowFaq] = useState(null);

  const faqs = [
    { q: 'What does 24/7 access mean?', a: 'Members get 24/7 access to the facility via our mobile app. Day pass holders are limited to staffed hours (9am-9pm).' },
    { q: 'What is the $50 Annual Enhancement Fee?', a: 'A $50 Annual Enhancement Fee applies to all memberships once per year. This helps us maintain and upgrade equipment, facilities, and member experience.' },
    { q: 'How do cancellations work?', a: 'All memberships require a 30-day cancellation notice prior to your last billing date. Commitment memberships (6mo/12mo) cannot be canceled before the initial term ends. After the term, they auto-renew to month-to-month and can be canceled with 30-day notice.' },
    { q: 'What happens after my commitment term ends?', a: 'All commitment memberships (6-month, 12-month, and annual paid-in-full) automatically renew to an open month-to-month membership at the end of the initial term. You can then cancel anytime with 30-day notice.' },
    { q: 'Can I freeze my membership?', a: 'Yes. Talk to staff about freeze options if you need a temporary hold on your membership.' },
    { q: 'Is the Flex Huscler really no commitment?', a: 'Yes. The Flex Huscler is billed monthly with no agreement. It will continue to bill each month until you cancel with a 30-day notice.' },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--clr-bg)' }}>
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-10 sm:pb-14" style={{ background: 'var(--clr-bg)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <span className="green-accent-line mx-auto" />
          <p className="text-[var(--clr-green)] text-xs font-bold uppercase tracking-widest mb-3">Memberships</p>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-wide mb-4" style={{ color: 'var(--clr-charcoal)' }}>
            FIND YOUR FIT
          </h1>
          <p className="text-[var(--clr-text)] text-base max-w-xl mx-auto mb-2">
            Three simple options. The longer you commit, the more you save.
          </p>
          <p className="text-sm font-bold" style={{ color: 'var(--clr-coral)' }}>
            Save up to 47% with an annual paid-in-full membership.
          </p>
        </div>
      </section>

      {/* Primary Plans — 3 cards */}
      <section className="pb-8">
        {/* Desktop: grid */}
        <div className="hidden md:block max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-3 gap-5 items-stretch">
            {PRIMARY_PLANS.map(plan => (
              <PrimaryCard key={plan.id} plan={plan} />
            ))}
          </div>
        </div>
        {/* Mobile: swipe carousel */}
        <div className="md:hidden">
          <MobileCarousel>
            {PRIMARY_PLANS.map(plan => (
              <PrimaryCard key={plan.id} plan={plan} />
            ))}
          </MobileCarousel>
        </div>
      </section>

      {/* More Options — expandable */}
      <section className="pb-14 sm:pb-18">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <button onClick={() => setShowMore(!showMore)}
            data-testid="show-more-plans"
            className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl border-2 border-dashed transition-all duration-200 hover:border-[var(--clr-green)]/50"
            style={{ color: 'var(--clr-green)', borderColor: 'var(--clr-border)' }}>
            {showMore ? 'Hide additional plans' : 'Need something different? See all plans'}
            {showMore ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showMore && (
            <div className="mt-4 rounded-[var(--radius-xl)] bg-white border px-6" style={{ borderColor: 'var(--clr-border)', boxShadow: 'var(--shadow-sm)' }}>
              {MORE_PLANS.map(plan => (
                <MorePlanRow key={plan.id} plan={plan} />
              ))}
              <div className="py-3">
                <p className="text-[11px] text-[var(--clr-text-light)]">
                  All memberships: $50 Annual Enhancement Fee applies. All cancellations require 30-day notice prior to last billing date.
                  Commitment memberships auto-renew to open month-to-month at end of initial term.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Why Commit — social proof / comparison */}
      <section className="py-12 border-y" style={{ borderColor: 'var(--clr-border)', background: 'var(--clr-bg-green)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-2xl tracking-wide mb-2" style={{ color: 'var(--clr-charcoal)' }}>WHY COMMIT?</h2>
          <p className="text-sm text-[var(--clr-text-muted)] mb-6">Same gym. Same access. Just smarter pricing.</p>
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
            <div className="p-4 rounded-xl bg-white" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <p className="text-[11px] text-[var(--clr-text-muted)] mb-1 uppercase tracking-wide font-bold">Monthly</p>
              <p className="text-xl font-bold" style={{ color: 'var(--clr-charcoal)' }}>$120</p>
              <p className="text-[11px] text-[var(--clr-text-light)]">/mo</p>
            </div>
            <div className="p-4 rounded-xl bg-white border-2 relative" style={{ borderColor: 'var(--clr-green)', boxShadow: 'var(--shadow-md)' }}>
              <p className="text-[11px] font-bold mb-1 uppercase tracking-wide" style={{ color: 'var(--clr-green)' }}>12-Month</p>
              <p className="text-xl font-bold" style={{ color: 'var(--clr-charcoal)' }}>$75</p>
              <p className="text-[11px] font-bold" style={{ color: 'var(--clr-coral)' }}>Save $540/yr</p>
            </div>
            <div className="p-4 rounded-xl bg-white" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <p className="text-[11px] text-[var(--clr-text-muted)] mb-1 uppercase tracking-wide font-bold">Annual PIF</p>
              <p className="text-xl font-bold" style={{ color: 'var(--clr-charcoal)' }}>$63</p>
              <p className="text-[11px] font-bold" style={{ color: 'var(--clr-coral)' }}>Save $684/yr</p>
            </div>
          </div>
          <p className="text-[11px] text-[var(--clr-text-light)] mt-4">$50 Annual Enhancement Fee applies to all memberships</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 sm:py-16" style={{ background: 'var(--clr-bg)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="font-display text-2xl tracking-wide mb-6 text-center" style={{ color: 'var(--clr-charcoal)' }}>MEMBERSHIP FAQ</h2>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--clr-border)', background: '#fff' }}>
                <button onClick={() => setShowFaq(showFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-semibold"
                  style={{ color: 'var(--clr-charcoal)' }}
                  data-testid={`faq-toggle-${i}`}>
                  {faq.q}
                  {showFaq === i ? <ChevronUp size={16} className="shrink-0 ml-2 text-[var(--clr-text-muted)]" /> : <ChevronDown size={16} className="shrink-0 ml-2 text-[var(--clr-text-muted)]" />}
                </button>
                {showFaq === i && (
                  <div className="px-5 pb-4 text-sm text-[var(--clr-text)] leading-relaxed border-t" style={{ borderColor: 'var(--clr-border)' }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tour CTA */}
      <section className="py-14 sm:py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <span className="green-accent-line mx-auto" />
            <h2 className="font-display text-2xl tracking-wide mb-2" style={{ color: 'var(--clr-charcoal)' }}>NOT SURE YET?</h2>
            <p className="text-sm text-[var(--clr-text)]">Book a free tour and see the gym for yourself. Zero pressure.</p>
          </div>
          <QuizForm source="membership_page" />
        </div>
      </section>

      <Footer />
    </div>
  );
}
