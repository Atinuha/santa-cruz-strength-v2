# Santa Cruz Strength
## Visual + SXO + GEO + AEO Convergence Handoff for Claude Code

**Project:** Santa Cruz Strength existing-domain rebuild  
**Production domain:** `https://santacruzstrength.com/`  
**Primary goal:** Build a website that is stronger both as a human experience and as a machine-readable search and generative visibility system.  
**Implementation posture:** Preserve the working search architecture and backend improvements. Bring the visual system up to the same standard without weakening crawlability, semantics, accessibility, performance, conversion logic, or factual integrity.

---

# 0. Read this before touching code

This is not a greenfield redesign and it is not a request to "make the site prettier."

A large amount of structural, technical, content, SEO, SXO, GEO, AEO, accessibility, routing, prerendering, metadata, schema, form, backend, and QA work has already been completed.

The next phase is **convergence**:

- preserve the stronger machine layer
- preserve the approved content architecture
- preserve the approved copy and business facts
- preserve the working React/backend system
- preserve the prerender and route-specific HTML output
- preserve metadata, canonical, schema, internal linking, forms, and analytics behavior
- upgrade the frontend visual language so the site feels unmistakably Santa Cruz Strength
- add restrained, purposeful interaction and motion
- remove the repeated "cream field + rectangle + copy" visual pattern
- make real people, real equipment, real events, real coaching, and real proof the most beautiful elements on the site

The target is not the old website and it is not the current beige redesign.

The target is:

> **Editorial strength culture with Santa Cruz warmth.**

Not CrossFit aggression.  
Not wellness spa.  
Not generic SaaS.  
Not bodybuilding bro-site.  
Not an AI startup.  
Not a template marketplace fitness site.  

**Santa Cruz Strength.**

---

# 1. Mandatory context loading before implementation

Claude Code must not begin by freehanding a redesign.

Before modifying code, locate and read the full governing project material from start to finish.

## 1.1 Load the full Dex / SXO-GEO system

Find and read the complete files, not excerpts, snippets, or summaries:

1. `[TOOLS] - The SXO-GEO Suite v2.md`
2. `[REFERENCE] - How Machines Learned to Rank Us Back - The SXO-GEO Operating System.md`
3. `[REFERENCE] - The SXO–GEO Suite User Guide v2.md`
4. the current `SXO-GEO-PASS.html` / implementation report if present
5. any project-specific Dex persona or skill file installed in the Claude environment

If the Dex system exists as a Claude skill, open its full `SKILL.md` and supporting material. Do not merely mention Dex in the plan. Actually use its diagnose, prioritize, prescribe, verify operating loop.

The governing search model is:

### Human Layer

`Find -> understand -> trust -> compare -> act -> convert`

### Machine Layer

`Crawl -> parse -> identify entity -> understand relationships -> extract facts -> evaluate evidence -> retrieve/cite/recommend`

The visual redesign must improve the Human Layer without degrading the Machine Layer.

## 1.2 Load the three frontend/UI skills in full

Locate and load the installed versions of:

1. **Impeccable**
2. **the installed Emil frontend/UI skill** the user refers to as "emil klawsko". Use the exact installed skill identifier found in the environment. Do not guess the name.
3. **Taste Skill v2**

Read the complete skill instructions before using them.

If a skill requires an initialization/context command, run it as instructed by that skill while keeping the current project as the working directory.

Do not allow any visual skill to override the factual, semantic, accessibility, or performance guardrails in this document.

## 1.3 Conflict order

If instructions conflict, resolve them in this order:

1. factual truth and approved business data
2. crawlability, indexability, route identity, canonical integrity, schema truth
3. accessibility and form usability
4. performance and Core Web Vitals protection
5. approved content hierarchy and conversion logic
6. brand system and visual craft
7. animation and decorative polish

A beautiful interaction that makes critical copy unavailable in the initial HTML is a regression.

A clever visual that invents a business fact is a regression.

A premium animation that creates CLS or blocks the main thread is a regression.

---

# 2. Use agents deliberately

Use parallel agents or sub-agents if supported, but give each a narrow responsibility.

Recommended work split:

### Agent A: Dex / Search Systems Guardian

Audit all planned visual changes against:

- initial HTML availability
- H1/H2/H3 semantics
- title/meta/canonical behavior
- structured data consistency
- entity clarity
- FAQ visibility
- offer visibility
- internal linking
- route preservation
- evidence integrity
- article/indexability behavior

### Agent B: Brand + Impeccable Design Director

Study:

- existing live branding
- actual logo
- generated master brand board
- generated page moodboards
- real photo library
- current component system

Then define the visual convergence system.

### Agent C: Taste / Composition Reviewer

Audit rhythm, proportion, hierarchy, whitespace, typography, section transitions, visual repetition, density, and AI-template patterns.

### Agent D: Frontend Architecture Reviewer

Map the current React components, Tailwind/CSS tokens, shared layouts, primitives, image system, accessibility utilities, and route-level structure. Identify the smallest reusable implementation surface.

### Agent E: QA / Performance / Accessibility

Validate responsive behavior, focus states, reduced motion, forms, keyboard navigation, initial HTML, image loading, bundle impact, and visual regressions.

Integrate the findings into one plan before coding.

---

# 3. What has already been fixed and must not be undone

The previous architecture was a client-rendered React SPA. Humans could see the content after JavaScript executed, while non-JavaScript crawlers could receive almost no meaningful page body.

The rebuild corrected that by generating route-specific HTML at build time.

The approved implementation established, among other things:

- React 19 application remains the frontend architecture
- React Router remains the client routing model
- build-time prerender uses the same route components
- meaningful page copy now exists in the initial HTML
- route-specific preload data keeps hydration aligned with prerender output
- 39 public/known routes are rendered into route-specific shells in the build
- route-specific metadata already exists
- titles are unique
- production canonicals use `santacruzstrength.com`
- sitemap generation exists
- `robots.txt` exists
- structured data exists and uses stable business relationships
- homepage includes WebSite, WebPage, ExerciseGym and FAQ relationships where appropriate
- `/join` exposes membership offers through visible content and OfferCatalog markup
- `/personal-training` exposes the service through visible content and Service markup
- article schema avoids fabricated publication dates
- critical FAQ answers are present in the document even when visually collapsed
- all membership tiers are present in the document even when additional plans are visually collapsed
- navigation uses crawlable links
- important routes have one H1 and corrected heading hierarchy
- existing routes were largely preserved for migration safety
- preview domain leakage has been guarded against
- synthetic publication dates were removed
- search-visible business claims that lacked evidence were deliberately omitted instead of invented

**Do not replace this with a pure client-rendered visual implementation.**

**Do not move important text back behind click-only mounting.**

**Do not rebuild working metadata because a UI skill prefers another architecture.**

**Do not replace route-level HTML with one universal shell.**

---

# 4. Frontend philosophy: HTML-first output, React-enhanced interaction

React is not the problem. Empty initial HTML was the problem.

Continue using React components and the existing codebase. Use Tailwind and CSS where they are already effective.

The rule is:

> **Critical content is semantic HTML first. React enhances behavior after the content already exists.**

Use real semantic elements whenever appropriate:

- `<main>`
- `<header>`
- `<nav>`
- `<section>`
- `<article>`
- `<aside>`
- `<footer>`
- `<figure>` and `<figcaption>`
- `<blockquote>` for testimonials
- `<address>` where appropriate
- `<ul>` / `<ol>` for real lists
- `<dl>` where definition/value structure is useful
- `<h1>` through `<h3>` based on actual document hierarchy
- `<a href>` for navigation
- `<button>` for actions that do not navigate
- real `<label>` elements for forms

Avoid div soup when a semantic element accurately describes the content.

Do not rewrite the entire application as static HTML. The correct model is React components that prerender to useful HTML.

---

# 5. Moodboards are visual references only

The folder will contain generated ChatGPT Image moodboards for:

- Master Brand System
- Homepage
- Membership
- Personal Training
- About / Community
- Blog
- Events
- Contact
- Local Wellness if included

These images are **NOT factual sources**.

Image generation can and did synthesize placeholder information.

Therefore Claude must never copy business facts from generated images, including:

- addresses
- prices
- membership plan names
- phone numbers
- emails
- opening hours
- access rules
- coach names or biographies
- testimonials
- review counts or star ratings
- event names
- event dates
- event prices
- credentials
- statistics
- equipment inventory
- claims about certifications
- exact copy shown inside a generated moodboard

Use generated moodboards only for:

- composition
- rhythm
- color relationships
- typography scale
- treatment of images
- spacing
- section transitions
- icon language
- visual hierarchy
- interaction ideas
- surface treatment

The factual source of truth is:

1. current approved CMS data
2. current approved route copy
3. the current code/data models
4. explicit owner-confirmed facts
5. the existing evidence ledger / implementation report

If a moodboard conflicts with the code or approved facts, the moodboard loses.

---

# 6. Actual logo and brand integrity

Use the real Santa Cruz Strength logo asset already present in the project or supplied asset folder.

Do not:

- recreate the logo from an AI image
- redraw the logo inaccurately
- alter the crossed barbell mark
- stretch it
- replace it with a generic dumbbell mark
- use the generated moodboard version as the source asset

The logo should anchor the design system but not be repeated as decoration in every section.

Use the logo geometry as a grammar:

- circle = community / membership / people
- crossed bars = training / action / strength
- rack-hole rhythm = structure / progression
- plate ring = facts, counters, milestones, navigation markers
- bar shaft = section rail or connection line
- platform corner = framing accent

The goal is to let the identity influence geometry without wallpapering the site in logos.

---

# 7. Approved visual direction

## 7.1 Brand essence

The website should feel:

- serious without intimidation
- local without looking homespun
- strong without macho theater
- inclusive without corporate virtue-signaling
- premium without luxury-spa language
- technical without feeling sterile
- warm without becoming soft
- editorial rather than templated
- physical and real rather than digital-first

Core verbal and visual territory:

- real people
- real equipment
- real coaching
- real training
- real community
- serious strength
- Santa Cruz local roots
- 24/7 member access when verified and applicable
- powerlifting
- Olympic weightlifting
- strongman
- general strength training

## 7.2 Core palette

Normalize these as design tokens after checking existing production CSS and actual logo colors.

```css
--scs-forest: #0E5D3E;
--scs-deep-forest: #083E2A;
--scs-mint: #CDEAE0;
--scs-warm-cream: #F7F5F0;
--scs-ink: #1B1B19;
--scs-coral: #C94A4E;
--scs-coral-bright: #FB5A5C;
--scs-warm-sand: #E8E1D6;
--scs-white: #FFFFFF;
```

### Color roles

**Forest**  
Primary brand identity, navigation, footer, important rails, custom icon linework, selected states.

**Deep Forest**  
Dark feature sections, hero overlays, strong CTA regions, premium contrast moments.

**Mint**  
Community, guidance, human-centered content, selected plan framing, gentle highlight fields.

**Warm Cream**  
Primary page canvas.

**Ink**  
Main body and headline support color.

**Coral**  
Urgency and conversion. Use sparingly for facility tour CTAs, important states, progress accents, and small visual sparks.

**Warm Sand**  
Texture, secondary section contrast, subtle industrial warmth. Do not let it dominate the entire website.

### Contrast rule

Do not use white text on bright coral where contrast fails. For white-text CTA buttons, use the darker coral token after testing contrast.

## 7.3 Typography

Preferred visual direction:

- **Display:** Barlow Condensed or the closest already-approved/self-hosted condensed industrial font
- **Body/UI:** Inter or the current already-approved highly legible sans-serif

If the exact fonts are not currently available, do not add slow third-party font requests without review. Prefer self-hosted and subset fonts.

Suggested hierarchy:

- Display H1: 700 to 800 weight, condensed, tight leading
- H2: condensed, uppercase or strong title treatment, clear section payload
- H3: compact condensed label/title
- Body: regular 400 to 500, generous line height
- Eyebrows: uppercase, letter-spaced, forest or muted ink
- UI labels: compact, legible, not tiny

Headings must remain semantically correct. Visual size is controlled by CSS, not by misusing heading levels.

## 7.4 Texture

Use physical gym texture with restraint:

- rubber flooring grain
- painted wall texture
- steel equipment texture
- chalk-like speckle
- concrete hints
- subtle print/editorial grain

Texture must never reduce text contrast.

Avoid fake distressed overlays on every surface.

---

# 8. SCS Equipment Blueprint visual system

Narrative icons must not come from generic fitness icon packs.

Create a reusable SVG icon system inspired by actual strength equipment.

Style:

- technical line drawing
- slightly imperfect, like a gym equipment blueprint or old training manual
- forest green linework by default
- one small coral accent only when useful
- no 3D rendering
- no gradients
- no cartoon athletes
- no generic giant dumbbell icon

## 8.1 Starting Point icons

### First-Time Lifter

Concept: unloaded bar on rack pins with one bumper plate nearby.

Meaning: beginning, readiness, guidance, no intimidation.

### Independent Member

Concept: training notebook/program sheet intersected by a clean barbell line.

Meaning: "I already have my plan. Give me the right floor and equipment."

### Experienced Strength Athlete

Concept: competition plate, collar, rack upright, platform marking.

Meaning: specificity, competition standards, serious training.

## 8.2 Training discipline icons

### Powerlifting

Front elevation of competition rack, bar on J-cups, bench line or platform base.

### Olympic Weightlifting

Loaded bar over a platform with one restrained bar-path stroke.

### Strongman

Use only equipment SCS actually owns or clearly supports. If equipment inventory is not verified, use a neutral strongman composition without claiming specific unavailable implements.

### General Strength Training

Bar, plate, adjustable bench, rack arranged as a compact modular system.

## 8.3 Utility motifs

Reusable motifs can include:

- plate ring
- rack-hole rail
- platform corner marker
- barbell shaft divider
- competition collar accent
- chalk mark
- training notebook mark

These should become real SVG assets or CSS patterns, not raster screenshots.

---

# 9. Motion system

The site needs movement, but it must not become an animated-site demonstration.

Use five motion behaviors consistently.

## 9.1 Load

For section titles, factual blocks, cards, and photos.

- opacity from 0 to 1
- translateY from 8 to 12px to 0
- 400 to 550ms
- easing around `cubic-bezier(0.22, 1, 0.36, 1)`
- stagger 80 to 120ms when a group enters

## 9.2 Draw

For custom blueprint icons, rails, and connection lines.

- SVG stroke reveal
- 450 to 700ms depending on complexity
- use only when the icon meaning benefits from the reveal

## 9.3 Lock

For membership selection, active tabs, highlighted route cards, and selected states.

- border/rail slides into place
- subtle background transition
- no scale bounce

## 9.4 Shift

For selected real photographs only.

- very slow 1 to 2 percent crop shift or background-position movement
- no dramatic parallax
- no scroll hijacking

## 9.5 Advance

For CTA arrows and directional affordances.

- 3 to 5px horizontal shift on hover/focus
- 160 to 220ms

## 9.6 Motion rules

- support `prefers-reduced-motion: reduce`
- no bounce
- no endless pulsing
- no spinning icons
- no autoplay carousels
- no cursor-following decoration
- no WebGL
- no Three.js
- no particles
- no heavy timeline animation dependency unless already present and demonstrably necessary
- prefer CSS transitions and IntersectionObserver
- no animation may shift document layout after content paints

Premium motion is restrained motion.

---

# 10. Global layout system

## 10.1 Header/navigation

Use the actual logo on the left.

Desktop navigation remains concise and predictable.

Primary links should reflect the approved route structure.

The facility-tour CTA is the primary conversion accent and can use coral.

Navigation behavior:

- sticky only if it remains lightweight and does not create layout jumps
- active route state in forest/mint system
- keyboard-visible focus states
- anchors remain real crawlable links
- mobile menu must be fully keyboard operable

Do not add mega-menu complexity unless the information architecture genuinely requires it.

## 10.2 Section rhythm

Avoid a site where every section is:

`cream background -> white cards -> centered heading -> white cards`

Alternate deliberately among:

- full-bleed real photography
- cream editorial field
- mint human/community field
- deep forest proof/action field
- asymmetric image/text composition
- blueprint rail section
- testimonial/editorial composition
- map/location utility field

Every section should have a visual reason to exist.

## 10.3 Container widths

Use a consistent site grid but allow controlled breakout sections.

Recommended model:

- readable text measure: 60 to 75 characters
- body content container: roughly 1120 to 1240px depending on current system
- wide photo/rail breakouts can extend beyond standard text column
- avoid giant empty desktop gutters that make pages feel unfinished

## 10.4 Borders and radii

Do not use a different radius on every component.

Choose a small token set, for example:

- sharp/technical: 0 to 4px
- normal card: 8px
- soft human card: 12px

Use radius by component meaning, not randomly.

---

# 11. Homepage redesign specification

The homepage must remain the strongest intersection of:

- brand
- local/category clarity
- trust
- facility proof
- segmentation
- training disciplines
- coaching
- membership
- testimonials
- content discovery
- conversion
- FAQ
- local entity/contact

Preserve approved copy unless explicitly adjusting a heading for clarity with evidence review.

## 11.1 Hero

Preserve the approved current hero content and business facts from the code/CMS.

Do **not** copy the synthetic hero text from generated moodboards.

Visual direction:

- real SCS gym photograph
- dark forest/ink overlay sufficient for text contrast
- actual logo in header
- bold condensed H1
- facility tour CTA in accessible coral
- secondary membership CTA outlined or mint/forest
- subtle texture, not fake fog or glow

The LCP image must be optimized, dimensioned, and intentionally loaded.

No autoplay hero video for launch.

## 11.2 "What Santa Cruz Strength Is"

This section is important to GEO and entity clarity.

Do not make it look like a legal paragraph inserted for SEO.

Recompose it as an editorial definition/proof block.

Suggested layout:

- left: concise approved entity definition
- right: 3 to 4 factual proof chips sourced from verified site data
- one small real equipment/detail photo or blueprint accent

Possible proof categories only if verified in current data:

- Santa Cruz location
- member access model
- training disciplines
- coaching availability
- membership/day-pass availability

Do not create synthetic stats.

## 11.3 "Walk the Space"

Turn the standard image/text split into a signature facility proof moment.

Preferred direction:

- one real wide photo of the gym
- 3 to 5 subtle interactive hotspots
- example categories: racks, platforms, open floor, equipment, access
- hover/focus/tap reveals one factual sentence

Accessibility requirement:

- each hotspot is a real button with an accessible label
- all hotspot facts also exist as normal visible/accessible HTML near the image or in an associated list
- no critical content exists only in hover state

If factual equipment details are not verified, use broad approved categories rather than inventing counts or brands.

## 11.4 "Three Ways People Start Here"

Replace three anonymous white rectangles with three distinct entry routes.

### First-Time Lifter

- warm cream or white
- large blueprint icon
- strong number `01`
- approved description
- subtle route link or action only if the destination truly exists

### Independent Member

- mint field
- notebook/barbell blueprint
- number `02`

### Experienced Strength Athlete

- deep forest field
- cream line icon
- coral micro accent
- number `03`

Interaction:

- number enters
- SVG draws
- copy lifts 8 to 12px
- bottom rail expands

Do not add links to thin nonexistent discipline pages merely because the moodboard shows them.

## 11.5 "Built for Strength Training"

Replace the four static cards with the **Training Rail**.

Desktop concept:

`POWERLIFTING ----- OLYMPIC WEIGHTLIFTING ----- STRONGMAN ----- GENERAL STRENGTH`

Each station includes:

- bespoke blueprint icon
- approved factual paragraph
- a rail/node connection inspired by a barbell shaft, platform line, or rack-hole rhythm

Optional desktop enhancement:

- focus/hover expands an associated real photo crop or detail area

Mobile:

- use a clean vertical rail or snap track
- no horizontal trap that makes reading difficult

Critical copy stays in the HTML and is readable without interaction.

## 11.6 Coaching

Use a deeper contrast moment.

Direction:

- deep forest or ink background
- real coach/member photo
- short approved coaching proposition
- restrained specialty tags only from verified data
- "Meet the Coaches" or current approved CTA

If coach credentials are incomplete, do not fill gaps with generic bios.

## 11.7 Membership preview

Use forest/mint/coral brand hierarchy.

Do not recreate all pricing from image moodboards.

Use current approved membership data only.

Featured plan can visually "lock" into place with border/background motion.

Keep price and access information explicit.

## 11.8 Testimonials

Current content is valuable trust evidence.

Move away from six equal rectangles.

Preferred composition:

- one primary large quote
- two or three supporting quotes
- training context label where already verified
- source/date only when actually known

No autoplay carousel.

Keep testimonials as real `<blockquote>` content.

Do not rewrite quoted member language for style.

## 11.9 Recent posts

Do not show three tiny generic cards as an afterthought.

Use:

- one featured article
- two secondary articles
- clear link to Blog

Use real photography only when it actually belongs to SCS or the article.

Otherwise use the programmatic editorial cover system defined below.

## 11.10 Facility tour / lead section

Retain the working form logic.

Visual direction:

- deep forest field
- form on warm cream/white
- visible progress
- "what happens next" microcopy nearby
- strong local proof and no-pressure language

Do not remove labels or validation behavior.

## 11.11 FAQ

Keep answers in prerendered HTML.

Visual direction:

- warm cream or mint-tinted field
- strong section heading
- thin forest dividers
- restrained accordion motion

The FAQ must remain semantic and schema-aligned.

## 11.12 Footer

Replace generic black closure with the forest brand system.

Include only verified current:

- business name
- address
- phone
- email
- navigation
- social links
- legal links

Use the real logo.

---

# 12. Membership page redesign specification

The membership page is transactional. Clarity beats spectacle.

Preserve:

- all approved plans
- all approved prices
- commitment terms
- savings baselines
- access wording
- membership FAQs
- tour/join forms
- OfferCatalog truth

## 12.1 Hero/intro

Do not invent a new pricing slogan from a moodboard.

Use current approved H1 and supporting text, then visually elevate with:

- concise eyebrow
- strong condensed H1
- clear trust line
- optional real facility crop behind or adjacent, if it does not obscure pricing intent

## 12.2 Primary three plans

Suggested visual hierarchy:

### Day Pass

- white/neutral
- clear "try us" treatment

### 12-Month Membership

- mint field or mint top band
- forest border
- "Most Popular" only if already approved

### Annual Paid-in-Full

- premium warm cream/deep forest accents
- clear effective monthly comparison only if the approved logic already supports it

Do not copy generated moodboard pricing.

## 12.3 Additional plans

Keep them in the initial HTML.

When collapsed, use visual hide/show only.

Cards should be simpler than primary plans but still readable.

## 12.4 "Why Commit?" progression

Replace three generic little boxes with a functional cost progression graphic.

Use the actual approved monthly, 12-month, and annual effective values.

Concept:

- horizontal strength/progression rail
- the physical bar length or track decreases as monthly effective cost decreases
- numerical values remain normal HTML text

No animation should change meaning or hide numbers.

## 12.5 Membership FAQ

Keep exact approved FAQ answers.

Use semantic accessible accordion and preserve prerendered answer content.

## 12.6 Tour/signup form

Retain current form flow and business integration behavior.

Styling:

- stronger step indicator
- calm form field spacing
- coral only for meaningful progression CTA
- no decorative steps that imply a different workflow from what the backend actually performs

---

# 13. Personal Training page redesign specification

The page should feel like a conversation with a coach, not an insurance intake form.

Preserve approved service copy and Service schema.

## 13.1 Hero

Use real coaching photography if a suitable approved photo exists.

Preferred photo content:

- coach discussing a lift
- technique cue
- assessment/conversation
- coach and member at the rack

Avoid staged "heroic PR" imagery if it does not reflect the service.

Layout can pair:

- headline/service proposition
- real coach/member photo
- inquiry form

Do not use generated people from moodboards as website assets.

## 13.2 "Who Personal Training Is For"

Move from a plain bullet list into a strong but semantic set of user scenarios.

Use custom line icons or simple text markers.

Keep the actual approved audience definitions.

## 13.3 "How Personal Training Works"

Use a horizontal or vertical progression rail:

`INQUIRY -> A COACH MAKES CONTACT -> YOU MEET AT THE GYM`

Use custom icons, for example:

- inquiry: training notebook / clipboard
- contact: connected rack-pin or simple phone/contact symbol
- meet: platform/rack/location composition

All text remains HTML.

Draw the connecting line on scroll with restrained SVG/CSS animation.

## 13.4 First consultation

Use asymmetric split layout:

- real consultation/training photo
- factual expectations list

Do not add tests, assessments, promises, or session details that are not already approved.

## 13.5 Coaches

Use real photos from the project library.

If a coach photo is missing:

- do not show a generic person icon
- do not generate a fake portrait
- use an intentional branded monogram/text card using SCS colors and the real coach name/title

Only show verified:

- name
- title/role
- credentials
- specialties
- competition background
- bio copy

Do not create bios to fill space.

## 13.6 Trust proof

If there is a real personal-training testimonial, feature it as a human proof surface.

Do not fabricate ratings or before/after results.

---

# 14. About page redesign specification

The page should tell a real local strength-community story.

## 14.1 Opening story

Current centered text block is too static and too manifesto-like.

Use an editorial split:

- left: approved pull quote such as the existing "Rooted in strength. Built with heart." if it already exists in approved copy
- right: approved story copy
- large real archival/community image nearby

Keep body text readable and left-aligned at a comfortable measure.

## 14.2 Story progression

If supported by approved copy, organize the narrative into three semantic stages without inventing dates:

1. Built for strength sports
2. Became a community
3. Santa Cruz Strength today

These can be H2/H3-supported sections or an accessible timeline-style layout.

Do not fabricate years, founding dates, member counts, or milestones.

## 14.3 Team

Use actual team photos and current roles.

Avoid excessive card repetition. Consider a strong 3-person editorial row with text beneath or beside photos.

## 14.4 Trainers

Use a consistent coach-card system shared with Personal Training.

Missing photo behavior uses branded monogram card, never generated portrait.

## 14.5 Closing CTA

Use deep forest field and clear facility tour / membership action.

---

# 15. Blog index redesign specification

The current blog must become an editorial product rather than a spreadsheet of identical cards.

Preserve:

- current article routes
- current category relationships
- internal links
- crawlable article anchors
- existing article copy
- real article dates only when available
- canonical behavior
- article schema truth

## 15.1 Hero

Use a strong editorial header:

- Blog label
- current approved title and description
- subtle equipment blueprint or actual logo motif

Do not use synthetic factual text from generated moodboards.

## 15.2 Featured content hierarchy

Use:

- one large featured article
- two secondary feature articles
- then the full grid

Featured status should come from real content configuration or deterministic logic, not arbitrary hidden SEO behavior.

## 15.3 Programmatic editorial covers

Do not fill missing thumbnails with AI-generated athlete photography.

Build a code-driven cover system using:

- article category
- article title
- one SCS blueprint icon/motif
- forest/mint/cream/coral palette
- typography

Possible visual grammar:

```text
POWERLIFTING
------------
YOUR FIRST
POWERLIFTING
MEET
------------
[SCS RACK BLUEPRINT]
```

Implement covers as HTML/CSS/SVG where possible so they are crisp, lightweight, and consistent.

## 15.4 Filter controls

Filters may enhance browsing with React, but:

- all article links remain crawlable
- article cards still exist in server/prerender output as appropriate
- filtering must not create inaccessible content traps

## 15.5 Article cards

Use a small set of card patterns, not 25 identical tiles.

Variation can come from:

- featured size
- real photo vs programmatic cover
- category band
- editorial orientation

Do not fabricate read times unless the code currently calculates them legitimately.

---

# 16. Events page redesign specification

Events are strong E-E-A-T and community evidence. They should look alive because they are real-world activity.

Generated event moodboards contain synthetic example events. Do not copy them.

Use only actual CMS event data.

## 16.1 Hero

- real gym/event photography
- current approved event heading/copy
- local address/context if already approved

## 16.2 Featured next event

If a real upcoming event exists:

- large photo
- event name
- actual date/time
- actual location
- actual pricing/status
- coach/person when verified
- clear CTA based on actual registration behavior

Use Event schema only when the visible event data supports it.

## 16.3 Event grid / archive

Use strong date blocks and real photography.

If there are no events, keep the honest empty state. Do not populate the page with synthetic cards just to make it look full.

## 16.4 Past events

Over time, past event recaps can become an evidence archive with real photos and outcomes.

---

# 17. Local Wellness page redesign specification

Local Wellness serves a different buying context but should not look like a separate SaaS product.

Preserve the approved B2B copy and current indexability decision unless explicitly changed by the owner/search strategy.

Visual direction:

- same forest/mint/cream system
- more restrained corporate structure
- real gym/community proof
- clear process
- current real contribution/pricing model only
- strong local-business credibility

Do not invent employee counts, discount tiers, business categories, pricing, or customer logos from moodboards.

If the page remains `noindex`, visual work must not silently change that directive.

---

# 18. Contact / Facility Tour page redesign specification

This page is operational. Truth and clarity come first.

Preserve the current approved:

- address
- phone
- email
- access/hours copy
- map
- form
- privacy/consent language
- tour workflow

Do not copy the fake numbers or addresses in generated images.

## 18.1 Page structure

Suggested composition:

- strong local/contact intro
- visit details card
- access/hours card
- inquiry/tour form
- map
- "what to expect" section
- FAQ

## 18.2 Map

Use real map embed or current map implementation.

Reserve layout space to prevent CLS.

## 18.3 Form

Keep labels visible.

Placeholders should be generic, for example "Your phone number," not a realistic fake phone number.

Keep clear success and failure states.

---

# 19. Future Gym / Equipment hub

Do not create a thin `/gym` or `/equipment` page just because visual concepts exist.

Create it only when the evidence inventory can support it.

Future data should include verified facts such as:

- rack count and type
- platforms
- barbells and specialty bars
- plates
- dumbbell range
- machines
- strongman implements
- conditioning equipment
- chalk policy
- dropping/deadlift policy
- access rules
- photos

When those facts exist, this page should become a major topical hub and internal-link node.

Until then, do not invent.

---

# 20. Trust surface design

The most visually important content should often be proof.

Prefer:

- member quotations
- real coaching interactions
- actual competition/event photos
- actual staff/coaches
- real facility images
- real equipment
- specific policies and prices
- real location information
- authentic community language

Avoid decorative claims such as:

- "elite coaching" without evidence
- "best gym" without context
- "world-class equipment" without inventory
- fake statistics
- anonymous five-star graphics without source data

Testimonials must remain quoted faithfully.

If provenance fields exist, use them. If they do not, do not invent them.

---

# 21. Anti-AI-slop constitution

The following are prohibited unless a very specific approved reason exists:

- fake people
- generated member photos
- generated coach portraits
- generated gym photography presented as real
- floating 3D dumbbells
- glowing gradients
- abstract blobs behind headings
- "innovation" sparkles
- generic oversized stock icons
- glassmorphism
- random neon effects
- endless marquees
- autoplay carousels
- scroll hijacking
- particle effects
- cursor followers
- fake dashboards
- fake metrics
- fake review counts
- fake star ratings
- fake equipment counts
- fake events
- fake awards
- fake credentials
- fake dates
- fake stats
- hidden SEO text
- keyword stuffing
- 14 unrelated border radii
- every section using the same card layout
- animation added simply because a library supports it

The site must feel authored, not generated.

---

# 22. Image policy

Use real Santa Cruz Strength photography from the project library as the default visual proof.

Prioritize a real photo set covering:

- exterior/entrance
- full training floor
- racks
- platforms
- bars/plates
- strongman area if applicable
- members training
- coaches
- community groups
- meets/events
- facility tours

## 22.1 Responsive image implementation

Use:

- correct width/height attributes or aspect ratios
- `srcset` / `sizes` where available
- WebP/AVIF when pipeline supports it
- lazy loading below the fold
- eager/preload only for the actual LCP asset
- meaningful alt text for informative images
- empty alt for purely decorative images

Do not degrade LCP for a visual flourish.

---

# 23. Accessibility requirements

Target WCAG 2.2 AA behavior for the redesigned UI.

Validate:

- text contrast
- CTA contrast
- keyboard navigation
- visible focus states
- mobile touch targets
- semantic form labels
- error messaging
- accordion states
- modal/flyout focus trapping if any
- reduced motion
- alt text
- logical reading order
- no hover-only information
- no color-only meaning

Custom icons are decorative unless they carry unique meaning. Mark them appropriately.

Interactive photo hotspots require keyboard and screen-reader equivalents.

---

# 24. Performance guardrails

The source SXO system treats speed and stability as infrastructure, not decoration.

Do not add large frontend libraries simply to create effects that CSS can perform.

Prefer:

- CSS transforms
- opacity
- IntersectionObserver
- lightweight SVG
- existing utilities

Avoid adding:

- GSAP across the whole site
- Framer Motion solely for simple fades if not already required
- WebGL
- Three.js
- heavy animation frameworks
- large icon packs imported wholesale

Protect targets for later measured production validation:

- LCP <= 2.5s
- INP <= 200ms
- CLS <= 0.1

Do not claim the targets are achieved until measured.

---

# 25. Search and semantic guardrails during visual refactor

## 25.1 Initial HTML

After every major frontend refactor, validate that the built route HTML still contains:

- page-specific title
- description
- canonical
- one H1
- meaningful body copy
- navigation links
- page-specific primary content
- structured data where expected

## 25.2 Collapsed content

Important FAQ and membership details must remain in the prerendered document.

Visual collapse may use CSS/accessible state, but do not return to mount-on-click-only behavior for search-critical content.

## 25.3 Internal links

Use real anchors with descriptive link text.

Avoid vague repeated "Learn More" labels when a clear destination label fits.

## 25.4 Schema

Visual changes must not create a mismatch between JSON-LD and visible content.

If visible offers change, schema must match.

If visible FAQ changes, FAQ schema must match.

If a coach is not visibly present or credentials are not verified, do not create Person claims to make the graph look richer.

## 25.5 Canonical/indexability

Do not change:

- canonical decisions
- noindex decisions
- redirects
- sitemap inclusion
- route identities

as a side effect of visual work.

Any search architecture change must be intentional and separately documented.

---

# 26. Content rules

The approved copy is an asset.

Do not rewrite pages into moodboard copy.

Do not turn precise copy back into marketing fluff.

When copy changes are genuinely needed for hierarchy or clarity:

1. identify the exact sentence/section
2. explain the Human Layer reason
3. explain the Machine Layer reason
4. preserve facts
5. preserve source/evidence status
6. get approval before changing important claims

Headings should summarize their payload.

Avoid metaphor-only H2s that make a section difficult to predict.

---

# 27. Local entity consistency

The site must present one coherent Santa Cruz Strength entity.

All visible business data must come from the current approved source of truth.

Do not normalize contradictions silently.

If the codebase contains conflicting:

- hours
- day-pass windows
- membership access
- address formatting
- legacy names
- phone numbers
- social URLs

flag the contradiction instead of choosing one based on a moodboard.

---

# 28. Integration protection

The visual refactor must not break:

- Resend/email flows
- Twilio flows
- GymMasterOnline integration
- lead forms
- existing GA4 events
- consent gates
- click-to-call
- directions events
- membership views
- facility-tour submissions
- personal-training submissions

Secrets stay server-side.

Do not rename analytics events that already have history without explicit approval.

---

# 29. Recommended implementation order

Do not attempt every page in one giant uncontrolled patch.

## Phase 1: audit and freeze

- load full Dex + source files
- load the three UI skills
- inventory all moodboards
- inventory actual logo and real photos
- inventory design tokens
- map shared components
- snapshot current screenshots
- run baseline tests

## Phase 2: design system convergence

Create or normalize:

- color tokens
- typography tokens
- spacing scale
- radius scale
- border styles
- buttons
- form fields
- section wrappers
- blueprint icon system
- photo treatments
- motion utilities
- focus states

Avoid page-specific one-off CSS when a reusable primitive makes sense.

## Phase 3: homepage pilot

Implement the homepage first because it contains most of the shared section types.

Validate:

- desktop
- tablet
- mobile
- prerendered HTML
- metadata
- schema
- forms
- motion reduction
- performance impact

Do not proceed to all subpages until the homepage visual language is approved.

## Phase 4: money pages

Implement:

1. Membership
2. Personal Training
3. Contact / Facility Tour

These pages have direct conversion responsibility.

## Phase 5: authority pages

Implement:

1. About
2. Blog
3. Events
4. Local Wellness

## Phase 6: global polish

- header
- footer
- breadcrumbs
- empty states
- 404
- privacy/terms readability
- form success states
- mobile details

## Phase 7: verify

Run full test and screenshot pass.

---

# 30. QA matrix

Before declaring the visual convergence complete, produce a route-level QA report.

At minimum test:

- `/`
- `/join`
- `/personal-training`
- `/about`
- `/blog`
- representative article
- `/events`
- `/contact`
- `/local-wellness`
- `/privacy`
- `/terms`
- 404 route

For each important route verify:

| Check | Expected |
|---|---|
| HTTP | correct status |
| initial HTML | meaningful page body |
| title | page-specific |
| meta description | page-specific |
| canonical | production domain |
| H1 | exactly one appropriate page H1 |
| headings | logical H1 -> H2 -> H3 |
| navigation | crawlable anchors |
| structured data | valid and visible-content aligned |
| forms | functional |
| keyboard | functional |
| reduced motion | respected |
| mobile | no overflow or broken stacking |
| imagery | correct real assets / programmatic covers |
| CLS | no obvious layout movement |
| preview-domain leakage | none in production output |

Also rerun existing backend, frontend, SEO, and prerender tests.

---

# 31. Visual review questions Claude must ask itself

For every section, answer:

1. What is the human job of this section?
2. What is the machine-readable fact or relationship carried by this section?
3. What is the single visual idea of this section?
4. Does it look different from the section before it for a reason?
5. Is the most visually prominent content also the most important content?
6. Are we using proof instead of decoration where possible?
7. Does the section still make sense without animation?
8. Does it still exist in useful HTML without JavaScript?
9. Is any detail invented?
10. Could this belong to another gym if the logo were removed?

If the answer to question 10 is yes, the section needs more Santa Cruz Strength DNA.

---

# 32. What "premium" means for this project

Premium does not mean:

- more gradients
- more animation
- more glass
- more shadows
- more decorative components

Premium means:

- exact spacing
- deliberate hierarchy
- strong crop choices
- real material texture
- strong typography
- consistent color roles
- confident empty space
- clear information
- excellent form behavior
- controlled transitions
- authentic photography
- proof surfaced beautifully
- no accidental visual noise

The site should feel like someone who understands strength training designed it with an editor and a systems engineer in the room.

---

# 33. Required deliverables from Claude Code

Before any production deployment, return:

## 33.1 Context confirmation

List the exact full files/skills loaded:

- Dex/SXO-GEO source files
- Impeccable
- Emil UI/frontend skill exact installed identifier
- Taste Skill v2
- moodboard/image paths
- actual logo path

## 33.2 Design system manifest

Provide:

- tokens
- typography
- spacing
- radius
- icon approach
- motion approach
- image treatment
- reusable primitives

## 33.3 Page implementation manifest

For every page changed:

- sections changed
- components introduced
- copy changed, if any
- factual fields touched
- schema impact
- accessibility impact
- performance impact

## 33.4 Evidence-gap log

List anything you deliberately did not add because it is not verified.

## 33.5 Screenshot set

Capture desktop and mobile screenshots for the major pages after implementation.

## 33.6 Search integrity report

Confirm:

- route-specific HTML still exists
- titles/canonicals unchanged unless explicitly approved
- structured data still parses
- FAQ/offer content still matches visible HTML
- internal links remain crawlable
- preview-domain strings do not leak

## 33.7 Test report

Return actual test results, not "looks good."

## 33.8 Git safety

Do not push directly to production-triggering `main` without confirming deployment behavior and receiving owner approval.

Prefer a review branch for the visual convergence pass unless the repository workflow explicitly says otherwise.

---

# 34. Success criteria

This work is successful when all of the following are true:

### Human Layer

- the site feels unmistakably Santa Cruz Strength
- visual hierarchy is stronger
- pages no longer feel like repeated beige card grids
- visitors see real gym proof quickly
- membership decisions are easier
- coaching feels human
- blog feels editorial
- events feel alive when real events exist
- contact/tour feels local and low-friction
- mobile experience is excellent

### Machine Layer

- every important route still emits meaningful HTML before client JS
- entity definition remains clear
- local business facts remain consistent
- offers remain extractable
- FAQ answers remain extractable
- service relationships remain explicit
- headings remain semantic
- internal links remain crawlable
- schema mirrors visible truth
- no generated visual content becomes a source of fake facts

### Brand Layer

- forest, mint, cream, coral, ink, and sand are used intentionally
- the actual logo is respected
- custom blueprint motifs create a recognizable visual language
- real photography carries trust
- the site feels local, serious, warm, technical, and human

### Engineering Layer

- React remains productive
- Tailwind/CSS remains maintainable
- no unnecessary heavy visual dependencies
- performance is protected
- animations respect reduced motion
- forms/integrations remain intact
- tests continue to pass

---

# 35. Final operating instruction

Do not treat the moodboards as pages to clone pixel for pixel.

Treat them as a visual design language.

Do not treat Dex as a persona to mention in a status update.

Use the full SXO-GEO methodology as a guardrail while implementing.

Do not let the UI skills turn the site into a visual exercise.

The job is to converge:

**search architecture + entity clarity + evidence + trust + conversion + visual identity + frontend craft + performance.**

The site should be more beautiful because it is more truthful, more legible, more specific, and more human.

The search system is already becoming strong.

Now make the visual system equally strong without breaking the machine interface underneath it.

**Diagnose -> Prioritize -> Prescribe -> Verify.**

