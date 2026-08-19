# Santa Cruz Strength — Product Requirements

## Original Problem Statement
Custom, mobile-first, high-converting gym website and lightweight lead CRM for "Santa Cruz Strength." LATEST PIVOT: Complete V2 codebase replacement from GitHub repo, deployed to production. Corrected for production data preservation, build gate, and artifact purity.

## Architecture
- **Frontend**: React (CRA), Tailwind CSS, Shadcn UI, Node pre-rendering for SEO
- **Backend**: FastAPI (Python), Motor (async MongoDB), APScheduler
- **Config**: Strict runtime environment safety checks (`runtime_safety.py`)

## What's Been Implemented

### V2 Codebase (Deployed to Production)
- Full website: Home, About, Contact, Personal Training, Blog, Join, Events pages
- Lead capture system with multi-step forms
- Staff CRM dashboard with team/content/blog/event management
- Blog with 7 production SEO-optimized articles and pre-rendered HTML
- Resend webhook integration (hardened with Svix HMAC verification)
- GymMaster checkout architecture (blocked on client config)
- Volunteer page (feature-gated, disabled)

### Pass 2 Corrections (Committed)
- Tour CTA links unified to `/contact#tour-request`
- Resend webhook repaired (Svix verification, timestamp windows)
- Volunteer page gated behind `REACT_APP_ENABLE_VOLUNTEER_PAGE=false`
- About page rendering fixed, Home Community section wired to CMS

### Production Preservation Fix (Committed: 82a618f)
- Team seed: 7→9 members (added Dali, Kat), production Emergent media URLs
- Lexi bio preserved (379 chars, NSCA certification)
- 12 content keys aligned to production (community copy, About story, headlines)
- 43 fail-closed preservation tests

### Write-Gate Test Fix (Committed: cf3c17e)
- Root cause: load_dotenv restored deleted ALLOW_* keys from .env
- Fix: explicit gate enumeration in test environment setup
- Result: 0 test failures under production-safe environment

### Production Build Gate (Committed: f64d4ba)
- validate-production-env.mjs validates both REACT_APP_BACKEND_URL and PRERENDER_API_URL
- Both must be same HTTPS production origin; rejects preview, loopback, mismatch
- Removed hardcoded preview URL fallback from postbuild
- Route registry aligned to production: 19 routes (7 articles)
- Artifact scan: zero preview URLs, zero test_database
- JS bundle points to production API only
- 368 tests pass, 0 failures

## Prioritized Backlog

### P0 — Ready for User Action
- Push corrected commit `f64d4ba` to GitHub via "Save to Github"
- Deploy to production (after user approval)

### P1 — Blocked
- Production Canary Test for Resend Webhooks (needs deployment approval)
- Map GymMaster Checkout URLs (blocked on GymMaster admin setup)
- Seed 20 additional blog articles to production (currently preview-only)

### P2 — Blocked
- Enable Twilio Webhooks & Sends (blocked on owner 2FA verification)
- Add Meta Pixel Tracking (waiting for Pixel ID and consent contract)

### P3 — Future
- Fork project for "Nightmare Muscle Sacramento"

## Key API Endpoints
- `GET /api/team` — Public team roster (9 members)
- `GET /api/content` — CMS content keys (33 keys)
- `GET /api/blog` — Blog post listing (7 production posts)
- `POST /api/leads` — Lead capture
- `POST /api/webhooks/resend` — Resend email webhooks

## Provider Gates (All OFF)
ALLOW_EMAIL_SENDS=false, ALLOW_SMS_SENDS=false, ALLOW_RESEND_WEBHOOKS=false,
ALLOW_TWILIO_WEBHOOKS=false, ALLOW_SCHEDULERS=false, ALLOW_SEEDING=false,
ALLOW_ANALYTICS=false, ALLOW_GYMMASTER_PROSPECT_WRITES=false, etc.

## Test Status
- Backend: 264 passed, 0 failed, 3 expected skips
- Frontend: 104 passed, 0 failed
- Total: 368 passed
