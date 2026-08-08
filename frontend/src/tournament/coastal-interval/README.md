# Direction 5, THE COASTAL INTERVAL

Dials: DESIGN_VARIANCE 9, MOTION_INTENSITY 7, VISUAL_DENSITY 2.

Everything below the nine articulations was written before the code, per the tournament brief.

---

## 1. Direction Name

**The Coastal Interval.**

Coastal is treated as a condition, not a subject. Nothing on this page depicts a coast. The
coast is present only as pace, air, diffuse light and interval.

---

## 2. Aesthetic, as a named family plus discriminating vocabulary

**Family:** atmospheric spatial minimalism, in the register of Californian light and space work
applied to a working building's brochure. Not editorial, not documentary, not brutalist.

Vocabulary terms, all of them things you can point at in the built page:

1. **Set and rest cadence.** Content arrives in short groups of two to four beats, and every
   group is separated from the next by a measured empty band. The page's vertical rhythm is
   deliberately non constant.
2. **Drifting left margin.** Each set begins at a different column of the 12 column grid, so the
   left edge of the page wanders down the scroll: 1, 2, 1, 3, 1, 2, 1.
3. **Diffuse light contrast floor.** Nothing in the bright passage of the page reaches maximum
   contrast. Body copy sits at about 6:1 against chalk rather than the 13:1 that pure charcoal
   gives. The page is legible without being sharp, which is what fog light does to a room.
4. **Sentence case condensed display.** Barlow Condensed 600 in sentence case at large size,
   never the 900 uppercase `.font-display` treatment. Same family, opposite temperament.
5. **Two dark chambers, one bright passage.** Carbon appears exactly twice, at the two ends of
   the page. Dark means you are inside the building. Chalk means you are outside it, thinking.
6. **Descending photographic scale.** Three photographs, each smaller than the one before:
   full viewport, then bleeding off one edge, then a 360px inset. The images get quieter as the
   page goes on.
7. **Drawn hairline measure.** The only mark inside a rest band is a 1px charcoal hairline that
   draws left to right as the band crosses the viewport.
8. **Hairline over bullet.** List items are marked by a 20px rule above them, never by a dot,
   disc, chevron or icon chip.

---

## 3. Reference Read

Reading this as a local strength gym homepage for a Santa Cruz adult deciding whether to walk
in, with an atmospheric spatial minimalist language built from pacing rather than imagery,
leaning on the already approved Barlow Condensed and DM Sans system on carbon, chalk and clay
tokens, in a redesign overhaul posture.

The visitor is not a design audience. The single conversion action is a booked facility visit,
and memberships are sold in person by a coach, so nothing here sells a membership.

**On the Premium Consumer Palette Ban (Taste v2 section 4.2).** The warm chalk plus clay plus
near black palette this project ships is the exact family that section bans as a default reach.
The client chose it, shipped it and approved it, so per the tournament brief's authority order
it stays. This direction answers the ban rather than ignoring it: the palette is not used as
decoration on a warm minimal template. It is used as a *light model*. Carbon is the inside of a
building, chalk is the air outside it, and clay is reserved so strictly that it appears only on
things you can click. Swap the logo out of this page and the composition still describes a
specific building in a specific light, which is the failure mode the ban actually describes.

---

## 4. Design Thesis, one sentence

A gym you can see before you join should first be *felt* as a place with a pace, so this
homepage is built as sets of content separated by measured rests, and the visitor learns the
gym's character from how the page moves before reading a word of it.

---

## 5. Future Hero

**Needed, does not exist.** A wide landscape interior of the training floor, 3:2, shot from the
door end looking down the room, daylight entering from the roller door at frame left, racks and
platforms receding to the right, no people in frame. Focal zone right of centre, roughly 55 to
75 percent across. The left 55 percent of the frame should carry floor and mid tone wall so
display type can sit over it behind a scrim. Minimum 3000px on the long edge.

**Stand in used:** `SCS_MEDIA.heroFacility` (`/assets/scs/facility.jpg`), which is a real
photograph of this room but is 1080x1440 portrait from a phone. It crops hard to a full viewport
landscape frame and loses most of its height. The composition below is authored for the future
asset and tuned to survive the stand in.

---

## 6. Hero Placement

- **Frame:** full bleed bed, `min-h-[100dvh]`. Never `h-screen`, because iOS Safari's address
  bar makes `h-screen` jump.
- **Authored aspect:** 3:2 landscape, filled with `background-size: cover`.
- **Focal zone:** right of centre. Text sits left, photograph interest sits right.
- **Crop behaviour:** `background-position: 26% 72%` at 1024px and up, `50% 64%` below 768px.
  With the portrait stand in this keeps the floor, racks and painted wall seal in frame and
  pushes the noisy dark ceiling out of the top.
- **Text safe space:** left 58 percent by bottom 46 percent at 1024px and up. Full width by
  bottom 52 percent below 768px. Nothing but the scrim occupies that region.
- **Scrim:** two carbon only opacity ramps, no second hue. Left to right 0.88 to 0.30, and
  bottom to top 0.86 to 0. Text over photography always has a scrim on this page.
- **Grade:** `saturate(0.35) contrast(1.06) brightness(0.58)`. This is heavier desaturation than
  the current build and it is deliberate: the real room has a bright green painted wall stripe,
  and green next to clay is a genuine colour problem (PROJECT-TRUTH 4.4 point 3). Pulling
  saturation to 0.35 takes the green to a neutral grey green that sits under the scrim without
  fighting the accent.
- **Responsive placement:** hero holds `min-h-[100dvh]` at every width. Below 768px the headline
  steps to the clamp minimum, the subtext measure narrows, and the two CTAs stack full width at
  `min-h-11`.
- **Text elements:** three. Headline, subtext, CTA row. No eyebrow, no trust strip, no tagline
  under the buttons.

---

## 7. Body Grammar

- **Grid:** 12 columns, `max-w-[1280px]`, `px-5 sm:px-8 lg:px-10`. Column gap
  `clamp(1.5rem, 3vw, 3rem)`.
- **Drifting margin:** set start columns run 1, 2, 1, 3, 1, 2, 1 down the page, with spans
  between 5 and 11 columns. No two consecutive sets share a start column or a span.
- **Vertical rhythm, deliberately uneven:** inside a set, beats are 2.25rem to 3rem apart.
  Between sets, `clamp(5rem, 12vh, 9rem)` of set padding plus a rest band of
  `clamp(88px, 16vh, 176px)`. Tight inside, far apart outside. That contrast is the interval.
- **Type:**
  - Headings: Barlow Condensed 600, sentence case, `letter-spacing: -0.005em`, line height 1.04.
    H1 `clamp(2.25rem, 4.6vw, 4rem)`, H2 `clamp(1.85rem, 3.2vw, 2.9rem)`, H3 `1.375rem`.
  - Body: DM Sans 400 at `1.0625rem` and line height 1.75, measure capped at 46ch.
  - DM Sans 400 italic is loaded in this project and used nowhere today. It is reserved here for
    member quotes and appears in no other role.
  - Zero eyebrows on the entire page. The rule allows one per three sections; the direction is
    stronger with none, and the section's position on the page is its label.
- **Colour:** one accent, clay, and it appears only on interactive things. Rest hairlines,
  list rules and dividers are charcoal at 14 to 18 percent, never clay, so a visitor can learn
  the accent once and then find every next step by colour.
- **Body copy contrast:** body text on chalk is `rgba(36,35,33,0.76)`, measured at about 6.1:1,
  rather than the shipped stone `#8E867A` which is about 2.8:1 and already fails AA
  (PROJECT-TRUTH guardrail 26 invites this improvement). Stone is kept only for genuinely
  secondary metadata. Body text on carbon is `rgba(232,225,214,0.72)`, about 7:1.
- **Radius:** 2px everywhere, one scale, no exceptions except the map which keeps its own
  approved 10px via the shared `.scs-map` class.
- **Cards:** one card surface exists on the whole page, the warm white form panel. Everything
  else is grouped by space and hairlines.

---

## 8. Signature Move

**The rest band.** Between every set there is a full width band containing nothing but a single
1px charcoal hairline that draws from left to right as the band crosses the viewport, scrubbed
to scroll position rather than played on a timer.

It is the interval made visible. A set has ended, the next has not started, and the line tells
you how much of the pause is left. It is the only thing on the page that is purely about time.

Under `prefers-reduced-motion: reduce` the hairline renders at full width immediately and the
spacing alone carries the rhythm, which is why the composition, not the animation, has to hold
the interval.

---

## 9. Primary Risk

**Style over substance.** At density 2 with empty bands between sets, a visitor who wants facts
fast can read this page as slow and thin, and a client reviewing it beside four denser
candidates can read the rest bands as unfinished work rather than as a decision. This is the
highest variance candidate and it is the one most likely to be rejected on sight.

Mitigations that do not hedge the thesis: the tour CTA is in the nav at every scroll position,
in the hero, and again inside the first content set within one screen of the fold. Rest bands
are capped at 176px, so no pause ever costs a full screen. The page still carries every fact
the dense candidates carry, including the full five question FAQ rendered open rather than
hidden behind an accordion.

---

## Every animation, and its one sentence justification

Six animations. Motion library is `framer-motion` 12.35.1, already in `package.json`, verified
before import. No new dependency. No `window.addEventListener('scroll')` anywhere. No `useState`
holds a continuous scroll or pointer value; every continuous value is a motion value.

| # | Animation | What it communicates, in one sentence | Mobile answer |
|---|---|---|---|
| 1 | **Hero settle.** Headline, subtext and CTA row fade up 14px in sequence over 640ms on load. | Arrival order states the reading order, so the eye is told what to read first before it has to guess. | Unchanged, delays shortened by a third. |
| 2 | **Hero bed drift.** The photograph translates `-7%` on Y across the hero's scroll range while the text moves at page speed. | The room stays put while you move past the doorway, so the photograph reads as a place you are looking into rather than a banner scrolling by. | Disabled below 768px via a single `matchMedia` boolean read once, because two speed parallax on a short viewport reads as a rendering fault rather than depth. |
| 3 | **Nav solidify.** The bar transitions from transparent to carbon with a hairline border once scroll passes 72px. | The bar becomes opaque exactly when it stops sitting over the dark hero, so the labels never lose the background they were designed against. | Unchanged. The mobile drawer is always solid. |
| 4 | **Set arrival.** Beats within a set fade up 18px with a 90ms stagger when the set enters the viewport, once only. | Beats entering together in sequence is what tells the visitor they are one group and not several unrelated sections. | Unchanged, stagger tightened to 60ms and travel to 12px. |
| 5 | **Rest hairline draw.** A 1px hairline scales on X from 0 to 1, scrubbed to the band's progress through the viewport. | The line measures the pause, so an empty band reads as a deliberate interval with a length rather than as a gap where something failed to load. | Unchanged. Band height clamps down to 88px so the draw completes within a normal scroll. |
| 6 | **Press feedback.** Every button and link CTA takes `translateY(1px)` on `:active`. | Confirms the tap landed, on a page where the next screen may take a moment to arrive. | Unchanged, and it is the only motion that matters on touch. |

**Reduced motion.** `useReducedMotion()` gates 1, 2, 4 and 5. Under reduce: hero content renders
in final position, the bed does not drift, set beats render in place, and rest hairlines render
at full width. The page is fully legible and fully usable with motion off, and the interval is
still present because it is built from spacing, not from the animation.

**Things I did not animate, on purpose:** the photographs do not zoom on hover, numbers do not
count up, nothing loops, nothing floats, there is no marquee, there is no scroll cue, and there
is no cursor effect. Each of those failed the one sentence test.

---

## Coastal cliches considered and rejected

Listed so the restraint is visible as a decision rather than as an absence.

**Imagery**
- Wave photograph, breaking or otherwise. Rejected: it is the cliche by name, and no such
  photograph exists in this project's library anyway.
- Beach, sand, dune or boardwalk photography. Rejected as depiction, and it would have required
  stock, which the media policy bans absolutely.
- Palm trees, gulls, surfboards, buoys, anchors, compass roses, lighthouse marks.
- Aerial coastline or map-of-the-bay illustration.
- Sea spray or water texture overlay, and any synthetic grain field standing in for salt air.

**Colour and gradient**
- Sunset gradient, blue to orange, in the hero or anywhere.
- Any blue, teal, aqua, seafoam or turquoise tint. Doubly rejected: it is the cliche, and it
  would introduce a new hue into a locked palette.
- Two hue scrims of any kind. Every overlay on this page is carbon at varying opacity.

**Form and structure**
- Horizon line as a section divider, meaning a full width rule presented as a sea horizon.
- Wave shaped or curved SVG section dividers. Rejected twice over: cliche, and the superseded
  `design_guidelines.md` at the repo root specifically proposes "organic wave dividers", which
  the approved carbon and clay contract replaced.
- Tide chart, swell chart or wave height graphic used as a data motif.
- Wave shaped scroll progress indicator.
- The wordmark or seal composited over an ocean or sky field.

**Motion**
- Parallax cloud or fog layers drifting across the page.
- Animated water shader or canvas ripple background.
- Any floating or bobbing decorative element imitating buoyancy.

**Copy**
- "Strength for life on the coast." This is real, it is in `GYM_CONFIG.tagline`, and it does not
  appear on the homepage today. It is left where it is. Promoting it to the hero would be
  saying the coast out loud, which is exactly the cliche in verbal form.
- Any use of swell, tide, surf, ride, catch, wave, shore, salt or sea in a heading or label.
- A section literally labelled with a place or an atmosphere.
- Locale and weather strips of the "Santa Cruz 14:23, 18C" kind, which are also a general
  agency portfolio tell.

**Rejected for a different reason, recorded for completeness**
- The seal ghosted at large scale as background texture in the closing chamber. Not a coastal
  cliche, and explicitly permitted by PROJECT-TRUTH 8.6, but rejected as decoration on a page
  running at density 2 where the only mark in an empty band is a hairline.

---

## Section map, with mobile collapse declared per section

| # | Set | Ground | Layout family | Start col | Mobile collapse below 768px |
|---|---|---|---|---|---|
| 0 | Nav | transparent to carbon | fixed single line bar, 64px | full | Logo plus hamburger. Drawer holds the five primary links, Events, phone, and a full width clay tour CTA. |
| 1 | **The doorway** (hero) | carbon | full bleed photographic bed, content bottom left | 1 of 12, span 8 | Single column, `px-5`, type at clamp minimum, CTAs stack full width, parallax disabled. |
| 2 | **The room** | chalk | offset bleed, copy left and photograph running off the right edge | 1, span 5 | Photograph moves below the copy at 4:5, full width inside the container, no bleed. |
| 3 | **Three starts** | chalk | uneven triad, `1.15fr 0.95fr 0.85fr` with vertical hairlines | 2, span 10 | Single column, vertical hairlines become top hairlines, 2.75rem apart. |
| 4 | **The people** | chalk | staggered pull quotes at three different measures and offsets, one small inset photograph | 1, span 11 | Single column, offsets removed, photograph full width above the first quote. |
| 5 | **What is available** | chalk | offset two beat ledger, one hairline between the beats | 3, span 9 | Single column, both beats start at the left edge. |
| 6 | **Questions** | chalk | open question and answer list, question left, answer right | 1, span 10 | Stacks to question above answer, hairline above each pair from the second onward. |
| 7 | **Recent posts** | chalk | hairline rows, conditional on the API returning posts | 2, span 8 | Single column rows, "All posts" moves below the list and becomes visible. |
| 8 | **The visit** | carbon | dark chamber with one inset warm white panel | full | Form panel first, then contact block, then map at `min-h-[280px]`. |
| 9 | Footer | carbon | shared `Footer` component, imported unchanged | full | Handled by the shared component. |

Rest bands sit between sets 1 and 2, 2 and 3, 3 and 4, 4 and 5, 5 and 6, 6 and 7, and 7 and 8.

**Layout family count:** 8 distinct families across 8 content sections. No family repeats.
**Image plus text splits:** exactly one, set 2. The cap of two consecutive is not approached.
**Eyebrows:** zero.
**Split header:** none. Every section heading is a single stacked block.
**Centred hero:** none. The hero is bottom left aligned.

---

## Photography, honestly

Three photographs, all real, all local, all of this gym. Every one of them is used exactly once
and at a different scale.

| Slot | Key | File | Why it is used this way |
|---|---|---|---|
| Hero bed | `SCS_MEDIA.heroFacility` | `/assets/scs/facility.jpg` | The only wide interior that exists. Portrait 1080x1440, so it crops hard. Graded heavily to neutralise the green wall stripe. |
| The room | `SCS_MEDIA.openGym` | `/assets/scs/racks.jpg` | Rack and bench row. This file is a 1080x1974 phone screenshot with black letterbox bars top and bottom, so the crop is authored at 4:5 with `object-position: center 52%` to land inside the live area and exclude both bars. |
| The people | `SCS_MEDIA.communityFloor` | `/assets/scs/real/community-group.jpg` | Five real members at the painted seal backdrop. Used small and once. `coachingCrew` is deliberately not used anywhere, because it is the same five people at the same backdrop and showing both would expose that (PROJECT-TRUTH 4.4 point 1). |

**Photography this direction needs and does not have:**

1. **A wide landscape interior of the training floor,** 3:2, no people, shot from the door end.
   This is the hero. Everything about the hero composition is a workaround until it exists.
2. **A second empty room frame at a different scale,** for example the platform corner or the
   plate storage wall, landscape, no people. Set 2 currently carries the only such frame and the
   page would read better with two distinct empty room views rather than one repeated register.
3. **Exterior and signage without an identifiable person.** `SCS_MEDIA_AWAITING_PERMISSION.entrance`
   is exactly this photograph and it is unusable until written likeness permission lands. A
   direction built on arrival and doorways wants it badly.

No slot on this page is filled with a substitute, a placeholder service, stock, or generated
imagery. Where the right photograph does not exist, the composition carries the space instead.

---

## Which Taste v2 sections shaped which decisions

- **0.B Design Read.** Section 3 above, written before any code.
- **1 The three dials.** Assigned 9 / 7 / 2 and driven literally: variance 9 produced the
  drifting left margin and the uneven triad, motion 7 produced six scroll and load driven
  animations, density 2 produced the rest bands, the 46ch measure and the single card on the page.
- **3.B State.** No `useState` holds a scroll or pointer value. `useScroll` and `useTransform`
  only. The one boolean from `matchMedia` is discrete and read once.
- **3.E Layout mechanics.** `min-h-[100dvh]` on the hero, never `h-screen`. CSS Grid throughout,
  no flexbox percentage math.
- **3.F Dependency verification.** `package.json` was read before importing anything.
  `framer-motion` 12.35.1 is present, `motion` is not, so the import path is `framer-motion`.
- **4.1 Typography.** No third family, no serif reached for. The display and body split is
  inverted from the house default by running Barlow Condensed in sentence case at 600 rather
  than uppercase at 900, which PROJECT-TRUTH 8.3 explicitly permits.
- **4.2 Colour, plus the Premium Consumer Palette Ban.** Ruled on in section 3 above. One accent,
  locked, interactive only. No new hue anywhere.
- **4.3 Layout diversification.** Anti centre bias at variance 9: nothing on this page is
  centred, including the hero.
- **4.4 Materiality and the shape consistency lock.** One radius, 2px. One card on the page.
  Everything else grouped by space and hairlines, which is also what `index.css:473` asks for.
- **4.5 Interactive states.** CTA contrast checked by calculation, not by eye. No CTA label wraps
  at desktop. One label per intent.
- **4.7 Layout discipline.** Hero in viewport, two line headline, 14 word subtext, three text
  elements, `pt-24` never exceeded, zero eyebrows, no split header, one image plus text split,
  eight layout families across eight sections, nav on one line at 64px.
- **4.9 Content density.** The FAQ is five open pairs rather than a hidden accordion, the blog
  preview is three hairline rows rather than three cards, and the four tour points are four
  spaced lines rather than a bulleted list.
- **4.10 Quotes.** See the ruled conflict below.
- **4.11 Page theme lock.** Two carbon chambers at the two ends of the page with a single bright
  passage between them, which is the deliberate composition the section allows, not random
  band alternation. The rule stated in code and here: carbon means you are inside the building.
- **5 Motion motivated, and motion claimed is motion shown.** Six animations, each with a one
  sentence justification in the table above. The page genuinely moves.
- **5.C Scroll reveal stagger.** The set arrival uses `whileInView` with `once: true` rather than
  a ScrollTrigger, because nothing here pins or scrubs a timeline and the lighter tool is correct.
- **5.D Forbidden animation patterns.** No scroll listener, no `requestAnimationFrame` touching
  state, no state driven scroll progress.
- **6.A and 6.B Performance and reduced motion.** Transform and opacity only. Everything gated
  on `useReducedMotion`.
- **9.F and 9.G AI tells.** No eyebrows, no section numbering, no middle dots, no status dots,
  no scroll cue, no version labels, no locale strip, no decoration text strip under the hero, no
  fake screenshots, no hand rolled decorative SVG. Zero em dashes and zero en dashes in anything
  this direction wrote.
- **11 Redesign protocol.** Overhaul mode. IA, routes, nav labels, CTA wording, form fields,
  payload, consent copy, analytics calls and every `data-testid` are preserved unchanged.

---

## One specialist conflict, ruled on

**Taste v2 section 4.10 caps a quote at three lines and says to cut anything longer.** The three
member quotes rendered here run four to six lines at the body scale used.

They are not cut. `src/config/testimonials.js` states the rule that governs them: nothing is
edited, not spelling, not grammar, not length. These are real people's published words about a
real business, and trimming one to fit a layout is fabricating a review. Project truth outranks
the specialist recommendation, exactly as the tournament brief's authority order settles the
palette question.

What the direction does instead of cutting: renders three of the six rather than all six,
drops them to body scale rather than pull quote scale so the line count is not visually loud,
and gives each one its own row with a different measure and offset so no quote competes with
another. The three chosen cover the three distinct claims in the set, a serious lifter on the
equipment, a member on the environment and the owner, and a client on personal training.

---

## What this direction deliberately did NOT do, to stay distinct

- **No decision environment.** No comparison table, no side by side options, no "which of these
  are you" selector. That is Direction 1 and Direction 3.
- **No editorial spread.** No drop caps, no pull quote in the margin, no multi column prose, no
  article rhythm. That is Direction 2.
- **No documentary photography lead.** The people appear as words, not as a photo essay. Only
  one small photograph of members exists on this page and it is the smallest image on it. That
  is Direction 4, and the inversion is the point: this candidate shows you the air, not the faces.
- **No dark page.** A predominantly carbon page would have been the easy expressive move and it
  would have collided with anyone else who reached for it. This page is bright for most of its
  length, which is a harder and more specific reading of coastal light.
- **No uppercase display type.** Every other candidate has `.font-display` available and it is
  uppercase 900 by default. Not using it is the single cheapest way to be unmistakable at a
  glance from across a room.
- **No accordion.** The FAQ is open.
- **No hours table, no prices, no invented proof, no urgency, no online checkout.**

---

## Project truth found wrong

Reported, not routed around. All four are in `PROJECT-TRUTH.md`, which appears to have been
compiled against an earlier state of `frontend/src/pages/Home.js`.

1. **Section 2.2 says the verified proof slot renders nothing.** It does not. `Home.js:207` still
   carries the placeholder comment, but a live member stories section now sits at
   `Home.js:231-248`, rendering all six `MEMBER_STORIES` as a three column card grid under the
   heading "Hear It From The Members". `Home.js` is 345 lines, not the 324 the document states,
   and its section numbering now has two sections labelled 9.

2. **Section 5.8's testid table is incomplete.** It omits `home-testimonials-section`
   (`Home.js:232`) and the per story `home-testimonial-{firstname}` ids (`Home.js:238`), which
   are as much of a QA contract as the rest. This candidate preserves both.

3. **Guardrail 9.1 item 8 is out of date.** It says testimonials must not render unless a gate of
   source URL, capture date, exact wording and permission is satisfied. That gate has since been
   answered differently and the quotes ship: `src/config/testimonials.js` records the source as
   verbatim transcription from santacruzstrength.com and states why no rating and no date are
   published. The practical effect is that a candidate has real proof available, which the
   document says it does not.

4. **Section 9.4's description of the dash validator omits a real exemption.**
   `frontend/scripts/validate-seo.mjs:252` defines
   `const DASH_EXEMPT = new Set(['src/config/testimonials.js'])`, with a comment explaining that
   editing a customer's punctuation is worse than the problem the rule prevents. Two of the six
   member quotes contain an em dash and they render on the live homepage today. Any candidate
   rendering `MEMBER_STORIES` therefore ships visible em dashes it did not write, and that is
   sanctioned. This candidate imports the quotes rather than copying them, so no dash character
   appears in any file it authored.

Also confirmed still true and still harmless: `BACKEND`, `Calendar` and `EQUIP_IMG` remain
declared and unused in `Home.js`.

---

## Files

```
src/tournament/coastal-interval/
  index.js        the page
  Nav.js          transparent to carbon navigation, testids preserved
  rhythm.js       Rest, Set, Beat, useDesktop. The interval primitives.
  index.test.js   render smoke test, asserts hero, H1, CTA label and form testids
  README.md       this file
```

Imports from shared truth, never retyped: `GYM_CONFIG` and `MEMBERSHIP_TIERS` from
`../../config`, `SCS_MEDIA` from `../../config/media`, `MEMBER_STORIES` from
`../../config/testimonials`, and the shared `QuizForm`, `MapEmbed` and `Footer` components so
the lead payload, the third party frame policy and the footer contract are inherited rather than
reimplemented. No price is typed anywhere; no price is displayed on this page at all.
