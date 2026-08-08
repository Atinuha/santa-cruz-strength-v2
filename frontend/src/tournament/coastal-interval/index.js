// DIRECTION 5, THE COASTAL INTERVAL
//
// Homepage as atmospheric Santa Cruz spatial rhythm, without coastal cliche.
// Dials: DESIGN_VARIANCE 9, MOTION_INTENSITY 7, VISUAL_DENSITY 2.
//
// Coastal here is a condition, not a subject. Nothing on this page depicts a
// coast. There is no wave, no horizon, no sunset ramp, no sand, no palm and no
// second hue. The coast is present only as pace, air, diffuse light and
// interval, and the instruments are spacing, scale, light and timing.
//
// The material rule that governs the whole composition:
//
//     CARBON MEANS YOU ARE INSIDE THE BUILDING.
//     CHALK MEANS YOU ARE OUTSIDE IT, THINKING ABOUT GOING IN.
//
// So carbon appears exactly twice, at the two ends of the page: the doorway you
// look through, and the room you come back to in order to book. Everything
// between is one long bright low contrast passage. That is a deliberate theme
// composition with two motivated transitions, not band alternation.
//
// Every design articulation, every animation justification, the rejected cliche
// list and the ruled specialist conflicts are in README.md beside this file.

import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Clock, MapPin, Phone } from 'lucide-react';

import { GYM_CONFIG } from '../../config';
import { SCS_MEDIA } from '../../config/media';
import { MEMBER_STORIES } from '../../config/testimonials';
import { getBlogPosts, getSiteContent } from '../../lib/api';
import { withoutConsolidated } from '../../seo/consolidatedSlugs';
import { trackBookTourClick } from '../../utils/analytics';
import Footer from '../../components/Footer';
import MapEmbed from '../../components/MapEmbed';
import QuizForm from '../../components/QuizForm';

import Nav from './Nav';
import {
  Beat,
  Frame,
  Grid,
  H1_SIZE,
  H2_SIZE,
  H3_SIZE,
  HAIR,
  HAIR_DARK,
  HAIR_FIRM,
  INK,
  INK_STRONG,
  ON_DARK,
  ON_DARK_QUIET,
  Rest,
  Set,
  body,
  display,
  useDesktop,
} from './rhythm';

// Three photographs, each used exactly once and each smaller than the one
// before. All three are real photographs of this gym. Nothing is generated,
// nothing is stock, and no slot is filled with a substitute subject. What is
// missing is listed in README.md rather than faked.
const HERO_IMG = SCS_MEDIA.heroFacility; // wide interior. Portrait stand in for a landscape asset that does not exist.
const ROOM_IMG = SCS_MEDIA.openGym; // rack and bench row. Phone screenshot with letterbox bars, cropped past them.
const PEOPLE_IMG = SCS_MEDIA.communityFloor; // five real members at the painted seal.

const SET_PAD = 'clamp(5rem, 12vh, 9rem)';

// One photographic grade for the whole page, applied systematically rather than
// per image. Saturation is pulled well down because the real room has a bright
// green painted wall stripe and green beside clay is a genuine colour problem
// (PROJECT-TRUTH 4.4 point 3). At 0.48 the stripe reads as a grey green band
// that sits behind the composition instead of fighting the accent, and the
// photographs read as light rather than as colour. The hero adds brightness on
// top of the same grade because display type sits on it.
const GRADE = 'saturate(0.48) contrast(1.05)';
const HERO_GRADE = 'saturate(0.32) contrast(1.06) brightness(0.58)';

const ROOM_POINTS = [
  'See the full training floor and equipment',
  'Ask about membership options and access',
  'Meet available staff',
  'No paperwork required to visit',
];

const STARTS = [
  {
    title: 'First-time lifter',
    text: 'New to strength training and looking for a place with clear equipment and available guidance.',
  },
  {
    title: 'Independent member',
    text: 'You have your own program. You need a focused space with the right equipment to run it.',
  },
  {
    title: 'Experienced strength athlete',
    text: 'Competing or training at a high level. You need racks, bars, and platforms that match.',
  },
];

// Verbatim, and kept in sync with src/seo/home-schema.json. Changing one of
// these without changing the other breaks structured data truth.
const FAQ_ITEMS = [
  { q: 'Do I need experience to start?', a: 'No. The gym works for people at every level. Staff can help you get oriented.' },
  { q: 'What happens on a facility tour?', a: 'You walk through the space, see the equipment, ask questions, and talk through which membership fits.' },
  { q: 'What equipment is available?', a: 'Power racks, barbells, bumper and iron plates, specialty bars, dumbbells, kettlebells, and conditioning equipment.' },
  { q: 'Is coaching available?', a: 'Staff can help during staffed hours. Structured personal training is a separate service.' },
  { q: 'Where is the gym?', a: '151 Harvey West Blvd Ste D, Santa Cruz, CA 95060. Harvey West Business Park.' },
];

// Three of the six member statements, not six, because this page runs at
// density 2 and six is a grid. Selected by name so the choice is visible and
// traceable, and covering the three distinct claims in the set: the equipment,
// the environment, and personal training. Nothing is edited. The quotes are
// imported rather than copied, so no punctuation of theirs lands in this file.
const QUOTED = ['Jeremy Ball', 'Brooke Rodriguez', 'Ember Lichtenberg'];
const STORIES = QUOTED.map((name) => MEMBER_STORIES.find((story) => story.name === name)).filter(Boolean);

// Written as escapes in the exact form the SEO validator whitelists, because
// the literal characters in a source file fail its first check and a hand
// written escape sequence fails its second. See validate-seo.mjs.
const stripDashes = (value) => (value || '').replace(/[\u2013\u2014]/g, ',');

function Hairline({ className = '', tone = HAIR }) {
  return <span aria-hidden="true" className={`block h-px w-full ${className}`} style={{ background: tone }} />;
}

/* 1. THE DOORWAY.
   Full bleed photographic bed, content bottom left, never centred. Authored for
   a 3:2 landscape interior that does not exist yet; the portrait stand in is
   cropped to keep floor, racks and painted seal in frame. Text safe zone is the
   left 58 percent by bottom 46 percent at desktop and the full width by bottom
   52 percent on mobile. Three text elements: headline, subtext, CTA row.
   Mobile collapse: single column, type at the clamp minimum, CTAs stack full
   width at min-h-11, parallax off. */
function Doorway({ headline, subtitle }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const desktop = useDesktop();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const drift = desktop && !reduce;
  const bedY = useTransform(scrollYProgress, [0, 1], ['0%', drift ? '7%' : '0%']);

  const rise = {
    hidden: reduce ? { opacity: 1 } : { opacity: 0, y: 14 },
    shown: { opacity: 1, y: 0, transition: { duration: 0.64, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <section
      ref={ref}
      data-testid="home-hero"
      className="relative isolate overflow-hidden"
      style={{ backgroundColor: 'var(--scs-carbon)' }}
    >
      {/* The room itself. It drifts slower than the page, so it reads as a place
          you are looking into rather than a banner scrolling past. */}
      <motion.div
        aria-hidden="true"
        className="absolute left-0 right-0"
        style={{
          top: '-8%',
          height: '116%',
          y: bedY,
          backgroundImage: `url(${HERO_IMG})`,
          backgroundSize: 'cover',
          backgroundPosition: desktop ? '26% 72%' : '50% 64%',
          backgroundRepeat: 'no-repeat',
          filter: HERO_GRADE,
        }}
      />
      {/* Scrims. Carbon only, opacity ramps only, no second hue anywhere. Text
          over photography always sits on one of these. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(100deg, rgba(12,12,11,0.88) 0%, rgba(12,12,11,0.62) 46%, rgba(12,12,11,0.30) 100%)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(12,12,11,0.86) 0%, rgba(12,12,11,0) 56%)' }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-40"
        style={{ background: 'linear-gradient(to bottom, rgba(12,12,11,0.72) 0%, rgba(12,12,11,0) 100%)' }}
      />

      {/* Bottom padding never drops below 5rem, because the analytics consent
          bar lives at the foot of the viewport until it is answered and the CTA
          row must not end up behind it on a short screen. Top padding is pt-24,
          the cap, and it exists only to clear the fixed navigation. */}
      <motion.div
        className="relative flex items-end pt-24 pb-[clamp(5rem,12vh,7.5rem)]"
        style={{ minHeight: '100dvh' }}
        initial="hidden"
        animate="shown"
        variants={{ hidden: {}, shown: { transition: { staggerChildren: desktop ? 0.12 : 0.08, delayChildren: 0.08 } } }}
      >
        <Frame>
          <Grid>
            <div className="col-span-12 lg:col-span-8">
              <motion.h1 variants={rise} style={{ ...display(H1_SIZE), color: 'var(--scs-chalk)' }}>
                {headline}
              </motion.h1>
              <motion.p
                variants={rise}
                className="mt-6 max-w-[46ch]"
                style={{ ...body('rgba(232,225,214,0.82)') }}
              >
                {subtitle}
              </motion.p>
              <motion.div variants={rise} className="mt-10 flex flex-col sm:flex-row sm:items-center gap-3">
                <Link
                  to="/contact"
                  data-testid="home-hero-book-visit-button"
                  onClick={() => trackBookTourClick('hero')}
                  className="btn-clay px-7 py-3.5 text-sm min-h-11 inline-flex items-center justify-center gap-2 whitespace-nowrap active:translate-y-px"
                >
                  Book a Free Facility Tour
                  <ArrowRight size={15} />
                </Link>
                <Link
                  to="/join"
                  className="btn-outline px-7 py-3.5 text-sm min-h-11 inline-flex items-center justify-center whitespace-nowrap active:translate-y-px"
                  style={{ borderColor: 'rgba(232,225,214,0.42)', color: 'var(--scs-chalk)' }}
                >
                  Compare Memberships
                </Link>
              </motion.div>
            </div>
          </Grid>
        </Frame>
      </motion.div>
    </section>
  );
}

/* 2. THE ROOM. Offset bleed. Copy left, photograph running off the right edge.
   The only image plus text split on the page.
   Mobile collapse: photograph moves below the copy, full width, no bleed. */
function TheRoom() {
  return (
    <Set className="relative overflow-hidden" style={{ background: 'var(--scs-chalk)', paddingTop: SET_PAD, paddingBottom: SET_PAD }}>
      <Frame>
        <Grid className="items-center gap-y-12">
          <div className="col-span-12 lg:col-span-6">
            <Beat>
              <h2 style={{ ...display(H2_SIZE), color: INK_STRONG }}>
                Walk through the space. Ask how access works. Leave with a clear answer.
              </h2>
            </Beat>
            <Beat className="mt-10">
              <ul>
                {ROOM_POINTS.map((point) => (
                  <li key={point} className="mb-9 last:mb-0">
                    <span aria-hidden="true" className="block h-px w-5 mb-3" style={{ background: HAIR_FIRM }} />
                    <span style={body()}>{point}</span>
                  </li>
                ))}
              </ul>
            </Beat>
            <Beat className="mt-12">
              <Link
                to="/contact"
                className="btn-clay px-7 py-3.5 text-sm min-h-11 inline-flex items-center gap-2 whitespace-nowrap active:translate-y-px"
              >
                Book a Free Facility Tour
                <ArrowRight size={15} />
              </Link>
            </Beat>
          </div>

          <div className="col-span-12 lg:col-span-5 lg:col-start-8">
            {/* The bleed. Underscores are Tailwind's escape for the spaces calc
                requires around a plus sign. The section clips it, so a wide
                viewport never gains a horizontal scrollbar.
                The frame is portrait because the source is: racks.jpg is a
                1080x1974 phone frame with a thin black bar at the top. A
                landscape crop of it is a zoomed slice of one bench, so the
                composition takes the photograph's own orientation and puts a
                tall image against the copy instead of fighting it. Position
                40 percent lands on the painted seal, the plate cradle and the
                platform, and clears the bar. */}
            <Beat className="lg:w-[calc(100%_+_clamp(1rem,7vw,9rem))]">
              <img
                src={ROOM_IMG}
                alt="Squat stands, flat benches and plate storage along the Santa Cruz Strength training floor"
                loading="lazy"
                className="w-full object-cover"
                style={{
                  aspectRatio: '3 / 4',
                  objectPosition: 'center 40%',
                  borderRadius: 'var(--scs-radius)',
                  filter: GRADE,
                }}
              />
            </Beat>
          </div>
        </Grid>
      </Frame>
    </Set>
  );
}

/* 3. THREE STARTS. Uneven triad, no cards, no numerals, no dots. Column widths
   are deliberately unequal so this reads as an asymmetric grid rather than as
   the three identical feature cards every generated page ships.
   Mobile collapse: single column, the vertical hairlines become top hairlines. */
function ThreeStarts() {
  return (
    <Set style={{ background: 'var(--scs-chalk)', paddingTop: SET_PAD, paddingBottom: SET_PAD }}>
      <Frame>
        <Grid>
          <div className="col-span-12 lg:col-span-10 lg:col-start-2">
            <Beat>
              <h2 className="max-w-[16ch]" style={{ ...display(H2_SIZE), color: INK_STRONG }}>
                Three ways people start here.
              </h2>
            </Beat>
            <div className="mt-14 grid grid-cols-1 md:grid-cols-[1.15fr_0.95fr_0.85fr]">
              {STARTS.map((start, index) => (
                <Beat
                  key={start.title}
                  className={[
                    index === 0 ? 'md:pr-[clamp(1.5rem,3vw,3.5rem)]' : '',
                    index === 1 ? 'md:px-[clamp(1.5rem,3vw,3.5rem)] md:border-l' : '',
                    index === 2 ? 'md:pl-[clamp(1.5rem,3vw,3.5rem)] md:border-l' : '',
                    index > 0 ? 'mt-11 pt-11 border-t md:mt-0 md:pt-0 md:border-t-0' : '',
                  ].join(' ')}
                  style={{ borderColor: HAIR }}
                >
                  <h3 style={{ ...display(H3_SIZE), color: INK_STRONG }}>{start.title}</h3>
                  <p className="mt-4" style={{ ...body(), fontSize: '1rem' }}>
                    {start.text}
                  </p>
                </Beat>
              ))}
            </div>
          </div>
        </Grid>
      </Frame>
    </Set>
  );
}

/* 4. THE PEOPLE. Three real member statements at three different measures and
   three different offsets. DM Sans italic is loaded in this project and used
   nowhere else on the site; it is reserved here and appears in no other role.
   The one photograph of members on this page is the smallest image on it.
   Mobile collapse: single column, offsets removed, photograph above the first
   statement at full container width. */
function ThePeople() {
  const offsets = [
    'lg:col-span-6 lg:col-start-1',
    'lg:col-span-5 lg:col-start-6',
    'lg:col-span-6 lg:col-start-3',
  ];
  const measures = ['42ch', '38ch', '40ch'];

  return (
    <Set style={{ background: 'var(--scs-chalk)', paddingTop: SET_PAD, paddingBottom: SET_PAD }}>
      <Frame>
        <Grid className="gap-y-10">
          <div className="col-span-12 lg:col-span-6">
            <Beat>
              <h2 style={{ ...display(H2_SIZE), color: INK_STRONG }}>Hear it from the members.</h2>
              <p className="mt-4 text-sm" style={{ color: 'var(--scs-stone)' }}>
                Published on our site as written. Nothing edited.
              </p>
            </Beat>
          </div>
          <div className="col-span-12 md:col-span-5 md:col-start-8 lg:col-span-4 lg:col-start-9">
            <Beat>
              <img
                src={PEOPLE_IMG}
                alt="Five Santa Cruz Strength members standing together in front of the painted gym seal"
                loading="lazy"
                className="w-full object-cover md:max-w-[360px] md:ml-auto"
                style={{
                  aspectRatio: '3 / 2',
                  objectPosition: 'center 34%',
                  borderRadius: 'var(--scs-radius)',
                  filter: GRADE,
                }}
              />
            </Beat>
          </div>
        </Grid>

        <Grid className="mt-[clamp(3rem,7vh,5.5rem)]">
          {STORIES.map((story, index) => (
            <Beat
              key={story.name}
              className={`col-span-12 ${offsets[index]} ${index > 0 ? 'mt-[clamp(3rem,7vh,5.5rem)]' : ''}`}
            >
              <figure>
                <blockquote>
                  <p
                    className="italic"
                    style={{ fontSize: '1.0625rem', lineHeight: 1.7, color: INK, maxWidth: measures[index] }}
                  >
                    {story.quote}
                  </p>
                </blockquote>
                <figcaption className="mt-5">
                  <span className="block h-px w-8 mb-3" style={{ background: HAIR_FIRM }} />
                  <span className="block text-sm font-semibold" style={{ color: INK_STRONG }}>
                    {story.name}
                  </span>
                  <span className="block text-xs mt-0.5" style={{ color: 'var(--scs-stone)' }}>
                    {story.detail}
                  </span>
                </figcaption>
              </figure>
            </Beat>
          ))}
        </Grid>
      </Frame>
    </Set>
  );
}

/* 5. WHAT IS AVAILABLE. Offset two beat ledger. The two beats start at
   different columns and a single hairline separates them, which is the set and
   rest rhythm compressed to the scale of one section.
   Mobile collapse: single column, both beats start at the left edge. */
function WhatIsAvailable() {
  return (
    <Set style={{ background: 'var(--scs-chalk)', paddingTop: SET_PAD, paddingBottom: SET_PAD }}>
      <Frame>
        <Grid>
          <Beat className="col-span-12 lg:col-span-6 lg:col-start-3">
            <h2 style={{ ...display(H2_SIZE), color: INK_STRONG }}>Practical coaching for people who want a plan.</h2>
            <p className="mt-6 max-w-[46ch]" style={body()}>
              Personal training is available for members who want structured programming, technique work, or a starting
              plan built around their goals.
            </p>
            <Link
              to="/personal-training"
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold min-h-11 transition-opacity duration-200 hover:opacity-75 active:translate-y-px"
              style={{ color: 'var(--scs-clay)' }}
            >
              Ask About Personal Training
              <ArrowRight size={15} />
            </Link>
          </Beat>

          <Beat className="col-span-12 lg:col-span-9 lg:col-start-3 my-[clamp(3rem,8vh,5.5rem)]">
            <Hairline />
          </Beat>

          <Beat className="col-span-12 lg:col-span-6 lg:col-start-6">
            <h2 style={{ ...display(H2_SIZE), color: INK_STRONG }}>Memberships built around how you train.</h2>
            <p className="mt-6 max-w-[46ch]" style={body()}>
              Day passes, monthly plans, and commitment options. Tour the facility to see what is included in each plan.
            </p>
            <Link
              to="/join"
              className="btn-primary mt-8 px-7 py-3.5 text-sm min-h-11 inline-flex items-center gap-2 whitespace-nowrap active:translate-y-px"
            >
              Compare Memberships
              <ArrowRight size={15} />
            </Link>
          </Beat>
        </Grid>
      </Frame>
    </Set>
  );
}

/* 6. QUESTIONS. Open list, not an accordion. At density 2 there is room to
   answer the question rather than to hide the answer behind a click, and an
   open list is also what a language model can read.
   The home-faq-accordion testid stays on the heading, where it already lives.
   Mobile collapse: question stacks above answer, hairline above each pair from
   the second onward. */
function Questions() {
  return (
    <Set style={{ background: 'var(--scs-chalk)', paddingTop: SET_PAD, paddingBottom: SET_PAD }}>
      <Frame>
        <Grid>
          <div className="col-span-12 lg:col-span-10">
            <Beat>
              <h2 data-testid="home-faq-accordion" style={{ ...display(H2_SIZE), color: INK_STRONG }}>
                Common Questions
              </h2>
            </Beat>
            <dl className="mt-12">
              {FAQ_ITEMS.map((item, index) => (
                <Beat
                  key={item.q}
                  className={index > 0 ? 'mt-10 pt-10 border-t' : ''}
                  style={index > 0 ? { borderColor: HAIR } : undefined}
                >
                  <div className="grid grid-cols-12" style={{ columnGap: 'clamp(1.5rem, 3vw, 3rem)' }}>
                    <dt className="col-span-12 md:col-span-4">
                      <span style={{ ...display(H3_SIZE), color: INK_STRONG, display: 'block' }}>{item.q}</span>
                    </dt>
                    <dd className="col-span-12 md:col-span-7 md:col-start-6 mt-3 md:mt-0">
                      <span style={{ ...body(), display: 'block', maxWidth: '52ch' }}>{item.a}</span>
                    </dd>
                  </div>
                </Beat>
              ))}
            </dl>
          </div>
        </Grid>
      </Frame>
    </Set>
  );
}

/* 7. RECENT POSTS. Hairline rows, not cards. Conditional on the API returning
   posts, and en dashes and em dashes are stripped out of API copy at render,
   exactly as the shipped page does.
   Mobile collapse: rows stack, All posts moves below the list and is visible. */
function RecentPosts({ posts }) {
  if (!posts.length) return null;
  return (
    <>
      <Rest />
      <Set style={{ background: 'var(--scs-chalk)', paddingTop: SET_PAD, paddingBottom: SET_PAD }}>
        <Frame>
          <Grid>
            <div className="col-span-12 lg:col-span-8 lg:col-start-2">
              <Beat>
                <h2 style={{ ...display(H2_SIZE), color: INK_STRONG }}>Recent Posts</h2>
              </Beat>
              <div className="mt-10">
                {posts.map((post, index) => (
                  <Beat key={post.slug} className={index > 0 ? 'border-t' : ''} style={index > 0 ? { borderColor: HAIR } : undefined}>
                    <Link
                      to={`/blog/${post.slug}`}
                      className="group block py-7 transition-opacity duration-200 hover:opacity-70"
                    >
                      {post.category ? (
                        <span className="block text-xs mb-2" style={{ color: 'var(--scs-stone)' }}>
                          {stripDashes(post.category)}
                        </span>
                      ) : null}
                      <span className="block text-base font-semibold" style={{ color: INK_STRONG }}>
                        {stripDashes(post.title)}
                      </span>
                    </Link>
                  </Beat>
                ))}
              </div>
              <Beat className="mt-8">
                <Link
                  to="/blog"
                  className="inline-flex items-center gap-2 text-sm font-semibold min-h-11 transition-opacity duration-200 hover:opacity-75"
                  style={{ color: 'var(--scs-clay)' }}
                >
                  All posts
                  <ArrowRight size={14} />
                </Link>
              </Beat>
            </div>
          </Grid>
        </Frame>
      </Set>
    </>
  );
}

/* 8. THE VISIT. The second and last carbon chamber. You are back inside the
   building, and this is where the visit is booked. One card surface exists on
   the whole page and it is this form panel.
   The address, phone and directions link stay outside the map frame so the
   useful information survives a blocked or slow Google.
   Mobile collapse: form panel first, then the entity block and contact list,
   then the map. */
function TheVisit() {
  return (
    <Set
      className="relative"
      style={{ background: 'var(--scs-carbon)', paddingTop: SET_PAD, paddingBottom: 'clamp(4rem, 10vh, 7rem)' }}
    >
      <Frame>
        <Grid className="gap-y-14">
          <Beat className="col-span-12 lg:col-span-6">
            <div
              className="p-6 sm:p-8"
              style={{ background: 'var(--scs-warm-white)', borderRadius: 'var(--scs-radius)' }}
            >
              <h2 style={{ ...display(H2_SIZE), color: INK_STRONG }}>Request Your Free Facility Tour</h2>
              <p className="mt-3 mb-7 text-sm" style={{ color: INK }}>
                Fill out the form and a team member will follow up.
              </p>
              <QuizForm source="book_a_tour" noAutoFocus />
            </div>
          </Beat>

          <div className="col-span-12 lg:col-span-5 lg:col-start-8 flex flex-col">
            <Beat>
              <p style={{ ...body(ON_DARK), maxWidth: '46ch' }}>
                Santa Cruz Strength is a strength training gym at 151 Harvey West Blvd in Santa Cruz, California. The
                facility is equipped for barbell training, powerlifting, and general strength work.
              </p>
              <p className="mt-5" style={{ ...body(ON_DARK), maxWidth: '46ch' }}>
                Coaching is available. Memberships range from day passes to annual plans. The best way to learn about the
                gym is to visit in person.
              </p>
            </Beat>

            <Beat className="mt-10">
              <Hairline tone={HAIR_DARK} />
              <ul className="mt-8 space-y-4">
                <li data-testid="contact-address-block" className="flex items-start gap-3">
                  <MapPin size={16} style={{ color: 'var(--scs-stone)', marginTop: 3 }} />
                  <span className="text-sm" style={{ color: 'var(--scs-chalk)' }}>
                    {GYM_CONFIG.address.full}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Phone size={16} style={{ color: 'var(--scs-stone)', marginTop: 3 }} />
                  <a
                    href={GYM_CONFIG.phoneHref}
                    data-testid="contact-click-to-call-button"
                    className="text-sm transition-opacity duration-200 hover:opacity-75"
                    style={{ color: 'var(--scs-chalk)' }}
                  >
                    {GYM_CONFIG.phone}
                  </a>
                </li>
                <li data-testid="contact-hours-block" className="flex items-start gap-3">
                  <Clock size={16} style={{ color: 'var(--scs-stone)', marginTop: 3 }} />
                  <span className="text-sm" style={{ color: ON_DARK_QUIET }}>
                    Contact for current staffed hours
                  </span>
                </li>
              </ul>
            </Beat>

            <Beat className="mt-8">
              <a
                href={GYM_CONFIG.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline px-6 py-3 text-sm min-h-11 inline-flex items-center gap-2 whitespace-nowrap active:translate-y-px"
                style={{ borderColor: 'rgba(232,225,214,0.32)', color: 'var(--scs-chalk)' }}
              >
                <MapPin size={14} />
                Get Directions
              </a>
            </Beat>

            <Beat className="mt-8 flex-1">
              <MapEmbed testId="home-map-embed" className="min-h-[280px] h-full" />
            </Beat>
          </div>
        </Grid>
      </Frame>
    </Set>
  );
}

export default function CoastalInterval() {
  const [content, setContent] = useState({});
  const [posts, setPosts] = useState([]);
  const copy = (key, approved) => content[key] || approved;

  useEffect(() => {
    getSiteContent()
      .then(({ data }) => setContent(data))
      .catch(() => {});
    // Ask for more than three, drop the consolidated ones, then take three, so
    // the page cannot link both halves of a cross canonical duplicate pair.
    getBlogPosts({ limit: 8 })
      .then((response) => setPosts(withoutConsolidated(response.data.posts || []).slice(0, 3)))
      .catch(() => {});
  }, []);

  return (
    <div style={{ background: 'var(--scs-chalk)' }}>
      <Nav />

      <Doorway
        headline={copy('home_hero_headline_v2', 'A Santa Cruz strength gym you can see before you join.')}
        subtitle={copy(
          'home_hero_subtitle_v2',
          'See the racks, platforms, training floor, and access setup before you choose a membership.',
        )}
      />

      <Rest />
      <TheRoom />
      <Rest />
      <ThreeStarts />
      <Rest />
      <ThePeople />
      <Rest />
      <WhatIsAvailable />
      <Rest />
      <Questions />

      <RecentPosts posts={posts} />

      <Rest />
      <TheVisit />

      <Footer />
    </div>
  );
}
