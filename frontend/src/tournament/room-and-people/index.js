/**
 * Tournament candidate, Direction 4: THE ROOM, THE PEOPLE.
 *
 * Homepage as documentary evidence of place and humanity.
 * DESIGN_VARIANCE 8 / MOTION_INTENSITY 5 / VISUAL_DENSITY 2.
 *
 * The whole argument of this page is that the gym is real and can be seen
 * before anyone commits to it, so the photographs carry the page and the
 * interface stays out of their way. Read README.md in this directory before
 * changing anything here: the crops, the grades, the empty slots and the
 * two typographic name panels are all decisions with reasons behind them.
 *
 * Five photographs exist. Five photographs ship. Nothing is repeated at a
 * second crop and no slot is filled with a subject it does not promise.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import QuizForm from '../../components/QuizForm';
import MapEmbed from '../../components/MapEmbed';
import { GYM_CONFIG } from '../../config';
import { SCS_MEDIA } from '../../config/media';
import { getSiteContent, getTeamMembers } from '../../lib/api';
import { trackBookTourClick } from '../../utils/analytics';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../components/ui/accordion';
import { ArrowRight, MapPin, Phone, Clock } from 'lucide-react';
import './styles.css';

/* The three frames this direction spends, and what is actually in each one.
   Descriptions were written after opening the files, not from the filenames. */
const HERO_IMG = SCS_MEDIA.heroFacility;        // wide training floor, wall seal, racks, platforms
const ROOM_IMG = SCS_MEDIA.openGym;             // squat stands, benches, plate cradle, wall seal
const GROUP_IMG = SCS_MEDIA.communityStrength;  // the group at the painted wall, arms raised
const LOGO_URL = SCS_MEDIA.logo;

/* Two grades, not one.
   The empty room is pulled down because its painted green wall stripe fights
   the clay accent. People keep their colour, because grading a real person
   into something they are not is the same lie as generating them. */
const ROOM_GRADE = 'saturate(0.68) contrast(1.06) brightness(0.94)';

/* Verbatim, and mirrored in src/seo/home-schema.json. Editing one without the
   other breaks structured data truth. */
const FAQ_ITEMS = [
  { q: 'Do I need experience to start?', a: 'No. The gym works for people at every level. Staff can help you get oriented.' },
  { q: 'What happens on a facility tour?', a: 'You walk through the space, see the equipment, ask questions, and talk through which membership fits.' },
  { q: 'What equipment is available?', a: 'Power racks, barbells, bumper and iron plates, specialty bars, dumbbells, kettlebells, and conditioning equipment.' },
  { q: 'Is coaching available?', a: 'Staff can help during staffed hours. Structured personal training is a separate service.' },
  { q: 'Where is the gym?', a: '151 Harvey West Blvd Ste D, Santa Cruz, CA 95060. Harvey West Business Park.' },
];

const VISIT_LINES = [
  'See the full training floor and equipment',
  'Ask about membership options and access',
  'Meet available staff',
  'No paperwork required to visit',
];

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * One motion behaviour, used four times: a photograph and its label rise 12px
 * as you reach them. It communicates sequence, that you are moving through a
 * place one frame at a time. Under reduced motion the element is shown at
 * mount, so nothing is ever left invisible waiting for an animation that will
 * not run. No scroll listener anywhere on this page.
 */
function Reveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(() => prefersReducedMotion());

  useEffect(() => {
    if (shown) return undefined;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [shown]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : 'translateY(12px)',
        transition: shown ? `opacity 320ms ease-out ${delay}ms, transform 320ms ease-out ${delay}ms` : 'none',
      }}
    >
      {children}
    </div>
  );
}

/* The label under the work. One functional sentence, a short clay rule above
   it, aligned to the left edge of the photograph it describes. Not a credit
   line, not a plate number, never laid over the image. */
function Label({ children, className = '' }) {
  return (
    <figcaption className={`pt-4 max-w-7xl mx-auto w-full px-5 sm:px-6 ${className}`}>
      <span className="block w-6 h-px mb-3" style={{ background: 'var(--scs-clay)' }} />
      <span className="block text-[0.8125rem] leading-relaxed max-w-[46ch]" style={{ color: 'var(--scs-text-muted)' }}>
        {children}
      </span>
    </figcaption>
  );
}

/* Button labels never wrap: three CTA labels are fixed by the guardrails and
   all three fit one line at every width this page supports. */
const BUTTON = 'inline-flex items-center justify-center gap-2 whitespace-nowrap px-7 py-3.5 text-sm font-semibold';
const clayButton = `rp-clay ${BUTTON}`;
const strokeButton = `rp-stroke ${BUTTON}`;

/* Section headings sit at body scale on purpose. Exactly one element on this
   page is set at display scale, the H1. A gallery does not shout its labels. */
function Heading({ children, className = '', ...rest }) {
  return (
    <h2 className={`text-base sm:text-[1.0625rem] font-semibold ${className}`} style={{ color: 'var(--scs-chalk)' }} {...rest}>
      {children}
    </h2>
  );
}

export default function RoomAndPeople() {
  const [content, setContent] = useState({});
  const copy = (key, approved) => content[key] || approved;
  const [people, setPeople] = useState([]);

  useEffect(() => {
    getSiteContent().then(({ data }) => setContent(data)).catch(() => {});
    // Team first, then trainers, each in its own sort order. Everyone visible
    // is shown, including the two with no portrait on file. See the name
    // panels below: a person without a photograph gets their name at portrait
    // scale, never a grey silhouette icon.
    getTeamMembers()
      .then(({ data }) => {
        const visible = (data || []).filter((member) => member.is_visible !== false);
        const byOrder = (a, b) => (a.sort_order || 0) - (b.sort_order || 0);
        setPeople([
          ...visible.filter((member) => member.category === 'team').sort(byOrder),
          ...visible.filter((member) => member.category === 'trainer').sort(byOrder),
        ]);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="rp-page min-h-screen" style={{ background: "var(--scs-carbon)" }}>
      <Navbar />

      {/* 1. HERO. The work, then the label.
          The section is exactly one viewport. The photograph band is a flex
          child that absorbs whatever height is left after the 64px fixed
          navigation and the text block, with a 240px floor, so the fold holds
          the whole frame and the whole text block at any viewport height with
          no media query. No type sits on the photograph, which is why no scrim
          is needed and why this composition survives whatever the final hero
          photograph turns out to look like.
          MOBILE: identical relationship. Photograph above, type below. */}
      <section
        data-testid="home-hero"
        className="relative pt-16 flex flex-col"
        style={{ background: 'var(--scs-carbon)', minHeight: '100dvh' }}
      >
        <div className="relative flex-1 min-h-[240px] overflow-hidden">
          {/* Reserved: a 3:2 landscape photograph of the training floor made from
              the entrance corner, wide enough to hold the wall seal and three
              rack bays, no people. Standing in for it is the real portrait
              frame of that same view, cropped to the band. */}
          <img
            src={HERO_IMG}
            alt="The Santa Cruz Strength training floor, with barbell storage, stacked plates, benches and half racks under fluorescent strip lights, and the painted CSS seal on the far wall."
            className="absolute inset-0 w-full h-full object-cover object-[50%_68%] md:object-[50%_62%]"
            style={{ filter: ROOM_GRADE }}
            fetchPriority="high"
          />
        </div>

        <div className="shrink-0 max-w-7xl mx-auto w-full px-5 sm:px-6 pt-8 sm:pt-10 pb-10 sm:pb-14">
          <h1
            className="max-w-4xl text-[2.25rem] sm:text-[3rem] lg:text-[3.5rem] mb-4"
            style={{
              fontFamily: "'Barlow Condensed', Impact, system-ui",
              fontWeight: 700,
              lineHeight: 0.98,
              letterSpacing: '0.005em',
              color: 'var(--scs-chalk)',
            }}
          >
            {copy('home_hero_headline_v2', 'A Santa Cruz strength gym you can see before you join.')}
          </h1>
          <p className="max-w-[46ch] text-[0.9375rem] sm:text-base leading-relaxed mb-7" style={{ color: 'var(--scs-text-muted)' }}>
            {copy('home_hero_subtitle_v2', 'See the racks, platforms, training floor, and access setup before you choose a membership.')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/contact"
              data-testid="home-hero-book-visit-button"
              className={`${clayButton} w-full sm:w-auto`}
              onClick={() => trackBookTourClick('hero')}
            >
              Book a Free Facility Tour
              <ArrowRight size={14} />
            </Link>
            <Link to="/join" className={`${strokeButton} w-full sm:w-auto`}>
              Compare Memberships
            </Link>
          </div>
        </div>
      </section>

      {/* 2. THE ROOM. A single full bleed plate with its label beneath.
          Largest object on the page and the only place a photograph runs to
          all three edges. No copy competes with it.
          MOBILE: height drops to 52vh, crop moves down to hold the wall seal
          and the plate cradle in frame. */}
      <figure className="m-0">
        <Reveal className="w-full h-[52vh] md:h-[72vh] overflow-hidden">
          <img
            src={ROOM_IMG}
            alt="Squat stands and flat benches along the painted wall at Santa Cruz Strength, with colour coded bumper plates racked in a floor cradle beside a plywood lifting platform."
            className="w-full h-full object-cover object-[50%_34%] md:object-[50%_28%]"
            style={{ filter: ROOM_GRADE }}
            loading="lazy"
          />
        </Reveal>
        <Label>The rack and bench row at 151 Harvey West Blvd, photographed with the room empty.</Label>
      </figure>

      {/* 3. THE VISIT. Type only, and deliberately so.
          The photograph that belongs in this section is a member training
          alone, mid set, with likeness permission. It does not exist. Rather
          than substitute the empty floor a third time, the section runs on
          carbon and lets the space stay empty. See README, needed photograph 3.
          MOBILE: single column, lines keep full width, CTA full width. */}
      <section className="py-16 md:py-28" style={{ borderTop: '1px solid var(--scs-border-dark)' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-6">
          <Heading className="mb-3">Walk through the space. Ask how access works. Leave with a clear answer.</Heading>
          <p className="max-w-[46ch] text-sm leading-relaxed mb-10" style={{ color: 'var(--scs-text-muted)' }}>
            A facility tour lets you see every part of the gym, see the equipment and ask what is available, and talk to staff before you decide anything.
          </p>
          <ul className="mb-10 max-w-4xl">
            {VISIT_LINES.map((line, index) => (
              <li
                key={line}
                className="py-4 text-[1.0625rem] sm:text-xl"
                style={{
                  color: 'var(--scs-chalk)',
                  borderTop: index === 0 ? 'none' : '1px solid var(--scs-border-dark)',
                }}
              >
                {line}
              </li>
            ))}
          </ul>
          <Link to="/contact" className={`${clayButton} w-full sm:w-auto`}>
            Book a Free Facility Tour
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* 4. THE PEOPLE. The portrait series, full bleed.
          Everyone visible in the team collection appears, including the two
          trainers with no photograph on file. Those two get their name set at
          portrait scale in the same frame the photographs occupy. It is the
          honest treatment: a stranger sees seven people, not five people and
          two broken images.
          The section is conditional on the API, like the rest of this site's
          network content. If it does not render, section 5 still carries the
          people argument on its own.
          MOBILE: horizontal scroll strip, one tile at 72vw with scroll snap,
          so faces stay large instead of shrinking to thumbnails. */}
      {people.length > 0 && (
        <section className="py-16 md:py-28" style={{ borderTop: '1px solid var(--scs-border-dark)' }}>
          <div className="max-w-7xl mx-auto px-5 sm:px-6 mb-10">
            <Heading>The people who work here.</Heading>
          </div>
          <ul
            className="rp-strip flex md:grid md:grid-cols-7 gap-px overflow-x-auto md:overflow-visible snap-x snap-mandatory"
            style={{ background: 'var(--scs-border-dark)' }}
          >
            {people.map((person, index) => (
              <li
                key={person.id || person.name}
                className="shrink-0 w-[72vw] sm:w-[42vw] md:w-auto snap-start"
                style={{ background: 'var(--scs-carbon)' }}
              >
                <Reveal delay={Math.min(index, 6) * 40}>
                  <div className="w-full aspect-[2/3] overflow-hidden" style={{ background: 'var(--scs-charcoal)' }}>
                    {person.photo_url ? (
                      <img
                        src={person.photo_url}
                        alt={`${person.name}, ${person.role} at Santa Cruz Strength.`}
                        className="w-full h-full object-cover object-top scs-photo"
                        loading="lazy"
                      />
                    ) : (
                      /* No photograph exists for this person. The name becomes
                         the image rather than a grey silhouette standing in for
                         a face nobody has photographed yet. */
                      <div className="w-full h-full flex items-end p-4">
                        <span
                          className="block text-[2rem] leading-[0.95]"
                          style={{
                            fontFamily: "'Barlow Condensed', Impact, system-ui",
                            fontWeight: 700,
                            color: 'var(--scs-text-on-dark-muted)',
                          }}
                        >
                          {person.name}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="px-1 pt-3">
                    <span className="block text-sm font-semibold" style={{ color: 'var(--scs-chalk)' }}>{person.name}</span>
                    <span className="block text-xs leading-snug mt-0.5" style={{ color: 'var(--scs-text-muted)' }}>{person.role}</span>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 5. MEMBERSHIP AND COACHING. The only image plus text split on the page.
          The photograph bleeds off the right edge of the viewport rather than
          sitting in a column, so it reads as a print running past the wall
          rather than as an illustration next to a paragraph.
          One frame of this group ships. The library holds three near identical
          frames of the same people at the same wall in the same minute, and
          using more than one of them would be the crop repetition trick this
          direction exists to refuse.
          MOBILE: photograph stops bleeding, becomes a full width band above the
          copy, both CTAs full width. */}
      {/* The column split is 5fr to 7fr rather than an even half, so that at a
          1440 viewport the photographic cell lands within a percent of this
          frame's native 3:2 and the people at the ends of the row are not
          cropped off. An even split would cut the outermost two lifters. */}
      <section className="grid lg:grid-cols-[5fr_7fr] items-center" style={{ borderTop: '1px solid var(--scs-border-dark)' }}>
        <Reveal className="order-1 lg:order-2 w-full h-[62vw] max-h-[420px] lg:h-[62vh] lg:max-h-none overflow-hidden">
          <img
            src={GROUP_IMG}
            alt="Two rows of lifters standing and kneeling in front of the painted Santa Cruz Strength wall seal, wearing medals and holding roses, arms raised."
            className="w-full h-full object-cover object-[50%_42%] scs-photo"
            loading="lazy"
          />
        </Reveal>
        <div className="order-2 lg:order-1 px-5 sm:px-6 lg:pl-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))] lg:pr-16 py-16 lg:py-28">
          <Heading className="mb-3">Memberships built around how you train.</Heading>
          <p className="max-w-[46ch] text-sm leading-relaxed mb-4" style={{ color: 'var(--scs-text-muted)' }}>
            Day passes, monthly plans, and commitment options. Tour the facility to see what is included in each plan.
          </p>
          <p className="max-w-[46ch] text-sm leading-relaxed mb-8" style={{ color: 'var(--scs-text-muted)' }}>
            Personal training is available for members who want structured programming, technique work, or a starting plan built around their goals.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mb-7">
            <Link to="/join" className={`${strokeButton} w-full sm:w-auto`}>
              Compare Memberships
            </Link>
            <Link to="/contact" className={`${clayButton} w-full sm:w-auto`}>
              Book a Free Facility Tour
              <ArrowRight size={14} />
            </Link>
          </div>
          <Link
            to="/personal-training"
            className="rp-link inline-flex items-center gap-2 text-sm font-semibold"
          >
            Ask About Personal Training
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* 6. THE VISIT BLOCK. The one light surface on the page.
          A warm-white paper panel against a dark wall, which is where the page
          stops showing and starts asking. Address, phone and directions stay
          outside the map frame so they survive a blocked or slow Google.
          MOBILE: form panel first, contact column and map beneath it. */}
      <section className="py-16 md:py-28" style={{ borderTop: '1px solid var(--scs-border-dark)' }}>
        <div className="max-w-7xl mx-auto px-5 sm:px-6 grid grid-cols-1 lg:grid-cols-[7fr_5fr] gap-10">
          <div className="p-6 sm:p-8" style={{ background: 'var(--scs-warm-white)', borderRadius: 'var(--scs-radius)' }}>
            <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--scs-charcoal)' }}>
              Request Your Free Facility Tour
            </h2>
            <p className="text-sm mb-5" style={{ color: 'var(--scs-text-muted)' }}>
              Fill out the form and a team member will follow up.
            </p>
            <QuizForm source="book_a_tour" noAutoFocus />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <span
                className="w-9 h-9 rounded-full overflow-hidden shrink-0 flex items-center justify-center"
                style={{ border: '1px solid var(--scs-border-dark)', padding: '2px' }}
              >
                <img src={LOGO_URL} alt="" className="w-full h-full object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
              </span>
              <span className="text-sm font-semibold" style={{ color: 'var(--scs-chalk)' }}>{GYM_CONFIG.name}</span>
            </div>

            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-3" data-testid="contact-address-block">
                <MapPin size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--scs-text-muted)' }} />
                <span className="text-sm" style={{ color: 'var(--scs-chalk)' }}>{GYM_CONFIG.address.full}</span>
              </li>
              <li className="flex items-start gap-3">
                <Phone size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--scs-text-muted)' }} />
                {/* Not wired to trackPhoneClick. App.js installs a document level
                    listener for every tel: link, so wiring it here would double count. */}
                <a
                  href={GYM_CONFIG.phoneHref}
                  data-testid="contact-click-to-call-button"
                  className="text-sm"
                  style={{ color: 'var(--scs-chalk)' }}
                >
                  {GYM_CONFIG.phone}
                </a>
              </li>
              <li className="flex items-start gap-3" data-testid="contact-hours-block">
                <Clock size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--scs-text-muted)' }} />
                <span className="text-sm" style={{ color: 'var(--scs-text-muted)' }}>Contact for current staffed hours</span>
              </li>
            </ul>

            <a
              href="https://maps.google.com/?q=151+Harvey+West+Blvd+Ste+D+Santa+Cruz+CA+95060"
              target="_blank"
              rel="noopener noreferrer"
              className={`${strokeButton} w-full sm:w-auto mb-6`}
            >
              <MapPin size={14} />
              Get Directions
            </a>

            <MapEmbed testId="home-map-embed" className="flex-1 min-h-[280px]" />
          </div>
        </div>
      </section>

      {/* 7. QUESTIONS, AND WHAT THIS PLACE IS.
          The five question and answer pairs are verbatim and mirrored in
          home-schema.json. The two closing paragraphs are the entity block that
          search and language models read the business from.
          MOBILE: unchanged, both are already single column. */}
      <section className="py-16 md:py-28" style={{ borderTop: '1px solid var(--scs-border-dark)' }}>
        <div className="max-w-3xl mx-auto px-5 sm:px-6">
          <Heading className="mb-6" data-testid="home-faq-accordion">Common Questions</Heading>
          <Accordion type="single" collapsible className="mb-16">
            {FAQ_ITEMS.map((item) => (
              <AccordionItem key={item.q} value={item.q} style={{ borderBottom: '1px solid var(--scs-border-dark)' }}>
                <AccordionTrigger className="text-sm font-semibold py-5 hover:no-underline text-left" style={{ color: 'var(--scs-chalk)' }}>
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed pb-5" style={{ color: 'var(--scs-text-muted)' }}>
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <p className="max-w-[46ch] text-sm leading-relaxed mb-4" style={{ color: 'var(--scs-text-muted)' }}>
            Santa Cruz Strength is a strength training gym at 151 Harvey West Blvd in Santa Cruz, California. The facility is equipped for barbell training, powerlifting, and general strength work.
          </p>
          <p className="max-w-[46ch] text-sm leading-relaxed" style={{ color: 'var(--scs-text-muted)' }}>
            Coaching is available. Memberships range from day passes to annual plans. The best way to learn about the gym is to visit in person.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
