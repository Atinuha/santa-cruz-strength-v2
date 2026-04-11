import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import QuizForm from '../components/QuizForm';
import { ArrowRight, CheckCircle2, Clock, Users, Zap, Calendar, Star, CreditCard, ChevronDown, ChevronUp } from 'lucide-react';

const PLANS = {
  daypass: {
    name: 'Day Pass',
    price: '$20',
    per: 'one-time',
    tag: 'Try Us Out',
    tagColor: 'bg-amber-500/15 text-amber-600 border-amber-500/25',
    features: [
      'Valid for same-day use only',
      'Access limited to staffed hours (9am-9pm)',
    ],
    link: 'https://onlinejoin.abcfitness.com/signup/plan?club=31691&planId=50837530f58641c38108fea62255030b',
    icon: <Clock size={20} />,
  },
  flex: {
    name: 'Flex Huscler',
    subtitle: 'Month-to-Month, No Commitment',
    price: '$120',
    per: '/mo',
    tag: 'No Commitment',
    tagColor: 'bg-blue-500/12 text-blue-600 border-blue-500/20',
    features: [
      '24/7 facility access via app',
      'Bills monthly until canceled',
      'Requires 30-day cancellation notice',
    ],
    link: 'https://onlinejoin.abcfitness.com/signup/plan?club=31691&planId=a772569e9c38408c90fab7b9bda49fca',
    icon: <Zap size={20} />,
  },
  huscler: {
    name: 'Huscler',
    subtitle: 'Commitment Membership',
    icon: <Star size={20} />,
    options: [
      {
        term: '12 Month',
        price: '$75',
        per: '/mo',
        savings: 'Save 38%',
        compareText: 'vs. $120/mo no commitment',
        popular: true,
        link: 'https://onlinejoin.abcfitness.com/signup/plan?club=31691&planId=823263ef0c354fd29bade28c18f280f2',
      },
      {
        term: '6 Month',
        price: '$82',
        per: '/mo',
        savings: 'Save 32%',
        compareText: 'vs. $120/mo no commitment',
        link: '#', // placeholder
        placeholder: true,
      },
    ],
    features: [
      '24/7 facility access via app',
      'Initial agreement term required',
      'Renews to month-to-month at end of term',
      'Requires 30-day cancellation notice',
    ],
  },
  couples: {
    name: 'Couples',
    subtitle: '2 Members, 1 Price',
    icon: <Users size={20} />,
    options: [
      {
        term: '12 Month',
        price: '$120',
        per: '/mo',
        perPerson: '$60/person',
        savings: 'Best Value',
        compareText: 'for 2 people',
        link: 'https://onlinejoin.abcfitness.com/signup/plan?club=31691&planId=fdf12470797b47a1a6ac3c11c764d46e',
      },
      {
        term: '6 Month',
        price: '$136',
        per: '/mo',
        perPerson: '$68/person',
        compareText: 'for 2 people',
        link: '#', // placeholder
        placeholder: true,
      },
    ],
    features: [
      'Includes 2 members',
      '24/7 facility access via app',
      'Initial agreement term required',
      'Renews to month-to-month at end of term',
      'Requires 30-day cancellation notice',
    ],
  },
  weekend: {
    name: 'Weekend Warrior',
    subtitle: 'Friday-Sunday Access',
    icon: <Calendar size={20} />,
    options: [
      {
        term: '12 Month',
        price: '$45',
        per: '/mo',
        savings: 'Save 63%',
        compareText: 'vs. $120/mo full access',
        link: 'https://onlinejoin.abcfitness.com/signup/plan?club=31691&planId=11b156f6da6e43289a145de648034aa9',
      },
      {
        term: '6 Month',
        price: '$55',
        per: '/mo',
        savings: 'Save 54%',
        compareText: 'vs. $120/mo full access',
        link: '#', // placeholder
        placeholder: true,
      },
    ],
    features: [
      'Access limited to Friday-Sunday',
      'Initial agreement term required',
      'Renews to month-to-month at end of term',
      'Requires 30-day cancellation notice',
    ],
  },
  annual: {
    name: 'Annual Huscler',
    subtitle: 'Paid in Full - Get 1 Month Free',
    price: '$900',
    per: '/year',
    tag: '13 Months',
    tagColor: 'bg-[var(--clr-green)]/12 text-[var(--clr-green)] border-[var(--clr-green)]/20',
    monthlyEquiv: '$69/mo effective',
    savings: 'Save 42%',
    features: [
      '24/7 facility access via app',
      'Paid in full membership',
      'Includes 1 free month (13 months total)',
      'Renews to month-to-month at end of term',
      'Requires 30-day cancellation notice',
    ],
    link: 'https://onlinejoin.abcfitness.com/signup/plan?club=31691&planId=7a1dd8cec5cd4f30af82429e4f5957c5',
    icon: <CreditCard size={20} />,
  },
};

function SavingsBadge({ text }) {
  return (
    <span className="inline-flex items-center text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
      style={{ background: 'var(--clr-coral)', color: '#fff' }}>
      {text}
    </span>
  );
}

function PopularBadge() {
  return (
    <span className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 text-[11px] font-bold uppercase tracking-wider px-4 py-1 rounded-full"
      style={{ background: 'var(--clr-green)', color: '#fff', letterSpacing: '0.08em' }}>
      Most Popular
    </span>
  );
}

/* ── Simple single-price card (Day Pass, Flex, Annual) ─────────────── */
function SimpleCard({ plan }) {
  return (
    <div className="relative card-light rounded-[var(--radius-xl)] p-6 flex flex-col h-full" data-testid={`plan-${plan.name.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--clr-bg-green)', color: 'var(--clr-green)' }}>
          {plan.icon}
        </div>
        <div>
          <h3 className="font-display text-lg tracking-wide" style={{ color: 'var(--clr-charcoal)' }}>{plan.name}</h3>
          {plan.subtitle && <p className="text-[var(--clr-text-muted)] text-xs">{plan.subtitle}</p>}
        </div>
      </div>
      {plan.tag && (
        <span className={`self-start text-[11px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full border mb-3 ${plan.tagColor}`}>
          {plan.tag}
        </span>
      )}
      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-3xl font-bold" style={{ color: 'var(--clr-charcoal)' }}>{plan.price}</span>
        <span className="text-sm text-[var(--clr-text-muted)]">{plan.per}</span>
      </div>
      {plan.monthlyEquiv && <p className="text-sm font-semibold" style={{ color: 'var(--clr-green)' }}>{plan.monthlyEquiv}</p>}
      {plan.savings && <div className="mt-1 mb-2"><SavingsBadge text={plan.savings} /></div>}
      <ul className="space-y-2 mt-4 mb-6 flex-1">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px] text-[var(--clr-text)]">
            <CheckCircle2 size={14} style={{ color: 'var(--clr-green)', marginTop: 2 }} className="shrink-0" />
            {f}
          </li>
        ))}
      </ul>
      <a href={plan.link} target="_blank" rel="noopener noreferrer"
        data-testid={`join-${plan.name.toLowerCase().replace(/\s/g, '-')}`}
        className="btn-primary w-full py-3 text-sm text-center block">
        Get Started <ArrowRight size={14} />
      </a>
    </div>
  );
}

/* ── Multi-option card (Huscler, Couples, Weekend) ─────────────────── */
function MultiCard({ plan }) {
  const [selected, setSelected] = useState(0);
  const opt = plan.options[selected];
  const popular = plan.options.some(o => o.popular);

  return (
    <div className={`relative rounded-[var(--radius-xl)] p-6 flex flex-col h-full ${popular ? 'ring-2' : 'card-light'}`}
      style={popular ? { background: '#fff', borderColor: 'var(--clr-green)', ringColor: 'var(--clr-green)', boxShadow: '0 0 0 2px var(--clr-green), var(--shadow-lg)' } : {}}
      data-testid={`plan-${plan.name.toLowerCase().replace(/\s/g, '-')}`}>
      {popular && <PopularBadge />}

      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--clr-bg-green)', color: 'var(--clr-green)' }}>
          {plan.icon}
        </div>
        <div>
          <h3 className="font-display text-lg tracking-wide" style={{ color: 'var(--clr-charcoal)' }}>{plan.name}</h3>
          {plan.subtitle && <p className="text-[var(--clr-text-muted)] text-xs">{plan.subtitle}</p>}
        </div>
      </div>

      {/* Term toggle */}
      <div className="flex gap-2 mb-4">
        {plan.options.map((o, i) => (
          <button key={i} onClick={() => setSelected(i)}
            className={`flex-1 text-xs font-bold py-2 px-3 rounded-lg border transition-all duration-200 ${
              selected === i
                ? 'text-white border-transparent'
                : 'text-[var(--clr-text-muted)] border-[var(--clr-border)] hover:border-[var(--clr-green)]/40'
            }`}
            style={selected === i ? { background: 'var(--clr-green)' } : {}}
            data-testid={`term-toggle-${plan.name.toLowerCase().replace(/\s/g, '-')}-${o.term.toLowerCase().replace(/\s/g, '-')}`}>
            {o.term}
          </button>
        ))}
      </div>

      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-3xl font-bold" style={{ color: 'var(--clr-charcoal)' }}>{opt.price}</span>
        <span className="text-sm text-[var(--clr-text-muted)]">{opt.per}</span>
      </div>
      {opt.perPerson && <p className="text-sm font-semibold" style={{ color: 'var(--clr-green)' }}>{opt.perPerson}</p>}
      <div className="flex items-center gap-2 mt-1 mb-2">
        {opt.savings && <SavingsBadge text={opt.savings} />}
        {opt.compareText && <span className="text-xs text-[var(--clr-text-light)]">{opt.compareText}</span>}
      </div>

      <ul className="space-y-2 mt-3 mb-6 flex-1">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px] text-[var(--clr-text)]">
            <CheckCircle2 size={14} style={{ color: 'var(--clr-green)', marginTop: 2 }} className="shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      {opt.placeholder ? (
        <button disabled className="w-full py-3 text-sm text-center rounded-[var(--radius-md)] bg-gray-100 text-gray-400 font-semibold cursor-not-allowed">
          Coming Soon
        </button>
      ) : (
        <a href={opt.link} target="_blank" rel="noopener noreferrer"
          data-testid={`join-${plan.name.toLowerCase().replace(/\s/g, '-')}-${opt.term.toLowerCase().replace(/\s/g, '-')}`}
          className={popular && selected === 0 ? 'btn-coral w-full py-3 text-sm text-center block' : 'btn-primary w-full py-3 text-sm text-center block'}>
          Join Now <ArrowRight size={14} />
        </a>
      )}
    </div>
  );
}

export default function Join() {
  const [showFaq, setShowFaq] = useState(null);

  const faqs = [
    { q: 'What does 24/7 access mean?', a: 'Members get 24/7 access to the facility via our mobile app. Day pass holders are limited to staffed hours (9am-9pm).' },
    { q: 'What is the Annual Enhancement Fee?', a: 'A $50 Annual Enhancement Fee applies to all memberships. This helps us maintain and upgrade equipment, facilities, and member experience.' },
    { q: 'How do cancellations work?', a: 'All memberships require a 30-day cancellation notice. Commitment memberships (6mo/12mo) cannot be canceled before the initial term ends. After the term, they renew to month-to-month and can be canceled with 30-day notice.' },
    { q: 'Can I freeze my membership?', a: 'Yes. Talk to staff about freeze options if you need a temporary hold on your membership.' },
    { q: 'What happens after my commitment term ends?', a: 'All commitment memberships automatically renew to an open month-to-month membership at the end of the initial term. You can then cancel anytime with 30-day notice.' },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--clr-bg)' }}>
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-12 sm:pb-16" style={{ background: 'var(--clr-bg)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <span className="green-accent-line mx-auto" />
          <p className="text-[var(--clr-green)] text-xs font-bold uppercase tracking-widest mb-3">Memberships</p>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-wide mb-4" style={{ color: 'var(--clr-charcoal)' }}>
            FIND YOUR FIT
          </h1>
          <p className="text-[var(--clr-text)] text-base max-w-2xl mx-auto">
            From day passes to annual commitments. The longer you commit, the more you save.
            <span className="block mt-1 font-semibold" style={{ color: 'var(--clr-coral)' }}>Save up to 42% with an annual membership.</span>
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-16 sm:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">

          {/* Row 1: Day Pass + Flex + Huscler */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <SimpleCard plan={PLANS.daypass} />
            <SimpleCard plan={PLANS.flex} />
            <MultiCard plan={PLANS.huscler} />
          </div>

          {/* Row 2: Couples + Weekend + Annual */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MultiCard plan={PLANS.couples} />
            <MultiCard plan={PLANS.weekend} />
            <SimpleCard plan={PLANS.annual} />
          </div>
        </div>
      </section>

      {/* Comparison highlight */}
      <section className="py-12 border-y" style={{ borderColor: 'var(--clr-border)', background: 'var(--clr-bg-green)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-2xl tracking-wide mb-6" style={{ color: 'var(--clr-charcoal)' }}>WHY COMMIT?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-5 rounded-xl bg-white" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <p className="text-sm text-[var(--clr-text-muted)] mb-1">No Commitment</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--clr-charcoal)' }}>$120<span className="text-sm font-normal text-[var(--clr-text-muted)]">/mo</span></p>
            </div>
            <div className="p-5 rounded-xl bg-white border-2" style={{ borderColor: 'var(--clr-green)', boxShadow: 'var(--shadow-md)' }}>
              <p className="text-sm font-bold mb-1" style={{ color: 'var(--clr-green)' }}>12 Month Commitment</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--clr-charcoal)' }}>$75<span className="text-sm font-normal text-[var(--clr-text-muted)]">/mo</span></p>
              <p className="text-xs font-bold mt-1" style={{ color: 'var(--clr-coral)' }}>Save $540/year</p>
            </div>
            <div className="p-5 rounded-xl bg-white" style={{ boxShadow: 'var(--shadow-sm)' }}>
              <p className="text-sm text-[var(--clr-text-muted)] mb-1">Annual (Paid in Full)</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--clr-charcoal)' }}>~$69<span className="text-sm font-normal text-[var(--clr-text-muted)]">/mo</span></p>
              <p className="text-xs font-bold mt-1" style={{ color: 'var(--clr-coral)' }}>Save $540+ plus 1 free month</p>
            </div>
          </div>
          <p className="text-xs text-[var(--clr-text-light)] mt-4">$50 Annual Enhancement Fee applies to all memberships</p>
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
                  {showFaq === i ? <ChevronUp size={16} className="text-[var(--clr-text-muted)]" /> : <ChevronDown size={16} className="text-[var(--clr-text-muted)]" />}
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
