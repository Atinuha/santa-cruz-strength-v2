# Santa Cruz Strength — Product Requirements

## Original Problem Statement
Custom, mobile-first, high-converting gym website and lightweight lead CRM for "Santa Cruz Strength." Complete V2 codebase deployed to production. Secret-free release branch created for GitHub push.

## Architecture
- **Frontend**: React (CRA), Tailwind CSS, Shadcn UI, Node pre-rendering for SEO
- **Backend**: FastAPI (Python), Motor (async MongoDB), APScheduler
- **Config**: Strict runtime environment safety checks (`runtime_safety.py`)
- **Credentials**: Untracked — Emergent host secret store only

## What's Been Implemented

### V2 Codebase (Production)
- Full website: Home, About, Contact, Personal Training, Blog (7 articles), Join, Events
- Lead capture, Staff CRM dashboard, Resend/Twilio webhooks (disabled), GymMaster checkout (blocked)
- Volunteer page (feature-gated, disabled)

### Production Preservation (Committed)
- 9-person roster with production Emergent media URLs
- Lexi bio, queer-friendly community copy, 13-year About story
- 43 fail-closed preservation tests

### Production Build Gate (Committed)
- Validates matched REACT_APP_BACKEND_URL and PRERENDER_API_URL
- Rejects preview, loopback, mismatch, credentials, paths
- Route registry aligned to 7 production articles

### Write-Gate Test Fix (Committed)
- Explicit gate enumeration survives load_dotenv

### Secret-Free Release Branch (Committed: 9f031c2)
- Orphan branch `codex/scs-production-clean` — 1 root commit, no parent history
- backend/.env, frontend/.env, memory/test_credentials.md excluded from tracking
- .gitignore blocks all .env files, allows .env.example
- Smoke tests skip gracefully when TEST_STAFF_PASSWORD not in env

### Resend Webhook Hardening (Committed: 28da57b)
- Durable orphan reconciliation with lease claims, BSON datetime TTL, atomic backoffs
- Dedicated asyncio recovery lifecycle (independent of ALLOW_SCHEDULERS)
- Crash-safe receipts with atomic owner+lease claims
- Suppression threading for bounced/complained events
- **Final correction pass (5 defects)**:
  1. Provider delivery namespace — webhook writes only `provider_delivery_*` fields
  2. Terminal ranks restored — `email.failed` (12), `email.suppressed` (13)
  3. Strict fail-closed verification — whsec_ prefix, validate=True base64, non-object rejection
  4. Receipt completion fencing — false → 503 in route and reconciler
  5. Unique per-process worker IDs via uuid4

## Test Status
- Backend: 302 passed, 6 expected skips, 0 failures
- Scoped webhook tests: 33 passed covering all 5 defects
- Frontend: 104 passed, 0 failed (last verified run)
- Total: ~406 passed

## Prioritized Backlog

### P0 — Ready
- Push `codex/scs-production-clean` to GitHub via "Save to Github"

### P1 — Blocked
- Production Canary Test for Resend Webhooks
- Map GymMaster Checkout URLs
- Seed 20 additional blog articles to production

### P2 — Blocked
- Enable Twilio Webhooks & Sends (owner 2FA)
- Add Meta Pixel Tracking (Pixel ID needed)

### P3 — Future
- Fork project for "Nightmare Muscle Sacramento"
