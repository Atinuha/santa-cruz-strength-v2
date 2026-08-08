/*
 * TOURNAMENT DIRECTION 1: THE DECISION DESK
 * The homepage as a decision environment.
 *
 * Dials: DESIGN_VARIANCE 5, MOTION_INTENSITY 3, VISUAL_DENSITY 7.
 *
 * The argument of this page, stated once here so the layout is readable:
 * a person choosing a gym is running a comparison, not being courted. They want
 * to know what it costs, how access works, where it is, how joining happens, and
 * what happens if they want out. Every one of those is answered in place, on one
 * still page, and the visit is the only thing left to do.
 *
 * Three consequences run through every section below.
 *   1. The page does not move. No scroll reveal, no entrance, no parallax.
 *      Facts that animate into place read as advertising.
 *   2. No display type sits on any photograph. Type lives on flat carbon or
 *      flat paper, which removes the scrim problem instead of solving it.
 *   3. Rules appear only where two pieces of real data meet.
 *
 * Full articulation, layout families, mobile collapse and the photography that
 * this direction needs and does not have: see README.md in this directory.
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, Phone, Clock } from 'lucide-react';

import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import QuizForm from '../../components/QuizForm';
import MapEmbed from '../../components/MapEmbed';
import { GYM_CONFIG, MEMBERSHIP_TIERS, MEMBERSHIP_FEE_NOTE } from '../../config';
import { SCS_MEDIA } from '../../config/media';
import { MEMBER_STORIES } from '../../config/testimonials';
import { getSiteContent, getBlogPosts } from '../../lib/api';
import { withoutConsolidated } from '../../seo/consolidatedSlugs';
import { trackBookTourClick, trackPhoneClick } from '../../utils/analytics';
import './decision-desk.css';

/* --------------------------------------------------------------------------
   TOKENS
   Two text levels on paper, both WCAG AA on chalk. Stone appears only on
   carbon, where it measures about 5.45:1. Stone on chalk is about 2.8:1 and
   does not appear on this page at all.
   -------------------------------------------------------------------------- */
const PAPER = 'var(--scs-bg)';
const CARBON = 'var(--scs-carbon)';
const PANEL = 'var(--scs-warm-white)';
const INK = 'var(--scs-charcoal)';
const INK_2 = 'rgba(36,35,33,0.72)';
const RULE = 'var(--scs-border)';
const RULE_DARK = 'var(--scs-border-dark)';
const CHALK = 'var(--scs-chalk)';
const STONE = 'var(--scs-stone)';

const SHELL = 'max-w-[1200px] mx-auto px-4 sm:px-6';
const SECTION = 'py-12 lg:py-14';

/* Photography. Three real frames, one grade. The coaching frame is deliberately
   unused: it is the same five people at the same backdrop as the community
   frame, and it is a posed group shot rather than coaching in progress. */
const HERO_PLATE = SCS_MEDIA.heroFacility;    // the training floor. Stand in for the future hero.
const FLOOR_PLATE = SCS_MEDIA.openGym;        // the rack and bench row
const PEOPLE_PLATE = SCS_MEDIA.communityFloor; // five people at the painted seal backdrop
const SEAL = SCS_MEDIA.logo;

const tier = (id) => MEMBERSHIP_TIERS.find((t) => t.id === id) || {};

/* The five questions a person actually asks before walking into a gym. Every
   value is read out of config or quoted from copy this project has already
   approved. Nothing here is a new claim. */
const DECISION_ROW = [
  {
    q: 'Where',
    a: 'Harvey West',
    note: GYM_CONFIG.address.full,
  },
  {
    q: 'Member access',
    a: '24 / 7',
    // The Huscler tier's own published access term. A membership term, not a
    // staffed hours claim. The homepage still publishes no hours table.
    note: 'Facility access via app, on a Huscler membership.',
  },
  {
    q: 'A visit costs',
    a: 'Nothing',
    // Verbatim from the reassurance line under the tour form.
    note: 'No membership commitment and no card required.',
  },
  {
    q: 'Signing up',
    a: 'In person',
    note: 'A coach completes signup at the gym. There is no online checkout.',
  },
  {
    q: 'Shortest term',
    a: 'Month to month',
    // Verbatim, both terms, from the Flex tier in config.
    note: `${(tier('flex').terms || []).join('. ')}.`,
  },
];

/* The sanctioned inventory, grouped. Every item is named either in the FAQ
   equipment answer or in the approved hero subhead. Nothing is invented. */
const FLOOR_GROUPS = [
  { heading: 'Racks and bars', items: ['Power racks', 'Barbells', 'Specialty bars', 'Lifting platforms'] },
  { heading: 'Plates and benches', items: ['Bumper plates', 'Iron plates', 'Plate storage', 'Benches'] },
  { heading: 'Dumbbells and conditioning', items: ['Dumbbells', 'Kettlebells', 'Conditioning equipment'] },
];

/* Nine tiers in three clusters. One divider per cluster, never a rule under
   every row. Prices, cadences, tags, notes and terms are read by id. */
const COST_GROUPS = [
  { heading: 'Before you commit to anything', ids: ['daypass'] },
  { heading: 'Full access', ids: ['huscler-12', 'annual', 'huscler-6', 'flex'] },
  { heading: 'Two people, or weekends only', ids: ['couples-12', 'couples-6', 'weekend-12', 'weekend-6'] },
];

/* Verbatim, and identical to src/seo/home-schema.json. Changing one without the
   other breaks structured data truth. */
const FAQ_ITEMS = [
  { q: 'Do I need experience to start?', a: 'No. The gym works for people at every level. Staff can help you get oriented.' },
  { q: 'What happens on a facility tour?', a: 'You walk through the space, see the equipment, ask questions, and talk through which membership fits.' },
  { q: 'What equipment is available?', a: 'Power racks, barbells, bumper and iron plates, specialty bars, dumbbells, kettlebells, and conditioning equipment.' },
  { q: 'Is coaching available?', a: 'Staff can help during staffed hours. Structured personal training is a separate service.' },
  { q: 'Where is the gym?', a: '151 Harvey West Blvd Ste D, Santa Cruz, CA 95060. Harvey West Business Park.' },
];

/* API copy can carry dashes this project does not ship. Same strip, same escape
   form, as pages/Home.js. */
const noDash = (s) => (s || '').replace(/[\u2013\u2014]/g, ',');

/* A term list. The marker is a charcoal hairline rather than a clay dot,
   because clay on this page means the thing you press and nothing else. */
function Terms({ items }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
      {(items || []).map((t) => (
        <li key={t} className="flex items-center gap-2 text-[0.8125rem] leading-snug" style={{ color: INK_2 }}>
          <span className="w-2 h-px shrink-0" style={{ backgroundColor: 'rgba(36,35,33,0.3)' }} />
          {t}
        </li>
      ))}
    </ul>
  );
}

/* One ledger entry. Featured is the same row with a warm white bed and a larger
   figure, which is the featured versus rest shape rather than a second card
   style. Every row carries the same horizontal padding and the group cancels it
   with a negative margin, so the featured bed reads slightly wider than the
   column while the price column stays perfectly aligned down the page.
   No per tier button: there is nothing to buy on this page. */
function LedgerRow({ id, featured }) {
  const t = tier(id);
  if (!t.name) return null;
  return (
    <li
      className={`grid grid-cols-1 lg:grid-cols-12 gap-x-6 gap-y-2 items-baseline px-4 sm:px-5 ${featured ? 'py-4 lg:py-5' : 'py-3.5'}`}
      style={featured ? { backgroundColor: PANEL, border: `1px solid ${RULE}`, borderRadius: 'var(--scs-radius)' } : undefined}
    >
      <div className="lg:col-span-2 flex items-baseline gap-2">
        <span
          className={`dd-num font-display ${featured ? 'text-[2rem]' : 'text-[1.5rem]'}`}
          style={{ color: INK }}
        >
          {t.price}
        </span>
        <span className="text-[0.75rem]" style={{ color: INK_2 }}>{t.cadence}</span>
      </div>

      <div className="lg:col-span-3">
        <div className="flex flex-wrap items-baseline gap-x-2.5">
          <span className="font-display-medium text-[1.0625rem]" style={{ color: INK }}>{t.name}</span>
          {t.tag && (
            <span className="text-[0.6875rem] uppercase tracking-[0.1em]" style={{ color: INK_2 }}>{t.tag}</span>
          )}
        </div>
        {t.subtitle && <p className="text-[0.8125rem] leading-snug mt-0.5" style={{ color: INK_2 }}>{t.subtitle}</p>}
        {t.note && <p className="text-[0.8125rem] leading-snug mt-0.5" style={{ color: INK_2 }}>{t.note}</p>}
      </div>

      <div className="lg:col-span-7">
        <Terms items={t.terms} />
      </div>
    </li>
  );
}

export default function DecisionDesk() {
  const [c, setC] = useState({});
  const copy = (key, approved) => c[key] || approved;
  const [blogPosts, setBlogPosts] = useState([]);

  useEffect(() => {
    getSiteContent().then(({ data }) => setC(data)).catch(() => {});
    // Ask for more than three, drop the consolidated ones, then take three.
    // Every seeded post shares one timestamp, so an unfiltered top three could
    // surface both halves of a cross canonical duplicate pair.
    getBlogPosts({ limit: 8 })
      .then((r) => setBlogPosts(withoutConsolidated(r.data.posts || []).slice(0, 3)))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen" style={{ background: PAPER }}>
      <Navbar />

      {/* ====================================================================
          1. HERO. Asymmetric split band, text left on flat carbon, photographic
          plate right, no gap, one hairline between them. Deliberately short:
          the point is that the Decision Row below is reachable at once.
          Collapse below lg: single column, plate moves to the top as a full
          bleed 16:9 band, then headline, subtext, stacked full width CTAs.
          Text elements: 3. Cap is 4.
          ==================================================================== */}
      <section data-testid="home-hero" className="pt-16" style={{ backgroundColor: CARBON }}>
        <div className={SHELL}>
          <div className="grid grid-cols-1 lg:grid-cols-12 lg:min-h-[52vh] lg:max-h-[620px]">

            <div
              className="order-1 lg:order-2 lg:col-span-5 aspect-video lg:aspect-auto overflow-hidden -mx-4 sm:-mx-6 lg:mx-0 lg:border-l"
              style={{ borderColor: RULE_DARK }}
            >
              <img
                src={HERO_PLATE}
                alt="The Santa Cruz Strength training floor, with racks, benches and the painted wall seal"
                className="dd-plate w-full h-full object-cover"
                style={{ objectPosition: 'center 58%' }}
              />
            </div>

            <div className="order-2 lg:order-1 lg:col-span-7 flex flex-col justify-center py-9 lg:py-12 lg:pr-12">
              <h1
                className="font-display text-[2rem] sm:text-[2.6rem] lg:text-[3rem] max-w-[26ch] mb-5"
                style={{ color: CHALK }}
              >
                {copy('home_hero_headline_v2', 'A Santa Cruz strength gym you can see before you join.')}
              </h1>
              <p className="text-[0.9375rem] sm:text-base leading-[1.55] max-w-[46ch] mb-7" style={{ color: CHALK }}>
                {copy('home_hero_subtitle_v2', 'See the racks, platforms, training floor, and access setup before you choose a membership.')}
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <Link
                  to="/contact"
                  data-testid="home-hero-book-visit-button"
                  className="btn-clay dd-t px-6 py-3 text-sm uppercase tracking-wider font-semibold inline-flex items-center gap-2 w-full sm:w-auto justify-center whitespace-nowrap"
                  onClick={() => trackBookTourClick('hero')}
                >
                  Book a Free Facility Tour
                  <ArrowRight size={14} />
                </Link>
                {/* The comparison lives on this page, so this moves the reader
                    down to it rather than off to /join. /join stays reachable
                    from the navbar Membership link and from the footer. */}
                <a
                  href="#cost"
                  className="btn-outline dd-t px-6 py-3 text-sm w-full sm:w-auto text-center whitespace-nowrap"
                  style={{ borderColor: 'rgba(232,225,214,0.32)', color: CHALK }}
                >
                  Compare Memberships
                </a>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ====================================================================
          2. THE DECISION ROW. The signature move. Five hairline divided cells
          in one fixed grammar: question, answer, qualifier. Every value is
          sourced. It never moves.
          Collapse: 5 columns at lg, 2 at sm, 1 below. Vertical rules become
          horizontal rules.
          ==================================================================== */}
      <section style={{ backgroundColor: CARBON, borderTop: `1px solid ${RULE_DARK}` }}>
        <div className={`${SHELL} pb-2`}>
          <h2 className="sr-only">The short answers</h2>
          <div className="dd-row">
            {DECISION_ROW.map((cell) => (
              <div key={cell.q}>
                <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.12em] mb-2" style={{ color: STONE }}>
                  {cell.q}
                </div>
                <div className="font-display-medium text-[1.375rem] leading-none mb-2" style={{ color: CHALK }}>
                  {cell.a}
                </div>
                <p className="text-[0.8125rem] leading-snug" style={{ color: STONE }}>{cell.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          3. WHAT IS ON THE FLOOR. Full width 3:1 photographic plate above three
          clustered inventory columns. The 3:1 crop is also what removes the
          letterbox bars carried in the source frame.
          Collapse below md: plate becomes 16:9, three columns stack, each
          keeping its own top rule.
          ==================================================================== */}
      <section className={SECTION} style={{ backgroundColor: PAPER }}>
        <div className={SHELL}>
          <h2 className="font-display text-[1.75rem] lg:text-[2rem] mb-6" style={{ color: INK }}>
            What is on the floor.
          </h2>
          <div className="overflow-hidden mb-2 aspect-video md:aspect-[3/1]" style={{ borderRadius: 'var(--scs-radius)' }}>
            <img
              src={FLOOR_PLATE}
              alt="Squat stands, flat benches, bumper plates on a floor cradle and a lifting platform at Santa Cruz Strength"
              className="dd-plate w-full h-full object-cover"
              style={{ objectPosition: 'center 45%' }}
              loading="lazy"
            />
          </div>
          <div className="dd-grid3">
            {FLOOR_GROUPS.map((group) => (
              <div key={group.heading}>
                <h3 className="font-display-medium text-[0.9375rem] mb-3" style={{ color: INK }}>{group.heading}</h3>
                <ul className="space-y-1.5">
                  {group.items.map((item) => (
                    <li key={item} className="text-[0.875rem] leading-snug" style={{ color: INK_2 }}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          4. WHAT IT COSTS. Nine published tiers, three clusters, one divider
          per cluster, one aligned price column. Featured versus rest rather
          than nine equal cards. No per tier button anywhere: memberships are
          sold in person and there is nothing to buy on this page.
          Collapse below lg: the 12 column ledger row stacks. Price stays first,
          name second, terms wrap beneath.
          ==================================================================== */}
      {/* scroll-mt clears the 64px fixed navbar, so the anchor from the hero
          lands on the heading rather than under the bar. */}
      <section id="cost" className={`${SECTION} scroll-mt-20`} style={{ backgroundColor: PAPER, borderTop: `1px solid ${RULE}` }}>
        <div className={SHELL}>
          <h2 className="font-display text-[1.75rem] lg:text-[2rem] mb-3" style={{ color: INK }}>
            What it costs.
          </h2>
          <p className="text-[0.9375rem] leading-[1.55] max-w-[62ch] mb-8" style={{ color: INK_2 }}>
            Every plan the gym publishes, so you can price the decision before you spend an hour on it.
            A coach completes signup at the gym, so there is nothing to buy here.
          </p>

          {COST_GROUPS.map((group) => (
            <div key={group.heading} className="pt-5 mb-6 last:mb-0" style={{ borderTop: `1px solid ${RULE}` }}>
              <h3 className="font-display-medium text-[0.9375rem] mb-4" style={{ color: INK_2 }}>{group.heading}</h3>
              <ul className="space-y-2 -mx-4 sm:-mx-5">
                {group.ids.map((id) => (
                  <LedgerRow key={id} id={id} featured={tier(id).featured} />
                ))}
              </ul>
            </div>
          ))}

          <p className="text-[0.8125rem] leading-[1.55] max-w-[72ch] mt-7 pt-5" style={{ color: INK_2, borderTop: `1px solid ${RULE}` }}>
            {MEMBERSHIP_FEE_NOTE}
          </p>

          <div className="mt-7">
            <Link
              to="/contact"
              className="btn-clay dd-t px-6 py-3 text-sm uppercase tracking-wider font-semibold inline-flex items-center gap-2 whitespace-nowrap"
            >
              Book a Free Facility Tour
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ====================================================================
          5. WHAT HELP IS AVAILABLE. Paired definition blocks. Two things, and
          the sanctioned copy already distinguishes exactly two. No photograph:
          the only frame in the library that could illustrate coaching is a
          posed group shot of the same five people who appear further down.
          Collapse below md: the two blocks stack, rules kept.
          ==================================================================== */}
      <section className={SECTION} style={{ backgroundColor: PAPER, borderTop: `1px solid ${RULE}` }}>
        <div className={SHELL}>
          <h2 className="font-display text-[1.75rem] lg:text-[2rem] mb-6" style={{ color: INK }}>
            What help is available.
          </h2>
          <div className="dd-grid2">
            <div>
              <h3 className="font-display-medium text-[1.0625rem] mb-2" style={{ color: INK }}>Staff on the floor</h3>
              <p className="text-[0.9375rem] leading-[1.55] mb-1.5" style={{ color: INK_2 }}>
                Staff can help during staffed hours.
              </p>
              <p className="text-[0.8125rem] leading-snug" style={{ color: INK_2 }}>
                Call the gym for the current schedule.
              </p>
            </div>
            <div>
              <h3 className="font-display-medium text-[1.0625rem] mb-2" style={{ color: INK }}>Personal training</h3>
              <p className="text-[0.9375rem] leading-[1.55] mb-3" style={{ color: INK_2 }}>
                Structured personal training is a separate service, available to members who want programming or technique work.
              </p>
              <Link
                to="/personal-training"
                className="dd-t text-[0.9375rem] font-semibold inline-flex items-center gap-2"
                style={{ color: INK, textDecoration: 'underline', textDecorationColor: 'var(--scs-clay)', textUnderlineOffset: '4px' }}
              >
                Ask About Personal Training
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          6. COMMON QUESTIONS. Open, not an accordion. A decision environment
          shows the answers; a disclosure widget hides four fifths of them
          behind a click. Two column question and answer grid.
          Collapse below md: one column, one rule per pair.
          The data-testid stays on the FAQ heading, where the current build
          carries it, and still labels the same region.
          ==================================================================== */}
      <section className={SECTION} style={{ backgroundColor: PAPER, borderTop: `1px solid ${RULE}` }}>
        <div className={SHELL}>
          <h2 className="font-display text-[1.75rem] lg:text-[2rem] mb-6" data-testid="home-faq-accordion" style={{ color: INK }}>
            Common Questions
          </h2>
          <div className="dd-grid2">
            {FAQ_ITEMS.map((item) => (
              <div key={item.q}>
                <h3 className="text-[0.9375rem] font-semibold mb-1.5" style={{ color: INK }}>{item.q}</h3>
                <p className="text-[0.875rem] leading-[1.55]" style={{ color: INK_2 }}>{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          7. WHAT MEMBERS WROTE. A register rather than a testimonial wall:
          six statements in a horizontally scrolled row of fixed width columns,
          each under its own rule, with the provenance line stated once. It is
          deliberately subordinate to the ledger above it, because this
          direction holds that a person choosing a gym weighs terms more heavily
          than praise, and because these carry no date and no source link.
          Native scroll only, so there is no motion here either. The container
          is focusable and labelled so a keyboard can reach the far end.
          Collapse: identical at every width. That is the point of the pattern.
          ==================================================================== */}
      <section className={SECTION} style={{ backgroundColor: PAPER, borderTop: `1px solid ${RULE}` }} data-testid="home-testimonials-section">
        <div className={SHELL}>
          <h2 className="font-display text-[1.75rem] lg:text-[2rem] mb-2" style={{ color: INK }}>
            What members wrote.
          </h2>
          <p className="text-[0.8125rem] mb-6" style={{ color: INK_2 }}>
            Published on our site as written. Nothing edited.
          </p>
        </div>
        {/* The scroller is the measure itself, so the row is clipped at the same
            left and right edges as every other section rather than bleeding. */}
        <div
          className={`${SHELL} overflow-x-auto snap-x`}
          tabIndex={0}
          role="group"
          aria-label="Statements from members, scroll sideways for more"
        >
          <div className="flex gap-6 pb-2 w-max">
            {MEMBER_STORIES.map((story) => (
              <figure
                key={story.name}
                className="snap-start shrink-0 w-[268px] sm:w-[300px] pt-4"
                style={{ borderTop: `1px solid ${RULE}` }}
                data-testid={`home-testimonial-${story.name.split(' ')[0].toLowerCase()}`}
              >
                <figcaption className="mb-2">
                  <span className="font-display-medium text-[0.9375rem] block" style={{ color: INK }}>{story.name}</span>
                  <span className="text-[0.75rem]" style={{ color: INK_2 }}>{story.detail}</span>
                </figcaption>
                <blockquote className="text-[0.8125rem] leading-[1.55]" style={{ color: INK_2 }}>
                  {story.quote}
                </blockquote>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          8. PLAN THE VISIT. Form panel left, contact plate and map right. The
          address, phone and directions link all sit outside the third party
          frame, so they survive a blocked or slow Google.
          Collapse below lg: form first at full width, then the contact plate,
          then the photograph, then the map.
          ==================================================================== */}
      <section className={SECTION} style={{ backgroundColor: PAPER, borderTop: `1px solid ${RULE}` }}>
        <div className={SHELL}>
          <h2 className="font-display text-[1.75rem] lg:text-[2rem] mb-6" style={{ color: INK }}>
            Plan the visit.
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            <div className="lg:col-span-7">
              <div className="p-5 sm:p-7" style={{ backgroundColor: PANEL, border: `1px solid ${RULE}`, borderRadius: 'var(--scs-radius)' }}>
                <h3 className="font-display text-[1.25rem] sm:text-[1.375rem] mb-1" style={{ color: INK }}>
                  Request Your Free Facility Tour
                </h3>
                <p className="text-[0.875rem] mb-5" style={{ color: INK_2 }}>
                  Fill out the form and a team member will follow up.
                </p>
                <QuizForm source="book_a_tour" noAutoFocus />
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col gap-5">
              <div className="overflow-hidden aspect-video" style={{ borderRadius: 'var(--scs-radius)' }}>
                <img
                  src={PEOPLE_PLATE}
                  alt="Five people in Santa Cruz Strength event shirts standing together in front of the gym's painted seal backdrop"
                  className="dd-plate w-full h-full object-cover"
                  style={{ objectPosition: 'center 38%' }}
                  loading="lazy"
                />
              </div>

              <div className="p-5" style={{ backgroundColor: PANEL, border: `1px solid ${RULE}`, borderRadius: 'var(--scs-radius)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0" style={{ border: `1px solid ${RULE}`, padding: '2px' }}>
                    <img src={SEAL} alt="" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <div className="font-display-medium text-[0.875rem]" style={{ color: INK }}>{GYM_CONFIG.name}</div>
                    <div className="text-[0.6875rem] uppercase tracking-[0.12em]" style={{ color: INK_2 }}>Strength Gym, Santa Cruz CA</div>
                  </div>
                </div>

                <ul className="space-y-2.5 mb-5">
                  <li className="flex items-start gap-2.5" data-testid="contact-address-block">
                    <MapPin size={15} className="mt-0.5 shrink-0" style={{ color: INK_2 }} />
                    <span className="text-[0.875rem] leading-snug" style={{ color: INK }}>{GYM_CONFIG.address.full}</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Phone size={15} className="mt-0.5 shrink-0" style={{ color: INK_2 }} />
                    <a
                      href={GYM_CONFIG.phoneHref}
                      data-testid="contact-click-to-call-button"
                      className="dd-t text-[0.875rem] font-semibold"
                      style={{ color: INK }}
                      onClick={() => trackPhoneClick()}
                    >
                      {GYM_CONFIG.phone}
                    </a>
                  </li>
                  <li className="flex items-start gap-2.5" data-testid="contact-hours-block">
                    <Clock size={15} className="mt-0.5 shrink-0" style={{ color: INK_2 }} />
                    <span className="text-[0.8125rem] leading-snug" style={{ color: INK_2 }}>Contact for current staffed hours</span>
                  </li>
                </ul>

                <a
                  href={GYM_CONFIG.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline dd-t px-5 py-2.5 text-sm inline-flex items-center gap-2 w-full justify-center whitespace-nowrap"
                >
                  <MapPin size={13} />
                  Get Directions
                </a>
              </div>

              <MapEmbed testId="home-map-embed" className="dd-map flex-1 min-h-[240px]" />
            </div>

          </div>
        </div>
      </section>

      {/* ====================================================================
          9. ABOUT THIS GYM. The one place on this page where density is
          deliberately relaxed: a single measure of prose, no rules, no columns.
          It also carries the entity information that search and answer engines
          extract.
          Collapse: already single measure, unchanged below md.
          ==================================================================== */}
      <section className={SECTION} style={{ backgroundColor: PAPER, borderTop: `1px solid ${RULE}` }}>
        <div className={SHELL}>
          <div className="max-w-[68ch]">
            <h2 className="font-display text-[1.75rem] lg:text-[2rem] mb-5" style={{ color: INK }}>
              About this gym.
            </h2>
            <p className="text-[0.9375rem] leading-[1.65] mb-3" style={{ color: INK_2 }}>
              Santa Cruz Strength is a strength training gym at 151 Harvey West Blvd in Santa Cruz, California.
              The facility is equipped for barbell training, powerlifting, and general strength work.
            </p>
            <p className="text-[0.9375rem] leading-[1.65]" style={{ color: INK_2 }}>
              Coaching is available. Memberships range from day passes to annual plans.
              The best way to learn about the gym is to visit in person.
            </p>
          </div>
        </div>
      </section>

      {/* ====================================================================
          10. RECENT POSTS. Conditional: renders nothing when the API is down or
          returns nothing, so the page still works before JavaScript finishes.
          Compact three up preview rows.
          Collapse below sm: one column. The All posts link stays hidden below
          sm, as in the current build.
          ==================================================================== */}
      {blogPosts.length > 0 && (
        <section className="py-10 lg:py-12" style={{ backgroundColor: PAPER, borderTop: `1px solid ${RULE}` }}>
          <div className={SHELL}>
            <div className="flex items-end justify-between mb-6">
              <h2 className="font-display text-[1.375rem] lg:text-[1.5rem]" style={{ color: INK }}>Recent Posts</h2>
              <Link
                to="/blog"
                className="dd-t text-sm font-semibold hidden sm:inline-flex items-center gap-1.5"
                style={{ color: INK, textDecoration: 'underline', textDecorationColor: 'var(--scs-clay)', textUnderlineOffset: '4px' }}
              >
                All posts
                <ArrowRight size={13} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {blogPosts.map((post) => (
                <Link
                  key={post.slug}
                  to={`/blog/${post.slug}`}
                  className="dd-t flex flex-col overflow-hidden"
                  style={{ backgroundColor: PANEL, border: `1px solid ${RULE}`, borderRadius: 'var(--scs-radius)' }}
                >
                  {post.cover_image && (
                    <div className="h-32 overflow-hidden">
                      <img src={post.cover_image} alt="" className="dd-plate w-full h-full object-cover" loading="lazy" />
                    </div>
                  )}
                  <div className="p-4">
                    {post.category && (
                      <div className="text-[0.625rem] font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color: INK_2 }}>
                        {post.category}
                      </div>
                    )}
                    <h3 className="text-[0.875rem] font-semibold leading-snug mb-1.5" style={{ color: INK }}>
                      {noDash(post.title)}
                    </h3>
                    <p className="text-[0.75rem] leading-snug" style={{ color: INK_2 }}>
                      {noDash(post.excerpt).slice(0, 90)}
                      {(post.excerpt || '').length > 90 ? '...' : ''}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
