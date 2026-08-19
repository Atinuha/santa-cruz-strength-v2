# Santa Cruz Strength local staging

This is the isolated, zero-credit staging environment for Santa Cruz Strength.
It runs only on this Mac. It does not use Emergent, a cloud database, live
customer data, or production provider credentials.

## Local services

- MongoDB: `mongodb://127.0.0.1:27018`
- Backend: `http://127.0.0.1:8000`
- Frontend: `http://127.0.0.1:4173`

All three services bind to the loopback interface. Email, SMS, Resend webhooks,
Twilio webhooks, GymMaster writes, analytics, schedulers, research calls, and
deploy hooks must stay off.

## Start MongoDB

From the repository root:

```sh
tools/local-staging/mongo/download.sh
tools/local-staging/mongo/start.sh
PYTHONPATH=backend .venv/bin/python tools/local-staging/mongo/ping.py
```

The first command downloads the pinned MongoDB Community archive and verifies
its official SHA-256 file. The archive, binary, database, PID, and logs are
ignored by Git.

## Start the backend

From the `backend` directory, run the following local-only configuration:

```sh
env \
  APP_ENV=development \
  PRODUCTION_CHANGES_APPROVED=false \
  OUTBOUND_TEST_MODE=false \
  ALLOW_DATABASE_WRITES=true \
  ALLOW_SEEDING=true \
  ALLOW_SCHEDULERS=false \
  ALLOW_EMAIL_SENDS=false \
  ALLOW_SMS_SENDS=false \
  ALLOW_ANALYTICS=false \
  ALLOW_SESSION_REPLAY=false \
  ALLOW_TWILIO_WEBHOOKS=false \
  ALLOW_RESEND_WEBHOOKS=false \
  ALLOW_LEAD_OUTBOX_DISPATCH=false \
  ALLOW_LEAD_RESEND=false \
  ALLOW_LEAD_TWILIO=false \
  ALLOW_THIRD_PARTY_RESEARCH=false \
  ALLOW_GYMMASTER_PROSPECT_WRITES=false \
  MONGO_URL=mongodb://127.0.0.1:27018 \
  MONGO_WRITE_CONCERN=1 \
  DB_NAME=santa_cruz_local_staging \
  JWT_SECRET=local-staging-only-secret \
  CORS_ORIGINS=http://127.0.0.1:4173 \
  FRONTEND_URL=http://127.0.0.1:4173 \
  UNSUBSCRIBE_SECRET=local-staging-unsubscribe-secret \
  uvicorn server:app --host 127.0.0.1 --port 8000
```

Use synthetic information only. Do not add provider keys to this command.

## Start the frontend

From the repository root:

```sh
tools/local-staging/frontend/start-local-frontend.sh
```

Open `http://127.0.0.1:4173` in a browser.

## Run acceptance checks

```sh
SCS_LOCAL_MONGO_URL=mongodb://127.0.0.1:27018 \
  tools/local-staging/backend/run-real-mongo-acceptance.sh

tools/local-staging/frontend/run-browser-e2e.sh
tools/local-staging/frontend/run-prerender.sh
```

The browser harness accepts only loopback origins, blocks every external browser
request, and uses the reserved synthetic address
`scs-local-tour@example.invalid`.

## Stop local staging

Stop the frontend and backend with `Control-C` in their terminals. Then run:

```sh
tools/local-staging/mongo/stop.sh
```

No command in this runbook deploys, pushes, contacts a provider, or changes the
live site.
