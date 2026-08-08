# Direction 4: The Room, The People

Homepage as documentary evidence of place and humanity.

Dials, assigned: `DESIGN_VARIANCE 8` / `MOTION_INTENSITY 5` / `VISUAL_DENSITY 2`.

---

## The nine articulations

### 1. Direction Name

**The Room, The People.**

### 2. Aesthetic

**Family:** documentary photographic hang. A dark gallery wall with real prints on it and small
labels underneath.

Discriminating vocabulary:

1. **Carbon field.** The whole page is one dark surface. Photographs are lit objects on it. No band
   alternation, no warm paper, no light section sandwiched between dark ones.
2. **Single loud voice.** Exactly one element on the page is set at display scale, the H1. Every
   other heading is body-scale. A gallery does not shout its wall labels.
3. **Print edge.** Photographs either bleed to the physical edge of the viewport or sit inset with
   real margin. Nothing is framed in a card, nothing has a shadow, nothing floats.
4. **Label under the work.** Every photograph carries one functional sentence beneath it naming
   what is actually in the frame. Never over it, never as a pill, never a credit line.
5. **Void as content.** Where the composition wants a photograph that does not exist, the space
   stays empty and carbon. Absence is spacing, not an annotation.
6. **True skin, cooled room.** Two grades, not one. Photographs of people keep their colour.
   Photographs of the empty building are pulled down harder, because the room's painted green
   stripe fights the clay accent and the people do not.
7. **Underline as accent.** Clay is a fill on the one primary action and a 1px underline on text
   links. It never becomes a decorative line, a dot, or a bullet.
8. **Name as portrait.** A person without a photograph is set as their name at portrait scale in
   the same frame the photographs occupy. Not a grey silhouette icon.

### 3. Reference Read

Reading this as: **a local strength gym homepage for a Santa Cruz adult deciding whether to walk
in, in a documentary photographic language, leaning toward the approved Barlow Condensed and DM
Sans system used almost entirely at body scale on a carbon field, in a redesign overhaul posture.**

The reference is a photographer's exhibition print hang and a printed exhibition sheet, not an
editorial magazine spread and not a marketing site. The distinction matters because the nearest
competing direction in this tournament is editorial, and editorial means grid, column, pull quote
and reading rhythm. This direction has no columns and almost no reading. It has five prints, a
label under each, and a door at the end.

The palette ban in Taste v2 4.2 names warm chalk backgrounds around `#E8E1D6` with a clay accent as
the most repeated AI tell in production. This project's approved palette is exactly that, and the
palette stays. The answer here is distribution: this page runs on carbon `#0C0C0B` with chalk as
ink, which is the same eight tokens arranged so that the banned surface never appears as a page
background at all. The one warm-white surface on the page is the lead form panel, where a physical
paper object against a dark wall is the point.

### 4. Design Thesis

The single sentence: **the gym's own tagline is already the design brief, so the page shows the
actual room and the actual people at a scale where a stranger can tell it is unstaged, and says
almost nothing.**

### 5. Future Hero

A **3:2 landscape photograph of the training floor, made from the entrance corner at roughly chest
height, wide enough that the far wall seal and at least three rack bays sit in one frame, lights
on, no people.** Focal zone centre and centre right, where the racks recede. It is full bleed
across the viewport with no type on it at all.

The stand in today is `SCS_MEDIA.heroFacility` (`/assets/scs/facility.jpg`), which is a 1080x1440
portrait phone frame of that same view. It is honest, it is the right subject, and it is the wrong
shape. The composition below is built for the photograph that should exist, and the stand in is
cropped into it rather than the composition being bent around the stand in.

### 6. Hero Placement

* **Aspect ratio reserved:** 3:2 landscape, filling the full page width.
* **Viewport relationship:** the hero section is exactly `100dvh`. The photograph band is a flex
  child that absorbs all remaining height after the 64px fixed navigation and the text block, with
  a `240px` floor. The fold therefore always contains the whole photograph and the whole text
  block, on any viewport height, without a media query.
* **Text safe space:** none is needed on the photograph. All type sits below it, on carbon. This is
  a deliberate consequence of not owning the final asset. A page that reserves an overlay text zone
  on a photograph it has not taken is reserving a guess, and it forces a scrim over a real frame.
  This composition survives any hero photograph, dark or bright, busy or empty.
* **Focal zone:** centre right of the frame. The stand in is held at `object-position: 50% 62%` at
  desktop so the wall seal and the rack line stay in the band while the black ceiling is cropped
  out. At mobile the band shortens and the position moves to `50% 68%` to keep the floor, because
  the ceiling reads as dead black on a small screen.
* **Crop behaviour:** `object-fit: cover`, centre right anchored, cropping top first. The final
  landscape asset crops almost not at all.
* **Responsive placement:** photograph on top, type below, at every width. The relationship never
  inverts and nothing reflows into a column. Below 768px the two CTAs go full width and stack, the
  H1 drops from `3.5rem` to `2.25rem`, and the photograph keeps its flex behaviour.
* **Type in the hero:** three elements. H1, subhead, CTA row. No eyebrow, no strip, no tagline.

### 7. Body Grammar

* **One surface.** Carbon `#0C0C0B` from the navigation to the footer. Chalk `#E8E1D6` is ink.
  Stone `#8E867A` is secondary ink and, on carbon, it finally passes AA at about 5.1:1, which it
  does not do on chalk at about 2.8:1. The dark field is an accessibility improvement, not only an
  aesthetic one.
* **One display element.** The H1. Everything else, including every H2, is DM Sans 600 between
  `0.9375rem` and `1.125rem`. Barlow Condensed appears exactly twice more, in the two name panels
  that stand in for missing portraits, at portrait scale, because there the type is the image.
* **Zero eyebrows on seven sections.** The allowance is three. Using none is the point: the
  photographs index the page.
* **Vertical rhythm.** `py-28` at desktop, `py-16` at mobile, between typographic sections.
  Photographic sections carry no vertical padding at all, because a print bleeds to its edge.
  Density 2 lives in that difference: a screen of pure black and a screen of pure photograph.
* **Measure.** Body copy is capped at `max-w-[46ch]`, well under the 65ch default. Short lines read
  as captions rather than as an article, which is the register this direction wants.
* **Radius.** `var(--scs-radius)`, 2px, on the form panel, the buttons, the inputs and the inset
  portraits. Full bleed photographs have no corners to round. One scale, no exceptions.
* **Accent.** Clay is a fill on every tour CTA and a 1px underline under every text link. It is
  never a bullet, a dot, a hairline divider or a heading colour. Clay as text on carbon measures
  about 3.7:1, which fails AA for body sized text, so clay is never used as body copy here. That is
  a real contrast bug in the current build's dark bands, avoided rather than inherited.
* **Layout families, one appearance each, seven sections:** full bleed photograph over type block
  (hero), full bleed photographic plate with a label (the room), typographic band with hairline
  separated lines (the visit), inset portrait series (the people), single edge bleed with copy in
  the void (membership and coaching), warm-white conversion panel beside a contact column (the
  visit block), disclosure list (questions). Exactly one image plus text split on the page, so the
  two consecutive limit is not approached.

### 8. Signature Move

**The label under the work, and the empty wall beside it.**

Every photograph is followed by one plain sentence stating what is actually in the frame, in stone
at `0.8125rem`, aligned to the photograph's left edge, with a 24px clay rule above it. Not a
credit, not a plate number, not a caption pill on the image. It reads like the card beside a print:
*"The training floor at 151 Harvey West Blvd. Photographed with the room empty."*

The second half of the move is that the page is honest about how few prints it owns. It shows five
photographs and stops. Where a sixth would go, the wall stays carbon and empty, at full section
height, and no copy apologises for it. The count is deliberately visible: two frames of the empty
room, one frame of the members, one frame of the crew, and a portrait series. Nothing is used
twice, no photograph appears at two crops, and the three near identical frames of the same group at
the same wall are treated as what they are, one photograph, of which one frame ships.

### 9. Primary Risk

**The page can read as under designed rather than restrained.** Holding every heading at body scale
means the hierarchy between a section heading and a body paragraph is carried by weight and colour
alone, roughly 100 units of weight and one step of tone. On a dim laptop screen in a bright room
that difference can collapse, and a page whose whole argument is carried by photographs is a page
that fails completely if the photographs are weak. Two of the five available frames are low light
phone photographs of an empty room, and they are load bearing here in a way they are not in any
other direction. The mitigation is that the two strongest frames, the group at the wall and the
portrait series, carry the emotional half of the argument, and both are properly made photographs.
The residual risk is real and is the honest reason this candidate could lose.

Second order risk: the portrait series depends on `GET /api/team`. If that call fails the section
does not render, and this direction loses two of its seven sections' worth of humanity. The group
photograph section is static and carries the argument alone in that state, which is a degraded but
not broken page.

---

## Photographs this direction needs and does not have

Every one of these is a photograph the owner can go and take. None of them may be generated,
sourced from stock, or substituted from another slot. Listed in the order that most changes the
page.

### 1. Wide landscape interior of the training floor

* **Subject:** the main training floor with no people in it, lights on.
* **Framing:** 3:2 landscape, camera at chest height from the entrance corner, standing back far
  enough that the painted wall seal and at least three rack bays fall inside one frame. Phone is
  acceptable if the overhead lights are all on and the exposure is held on the floor rather than
  the ceiling.
* **Why the composition wants it:** the hero reserves a full width 3:2 band. The only photograph of
  this subject today is 1080x1440 portrait, so filling that band means discarding roughly half the
  room, including most of the rack line. This single frame is the difference between a hero that
  shows the room and a hero that shows a slice of it.

### 2. The rack and bench row at eye level, landscape

* **Subject:** the row of squat stands, flat benches and the plate cradle along the painted wall.
* **Framing:** 2:1 or 16:9, camera parallel to the wall so the bench row recedes to a vanishing
  point, standing in the aisle rather than square on.
* **Why the composition wants it:** section two is a full bleed horizontal plate, the largest
  single object on the page. The existing frame, `/assets/scs/racks.jpg`, is a 1080x1974 phone
  screenshot with black letterbox bars top and bottom, so only its middle third survives the crop
  and the composition is inherited from a screenshot rather than chosen.

### 3. A member training alone, mid set, with written likeness permission

* **Subject:** one person actually lifting during ordinary hours. Not a meet, not a posed set.
* **Framing:** 4:5 portrait or 3:2 landscape, from the side at rack height, natural light from the
  roller door. The face does not need to be identifiable, which makes the permission conversation
  easier.
* **Why the composition wants it:** every usable photograph in the library is either an empty room
  or a group facing the camera. Nothing anywhere shows the room in use. Section three asks a
  visitor to picture what a visit is and has no photograph that can answer it, so it runs as pure
  type. It is the largest hole on the page.

### 4. Portraits of Morghan King and Syon

* **Subject:** the two trainers who currently have `photo_url: ''` in the team collection.
* **Framing:** 2:3 portrait against the same black step and repeat backdrop, same lighting and same
  distance as the five existing portraits, so the series stays one series rather than becoming a
  mixed set.
* **Why the composition wants it:** the portrait wall is seven people wide. Five are photographs and
  two are typographic name panels. The panels are a deliberate and honest treatment, and they are
  still two gaps in a row of faces.

### 5. The entrance from the parking lot, no people

* **Subject:** the unit door and signage, from where a first time visitor parks.
* **Framing:** 3:2 landscape, daylight, far enough back to show the suite letter and enough of the
  building that the door is recognisable from a car.
* **Why the composition wants it:** the page ends by asking someone to drive to Harvey West and
  gives them a map tile. A photograph of the door is the last piece of evidence in a page built
  from evidence. A frame of this subject exists at `/assets/scs/coach.jpeg` and is unusable because
  it contains an identifiable person and is held for permission.

### 6. A second group moment that is not the Iron Roses backdrop

* **Subject:** four or five members on the floor during ordinary training hours, with permission.
* **Framing:** wide, 3:2, from across the floor, people not looking at the camera.
* **Why the composition wants it:** every photograph of a person in this library was made in one
  session at one event against one backdrop. The page currently argues who trains here from a
  single afternoon in 2026, and any layout that shows two of those frames near each other exposes
  it. This direction ships exactly one of them for that reason.

---

## How the five photographs are actually spent

| Section | Photograph | Treatment |
|---|---|---|
| Hero | `heroFacility`, the training floor | Full bleed band, flex height, cropped to landscape, no type on it |
| The room | `openGym`, the rack and bench row | Full bleed plate, tall, label beneath |
| The visit | none | Deliberately empty. The photograph that belongs here is need 3 above |
| The people | five API portraits plus two name panels | Inset series, 2:3, true colour |
| Membership | `communityStrength`, the group at the wall | Bleeds off the right edge, copy in the left void |
| The visit block | none | Map tile only, which is not a photograph |
| Questions | none | Type |

Not used, and why:

* `communityMedals` and `communityWall` are the same group, the same wall and the same minute as
  `communityStrength`. They are three frames of one photograph. Shipping two of them is the crop
  repetition trick this direction exists to refuse.
* `communityGroup` and `coachingCrew` are two frames of the same five people at the same backdrop.
  Also one photograph. Neither ships, because the portrait series already shows those faces
  individually and at better scale.
* `coachingCloseup` resolves to `portrait-lexi.jpg`, which is already in the portrait series.
  Using it again as a coaching photograph would be the same image twice under two claims.
* The four `SCS_MEDIA_AWAITING_PERMISSION` files are not referenced anywhere in this build.

---

## Mobile collapse, declared per section

| Section | Below 768px |
|---|---|
| Hero | Unchanged relationship. Photograph band keeps flexing, H1 drops to `2.25rem`, subhead to `0.9375rem`, both CTAs go full width and stack with a 12px gap |
| The room | Plate height drops from `72vh` to `52vh`, `object-position` moves to `50% 34%` to hold the wall seal and the plate cradle in frame. Label stays under the plate at `px-5` |
| The visit | Single column, hairline separated lines keep their full width, CTA goes full width |
| The people | The seven tile row becomes a horizontal scroll strip at `72vw` per tile with `scroll-snap-align: start`, so faces stay large rather than shrinking to thumbnails. Scrollbar hidden, native touch scroll, no custom handler |
| Membership | Photograph stops bleeding and becomes a full width 4:3 band above the copy. Copy goes single column, both CTAs full width, the text link stays inline |
| The visit block | Form panel first, contact column and map beneath it. Map keeps `min-h-[280px]` |
| Questions | Unchanged, the disclosure list is already single column. Story paragraphs stay at `max-w-[46ch]` |

---

## Guardrail and craft check

* No em dash or en dash anywhere in this directory, including as escapes.
* Zero eyebrows across seven sections. Allowance was three.
* One image plus text split section on the page. Limit is two consecutive.
* No split header anywhere.
* Hero is `100dvh`, headline two lines at desktop, subhead 16 words, three text elements, top
  padding is the 64px navigation offset only.
* One radius scale, 2px. One accent, clay. One theme, carbon.
* Every CTA label is verbatim from the guardrail list, fits one line at desktop, and is a filled
  clay button at 5.3:1 or a chalk stroked button at 16:1. No ghost button sits over a photograph,
  because no CTA sits over a photograph.
* Every photograph carries alt text describing what is actually depicted, written after looking at
  each file rather than from the filename.
* Motion is one behaviour, used four times: a photograph and its label fade up 12px once as they
  enter. It communicates sequence, that you are moving through a place one frame at a time. It is
  skipped entirely under `prefers-reduced-motion`, checked in JS at mount rather than relying on a
  CSS override, so no element is ever left invisible.
* No scroll listener. `IntersectionObserver` only, disconnected on first fire and on unmount.
* `RouteSeo` keeps ownership of the title, meta and JSON-LD. This component sets neither.
* Phone links are not wired to `trackPhoneClick` here, because `App.js` already installs a document
  level listener for every `a[href^="tel:"]`. Wiring it again would double count.
* Testids preserved: `home-hero`, `home-hero-book-visit-button`, `contact-address-block`,
  `contact-click-to-call-button`, `contact-hours-block`, `home-map-embed`, `home-faq-accordion`,
  plus everything inside `QuizForm`.
* The five FAQ strings are verbatim and stay in sync with `src/seo/home-schema.json`.

## Deliberate omissions

* **No testimonials.** `MEMBER_STORIES` exists and was read. Guardrail 9.1 item 8 admits a
  testimonial only when source URL, capture date, exact wording and permission all exist. The file
  itself records that there are no dates and no source attribution, so two of the four are absent
  and permission is not recorded anywhere. This direction shows the people instead of quoting them,
  which is the same argument made with evidence rather than with claims.
* **No blog preview.** Discretionary per section 8.1. Three cards of unrelated article covers in
  the middle of a photographic hang is the one thing that would make the page look like a template.
* **No hours table.** Pending T-04. The page says contact for current staffed hours.
* **No prices.** Nothing on this page implies a purchase, and no tier is named, so
  `MEMBERSHIP_FEE_NOTE` is not triggered.
