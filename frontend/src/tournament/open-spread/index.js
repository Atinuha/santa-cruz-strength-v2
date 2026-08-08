import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import QuizForm from '../../components/QuizForm';
import MapEmbed from '../../components/MapEmbed';
import { GYM_CONFIG } from '../../config';
import { SCS_MEDIA } from '../../config/media';
import { MEMBER_STORIES } from '../../config/testimonials';
import { getSiteContent, getBlogPosts } from '../../lib/api';
import { withoutConsolidated } from '../../seo/consolidatedSlugs';
import { trackBookTourClick } from '../../utils/analytics';
import { ArrowRight, MapPin, Phone, Clock } from 'lucide-react';
import './open-spread.css';

/* ===========================================================================
 * DIRECTION 2, THE OPEN SPREAD
 * Homepage as an editorial story. VARIANCE 7, MOTION 4, DENSITY 3.
 *
 * The thesis: the visitor's real question is whether they will belong here, so
 * this page answers it by telling the gym's own history in reading order, in
 * the gym's own published words, and asks for exactly one thing at the end.
 *
 * The full articulation, the reserved hero brief, the photography still
 * needed, and the conflicts I found in project truth are all in README.md
 * beside this file.
 * ========================================================================= */

/* ---------------------------------------------------------------------------
 * PHOTOGRAPHS
 * Three of the five real frames. coachingCrew is deliberately absent: project
 * truth 4.4.1 records that it and communityGroup are two frames of the same
 * five people at the same backdrop from the same setup, and a page with this
 * much air would expose that. One frame, used once, at full bleed, is stronger.
 * The five portraits are absent too, because setting a trainer's portrait
 * beside a member's words would be an attribution lie by adjacency.
 * ------------------------------------------------------------------------- */
const HERO_PLATE = SCS_MEDIA.heroFacility;    // the training floor, portrait, 1080x1440
const ROOM_PLATE = SCS_MEDIA.communityGroup;  // members and staff, Iron Roses 2026
const RACKS_PLATE = SCS_MEDIA.openGym;        // rack and bench row, plate storage

/* ---------------------------------------------------------------------------
 * COPY
 *
 * Nothing here is invented. The story sentences are verbatim from the seeded
 * CMS value of `about_story` at backend/server.py:4812, which is the business
 * writing about itself in the first person. They are rearranged into reading
 * order and nothing else.
 *
 * They are held as constants rather than read through copy(). `about_story` is
 * one long newline separated blob, and slicing a blob into fragments at render
 * time breaks the moment somebody edits a paragraph in the CMS. If this
 * direction ships, the honest fix is to seed the fragments this page actually
 * uses as their own keys, which is a backend change and outside a candidate's
 * boundary. Recorded in README.md rather than faked with keys that would never
 * resolve.
 *
 * One sentence from that block is omitted on purpose. "Today, Santa Cruz
 * Strength is a place where you can train hard and get stronger, whether
 * you're experienced or just getting started." is the owner's own line, but it
 * lands one word from a banned construction and the sentences around it carry
 * the same meaning.
 * ------------------------------------------------------------------------- */
const STORY = {
  lede: 'Santa Cruz Strength has been part of this community for over 13 years.',
  run: [
    'We were originally built as a space for powerlifting, strongman, and Olympic weightlifting. It was a place for strength athletes deeply committed to their training who wanted to take it seriously.',
    'That foundation still matters. It shaped how we train, the equipment we use, and the respect we have for strength as a practice.',
    'Over time, the gym became more than a place to train. People stayed, built relationships, and supported each other. For many, it became a space where they found a sense of belonging they had not experienced in other gyms.',
    "We welcome people across all levels of experience, and we're proud that our community includes a strong base of women and queer members. You'll find people here lifting heavy and training consistently, as well as people learning, returning, or building a new relationship with movement. All belong here.",
  ],
  close: "This gym has always been about strength. Now, it's also about making that strength more accessible.",
};

/* What a facility tour actually is. Approved copy, carried over verbatim from
 * the current homepage. */
const VISIT_BODY =
  'A facility tour lets you see every part of the gym, see the equipment and ask what is available, and talk to staff before you decide anything.';
const VISIT_ITEMS = [
  'See the full training floor and equipment',
  'Ask about membership options and access',
  'Meet available staff',
  'No paperwork required to visit',
];

/* The five pairs, verbatim, kept in sync with src/seo/home-schema.json. Editing
 * one without the other breaks structured data truth. */
const FAQ_ITEMS = [
  { q: 'Do I need experience to start?', a: 'No. The gym works for people at every level. Staff can help you get oriented.' },
  { q: 'What happens on a facility tour?', a: 'You walk through the space, see the equipment, ask questions, and talk through which membership fits.' },
  { q: 'What equipment is available?', a: 'Power racks, barbells, bumper and iron plates, specialty bars, dumbbells, kettlebells, and conditioning equipment.' },
  { q: 'Is coaching available?', a: 'Staff can help during staffed hours. Structured personal training is a separate service.' },
  { q: 'Where is the gym?', a: '151 Harvey West Blvd Ste D, Santa Cruz, CA 95060. Harvey West Business Park.' },
];

/* Three of the six member statements, chosen and not edited.
 *
 * Chosen because all three speak to belonging, which is what this direction
 * argues the visitor is actually asking about. Chosen also because these three
 * carry no dash characters, so this page renders none while nobody has to edit
 * a real customer's punctuation. src/config/testimonials.js is the only file in
 * the repo exempted from the dash validator, for exactly that reason.
 *
 * Selected by name rather than by regex so the choice stays a visible editorial
 * decision that a reviewer can argue with. */
const VOICE_NAMES = ['Ella Desmond', 'Brooke Rodriguez', 'Ember Lichtenberg'];
const VOICES = VOICE_NAMES
  .map((name) => MEMBER_STORIES.find((story) => story.name === name))
  .filter(Boolean);

/* ---------------------------------------------------------------------------
 * MOTION, intensity 4.
 *
 * One reveal. It communicates the reading order of an asymmetric composition,
 * where the first thing to read is not obvious from position alone. Transform
 * and opacity only, once per element, no scroll listener, no state per frame.
 *
 * Reduced motion is handled in the stylesheet by scoping the offset and the
 * transition to prefers-reduced-motion: no-preference, so the class is inert
 * under reduce. The one-shot fallback below covers the browser with no
 * IntersectionObserver, where the elements would otherwise stay hidden.
 * ------------------------------------------------------------------------- */
function useReadingOrderReveal() {
  const root = useRef(null);

  useEffect(() => {
    const scope = root.current;
    if (!scope) return undefined;
    const targets = Array.from(scope.querySelectorAll('.os-rise'));
    if (!targets.length) return undefined;

    if (typeof IntersectionObserver === 'undefined') {
      targets.forEach((el) => el.classList.add('os-in'));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('os-in');
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return root;
}

/* Reading order index, expressed as a delay. Nothing above the fold uses it. */
const order = (index) => ({ '--os-delay': `${index * 90}ms` });

export default function OpenSpreadHome() {
  const [c, setC] = useState({});
  const copy = (key, approved) => c[key] || approved;
  const [blogPosts, setBlogPosts] = useState([]);
  const root = useReadingOrderReveal();

  useEffect(() => {
    getSiteContent().then(({ data }) => setC(data)).catch(() => {});
    // Ask for more than three, drop the consolidated ones, then take three.
    // Unfiltered, the homepage could link both cross canonical duplicates:
    // every post shares one seed timestamp, so the sort tie break is arbitrary.
    getBlogPosts({ limit: 8 })
      .then((r) => setBlogPosts(withoutConsolidated(r.data.posts || []).slice(0, 3)))
      .catch(() => {});
  }, []);

  // API copy is sanitised on the way in, the same way the current homepage does
  // it. The escaped character class is the sanctioned form.
  const plain = (value) => (value || '').replace(/[\u2013\u2014]/g, ',');

  return (
    <div ref={root} className="min-h-screen" style={{ background: 'var(--scs-bg)' }}>
      <Navbar />

      {/* =====================================================================
        * 1. HERO. Two leaf spread, type recto, plate verso.
        *
        * Reserved composition. The plate leaf is built around the real asset's
        * portrait ratio rather than cropping it into a landscape shape it does
        * not have. No type ever crosses the photograph, so contrast is
        * guaranteed by construction and the frame needs no scrim and no
        * dimming filter.
        *
        * Viewport: pt-16 clears the fixed 64px navbar and nothing else, band is
        * calc(100dvh - 4rem) capped at 820px, so navbar plus hero is exactly
        * one viewport at desktop.
        *
        * Text elements: three. Headline, subtext, CTA pair.
        *
        * MOBILE COLLAPSE, below lg: the grid becomes a single column, the type
        * block takes py-14, and the plate follows it as a 16:9 band at object
        * position center 45%.
        * ================================================================== */}
      <section data-testid="home-hero" className="pt-16" style={{ background: 'var(--scs-bg)' }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12">
          <div className="lg:grid lg:grid-cols-12 lg:gap-10 lg:min-h-[calc(100dvh_-_4rem)] lg:max-h-[820px]">

            {/* Type leaf. Bottom weighted, as the approved design is. */}
            <div className="lg:col-span-6 xl:col-span-5 flex flex-col justify-end py-14 lg:py-20">
              <h1
                className="os-display text-[2.375rem] sm:text-[3rem] lg:text-[3.5rem] leading-[0.98] mb-6"
                style={{ color: 'var(--scs-text)' }}
              >
                {copy('home_hero_headline_v2', 'A Santa Cruz strength gym you can see before you join.')}
              </h1>

              <p className="os-lede os-muted mb-9">
                {copy(
                  'home_hero_subtitle_v2',
                  'See the racks, platforms, training floor, and access setup before you choose a membership.',
                )}
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <Link
                  to="/contact"
                  data-testid="home-hero-book-visit-button"
                  onClick={() => trackBookTourClick('hero')}
                  className="btn-clay os-press px-6 sm:px-7 py-3.5 text-sm font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  Book a Free Facility Tour
                  <ArrowRight size={15} />
                </Link>
                <Link
                  to="/join"
                  className="btn-outline os-press px-6 sm:px-7 py-3.5 text-sm inline-flex items-center justify-center whitespace-nowrap"
                >
                  Compare Memberships
                </Link>
              </div>
            </div>

            {/* Plate leaf. 3:4 portrait at lg and up, full height of the band. */}
            <div className="lg:col-span-6 xl:col-span-7 pb-14 lg:pb-0">
              <div className="os-plate h-full">
                <img
                  src={HERO_PLATE}
                  alt="The Santa Cruz Strength training floor, with power racks, benches, plate storage and lifting platforms under the painted wall seal"
                  className="w-full h-56 sm:h-72 lg:h-full object-cover"
                  style={{ objectPosition: 'center 38%' }}
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* =====================================================================
        * 2. THE STORY. Offset text column plus a marginal note.
        * Opens on column 2. The standfirst is the section opening; there is no
        * eyebrow anywhere on this page.
        *
        * MOBILE COLLAPSE: single column. The marginal note moves below the run
        * and gains a hairline above it so it still reads as an aside.
        * ================================================================== */}
      <section className="py-24 sm:py-32 lg:py-40" style={{ background: 'var(--scs-bg)' }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12">
          <div className="lg:grid lg:grid-cols-12 lg:gap-10">

            <div className="lg:col-start-2 lg:col-span-7">
              <h2
                className="os-display text-[1.75rem] sm:text-[2rem] leading-[1.05] mb-8 os-rise"
                style={{ color: 'var(--scs-text)' }}
              >
                How this gym got here.
              </h2>

              <p className="os-lede mb-10 os-rise" style={{ color: 'var(--scs-text)', ...order(1) }}>
                {STORY.lede}
              </p>

              <div className="os-rise" style={order(2)}>
                {STORY.run.map((paragraph) => (
                  <p key={paragraph.slice(0, 24)} className="os-read os-muted">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>

            {/* Marginal note. Top aligned to the paragraph run it annotates. */}
            <aside className="lg:col-start-10 lg:col-span-3 mt-12 lg:mt-[8.5rem] pt-6 lg:pt-0 border-t lg:border-t-0 os-rise" style={order(3)}>
              <p className="os-note os-muted">
                Every photograph on this page was taken at {GYM_CONFIG.address.street}. Nothing here is stock and nothing here is generated.
              </p>
            </aside>

          </div>
        </div>
      </section>

      {/* =====================================================================
        * 3. THE ROOM. Full bleed plate, caption in the left margin below it.
        * Opens on column 1. This is a plate, not a split: no type sits beside
        * the photograph.
        *
        * MOBILE COLLAPSE: the plate keeps its aspect and the caption follows it
        * at full width.
        * ================================================================== */}
      <section className="pb-24 sm:pb-32 lg:pb-40" style={{ background: 'var(--scs-bg)' }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12">
          <figure className="os-rise">
            <div className="os-plate">
              <img
                src={ROOM_PLATE}
                alt="Five members and staff of Santa Cruz Strength standing together in Iron Roses 2026 shirts in front of a backdrop tiled with the gym seal"
                className="w-full h-64 sm:h-[26rem] lg:h-[34rem] object-cover os-square"
                style={{ objectPosition: 'center 32%' }}
                loading="lazy"
              />
            </div>
            <figcaption className="os-note os-muted mt-5 lg:max-w-[42ch]">
              Members and staff at the Iron Roses 2026 meet, on the training floor.
            </figcaption>
          </figure>
        </div>
      </section>

      {/* =====================================================================
        * 4. THE BLACK PLATE. The signature move.
        *
        * The page is chalk paper from the hero to the footer with this one
        * exception. One carbon spread, one sentence, at display scale, alone in
        * the frame. No image, no CTA, no label. It is the only theme change on
        * the page and the only moment the reader is asked to stop rather than
        * read on. Opens on column 3.
        *
        * MOBILE COLLAPSE: single column, type steps down to 1.875rem, padding
        * halves. The composition is identical.
        * ================================================================== */}
      <section className="py-24 sm:py-32 lg:py-40" style={{ background: 'var(--scs-carbon)' }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12">
          <div className="lg:grid lg:grid-cols-12">
            <blockquote className="lg:col-start-3 lg:col-span-9 os-rise">
              <p
                className="os-display text-[1.875rem] sm:text-[2.375rem] lg:text-[2.75rem] leading-[1.08]"
                style={{ color: 'var(--scs-chalk)' }}
              >
                {STORY.close}
              </p>
              <footer className="os-note os-muted-dark mt-8">
                Santa Cruz Strength, on its own history.
              </footer>
            </blockquote>
          </div>
        </div>
      </section>

      {/* =====================================================================
        * 5. VOICES. Three member statements on a staggered asymmetric grid.
        *
        * Verbatim and uncut, from src/config/testimonials.js. No stars, no
        * dates, no counts, no ratings: the source file publishes none and
        * neither does this page. Set at reading size rather than pull quote
        * size, because a real sentence someone wrote is not a pull quote and
        * shrinking it to fit a display line would mean cutting it.
        *
        * Opens on column 6. Each block starts on a different column at a
        * different vertical offset, which is the magazine stagger.
        *
        * MOBILE COLLAPSE: single column stack, all column offsets and all
        * vertical offsets removed, spacing carried by margin alone.
        * ================================================================== */}
      {VOICES.length > 0 && (
      <section className="py-24 sm:py-32 lg:py-40" style={{ background: 'var(--scs-bg)' }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12">
          <div className="lg:grid lg:grid-cols-12 lg:gap-10 lg:items-start">

            <h2
              className="os-display text-[1.75rem] sm:text-[2rem] leading-[1.05] mb-14 lg:mb-20 lg:col-start-6 lg:col-span-6 os-rise"
              style={{ color: 'var(--scs-text)' }}
            >
              What members say.
            </h2>

            {VOICES.map((voice, i) => (
              <figure
                key={voice.name}
                className={[
                  'os-rise mb-14 last:mb-0 lg:mb-0',
                  i === 0 ? 'lg:col-start-1 lg:col-span-5' : '',
                  i === 1 ? 'lg:col-start-7 lg:col-span-5 lg:mt-16' : '',
                  i === 2 ? 'lg:col-start-3 lg:col-span-5 lg:mt-20' : '',
                ].join(' ')}
                style={order(i + 1)}
              >
                <blockquote>
                  <p className="os-read" style={{ color: 'var(--scs-text)' }}>
                    {voice.quote}
                  </p>
                </blockquote>
                <figcaption className="os-note os-muted mt-5 pt-5 os-hairline">
                  <span className="os-display-strong text-base block" style={{ color: 'var(--scs-text)' }}>
                    {voice.name}
                  </span>
                  {voice.detail}
                </figcaption>
              </figure>
            ))}

          </div>
        </div>
      </section>
      )}

      {/* =====================================================================
        * 6. WHAT A FACILITY TOUR IS. Open hairline reading list plus the CTA.
        * Opens on column 2. No numbers, no cards, no step labels: these are
        * four things you can do, not a sequence.
        *
        * MOBILE COLLAPSE: single column, list unchanged, CTA goes full width.
        * ================================================================== */}
      <section className="py-24 sm:py-32 lg:py-40" style={{ background: 'var(--scs-bg-alt)' }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12">
          <div className="lg:grid lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-start-2 lg:col-span-7">

              <h2
                className="os-display text-[1.75rem] sm:text-[2rem] leading-[1.05] mb-8 os-rise"
                style={{ color: 'var(--scs-text)' }}
              >
                What a facility tour is.
              </h2>

              <p className="os-read os-muted mb-12 os-rise" style={order(1)}>
                {VISIT_BODY}
              </p>

              <ul className="mb-12">
                {VISIT_ITEMS.map((item, i) => (
                  <li
                    key={item}
                    className="os-display text-[1.25rem] sm:text-[1.5rem] leading-[1.25] py-6 os-hairline os-rise"
                    style={{ color: 'var(--scs-text)', ...order(i + 2) }}
                  >
                    {item}
                  </li>
                ))}
              </ul>

              <div className="os-rise" style={order(6)}>
                <Link
                  to="/contact"
                  className="btn-clay os-press px-6 sm:px-7 py-3.5 text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap"
                >
                  Book a Free Facility Tour
                  <ArrowRight size={15} />
                </Link>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
        * 7. MEMBERSHIP AND COACHING. Narrow plate split, text left, tall plate
        * right. Opens on column 1. This is the only spread on the page where
        * type sits beside a photograph, and it is four sections away from the
        * hero, so nothing on this page reads as a zigzag.
        *
        * No prices. Project truth is explicit that the nine tiers carry an
        * exact value obligation plus a verbatim fee note the moment one appears,
        * and this direction has nothing to gain from importing that here. The
        * tiers live on /join, which is one click away and named.
        *
        * MOBILE COLLAPSE: the plate moves above the text as a 16:9 band, then
        * the copy, then the CTAs full width.
        * ================================================================== */}
      <section className="py-24 sm:py-32 lg:py-40" style={{ background: 'var(--scs-bg)' }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12">
          <div className="lg:grid lg:grid-cols-12 lg:gap-10 lg:items-center">

            <div className="os-plate mb-12 lg:mb-0 lg:col-start-8 lg:col-span-5 lg:row-start-1">
              <img
                src={RACKS_PLATE}
                alt="Squat stands, flat benches and colour coded bumper plates beside a lifting platform at Santa Cruz Strength"
                className="w-full h-56 sm:h-80 lg:h-[30rem] object-cover os-square"
                style={{ objectPosition: 'center 55%' }}
                loading="lazy"
              />
            </div>

            <div className="lg:col-start-1 lg:col-span-6 lg:row-start-1">
              <h2
                className="os-display text-[1.75rem] sm:text-[2rem] leading-[1.05] mb-8 os-rise"
                style={{ color: 'var(--scs-text)' }}
              >
                Memberships and coaching.
              </h2>

              <p className="os-read os-muted os-rise" style={order(1)}>
                Day passes, monthly plans, and commitment options. Tour the facility to see what is included in each plan.
              </p>

              <p className="os-read os-muted os-rise" style={order(2)}>
                Personal training is available for members who want structured programming, technique work, or a starting plan built around their goals.
              </p>

              <div className="flex flex-col sm:flex-row sm:items-center gap-5 mt-10 os-rise" style={order(3)}>
                <Link
                  to="/join"
                  className="btn-primary os-press px-6 sm:px-7 py-3.5 text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  Compare Memberships
                  <ArrowRight size={15} />
                </Link>
                <Link
                  to="/personal-training"
                  className="text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap transition-opacity duration-180 hover:opacity-70"
                  style={{ color: 'var(--scs-clay)' }}
                >
                  Ask About Personal Training
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* =====================================================================
        * 8. COMMON QUESTIONS. Two column question and answer rows.
        * Opens on column 2. Open, not an accordion: an accordion hides reading,
        * and this direction is about reading. The five pairs stay verbatim and
        * in sync with src/seo/home-schema.json.
        *
        * MOBILE COLLAPSE: question and answer stack in a single column, the
        * hairline stays as the row separator.
        * ================================================================== */}
      <section className="py-24 sm:py-32 lg:py-40" style={{ background: 'var(--scs-bg)' }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12">
          <div className="lg:grid lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-start-2 lg:col-span-10">

              <h2
                data-testid="home-faq-accordion"
                className="os-display text-[1.75rem] sm:text-[2rem] leading-[1.05] mb-14 os-rise"
                style={{ color: 'var(--scs-text)' }}
              >
                Common questions.
              </h2>

              <dl>
                {FAQ_ITEMS.map((item, i) => (
                  <div
                    key={item.q}
                    className={`lg:grid lg:grid-cols-10 lg:gap-10 py-10 os-rise ${i === 0 ? '' : 'os-hairline'}`}
                    style={order(i + 1)}
                  >
                    <dt
                      className="os-display text-[1.25rem] sm:text-[1.5rem] leading-[1.2] mb-4 lg:mb-0 lg:col-span-4"
                      style={{ color: 'var(--scs-text)' }}
                    >
                      {item.q}
                    </dt>
                    <dd className="os-read os-muted lg:col-span-6">
                      {item.a}
                    </dd>
                  </div>
                ))}
              </dl>

            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
        * 9. THE VISIT. The conversion spread, and the only dense moment on the
        * page. Density is motivated here: a form is dense by nature, and the
        * air around it is what makes it legible.
        *
        * Opens on column 1. The address, the phone and the directions link all
        * sit outside the map frame, so they survive a blocked or slow Google.
        *
        * MOBILE COLLAPSE: the form panel first, then the contact block, then
        * the directions button full width, then the map.
        * ================================================================== */}
      <section className="py-20 lg:py-28" style={{ background: 'var(--scs-charcoal)' }}>
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12">
          <div className="lg:grid lg:grid-cols-12 lg:gap-10">

            <div
              className="lg:col-start-1 lg:col-span-7 p-6 sm:p-9 os-square"
              style={{ background: 'var(--scs-warm-white)' }}
            >
              <h2
                className="os-display text-[1.625rem] sm:text-[2rem] leading-[1.05] mb-3"
                style={{ color: 'var(--scs-text)' }}
              >
                Request your free facility tour.
              </h2>
              <p className="os-note os-muted mb-8" style={{ maxWidth: '46ch' }}>
                Fill out the form and a team member will follow up.
              </p>
              <QuizForm source="book_a_tour" noAutoFocus />
            </div>

            <div className="lg:col-start-9 lg:col-span-4 mt-14 lg:mt-0 flex flex-col">
              <h3
                className="os-display-strong text-lg mb-6"
                style={{ color: 'var(--scs-chalk)' }}
              >
                {GYM_CONFIG.name}
              </h3>

              <ul className="space-y-4 mb-8">
                <li data-testid="contact-address-block" className="flex items-start gap-3">
                  <MapPin size={15} className="mt-1 shrink-0" style={{ color: 'var(--scs-stone)' }} />
                  <span className="text-sm leading-relaxed" style={{ color: 'var(--scs-chalk)' }}>
                    {GYM_CONFIG.address.full}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Phone size={15} className="mt-1 shrink-0" style={{ color: 'var(--scs-stone)' }} />
                  <a
                    href={GYM_CONFIG.phoneHref}
                    data-testid="contact-click-to-call-button"
                    className="text-sm leading-relaxed transition-opacity duration-180 hover:opacity-70"
                    style={{ color: 'var(--scs-chalk)' }}
                  >
                    {GYM_CONFIG.phone}
                  </a>
                </li>
                <li data-testid="contact-hours-block" className="flex items-start gap-3">
                  <Clock size={15} className="mt-1 shrink-0" style={{ color: 'var(--scs-stone)' }} />
                  <span className="text-sm leading-relaxed" style={{ color: 'var(--scs-text-on-dark-muted)' }}>
                    Contact for current staffed hours
                  </span>
                </li>
              </ul>

              <a
                href="https://maps.google.com/?q=151+Harvey+West+Blvd+Ste+D+Santa+Cruz+CA+95060"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline os-press px-6 py-3 text-sm mb-6 inline-flex items-center justify-center gap-2 w-full sm:w-auto whitespace-nowrap"
                style={{ borderColor: 'rgba(232,225,214,0.3)', color: 'var(--scs-chalk)' }}
              >
                <MapPin size={14} />
                Get Directions
              </a>

              <MapEmbed testId="home-map-embed" className="flex-1 min-h-[260px]" />
            </div>

          </div>
        </div>
      </section>

      {/* =====================================================================
        * 10. RECENT POSTS. Conditional, and the only place cover images appear.
        * Opens on column 2. Renders nothing when the API is down or empty, so
        * the page still works before JavaScript finishes.
        *
        * MOBILE COLLAPSE: single column, covers keep their 3:2 crop.
        * ================================================================== */}
      {blogPosts.length > 0 && (
        <section className="py-24 lg:py-32" style={{ background: 'var(--scs-bg)' }}>
          <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12">
            <div className="lg:grid lg:grid-cols-12 lg:gap-10">
              <div className="lg:col-start-2 lg:col-span-10">

                <div className="flex items-end justify-between gap-6 mb-12">
                  <h2
                    className="os-display text-[1.75rem] sm:text-[2rem] leading-[1.05] os-rise"
                    style={{ color: 'var(--scs-text)' }}
                  >
                    Recent posts.
                  </h2>
                  <Link
                    to="/blog"
                    className="text-sm font-semibold inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap transition-opacity duration-180 hover:opacity-70"
                    style={{ color: 'var(--scs-clay)' }}
                  >
                    All posts
                    <ArrowRight size={14} />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 lg:gap-10">
                  {blogPosts.map((post, i) => (
                    <Link
                      key={post.slug}
                      to={`/blog/${post.slug}`}
                      className="group block os-rise"
                      style={order(i + 1)}
                    >
                      {post.cover_image && (
                        <div className="os-plate mb-5">
                          <img
                            src={post.cover_image}
                            alt=""
                            className="w-full h-40 object-cover os-square"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <span className="os-note os-muted block mb-2">{post.category}</span>
                      <span
                        className="os-display text-[1.25rem] leading-[1.2] block transition-opacity duration-180 group-hover:opacity-70"
                        style={{ color: 'var(--scs-text)' }}
                      >
                        {plain(post.title)}
                      </span>
                    </Link>
                  ))}
                </div>

              </div>
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
