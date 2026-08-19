import React, { useState, useRef, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import QuizForm from '../components/QuizForm';
import BlueprintIcon from '../components/BlueprintIcon';
import { Check, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { GYM_CONFIG } from '../config';
import { photo } from '../config/media';
import { trackMembershipView } from '../utils/analytics';

// Every "Save X%" on this page is measured against one number: $120/mo, the
// Flex Huscler month-to-month rate published two cards down. That baseline is
// now printed on every card that shows a percentage, because a percentage with
// an invisible baseline is a marketing number rather than a claim, and this one
// happens to be true and can afford to show its working.
//
//   Huscler 12-month   $75/mo   1 - 75/120       = 37.5%  shown as 38%
//   Annual paid in full $825    825/13 = $63.46  = 47.1%  shown as 47%
//   Huscler 6-month    $82/mo   1 - 82/120       = 31.7%  shown as 32%
//   Couples 12-month   $60/person                = 50.0%  shown as 50%
//   Weekend Warrior 12 $45/mo   1 - 45/120       = 62.5%  shown as 63%
//   Weekend Warrior 6  $55/mo   1 - 55/120       = 54.2%  shown as 54%
//
// Couples 6-month works out to 43% and carries no badge. That is a gap, not an
// error, and it is left alone rather than filled in: nobody has confirmed the
// omission was accidental.
//
// The Weekend Warrior comparison is against full access while the plan itself
// is three days, so its card says so in as many words. A visitor reading 63%
// should not have to find that out on the tour.
const MONTH_TO_MONTH = 'vs. $120/mo month-to-month';

const PRIMARY_PLANS = [
  { id: 'daypass', name: 'Day Pass', price: '$20', per: '', highlight: false, tag: 'Try Us Out',
    features: ['Valid for same-day use', 'Staffed hours only'], terms: [],
    // A twenty dollar drop-in should not need a tour booking and a callback.
    // Call or walk in during staffed hours.
    direct: 'call', cta: 'Call to arrange', tone: 'white', icon: 'first-timer' },
  { id: 'huscler-12', name: '12-Month Membership', subtitle: 'Huscler', price: '$75', per: '/mo', highlight: true, tag: 'Most Popular',
    savings: 'Save 38%', compareText: MONTH_TO_MONTH,
    features: ['Full facility access', 'Unlimited open gym', 'All available equipment'],
    terms: ['12-month agreement', 'Auto-renews month-to-month', '30-day cancellation notice', '$50 Annual Enhancement Fee'],
    cta: 'Join Now', tone: 'mint', icon: 'rack' },
  { id: 'annual', name: 'Annual Membership, Paid in Full', subtitle: 'Huscler', price: '$825', per: ' one-time', highlight: false, tag: 'Best Value',
    savings: 'Save 47%', compareText: MONTH_TO_MONTH, monthlyEquiv: '$63/mo effective',
    features: ['Full facility access', '13 months total', 'Unlimited open gym'],
    terms: ['Paid in full at signup', 'Auto-renews month-to-month', '30-day cancellation notice', '$50 Annual Enhancement Fee'],
    cta: 'Get 13 Months', tone: 'deep', icon: 'competitor' },
];

const MORE_PLANS = [
  { id: 'flex', name: 'Month-to-Month Membership', subtitle: 'Flex Huscler', price: '$120', per: '/mo',
    features: ['Full facility access', 'No agreement required'],
    terms: ['Billed monthly', '30-day cancellation notice', '$50 Annual Enhancement Fee'] },
  { id: 'huscler-6', name: '6-Month Membership', subtitle: 'Huscler', price: '$82', per: '/mo', savings: 'Save 32%', compareText: MONTH_TO_MONTH,
    features: ['Full facility access'], terms: ['6-month agreement', 'Auto-renews month-to-month', '$50 Annual Enhancement Fee'] },
  { id: 'couples-12', name: '12-Month Couples Membership', subtitle: 'Two members', price: '$120', per: '/mo', extra: '$60/person', savings: 'Save 50%', compareText: 'per person, vs. $120/mo month-to-month',
    features: ['Includes 2 members', 'Full facility access'], terms: ['12-month agreement', '$50 Annual Enhancement Fee'] },
  { id: 'couples-6', name: '6-Month Couples Membership', subtitle: 'Two members', price: '$136', per: '/mo', extra: '$68/person',
    features: ['Includes 2 members', 'Full facility access'], terms: ['6-month agreement', '$50 Annual Enhancement Fee'] },
  { id: 'weekend-12', name: '12-Month Weekend Membership', subtitle: 'Weekend Warrior, Friday to Sunday', price: '$45', per: '/mo', savings: 'Save 63%', compareText: 'vs. $120/mo full-access month-to-month',
    features: ['Friday to Sunday access'], terms: ['12-month agreement', '$50 Annual Enhancement Fee'] },
  { id: 'weekend-6', name: '6-Month Weekend Membership', subtitle: 'Weekend Warrior, Friday to Sunday', price: '$55', per: '/mo', savings: 'Save 54%', compareText: 'vs. $120/mo full-access month-to-month',
    features: ['Friday to Sunday access'], terms: ['6-month agreement', '$50 Annual Enhancement Fee'] },
];

/* The commitment ladder, drawn.
 *
 * Three little boxes reading "save more" told a visitor nothing they
 * could act on. This is the same three published numbers with the bar
 * length set from the number itself, so the shape of the saving is
 * visible and the figure is still plain text a crawler can read and a
 * screen reader can announce. The widths are computed from the rates,
 * not chosen by eye: $120 is the full bar, everything else is a
 * proportion of it. No animation changes a number. */
const LADDER_BASELINE = 120;
const LADDER = [
  { plan: 'Month-to-month', rate: 120, label: '$120', unit: 'per month', note: 'Flexibility first. No agreement.' },
  { plan: '12-month membership', rate: 75, label: '$75', unit: 'per month', note: 'Save 38% against month-to-month.' },
  { plan: 'Annual, paid in full', rate: 63, label: '$63', unit: 'per month effective', note: '$825 once, for 13 months. Save 47%.' },
];

function PlanCard({ plan }) {
  const pop = plan.highlight;
  const dark = plan.tone === 'deep';
  const background = plan.tone === 'mint'
    ? 'var(--scs-mint)'
    : dark ? 'var(--scs-forest-deep)' : 'var(--scs-white)';
  const heading = dark ? 'var(--scs-white)' : 'var(--scs-forest)';
  const body = dark ? 'var(--scs-text-on-dark-muted)' : 'var(--scs-text-muted)';
  const fine = dark ? 'var(--scs-text-on-dark-muted)' : 'var(--scs-text-muted)';

  return (
    <div className={`scs-lock relative flex flex-col h-full p-6 sm:p-7 ${dark ? 'on-dark' : ''}`}
      data-locked={pop ? 'true' : 'false'}
      style={{
        background,
        border: pop ? '1.5px solid var(--scs-forest)' : dark ? 'none' : '1px solid var(--scs-border)',
        borderRadius: 'var(--scs-radius-card)',
      }}
      data-testid={`plan-${plan.id}`}>

      <div className="flex items-start justify-between mb-5">
        <BlueprintIcon name={plan.icon} size={52} className={dark ? 'scs-blueprint-light' : ''} />
        {plan.tag && (
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] px-2.5 py-1"
            style={pop
              ? { background: 'var(--scs-coral)', color: 'var(--scs-white)', borderRadius: 'var(--scs-radius)' }
              : { color: dark ? 'var(--scs-mint)' : 'var(--scs-text-muted)' }}>
            {plan.tag}
          </span>
        )}
      </div>

      <h3 className="font-display-medium text-xl" style={{ color: heading }}>{plan.name}</h3>
      {plan.subtitle && <p className="text-sm mb-4 m-0" style={{ color: body }}>{plan.subtitle}</p>}

      <p className="flex items-baseline gap-1.5 m-0 mt-3 mb-1">
        <span className="font-display text-5xl" style={{ color: dark ? 'var(--scs-white)' : 'var(--scs-ink)' }}>{plan.price}</span>
        <span className="text-sm" style={{ color: body }}>{plan.per}</span>
      </p>
      {plan.monthlyEquiv && <p className="text-sm font-semibold m-0 mb-1" style={{ color: dark ? 'var(--scs-mint)' : 'var(--scs-coral)' }}>{plan.monthlyEquiv}</p>}
      {plan.savings && (
        <p className="m-0 mb-4">
          <span className="text-xs font-semibold" style={{ color: dark ? 'var(--scs-mint)' : 'var(--scs-forest)' }}>{plan.savings}</span>
          {plan.compareText && <span className="text-xs ml-2" style={{ color: fine }}>{plan.compareText}</span>}
        </p>
      )}
      {!plan.savings && plan.compareText && <p className="text-xs mb-4 m-0" style={{ color: fine }}>{plan.compareText}</p>}

      <ul className="mb-5 mt-2 flex-1">
        {plan.features.map((f, i) => (
          <li key={`f-${plan.id}-${i}`} className="flex items-start gap-2.5 text-sm py-1" style={{ color: dark ? 'var(--scs-text-on-dark)' : 'var(--scs-text)' }}>
            <Check size={15} className="shrink-0 mt-0.5" style={{ color: dark ? 'var(--scs-mint)' : 'var(--scs-forest)' }} aria-hidden="true" />{f}
          </li>
        ))}
      </ul>

      {plan.terms?.length > 0 && (
        <ul className="pt-4 mb-5" style={{ borderTop: dark ? '1px solid var(--scs-border-dark)' : '1px solid var(--scs-border)' }}>
          {plan.terms.map((t, i) => (
            <li key={`t-${plan.id}-${i}`} className="text-xs leading-relaxed" style={{ color: fine }}>{t}</li>
          ))}
        </ul>
      )}

      <a href={plan.direct === 'call' ? GYM_CONFIG.phoneHref : '/contact#tour-request'} data-testid={`join-${plan.id}`}
        className={`w-full text-sm ${pop ? 'btn-clay' : dark ? 'btn-outline btn-outline-on-dark' : 'btn-primary'}`}>
        {plan.direct === 'call' ? `Call ${GYM_CONFIG.phone}` : 'Book a Free Facility Tour'}
      </a>
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
      {active > 0 && <button onClick={() => scrollTo(active - 1)} aria-label="Previous plan" className="absolute left-1 top-1/2 -translate-y-1/2 z-20 w-11 h-11 flex items-center justify-center" style={{ background: 'var(--scs-white)', color: 'var(--scs-forest)', borderRadius: '999px', boxShadow: 'var(--scs-shadow-md)' }}><ChevronLeft size={18} /></button>}
      {active < count - 1 && <button onClick={() => scrollTo(active + 1)} aria-label="Next plan" className="absolute right-1 top-1/2 -translate-y-1/2 z-20 w-11 h-11 flex items-center justify-center" style={{ background: 'var(--scs-white)', color: 'var(--scs-forest)', borderRadius: '999px', boxShadow: 'var(--scs-shadow-md)' }}><ChevronRight size={18} /></button>}
      <div ref={ref} className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth px-4 pb-4 -mx-4" style={{ scrollbarWidth: 'none' }}>
        {React.Children.map(children, (child, i) => <div key={`mc-${i}`} className="snap-center shrink-0" style={{ width: '85vw', maxWidth: '340px' }}>{child}</div>)}
      </div>
      <div className="flex justify-center gap-2 mt-3">
        {/* The dot is 4px tall on purpose. The button around it is not: padding
            alone left a 22x20 target, under the 24x24 minimum, on the one page
            where a mis-tap costs a membership. min-w/min-h sets the floor
            without touching the mark. */}
        {Array.from({ length: count }).map((_, i) => <button key={`d-${i}`} onClick={() => scrollTo(i)} aria-label={`Plan ${i + 1}`} className="p-2 min-w-[24px] min-h-[24px] flex items-center justify-center" style={{ lineHeight: 0 }}><span className="block transition-all duration-200" style={{ width: i === active ? '20px' : '6px', height: '4px', background: i === active ? 'var(--scs-forest)' : 'rgba(27,27,25,0.25)', borderRadius: '2px' }} /></button>)}
      </div>
    </div>
  );
}

export default function Join() {
  const [showMore, setShowMore] = useState(false);
  const [showFaq, setShowFaq] = useState(null);
  useEffect(() => {
    window.scrollTo(0, 0);
    trackMembershipView(PRIMARY_PLANS.length + MORE_PLANS.length);
  }, []);

  const faqs = [
    { q: 'What is the $50 Annual Enhancement Fee?', a: 'A $50 fee applied once per year to all memberships. It supports equipment maintenance and facility upkeep.' },
    { q: 'How do cancellations work?', a: 'All memberships require 30-day cancellation notice. Commitment terms cannot be canceled early. After the term, they auto-renew month-to-month.' },
    { q: 'Can I freeze my membership?', a: 'Yes. Talk to staff about temporary hold options.' },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--scs-bg)' }}>
      <Navbar />

      <main id="main">
        {/* --------------------------------------------------------------
            HERO
            A pricing page is a transaction. The room appears behind the
            heading at low contrast so the page is recognisably this gym,
            and then gets out of the way of the numbers.
            -------------------------------------------------------------- */}
        <section className="relative pt-16 on-dark on-photo" style={{ background: 'var(--scs-forest-deep)' }}>
          <img
            {...photo('racks', { sizes: '100vw', eager: true })}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: 'center 40%', filter: 'saturate(0.5) brightness(0.5)' }}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(6,48,31,0.90), rgba(6,48,31,0.97))' }} />
          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-16 pb-14 sm:pt-20 sm:pb-16">
            <h1 className="font-display mb-4" style={{ color: 'var(--scs-white)', fontSize: 'clamp(2.25rem, 5.5vw, 3.75rem)', lineHeight: 0.96 }}>
              What Membership Costs
            </h1>
            <p className="text-base sm:text-lg max-w-xl leading-relaxed m-0" style={{ color: 'var(--scs-text-on-dark)' }}>
              Every plan includes full equipment access. Longer commitments cost less per month. Book a visit and a coach will set you up.
            </p>
          </div>
        </section>

        {/* Headings are the document outline, not a size picker. Before this h2
            the page went h1 straight to the h3 inside each plan card, and the
            "more plans" cards were h4 under nothing at all. Both now sit under a
            heading that says what the group is. */}
        <section className="pt-14 pb-10" style={{ background: 'var(--scs-cream)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-8">
            <h2 className="font-display text-2xl sm:text-3xl mb-2" style={{ color: 'var(--scs-forest)' }}>Membership plans and pricing</h2>
            <p className="text-sm m-0" style={{ color: 'var(--scs-text-muted)' }}>Prices are per month unless the card says otherwise. Memberships are completed in person.</p>
          </div>
          <div className="hidden md:block max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-3 gap-5 items-stretch">{PRIMARY_PLANS.map(p => <PlanCard key={p.id} plan={p} />)}</div>
          </div>
          <div className="md:hidden mt-2"><MobileCarousel>{PRIMARY_PLANS.map(p => <PlanCard key={p.id} plan={p} />)}</MobileCarousel></div>
        </section>

        <section className="pb-16" style={{ background: 'var(--scs-cream)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <button onClick={() => setShowMore(!showMore)} data-testid="show-more-plans"
              aria-expanded={showMore} aria-controls="more-membership-plans"
              className="w-full flex items-center justify-center gap-2 py-4 text-sm font-semibold"
              style={{ color: 'var(--scs-forest)', border: '1px solid var(--scs-forest)', borderRadius: 'var(--scs-radius)', background: 'transparent' }}>
              {showMore ? 'Hide the other six plans' : 'See the other six plans'} {showMore ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {/* Rendered whether or not the disclosure is open, and hidden with the
                hidden attribute when it is closed.

                Six of this gym's nine plans live behind this toggle, including
                every couples and weekend tier. Mounting them on click meant the
                pricing page's initial HTML listed three plans and the other six
                did not exist in the document at all: not for a crawler, not for
                an answer engine asked what a membership here costs, not for
                anyone reading with JavaScript off. hidden keeps the page looking
                exactly as it did. */}
            <div id="more-membership-plans" hidden={!showMore}>
              <h2 className="font-display text-xl mt-10 mb-5" style={{ color: 'var(--scs-forest)' }}>More membership options</h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {MORE_PLANS.map(p => (
                  <li key={p.id} className="p-5 flex flex-col h-full" style={{ background: 'var(--scs-white)', border: '1px solid var(--scs-border)', borderRadius: 'var(--scs-radius-card)' }} data-testid={`plan-${p.id}`}>
                    <div className="flex justify-between items-start gap-3 mb-1">
                      <h3 className="font-display-medium text-base m-0" style={{ color: 'var(--scs-forest)' }}>{p.name}</h3>
                      <span className="font-display text-xl whitespace-nowrap" style={{ color: 'var(--scs-ink)' }}>{p.price}<span className="text-xs font-normal" style={{ color: 'var(--scs-text-muted)' }}>{p.per}</span></span>
                    </div>
                    <p className="text-xs mb-2 m-0" style={{ color: 'var(--scs-text-muted)' }}>{p.subtitle}</p>
                    {p.extra && <p className="text-sm font-semibold mb-1 m-0" style={{ color: 'var(--scs-forest)' }}>{p.extra}</p>}
                    {p.savings && <p className="text-xs font-semibold m-0" style={{ color: 'var(--scs-forest)' }}>{p.savings}</p>}
                    {p.compareText && <p className="text-xs mb-2 m-0" style={{ color: 'var(--scs-text-muted)' }}>{p.compareText}</p>}
                    <p className="text-xs mb-auto pt-2" style={{ color: 'var(--scs-text-muted)' }}>{p.terms?.[0]}</p>
                    <a href="/contact#tour-request" data-testid={`join-${p.id}`} className="btn-outline w-full text-sm mt-4">Book a Free Facility Tour</a>
                  </li>
                ))}
              </ul>
              <p className="text-xs mt-4" style={{ color: 'var(--scs-text-muted)' }}>All memberships: $50 Annual Enhancement Fee. 30-day cancellation notice required.</p>
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------------
            WHY COMMIT
            The cost ladder as a bar whose length is the rate. Three
            published numbers, shown at the same scale, with the working
            printed underneath rather than implied by a badge.
            -------------------------------------------------------------- */}
        <section className="py-16 sm:py-20" style={{ background: 'var(--scs-mint)' }}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h2 className="font-display text-2xl sm:text-3xl mb-3" style={{ color: 'var(--scs-forest)' }}>Why commit</h2>
            <p className="text-sm mb-10 max-w-[62ch]" style={{ color: 'var(--scs-text-muted)' }}>
              The longer the agreement, the lower the monthly cost. Every bar below is drawn to the rate beside it, measured against the $120 month-to-month rate.
            </p>
            <ol>
              {LADDER.map((step, index) => (
                <li key={step.plan} data-reveal className="py-6" style={{ borderTop: '1px solid rgba(14,93,62,0.25)' }}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                    <h3 className="font-display-medium text-lg m-0" style={{ color: 'var(--scs-forest)' }}>{step.plan}</h3>
                    <p className="m-0">
                      <span className="font-display text-3xl" style={{ color: 'var(--scs-ink)' }}>{step.label}</span>
                      <span className="text-sm ml-2" style={{ color: 'var(--scs-text-muted)' }}>{step.unit}</span>
                    </p>
                  </div>
                  <div className="h-2.5 w-full" style={{ background: 'rgba(14,93,62,0.14)', borderRadius: '2px' }}>
                    <div
                      className="h-full"
                      style={{
                        width: `${Math.round((step.rate / LADDER_BASELINE) * 100)}%`,
                        background: index === LADDER.length - 1 ? 'var(--scs-coral)' : 'var(--scs-forest)',
                        borderRadius: '2px',
                      }}
                    />
                  </div>
                  <p className="text-sm mt-3 m-0" style={{ color: 'var(--scs-text-muted)' }}>{step.note}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="py-16" style={{ background: 'var(--scs-cream)' }}>
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <h2 className="font-display text-2xl sm:text-3xl mb-7" style={{ color: 'var(--scs-forest)' }}>Membership FAQ</h2>
            <div>
              {faqs.map((f, i) => (
                <div key={`faq-${i}`} style={{ borderTop: '1px solid rgba(14,93,62,0.22)' }}>
                  <button onClick={() => setShowFaq(showFaq === i ? null : i)} aria-expanded={showFaq === i} aria-controls={`join-faq-${i}`}
                    className="w-full flex items-center justify-between gap-4 py-5 text-left text-base font-semibold"
                    style={{ color: 'var(--scs-forest)', background: 'transparent' }} data-testid={`faq-toggle-${i}`}>
                    {f.q} {showFaq === i ? <ChevronUp size={18} className="shrink-0" /> : <ChevronDown size={18} className="shrink-0" />}
                  </button>
                  {/* hidden, not unmounted, for the same reason as the plans above:
                      an answer that only exists after a click is an answer the
                      page does not contain. */}
                  <div id={`join-faq-${i}`} hidden={showFaq !== i} className="pb-5 text-sm leading-relaxed max-w-[68ch]" style={{ color: 'var(--scs-text-muted)' }}>{f.a}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="book-a-tour" className="py-16 sm:py-20 on-dark" style={{ background: 'var(--scs-forest-deep)' }}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <h2 className="font-display text-2xl sm:text-3xl mb-3" style={{ color: 'var(--scs-white)' }}>Start With a Visit</h2>
            <p className="text-base mb-10 max-w-[62ch]" style={{ color: 'var(--scs-text-on-dark-muted)' }}>
              See the space, ask your questions, and set up your membership with a coach in person.
            </p>

            <ol className="scs-rail scs-rail-h grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6 mb-12 pl-10 sm:pl-0" data-testid="how-joining-works" style={{ color: 'var(--scs-mint)' }}>
              {[
                { n: '1', h: 'Tell us about you', b: 'Answer a few questions below. It takes about a minute.', icon: 'inquiry' },
                { n: '2', h: 'We reach out', b: 'A coach contacts you to agree a time that works.', icon: 'contact' },
                { n: '3', h: 'Visit and join', b: 'Walk the space, then set up the plan that fits. We handle the paperwork.', icon: 'meet-here' },
              ].map(s => (
                <li key={s.n} data-testid={`joining-step-${s.n}`}>
                  <span className="scs-rail-node absolute sm:relative" style={{ left: 0, marginLeft: '-1px' }} aria-hidden="true" />
                  <div className="sm:mt-6">
                    <BlueprintIcon name={s.icon} size={56} draw className="scs-blueprint-light mb-4" />
                    <h3 className="font-display-medium text-lg mb-1" style={{ color: 'var(--scs-white)' }}>{s.h}</h3>
                    <p className="text-sm leading-relaxed m-0" style={{ color: 'var(--scs-text-on-dark-muted)' }}>{s.b}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="p-6 sm:p-8" style={{ background: 'var(--scs-white)', borderRadius: 'var(--scs-radius-card)', color: 'var(--scs-text)' }}>
              <QuizForm source="membership_page" noAutoFocus />
            </div>

            <p className="text-sm mt-8 m-0" style={{ color: 'var(--scs-text-on-dark-muted)' }}>
              Prefer to talk first?{' '}
              <a href={GYM_CONFIG.phoneHref} className="font-semibold underline underline-offset-4 decoration-1" style={{ color: 'var(--scs-mint)' }}>
                Call {GYM_CONFIG.phone}
              </a>{' '}
              during staffed hours, or{' '}
              <a href="/contact#tour-request" className="scs-advance font-semibold underline underline-offset-4 decoration-1 inline-flex items-center gap-1" style={{ color: 'var(--scs-mint)' }}>
                book a facility tour <ArrowRight size={13} />
              </a>.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
