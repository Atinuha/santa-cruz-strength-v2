# Brand Convergence Playbook

Reusable workflow, built from the Santa Cruz Strength convergence pass.

Everything used on that build, written so the next brand starts from here instead of from zero: the brief shape that made it work, the seven phase workflow, the four skills and what each one actually contributed, the full token system, the component code, the prerender and schema machinery, and the rules that decided what not to ship.

There is an HTML version of this same document at `docs/BRAND-CONVERGENCE-PLAYBOOK.html` for reading. This markdown version is the one to paste into a new session as a starting brief.

**Contents**

1. [How it started, and why the brief worked](#1-how-it-started-and-why-the-brief-worked)
2. [The workflow, seven phases](#2-the-workflow-seven-phases)
3. [The skill stack](#3-the-skill-stack)
4. [Dex toolkit reference](#4-dex-toolkit-reference)
5. [Tokens, colour, typography](#5-tokens-colour-typography)
6. [Patterns and the code behind them](#6-patterns-and-the-code-behind-them)
7. [The machine layer](#7-the-machine-layer)
8. [SEO, SXO, GEO and AEO in practice](#8-seo-sxo-geo-and-aeo-in-practice)
9. [The evidence rules](#9-the-evidence-rules)
10. [QA and the audit script](#10-qa-and-the-audit-script)
11. [Failure log, and the rule each one produced](#11-failure-log-and-the-rule-each-one-produced)
12. [Starting the next brand](#12-starting-the-next-brand)

---

## 1. How it started, and why the brief worked

The single biggest reason this went well is that the direction arrived as a written brief with a conflict order in it, plus real assets. Most redesign requests do not. Copy this input shape for the next brand.

### What was supplied

| Input | Form | Why it mattered |
|---|---|---|
| Master brief | One markdown file, 1,943 lines, 35 numbered sections | Carried a stated priority order for conflicts. That single feature resolved every hard call without another round trip. |
| Moodboards | 8 generated page images | Direction only, and the brief said so in writing. Composition, colour relationships, icon language, rhythm. |
| Real assets | Logo PNG, 19 photographs, a media policy file | Removed the temptation to generate imagery. The policy file said which slots are deliberately empty. |
| Existing code | Working React app with prerender, schema, tests | The thing to protect. Named explicitly as "do not undo" in the brief. |
| Instruction to load skills in full | One sentence in the prompt | Forced reading whole skills rather than working from memory of them. |

### The conflict order, which is the load bearing part

When two instructions disagreed, this decided it. Every "we did not ship that" decision traces to a line here.

1. Factual truth and approved business data
2. Crawlability, indexability, route identity, canonical integrity, schema truth
3. Accessibility and form usability
4. Performance and Core Web Vitals
5. Approved content hierarchy and conversion logic
6. Brand system and visual craft
7. Animation and decorative polish

> **Reuse this.** For the next brand, write the brief with the same four parts: a stated target ("editorial strength culture with Santa Cruz warmth"), an explicit anti-target list, a do-not-undo list, and a numbered conflict order. Everything else can be discovered from the code.

---

## 2. The workflow, seven phases

Brand agnostic. Phases 1 and 7 are where the value is; skipping either is what produces a pretty site that quietly broke something.

| Phase | What happens | Output that must exist before moving on |
|---|---|---|
| **1. Audit and freeze** | Read the brief end to end. View every moodboard. Load skills in full. Map the codebase: routes, tokens, components, data sources, tests, build scripts. Find the hard invariants. | A written list of exact strings, literals and counts that a build gate asserts. This is the "cannot break" list. |
| **2. Design system** | Tokens, type scale, radius scale, motion curve, focus, buttons, fields, photo treatment. Measure every contrast pairing. | One CSS block. No page work until this exists. |
| **3. Pilot page** | Rebuild the page carrying the most section types, usually the homepage. Prove the field alternation and the primitives. | A built, prerendered, screenshotted page. |
| **4. Money pages** | Pricing, service, contact. Conversion logic and form behaviour preserved exactly. | All prices and terms rendered from config, never retyped. |
| **5. Authority pages** | About, blog index, article, events. | Editorial hierarchy, not a card grid. |
| **6. Global chrome** | Header, footer, 404, empty states, error states, form success. | Nav labels unchanged unless explicitly approved. |
| **7. Verify** | Build, prerender, validator, unit tests, scripted accessibility audit, mobile overflow sweep, screenshots at two widths. | Numbers, not impressions. Every claim in the report has a "how verified" column. |

### The loop inside every phase

Taken from Dex and applied to visual work as well as search work.

```
DIAGNOSE   read the system, find where it loses the human or the machine
PRIORITIZE rank by impact x ease
PRESCRIBE  produce an artifact: a rewrite, a token block, a component, a ticket
VERIFY     check evidence backs every claim, flag what is unproven
```

> **Cost note, so the next run is budgeted honestly.** Seven subagents were spawned across this build for parallel research. All seven went idle without returning a report. Every finding came from reading files directly. Plan for direct reading; treat delegation as a bonus, not a dependency.

---

## 3. The skill stack

Four skills, loaded in full at the start of phase 1, before any code was read. Three are frontend, one is search.

| Skill | Install path | Loaded when | What it actually changed |
|---|---|---|---|
| **Dex Serrin** (SXO and GEO Search Architect) | `~/.claude/skills/sxo-geo-search-architect` | Phase 1, before reading any page | Kept human layer and machine layer as separate columns all the way through. Every visual decision got asked "what fact or relationship does this section carry". Produced the evidence gap log and the artifact discipline in the final report. |
| **Impeccable** | `~/.claude/skills/impeccable` | Phase 1 setup, then `reference/craft-floor.md` immediately before editing UI | The measurable floor: contrast targets, spacing rhythm, type measure, state coverage, real content. Its `scripts/context.mjs` loaded PRODUCT.md and DESIGN.md automatically, which is how existing product truth reached the work without being asked for. |
| **Emil Kowalski** (design engineering) | `~/.claude/skills/emil-design-eng` | Phase 2, when the motion system was defined | Decided what animates at all, not how. Its frequency table killed animation on repeated actions and kept it for section entrances. Produced the 0.98 press, exact transition properties instead of `all`, and the arrow-moves-not-the-label hover. |
| **Taste Skill v2** | `~/.claude/skills/design-taste-frontend` | Phase 3 onward, as a review filter on each page | Caught the templated rhythm: eyebrow above every section, the same card grid three times, section numbering with no sequence behind it, three equal feature cards. Its layout repetition rule forced the discipline rail and the plan field variation. |

**Install note.** `~/.claude/skills/taste-skill` is a byte identical copy of `design-taste-frontend` (verified with `diff -q`). `~/.claude/skills/design-taste-frontend-v1` is the genuinely different older skill with its own dial system. Invoke v2 by either of the first two names; only reach for `-v1` if you need its exact behaviour.

### How the three frontend skills divide the work

- **Impeccable answers "is it good".** Measurable floor. Contrast ratios, spacing, type measure, states, real content, keyboard focus. Run its craft floor as a checklist against the built result, not the intention.
- **Emil answers "should it move".** Frequency first: something seen a hundred times a day gets no animation. Then easing, then duration. Never `ease-in` on UI, never `transition: all`, never `scale(0)`.
- **Taste v2 answers "is it generic".** Anti-slop pass. Layout family repetition, eyebrow count, fake precision, card overuse, invented data tells. Best used after a page exists, as a review.

### Where they conflicted, and how it resolved

| Conflict | Resolution | Rule applied |
|---|---|---|
| Impeccable bans eyebrows outright. The brief specifies an eyebrow style in its type system. | Kept eyebrows, cut their count hard, used them only where they carry a category the heading does not. | Brief outranks skill on brand system (conflict order line 6) |
| Taste v2 discourages hand rolled SVG icons. | Drew twelve anyway. | The brief explicitly commissioned an equipment blueprint icon system. Taste v2 allows it when the brief calls for it. |
| Taste v2 wants dual theme by default. | Single light theme. | The product is one committed visual world with a physical referent. Deliberate, not omitted. |
| Brief bans star ratings without source data. Code records the owner asking for them. | Kept, aria-hidden, escalated to the owner as an open decision. | Factual truth outranks brand rules, and neither source could be verified over the other. |

---

## 4. Dex toolkit reference

What is on disk, so the next brand can pull the right instrument without rereading everything.

### Skill files

```
~/.claude/skills/sxo-geo-search-architect/
  SKILL.md                                the operating loop, ten instruments, hard guardrails
  references/persona-and-voice.md         read once per session, locks voice and competence map
  references/field-theory.md              why: post-2025 landscape, dual layer doctrine, E-E-A-T
  references/guardrails.md                read before producing any artifact, non negotiable
  references/output-contracts.md          the shapes: triage table, fact table, EGP log, dashboards
  references/terminology.md               precise definitions for inline glossary work
  examples/invocation-examples.md         model dialogs
  references/workflows/01-generative-visibility-scanner.md
  references/workflows/02-geo-rewriter.md
  references/workflows/03-evidence-harvester.md
  references/workflows/04-schema-composer.md
  references/workflows/05-answer-surface-simulator.md
  references/workflows/06-dual-metric-dashboard.md
  references/workflows/07-cwv-tech-debt-triage.md
  references/workflows/08-information-scent-refactor.md
  references/workflows/09-community-trust-signal-mapper.md
  references/workflows/10-opportunity-miner.md
```

### Source documents behind the skill

```
~/SXO-GEO Updated Dec 2025/
  [TOOLS] - The SXO-GEO Suite v2.md
  [REFERENCE] - How Machines Learned to Rank Us Back - The SXO-GEO Operating System.md
  [REFERENCE] - The SXO-GEO Suite User Guide v2.md
  [PERSONA] - SXO-GEO Search Architect - Dex Serrin T3 v1.txt
```

### Which instrument for which job

| Instrument | Fires when the job is |
|---|---|
| 1. Generative Visibility Scanner | audit these URLs, why is this invisible, we got hit by an update |
| 2. GEO Rewriter | rewrite for quotability, compress this to facts |
| 3. Evidence Harvester and Verifier | we claim X, can we prove it, audit our E-E-A-T |
| 4. Schema Composer | build schema for this, fix our JSON-LD |
| 5. Answer Surface Simulator | simulate an AI Overview, would we be cited |
| 6. Dual-Metric Dashboard Planner | design a visibility dashboard, track AI citations |
| 7. CWV and Tech-Debt Triage | turn Lighthouse into tickets |
| 8. Information Scent Refactor | our IA is broken, rebuild internal links |
| 9. Community Trust Signal Mapper | find quotable user language |
| 10. Opportunity Miner | mine the GSC export, what should we write next |

Common chains: *hit by an update* is 1 then 3 then 2 then 4. *Launching a page* is 2 then 3 then 4 then 5. *Nav is a mess* is 8 then 4.

### The two layers, never averaged together

| Layer | Question | Signals | What we changed for it |
|---|---|---|---|
| Human | Does a person click, read, trust, convert? | Rank, CTR, dwell, scroll depth, conversion | Field alternation, one composition per section, proof surfaced large, forms on the widest column |
| Machine | Does a model quote you, cite you, treat you as canonical? | Citation frequency, generative referrals, snippet inclusion, entity stability | Entity definition block high on the page, facts indexed as a definition list, FAQ answers in the prerendered document, schema mirroring visible text |

### Guardrails that changed shipped output

- **Do not invent.** Anything not visible or supplied is marked Needs Evidence, never filled.
- **Schema mirrors visible content only.** No property that is not on the page.
- **Evidence tier every claim.** High, Moderate, Low trust. Untiered generic statements do not ship.
- **Headings are summaries, not poetry.** Metaphor-only headings get skipped by models.
- **Quotable fact shape:** Entity + Metric + Timebox + Source-Type.
- **Mobile first or it does not count.** Every diagnostic runs mobile emulation first.
- **Lag is real.** AI citations trail new content by 4 to 8 weeks. Say so when reporting machine layer movement.

---

## 5. Tokens, colour, typography

Copy the block, change the eight brand values, keep the structure. The semantic layer is what lets a palette swap reach the whole site.

### Palette

| Name | Hex | Role |
|---|---|---|
| Forest | `#0E5D3E` | Identity, headings, primary action, icon linework |
| Deep forest | `#083E2A` | Dark fields, navigation, hero overlays, the conversion band |
| Darkest | `#06301F` | Footer |
| Mint | `#CDEAE0` | Community and human fields, selected plan, quote surface |
| Cream | `#F7F5F0` | Page canvas |
| Sand | `#E8E1D6` | Secondary band, never the whole page |
| Ink | `#1B1B19` | Body copy and figures |
| Coral | `#C94A4E` | The one conversion action, and nothing else |
| Coral bright | `#FB5A5C` | Coral marks on the darkest field only |

> **Where the palette came from.** Not from the moodboards and not from taste. The facility wall carries a painted green stripe above grey, and the seal is a black circle with crossed bars. Forest is that stripe. For the next brand, find the physical referent first: the room, the packaging, the vehicle livery, the uniform. A palette with a referent survives review; a palette from a mood does not.

### The token block, as shipped

```css
:root{
  /* Brand */
  --scs-forest:#0E5D3E; --scs-forest-deep:#083E2A; --scs-forest-dark:#06301F;
  --scs-mint:#CDEAE0;   --scs-mint-deep:#B4DBCB;
  --scs-cream:#F7F5F0;  --scs-sand:#E8E1D6;  --scs-ink:#1B1B19;
  --scs-coral:#C94A4E;  --scs-coral-dark:#A93B3F; --scs-coral-bright:#FB5A5C;
  --scs-white:#FFFFFF;

  /* Semantic. Components ask for these, never for a brand value. */
  --scs-bg:#F7F5F0; --scs-bg-alt:#E8E1D6; --scs-bg-mint:#CDEAE0; --scs-bg-dark:#083E2A;
  --scs-surface:#FFFFFF;
  --scs-text:#1B1B19; --scs-text-muted:#5A6560; --scs-text-light:#77837D;
  --scs-text-on-dark:#F2F5F2; --scs-text-on-dark-muted:#B7CEC2;
  --scs-border:rgba(27,27,25,.12);
  --scs-border-strong:rgba(27,27,25,.22);
  --scs-border-dark:rgba(205,234,224,.20);

  /* Radius by meaning. Three steps, no more. */
  --scs-radius:4px;        /* technical: buttons, inputs, chips */
  --scs-radius-sharp:0px;  /* rails, bands, full bleed */
  --scs-radius-card:8px;   /* card and photo frame */
  --scs-radius-soft:12px;  /* human surfaces: quotes, coach cards */

  /* Motion. One curve, three durations. */
  --scs-ease:cubic-bezier(.22,1,.36,1);
  --scs-dur-fast:160ms; --scs-dur:220ms; --scs-dur-enter:480ms;

  /* Shadows tinted to the brand hue, never pure black */
  --scs-shadow-sm:0 1px 2px rgba(8,62,42,.08);
  --scs-shadow-md:0 2px 10px rgba(8,62,42,.10);
  --scs-shadow-lg:0 8px 28px rgba(8,62,42,.14);
}
```

> **The trick worth stealing.** The previous palette used token names like `--scs-carbon` and `--scs-clay`. Rather than rename them across twenty files, each old name was repointed at a new value. One CSS block converged the entire site including surfaces nobody rewrote. Rename tokens only when the name lies about the role.
>
> One token could not be repointed: a single "muted text" value was serving both light and dark fields, and no value passes 4.5:1 against both cream and deep forest. Check for that case before you assume a clean swap.

### Measured contrast

| Pairing | Ratio | Needs |
|---|---:|---:|
| Ink on cream | 15.7:1 | 4.5 |
| Forest on cream | 10.0:1 | 4.5 |
| White on forest | 7.8:1 | 4.5 |
| Forest on mint | 7.6:1 | 4.5 |
| Muted on cream | 5.7:1 | 4.5 |
| On-dark muted on forest | 4.8:1 | 4.5 |
| White on coral | 4.6:1 | 4.5 |
| Coral on deep forest (large only) | 2.6:1 | 3.0 |

The last row is why `--scs-coral-bright` exists at 3.5:1. When an accent lands on your darkest field, it usually needs a brighter sibling.

### Typography

| Role | Face | Setting | Notes |
|---|---|---|---|
| Display | Barlow Condensed 600 to 900 | Uppercase, line height .94 to 1.0, tracking .005em to .02em | Self hosted, latin and latin-ext subsets only |
| Body and UI | DM Sans 400 to 700 | 15.5 to 17px, line height 1.62, measure capped 68ch | Self hosted from the same directory |
| Page H1 | Display | `clamp(2.25rem, 6.2vw, 4.25rem)`, leading .94 | One per route, always |
| Section H2 | Display | `clamp(1.5rem, 3vw, 2.1rem)` | Summarises its payload, never a metaphor |
| Eyebrow | Body 600 | 11px, tracking .14em, uppercase | Rationed: at most one per three sections |
| Data and prices | Display | Large, with `font-variant-numeric: tabular-nums` where digits align | Price is the largest thing on a plan card |

> **Self host, always.** A font CDN fires on every page view, before a consent banner is answered, and sends the visitor IP to a third party. It is also a render blocking request on the critical path. Subset to the ranges you use and bundle it.

---

## 6. Patterns and the code behind them

### Section fields, the thing that kills the beige grid

The defect being fixed: every section was a cream field with white cards on it, so the page had one texture top to bottom and nothing to navigate by. A field is a full width band with a declared tone; adjacent sections never share one.

```css
.field-cream {background:var(--scs-cream);  color:var(--scs-text)}
.field-sand  {background:var(--scs-sand);   color:var(--scs-text)}
.field-mint  {background:var(--scs-mint);   color:var(--scs-text)}
.field-white {background:var(--scs-white);  color:var(--scs-text)}
.field-forest{background:var(--scs-forest); color:var(--scs-text-on-dark)}
.field-deep  {background:var(--scs-forest-deep); color:var(--scs-text-on-dark)}

/* .on-dark and .on-photo are contexts, not colours. Anything inside them
   takes the inverted focus ring and the inverted outline button. */
.on-dark *:focus-visible, .on-photo *:focus-visible {outline-color:var(--scs-mint)}
```

Field alternation that worked on the homepage:

```
photo hero        -> forest strip     -> cream editorial  -> sand photo split
cream cards       -> deep forest rail -> full bleed photo  -> mint pricing
cream quotes      -> sand blog        -> deep forest form  -> cream FAQ
```

### The rail, replacing a four card grid

Four disciplines were four identical cards. They are not four products, they are four things one floor does, so they became four stations on one line with plate-ring nodes.

```css
.scs-rail{position:relative}
.scs-rail::before{content:"";position:absolute;left:11px;top:12px;bottom:12px;
  width:2px;background:currentColor;opacity:.28}

.scs-rail-node{
  position:relative;
  display:inline-block;      /* required: a span is inline and ignores w/h */
  vertical-align:middle;
  width:24px;height:24px;border-radius:999px;
  border:2px solid currentColor;background:inherit;flex-shrink:0}
.scs-rail-node::after{content:"";position:absolute;inset:5px;border-radius:999px;
  border:1.5px solid currentColor;opacity:.55}

@media (min-width:1024px){
  .scs-rail-h::before{top:11px;left:12px;right:12px;height:2px;width:auto;bottom:auto}
}
```

> **Two bugs lived in those nine lines.** Without `display:inline-block` the node is an inline box, ignores width and height, and its inner ring sizes against the rail instead: four 280px circles appeared behind the row. And a Tailwind `lg:static` utility silently overrode `position:relative`, which removed the containing block and caused the same thing. Use `lg:relative`, not `lg:static`.

### Drawn icons instead of an icon pack

A generic pack gives every brand in the category the same glyph. Twelve equipment elevations were authored on a 48 unit grid: one stroke weight, square caps, no fill, no gradient.

```css
.scs-blueprint{display:block;color:var(--scs-forest);stroke:currentColor;fill:none;
  stroke-width:1.5;stroke-linecap:square;stroke-linejoin:miter;
  vector-effect:non-scaling-stroke}
.on-dark .scs-blueprint,.scs-blueprint-light{color:var(--scs-mint)}
.scs-blueprint .accent{color:var(--scs-coral);stroke:var(--scs-coral)}
```

```jsx
<BlueprintIcon name="rack" size={72} draw />
<BlueprintIcon name="platform" size={56} title="Olympic weightlifting" />

// names shipped
// first-timer  own-program  competitor  rack  platform  open-floor
// general-strength  inquiry  contact  meet-here  plate  building
```

Two rules that travel to any brand:

1. **A drawing is a claim.** The strongman mark is a bar on an open floor, not a yoke, because the equipment inventory is unverified.
2. **Decorative by default.** `aria-hidden` unless a `title` is passed, because the mark almost always sits beside a heading that already says it.

### Programmatic covers, so a missing thumbnail is never a generated photo

```css
.scs-cover{position:relative;display:block;aspect-ratio:16/10;overflow:hidden;
  background:var(--scs-cream);border-bottom:1px solid var(--scs-border)}
.scs-cover::before{content:"";position:absolute;inset:0;opacity:.07;pointer-events:none;
  background-image:
    linear-gradient(to right, currentColor 1px, transparent 1px),
    linear-gradient(to bottom, currentColor 1px, transparent 1px);
  background-size:28px 28px}
```

```js
// category -> icon + tone, fixed, so the index does not reshuffle between loads
'Getting Started'  : { icon:'first-timer', tone:'mint'   }
'Strength Science' : { icon:'plate',       tone:'cream'  }
'Training Tips'    : { icon:'own-program', tone:'sand'   }
'Gym Culture'      : { icon:'building',    tone:'forest' }
'Outdoor Athletes' : { icon:'open-floor',  tone:'mint'   }
```

### The missing person plate

A staff member with no photograph gets neither a grey silhouette nor a generated face. Initials in the display face, inside the ring geometry taken from the logo. A silhouette says the person is a placeholder, which is untrue. A generated portrait invents a face for a real employee, which is the worst thing the site could publish.

### Buttons, three roles only

```css
.btn-primary,.btn-clay,.btn-outline{
  min-height:44px;                       /* target size, not a suggestion */
  border-radius:var(--scs-radius);
  padding:.75rem 1.75rem;
  display:inline-flex;align-items:center;justify-content:center;gap:.5rem;
  transition:background-color var(--scs-dur) var(--scs-ease),
             border-color    var(--scs-dur) var(--scs-ease),
             color           var(--scs-dur) var(--scs-ease),
             transform       var(--scs-dur-fast) var(--scs-ease);
}
.btn-primary:active,.btn-clay:active,.btn-outline:active{transform:scale(.98)}

/* Advance: the arrow moves, the label does not */
@media (hover:hover) and (pointer:fine){
  .btn-clay:hover svg{transform:translateX(4px)}
}
.btn-clay:focus-visible svg{transform:translateX(4px)}

/* never `transition: all`, never ease-in on UI, never scale(0) */
```

### Motion, and the rule that came out of a failure

```css
@media (prefers-reduced-motion: no-preference){
  @supports (animation-timeline: view()){
    [data-reveal]{
      animation:scsLoad linear both;
      animation-timeline:view();
      animation-range:entry 5% cover 22%;
    }
  }
}
@keyframes scsLoad{
  from{opacity:0;transform:translateY(10px)}
  to  {opacity:1;transform:translateY(0)}
}
```

> **Do not use an IntersectionObserver for entrances on a prerendered site.** The standard pattern sets opacity to 0 and waits for a callback. When that callback does not land, whole sections are permanently invisible on a page whose entire point is being readable before JavaScript runs. It happened here on the first build. `animation-timeline: view()` is a function of scroll position, an element already on screen is already at its end state, and a browser without support gets the finished page. Both failure modes land on visible.

### Responsive images with no pipeline

```bash
# Derivatives generated once, checked in. Originals untouched.
for w in 640 960 1400; do
  sips -s formatOptions 72 -Z $w src.jpg --out sized/name-$w.jpg
done
```

```js
export function photo(name, { sizes = '100vw', eager = false } = {}) {
  const e = SIZED_SET[name]; if (!e) return {};
  const scale = Math.min(1, 1400 / Math.max(e.w, e.h));
  return {
    src: `/assets/scs/sized/${name}-1400.jpg`,
    srcSet: e.widths.map(px =>
      `/assets/scs/sized/${name}-${px}.jpg ${Math.round(e.w*(px/Math.max(e.w,e.h)))}w`
    ).join(', '),
    sizes,
    width:  Math.round(e.w * scale),
    height: Math.round(e.h * scale),
    loading:  eager ? 'eager' : 'lazy',
    decoding: eager ? 'sync'  : 'async',
    fetchPriority: eager ? 'high' : undefined,
  };
}
// Result: hero 838KB -> 87KB on a phone.
```

The hero must be an `<img>`, not a CSS background. A background image is invisible to the preload scanner and cannot carry dimensions, a source set or a fetch priority.

---

## 7. The machine layer

What must keep working while the visual layer is replaced. This is the part a redesign usually breaks silently.

### Build pipeline

```
prebuild   validate-production-env.mjs   refuse to build with a bad env
           generate-sitemap.mjs          sitemap from the route registry
build      craco build                   the app bundle
postbuild  generate-route-heads.mjs      per route title, description, canonical,
                                         robots, JSON-LD written into each shell
           prerender.mjs                 render every route with react-dom/server
                                         and write real HTML into those shells

validate:seo  generate-sitemap + validate-seo.mjs    28 assertions, exits non zero
```

### How prerendering works here

1. Bundle the app for node with the webpack already installed for the browser build. No headless browser, no chromium download in a deploy pipeline.
2. Fetch the public endpoints once: content, team, blog index, and each article body.
3. Render each route with `react-dom/server` against that data, using the same route table the browser uses. One route table, two entry points, so a route cannot go missing from the prerender.
4. Write the markup into the route shell plus the same payload in a script tag, so the browser hydrates from what the server rendered from.
5. Fail closed. No API URL, unreachable backend, or an empty database is a hard exit, because prerendering an empty database publishes empty pages that look finished.

### The route registry, one file that governs everything

```json
{
  "path": "/join",
  "title": "...",
  "description": "...",
  "canonical": "https://.../join",
  "h1": "...",
  "indexable": true,
  "robots": "noindex,follow",
  "consolidatedInto": "/blog/other-slug"
}
```

39 routes total, 35 indexable, 27 of them articles. The sitemap is generated from this file, so a route cannot be in one and missing from the other.

### The 28 validator assertions, grouped

| Group | What is asserted |
|---|---|
| Crawl control | robots.txt is plain text, staff and thank-you and review paths disallowed |
| Sitemap | XML shaped, matches exactly the indexable routes, locations unique, every published post present or consolidated into one that is, nothing non indexable present |
| Consolidation | every cross canonical target is itself indexable and self canonical, and consolidated routes stay crawlable |
| Metadata | titles 60 or fewer, descriptions 160 or fewer, both unique across indexable routes, every route records its h1 |
| Social | every og:image and twitter:image resolves to a real file on disk |
| Schema | homepage self canonical, stable script id, inline graph matches the JSON file, FAQ carries a question and answer for every entry |
| Schema truth | **the FAQ literal in the page source is parsed and diffed against the schema file**, and blog FAQ schema is diffed against the article sources |
| Coverage | every indexable route ships structured data in its built shell |
| Behaviour | route SEO manager mounted, real not-found view, explicit GA4 page_view, CTA clicks not counted as conversions |
| House style | no en dash or em dash characters anywhere, and no escaped `\u2013` sequences either |

> **The pattern worth copying to any brand.** The schema truth check parses the visible content out of the source file and diffs it against the structured data. It makes drift impossible: change the FAQ copy without changing the schema and the build fails. Most sites discover that drift months later in Search Console.

### Invariants a visual pass must not touch

- The FAQ array literal shape, because a regex parses it
- Route paths, canonicals, robots directives, sitemap membership
- Analytics event names and form field names, which have history behind them
- Collapsed content stays in the document with the `hidden` attribute, never mount on click
- Nav labels, which are muscle memory and an analytics dimension

---

## 8. SEO, SXO, GEO and AEO in practice

Four acronyms, four different jobs. What each one meant in actual shipped markup.

| Layer | The job | What shipped for it |
|---|---|---|
| **SEO** (classic) | Be crawlable, unique, fast, linked | Route specific HTML for all 39 routes, unique titles and descriptions, canonicals on the production domain, generated sitemap, real anchors with descriptive text, responsive images with dimensions |
| **SXO** (search experience) | The click has to pay off. Rank without satisfaction is a bounce. | The answer to the query above the fold, one composition per section so the page is navigable, forms on the widest column, honest empty states, 44px targets, no layout shift |
| **GEO** (generative engine) | Be quotable by a model, not just rankable | An entity definition block high on the page in one extractable place, the same facts restated as a definition list, disciplines named in the words people search, no metaphor headings, no fact that exists only inside an image |
| **AEO** (answer engine) | Win the answer slot with a complete, attributable answer | FAQ answers present in the prerendered document whether or not the accordion is open, FAQPage schema diffed against that visible copy at build time, article FAQ pairs mirrored from the article body, editorial markers excluded from schema so a placeholder never becomes a quoted answer |

### The entity block, the single highest value GEO change

One paragraph, high on the page, containing name, category, address, what the place supports, and what is sold. Every clause already true elsewhere on the site, which is the condition for compressing it into one extractable place rather than leaving it spread across six sections and an FAQ.

```html
<section>
  <h2>What {BRAND} is</h2>
  <p>{BRAND} is a {CATEGORY} at {ADDRESS}, in {CITY}. {WHAT THE PLACE SUPPORTS}.</p>
  <p>{SECONDARY SERVICE}. {WHAT IS SOLD, IN RANGES NOT PROMISES}.</p>
  <dl>  <!-- the same facts, indexed -->
    <dt>Where</dt>       <dd>...</dd>
    <dt>What</dt>        <dd>...</dd>
    <dt>Disciplines</dt> <dd>...</dd>
    <dt>Access</dt>      <dd>...</dd>
  </dl>
</section>

<!-- An unconfirmed fact gets an empty CMS key, not a plausible sentence.
     It renders nothing until someone types the confirmed answer. -->
```

### Schema types emitted

- Homepage: WebSite, WebPage, ExerciseGym, FAQPage in one graph with stable relationships
- Pricing page: OfferCatalog, with every visible plan and nothing that is not visible
- Service page: Service
- Articles: Article plus FAQPage, with no fabricated publication dates
- Deliberately absent: `openingHoursSpecification`, because the hours are not confirmed

---

## 9. The evidence rules

These produced every "we did not ship it" decision. They are the difference between a site that is beautiful and a site that is trustworthy.

- **A drawing is a claim.** An icon showing a yoke asserts the gym owns a yoke. Draw the neutral version until the inventory is verified.
- **A marker is a spatial claim.** A hotspot pinned to a photograph asserts the labelled thing is at that point. Unverified positions ship as a list instead.
- **An empty slot is an answer.** A blank CMS key that renders nothing is the site declining to answer. A plausible sentence there is the site inventing a fact.
- **A failed request is not a fact.** "Nothing is published" and "we could not load it" are different sentences. Never render the first on the evidence of the second.
- **Quotes are quoted.** No editing of spelling, grammar, length or punctuation in a customer's words. A tidied review is a fabricated review.
- **Photographs have subjects.** A slot promising one subject must not show another. No honest frame means the section is typographic.

### Anti-slop list, checked before shipping

No generated people or premises photography presented as real, no floating 3D objects, no glowing gradients, no abstract blobs behind headings, no glassmorphism, no marquees, no autoplay carousels, no scroll hijacking, no particles, no cursor followers, no fake dashboards, metrics, review counts, star ratings, inventory counts, events, awards, credentials, dates or statistics, no hidden text, no keyword stuffing, no fourteen unrelated border radii, and no section that uses the same card layout as the one above it.

### The question set, asked of every section

1. What is the human job of this section?
2. What machine readable fact or relationship does it carry?
3. What is its single visual idea?
4. Does it look different from the section before it, for a reason?
5. Is the most prominent content also the most important?
6. Is proof doing the work that decoration would otherwise do?
7. Does it still make sense with no animation?
8. Does it exist in useful HTML with no JavaScript?
9. Is any detail invented?
10. Could this belong to another brand if the logo were removed?

If the answer to the last one is yes, the section needs more of the brand's own DNA.

---

## 10. QA and the audit script

Run this inside the built pages, not against intentions. It found every accessibility defect that shipped in the first pass.

```js
(() => {
  const rel = c => { const [r,g,b] = c.map(v => { v/=255;
    return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); });
    return 0.2126*r + 0.7152*g + 0.0722*b; };
  const parse = s => (s.match(/[\d.]+/g)||[]).slice(0,3).map(Number);
  const ratio = (a,b) => { const l1=rel(a), l2=rel(b);
    const [hi,lo] = l1>l2 ? [l1,l2] : [l2,l1]; return (hi+0.05)/(lo+0.05); };
  const bgOf = el => { let n = el;
    while (n && n !== document.documentElement) {
      const c = getComputedStyle(n).backgroundColor, p = parse(c);
      if (c && !c.includes('rgba(0, 0, 0, 0)') && p.length === 3) return p;
      n = n.parentElement; } return [255,255,255]; };

  const out = { url: location.pathname,
                h1: document.querySelectorAll('h1').length,
                order: [], contrast: [], small: [], noAlt: 0, noName: 0,
                overflow: document.documentElement.scrollWidth
                        - document.documentElement.clientWidth };

  let prev = 0;
  document.querySelectorAll('main h1, main h2, main h3, main h4').forEach(h => {
    const lvl = +h.tagName[1];
    if (prev && lvl > prev + 1) out.order.push(h.tagName + ' after H' + prev);
    prev = lvl; });

  document.querySelectorAll('main p, main span, main li, main a, main dd, main dt,'
    + ' main h1, main h2, main h3, main blockquote, main label, main figcaption')
    .forEach(el => {
      if (!el.textContent.trim() || el.children.length) return;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') return;
      const fg = parse(cs.color); if (fg.length !== 3) return;
      const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700;
      const large = size >= 24 || (size >= 18.66 && bold);
      const r = ratio(fg, bgOf(el));
      if (r < (large ? 3 : 4.5))
        out.contrast.push(el.textContent.trim().slice(0,30) + ' ' + r.toFixed(2));
    });

  document.querySelectorAll('main a, main button').forEach(el => {
    const r = el.getBoundingClientRect(); if (!r.width) return;
    const name = (el.getAttribute('aria-label') || el.textContent || '').trim();
    if (!name) out.noName++;
    if ((r.height < 24 || r.width < 24) && !el.matches('p a, li a, span a, dd a'))
      out.small.push(name.slice(0,22) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
  });

  document.querySelectorAll('img').forEach(i => { if (!i.hasAttribute('alt')) out.noAlt++; });
  return out;
})()
```

**Pass condition, every public route:** `h1 === 1`, `order` empty, `contrast` empty, `small` empty, `noAlt === 0`, `noName === 0`, `overflow === 0` at both 1280px and 414px.

**Testing narrow widths when the harness cannot resize the viewport:**

```js
const f = document.createElement('iframe');
f.style.cssText = 'width:414px;height:800px;border:0;position:fixed;left:-9999px';
f.src = '/some-route';
document.body.appendChild(f);
// then audit f.contentDocument with f.contentWindow's getComputedStyle
```

**Full release gate:**

```bash
yarn build                                          # compiles, no new warnings
node scripts/generate-route-heads.mjs
PRERENDER_API_URL=... node scripts/prerender.mjs    # every route renders
node scripts/validate-seo.mjs                       # 28 assertions
CI=true yarn test --watchAll=false                  # unit tests
# then: the console audit above on every public route, at 1280 and 414
# then: screenshots at both widths
# then: reduced motion on, confirm nothing disappears
```

---

## 11. Failure log, and the rule each one produced

Recorded because the rules are more useful than the fixes.

| What broke | Cause | Rule now |
|---|---|---|
| Five homepage sections invisible | IntersectionObserver entrance set opacity 0 and the callback never landed | Entrances are scroll position functions, never event callbacks, on a prerendered site |
| Four 280px circles behind a row | A `span` is inline and ignores width and height; a Tailwind `lg:static` also killed the containing block | Give pseudo-element anchors an explicit `display`, and never let a utility override `position` on one |
| Blog index showed zero articles | `.catch(() => setPosts([]))` replaced 26 prerendered articles when a refresh failed. Locally the trigger was CORS. | A failed background refresh never destroys good content. Fetch once, filter in the browser. |
| Articles showed "not here" | Same catch pattern on the page whose entire value is its text | Assert not-found only for a route that never had content |
| Events said the calendar was empty | Same again, plus no status check, so a 500 with a body parsed as an empty list | Check `response.ok`, and separate "empty" from "failed" in every empty state |
| Article not-found view had no h1 | Error views written as fragments rather than pages | Every reachable state is a page: one h1, a landmark, a route out |
| Form placeholders at 2.8:1 | Inherited light grey placeholder | Placeholders are text and get measured like text |
| RSVP dialog was a keyboard trap | A styled div with no modal semantics | Any overlay gets `role="dialog"`, `aria-modal`, a label, Escape, focus trap and focus return |
| Blog heading disagreed with its own metadata | The registry recorded one h1, the page rendered another | Where a registry records the heading, render that heading |

---

## 12. Starting the next brand

### Before any code

1. Write the brief with a stated target, an anti-target list, a do-not-undo list, and a numbered conflict order.
2. Gather real assets: logo file, real photographs, and a written media policy naming which slots are deliberately empty.
3. Find the physical referent for the palette. The room, the product, the vehicle, the uniform.
4. Load the four skills in full. Dex first, then Impeccable, then Emil for motion, Taste v2 as a review filter.
5. List the build gate's exact assertions before touching anything.

### Then, in order

1. One CSS token block. Measure every contrast pairing before writing a component.
2. Primitives: fields, rail, drawn icon set, programmatic cover, missing-person plate, photo helper.
3. Pilot page. Build, prerender, screenshot, fix, confirm once, stop.
4. Money pages, authority pages, chrome.
5. Release gate in full. Report every claim with how it was verified.

### Reusable files to copy across

```
src/index.css                       token block, fields, rail, buttons, motion, focus
src/components/BlueprintIcon.jsx    redraw the shapes, keep the API and the rules
src/components/BlogCover.jsx        remap category -> icon and tone
src/components/CoachPlate.jsx       change the ring geometry to the new logo
src/config/media.js                 photo() helper and the media policy comments
scripts/prerender.mjs               works as is
scripts/generate-route-heads.mjs    works as is
scripts/generate-sitemap.mjs        works as is
scripts/validate-seo.mjs            change the domain and the FAQ source paths
src/seo/route-metadata.json         the shape, refilled per brand
```

### The one sentence version

Build the machine layer first and never let the visual pass touch it; take the palette from something physical; make every section carry one fact and one visual idea; and when a detail cannot be verified, ship the honest gap instead of the plausible sentence.
