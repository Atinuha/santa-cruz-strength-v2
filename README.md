# Santa Cruz Strength

Marketing website and lead CRM for Santa Cruz Strength, a strength training
facility at 151 Harvey West Blvd Ste D, Santa Cruz, California.

The site's single conversion goal is a booked facility visit. Memberships are
sold in person by a coach, not online.

**Current status, blockers and route to production: [`docs/PROJECT-STATUS.html`](docs/PROJECT-STATUS.html)**

## Stack

| Layer | Choice |
|---|---|
| Frontend | React 19, react-router-dom 7, Tailwind 3, shadcn/ui, craco on react-scripts 5 |
| Backend | FastAPI, MongoDB via motor |
| Email | Resend |
| SMS | Twilio, sole provider |
| CRM | GymMaster Online, adapter written and disabled until configured |

## Run it

```bash
# backend
cd backend
pip install -r requirements.txt
cp .env.example .env          # every provider defaults to disabled
uvicorn server:app --reload

# frontend
cd frontend
yarn install                  # use yarn against the committed lock file
yarn start
```

Install the frontend with **yarn against `yarn.lock`**. npm resolves a broken
ajv tree and every override attempt moves the failure rather than fixing it.

## Build

```bash
cd frontend
npm run build:preview         # no-send review build
npm run build                 # production, requires REACT_APP_BACKEND_URL
```

Always use the npm scripts. Running `craco build` directly skips the
`postbuild` hook and silently deletes all 29 per-route head shells, which
removes every per-route title and canonical from the site.

## Test

```bash
cd backend
export PYTHONPATH="$PWD:$PWD/tests"
for t in tests/test_*.py; do python -m unittest "tests.$(basename $t .py)"; done
# 132 tests, 15 modules

cd frontend
CI=true npx craco test --watchAll=false     # 32 tests, 12 suites
node scripts/validate-seo.mjs               # 17 checks
```

`PYTHONPATH` must include both directories. Without it four modules fail on
sibling imports and look like defects.

## Safety invariants

These must never regress. They are covered by tests.

1. No live provider write. Supplying an API key must never be sufficient to send.
2. Persistence is local. Production connection strings are never committed.
3. Every outbound capability defaults to disabled.
4. Startup mutates nothing without an explicit enable.
5. Webhooks verify signatures and fail closed.
6. A lead is persisted with attribution and consent before any provider is contacted.
7. An automated acknowledgement is not human contact.
8. Shipped public copy contains no em dash or en dash characters.

## Layout

```
frontend/src/config/index.js    business facts, membership model, one joinUrl()
frontend/src/seo/               route metadata and schema
frontend/scripts/               route heads, sitemap, SEO validation
backend/server.py               API, lead capture, campaigns, staff CRM
backend/lead_outbox.py          durable outbox with idempotency and quarantine
backend/crm_boundary.py         records intended CRM writes, cannot perform them
backend/gymmaster_adapter.py    prospect creation, refuses without configuration
docs/PROJECT-STATUS.html        status, blockers, route to production
docs/convergence/TICKETS.md     durable slice state
```

## Never commit

Customer data and credentials belong in the database and the secret manager,
never in this repository. `leads_export.csv` and `memory/test_credentials.md`
were both committed by automated tooling and are now ignored.
