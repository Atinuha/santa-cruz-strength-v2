# Convergence Ticket State

Durable slice state. The spec says what to build; this says how far we got.
**Update the table in the same commit as the ticket it describes.**

Branch: `convergence/t1-backend` · Destination: `/Users/atifmac/SantaCruzrepo`
Donors are read-only: `../SantaCruzrepo-new` (content), `../scs-build` (engineering)

| ID | Slice | State | Commit |
|----|-------|-------|--------|
| T-0 | Remote push target set to `no_push` | DONE | ed0a2e1 |
| T-1 | Backend converged from engineering donor | DONE | ed0a2e1 |
| T-2 | Frontend converged, lead capture restored | DONE | 7f8923c |
| T-3 | Hero filled with the real gym, alt text corrected | DONE | 652cb9a |
| T-4 | Ten long form articles imported, corpus 7 to 17 | DONE | 4e22717 |
| T-5 | Twilio declared the sole SMS provider, fallback removed | DONE | fa6c49b |
| T-6 | Vendor residue removed, zero remote hosts in source | DONE | 6f71ffb |
| T-7 | CRM boundary: records intended writes, cannot send | DONE | pending |
| T-8 | Rotate the disclosed owner credential (human action) | **NEXT**, yours | |
| T-9 | Final integrated review | **READY** | |

T-5 and T-6 touch disjoint files and may run in either order.

## Verification baseline

Everything below passed at the last commit. Re-run before trusting it.

```
cd backend   && for t in tests/test_*.py; do python -m unittest "tests.$(basename $t .py)"; done   # 91 tests, 13 modules
cd frontend  && CI=true npx craco test --watchAll=false                                            # 20 tests, 8 suites
cd frontend  && node scripts/validate-seo.mjs                                                      # 17 checks
cd frontend  && npx craco build                                                                    # green
```

Install note: the frontend must be installed with **yarn against the committed
`yarn.lock`**. npm resolves a broken ajv tree and every override attempt moves
the failure rather than fixing it.

## Safety invariants that must never regress

1. No live provider write. Supplying an API key must never be sufficient to send.
2. Persistence is local. Production connection strings are never copied in.
3. Every outbound capability defaults to disabled.
4. Startup mutates nothing: no credential reset, no scheduler, without an explicit enable.
5. Webhooks verify signatures and fail closed.
6. The remote push target stays `no_push`.
7. A prior safety result is valid only while its configuration and code path are unchanged.

Current state of these lives in `LOCAL-SAFETY.md`.

## Blockers, external only

| ID | Blocker | Owner |
|----|---------|-------|
| B-CSV | `leads_export.csv` is committed: 1,386 real customer records, 1,323 emails, 1,282 phones. Private remote, already pushed, permanent in history. Needs a history-rewrite or accept decision | User and owner |
| B-03 | Written likeness permission for the four frames in `SCS_MEDIA_AWAITING_PERMISSION` | Owner |
| B-04 | CRM credentials, field mapping, idempotency key, cutover date | Owner and vendor |
| ~~B-05~~ | ~~Email provider precedence~~ CLOSED. It was never two email providers; MailerSend was an SMS fallback and is removed | closed |
| B-11 | Rotate the disclosed owner credential. Now actually sticks, since the startup force-reset is gone | User |
| B-LLM | `EMERGENT_LLM_KEY` still powers the staff blog idea generator via the platform's model proxy. A working feature behind a vendor key, not residue. Swap to a direct provider key or retire the feature | User |
| B-02b | Higher resolution, better framed facility photographs. Quality request, not a blocker | Owner |

## Corrections on record

Findings I recorded and later disproved. Kept so they are not re-derived.

- **Media**: "no photograph of the room exists" was wrong. Real facility, entrance and clean action frames existed the whole time. The hero shot was missed because its filename described a screenshot.
- **Blog**: "the seven published slugs have no bodies" was wrong. All seven are in `seed_blog_posts`. The sitemap was always honest.
- **SEO**: canonicals, sitemap, schema and the 404 view were already built and gated.
- **Tests**: the backend suite was never blocked on pytest; it is `unittest`.
- **Providers**: "two email providers wired" was wrong. MailerSend was a Twilio SMS fallback, not an email provider. Removed in T-5 for duplicate delivery and unprocessable STOP.
- **T-1 green claim**: replacing the backend broke every lead form until T-2, because the endpoint diff compared route presence rather than request contracts.

Common thread: each came from concluding absence after a partial search. **Grep the destination itself before declaring anything missing.**
