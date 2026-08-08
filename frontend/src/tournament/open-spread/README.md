# Direction 2, The Open Spread

Homepage as an editorial story. Tournament candidate. Dials: DESIGN_VARIANCE 7,
MOTION_INTENSITY 4, VISUAL_DENSITY 3.

Everything below the nine articulations is implementation record: what I used,
what I refused, what I need shot, and where I think project truth is wrong.

---

## 1. Direction Name

**The Open Spread.**

## 2. Aesthetic: family plus discriminating vocabulary

**Family: the sans set magazine feature.** A printed long form spread, set
entirely in the two approved sans faces, where the grid changes shape from
spread to spread instead of repeating one template.

Vocabulary terms, all of which appear literally in the build:

1. **Recto and verso split.** Type occupies one leaf, the photographic plate the
   other. Type never crosses a photograph anywhere on this page.
2. **Standfirst lede.** The opening paragraph is set two steps larger than the
   run that follows it, then steps down. The reader is told where the piece
   starts by size, not by a label.
3. **Marginal note column.** Short factual notes sit in the empty column beside
   the text they annotate, top aligned to it, at 0.8125rem.
4. **Sentence case condensed display.** Barlow Condensed at weight 600 with the
   uppercase transform dropped. Same typeface as the approved system, opposite
   register.
5. **Long measure setting.** Body runs at 1.0625rem, leading 1.85, measure
   capped at 62ch. That is book setting, not web setting, and it is the reason
   the page reads slowly on purpose.
6. **Column start offsetting.** Each spread declares its own `col-start` and
   `col-span` on a 12 column grid, and no two consecutive spreads open on the
   same column. Nothing on this page is a 50/50.
7. **Single black plate.** The page is chalk paper throughout except one carbon
   spread. It is the only theme change and it carries one sentence.
8. **Reading order stagger.** Entry timing inside a spread runs in the order the
   spread wants to be read, so an asymmetric composition still has a first thing.

## 3. Reference Read

The read is print, not web. A magazine feature earns attention by changing pace:
a cover leaf, a standfirst, a text run with notes in the margin, a full bleed
plate that stops the reading, a pull quote alone on a dark page, then the
reported voices, then the practical information at the back. That sequence is
the reference, and it maps cleanly onto what this gym has to say.

The deliberate non reference is the thing the phrase "editorial web page"
usually summons: a cream page, a display serif, a centred masthead, a dateline.
That is a costume, and Taste v2 section 4.1 names it as the most tested tell in
production. This page does the structural work of an editorial layout and none
of the costume.

## 4. Design Thesis, one sentence

The visitor's actual question is whether they will belong here, so this page
answers it by telling the gym's own thirteen year story in reading order, in the
gym's own published words, and asks for exactly one thing at the end.

## 5. Future Hero

Reserved, not finished. What I would commission:

- A landscape 3:2 frame of the training floor shot from the doorway at standing
  eye level, natural light from the roller door, no people, wide enough to carry
  racks, platforms and the painted wall seal in a single read. This is the frame
  the site has never had and the reason every hero in this repo has been a crop
  workaround.
- Failing that, the same room with three or four members training at middle
  distance, likeness permission cleared in writing.

The stand in is `SCS_MEDIA.heroFacility` (`/assets/scs/facility.jpg`), the real
1080x1440 phone frame of the floor. **The composition is designed around its
real portrait ratio rather than cropping it into a shape it does not have.** If
the landscape frame arrives, only the plate leaf changes; the type leaf is
unaffected.

## 6. Hero Placement

- **Composition.** Two leaves. Type on cols 1 to 6 at `lg`, 1 to 5 at `xl`.
  Plate on the remaining 6, then 7. Deliberately not a half and half.
- **Aspect ratio.** Plate is 3:4 portrait at `lg` and up, filling the full height
  of the band. At `sm` and below it becomes a 16:9 band under the type.
- **Focal zone.** `object-position: center 38%`, which holds the painted seal and
  the rack row in the upper two thirds and drops the noisiest floor foreground.
- **Text safe space.** The entire type leaf. No headline, subhead or CTA ever
  crosses the photograph, so there is no scrim, no dimming filter, and contrast
  is guaranteed by construction rather than by a `rgba` overlay. This is also why
  the page can afford to show the photograph at a readable brightness instead of
  the current build's `brightness(0.62)`.
- **Crop behaviour.** `object-cover`. Any replacement asset crops from the same
  focal point without a code change.
- **Viewport relationship.** Section carries `pt-16` and nothing else, which
  clears the fixed 64px navbar exactly. The band is
  `lg:min-h-[calc(100dvh-4rem)]` capped at `820px`, so hero plus navbar is
  precisely one viewport at desktop and the CTAs are always above the fold.
  Hero top padding is `pt-16`, well inside the `pt-24` cap.
- **Text elements: three.** Headline, subtext, CTA pair. No eyebrow, no tagline,
  no trust strip.
- **Responsive placement.** Below `1024px` the plate moves beneath the type
  block, full container width, `h-56 sm:h-72`, object position `center 45%`. The
  type block keeps its measure and gains `py-14`.

## 7. Body Grammar

- **Container.** `max-w-[1400px] mx-auto`, gutters `px-5 sm:px-8 lg:px-12`. One
  container for the whole page including the hero, so every left edge on the
  page aligns.
- **Grid.** 12 columns at `lg`. Single column below. Each spread names its own
  start and span. Openings on this page fall on columns 1, 2, 1, 2, 6, 1 and 3
  in sequence, never the same column twice running.
- **Vertical rhythm.** `py-24 sm:py-32 lg:py-40` on the reading spreads,
  `py-20 lg:py-28` on the two utility spreads at the back. That is roughly twice
  the current build's `py-16 sm:py-20` and it is what density 3 means here.
- **Display type.** Barlow Condensed 600, uppercase transform dropped, letter
  spacing -0.005em, leading 0.98 to 1.08 by size. Sizes used: 3.5rem (hero),
  2.75rem (black plate), 2rem (spread heads), 1.5rem (list items and questions).
- **Body type.** DM Sans 400 at 1.0625rem, leading 1.85, measure 62ch. Lede
  variant at 1.375rem, leading 1.6, measure 46ch. Notes at 0.8125rem.
- **Colour.** Chalk page, charcoal text. Secondary text is `rgba(36,35,33,0.70)`,
  which measures about 5.2:1 on chalk. See the contrast note below.
- **Radius.** `var(--scs-radius)`, 2px, on every surface including photographs.
  One scale, no exceptions, and the map inherits its own legacy 10px from
  `.scs-map` which I did not touch.
- **Accent.** Clay appears only on things you can click. No clay hairlines, no
  clay dots, no clay underlines on static text. Learn it once, find every next
  step by colour.

## 8. Signature Move

**The single black plate.** The page is chalk from the hero to the footer with
exactly one exception: a carbon spread carrying the owner's own closing sentence
at 2.75rem with nothing else in the frame. No image, no CTA, no label. It is the
only theme change on the page, it is the only place the reader is asked to stop
rather than read on, and it is positioned as the hinge between the gym's history
and its members' words.

## 9. Primary Risk

**Density 3 with a five frame photo library means long stretches where type
carries the page alone.** If the writing does not hold, generous air stops
reading as composition and starts reading as an unfinished page. I have hedged
this only by using real published copy rather than invented connective prose, so
the sentences at least belong to the business.

Secondary risk, and the one I would actually defend in the room: **dropping the
uppercase transform moves Barlow Condensed a long way from the approved poster
register, and the owner approved the poster register.** Section 8.3 of project
truth explicitly permits it, but permission is not approval. If this direction
wins, that is the first decision to put back in front of Mike.

---

## What I built

Ten sections plus the shared footer, in reading order.

| # | Spread | Layout family | Grid opening | Mobile collapse |
|---|---|---|---|---|
| 1 | Hero | Two leaf, type recto, plate verso | col 1 | Plate drops below type, 16:9 band |
| 2 | The story | Offset text column plus marginal note | col 2 | Single column, note follows text with a hairline above |
| 3 | The room | Full bleed plate, caption in the left margin below | col 1 | Plate 4:3, caption below |
| 4 | The black plate | Full width carbon quote, alone | col 2 | Same, smaller type |
| 5 | Voices | Three member quotes on a staggered asymmetric grid | col 6 | Single column stack, offsets removed |
| 6 | What a visit is | Open hairline reading list plus CTA | col 1 | Single column |
| 7 | Membership | Narrow plate split, text left, tall plate right | col 3 | Plate above text, 16:9 |
| 8 | Questions | Two column Q and A rows, question left, answer right | col 1 | Question and answer stack |
| 9 | The visit | Form panel plus contact block plus map | col 1 | Panel, then contact, then map |
| 10 | Recent posts | Conditional three across text and cover grid | col 1 | Single column |

Eyebrow count: **zero**, against a ceiling of three. The headline alone is
enough and the absence is a differentiator.

Consecutive image plus text splits: **never more than one**. Sections 3 and 7
are the only spreads where a photograph sits beside or above type, and they are
four sections apart.

Layout families reused: **none**.

### Motion, and what each piece communicates

Two motions only, at intensity 4.

1. **Entry rise on scroll.** 14px translate plus opacity, 420ms, cubic bezier
   0.16 1 0.3 1, staggered inside a spread. *What it communicates:* the reading
   order of an asymmetric composition, where the first thing to read is not
   obvious from position alone. Driven by `IntersectionObserver`, never a scroll
   listener, fires once, and the hero is deliberately excluded so it never
   delays LCP.
2. **CTA press.** 1px downward translate on `:active`. *What it communicates:*
   physical acknowledgement of a tap. That is the whole list.

Reduced motion is handled structurally rather than by an override: the transition
and the starting offset exist only inside
`@media (prefers-reduced-motion: no-preference)`, so under `reduce` the elements
have no animation properties at all and render at rest. If
`IntersectionObserver` is unavailable, every element is marked visible on mount.

### Contrast

Project truth 9.1.26 records that stone `#8E867A` on chalk `#E8E1D6` is roughly
2.8:1 and already fails AA, and invites improvement. This page does not use
stone on chalk at all. Secondary and caption text is `rgba(36,35,33,0.70)`,
charcoal at 70% alpha, which composites to about `#5F5C57` on chalk for roughly
5.2:1. That is a tint of an approved token, which section 8.4 permits, and it is
the single accessibility improvement this candidate makes.

Clay `#A5543B` with white label text measures about 5.3:1, so `.btn-clay`
passes AA. Every CTA label carries `whitespace-nowrap`; none wraps at desktop.

### Photographs used, and why only three

Three of the five available frames:

- `SCS_MEDIA.heroFacility` for the hero plate.
- `SCS_MEDIA.communityGroup` for the full bleed room plate.
- `SCS_MEDIA.openGym` for the membership plate.

**I deliberately did not use `coachingCrew`.** Project truth 4.4.1 records that
`coachingFloor` and `communityFloor` are two frames of the same five people at
the same backdrop from the same setup, and that any layout placing them near
each other exposes it. A page with this much air would expose it badly. One
frame from that shoot, used once, at full bleed, is stronger than two.

I also did not use the five portraits. The temptation was to set Ember
Lichtenberg's quote beside `portraitLexi`, since the quote names Lexi Medeiros
by name. That would put a photograph of the trainer next to the words of the
member and read as an attribution photo. It would be a lie by adjacency.

Grade: every plate carries `filter: saturate(0.62) contrast(1.06)`, applied by
one class, no per image tuning. Rationale: the real interior has a bright green
painted wall stripe that fights clay at full saturation (project truth 4.4.3).
0.62 mutes it toward the page's paper register without draining the photograph
into something that looks synthetic or misrepresents what is in the room.

### Photography this direction needs and does not have

Listed rather than filled, per the media policy. No slot is substituted.

1. **A landscape 3:2 interior of the training floor**, doorway eye level,
   natural light, no people. This is the hero.
2. **Any action frame with written likeness permission.** The page currently
   argues that people train here and shows nobody training. `lift.jpeg` exists
   and is clean and is unusable.
3. **Member portraits with permission**, so the voices spread can attribute with
   a face instead of a name alone.
4. **Exterior and signage without an identifiable person.** The page never shows
   the visitor what the building looks like from the street, which is a real gap
   for a page whose whole argument is "come here in person".

## What I deliberately did not do, to stay distinct

- **No serif.** The trap fired exactly where the brief said it would. The
  editorial register here comes from case, weight, measure, leading, column
  offsetting and pace. Not one new typeface, not one borrowed one.
- **No dark hero.** Every other candidate has a strong pull toward the approved
  full bleed dimmed photograph with type on it. Mine is chalk with the plate
  beside the type. If two candidates converge, it will not be here.
- **No card grid anywhere.** Not for starting points, not for quotes, not for
  FAQ, not for blog covers. Cards are how a page gets dense, and I am at 3.
- **No eyebrows at all**, where the ceiling allowed three.
- **No accordion on the FAQ.** An accordion hides reading, and this direction is
  about reading. The five questions are open and set at reading scale.
- **No band alternation.** The current build alternates dark and light four
  times. This page changes once, on purpose, and that change is the signature.
- **No decision strip.** The thin dark utility band under the hero is a
  decision environment device and belongs to Direction 1. Its content, address
  and phone, lives in the visit spread at the back where a reader arrives at it.
- **No numbers on the visit list**, no `01 / 02 / 03` cards, no step labels.
- **No proof beyond what is published.** No ratings, no counts, no years badge,
  no "trusted by". The one number on this page is "over 13 years" and it is the
  owner's own published sentence.

## Copy sources, every string

Nothing on this page is invented. Every factual sentence traces to one of:

- `GYM_CONFIG` for address, phone and email. Never retyped.
- CMS key `home_hero_headline_v2` and `home_hero_subtitle_v2` with the approved
  fallbacks, read through the same `copy(key, approved)` helper as the current
  build.
- CMS key `about_story`, seeded at `backend/server.py:4812`. The story spread,
  the black plate quote and the belonging paragraph are verbatim sentences from
  it, rearranged but not edited. Read through `copy()` with the seeded text as
  fallback so a CMS edit reaches the homepage.
- The current homepage's approved copy for the visit list, the coaching
  sentence, the membership sentence and the five FAQ pairs.
- `MEMBER_STORIES` from `src/config/testimonials.js`, verbatim, uncut.

One sentence from `about_story` is omitted on purpose: "Today, Santa Cruz
Strength is a place where you can train hard and get stronger, whether you're
experienced or just getting started." It is the owner's own line, but it lands
one word away from the banned "whether you're a beginner or a pro" construction,
and the adjacent sentences carry the same meaning without it.

## Project truth I found wrong or incomplete

Reported, not routed around.

1. **`PROJECT-TRUTH.md` does not contain the story it is the whole case for.**
   My brief told me the owner's language, including "This gym has always been
   about strength. Now, it's also about making that strength more accessible.",
   was in `PROJECT-TRUTH.md`. It is not, at any line. I found it at
   `backend/server.py:4812`, CMS key `about_story`, a seeded 250 word first
   person history that carries the thirteen years, the powerlifting, strongman
   and Olympic weightlifting founding, the belonging language, the explicit
   sentence about the strong base of women and queer members, and the closing
   thesis. That is the single richest piece of true copy in this repository and
   the truth inventory does not mention it. Section 3.2 lists eleven seeded but
   unread CMS keys and `about_story` is not among them either. **Every other
   candidate is designing without knowing this text exists.** That should be
   fixed centrally before judging, because it is not a Direction 2 advantage,
   it is a gap in the shared brief.

2. **`frontend/src/components/index.js` does not exist.** The brief instructed
   `import { Navbar, Footer } from '../../components'`. There is no barrel file.
   Correct imports are `../../components/Navbar` and `../../components/Footer`,
   both default exports. Anyone who followed the instruction literally has a
   candidate that does not compile.

3. **The testimonial gate and `MEMBER_STORIES` contradict each other.**
   Guardrail 9.1.8 admits testimonials only when source URL, capture date, exact
   wording and permission all exist. `src/config/testimonials.js` supplies exact
   wording and a source, and states outright that it publishes no dates and no
   attribution because the live site publishes neither. So the gate is not met
   on capture date. Meanwhile `Home.js:11` already imports `MEMBER_STORIES`
   without rendering it, `validate-seo.mjs` carries a named dash exemption for
   the file, and my brief instructed me to import it. I used it, and I chose
   three of the six quotes. **What is missing to close the gate honestly is a
   capture date**, which is one afternoon of work: open the live site, screenshot
   the reviews section, record the date in the file header. Until that exists,
   this page is publishing member words without a recorded capture, which is a
   real if small exposure, and the decision to accept it is not mine.

4. **Two of the six member quotes carry em dashes.** Jeremy Ball's and Taryn's.
   The validator exempts the file, correctly, because editing a customer's
   punctuation is worse than the house style violation. But the characters still
   render on screen, and the tournament's own constraint says no dashes anywhere.
   I resolved it by selecting only from the four quotes that contain no dash, so
   this page ships zero dash characters without anyone editing a review. Worth
   recording as the general answer for the other candidates.

5. **`Home.js:249` appears to strip dashes using literal dash characters** in
   the regex, which check one of the validator would flag on `src/pages/Home.js`.
   Either the file uses the escaped form and the truth document transcribed it
   as literals, or the check is passing for a reason I did not trace. My blog
   section uses the escaped unicode character class form, which the validator
   explicitly strips before its escape scan and is the sanctioned form. Flagging
   in case the transcription is accurate and the real file is one commit from
   failing its own validator.

## Verification

- `CI=true npx craco test --watchAll=false` from `frontend/`, run after the
  build. Result recorded in the delivery report.
- `node scripts/validate-seo.mjs` from `frontend/`, including both dash checks.
- This directory is the only thing touched. No shared file, no other candidate,
  no backend, no `PROJECT-TRUTH.md`.

Routing is wired centrally. `index.js` exports the page component as default.
