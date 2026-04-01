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
- **Auth**: JWT + 2FA OTP via Resend email + 7-day device remember
- **Integrations**: OpenAI GPT-4o-mini (Blog Ideas), Resend (Email), MailerSend (SMS), Behold.so (Instagram)

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

## Completed Work (as of March 2026)
- All core features listed above
- Fix: `import re` bug in server.py (leads endpoint 500 error) — RESOLVED
- Fix: Missing `GET /staff/leads/{lead_id}` endpoint — RESOLVED (orphaned code had no route decorator)
- Fix: `handleToggleBlacklist` ReferenceError in LeadDetail.js ProfileCard — RESOLVED (passed as prop)
- Daily Bounce/SMS Failure Digest — DONE (replaces individual bounce alert emails with one daily summary at 6 PM PT)
- Homepage carousels, Behold Instagram, SEO, legal pages
- CRM: Kanban, List, search, CSV import, blacklist, source sorting
- Auth: 2FA OTP, device remember, invite links, password resets
- Campaigns: Email + SMS builder, segmentation, drip automation
- Events: Recurring, tickets, sold-out, public page
- Blog: AI ideas, Google Trends, image upload
- Mobile PWA staff portal

## Pending / Upcoming
- **Meta Pixel Tracking (P1)** — Blocked on user providing Pixel ID
- **Fork for Nightmare Muscle Sacramento (P2)** — Duplicate + rebrand

## Backlog
- **Backend refactoring (P2)** — Split server.py into modular routers
