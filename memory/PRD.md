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

### Resend Webhook Hardening (Committed: 28da57b + correction-pass-2)
- Durable orphan reconciliation with lease claims, BSON datetime TTL, atomic backoffs
- Dedicated asyncio recovery lifecycle (independent of ALLOW_SCHEDULERS)
- Crash-safe receipts with atomic owner+lease claims
- Suppression threading for bounced/complained events

**Correction pass 1 (28da57b) — 5 defects:**
  1. Provider delivery namespace — webhook writes only `provider_delivery_*` fields
  2. Terminal ranks restored — `email.failed` (12), `email.suppressed` (13)
  3. Strict fail-closed verification — whsec_ prefix, validate=True base64, non-object rejection
  4. Receipt completion fencing — false → 503 in route and reconciler
  5. Unique per-process worker IDs via uuid4

**Correction pass 2 — 4 blockers:**
  1. Receipt ownership in orphan reconciliation — reconcile_single_orphan acquires receipt with the exact same claim_owner as the orphan lease; busy is retryable not processed; processed is idempotent; finish owner-fenced; HTTP inline path passes claim_owner unchanged
  2. Unique recovery ownership and failed release fencing — removed static 'orphan_recovery' worker ID; all entry points generate unique per-process per-sweep IDs; _release_orphan_failed returns bool; callers report lease_lost on owner mismatch
  3. Correct monotonic provider delivery state — provider_delivery_terminal != true as top-level AND outside rank $or; strictly increasing ranks (sent 1, delivery_delayed 2, delivered 3, opened 4, clicked 5); terminal cannot regress; core delivery_state never mutated
  4. Strict verifier rejection — oversized headers rejected not truncated; non-empty bounded event type required; data must be object; supported events require non-empty email_id; malformed values → 400 before any write

## Test Status (verified at correction pass 2 commit)
- Backend: 320 passed, 6 skipped, 0 failures, 152 subtests
- Webhook tests: 51 passed (all blockers + contract + safety)
- Orphan lifecycle: 8 passed
- Frontend: 20 suites, 104 passed, 0 failures
- Total: 424 passed, 6 expected skips

### Skipped test reasons (all expected):
1. `test_loopback_mongo` — SCS_LOCAL_MONGO_URL not set (requires real loopback MongoDB)
2. `test_no_vendor_residue` — .emergent/ directory expected on hosting platform
3–6. `test_v2_smoke` (×4) — TEST_STAFF_PASSWORD not set (auth tests require secret store)

## Prioritized Backlog

### P0 — Ready
- Push `codex/scs-production-clean` to GitHub via "Save to Github"

### P1 — Blocked
- Production Canary Test for Resend Webhooks (requires deployment)
- Map GymMaster Checkout URLs (requires GymMaster admin setup)
- Seed 20 additional blog articles to production

### P2 — Blocked
- Enable Twilio Webhooks & Sends (owner 2FA required)
- Add Meta Pixel Tracking (Pixel ID needed)

### P3 — Future
- Fork project for "Nightmare Muscle Sacramento"
