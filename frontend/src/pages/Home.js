import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import QuizForm from '../components/QuizForm';
import BlueprintIcon from '../components/BlueprintIcon';
import { GYM_CONFIG, MEMBERSHIP_TIERS } from '../config';
import { SCS_MEDIA, photo } from '../config/media';
import MapEmbed from '../components/MapEmbed';
import { getSiteContent, getBlogPosts } from '../lib/api';
import { withoutConsolidated } from '../seo/consolidatedSlugs';
import { MEMBER_STORIES } from '../config/testimonials';
import { trackBookTourClick, trackPhoneClick, trackDirectionsClick } from '../utils/analytics';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { ArrowRight, MapPin, Phone, Star } from 'lucide-react';
import { preloaded } from '../lib/preload';

const LOGO_URL = SCS_MEDIA.logo;

const FAQ_ITEMS = [
  { q: 'Do I need experience to start?', a: 'No. The gym works for people at every level. Staff can help you get oriented.' },
  { q: 'What happens on a facility tour?', a: 'You walk through the space, see the equipment, ask questions, and talk through which membership fits.' },
  { q: 'What equipment is available?', a: 'Power racks, barbells, bumper and iron plates, specialty bars, dumbbells, kettlebells, and conditioning equipment.' },
  { q: 'Is coaching available?', a: 'Staff can help during staffed hours. Structured personal training is a separate service.' },
  { q: 'Where is the gym?', a: '151 Harvey West Blvd Ste D, Santa Cruz, CA 95060. Harvey West Business Park.' },
];

/* Facts the entity paragraph asserts, restated as scannable proof.
   Each one is already true somewhere else on this page or in the
   business configuration, which is the condition for repeating it in
   a compressed form. Nothing here is a number nobody has counted, and
   the two claims the owner has not confirmed, 24/7 member access and
   the day pass window, are absent on purpose. */
const ENTITY_FACTS = [
  { label: 'Where', value: 'Harvey West, Santa Cruz CA' },
  { label: 'Floor', value: 'Racks, bars, platforms, open gym' },
  { label: 'Disciplines', value: 'Powerlifting, weightlifting, strongman, general strength' },
  { label: 'Access', value: 'Day passes through annual memberships' },
];

/* What a tour walks past, indexed beside the photograph.
 *
 * The brief asks for interactive hotspots pinned to points on this
 * frame. They were built and then removed, because a marker is a
 * spatial claim: putting one at 62% across and 13% down and labelling
 * it "the wall seal" asserts that the seal is at that point in that
 * crop, and at desktop it landed on bare wall. Nobody has measured
 * these positions against the photograph, and a confident pin on the
 * wrong object is worse than no pin.
 *
 * So the facts stay, indexed and readable, and the pins wait for a
 * wide facility frame with positions checked against it. Recorded in
 * the evidence gap log rather than shipped on a guess. */
const WALKTHROUGH_POINTS = [
  { label: 'The wall seal', fact: 'The painted SCS seal above the green stripe. It is the first thing you see from the door.' },
  { label: 'Plate storage', fact: 'Bumper and iron plates stored at floor level, next to the equipment that uses them.' },
  { label: 'Racks', fact: 'Power racks along the wall, set up for squat, bench and pressing work.' },
  { label: 'Open floor', fact: 'Platform and open floor space, which is where deadlifts and Olympic work happen.' },
];

const DISCIPLINES = [
  { icon: 'rack', title: 'Powerlifting', desc: 'Squat, bench and deadlift training on rack and platform space, with the bars and plates a competitive total needs. The gym hosts sanctioned meets on site.' },
  { icon: 'platform', title: 'Olympic weightlifting', desc: 'Snatch and clean and jerk work on lifting platforms with bumper plates, so the lifts can be dropped where they are meant to be dropped.' },
  { icon: 'open-floor', title: 'Strongman', desc: 'One of the three disciplines this gym was built around. Implement training happens here alongside the barbell work.' },
  { icon: 'general-strength', title: 'General strength training', desc: 'Getting stronger without competing. Open gym access to the same racks, bars and floor, on your own program or one a coach writes.' },
];

const STARTING_POINTS = [
  {
    icon: 'first-timer',
    number: '01',
    title: 'First-time lifter',
    desc: 'New to strength training and looking for a place with clear equipment and available guidance.',
    tone: 'white',
  },
  {
    icon: 'own-program',
    number: '02',
    title: 'Independent member',
    desc: 'You have your own program. You need a focused space with the right equipment to run it.',
    tone: 'mint',
  },
  {
    icon: 'competitor',
    number: '03',
    title: 'Experienced strength athlete',
    desc: 'Competing or training at a high level. You need racks, bars, and platforms that match.',
    tone: 'deep',
  },
];

const PREVIEW_PLAN_IDS = ['daypass', 'huscler-12', 'annual'];

export default function Home() {
  const [c, setC] = useState(() => preloaded('content', {}));
  const copy = (key, approved) => c[key] || approved;
  // Filtered and sliced here exactly as the effect below does it, from a
  // payload captured with the same limit the effect asks for. Anything else and
  // the server would render a different three posts than the browser, which is
  // a hydration mismatch dressed up as a content bug.
  const [blogPosts, setBlogPosts] = useState(() => withoutConsolidated(preloaded('postsHome', [])).slice(0, 3));

  useEffect(() => {
    getSiteContent().then(({ data }) => setC(data)).catch(() => {});
    // Ask for more than three, drop the consolidated ones, then take three.
    // Unfiltered, the homepage could link both cross canonical duplicates:
    // every post shares one seed timestamp, so the sort tie break is
    // arbitrary and those two are the first rows the seeder inserts.
    getBlogPosts({ limit: 8 }).then(r => setBlogPosts(withoutConsolidated(r.data.posts || []).slice(0, 3))).catch(() => {});
  }, []);

  const previewPlans = PREVIEW_PLAN_IDS
    .map((id) => MEMBERSHIP_TIERS.find((tier) => tier.id === id))
    .filter(Boolean);

  const [leadStory, ...supportingStories] = MEMBER_STORIES;
  const [featuredPost, ...otherPosts] = blogPosts;

  return (
    <div className="min-h-screen" style={{ background: 'var(--scs-bg)' }}>
      <Navbar />

      <main id="main">

        {/* ------------------------------------------------------------------
            1. HERO

            The room, at the size the room deserves, with the headline
            sitting in the dark half of the frame rather than over the
            busy half. The photograph is an img rather than a CSS
            background so it can carry width, height, a source set and
            a high fetch priority: it is the Largest Contentful Paint
            on this page and a background image is invisible to the
            preload scanner.
            ------------------------------------------------------------------ */}
        <section data-testid="home-hero" className="relative pt-16 on-dark on-photo" style={{ backgroundColor: 'var(--scs-forest-deep)' }}>
          <div className="relative min-h-[520px] sm:min-h-[64vh] lg:min-h-[72vh] max-h-[760px] flex items-end overflow-hidden">
            <img
              {...photo('facility', { sizes: '100vw', eager: true })}
              alt="The Santa Cruz Strength training floor, with racks, plate storage and the painted wall seal"
              className="absolute inset-0 w-full h-full object-cover scs-shift"
              style={{ objectPosition: 'center 72%', filter: 'saturate(0.62) contrast(1.06) brightness(0.66)' }}
            />
            {/* Two overlays rather than one flat scrim: a vertical fade that
                anchors the type, and a forest wash that ties the photograph
                to the palette instead of leaving it a grey rectangle. */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(6,48,31,0.94) 0%, rgba(6,48,31,0.70) 42%, rgba(6,48,31,0.28) 100%)' }} />
            <div className="absolute inset-0" style={{ backgroundColor: 'rgba(14,93,62,0.20)', mixBlendMode: 'multiply' }} />

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full pb-12 sm:pb-16 pt-24">
              <div className="max-w-2xl">
                <h1
                  className="font-display mb-5"
                  style={{ color: 'var(--scs-white)', fontSize: 'clamp(2.25rem, 6.2vw, 4.25rem)', lineHeight: 0.94, letterSpacing: '-0.005em' }}
                >
                  {copy('home_hero_headline_v2', 'A Santa Cruz strength gym you can see before you join.')}
                </h1>
                <p className="text-base sm:text-lg mb-8 leading-relaxed max-w-xl" style={{ color: 'var(--scs-text-on-dark)' }}>
                  {copy('home_hero_subtitle_v2', 'See the racks, platforms, training floor, and access setup before you choose a membership.')}
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <Link to="/contact" data-testid="home-hero-book-visit-button"
                    className="btn-clay px-7 text-sm uppercase tracking-wider font-semibold w-full sm:w-auto"
                    onClick={() => trackBookTourClick('hero')}>
                    Book a Free Facility Tour <ArrowRight size={15} />
                  </Link>
                  <Link to="/join" className="btn-outline btn-outline-on-dark px-7 text-sm w-full sm:w-auto">
                    Compare Memberships
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------
            2. DECISION STRIP
            Address and phone, immediately under the fold line, because
            the first question a local visitor has is where this is.
            ------------------------------------------------------------------ */}
        <section className="py-4 on-dark" style={{ background: 'var(--scs-forest)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="flex items-center gap-2 m-0">
              <MapPin size={15} style={{ color: 'var(--scs-mint)' }} aria-hidden="true" />
              <span className="text-sm" style={{ color: 'var(--scs-text-on-dark)' }}>151 Harvey West Blvd Ste D, Santa Cruz, CA 95060</span>
            </p>
            <div className="flex items-center gap-5">
              <Link to="/contact" className="text-sm font-semibold underline underline-offset-4 decoration-1 py-1.5 inline-block" style={{ color: 'var(--scs-mint)' }}>
                Book a Free Facility Tour
              </Link>
              <a href={GYM_CONFIG.phoneHref} onClick={() => trackPhoneClick()} className="flex items-center gap-1.5 text-sm py-1.5" style={{ color: 'var(--scs-text-on-dark)' }}>
                <Phone size={14} aria-hidden="true" />{GYM_CONFIG.phone}
              </a>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------
            3. WHAT THIS PLACE IS, STATED PLAINLY

            A short factual definition of the business, high on the page, in one
            block. The hero says what the visit is like and that is the right
            first thing for a person; it is not something a machine can turn into
            "what is Santa Cruz Strength". This paragraph is: name, category,
            address, what the floor supports, what is sold. Every clause is
            already true elsewhere on the site, which is the condition for putting
            it in one extractable place rather than leaving it spread across six
            sections and an FAQ.

            The prose runs at a readable measure on the left and the same facts
            are indexed on the right, which is the composition the definition
            deserved and did not have when it was a centred column of grey text.

            Nothing here is a number nobody has counted. Racks, bars and platforms
            are named because the equipment answer already names them; how many of
            each stays unstated, because nobody has counted them.
            ------------------------------------------------------------------ */}
        <section className="py-16 sm:py-24" style={{ background: 'var(--scs-cream)' }} data-testid="home-entity-definition">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
              <div className="lg:col-span-7">
                <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl mb-6" style={{ color: 'var(--scs-forest)', lineHeight: 0.98 }}>
                  {copy('home_definition_headline', 'What Santa Cruz Strength is')}
                </h2>
                <p className="text-base sm:text-lg leading-relaxed mb-4 max-w-[68ch]" style={{ color: 'var(--scs-text)' }}>
                  {copy('home_definition_body_1', 'Santa Cruz Strength is an independent strength training gym at 151 Harvey West Blvd, Suite D, in Santa Cruz, California. The floor supports barbell training, powerlifting and general strength work, with racks, bars, platforms and open gym space.')}
                </p>
                <p className="text-base leading-relaxed mb-4 max-w-[68ch]" style={{ color: 'var(--scs-text-muted)' }}>
                  {copy('home_definition_body_2', 'Personal training is available for lifters who want technique coaching, structured programming, or help getting started. Membership options include day passes, monthly plans and longer-term memberships.')}
                </p>
                {/* An empty slot, deliberately, waiting on one answer from the owner.
                    This is where "Members have 24/7 access to the facility" belongs,
                    and it is the single most quoted sentence a gym publishes, which
                    is exactly why it is not being published on inference. The claim
                    appears on the live site, in the membership terms of every full
                    plan, and in members' own reviews, and it is still not confirmed
                    current by the person who would know.

                    The same review left the day pass window unresolved: three
                    different answers are published today and the one repeated twice,
                    9am to 9pm, matches nothing else the business says. Two facts,
                    one paragraph, neither of them guessable.

                    The default is an empty string, so this renders nothing until the
                    owner types the confirmed sentence into the Content Manager. It
                    then appears with no deploy and no code change. An empty slot is
                    the site declining to answer; a plausible sentence here would be
                    this site inventing hours for a business with a locked door. */}
                {copy('home_definition_access', '') && (
                  <p className="text-base leading-relaxed max-w-[68ch]" style={{ color: 'var(--scs-text-muted)' }}>
                    {copy('home_definition_access', '')}
                  </p>
                )}
              </div>

              <div className="lg:col-span-5">
                <div className="flex items-center gap-3 pb-6 mb-6" style={{ borderBottom: '1px solid var(--scs-border)' }}>
                  <img src={LOGO_URL} alt="" width="44" height="44" className="w-11 h-11 object-contain" />
                  <div>
                    <p className="font-display-medium text-base m-0" style={{ color: 'var(--scs-forest)' }}>Santa Cruz Strength</p>
                    <p className="text-xs m-0" style={{ color: 'var(--scs-text-muted)' }}>Strength gym, Santa Cruz CA</p>
                  </div>
                </div>
                <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-x-8">
                  {ENTITY_FACTS.map((fact) => (
                    <div key={fact.label} className="py-3" style={{ borderBottom: '1px solid var(--scs-border)' }}>
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-1" style={{ color: 'var(--scs-forest)' }}>{fact.label}</dt>
                      <dd className="text-sm m-0" style={{ color: 'var(--scs-text)' }}>{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------
            4. WALK THE SPACE

            The facility photograph at full width with markers on it. The
            markers are real buttons, they toggle a caption, and every
            caption is also printed in the list underneath, so a keyboard
            user, a screen reader and a crawler all get the same four
            facts a mouse user gets. Nothing is available only on hover.
            ------------------------------------------------------------------ */}
        <section className="py-16 sm:py-24" style={{ background: 'var(--scs-sand)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              {/* The list beside this photograph names four things: the wall
                  seal, plate storage, racks and the open platform floor. The
                  frame has to show all four or the section is a claim with no
                  evidence beside it. This one does, at the file's own 5:4, so
                  nothing is cropped at render time and the seal cannot be
                  clipped by a box that disagrees with the picture. The frame
                  this replaced was a close range shot of one bench upright
                  with the seal cut off by the top edge: one of the four, and
                  no sense of the room at all. */}
              <div className="lg:col-span-5" data-reveal>
                <figure className="m-0 scs-frame">
                  <img
                    {...photo('training-floor', { sizes: '(min-width: 1024px) 40vw, 100vw' })}
                    alt="The Santa Cruz Strength training floor: the painted SCS wall seal, bumper and iron plates stored at floor level, power racks along the wall, and wooden lifting platforms on the open floor"
                    className="w-full object-cover scs-photo"
                    style={{ aspectRatio: '5 / 4' }}
                  />
                  <figcaption className="px-4 py-3 text-sm" style={{ background: 'var(--scs-forest-deep)', color: 'var(--scs-text-on-dark)' }}>
                    The floor as it looks from the door: the seal, the racks, plate storage and the platforms.
                  </figcaption>
                </figure>
              </div>

              <div className="lg:col-span-6 lg:col-start-7" data-reveal>
                <h2 className="font-display text-3xl sm:text-4xl mb-5" style={{ color: 'var(--scs-forest)', lineHeight: 0.98 }}>
                  Walk through the space. Ask how access works. Leave with a clear answer.
                </h2>
                <p className="text-base leading-relaxed mb-6 max-w-[62ch]" style={{ color: 'var(--scs-text-muted)' }}>
                  A facility tour lets you see every part of the gym, see the equipment and ask what is available, and talk to staff before you decide anything.
                </p>

                <ul className="mb-7">
                  {WALKTHROUGH_POINTS.map((point) => (
                    <li key={point.label} className="py-3 flex gap-4" style={{ borderTop: '1px solid rgba(27,27,25,0.14)' }}>
                      <span className="scs-rail-node mt-0.5" style={{ color: 'var(--scs-forest)' }} aria-hidden="true" />
                      <span>
                        <span className="block text-sm font-semibold mb-0.5" style={{ color: 'var(--scs-text)' }}>{point.label}</span>
                        <span className="block text-sm leading-relaxed" style={{ color: 'var(--scs-text-muted)' }}>{point.fact}</span>
                      </span>
                    </li>
                  ))}
                </ul>

                <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--scs-text-muted)' }}>
                  You can also ask about membership options and access, meet available staff, and leave without filling in any paperwork.
                </p>

                <Link to="/contact" className="btn-clay px-7 text-sm" onClick={() => trackBookTourClick('walkthrough')}>
                  Book a Free Facility Tour <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------
            5. THREE STARTING POINTS

            Three routes in, and each one looks like a different kind of
            person's answer rather than the same white rectangle three
            times. White, then mint, then deep forest, with the drawn
            equipment mark doing the work an icon pack used to fake.
            ------------------------------------------------------------------ */}
        <section className="py-16 sm:py-24" style={{ background: 'var(--scs-cream)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <h2 className="font-display text-3xl sm:text-4xl mb-10 max-w-2xl" style={{ color: 'var(--scs-forest)', lineHeight: 0.98 }}>
              Three ways people start here.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {STARTING_POINTS.map((item, index) => {
                const dark = item.tone === 'deep';
                const background = item.tone === 'white'
                  ? 'var(--scs-white)'
                  : item.tone === 'mint' ? 'var(--scs-mint)' : 'var(--scs-forest-deep)';
                return (
                  <article
                    key={item.title}
                    data-reveal
                    className={`p-7 flex flex-col ${dark ? 'on-dark' : ''}`}
                    style={{
                      background,
                      border: dark ? 'none' : '1px solid var(--scs-border)',
                      borderRadius: 'var(--scs-radius-card)',
                    }}
                  >
                    <div className="flex items-start justify-between mb-6">
                      <BlueprintIcon name={item.icon} size={64} draw className={dark ? 'scs-blueprint-light' : ''} />
                      <span
                        className="font-display text-3xl leading-none"
                        style={{ color: dark ? 'var(--scs-coral-bright)' : 'rgba(14,93,62,0.30)' }}
                        aria-hidden="true"
                      >
                        {item.number}
                      </span>
                    </div>
                    <h3 className="font-display-medium text-xl mb-2" style={{ color: dark ? 'var(--scs-white)' : 'var(--scs-forest)' }}>
                      {item.title}
                    </h3>
                    <p className="text-sm leading-relaxed m-0" style={{ color: dark ? 'var(--scs-text-on-dark-muted)' : 'var(--scs-text-muted)' }}>
                      {item.desc}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------
            6. THE DISCIPLINES THE FLOOR ACTUALLY SUPPORTS

            "Three starting points" says who trains here. This says what they
            train. Between "strength gym" and the words people actually search,
            powerlifting, weightlifting, strongman, there was nothing on this page
            bridging the two, so the site read as a category with no specifics.

            Four disciplines, and each one is claimed because the business already
            claims it: the About story names powerlifting, strongman and Olympic
            weightlifting as what this gym was built for, the gym hosts a
            powerlifting meet, and a member describes the same four in a review
            published on the live site. None of them is here for the search
            volume, and a fifth is not being added for it either.

            The four cards are now four stations on one rail, because they are
            not four separate products, they are four things the same floor does.
            On a phone the rail turns vertical rather than becoming a horizontal
            scroll trap, and every paragraph stays readable without interaction.

            These are not links yet on purpose. A dedicated page per discipline is
            the right structure once there is real content for each; four thin
            pages created to own four URLs is the wrong one, and it is the
            specific mistake this section would otherwise invite.
            ------------------------------------------------------------------ */}
        <section className="py-16 sm:py-24 on-dark" style={{ background: 'var(--scs-forest-deep)' }} data-testid="home-disciplines">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
              <h2 className="lg:col-span-5 font-display text-3xl sm:text-4xl lg:text-5xl m-0" style={{ color: 'var(--scs-white)', lineHeight: 0.96 }}>
                Built for strength training
              </h2>
              <p className="lg:col-span-6 lg:col-start-7 text-base leading-relaxed m-0 self-end" style={{ color: 'var(--scs-text-on-dark-muted)' }}>
                Four disciplines, one floor. The equipment is shared, the standards are not lowered for any of them.
              </p>
            </div>

            <ol className="scs-rail scs-rail-h relative grid grid-cols-1 lg:grid-cols-4 gap-10 lg:gap-8 pl-10 lg:pl-0" style={{ color: 'var(--scs-mint)' }}>
              {DISCIPLINES.map((item, index) => (
                <li key={item.title} data-reveal>
                  <span className="scs-rail-node absolute lg:relative" style={{ left: 0, marginLeft: '-1px' }} aria-hidden="true" />
                  <div className="lg:mt-7">
                    <BlueprintIcon name={item.icon} size={72} draw className="scs-blueprint-light mb-5" />
                    <h3 className="font-display-medium text-lg mb-2" style={{ color: 'var(--scs-white)' }}>{item.title}</h3>
                    <p className="text-sm leading-relaxed m-0" style={{ color: 'var(--scs-text-on-dark-muted)' }}>{item.desc}</p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="text-sm mt-12 pt-8" style={{ color: 'var(--scs-text-on-dark-muted)', borderTop: '1px solid var(--scs-border-dark)' }}>
              Not sure which of these you are?{' '}
              <Link to="/contact" className="font-semibold underline underline-offset-4 decoration-1" style={{ color: 'var(--scs-mint)' }}>
                Book a free facility tour
              </Link>{' '}
              and walk the floor before you decide.
            </p>
          </div>
        </section>

        {/* ------------------------------------------------------------------
            7. COACHING

            A full bleed photograph of the actual coaching crew with the
            proposition set into it, rather than a fifth image beside a
            paragraph. The people are the argument here.
            ------------------------------------------------------------------ */}
        <section className="relative on-dark on-photo" style={{ background: 'var(--scs-forest-deep)' }}>
          <img
            {...photo('coaching-crew', { sizes: '100vw' })}
            alt="The Santa Cruz Strength coaching crew on the lifting platform"
            className="absolute inset-0 w-full h-full object-cover scs-photo"
            style={{ objectPosition: 'center 32%' }}
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(100deg, rgba(6,48,31,0.94) 0%, rgba(6,48,31,0.78) 38%, rgba(6,48,31,0.12) 78%, rgba(6,48,31,0.05) 100%)' }} />
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
            <div className="max-w-lg" data-reveal>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl mb-5" style={{ color: 'var(--scs-white)', lineHeight: 0.96 }}>
                Practical coaching for people who want a plan.
              </h2>
              <p className="text-base leading-relaxed mb-7" style={{ color: 'var(--scs-text-on-dark)' }}>
                Personal training is available for members who want structured programming, technique work, or a starting plan built around their goals.
              </p>
              <Link to="/personal-training" className="btn-clay px-7 text-sm">
                Ask About Personal Training <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------
            8. MEMBERSHIP

            The three plans a first visit actually chooses between, priced
            from the published tiers rather than restated by hand. The
            twelve month plan carries the coral rail because it is the
            one the business marks as most popular, and every price here
            is the price on the membership page.
            ------------------------------------------------------------------ */}
        <section className="py-16 sm:py-24" style={{ background: 'var(--scs-mint)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
              <h2 className="lg:col-span-6 font-display text-3xl sm:text-4xl lg:text-5xl m-0" style={{ color: 'var(--scs-forest)', lineHeight: 0.96 }}>
                Memberships built around how you train.
              </h2>
              <p className="lg:col-span-5 lg:col-start-8 text-base leading-relaxed m-0 self-end" style={{ color: 'var(--scs-text-muted)' }}>
                Day passes, monthly plans, and commitment options. Tour the facility to see what is included in each plan.
              </p>
            </div>

            <ul className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
              {previewPlans.map((plan, index) => (
                <li
                  key={plan.id}
                  data-reveal
                  className="scs-lock p-7 flex flex-col"
                  data-locked={plan.featured ? 'true' : 'false'}
                  style={{
                    background: 'var(--scs-white)',
                    border: plan.featured ? '1px solid var(--scs-forest)' : '1px solid var(--scs-border)',
                    borderRadius: 'var(--scs-radius-card)',
                  }}
                >
                  {plan.tag && (
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-3" style={{ color: plan.featured ? 'var(--scs-coral)' : 'var(--scs-text-muted)' }}>
                      {plan.tag}
                    </span>
                  )}
                  <h3 className="font-display-medium text-xl mb-1" style={{ color: 'var(--scs-forest)' }}>{plan.name}</h3>
                  {plan.subtitle && <p className="text-sm m-0 mb-5" style={{ color: 'var(--scs-text-muted)' }}>{plan.subtitle}</p>}
                  <p className="flex items-baseline gap-2 m-0 mb-1">
                    <span className="font-display text-4xl" style={{ color: 'var(--scs-ink)' }}>{plan.price}</span>
                    <span className="text-sm" style={{ color: 'var(--scs-text-muted)' }}>{plan.cadence}</span>
                  </p>
                  {plan.note && <p className="text-xs m-0 mb-4" style={{ color: 'var(--scs-text-muted)' }}>{plan.note}</p>}
                  <ul className="mt-4 mb-6 flex-1">
                    {plan.terms.map((term) => (
                      <li key={term} className="text-sm py-1.5 pl-4 relative leading-relaxed" style={{ color: 'var(--scs-text)' }}>
                        <span className="absolute left-0 top-3 w-1.5 h-1.5" style={{ background: 'var(--scs-forest)' }} aria-hidden="true" />
                        {term}
                      </li>
                    ))}
                  </ul>
                  <Link to="/join" className={plan.featured ? 'btn-primary text-sm w-full' : 'btn-outline text-sm w-full'}>
                    See {plan.name} terms
                  </Link>
                </li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/join" className="btn-primary px-7 text-sm">
                Compare All Memberships <ArrowRight size={15} />
              </Link>
              <Link to="/contact" className="btn-outline px-7 text-sm" onClick={() => trackBookTourClick('membership_preview')}>
                Book a Free Facility Tour
              </Link>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------
            9. MEMBER STORIES, transcribed verbatim from the live site

            Six equal rectangles said all six mattered equally and made
            none of them readable. One quote is now set as the argument
            and the rest support it. The words are untouched, including
            the punctuation, which is why this file's quotes are the one
            exemption in the dash rule.
            ------------------------------------------------------------------ */}
        <section className="py-16 sm:py-24" style={{ background: 'var(--scs-cream)' }} data-testid="home-testimonials-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <h2 className="font-display text-3xl sm:text-4xl mb-2" style={{ color: 'var(--scs-forest)' }}>Hear It From The Members</h2>
            <p className="text-sm mb-10" style={{ color: 'var(--scs-text-muted)' }}>Published as written. Nothing edited.</p>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <figure
                className="lg:col-span-7 m-0 p-8 sm:p-10 flex flex-col"
                data-testid={`home-testimonial-${leadStory.name.split(' ')[0].toLowerCase()}`}
                style={{ background: 'var(--scs-mint)', borderRadius: 'var(--scs-radius-soft)' }}
              >
                {/* Five stars, aria-hidden, exactly as the live site
                    publishes them. There is no rating field behind any of
                    these reviews, so the stars are presentation rather
                    than data, and a screen reader announcing a rating the
                    data does not hold would be asserting something untrue.
                    Kept rather than removed because the owner asked for
                    them on the source these were transcribed from. */}
                <div className="flex gap-1 mb-5" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map(i => (
                    <Star key={i} size={16} strokeWidth={0} style={{ fill: 'var(--scs-coral)' }} />
                  ))}
                </div>
                <blockquote className="scs-quote-lead m-0 flex-1" style={{ color: 'var(--scs-ink)' }}>
                  {leadStory.quote}
                </blockquote>
                <figcaption className="mt-8 pt-6" style={{ borderTop: '1px solid rgba(14,93,62,0.25)' }}>
                  <span className="text-base font-semibold block" style={{ color: 'var(--scs-forest)' }}>{leadStory.name}</span>
                  <span className="text-sm" style={{ color: 'var(--scs-text-muted)' }}>{leadStory.detail}</span>
                </figcaption>
              </figure>

              <div className="lg:col-span-5 flex flex-col">
                {supportingStories.map((story, index) => (
                  <figure
                    key={story.name}
                    data-reveal
                    data-testid={`home-testimonial-${story.name.split(' ')[0].toLowerCase()}`}
                    className="m-0 py-6"
                    style={{ borderTop: '1px solid var(--scs-border)' }}
                  >
                    <div className="flex gap-0.5 mb-2" aria-hidden="true">
                      {[0, 1, 2, 3, 4].map(i => (
                        <Star key={i} size={12} strokeWidth={0} style={{ fill: 'var(--scs-coral)' }} />
                      ))}
                    </div>
                    <blockquote className="text-sm leading-relaxed m-0 mb-3" style={{ color: 'var(--scs-text)' }}>{story.quote}</blockquote>
                    <figcaption>
                      <span className="text-sm font-semibold" style={{ color: 'var(--scs-forest)' }}>{story.name}</span>
                      <span className="text-xs ml-2" style={{ color: 'var(--scs-text-muted)' }}>{story.detail}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------
            10. RECENT POSTS
            One article given room to be read, two beside it, and a real
            link to the rest. Three identical thumbnails at the foot of
            the page were a table of contents nobody used.
            ------------------------------------------------------------------ */}
        {blogPosts.length > 0 && (
          <section className="py-16 sm:py-20" style={{ background: 'var(--scs-sand)' }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="flex items-end justify-between mb-8">
                <h2 className="font-display text-2xl sm:text-3xl m-0" style={{ color: 'var(--scs-forest)' }}>Recent posts</h2>
                <Link to="/blog" className="scs-advance text-sm font-semibold hidden sm:flex items-center gap-2 py-1.5" style={{ color: 'var(--scs-forest)' }}>
                  All posts <ArrowRight size={14} />
                </Link>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {featuredPost && (
                  <Link
                    key={featuredPost.id}
                    to={`/blog/${featuredPost.slug}`}
                    className="lg:col-span-7 group flex flex-col scs-frame"
                    style={{ background: 'var(--scs-white)' }}
                  >
                    {featuredPost.cover_image
                      ? <div className="h-56 sm:h-72 overflow-hidden"><img src={featuredPost.cover_image} alt="" className="w-full h-full object-cover scs-photo" loading="lazy" /></div>
                      : <div className="scs-cover scs-cover-mint" style={{ color: 'var(--scs-forest)' }}>
                          <div className="absolute inset-0 flex items-end p-6">
                            <BlueprintIcon name="rack" size={92} />
                          </div>
                        </div>}
                    <div className="p-6 flex flex-col flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-3 m-0" style={{ color: 'var(--scs-forest)' }}>{featuredPost.category}</p>
                      <h3 className="font-display-medium text-2xl mb-3" style={{ color: 'var(--scs-ink)' }}>{(featuredPost.title || '').replace(/[\u2013\u2014]/g, ',')}</h3>
                      <p className="text-sm leading-relaxed m-0" style={{ color: 'var(--scs-text-muted)' }}>
                        {(featuredPost.excerpt || '').replace(/[\u2013\u2014]/g, ',').slice(0, 180)}{(featuredPost.excerpt || '').length > 180 ? '...' : ''}
                      </p>
                    </div>
                  </Link>
                )}

                <div className="lg:col-span-5 flex flex-col gap-6">
                  {otherPosts.map(post => (
                    <Link
                      key={post.id}
                      to={`/blog/${post.slug}`}
                      className="group flex gap-4 p-4 flex-1"
                      style={{ background: 'var(--scs-white)', border: '1px solid var(--scs-border)', borderRadius: 'var(--scs-radius-card)' }}
                    >
                      <span className="shrink-0 w-20 h-20 grid place-items-center" style={{ background: 'var(--scs-cream)', borderRadius: 'var(--scs-radius)' }}>
                        {post.cover_image
                          ? <img src={post.cover_image} alt="" className="w-full h-full object-cover scs-photo" style={{ borderRadius: 'var(--scs-radius)' }} loading="lazy" />
                          : <BlueprintIcon name="plate" size={40} />}
                      </span>
                      <span className="flex flex-col">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-1" style={{ color: 'var(--scs-forest)' }}>{post.category}</span>
                        <span className="text-sm font-semibold leading-snug" style={{ color: 'var(--scs-ink)' }}>{(post.title || '').replace(/[\u2013\u2014]/g, ',')}</span>
                      </span>
                    </Link>
                  ))}
                  <Link to="/blog" className="btn-outline text-sm sm:hidden">All posts</Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ------------------------------------------------------------------
            11. TOUR REQUEST AND LOCATION
            The form on a light card, on the darkest field on the page,
            because this is the one thing the page is asking for.
            ------------------------------------------------------------------ */}
        <section className="py-16 sm:py-24 on-dark" style={{ background: 'var(--scs-forest-deep)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-7 p-6 sm:p-9" style={{ background: 'var(--scs-white)', borderRadius: 'var(--scs-radius-card)', color: 'var(--scs-text)' }}>
                <h2 className="font-display text-2xl sm:text-3xl mb-2" style={{ color: 'var(--scs-forest)' }}>
                  Request Your Free Facility Tour
                </h2>
                <p className="text-sm mb-6" style={{ color: 'var(--scs-text-muted)' }}>
                  Fill out the form and a team member will follow up.
                </p>
                <QuizForm source="book_a_tour" noAutoFocus />
              </div>

              <div className="lg:col-span-5 flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <img src={LOGO_URL} alt="" width="40" height="40" className="w-10 h-10 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
                  <div>
                    <p className="font-display-medium text-base m-0" style={{ color: 'var(--scs-white)' }}>Santa Cruz Strength</p>
                    <p className="text-xs m-0" style={{ color: 'var(--scs-text-on-dark-muted)' }}>Strength Gym</p>
                  </div>
                </div>
                <ul className="mb-6">
                  <li className="flex items-start gap-3 py-3" data-testid="contact-address-block" style={{ borderTop: '1px solid var(--scs-border-dark)' }}>
                    <MapPin size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--scs-mint)' }} aria-hidden="true" />
                    <span className="text-sm" style={{ color: 'var(--scs-text-on-dark)' }}>{GYM_CONFIG.address.full}</span>
                  </li>
                  <li className="py-3" style={{ borderTop: '1px solid var(--scs-border-dark)' }}>
                    <a href={GYM_CONFIG.phoneHref} data-testid="contact-click-to-call-button" className="flex items-center gap-3">
                      <Phone size={16} style={{ color: 'var(--scs-mint)' }} aria-hidden="true" />
                      <span className="text-sm" style={{ color: 'var(--scs-text-on-dark)' }}>{GYM_CONFIG.phone}</span>
                    </a>
                  </li>
                  <li className="flex items-start gap-3 py-3" data-testid="contact-hours-block" style={{ borderTop: '1px solid var(--scs-border-dark)', borderBottom: '1px solid var(--scs-border-dark)' }}>
                    <BlueprintIcon name="building" size={16} className="mt-0.5 shrink-0 scs-blueprint-light" />
                    <span className="text-sm" style={{ color: 'var(--scs-text-on-dark-muted)' }}>Contact for current staffed hours</span>
                  </li>
                </ul>
                <a
                  href="https://maps.google.com/?q=151+Harvey+West+Blvd+Ste+D+Santa+Cruz+CA+95060"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackDirectionsClick('home_location')}
                  className="btn-outline btn-outline-on-dark px-5 text-sm mb-5 w-full sm:w-auto"
                >
                  <MapPin size={14} aria-hidden="true" /> Get Directions
                </a>
                <MapEmbed testId="home-map-embed" className="flex-1 min-h-[280px]" />
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------
            12. FAQ
            The answers stay in the document whether the accordion is
            open or closed, and the schema in home-schema.json mirrors
            this list exactly. Editing one without the other fails the
            build, which is the point.
            ------------------------------------------------------------------ */}
        <section className="py-16 sm:py-20" style={{ background: 'var(--scs-cream)' }}>
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <h2 className="font-display text-2xl sm:text-3xl mb-8" style={{ color: 'var(--scs-forest)' }} data-testid="home-faq-accordion">Common Questions</h2>
            <Accordion type="single" collapsible>
              {FAQ_ITEMS.map(item => (
                <AccordionItem key={item.q} value={item.q} style={{ borderBottom: '1px solid rgba(14,93,62,0.22)' }}>
                  <AccordionTrigger className="text-base font-semibold py-5 hover:no-underline text-left" style={{ color: 'var(--scs-forest)' }}>{item.q}</AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed pb-5 max-w-[68ch]" style={{ color: 'var(--scs-text-muted)' }}>{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}
