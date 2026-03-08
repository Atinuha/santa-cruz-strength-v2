# plan.md

## 1) Objectives
- Launch a mobile-first, high-converting Santa Cruz Strength marketing site tailored to Santa Cruz culture (coastal, outdoor athletes, authentic community strength training).
- Implement dual conversion paths:
  - **Path 1 (Ready to Join):** send “Join Now” to ABC Fitness Ignite: https://onlinejoin.abcfitness.com/signup/plan?club=31691
  - **Path 2 (Not Ready):** capture lead → store in MongoDB → notify staff via email → manage in lightweight CRM.
- Deliver a simple staff CRM (JWT email/password) for lead triage, notes, statuses, follow-up tracking, and CSV export.
- Ensure local SEO, fast load, easy-to-edit content, and architecture clean enough to replicate later for Sacramento.

## 2) Implementation Steps

### Phase 1: Core Flow POC (Lead capture → DB → email notify → CRM visibility)
**Scope:** prove the core workflow works end-to-end before building full UI.

**User stories (POC)**
1. As a visitor, I can submit a lead form and see a clear thank-you message plus an option to join online.
2. As a staff member, I receive an email when a new lead is submitted.
3. As a staff member, I can log in and immediately see the new lead in a list.
4. As a staff member, I can open a lead and update its status.
5. As an admin, I can create/disable staff accounts.

**Steps**
- Define API contract for lead create + minimal fields + validation.
- Implement backend endpoints (FastAPI):
  - `POST /api/leads` (public)
  - `POST /api/auth/login`
  - `GET /api/staff/leads` (protected)
  - `GET /api/staff/leads/{id}` (protected)
  - `PATCH /api/staff/leads/{id}` (protected)
- MongoDB collections + indexes (created_at, status, lead_source, location).
- Email notification: implement SMTP sender using `.env` placeholders; fail gracefully (log + still store lead).
- Minimal frontend POC pages:
  - `/` with embedded form + Join Now CTA
  - `/thank-you`
  - `/staff/login`
  - `/staff/dashboard` (list + open detail)
- POC test checklist:
  - Create lead → stored → appears in dashboard immediately
  - Email fires (or logs configured failure cleanly)
  - Auth works (JWT stored securely; protected routes enforced)
- Fix until core flow is reliable.

### Phase 2: V1 App Development (Full marketing site + CRM MVP)
**User stories (V1)**
1. As a Santa Cruz local, I can quickly understand who the gym is for and what training looks like within 10 seconds on mobile.
2. As a ready-to-join visitor, I can tap “Join Now” and be taken to ABC Ignite signup.
3. As a not-ready visitor, I can “Book a Visit” or “Get Started” and submit my info in under 60 seconds.
4. As staff, I can filter leads by status/source and find someone by name/phone/email.
5. As staff, I can add notes and set a next follow-up date so nothing falls through.

**Public site (React + Tailwind + shadcn/ui)**
- Build sitemap + routes:
  - Home, Join, Personal Training, Contact, Thank You.
- Homepage section outline:
  - Hero (local positioning + CTAs: Join Now / Book a Visit / Get Started)
  - Why Santa Cruz Strength (authentic, community, coaching)
  - Training Experience (what to expect)
  - Who It’s For (surfers/climbers/cyclists/runners/general strength)
  - Testimonials
  - CTA block (Talk to a Coach + Join Now)
  - FAQ
  - Local section (Harvey West area, parking, community cues)
  - Final CTA + contact strip (click-to-call)
- Join page:
  - Primary: Join Now → ABC Ignite
  - Secondary: lead form (captures lead_source = website_form)
- Personal Training page:
  - PT story + PT inquiry form (lead_source = personal_training_inquiry)
- Contact page:
  - Map embed, address, click-to-call, placeholder hours (editable), contact form (lead_source = contact_page)
- Thank You page logic:
  - Confirmation messaging + Join online link.

**CRM (Protected)**
- Dashboard:
  - table list, search, filters (status/source/date range), quick stats counts by status
- Lead detail:
  - full fields, tags, notes, activity log, status changes, last_contact_date, next_follow_up_date
- Settings:
  - admin user management (create/reset/disable)
- CSV export.

**Content + design system**
- Theme tokens: charcoal/black base, white text, red CTAs; ensure accessibility contrast.
- Image strategy: prefer real gym imagery; otherwise authentic strength/community placeholders (avoid staged/influencer/CrossFit tropes).
- Editing: isolate copy + business info in a config file (location name, address, phone, hours, signup link).

**Local SEO**
- Per-page meta title/description, OG tags.
- JSON-LD LocalBusiness schema (name, address, phone, geo optional).
- Semantic headings, internal linking, alt text pattern.
- Performance: responsive images, lazy-load below fold.

**Conclude Phase 2**
- Run one full end-to-end test pass (visitor lead → CRM → staff update → export).

### Phase 3: Testing, polish, and hardening
**User stories (Polish)**
1. As a visitor on slow mobile data, the site loads fast and remains readable while images load.
2. As a visitor, I can submit forms without errors and get clear validation help.
3. As staff, I never lose lead changes due to refresh or navigation.
4. As admin, I can audit what happened to a lead via the activity timeline.
5. As staff, I can safely use the CRM on mobile when on the gym floor.

**Steps**
- Validate all forms (client + server), spam mitigation (honeypot + rate limit).
- Ensure email deliverability basics (from/reply-to, subject format, retries/logging).
- Security: password hashing (bcrypt/argon2), JWT expiration/refresh strategy (simple), role checks.
- UX polish: empty states, loading states, inline phone click, map tap targets.
- Add indexes + pagination for leads list.
- Regression testing across pages + protected routes.

### Phase 4: Future-ready structure for Sacramento (no multi-location UI yet)
**User stories (Future)**
1. As an admin, I can add a new location config without touching core logic.
2. As staff, I only see leads for my location (when enabled later).
3. As marketing, I can clone the site structure and swap content/theme quickly.
4. As a developer, I can reuse the same CRM with location tagging.
5. As leadership, I can compare lead sources by location later.

**Steps**
- Keep `location` field required in leads/users/settings (default `santa_cruz`).
- Centralize location config and theming hooks; avoid hardcoding strings.

## 3) Next Actions
- Confirm/edit: sitemap labels + nav order + any extra pages (e.g., “About/Coaches” later).
- Provide/confirm brand assets + any real gym photos available (or approve placeholders).
- Confirm placeholder hours format (e.g., Mon–Fri / Sat / Sun) and whether to show “By appointment” for some times.
- Provide staff list for initial accounts (name + email + role).
- Decide initial lead status defaults and whether “Book a Visit” has a dedicated form or reuses a shared lead form with source tagging.

## 4) Success Criteria
- Marketing site passes Lighthouse targets (mobile-focused) and feels Santa Cruz-local, not corporate.
- “Join Now” reliably routes to ABC Ignite from all primary CTAs.
- All forms create leads with correct `lead_source` and land on Thank You page.
- New lead appears in CRM instantly; staff email notification fires (or logs configured failure clearly until SMTP set).
- Staff can: log in, search/filter, update status, add notes, set follow-up dates, export CSV.
- Codebase cleanly supports adding a second location later via config + `location` fields (no rewrite).