# Direction 3: The Starting Point Engine

Tournament candidate for the Santa Cruz Strength homepage.
Dials as assigned: **DESIGN_VARIANCE 6, MOTION_INTENSITY 6, VISUAL_DENSITY 4.**

---

## The nine articulations

### 1. Direction Name

**The Starting Point Engine.** The homepage as guided self selection.

### 2. Aesthetic

**Family: instrument documentary.** A working intake counter photographed in the
room it belongs to. Not a quiz product, not a wizard, not a configurator UI.

Discriminating vocabulary:

1. **Overlapping warm-white plinth.** The question panel is a solid slab that
   laps up over the bottom of the hero photograph at `lg`, so the first thing
   the visitor can touch sits half on the room and half on the page.
2. **Answer chip.** A 2px square toggle, charcoal fill with chalk label when
   chosen, hairline border when not. Icons carried over from the existing lead
   form so the same answer looks the same everywhere on the site.
3. **Clay left rule.** A 2px clay hairline marking the live path in the index.
   The accent marks state and action, never area.
4. **Index to detail collapse.** Four starting points readable as a flat index,
   collapsing to one expanded answer plus three one-line siblings once a choice
   lands. Nothing is destroyed, it is demoted.
5. **Disclosure ledge.** The timing question does not exist until the first
   question is answered. It arrives on the ledge below the answer, not in a
   step-two screen.
6. **Sentence-scale condensed stem.** Barlow Condensed 900 at sentence scale,
   roughly 1.9rem to 3rem, never poster scale. The page is a counter, not a
   billboard.
7. **Ruled definition list instead of cards.** Membership shapes are a `<dl>`
   with one hairline between rows. No card, no elevation, no trio.
8. **Carbon plate.** One dark band holds the whole routing mechanic. The rest of
   the page is chalk. The plate is where the page thinks.

### 3. Reference Read

The service counter, not the software. A climbing gym front desk clipboard where
the first two boxes decide which of four short paragraphs the person behind the
counter reads to you. Second reference: a well made service manual index, where
the top level list stays visible and the chosen entry expands in place. Third:
airport departure boards, for the discipline of a state change being a legible
row flip rather than a decorative transition.

### 4. Design Thesis

The visitor cannot be sold a membership on this page, so the page's only useful
job is to work out which of four different first visits belongs to this person
and hand that answer, and their two clicks, straight to the booking form.

### 5. Future Hero

**Wanted:** a wide landscape photograph of the training floor, shot from the
roller door end, wide enough that racks, platforms and plate storage all read at
once, lit so the far wall seal is legible without blowing the strip lights.
Target 2400x1350 delivered, 16:9. Subject depth in the left and centre thirds,
quiet negative space in the upper left for headline, and a clean, uncluttered
lower right so the plinth lands on floor rather than on equipment.

**Stand in shipped:** `SCS_MEDIA.heroFacility` (`/assets/scs/facility.jpg`),
1080x1440 portrait. It is the honest photograph of this room and it is the wrong
shape, so the crop compensates and the reservation above records what the final
asset should be.

### 6. Hero Placement

- **Aspect ratio:** the frame is a reserved box, not the photo's own ratio.
  `min-h-[520px]` on mobile, `lg:min-h-[62vh] lg:max-h-[620px]` at desktop.
  Roughly 16:9 at 1440, roughly 4:5 at 390.
- **Focal zone:** left and centre thirds, vertically the lower half of the frame
  where the floor and racks are. `object-position: 30% 72%` at desktop, shifted
  to `50% 70%` below `lg` where the frame is taller and narrower.
- **Text safe space:** left 55% of the frame at `lg`, bottom aligned, with a
  55 percent carbon scrim plus a bottom-weighted gradient so the headline sits
  on a guaranteed contrast field rather than on whatever the crop gave it.
- **Crop behaviour:** `object-cover`. The photograph is allowed to lose its top
  and its right edge. It is never letterboxed and never stretched.
- **Viewport relationship:** headline, subtext, both CTAs and the top of the
  question plinth are all above the fold at 1440x900 and at 390x844.
- **Responsive placement:** at `lg` and up the plinth overlaps the photograph by
  `-6rem` and occupies the right 40 percent. Below `lg` the overlap is zero, the
  plinth is a normal full width block directly under the hero, and the hero
  itself carries only headline, subtext and CTAs.

### 7. Body Grammar

Ten sections, ten different layout families, no family repeated.

| # | Section | Layout family | Mobile collapse below 768px |
|---|---|---|---|
| 1 | Hero | full bleed photograph, bottom left text, right reserve | single column, text stacks under the frame's lower half, no plinth |
| 2 | Start here plinth | overlapping warm-white panel, 2x2 chip grid | overlap removed, panel full width, chips stay 2x2 |
| 3 | Your starting point | carbon plate, index to detail collapse, 5/7 asymmetric | index and detail stack vertically, detail first |
| 4 | Walk the space | image left, text right split | image above text, single column |
| 5 | Coaching | full bleed photograph band, narrow text column beneath | identical, text padding tightens |
| 6 | Membership shapes | ruled definition list, name left, terms right | `dt` above `dd`, one column |
| 7 | The gym in plain terms | narrow centred measure with entity chip | identical, narrower measure |
| 8 | Recent posts | three linked cards, conditional on the API | single column stack |
| 9 | Book the visit | 7/5 split, form left, contact and map right | form above contact block, map full width |
| 10 | Common questions | accordion on a narrow measure | identical |

Rhythm: `py-16 sm:py-20` on the substantive bands, `py-14` on the lighter ones.
Container `max-w-6xl` for the routing plate and `max-w-3xl` for reading blocks.
Only one image plus text split on the page, so the zigzag cap is never
approached. Eyebrow count: **1** (section 4), against a budget of 3.

Type: `.font-display` (Barlow Condensed 900, uppercase) for H1 and section H2s,
`.font-display-medium` for the routed path titles, DM Sans everywhere else.
Radius: `var(--scs-radius)`, 2px, everywhere, no exceptions. One accent: clay,
on CTAs, on the live path rule, on the required field marker, nowhere else.

### 8. Signature Move

**One set of answers, two places to give them.** The two questions the lead form
already asks, interest and timing, are lifted out of the form and put at the top
of the page, where they route the content. The form at the bottom then renders
those same two fields already answered and still editable, sharing one piece of
page state. Answer at the top and the form is two thirds done. Ignore the top
and the form asks you properly. Nobody answers the same question twice, and the
routing is not a decoration bolted onto a form, it is the form's own first step
promoted to the page's organising principle.

### 9. Primary Risk

**The mechanic reads as a gate.** If a visitor perceives the four chips as
something they must complete before the page will talk to them, the page has
failed and a plain scroll would have converted better. Mitigations built in: the
hero carries the full headline, subtext and both CTAs with no dependency on the
mechanic; section 3 renders all four starting points in full as a readable index
before anything is chosen; every section from 4 down is completely static; and
the form validates the two answers itself, so a visitor who never touched a chip
still submits a valid lead. Secondary risk: the collapse animation in section 3
could be read as content disappearing rather than demoting, which is why the
three unchosen paths stay on screen as labelled rows rather than unmounting.

---

## Animations used, and why each one exists

The motion budget is spent entirely on state. **Nothing on this page animates on
load, on scroll, or on a timer.** Motion happens only when the visitor has
changed something, which is what makes it readable as meaning rather than as
decoration. That is the whole argument for MOTION_INTENSITY 6 here.

| # | Animation | What it communicates, in one sentence |
|---|---|---|
| 1 | Chip select: 150ms border and fill transition, plus `active:translate-y-[1px]` | Feedback that this exact control registered this exact press. |
| 2 | Routed detail swap: 220ms crossfade with an 8px rise, `AnimatePresence mode="wait"` | State transition: the page is showing different words because the answer changed, and the fade out proves the old words were replaced rather than added to. |
| 3 | Index collapse: `layout` transition on the four path rows, 280ms | State transition: the three paths you did not choose moved and shrank, they did not vanish, so switching is obviously still available. |
| 4 | Timing question reveal: 240ms height and opacity expansion | Storytelling: a second question exists as a consequence of the first being answered, and appearing in place says so more clearly than a step counter. |
| 5 | Carried answer note in the form: 200ms fade | Hierarchy: draws the eye to the two fields that are already filled, so the visitor reads the form as shorter than it looks. |

Reduced motion: `useReducedMotion()` from framer-motion drives every one of the
five. Under `prefers-reduced-motion: reduce` all durations go to zero and layout
animation is disabled, so state still changes correctly and instantly. The page
is fully usable, and the mechanic fully operable, with motion off.

Keyboard: every control is a real `<button>` or `<a>`. The chips are grouped in
`<fieldset>`/`<legend>` with `aria-pressed`, matching the existing lead form's
pattern. Focus rings are explicit on every interactive element and are chalk on
carbon bands, charcoal on chalk bands, because the global focus ring is charcoal
and would be invisible on the dark plate. A polite `role="status"` region
announces the routed starting point when it changes. The one programmatic focus
move is deliberate and user initiated: the booking CTA inside the routed panel
scrolls to the form and focuses its heading.

---

## Library and dependency check

`package.json` was read before importing anything. `framer-motion@12.35.1` and
`lucide-react@0.507.0` are already dependencies. Nothing new is installed and no
new network dependency is introduced. No CSS file is added: everything uses the
existing tokens and component classes in `src/index.css`.

## Shared truth imported, never retyped

`GYM_CONFIG`, `MEMBERSHIP_TIERS` and `PREFERRED_CONTACTS` from `src/config`,
`SCS_MEDIA` from `src/config/media`, `createLead` from `src/lib/api`,
`buildTourLeadPayload` / `createInitialTourForm` / `isTourPreviewMode` from
`src/utils/tourLead`, `createLeadRequestId` from `src/utils/leadContracts`,
`getLeadAttribution` from `src/utils/attribution`, analytics helpers from
`src/utils/analytics`, and the `Navbar`, `Footer`, `MapEmbed` and `Accordion`
components. No price, address or phone number is written as a literal.

The four interest values and four timeline values are re-declared in `paths.js`
because `QuizForm.js` keeps them as module-private constants and exports
neither. The values are the payload contract, so they are copied exactly and
carry a comment saying so. If those two tables are ever exported from a shared
module, `paths.js` should import them instead.

## Photography used, and photography still needed

Used, all real, all local:

- `SCS_MEDIA.heroFacility` as the hero stand in.
- `SCS_MEDIA.openGym` in section 4.
- `SCS_MEDIA.coachingFloor` in section 5, with alt text that describes what the
  frame actually is, a posed crew shot on the platform, not coaching in progress.
- `SCS_MEDIA.logo` in the entity blocks.

Deliberately unused: `communityFloor` and `communityGroup`. They are the same
five people at the same backdrop as `coachingFloor`, and using both on one page
exposes that the library is one shoot. One appearance is honest, two is a tell.

**Slots left empty, and what would fill them:**

1. **Hero.** A wide landscape interior of the training floor, specification in
   section 5 above. The portrait phone frame currently in the slot is real, and
   it is the wrong shape for the composition this direction reserves.
2. **Section 3, the routed answer.** Each of the four starting points has a slot
   reserved for one photograph of the thing it describes: a loaded bar, a rack
   in use, a coach and a lifter working together, the front counter. None of the
   four exists in the library and none is faked. The panel currently renders
   type only, which is why the plate is deliberately spacious.
3. **Section 9.** An exterior or signage frame without an identifiable person
   would help a visitor recognise the building on arrival. `coach.jpeg` shows
   the storefront but contains a person and is held for likeness permission.

No stock, no generated imagery, no placeholder service, no substitution.

## Project truth found wrong, or in conflict

1. **The `MEMBER_STORIES` instruction conflicts with a MUST PRESERVE.** The task
   brief lists `src/config/testimonials.js` as shared truth to import. Project
   truth guardrail 9.1 item 8 withholds testimonials until the gate at
   `Home.js:207` is satisfied: source URL, capture date, exact wording and
   permission. `testimonials.js` says in its own header that it publishes no
   dates and no source attribution, so two of the four gate conditions are not
   met. Separately, two of the six quotes contain an em dash, which the
   validator exempts for that one file but which would then be visible in
   shipped page copy. **This candidate renders no testimonials.** Reported
   rather than routed around. If the gate is cleared, the routed panel in
   section 3 is the natural home for one quote per starting point.
2. **`Home.js:11` imports `MEMBER_STORIES` and never uses it.** A dead import
   alongside the three dead constants already recorded in section 2.1 of
   project truth, which lists `BACKEND`, `Calendar` and `EQUIP_IMG` but not this
   one. Minor, and outside this candidate's directory, so untouched.
3. **The existing quiz mechanic is real and was built around, not replaced.**
   `QuizForm.js` steps 1 and 2 are the interest and timeline questions. This
   direction promotes them to the page and keeps their exact values, icons and
   validation messages. What it does not keep is the three-step wizard shell,
   which project truth section 8.9 explicitly makes disposable and section 10
   item 2 flags as the single largest unratified change to the conversion
   surface. This candidate returns the form to the one-screen shape shown in
   `APPROVED-preview-home.png` while keeping every piece of the newer payload,
   consent and idempotency work.
4. **`QuizForm` cannot be prefilled.** It takes no initial-values prop and
   builds its state from `createInitialTourForm` internally, so there is no way
   to hand it an answer given elsewhere on the page. That is why this candidate
   ships its own form component rather than rendering `QuizForm`. Every field,
   validation rule, error wiring, consent string, analytics call, test id and
   payload field is preserved. If this direction wins, the cleanest follow up is
   an `initialAnswers` prop on `QuizForm` and deleting the local copy.

## Guardrail compliance notes

- Required fields, email regex, `role="alert"` plus `aria-describedby` plus
  `aria-invalid`, SMS consent unchecked and never bundled, verbatim consent and
  reassurance copy, `trackFormStart` on first interaction, `trackLeadSubmit` on
  success, `trackBookTourClick('hero')` on the hero CTA, navigation to
  `/thank-you`, preview mode: all preserved.
- Test ids preserved on elements that still mean the same thing: `home-hero`,
  `home-hero-book-visit-button`, `contact-address-block`,
  `contact-click-to-call-button`, `contact-hours-block`, `home-map-embed`,
  `home-faq-accordion`, `lead-form-name-input`, `lead-form-phone-input`,
  `lead-form-email-input`, `lead-form-goals-textarea`, `sms-consent-checkbox`,
  `lead-form-submit-button`, `preview-tour-notice`, `preview-tour-success`.
- No hours table. No prices. No testimonials, ratings or counts. No invented
  equipment. No online purchase. No document title, no schema component.
- The five FAQ pairs are reproduced verbatim from `Home.js:29-35` so they stay
  in sync with `seo/home-schema.json`.
- No em dash or en dash anywhere in this directory, including as escapes.
- Bottom of the viewport is never occupied: no sticky bar, no floating summary,
  because the consent prompt lives there until it is answered.

## Files

- `index.js` The page. Default export, renders the complete homepage.
- `paths.js` The four starting points, their copy, and the answer tables.
- `AnswerChips.js` The shared fieldset of answer toggles, used in three places.
- `RoutedTourForm.js` The single-screen lead form that receives the answers.
- `index.test.js` Compile and contract smoke test.
