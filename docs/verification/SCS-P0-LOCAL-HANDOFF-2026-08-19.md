# Santa Cruz Strength P0 Local Handoff

Date: 2026-08-19

Branch: `codex/scs-v2-p0-tour-resend`

Base revision: `b44aae928e75a0e6b90296c8395f6d18fcd35db6`

Local review result: `PASS_WITH_CONDITIONS`

Production release result: `NOT_READY`

## Outcome

The local repair candidate closes the reviewed website lead-capture and Resend webhook defects. It does not change the live website, provider settings, GymMaster data, or production database.

## Fixed in the local candidate

- Every reviewed tour fallback uses `/contact#tour-request`.
- The contact page scrolls to the tour form anchor.
- A form shows success only after the backend returns `status=accepted`, a lead ID, and the same request ID.
- Rapid double submission sends one request while the first request is pending.
- A direct or unconfirmed visit to the thank-you route cannot fire conversion analytics.
- Lead retries use a request payload digest. A reused request ID with a changed or unverifiable payload returns a conflict.
- Partial outbox work remains visible with a pending request marker until deterministic jobs are confirmed.
- Resend webhook requests require the raw-body Svix signature and a current timestamp.
- Resend receipts are idempotent. An unmatched provider message stays retryable.
- Resend delivery state moves forward by rank. A late older event cannot replace a terminal failure or suppression state.
- `/api/health` returns not ready when database writes are off or MongoDB cannot answer a ping.
- Protected staging, preview, and production CORS origins require HTTPS.
- The production frontend URL gate rejects localhost, IPv6 loopback, path-bearing URLs, credentials, and Emergent preview hosts.
- Reviewed sensitive backend paths use fixed operational log text. They do not log user PII, caller detail, provider exception text, or secrets.
- All write, provider, webhook, scheduler, analytics, research, and deploy controls remain off by default.

## Evidence

- Backend test discovery: 179 of 179 passed.
- Frontend test suite: 99 of 99 passed.
- Preview build: passed with 35 sitemap URLs.
- Production-configuration build: passed.
- SEO validation: passed all checks.
- Invalid Emergent preview API gate: rejected with exit code 1.
- Python compilation: passed.
- `git diff --check`: passed.
- Changed-code em dash and en dash check: passed.
- Independent Candidate 3 review: `PASS_WITH_CONDITIONS`.

The local builds used `SKIP_PRERENDER=true`. The build scripts correctly marked them as non-deployable. They prove compilation and configuration rules only.

## Required protected-staging proof

1. Create an isolated staging deployment with a disposable MongoDB database.
2. Keep every provider and deploy flag off.
3. Confirm `/api/health` returns 503 while database writes are off.
4. Enable database writes only in protected staging. Confirm `/api/health` returns 200 after a successful MongoDB ping.
5. Submit one synthetic lead with an approved `.invalid` address and a UUID request ID.
6. Replay the same request ID and payload. Confirm one lead and one deterministic job for each required outbox key.
7. Reuse the request ID with a changed payload. Confirm HTTP 409 and no data change.
8. Inject failure after lead insert, after the first outbox job, and before marker clear. Replay the request and confirm one lead, one job per key, and an empty pending marker.
9. Use signed Resend fixtures for valid, duplicate, invalid, unmatched, late, bounced, complained, and failed events.
10. Run a real prerender build without `SKIP_PRERENDER` against the seeded staging API.
11. Confirm one named deployment owner and execute a rollback rehearsal.

## Provider gates

### Resend

Keep sends and webhooks off until the protected-staging checks pass, the webhook secret is installed through the host secret store, and one allowlisted delivery test is approved. The live disabled webhook is not fixed until a reviewed candidate is deployed and the Resend endpoint is re-enabled.

### Twilio

Keep SMS sends and webhooks off. Current access is blocked by MFA. The last verified audit also found A2P rejection and carrier error 30034. Owner-approved access, A2P approval, sender checks, callbacks, and STOP, START, and HELP tests are required.

### GymMaster

Keep prospect and member writes off. Mike must approve whether the internal CRM owns prospects until membership or whether the website also creates a GymMaster prospect. No billing or membership write is authorized.

### GA4 and Meta

Keep production analytics off until consent behavior, event names, DebugView or test-event evidence, and release approval are complete. A tour CTA click must not count as a completed tour request.

## Release rule

This local candidate is ready for protected staging only. Production stays `NOT_READY` until the staging proof, provider checks, stable backend host, deployment owner, rollback proof, and required business approvals are complete.
