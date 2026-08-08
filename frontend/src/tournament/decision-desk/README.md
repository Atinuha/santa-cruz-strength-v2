# Direction 1: The Decision Desk

Tournament candidate for the Santa Cruz Strength homepage.
Dials as assigned: **DESIGN_VARIANCE 5 / MOTION_INTENSITY 3 / VISUAL_DENSITY 7.**

Everything in this directory is self contained. No file outside it was edited.

---

## The nine articulations

### 1. Direction Name

**The Decision Desk.** The homepage as a decision environment.

### 2. Aesthetic: family plus discriminating vocabulary

**Family: technical reference document.** The printed spec card, the trade price
list, the back matter of a catalogue where the table is the argument. Not a
brochure.

Vocabulary:

1. **Hairline ruled column grid.** One 12 column measure at 1200px. Rules are 1px
   charcoal at 10 percent and appear only where they separate real data.
2. **Tabular price ledger.** Nine prices in one aligned column, `tabular-nums` on,
   condensed display numerals so the figures stack into a readable column.
3. **Question, answer, qualifier cell grammar.** A fixed three part cell used
   across the Decision Row so five different facts read as one instrument.
4. **Clustered spec groups.** Long lists are chunked into three labelled groups
   with one divider per group. Never a hairline under every row.
5. **Paper field, carbon head and foot.** The body of the page is one continuous
   chalk document. Carbon appears only as the frame: nav, hero, footer.
6. **Hard cropped landscape plates.** Photographs are cropped to fixed landscape
   bands (16:9 and 3:1), never bled behind text, never used as a stage.
7. **Off photograph headline.** No display type sits on any image anywhere on this
   page. Type lives on flat carbon or flat paper.
8. **Stillness.** The page has no scroll motion, no entrance animation, no reveal.
   Hover, focus and active only.

### 3. Reference Read

The read is a page that behaves like a document a reasonable person would print
and take with them. References are non web: a gym price list taped inside the
door, an equipment inventory sheet, the specification page at the back of a
Filson or Klean catalogue where the numbers do the selling, a rental listing
before listings became marketing. The web reference closest to it is a well made
hardware product page with the Details pane opened, not a fitness landing page.
The typographic reference is the project's own approved language: Barlow
Condensed caps as figure and label type, DM Sans as reading type, clay reserved
for the thing you press.

### 4. Design Thesis, one sentence

A person choosing a gym is running a comparison rather than being courted, so
this homepage is built as the comparison itself: cost, access, location, terms
and risk all answered in place on one still page, with the visit as the only
thing left to do.

### 5. Future Hero

The photograph this hero is composed for does not exist yet and is not being
faked. Requested asset:

> A wide landscape photograph of the training floor, shot from the door end at
> roughly chest height, usable at 21:9 and at 1:1, exposed so the painted seal on
> the far wall reads and the green wall stripe falls into shadow rather than
> competing with clay. No identifiable faces, so it publishes without a likeness
> release. Minimum 2400px on the long edge.

**Stand in used right now:** `SCS_MEDIA.heroFacility` (`/assets/scs/facility.jpg`),
the real 1080x1440 portrait phone frame of the floor. It is a stand in and the
composition below is reserved so the real asset drops in without a redesign.

### 6. Hero Placement

| Property | Reserved value |
|---|---|
| Aspect ratio, desktop | The image column is 5 of 12 columns and stretches the full band height. At a 1200px measure and a 460px band that is roughly 1:1. The future 21:9 asset is cropped to that square by `object-fit: cover`. |
| Aspect ratio, mobile | Fixed 16:9 band, full bleed edge to edge, sitting directly under the navbar. |
| Focal zone | Centre horizontally, 55 percent vertically on desktop, 60 percent on mobile. That is the rack row and the painted seal on the far wall. Set by `objectPosition`, one value to retune when the real asset lands. |
| Text safe space | Total. **No text is ever placed on the photograph.** The headline, subtext and CTAs occupy the left 7 columns on flat carbon. A 1px chalk rule separates the two columns. This removes the scrim problem rather than solving it. |
| Crop behaviour | `object-cover`. The image is allowed to lose its edges. It is never letterboxed and never stretched. |
| Viewport relationship | The hero band is deliberately short: `min-h-[420px] lg:min-h-[52vh]`, top padding `pt-16` which is the navbar clearance and nothing more. It fits the initial viewport with room left, because the point is that the Decision Row below it is reachable immediately. |
| Responsive placement | Below `lg` the image moves above the text and becomes a full width 16:9 band. Order is image, headline, subtext, CTAs. At 390x844 the primary CTA still lands above the fold. |

### 7. Body Grammar

- **Measure.** One container, `max-w-[1200px] px-4 sm:px-6`, narrower than the
  current build's `max-w-7xl`. Narrower measure plus more content is where the
  density comes from.
- **Rhythm.** Sections are `py-12 lg:py-14`, tighter than the current `py-16
  sm:py-20`. Body copy runs `leading-[1.55]` rather than `1.65`.
- **Heading pattern.** Section headings sit at the left edge of the grid in
  `.font-display` at `text-[1.75rem] lg:text-[2rem]`. There is **no eyebrow above
  any section heading anywhere on this page.** A reference document does not
  announce each section twice.
- **Text levels on paper.** Exactly two: charcoal `#242321` for primary, and
  `rgba(36,35,33,0.72)` for secondary. Both pass WCAG AA on chalk (about 12.4:1
  and 6.3:1). **Stone `#8E867A` is used only on carbon**, where it measures about
  5.45:1 and passes. Stone on chalk is about 2.8:1 and does not appear on this
  page at all. This is a deliberate correction of the defect recorded at
  PROJECT-TRUTH 9.1 item 26.
- **Clay budget.** Clay is a filled surface on primary buttons, and a 1px
  underline on the two inline text links. Nothing else. Clay text on chalk is
  3.93:1 and clay text on charcoal is 3.05:1, so **clay never carries small
  type on this page.** Learn the fill once and every next step is findable.
- **Rules.** 1px, `var(--scs-border)` on paper and `var(--scs-border-dark)` on
  carbon. Rules separate real data only: column boundaries, cluster boundaries,
  cell boundaries. There is no decorative hairline on this page.
- **Radius.** 2px everywhere, including a local override that pulls the legacy
  10px map frame onto the same scale.
- **Photographic treatment.** One grade for every photograph:
  `saturate(0.35) contrast(1.05)`. Chosen to pull the real gym's bright green
  wall stripe back toward grey so it stops fighting clay, without dimming the
  room into something you cannot read.

### 8. Signature Move

**The Decision Row.** Directly under the hero, on carbon, a full width band of
five cells divided by vertical hairlines. Each cell is the same three part
grammar: the question in small caps stone, the answer in condensed display
chalk, the qualifier in small stone text. The five questions are the five a
person actually asks before walking into a gym:

| Where | Member access | A visit costs | Signing up | Shortest term |
|---|---|---|---|---|
| Harvey West | 24 / 7 | Nothing | In person | Month to month |

It is the first thing below the fold, it is the entire thesis compressed into
one band, and it does not move. Every value in it is sourced: the address from
`GYM_CONFIG`, the access and term lines verbatim from `MEMBERSHIP_TIERS`, the
visit line verbatim from the form's own reassurance copy, the signup line from
the membership sales decision record in `config/index.js`.

### 9. Primary Risk

**The page reads as a price list rather than as a gym, and the nine published
prices do the selling a coach is supposed to do in person.** Held back four ways:
there is no purchase affordance of any kind and no per tier button, the fee note
is carried verbatim under the ledger, the ledger sits *below* the room and the
equipment so the sequence stays see, then compare, then visit, and the only
action in that section is booking the visit.

Secondary risk: at density 7 the hairlines tip into a data dump. Held back by
clustering the nine tiers into three groups with one divider each, by never
putting a rule under every row, and by giving the page one deliberately loose
prose block near the bottom.

---

## Sections, layout families, and mobile collapse

Ten sections, ten distinct layout families. Zero eyebrows. One image plus text
split on the whole page.

| # | Section | Layout family | Collapse below `md` (768px) |
|---|---|---|---|
| 1 | Hero | Asymmetric split band, text left, plate right, no gap, hairline between | Single column. Image moves to top as a full bleed 16:9 band, then headline, subtext, stacked full width CTAs |
| 2 | Decision Row | Five cell hairline divided fact rail on carbon | 5 columns to 2 columns at `sm`, then 1 column. Vertical rules become horizontal rules |
| 3 | What is on the floor | Full width 3:1 photo plate above three clustered inventory columns | Photo plate becomes 16:9. Three columns stack, each keeping its own top rule |
| 4 | What it costs | Featured tile plus three grouped ledger clusters, aligned price column | Ledger rows go from 12 column grid to stacked blocks. Price stays first. Terms wrap |
| 5 | What help is available | Paired definition blocks, two up, top ruled | Two blocks stack, rules kept |
| 6 | Common Questions | Open two column question and answer grid, all five answers visible | One column, questions and answers stacked, one rule per pair |
| 7 | What members wrote | Horizontally scrolled register of fixed width ruled columns, attribution above the statement | Identical at every width. That is the point of the pattern: it does not reflow, it scrolls |
| 8 | Plan the visit | Form panel left, contact plate and map right | Form first, full width. Contact plate, then image, then map below |
| 9 | About this gym | Single measure prose | Unchanged, already single measure |
| 10 | Recent Posts (conditional) | Compact three up preview rows | Three to one column. The All posts link stays hidden below `sm`, as in the current build |

---

## Photography

Used, all real, all local, all documentary:

| Slot | Key | What it actually is |
|---|---|---|
| Hero plate | `SCS_MEDIA.heroFacility` | The real training floor, portrait phone frame, cropped. Stand in for the future hero above. |
| Floor plate | `SCS_MEDIA.openGym` | The real rack and bench row. Cropped hard to 3:1, which also crops off the letterbox bars in the source screenshot. |
| Visit plate | `SCS_MEDIA.communityFloor` | Five real people in front of the painted seal backdrop. Cropped 16:9. |

**Deliberately not used:**

- `SCS_MEDIA.coachingFloor` / `coachingCrew`. It is the same five people at the
  same backdrop as `communityFloor`, and PROJECT-TRUTH 4.1 records it as a
  playful posed group shot rather than coaching in progress. Using it to
  illustrate coaching would be a caption that does not match the frame, and
  putting it near `communityFloor` exposes that the page has one photo session
  and not two. The coaching section on this page carries no photograph.
- Everything in `SCS_MEDIA_AWAITING_PERMISSION`. Not touched.

**Photography this direction needs and does not have:**

1. The hero asset described in section 5 above. Wide, landscape, well lit,
   no identifiable faces.
2. A wide landscape frame of the rack row shot at 3:1 natively, so the floor
   plate stops being a crop of a phone screenshot.
3. Any frame of a coach working with a lifter, with a signed likeness release.
   Until that exists, the coaching section stays typographic.
4. An exterior and signage frame without an identifiable person, for the visit
   section. The address currently has no picture of the place it names.

No slot on this page is filled with a substitute. Where an honest photograph does
not exist, there is no photograph.

---

## Craft notes and compliance

**Constraint accounting**

- No em dash or en dash anywhere in this directory, including as escapes. The one
  escaped character class in `index.js` is the dash *stripper* applied to blog
  copy arriving from the API, written in exactly the form `pages/Home.js` uses,
  which the validator explicitly tolerates and which is the remedy rather than
  the violation.
- Eyebrows: **zero** above section headings. Budget was 4. `index.js` contains
  six `uppercase tracking` strings and not one of them is an eyebrow: five are
  the Decision Row cell questions, which are cell labels inside one data
  instrument; the others are the tier tag ("Most popular"), the two clay button
  labels, the entity chip's second line, and the blog category. A mechanical
  grep of the whole rendered page returns a higher number because the shared
  `Navbar` and `Footer` carry their own, which this candidate did not add.
- Consecutive image plus text splits: **one, total**, in the hero. Nothing else on
  the page is a split.
- No split header. Every section heading stacks vertically above its content.
  Where a section has two columns, both columns carry structured content, never a
  headline on one side and a floating explainer on the other.
- Hero: 3 text elements (headline, subtext, CTA pair). Cap is 4. Headline is 2
  lines at desktop, subtext is 15 words. Top padding is `pt-16`, which is navbar
  clearance. Cap is `pt-24`.
- Navigation: the shared `Navbar` is reused unchanged. One line at desktop, 64px.
- Radius: 2px, one scale, including `.dd-map` overriding the legacy `.scs-map`
  10px.
- Accent: clay only, per the budget in Body Grammar above.
- CTA labels: one label per intent. **Book a Free Facility Tour** appears in the
  hero, the ledger and the form, all to the same place. **Compare Memberships**
  appears exactly once, in the hero, and it moves the reader to the on page
  ledger rather than to `/join`, because on this page the comparison is here.
  `/join` stays reachable from the navbar Membership link and from the footer.
  **Ask About Personal Training**, **Get Directions**, **Request my free tour**
  and **All posts** each appear once.
- Contrast: `btn-clay` is white on clay at about 5.14:1. Chalk on carbon is about
  16:1. Stone on carbon is about 5.45:1. Secondary paper text is about 6.3:1. No
  CTA label wraps at desktop.
- Motion at 3: no keyframes, no scroll listeners, no reveals, no
  `scroll-behavior: smooth`. Only 180ms hover, focus and active transitions on
  interactive elements, and those are zeroed under `prefers-reduced-motion`.

**Truth handling**

- Every price, term, tag and note in the ledger is read out of `MEMBERSHIP_TIERS`
  by id. Not one figure is typed into this directory.
- `MEMBERSHIP_FEE_NOTE` renders verbatim directly under the ledger.
- Address, phone, `phoneHref`, email and the maps URL all come from `GYM_CONFIG`.
- The H1 and subhead go through the `copy()` CMS helper on
  `home_hero_headline_v2` and `home_hero_subtitle_v2` with the approved fallbacks.
- The five FAQ pairs are verbatim and match `src/seo/home-schema.json`.
- No hours table. The visit block says **Contact for current staffed hours**, as
  the current build does. The Decision Row's `24 / 7` cell is sourced from the
  Huscler tier's own published access term, which is a commercial representation
  rather than a staffed hours claim, and it is labelled *Member access* rather
  than *Hours* for exactly that reason.
- Member statements render verbatim from `config/testimonials`, with the
  provenance line the shipped homepage uses, and with no star rating, no review
  count and no date, because the business publishes none of those. See the
  reported conflict below.
- No invented statistics, member counts, years in business, awards or partner
  logos.
- No purchase affordance. No per tier button. No cart. Nothing on this page sells
  a membership.

**Reused rather than rebuilt:** `Navbar`, `Footer`, `QuizForm` and `MapEmbed`.
`QuizForm` carries the lead payload, the versioned consent block, the idempotency
key and eight `data-testid` values. Rebuilding a conversion surface inside a
tournament candidate would risk all of that for a layout preference. A single
screen form would suit this direction better and the approved screenshot backs
that shape, but that is a change to the lead contract and belongs to whoever owns
it, not to a design candidate.

**Icons:** `lucide-react`, because the project already depends on it and
PROJECT-TRUTH 9.3 requires it. Taste v2 3.C discourages lucide as a default and
allows it exactly on this condition.

---

## Reported errors in PROJECT-TRUTH

**1. PROJECT-TRUTH section 2.2 "SECTION 7, VERIFIED PROOF PLACEHOLDER" is wrong.**
It records that the slot renders nothing and that testimonials are withheld
behind a gate. `src/pages/Home.js:231-249` renders a full six card member
testimonial section, headed "Hear It From The Members" with the sub line
"Published on our site as written. Nothing edited.", carrying the testids
`home-testimonials-section` and `home-testimonial-{firstname}`. It maps
`MEMBER_STORIES`, which PROJECT-TRUTH section 2.1 also lists as an unused import.
Consequences for the frozen recon:

- Guardrail 9.1 item 8 ("No testimonials ... unless the withheld proof gate is
  satisfied") describes a policy the shipped page does not follow.
- The testid inventory at section 5.8 is missing seven live testids.
- Section 2.2 is off by one from section 9 onward, since the blog preview is
  numbered 9 in both the comment and the truth doc.

This candidate renders the statements, in its own grammar, because the shipped
page renders them and dropping a live section on the strength of an inaccurate
recon would have been the wrong call. Two things are worth an owner decision:
two of the six quotes contain a literal em dash, which reaches the rendered page
while the validator stays green because `src/config/testimonials.js` is the one
file exempted from the dash scan; and Taste v2 4.10 caps a quote at three lines,
which two of these exceed. Both were left alone. Editing a member's punctuation
or trimming their sentence would be altering a published review, which is the
larger problem, and `config/testimonials.js` says so in its own header.

**2. `pages/Home.js` carries three genuinely dead identifiers**, which
PROJECT-TRUTH 2.1 does record: `BACKEND`, `Calendar` and `EQUIP_IMG`. Running the
project's own react-app eslint rules over `Home.js` flags exactly those three and
nothing else. `MEMBER_STORIES` is not among them; it is live.

**3. The footer's tour link reads "Book a Facility Tour", not "Book a Free
Facility Tour".** `components/Footer.js:33`. PROJECT-TRUTH 9.1 item 4 requires
the CTA label verbatim, and 5.7 records the footer's wording without flagging the
mismatch. This candidate reuses the shared `Footer` unchanged rather than
forking it, so the inconsistency is inherited and reported rather than patched
inside a tournament directory.

## A note for the other candidates

Jest in this tree cannot resolve `react-router-dom` v7, which is why every
existing test is a source assertion and why at least two other candidates have a
render test that fails to run. Two virtual mocks get past it and let a candidate
be rendered to real HTML and read:

```js
jest.mock('react-router-dom', () => { /* Link, useLocation, useNavigate */ },
  { virtual: true });
jest.mock('axios', () => { /* create() returning a client with interceptors */ });
```

`decisionDesk.test.js` in this directory has the working version.
