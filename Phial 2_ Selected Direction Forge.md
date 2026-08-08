Take the human-selected design direction from promising prototype to production-worthy frontend without losing the taste decisions that made it win. Converge by shrinking uncertainty progressively: lock what has earned approval, expose only the next meaningful variable, compare alternatives visually, and let specialist skills operate as a relay rather than three competing art directors shouting into the same Figma file.

Begin by reopening the Phase 1 evidence packet, chosen prototype, original \*\*Aesthetic \+ Reference \+ Intent \+ Guardrails\*\*, approved project content and assets, user selection rationale, accepted elements borrowed from neighboring candidates, and the decision record. Inspect the live implementation again before changing it.

Create an explicit authority hierarchy and preserve it throughout:

\*\*project truth \+ explicit human approvals    
→ functional intent \+ guardrails    
→ selected aesthetic thesis    
→ specialist recommendations.\*\*

A specialist may challenge a locked decision only by identifying a concrete design, usability, accessibility, implementation, or brand problem. Surface that conflict explicitly before reopening an approved macro-decision. “The skill preferred something else” is not sufficient cause.

Verify and fully read the relevant current skill files again before refinement. Use the specialist stack as a relay:

\*\*Taste Skill v2 — Aesthetic Coherence.\*\* Protect the selected design language, generate coherent structural descendants, enforce its useful visual locks and anti-boilerplate discipline, and keep new sections from drifting into unrelated template language.

\*\*Emil Kowalski — Design Engineering.\*\* Own comparative component prototyping, interaction quality, motion opportunities, timing/easing judgment, animation review, and library selection when a trusted primitive is preferable to hand-rolled UI. Use \`prototype\`, \`emil-design-eng\`, \`find-animation-opportunities\`, \`animate\`, \`review-animations\`, \`improve-animations\`, \`animation-vocabulary\`, or \`pick-ui-library\` where the actual problem warrants them. Motion must explain state, hierarchy, causality, orientation, or delight with restraint; stillness is a valid design decision.

\*\*Impeccable — Adversarial Critic \+ Finishing Layer.\*\* Use its critique, typography/layout refinement, Live Mode where useful, polish, deterministic anti-pattern detection, and final audit to reveal weaknesses without replacing the selected aesthetic with its own defaults.

If any required specialist is missing, install it from its official source; if present, do not blindly reinstall or update a pinned project midstream. Never substitute “skill mentioned in the response” for actually reading and applying the skill.

First create approximately \*\*three structural descendants of the chosen direction\*\*. Keep the winning aesthetic identity, real content, conversion objective, guardrails, and locked decisions constant while exploring narrower but consequential alternatives in body architecture, hierarchy, section rhythm, information density, navigation behavior, proof presentation, framing, CTA cadence, alignment logic, or spatial organization. Cosmetic variation does not count. Use Taste v2 as the principal design framework and Emil's comparative prototype mechanics when they improve side-by-side evaluation.

Present the three descendants together. Explain only the differences that matter, their trade-offs, and how each remains faithful to the selected world. Ask the human to choose. Once selected, \*\*freeze the macro-layout\*\* unless a later specialist finds a concrete failure severe enough to justify reopening it.

Only now increase asset fidelity.

Audit the project's real brand photography, illustrations, logos, diagrams, product captures, testimonials, and other authentic material first. Preserve approved real imagery when authenticity carries meaning. When a custom hero or visual asset is genuinely needed, use the project's approved image-generation capability or MCP and create several composition-aware candidates specifically for the reserved slot. Direct them from the selected aesthetic, reference evidence, focal zone, text-safe negative space, responsive crop, intended subject placement, atmosphere, material treatment, processing style, palette, and role in the page.

Place every candidate \*\*inside the actual hero\*\* before judging it. A beautiful standalone image that fights the headline is a failed hero asset.

Generate roughly four meaningful candidates, select the strongest family, then iterate narrowly within it: crop, light, restrained color, texture, atmosphere, focal placement, processing, or another single unresolved dimension. Do not restart the whole image concept whenever a micro-variable disappoints.

With macro-layout and hero resolved, hand the problem to Emil's design-engineering layer. Inspect:

\- interaction states and feedback;  
\- hover, press, focus, loading, success, error, and empty states where applicable;  
\- navigation transitions and spatial continuity;  
\- opportunities where motion clarifies hierarchy or cause;  
\- opportunities where animation would merely decorate and should remain still;  
\- durations, easing, origins, transforms, and interruption behavior;  
\- individual components whose treatment still deserves comparative prototyping;  
\- whether an established UI library supplies a stronger, more accessible primitive than custom recreation.

Prototype unresolved local decisions visually rather than debating adjectives.

When the user's feedback becomes fuzzy, translate uncertainty into observable variables. If practical, create a temporary \*\*Design Tweaks\*\* surface in the development build exposing only consequential tokens for this aesthetic, for example heading family, display scale, body measure, density, section spacing, accent intensity, border/radius treatment, hero crop, image processing, motion weight, or reveal distance. Update the live page immediately. Make winning values easy to commit back into the real design system. Keep this surface clearly development-only.

Now bring Impeccable forward as the independent finishing and red-team layer. Establish project context with \`/impeccable init\` and its design documentation workflow where appropriate, then use targeted critique/refinement and \`/impeccable live\` when visual selection is more efficient than conversational guessing.

Make the final anti-slop review \*\*adversarial rather than decorative\*\*. Ask Impeccable to identify residual generic patterns and explain why each one reads as generic, inconsistent, weak, or unnecessary \*\*in this specific design\*\*. Accept only changes that strengthen the selected visual thesis, intent, usability, or implementation. Reject improvements that merely replace Claude-flavored sameness with Impeccable-flavored sameness.

Keep a tiny live decision memory:

\*\*Locked\*\* — approved choices that remain fixed    
\*\*Testing\*\* — the single high-leverage question currently open    
\*\*Candidates\*\* — alternatives under comparison    
\*\*Selected\*\* — winner and why it survived    
\*\*Rejected\*\* — notable alternatives and why they died    
\*\*Next\*\* — highest-leverage unresolved variable

Never reopen the entire aesthetic because one component is weak.

Before declaring completion, perform two separate gates.

\*\*Design Fidelity Gate\*\*  
\- Aesthetic: does the page unmistakably inhabit the selected world?  
\- Reference: did it absorb the intended feeling without reproducing another site's content or composition?  
\- Intent: does hierarchy still serve the target visitor and conversion goal?  
\- Guardrails: did banned generic habits, aesthetic drift, or contradictory motifs creep back in?  
\- Integration: do hero, body, typography, imagery, interaction, and motion feel authored as one system?

\*\*Production Integrity Gate\*\*  
\- navigation, CTAs, forms, and primary interactions work;  
\- semantic structure remains sensible;  
\- keyboard navigation and visible focus behavior work where applicable;  
\- contrast and text readability are defensible;  
\- mobile, tablet, and desktop compositions survive representative widths;  
\- loading, hover, active, error, and disabled states are not accidentally broken;  
\- no obvious console/runtime errors were introduced;  
\- no material performance regression was introduced without justification;  
\- approved SEO/content/URLs and existing functional contracts remain intact;  
\- temporary tweak panels, debug controls, comparison scaffolds, and development-only instrumentation are removed or disabled from production.

Run \`/impeccable audit\` and any appropriate deterministic detector as a final independent check, then resolve meaningful findings according to the authority hierarchy rather than blindly obeying every warning.

Stop when the page has a coherent visual thesis, deliberate hierarchy, authentic or intentionally art-directed imagery, purposeful interaction, credible responsive behavior, functional integrity, and a clear conversion path, and when another round would mostly create novelty rather than meaningful improvement.

Finish with a production handoff containing:

\*\*Final active implementation\*\*    
\*\*Locked aesthetic and design decisions\*\*    
\*\*Skill evidence: what Taste, Emil, and Impeccable materially changed or validated\*\*    
\*\*Final assets and their provenance\*\*    
\*\*Experiments preserved separately\*\*    
\*\*Temporary tooling removed/disabled\*\*    
\*\*Known compromises or remaining risks\*\*    
\*\*Final browser/audit status\*\*

The design should feel authored not because an AI was ordered to “be unique,” but because every increasingly expensive decision had to survive \*\*reference evidence, specialist scrutiny, functional reality, and human taste.\*\*

\*\*Selected Direction / Phase 1 Evidence Packet\*\*:  
