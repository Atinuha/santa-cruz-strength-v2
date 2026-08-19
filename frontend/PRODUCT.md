# Santa Cruz Strength Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary website visitor is a Santa Cruz-area person comparing local places to train and deciding whether this gym fits their goals, schedule and comfort level. The first job is to understand the training environment and take a low-pressure next step through a facility tour, membership review or coaching inquiry.

Competitive lifters, first-time lifters and people seeking coached strength training are evidenced in the current website, member reviews and facility media. Sport-specific audience claims are not treated as proven unless Mike or the Santa Cruz team validates them.

## Product Purpose

The public website should turn local demand into attributable tour requests, membership decisions and personal-training inquiries while accurately representing the Santa Cruz facility and community.

## Positioning

Santa Cruz Strength is a local strength-training facility where serious equipment and an encouraging member community coexist. The website should demonstrate that combination through the real room, real training and real member experiences.

## Operating Context

- Public website and blog built in React.
- Existing internal website CRM receives lead records through `POST /api/leads`.
- Member sign-up currently links to verified ABC Fitness plan URLs.
- Members have 24/7 facility access through an app.
- Day passes and staffed hours are configured in `src/config/index.js` and require owner verification before production release.
- Google Maps, phone and email paths already exist.
- Production email and SMS delivery are separate release gates. A submitted staging form is not evidence that provider messaging is active.

## Capabilities and Constraints

- Preserve all staff and CRM routes.
- Preserve attribution capture, analytics event names and the current lead API contract.
- Keep Santa Cruz data and presentation separate from Nightmare Muscle.
- The working offer is a free facility tour until the Santa Cruz location owner approves different wording.
- SMS consent is optional and must not be required to request a tour.
- Do not publish response-time, tour-availability, equipment or audience claims that the location team has not verified.
- Do not use custom-singlet or gym-winback material in this website scope.
- Live Emergent and the production domain remain untouched during this branch build.

## Brand Commitments

- Name: Santa Cruz Strength.
- Address: 151 Harvey West Blvd Ste D, Santa Cruz, CA 95060.
- Existing circular SCS barbell mark remains the primary logo.
- The public voice is direct, welcoming, locally grounded and free of hype.
- Visual treatment must avoid neon, gradients, coastal-wave motifs, glass cards, repeated bento tiles, emoji icons and fabricated social proof.

## Evidence on Hand

- Real facility photograph showing the equipment floor and SCS wall mark.
- Real lifting, event, podium and facility-entry photographs already present in the client-provided website asset set.
- Six named member reviews in the current homepage source. Their exact wording remains subject to final owner confirmation before production.
- Current address, phone, email, hours, membership links and social URLs in `src/config/index.js`.
- Existing local search metadata, sitemap generator, route-head generator and schema files.

## Product Principles

1. Show the real room before making a promise about it.
2. Make the free-tour path understandable and reachable from every priority route.
3. Let serious training and genuine welcome reinforce each other.
4. Preserve operational truth and measurement ahead of decorative novelty.
5. Treat staging behavior, provider delivery and production deployment as separate states.

## Accessibility & Inclusion

The public website must meet WCAG 2.2 AA expectations for contrast, keyboard use, visible focus, semantic headings, form labels, inline error announcements, touch targets, reduced motion and responsive reflow.
