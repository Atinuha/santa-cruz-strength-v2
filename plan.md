# plan.md

## 1) Objectives
- **Phase 1–2 complete:** Launch a mobile-first, high-converting Santa Cruz Strength marketing site tailored to Santa Cruz culture (coastal, outdoor athletes, authentic community strength training).
- Implement dual conversion paths:
  - **Path 1 (Ready to Join):** send “Join Now” to ABC Fitness Ignite: https://onlinejoin.abcfitness.com/signup/plan?club=31691
  - **Path 2 (Not Ready):** capture lead → store in MongoDB → notify staff via email → manage in lightweight CRM.
- Deliver a simple staff CRM (JWT email/password) for lead triage, notes, statuses, follow-up tracking, and CSV export.
- Ensure local SEO foundations, fast load, easy-to-edit content, and an architecture clean enough to replicate later for Sacramento.
- **Current objective (moving into Phase 3):** polish and harden the system for production use (spam mitigation, security tightening, performance checks, content finalization, and operational readiness).

## 2) Implementation Steps

### Phase 1: Core Flow POC (Lead capture → DB → email notify → CRM visibility)
**Status:** ✅ Completed (implemented directly as part of the full build)

**Delivered user stories**
1. ✅ Visitor can submit a lead form and see a clear thank-you message plus an option to join online.
2. ✅ Staff receives an email when a new lead is submitted (**SMTP placeholder; logs cleanly until configured**).
3. ✅ Staff can log in and immediately see new leads.
4. ✅ Staff can open a lead and update its status.
5. ✅ Admin can create/disable staff accounts.

**What was built**
- Backend endpoints (FastAPI):
  - `POST /api/leads` (public)
  - `POST /api/auth/login`
  - `GET /api/staff/leads` (protected)
  - `GET /api/staff/leads/{id}` (protected)
  - `PUT /api/staff/leads/{id}` (protected)
  - `POST /api/staff/leads/{id}/notes` (protected)
  - `GET /api/staff/stats` (protected)
  - `GET /api/staff/leads/export/csv` (protected)
  - `GET/POST/PUT/DELETE /api/staff/users` (admin)
- MongoDB collections + indexes (id, email, status, lead_source, created_at, location).
- Email notification sender using `.env` placeholders; fails gracefully.
- Seeded default admin (for initial setup):
  - `admin@santacruzstrength.com` / `SCS@admin2024!` (change for production)

**POC checklist**
- ✅ Create lead → stored → appears in dashboard
- ✅ Auth works (JWT; protected routes enforced)
- ✅ Email triggers when configured; otherwise logs clearly


### Phase 2: V1 App Development (Full marketing site + CRM MVP)
**Status:** ✅ Completed and tested

**Delivered user stories (V1)**
1. ✅ Santa Cruz local understands positioning and training vibe quickly on mobile.
2. ✅ “Join Now” reliably routes to ABC Ignite.
3. ✅ “Book a Visit / Get Started / Talk to a Coach” capture leads in under ~60 seconds.
4. ✅ Staff can filter leads by status/source and search by name/phone/email.
5. ✅ Staff can add notes and set next follow-up date.

**Public site (React + Tailwind + shadcn/ui)**
- ✅ Sitemap + routes implemented:
  - `/` Home
  - `/join`
  - `/personal-training`
  - `/contact`
  - `/thank-you`
- ✅ Homepage sections implemented:
  - Hero (local positioning + CTAs: Join Now / Book a Visit)
  - Why Santa Cruz Strength (authentic, community, coaching)
  - Training Experience
  - Who It’s For (surfers/climbers/cyclists/runners/general strength)
  - Testimonials
  - CTA block (repeats Join Now + Book a Visit)
  - FAQ (Accordion)
  - Local section (map, address, click-to-call, editable hours)
  - Final CTA
- ✅ Join page:
  - Primary: Join Now → ABC Ignite
  - Secondary: lead form (lead_source = `website_form`)
- ✅ Personal Training page:
  - PT story + PT inquiry form (lead_source = `personal_training_inquiry`)
- ✅ Contact page:
  - Map embed, address, click-to-call, placeholder hours (editable), form (lead_source = `contact_page`)
- ✅ Thank You page:
  - Confirmation messaging + “Join Online Now” link

**CRM (Protected)**
- ✅ `/staff/login` email/password auth
- ✅ Dashboard:
  - KPI cards (New 7d, Booked, Joined, Total)
  - search + filters (status, source)
  - leads table, click row → detail
  - add lead modal (manual entry)
  - export CSV
- ✅ Lead detail:
  - status updates (logged)
  - add note (logged)
  - activity timeline
  - next follow-up date
- ✅ Settings:
  - profile update (name/email/password)
  - admin-only staff account management

**Content + design system**
- ✅ Theme implemented: charcoal/black base, white text, red CTAs; modern + coastal feel.
- ✅ Image approach: authentic strength imagery (avoid staged influencer/crossfit cliché).
- ✅ Editing model: business info + hours + links centralized in `src/config/index.js`.

**Local SEO**
- ✅ Implemented baseline metadata and JSON-LD LocalBusiness/ExerciseGym schema in `public/index.html`.
- ✅ Semantic sections and clean headings.

**Conclude Phase 2**
- ✅ End-to-end testing complete:
  - Backend: **100% pass**
  - Frontend: **95% pass** (no blocking issues)


### Phase 3: Testing, polish, and hardening
**Status:** 🔄 In progress (next)

**User stories (Polish)**
1. As a visitor on slow mobile data, the site loads fast and remains readable while images load.
2. As a visitor, I can submit forms without errors and get clear validation help.
3. As staff, I never lose lead changes due to refresh or navigation.
4. As admin, I can audit what happened to a lead via the activity timeline.
5. As staff, I can safely use the CRM on mobile when on the gym floor.

**Steps**
- **Forms + spam mitigation**
  - Add honeypot field to all public forms.
  - Add basic rate limiting per IP (e.g., in-memory or simple DB-backed) for `/api/leads`.
  - Optional: add reCAPTCHA or Turnstile later (keep Phase 3 lightweight unless spam appears).
- **Email deliverability + operations**
  - Replace placeholder SMTP settings with real credentials.
  - Support multiple staff recipients (comma-separated `NOTIFICATION_EMAIL`) if desired.
  - Add a clear email subject format and include lead source.
- **Security hardening**
  - Ensure strong admin password rotation guidance; change seeded default admin credentials.
  - Confirm password hashing is stable (bcrypt warning observed but non-blocking).
  - Tighten CORS to known domains for production.
  - Add JWT expiration handling UX (optional) and ensure logout clears all local storage.
- **UX + workflow polish**
  - Improve empty/loading states consistency.
  - Add pagination controls to CRM list when lead volume grows.
  - Add quick actions in lead row (click-to-call, click-to-email) without navigating (optional).
- **Performance**
  - Convert key images to optimized formats later (webp/avif) and ensure responsive sizing.
  - Lazy-load map embeds and below-the-fold images.
  - Lighthouse pass: validate mobile performance and accessibility.
- **Data + analytics (optional but recommended)**
  - Add GA4 (or privacy-friendly analytics) and event tracking for CTAs and form submits.


### Phase 4: Future-ready structure for Sacramento (no multi-location UI yet)
**Status:** 🟡 Partially addressed (foundation in place)

**User stories (Future)**
1. As an admin, I can add a new location config without touching core logic.
2. As staff, I only see leads for my location (when enabled later).
3. As marketing, I can clone the site structure and swap content/theme quickly.
4. As a developer, I can reuse the same CRM with location tagging.
5. As leadership, I can compare lead sources by location later.

**What’s already in place**
- ✅ Leads and users include a `location` field with default `santa_cruz`.
- ✅ Config-driven business details in the frontend.

**Steps (when Phase 4 starts)**
- Add per-location theming/config (e.g., `locations/santa_cruz.js`, `locations/sacramento.js`).
- Add staff scoping by location (filter leads by staff’s location unless admin).
- Add location selector only if/when needed.
- Add multi-location SEO structures (separate domains or subpaths) later.


## 3) Next Actions
- Replace placeholder imagery with **real Santa Cruz Strength** photos and logo wherever possible.
- Configure SMTP fully:
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `NOTIFICATION_EMAIL`, `FROM_EMAIL`
- Change seeded admin credentials and/or create real staff accounts:
  - Add each staff member email + role in Settings.
- Confirm final operating hours content (still placeholder) and update in `src/config/index.js`.
- Run a Lighthouse pass and apply any Phase 3 performance improvements.
- Decide if you want additional pages later (About/Coaches, Programs, Schedule) and whether “Book a Visit” should be a distinct form vs shared form.


## 4) Success Criteria
- Marketing site feels Santa Cruz-local, not corporate; loads fast on mobile.
- “Join Now” reliably routes to ABC Ignite from all primary CTAs.
- All forms create leads with correct `lead_source` and land on Thank You page.
- New lead appears in CRM instantly; staff email notification fires when SMTP configured (or logs clearly until then).
- Staff can: log in, search/filter, update status, add notes, set follow-up dates, export CSV.
- Codebase cleanly supports adding a second location later via config + `location` fields (no rewrite).