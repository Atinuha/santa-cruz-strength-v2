import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Clock, MapPin, Phone } from 'lucide-react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import MapEmbed from '../../components/MapEmbed';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../components/ui/accordion';
import { GYM_CONFIG } from '../../config';
import { SCS_MEDIA } from '../../config/media';
import { getBlogPosts, getSiteContent } from '../../lib/api';
import { withoutConsolidated } from '../../seo/consolidatedSlugs';
import { trackBookTourClick, trackPhoneClick } from '../../utils/analytics';
import AnswerChips from './AnswerChips';
import RoutedTourForm from './RoutedTourForm';
import {
  INTEREST_OPTIONS,
  MEMBERSHIP_SHAPES,
  PATHS,
  TIMELINE_OPTIONS,
  TIMELINE_RESOLUTION,
  pathFor,
  planShapes,
} from './paths';

/**
 * DIRECTION 3, THE STARTING POINT ENGINE.
 * Homepage as guided self selection. DESIGN_VARIANCE 6 / MOTION_INTENSITY 6 /
 * VISUAL_DENSITY 4. Full articulation and the animation justifications are in
 * README.md beside this file.
 *
 * The page holds exactly two pieces of state, and they are the two fields the
 * lead form already collects. Everything that moves on this page moves because
 * one of those two changed. Nothing animates on load, on scroll, or on a timer.
 *
 * A visitor who never touches the mechanic reads a complete homepage: the hero
 * carries the headline, the subtext and both CTAs, section three lists all four
 * starting points in full, and every section below it is static.
 */

const HERO_IMG = SCS_MEDIA.heroFacility; // stand in. See README, Future Hero.
const WALKTHROUGH_IMG = SCS_MEDIA.openGym;
const COACHING_IMG = SCS_MEDIA.coachingFloor;
const LOGO_URL = SCS_MEDIA.logo;

// Verbatim from Home.js:29-35. These five pairs are mirrored into
// seo/home-schema.json, so the strings must not drift.
const FAQ_ITEMS = [
  { q: 'Do I need experience to start?', a: 'No. The gym works for people at every level. Staff can help you get oriented.' },
  { q: 'What happens on a facility tour?', a: 'You walk through the space, see the equipment, ask questions, and talk through which membership fits.' },
  { q: 'What equipment is available?', a: 'Power racks, barbells, bumper and iron plates, specialty bars, dumbbells, kettlebells, and conditioning equipment.' },
  { q: 'Is coaching available?', a: 'Staff can help during staffed hours. Structured personal training is a separate service.' },
  { q: 'Where is the gym?', a: '151 Harvey West Blvd Ste D, Santa Cruz, CA 95060. Harvey West Business Park.' },
];

const TOUR_BULLETS = [
  'See the full training floor and equipment',
  'Ask about membership options and access',
  'Meet available staff',
  'No paperwork required to visit',
];

// Blog copy arrives from the API and can carry dashes the house style forbids.
// Written in the escaped form, which is the one validate-seo.mjs exempts, the
// same as Home.js:270.
const stripDashes = (value) => (value || '').replace(/[\u2013\u2014]/g, ',');

const FOCUS_DARK =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--scs-chalk)]';
const FOCUS_LIGHT =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--scs-charcoal)]';

export default function StartingPointEngineHome() {
  const [content, setContent] = useState({});
  const copy = (key, approved) => content[key] || approved;
  const [blogPosts, setBlogPosts] = useState([]);
  const [answers, setAnswers] = useState({ interest_type: '', start_timeline: '' });
  const reduce = useReducedMotion();
  const formHeadingRef = useRef(null);

  useEffect(() => {
    getSiteContent().then(({ data }) => setContent(data)).catch(() => {});
    // Same query shape as the shipped homepage: ask for more than three, drop
    // the consolidated slugs, then take three, so the page can never link both
    // halves of a cross canonical pair.
    getBlogPosts({ limit: 8 })
      .then((response) => setBlogPosts(withoutConsolidated(response.data.posts || []).slice(0, 3)))
      .catch(() => {});
  }, []);

  const setAnswer = useCallback((field, value) => {
    setAnswers((current) => ({ ...current, [field]: value }));
  }, []);

  const goToForm = useCallback(() => {
    const node = formHeadingRef.current;
    if (!node) return;
    node.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    node.focus({ preventScroll: true });
  }, [reduce]);

  const activePath = pathFor(answers.interest_type);
  const answered = Boolean(activePath);

  // One transition object, reused, so every state change on the page moves at
  // the same speed. Zero under prefers-reduced-motion.
  const swap = useMemo(
    () => ({ duration: reduce ? 0 : 0.22, ease: [0.16, 1, 0.3, 1] }),
    [reduce],
  );
  const shift = useMemo(
    () => ({ duration: reduce ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }),
    [reduce],
  );

  const shapes = planShapes(MEMBERSHIP_SHAPES);

  return (
    <div className="min-h-screen" style={{ background: 'var(--scs-bg)' }}>
      <Navbar />

      {/* ------------------------------------------------------------------
          1. HERO. Full bleed photograph, bottom left text, right side left
          clear for the plinth that laps up into it at lg. Four text elements:
          headline, subtext, CTA pair, and the plinth's own legend. No eyebrow.
          Mobile: single column, no overlap, plinth becomes the next block.
      ------------------------------------------------------------------- */}
      <section data-testid="home-hero" className="relative pt-16" style={{ backgroundColor: 'var(--scs-carbon)' }}>
        <div className="relative flex items-end overflow-hidden min-h-[520px] lg:min-h-[62vh] lg:max-h-[620px]">
          <img
            src={HERO_IMG}
            alt="The Santa Cruz Strength training floor, with racks, benches, plate storage and lifting platforms"
            className="absolute inset-0 w-full h-full object-cover object-[50%_70%] lg:object-[30%_72%]"
            style={{ filter: 'saturate(0.55) contrast(1.08) brightness(0.6)' }}
            fetchPriority="high"
          />
          {/* Bottom weighted scrim. Text never sits on raw photograph. */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to top, rgba(12,12,11,0.90) 0%, rgba(12,12,11,0.66) 42%, rgba(12,12,11,0.40) 100%)',
            }}
          />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 w-full pt-20 pb-10 sm:pb-14">
            <div className="lg:max-w-[56%]">
              <h1
                className="font-display text-[1.9rem] sm:text-[2.4rem] lg:text-[3rem] mb-4"
                style={{ color: 'var(--scs-chalk)' }}
              >
                {copy('home_hero_headline_v2', 'A Santa Cruz strength gym you can see before you join.')}
              </h1>
              <p
                className="text-sm sm:text-base leading-relaxed mb-6 max-w-[48ch]"
                style={{ color: 'var(--scs-chalk)' }}
              >
                {copy(
                  'home_hero_subtitle_v2',
                  'See the racks, platforms, training floor, and access setup before you choose a membership.',
                )}
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Link
                  to="/contact"
                  data-testid="home-hero-book-visit-button"
                  onClick={() => trackBookTourClick('hero')}
                  className={`btn-clay px-6 py-3 text-sm uppercase tracking-wider font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap ${FOCUS_DARK}`}
                >
                  Book a Free Facility Tour <ArrowRight size={14} aria-hidden="true" />
                </Link>
                <Link
                  to="/join"
                  className={`btn-outline px-6 py-3 text-sm text-center whitespace-nowrap ${FOCUS_DARK}`}
                  style={{ borderColor: 'rgba(232,225,214,0.35)', color: 'var(--scs-chalk)' }}
                >
                  Compare Memberships
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------
          2. THE PLINTH. The first question, on a warm white slab that overlaps
          the photograph at lg and sits below it on smaller screens.
      ------------------------------------------------------------------- */}
      <section className="relative z-10 px-4 sm:px-6 pt-8 lg:pt-0 lg:-mt-24" aria-label="Choose a starting point">
        <div className="max-w-6xl mx-auto">
          <div
            className="p-5 sm:p-6 lg:ml-auto lg:max-w-[420px]"
            style={{
              background: 'var(--scs-warm-white)',
              border: '1px solid var(--scs-border)',
              borderRadius: 'var(--scs-radius)',
              boxShadow: 'var(--scs-shadow-md)',
            }}
          >
            <AnswerChips
              legend="What brings you in?"
              hint="Answer this and the section below shows the version of a first visit that fits you. Skip it and the whole page still reads."
              options={INTEREST_OPTIONS}
              value={answers.interest_type}
              onChange={(value) => setAnswer('interest_type', value)}
            />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------
          3. THE PLATE. Index to detail. Unanswered it is a readable list of all
          four starting points. Answered it collapses to one expanded entry and
          three demoted siblings, and the timing question appears on the ledge.
          Mobile: identical, list indent removed.
      ------------------------------------------------------------------- */}
      <section className="py-16 sm:py-20 mt-10 lg:mt-20" style={{ backgroundColor: 'var(--scs-charcoal)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2
            className="font-display text-2xl sm:text-3xl max-w-[18ch]"
            style={{ color: 'var(--scs-chalk)' }}
          >
            Four ways this visit goes.
          </h2>
          <p className="text-sm leading-relaxed mt-4 max-w-[52ch]" style={{ color: 'var(--scs-stone)' }}>
            A first visit is not the same conversation for everyone. Pick the line that sounds like you and the
            rest of this section rewrites itself.
          </p>

          <p role="status" aria-live="polite" className="sr-only">
            {answered ? `Showing your starting point: ${activePath.title}.` : 'No starting point chosen yet.'}
          </p>

          <ul className="mt-10 lg:pl-[14%]">
            {PATHS.map((path) => {
              const active = path.value === answers.interest_type;
              const plans = planShapes(path.plans);
              return (
                <motion.li
                  key={path.value}
                  layout={reduce ? false : 'position'}
                  transition={shift}
                  className="py-5"
                  style={{ borderTop: '1px solid var(--scs-border-dark)' }}
                >
                  <div className="flex items-start gap-4">
                    <span
                      aria-hidden="true"
                      className="mt-2 shrink-0"
                      style={{
                        width: '1.75rem',
                        height: '2px',
                        background: active ? 'var(--scs-clay)' : 'var(--scs-stone)',
                        opacity: active ? 1 : 0.45,
                        transition: reduce ? 'none' : 'background-color 180ms ease-out, opacity 180ms ease-out',
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <h3>
                        <button
                          type="button"
                          aria-pressed={active}
                          onClick={() => setAnswer('interest_type', path.value)}
                          className={`font-display-medium text-lg sm:text-xl text-left transition-colors duration-150 ${FOCUS_DARK}`}
                          style={{ color: active ? 'var(--scs-chalk)' : 'var(--scs-stone)' }}
                        >
                          {path.title}
                        </button>
                      </h3>

                      <AnimatePresence initial={false} mode="wait">
                        {active ? (
                          <motion.div
                            key="detail"
                            initial={reduce ? false : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={reduce ? { opacity: 1 } : { opacity: 0 }}
                            transition={swap}
                          >
                            <p
                              className="text-sm leading-relaxed mt-3 max-w-[58ch]"
                              style={{ color: 'var(--scs-chalk)' }}
                            >
                              {path.detail}
                            </p>

                            {plans.length > 0 && (
                              <div className="mt-4">
                                <p className="text-xs" style={{ color: 'var(--scs-stone)' }}>
                                  {path.planLead}
                                </p>
                                <ul className="mt-2 space-y-1.5">
                                  {plans.map((plan) => (
                                    <li key={plan.id} className="text-sm" style={{ color: 'var(--scs-chalk)' }}>
                                      <span className="font-semibold">{plan.name}.</span>{' '}
                                      <span style={{ color: 'var(--scs-stone)' }}>{plan.terms.join('. ')}.</span>
                                    </li>
                                  ))}
                                </ul>
                                <p className="text-xs mt-2" style={{ color: 'var(--scs-stone)' }}>
                                  Prices are on the membership page. A coach sets the plan up in person.
                                </p>
                              </div>
                            )}

                            {path.link && (
                              <Link
                                to={path.link.to}
                                className={`text-sm font-semibold inline-flex items-center gap-2 mt-4 transition-opacity hover:opacity-80 ${FOCUS_DARK}`}
                                style={{ color: 'var(--scs-clay)' }}
                              >
                                {path.link.label} <ArrowRight size={14} aria-hidden="true" />
                              </Link>
                            )}

                            {/* The ledge. The second question exists only once
                                the first is answered. */}
                            <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--scs-border-dark)' }}>
                              <AnswerChips
                                legend="When are you thinking of starting?"
                                options={TIMELINE_OPTIONS}
                                value={answers.start_timeline}
                                onChange={(value) => setAnswer('start_timeline', value)}
                                tone="dark"
                                columns="grid-cols-2 sm:grid-cols-4"
                                compact
                              />
                            </div>

                            <AnimatePresence initial={false}>
                              {answers.start_timeline && (
                                <motion.div
                                  key={answers.start_timeline}
                                  initial={reduce ? false : { opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={reduce ? { opacity: 1 } : { opacity: 0, height: 0 }}
                                  transition={{ duration: reduce ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
                                  className="overflow-hidden"
                                >
                                  <p
                                    className="text-sm leading-relaxed pt-5 max-w-[52ch]"
                                    style={{ color: 'var(--scs-chalk)' }}
                                  >
                                    {TIMELINE_RESOLUTION[answers.start_timeline]}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={goToForm}
                                    className={`btn-clay px-6 py-3 text-sm uppercase tracking-wider font-semibold inline-flex items-center gap-2 mt-5 whitespace-nowrap ${FOCUS_DARK}`}
                                  >
                                    Book a Free Facility Tour <ArrowRight size={14} aria-hidden="true" />
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        ) : (
                          !answered && (
                            <motion.p
                              key="summary"
                              initial={false}
                              exit={reduce ? { opacity: 1 } : { opacity: 0 }}
                              transition={swap}
                              className="text-sm leading-relaxed mt-2 max-w-[52ch]"
                              style={{ color: 'var(--scs-stone)' }}
                            >
                              {path.summary}
                            </motion.p>
                          )
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------------------
          4. WALK THE SPACE. The page's only image plus text split.
          Mobile: image above text, single column.
      ------------------------------------------------------------------- */}
      <section className="py-16 sm:py-20" style={{ backgroundColor: 'var(--scs-chalk)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="overflow-hidden scs-photo" style={{ borderRadius: 'var(--scs-radius)' }}>
            <img
              src={WALKTHROUGH_IMG}
              alt="Racks, benches and plate storage on the Santa Cruz Strength training floor"
              className="w-full h-64 sm:h-80 object-cover object-[50%_60%]"
              loading="lazy"
            />
          </div>
          <div>
            <p className="scs-eyebrow mb-3">Walk the space</p>
            <h2 className="font-display text-2xl sm:text-3xl mb-4" style={{ color: 'var(--scs-text)' }}>
              Walk through the space. Ask how access works. Leave with a clear answer.
            </h2>
            <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--scs-text-muted)' }}>
              A facility tour lets you see every part of the gym, see the equipment and ask what is available,
              and talk to staff before you decide anything.
            </p>
            <ul className="space-y-2 mb-6">
              {TOUR_BULLETS.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2 text-sm" style={{ color: 'var(--scs-text)' }}>
                  <span
                    aria-hidden="true"
                    className="mt-2 shrink-0"
                    style={{ width: '1rem', height: '2px', background: 'var(--scs-clay)' }}
                  />
                  {bullet}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={goToForm}
              className={`btn-clay px-6 py-3 text-sm uppercase tracking-wider font-semibold inline-flex items-center gap-2 whitespace-nowrap ${FOCUS_LIGHT}`}
            >
              Book a Free Facility Tour <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------
          5. COACHING. Full bleed photograph band, narrow text beneath it.
          Mobile: identical, band shorter.
      ------------------------------------------------------------------- */}
      <section className="py-16 sm:py-20" style={{ backgroundColor: 'var(--scs-charcoal)' }}>
        <div className="w-full overflow-hidden scs-photo">
          <img
            src={COACHING_IMG}
            alt="The Santa Cruz Strength coaching crew posed together on the lifting platform"
            className="w-full h-[220px] sm:h-[320px] object-cover object-[50%_35%]"
            loading="lazy"
          />
        </div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-10">
          <h2 className="font-display text-2xl sm:text-3xl mb-4" style={{ color: 'var(--scs-chalk)' }}>
            Practical coaching for people who want a plan.
          </h2>
          <p className="text-sm leading-relaxed mb-6 max-w-[62ch]" style={{ color: 'var(--scs-stone)' }}>
            Personal training is available for members who want structured programming, technique work, or a
            starting plan built around their goals.
          </p>
          <Link
            to="/personal-training"
            className={`text-sm font-semibold inline-flex items-center gap-2 transition-opacity hover:opacity-80 ${FOCUS_DARK}`}
            style={{ color: 'var(--scs-clay)' }}
          >
            Ask About Personal Training <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* ------------------------------------------------------------------
          6. MEMBERSHIP SHAPES. A ruled definition list, not cards, not a trio
          of tiles. No prices here: the membership page owns those.
          Mobile: dt above dd, one column.
      ------------------------------------------------------------------- */}
      <section className="py-16 sm:py-20" style={{ backgroundColor: 'var(--scs-bg)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="font-display text-2xl sm:text-3xl mb-4" style={{ color: 'var(--scs-text)' }}>
            Memberships built around how you train.
          </h2>
          <p className="text-sm leading-relaxed mb-8 max-w-[58ch]" style={{ color: 'var(--scs-text-muted)' }}>
            Day passes, monthly plans, and commitment options. Tour the facility to see what is included in each
            plan, or compare them online first.
          </p>
          <dl>
            {shapes.map((shape) => (
              <div
                key={shape.id}
                className="grid grid-cols-1 sm:grid-cols-[minmax(0,13rem)_1fr] gap-x-8 gap-y-1 py-4"
                style={{ borderTop: '1px solid var(--scs-border)' }}
              >
                <dt className="font-display-medium text-base" style={{ color: 'var(--scs-text)' }}>
                  {shape.name}
                </dt>
                <dd className="text-sm leading-relaxed" style={{ color: 'var(--scs-text-muted)' }}>
                  {shape.terms.join('. ')}.
                </dd>
              </div>
            ))}
            <div
              className="grid grid-cols-1 sm:grid-cols-[minmax(0,13rem)_1fr] gap-x-8 gap-y-1 py-4"
              style={{ borderTop: '1px solid var(--scs-border)' }}
            >
              <dt className="font-display-medium text-base" style={{ color: 'var(--scs-text)' }}>
                Couples and weekend
              </dt>
              <dd className="text-sm leading-relaxed" style={{ color: 'var(--scs-text-muted)' }}>
                Two person plans, and Friday through Sunday access for people who train at the weekend.
              </dd>
            </div>
          </dl>
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <Link
              to="/join"
              className={`btn-primary px-6 py-3 text-sm uppercase tracking-wider font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap ${FOCUS_LIGHT}`}
            >
              Compare Memberships <ArrowRight size={14} aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={goToForm}
              className={`btn-outline px-6 py-3 text-sm whitespace-nowrap ${FOCUS_LIGHT}`}
            >
              Book a Free Facility Tour
            </button>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------
          7. THE GYM IN PLAIN TERMS. Entity block, narrow measure.
      ------------------------------------------------------------------- */}
      <section className="py-14" style={{ backgroundColor: 'var(--scs-chalk)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-5">
            <span
              className="w-10 h-10 rounded-full overflow-hidden shrink-0"
              style={{ border: '1px solid var(--scs-border)', padding: '2px' }}
            >
              <img src={LOGO_URL} alt="" className="w-full h-full object-contain" />
            </span>
            <span>
              <span className="font-display-medium text-sm block" style={{ color: 'var(--scs-text)' }}>
                Santa Cruz Strength
              </span>
              <span className="text-xs block" style={{ color: 'var(--scs-text-muted)' }}>
                Strength Gym, Santa Cruz CA
              </span>
            </span>
          </div>
          <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--scs-text-muted)' }}>
            Santa Cruz Strength is a strength training gym at 151 Harvey West Blvd in Santa Cruz, California.
            The facility is equipped for barbell training, powerlifting, and general strength work.
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--scs-text-muted)' }}>
            Coaching is available. Memberships range from day passes to annual plans. The best way to learn
            about the gym is to visit in person.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------------
          8. RECENT POSTS. Conditional on the API returning something.
          Mobile: single column stack.
      ------------------------------------------------------------------- */}
      {blogPosts.length > 0 && (
        <section className="py-14" style={{ backgroundColor: 'var(--scs-bg)', borderTop: '1px solid var(--scs-border)' }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-end justify-between mb-8 gap-4">
              <h2 className="font-display text-xl sm:text-2xl" style={{ color: 'var(--scs-text)' }}>
                Recent posts
              </h2>
              <Link
                to="/blog"
                className={`text-sm font-semibold inline-flex items-center gap-1 shrink-0 ${FOCUS_LIGHT}`}
                style={{ color: 'var(--scs-clay)' }}
              >
                All posts <ArrowRight size={13} aria-hidden="true" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {blogPosts.map((post) => (
                <Link
                  key={post.slug}
                  to={`/blog/${post.slug}`}
                  className={`group flex flex-col ${FOCUS_LIGHT}`}
                  style={{
                    background: 'var(--scs-warm-white)',
                    border: '1px solid var(--scs-border)',
                    borderRadius: 'var(--scs-radius)',
                    overflow: 'hidden',
                  }}
                >
                  {post.cover_image && (
                    <span className="h-40 overflow-hidden scs-photo block">
                      <img src={post.cover_image} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </span>
                  )}
                  <span className="p-5 block">
                    <span
                      className="text-[11px] font-semibold block mb-2"
                      style={{ color: 'var(--scs-text-muted)' }}
                    >
                      {post.category}
                    </span>
                    <span
                      className="text-sm font-semibold block mb-2 group-hover:opacity-80"
                      style={{ color: 'var(--scs-text)' }}
                    >
                      {stripDashes(post.title)}
                    </span>
                    <span className="text-xs leading-relaxed block" style={{ color: 'var(--scs-text-muted)' }}>
                      {stripDashes(post.excerpt).slice(0, 100)}
                      {stripDashes(post.excerpt).length > 100 ? '...' : ''}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------------------
          9. BOOK THE VISIT. The resolution. Form left with the two answers
          already given, contact and map right.
          Mobile: form above the contact block, map full width.
      ------------------------------------------------------------------- */}
      <section className="py-16 sm:py-20" style={{ backgroundColor: 'var(--scs-charcoal)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7">
            <div
              className="p-6 sm:p-8"
              style={{
                background: 'var(--scs-warm-white)',
                borderRadius: 'var(--scs-radius)',
                border: '1px solid var(--scs-border)',
              }}
            >
              <RoutedTourForm
                source="book_a_tour"
                answers={answers}
                onAnswer={setAnswer}
                headingRef={formHeadingRef}
              />
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col">
            <div className="flex items-center gap-3 mb-5">
              <span
                className="w-10 h-10 rounded-full overflow-hidden shrink-0"
                style={{ border: '1px solid var(--scs-border-dark)', padding: '2px' }}
              >
                <img
                  src={LOGO_URL}
                  alt=""
                  className="w-full h-full object-contain"
                  style={{ filter: 'brightness(0) invert(1)' }}
                />
              </span>
              <span>
                <span className="font-display-medium text-sm block" style={{ color: 'var(--scs-chalk)' }}>
                  Santa Cruz Strength
                </span>
                <span className="text-xs block" style={{ color: 'var(--scs-stone)' }}>
                  Strength Gym
                </span>
              </span>
            </div>

            <ul className="space-y-3 mb-5">
              <li data-testid="contact-address-block" className="flex items-start gap-2">
                <MapPin size={14} aria-hidden="true" className="mt-1 shrink-0" style={{ color: 'var(--scs-stone)' }} />
                <span className="text-sm" style={{ color: 'var(--scs-chalk)' }}>
                  {GYM_CONFIG.address.full}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Phone size={14} aria-hidden="true" className="mt-1 shrink-0" style={{ color: 'var(--scs-stone)' }} />
                <a
                  href={GYM_CONFIG.phoneHref}
                  data-testid="contact-click-to-call-button"
                  onClick={() => trackPhoneClick()}
                  className={`text-sm ${FOCUS_DARK}`}
                  style={{ color: 'var(--scs-chalk)' }}
                >
                  {GYM_CONFIG.phone}
                </a>
              </li>
              <li data-testid="contact-hours-block" className="flex items-start gap-2">
                <Clock size={14} aria-hidden="true" className="mt-1 shrink-0" style={{ color: 'var(--scs-stone)' }} />
                <span className="text-xs" style={{ color: 'var(--scs-stone)' }}>
                  Contact for current staffed hours
                </span>
              </li>
            </ul>

            <a
              href={GYM_CONFIG.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`btn-outline px-5 py-2.5 text-sm mb-4 inline-flex items-center gap-2 w-full sm:w-auto justify-center whitespace-nowrap ${FOCUS_DARK}`}
              style={{ borderColor: 'rgba(232,225,214,0.25)', color: 'var(--scs-chalk)' }}
            >
              <MapPin size={13} aria-hidden="true" /> Get Directions
            </a>

            <MapEmbed testId="home-map-embed" className="flex-1 min-h-[280px]" />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------
          10. COMMON QUESTIONS.
      ------------------------------------------------------------------- */}
      <section className="py-14" style={{ backgroundColor: 'var(--scs-bg)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2
            className="font-display text-xl sm:text-2xl mb-6"
            style={{ color: 'var(--scs-text)' }}
            data-testid="home-faq-accordion"
          >
            Common Questions
          </h2>
          <Accordion type="single" collapsible className="space-y-2">
            {FAQ_ITEMS.map((item, index) => (
              <AccordionItem
                key={item.q}
                value={`faq-${index}`}
                className="px-5"
                style={{
                  background: 'var(--scs-warm-white)',
                  border: '1px solid var(--scs-border)',
                  borderRadius: 'var(--scs-radius)',
                }}
              >
                <AccordionTrigger
                  className="text-sm font-semibold py-4 hover:no-underline text-left"
                  style={{ color: 'var(--scs-text)' }}
                >
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed pb-4" style={{ color: 'var(--scs-text-muted)' }}>
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <Footer />
    </div>
  );
}
