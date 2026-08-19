# Readiness Report — Santa Cruz Strength V2
# Generated: Aug 11, 2026 | Read-only audit, no production changes made

---

## Resend: READY (activation requires 2 env changes + DNS fix)

### Evidence

| Check | Result | Source |
|---|---|---|
| SDK | resend 2.23.0 installed | `import resend` |
| API key | `re_aEinp...` valid prefix, 36 chars, 1 active key | Resend API `ApiKeys.list()` |
| Domain | `santacruzstrength.com` — **status: partially_failed** | Resend API `Domains.list()` |
| FROM_EMAIL | `hello@santacruzstrength.com` (matches domain) | `.env` |
| send function | `send_resend_email()` at server.py:351 — validates key, checks `ALLOW_EMAIL_SENDS`, runs `outbound_recipient_allowed()`, checks opt-out/blacklist/suppression, appends unsubscribe link for marketing, logs send | Code inspection |
| Outbox wiring | Lead form creates email outbox jobs (`status: pending`) — verified with live audit lead | DB query |
| Consent/suppression | `_email_suppressed()` checks `blacklisted`, `email_opted_out`, `email_opt_out` | provider_dispatch.py:338–345 |
| Unsubscribe | `_append_consumer_unsubscribe()` injects signed link into all marketing HTML | server.py:319–331 |
| Daily limit | 50,000 (matches Resend plan) | `.env` |

### Blocker: Domain DNS partially failed

The Resend domain `santacruzstrength.com` has `status: partially_failed`. This means DNS records (DKIM/SPF/DMARC) are incomplete. Emails may land in spam or be rejected.

**Action required (provider-side, not code):**
1. Go to [Resend Dashboard → Domains](https://resend.com/domains)
2. Verify all DNS records (DKIM, SPF, Return-Path) are correctly set for `santacruzstrength.com`
3. Wait for verification to complete → status should become `verified`

### Activation order (once domain is verified)

```env
# backend/.env — change these two lines:
ALLOW_EMAIL_SENDS=true
ALLOW_LEAD_RESEND=true
ALLOW_LEAD_OUTBOX_DISPATCH=true

# Add test recipient before going broad:
LEAD_OUTBOX_EMAIL_ALLOWLIST=management@santacruzstrength.com
```

Restart backend. Submit a test lead → verify email arrives → check Resend dashboard for delivery status.

### Residual risk
- `LEAD_OUTBOX_TEST_RECIPIENT_MODE=true` — all outbox emails go ONLY to allowlisted addresses until this is set to `false` and `LEAD_OUTBOX_PRODUCTION_DELIVERY_APPROVED=true`
- `ALLOW_RESEND_WEBHOOKS=false` — bounce/complaint callbacks from Resend won't be processed until enabled. Enable after verifying sends work.

---

## Twilio: READY (activation requires 3 env changes + webhook config)

### Evidence

| Check | Result | Source |
|---|---|---|
| SDK | twilio 9.10.4 installed | `import twilio` |
| Account | **active**, name="My first Twilio account" | Twilio API `accounts.fetch()` |
| Phone | `+14085836671` — **owned ✓, SMS capable: True** | Twilio API `incoming_phone_numbers.list()` |
| Auth token | 32 chars, used in `RequestValidator` for webhook signature validation | `.env` + server.py:4216 |
| Inbound webhook | POST `/api/webhooks/twilio-sms` — validates signature, processes STOP keywords, creates background task for DB updates and email forwarding | server.py:4336–4405 |
| Status callback | POST `/api/webhooks/twilio-status` — validates signature, updates outbox job status | server.py:4407 |
| Quiet hours | 8pm–8am PST enforced in `provider_dispatch.py:326–327` from `SCS_SMS_QUIET_START_HOUR=20`, `SCS_SMS_QUIET_END_HOUR=8` | Code + `.env` |
| STOP/opt-out | Inbound webhook checks for STOP keyword, sets lead opt-out | server.py inbound handler |
| Consent gate | `_sms_suppressed()` checks `blacklisted` and `sms_opted_out` before every send | provider_dispatch.py:351–352 |
| Outbox wiring | Lead form creates SMS outbox jobs (`status: pending`) — verified with live audit lead | DB query |

### Blocker: Webhook URLs not configured

```env
TWILIO_WEBHOOK_BASE_URL=       # empty
TWILIO_STATUS_CALLBACK_URL=    # empty
```

Without these, outbound SMS won't include a status callback URL, and you need to configure the inbound webhook URL in the Twilio console.

### Activation order

```env
# backend/.env — change these lines:
ALLOW_SMS_SENDS=true
ALLOW_LEAD_TWILIO=true
ALLOW_TWILIO_WEBHOOKS=true
ALLOW_LEAD_OUTBOX_DISPATCH=true     # if not already set for Resend

# Set webhook URLs:
TWILIO_WEBHOOK_BASE_URL=https://santacruzstrength.com
TWILIO_STATUS_CALLBACK_URL=https://santacruzstrength.com/api/webhooks/twilio-status

# Add test recipient:
LEAD_OUTBOX_SMS_ALLOWLIST=+15103616605
```

Then in [Twilio Console → Phone Numbers → +14085836671](https://console.twilio.com/):
- Set "A Message Comes In" webhook to: `https://santacruzstrength.com/api/webhooks/twilio-sms` (POST)

Restart backend. Submit a test lead → verify SMS arrives at allowlisted number → check Twilio dashboard for delivery status.

### Residual risk
- Same `LEAD_OUTBOX_TEST_RECIPIENT_MODE` gate as Resend — all SMS go ONLY to allowlisted numbers until production delivery is approved
- Staff numbers (`+15103616605`, `+14083376709`) receive forwarded inbound messages — verify these are correct

---

## Blog Seed: BLOCKED (seed guard prevents partial fill)

### Evidence

| Check | Result | Source |
|---|---|---|
| Canonical corpus | 27 slugs in `route-metadata.json` | SEO metadata |
| Seed source | 7 inline + 20 from `PUBLISHED_ARTICLES` in `blog_articles.py` = **27 total** | server.py:4479–4944 |
| Preview DB | **27 posts** (full match) | `db.blog.count_documents({})` |
| Production DB | **7 posts** (the 7 inline articles only) | `curl /api/blog?limit=50` |
| Missing from prod | 20 articles (all from `PUBLISHED_ARTICLES`) | Set difference |
| Seed guard | `if ALLOW_SEEDING and blog_count == 0` — **will NOT run** because production has 7 posts | server.py:5232–5234 |
| Idempotency | **NOT idempotent for partial data** — the seed is all-or-nothing | Code inspection |

### Root cause
Production was deployed with the V1 database containing 7 posts. The V2 seed function includes all 27 but only runs when `blog_count == 0`. Since production has 7, the guard blocks the seed.

### Safe seed path (requires code change + redeploy)

The seed function needs to handle the partial-fill case. Two options:

**Option A (recommended): Upsert by slug**
Change the seed to upsert each post by slug instead of bulk-inserting only when empty. This is idempotent — running it multiple times produces the same 27 posts.

**Option B: Drop and reseed**
Not recommended for production — loses any manual edits, view counts, or metadata added to the 7 existing posts.

### Activation order (after code change)
1. Modify `seed_blog_posts()` to use `update_one({'slug': post['slug']}, {'$setOnInsert': post}, upsert=True)` for each post
2. Redeploy
3. The startup seed will fill in the 20 missing posts without touching the 7 existing ones
4. Verify: `curl /api/blog?limit=50` returns `total: 27`

---

## Meta Pixel: DEFERRED

### Evidence
- No Pixel ID has been provided by the owner
- No consent/measurement contract defined (GDPR/CCPA considerations for tracking scripts)
- The V2 frontend has `REACT_APP_ALLOW_ANALYTICS=false` in `.env` — analytics gates are already in place
- No code changes needed until the ID is supplied

### Activation order (when ID is provided)
1. Owner provides Facebook Pixel ID
2. Add `REACT_APP_META_PIXEL_ID=<id>` to frontend `.env`
3. Set `REACT_APP_ALLOW_ANALYTICS=true`
4. Implement pixel script in the analytics utility (fires on lead form submission)
5. Redeploy

---

## Summary

| Capability | Status | Blocker |
|---|---|---|
| **Resend** | READY | DNS `partially_failed` — fix in Resend dashboard, then flip 3 env flags |
| **Twilio** | READY | Webhook URLs empty — set in `.env` + Twilio console, then flip 4 env flags |
| **Blog Seed** | BLOCKED | Seed guard `blog_count == 0` prevents filling 20 missing posts. Needs code change to upsert-by-slug |
| **Meta Pixel** | DEFERRED | No Pixel ID or consent contract provided |
