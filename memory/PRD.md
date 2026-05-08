# Santa Cruz Strength — PRD

## Original Problem Statement
Build a custom, mobile-first, high-converting gym website and lightweight lead CRM for "Santa Cruz Strength", replacing a legacy system. Needs strong local SEO, multi-step lead capture, and streamlined staff workflows (PWA, Google Voice auto-dialing, automated follow-up sequences). Scalable architecture to later fork for a second location ("Nightmare Muscle Sacramento").

## User Personas
- **Gym Owner (Mike Lucero)**: Manages leads, staff, campaigns, events, blog
- **Staff**: Uses mobile PWA for quick actions (call, text, notes, status updates)
- **Prospective Members**: Public site visitors filling out lead forms, booking tours

## Tech Stack
- **Frontend**: React (CRA + CRACO), Tailwind CSS, Shadcn UI, React Router v6
- **Backend**: FastAPI, Motor (async MongoDB), APScheduler
- **Auth**: JWT + 90-day device tokens (2FA disabled pending Resend upgrade)
- **Integrations**: OpenAI GPT-4o-mini (Blog Ideas), Resend (Email), Twilio (SMS Primary), MailerSend (SMS Fallback), Behold.so (Instagram)

## Core Features — All DONE
- Public website with carousels, Instagram feed, SEO pages, lead capture form
- CRM with Kanban/List views, search, filters, source prioritization
- 2FA auth with OTP + device remember
- Walk-in quick add, CSV bulk import with dedup, Google Voice click-to-call
- PWA Mobile staff portal (`/staff/mobile`)
- Drip campaigns (email + SMS), Google Reviews auto-request
- Visual Email & SMS Campaign Builder with segmentation
- Events Manager with recurring events, ticket tiers, sold-out logic
- AI Blog Manager with Google Trends integration
- Image upload for blogs/events

## Architecture
```
/app/
├── backend/server.py (all routes, ~2900 lines)
├── frontend/src/
│   ├── config/index.js (centralized gym config)
│   ├── pages/ (public + staff CRM pages)
│   ├── contexts/AuthContext.js
│   ├── api.js (axios instance)
│   └── App.js (router)
```

## Key Endpoints
- `POST /api/auth/login` + `POST /api/auth/verify-otp` — 2FA auth
- `GET /api/staff/leads` — CRM leads list
- `POST /api/leads` — Public lead form submission
- `GET /api/events` — Public events
- `POST /api/upload` — Image uploads
- `POST /api/staff/campaigns/send` — Mass email/SMS
- `POST /api/webhooks/twilio-sms` — Twilio inbound SMS (returns TwiML, background DB/email)
- `GET /api/webhooks/twilio-sms` — Webhook health check
- `POST /api/webhooks/twilio-status` — Twilio delivery status callback

## Completed Work (as of April 2026)
- All core features listed above
- Fix: `import re` bug in server.py (leads endpoint 500 error) — RESOLVED
- Fix: Missing `GET /staff/leads/{lead_id}` endpoint — RESOLVED (orphaned code had no route decorator)
- Fix: `handleToggleBlacklist` ReferenceError in LeadDetail.js ProfileCard — RESOLVED (passed as prop)
- Daily Bounce/SMS Failure Digest — DONE (replaces individual bounce alert emails with one daily summary at 6 PM PT)
- 2FA disabled, direct login with 90-day device tokens — DONE
- Admin: Revoke Devices endpoint + UI button — DONE (auto-revokes on deactivate/delete too)
- Membership pricing page with all plans, savings CTAs, and ABC Fitness signup links — DONE
- Homepage carousels, Behold Instagram, SEO, legal pages
- CRM: Kanban, List, search, CSV import, blacklist, source sorting
- Auth: 2FA OTP, device remember, invite links, password resets
- Campaigns: Email + SMS builder, segmentation, drip automation
- Events: Recurring, tickets, sold-out, public page
- Blog: AI ideas, Google Trends, image upload
- Mobile PWA staff portal
- Twilio SMS integration (send/receive) with MailerSend fallback — DONE
- Fix: Twilio inbound webhook HTTP 520 — RESOLVED (Apr 12, 2026: refactored to return TwiML instantly via fire-and-forget background tasks, added GET health check)
- MailerSend SMS integration (primary outbound, delivery status webhooks) — DONE
- MailerSend inbound SMS webhook endpoint — DONE
- Twilio A2P 10DLC Brand + Campaign registration — DONE (user-side)
- A2P Campaign rejection fix — DONE (Apr 19, 2026: strengthened TCPA consent language on QuizForm, Privacy Policy, and Terms pages with program name, frequency, HELP/STOP, data rates, carrier disclosure)
- Meet the Team / Meet our Trainers sections on Personal Training page — DONE (dynamic from DB)
- Team Manager admin page (`/staff/team`) with CRUD, photo upload, visibility toggle, reorder — DONE
- Seeded 7 team members (3 staff + 4 trainers) with photos
- About page (`/about`) with editable copy from DB — DONE
- Content Manager admin page (`/staff/content`) for editing all page copy — DONE (covers Home, About, Training, Contact pages)
- Site content key-value store (DB-backed, editable from admin) — DONE
- Added "About" to main navbar
- Campaign flow fixed: waves 2 & 3 now use custom templates, send SMS, check quota, proper completion logic — DONE
- B2B Corporate Lead Discovery & Cold Email System — DONE (May 2026)
  - Overpass API business discovery (cafe, restaurant, bar, retail, healthcare, fitness, office, school)
  - 10-stage corporate pipeline (Discovered → Active Corporate Account)
  - 3-wave cold email sequence with CAN-SPAM compliance
  - Lead scoring (0-100 based on engagement, team size, contribution model)
  - Bulk import from discovery + bulk email actions
  - Proposal generator modal
  - Corporate landing page quiz form (`/local-wellness`)
  - CRM dashboard with stats, pipeline, discover, and cold email tabs

## Pending / Upcoming
- **Meta Pixel Tracking (P1)** — Blocked on user providing Pixel ID
- **Fork for Nightmare Muscle Sacramento (P2)** — Duplicate + rebrand
- **Re-enable 2FA (P2)** — Blocked on Resend plan upgrade

## Backlog
- **Backend refactoring (P2)** — Split server.py into modular routers

## Key Endpoints (Updated April 2026)
- `POST /api/webhooks/twilio-sms` — Twilio inbound SMS (returns TwiML instantly, background DB/email)
- `GET /api/webhooks/twilio-sms` — Webhook health check
- `POST /api/webhooks/twilio-status` — Twilio delivery status callback
- `POST /api/webhooks/mailersend-sms` — MailerSend inbound SMS
- `POST /api/webhooks/mailersend-sms-status` — MailerSend delivery status (sent/delivered/failed)
- `GET /api/team` — Public team members
- `GET /api/staff/team` — Staff: all team members
- `POST /api/staff/team` — Create team member
- `PUT /api/staff/team/{id}` — Update team member
- `DELETE /api/staff/team/{id}` — Delete team member
