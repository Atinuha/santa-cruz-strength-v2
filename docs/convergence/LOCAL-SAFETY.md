# Local Safety Record

Operational state, not specification. The invariants themselves live in
`SCS-CONVERGENCE-SPEC.html` section 6. This file records whether they currently hold.

Update this file in the same commit as any change that affects a surface below.
A prior PASS is valid only while the relevant configuration and code path are
unchanged (SI-7).

**Status after T-0 and T-1: backend surfaces PASS. Frontend surfaces pending T-2.**

| Surface | Invariant | Status | Evidence |
|---|---|---|---|
| Datastore | SI-2 | PASS | `ALLOW_DATABASE_WRITES` and `ALLOW_REMOTE_NONPROD_DATABASE` both default False |
| Owner seed | SI-4 | PASS | Hardcoded literal gone. Seed is environment driven with a minimum length and gated by `ALLOW_SEEDING` |
| Schedulers | SI-4 | PASS | `ALLOW_SCHEDULERS` defaults False |
| SMS provider | SI-1, SI-3 | PASS | `ALLOW_SMS_SENDS`, `ALLOW_LEAD_TWILIO` default False |
| Email provider | SI-1, SI-3 | PASS | `ALLOW_EMAIL_SENDS`, `ALLOW_LEAD_RESEND` default False |
| Second email provider | SI-1, SI-3 | PASS gate, **OPEN decision** | Gated, but precedence still undeclared. Ticket T-5 |
| Inbound webhooks | SI-5 | PASS | Twilio signature validated; Resend and MailerSend webhooks gated and fail closed |
| Review token minting | SI-5 | PASS | Covered by the ported authorisation surface |
| Vendor language model | SI-1, SI-3 | PASS | Key alone is insufficient. Removal is ticket T-6 |
| Analytics | SI-1 | **BLOCKED** | `ALLOW_ANALYTICS` defaults False in the backend, but the destination frontend still has no consent gate. Ticket T-2 |
| Git remote | SI-6 | PASS | Push target set to `no_push` |
| Image hosting | n/a | PASS | Read only. Localisation is ticket T-6 |

One surface remains blocked, and it is a frontend concern that T-2 resolves.

**Verified behaviourally, not by inspection:** importing the safety module with
Twilio, Resend, MailerSend and vendor model credentials all present, and no
`ALLOW_*` variables set, yields all fourteen flags `False`. Supplying a key is
not sufficient to send, which is invariant SI-3.

**Not verified:** a live application boot. No local datastore is installed on
this machine, so startup behaviour is verified at the import and test seam
rather than by running the server. Recorded as a known limit of this evidence.

## Verification commands

Record the exact command and result when flipping a row to PASS.

```
# backend regression, per module
python3 -m unittest tests.<module>

# frontend suite
CI=true npx craco test --watchAll=false

# search contract
node scripts/validate-seo.mjs

# production build
npx craco build
```

## Change log

| Date | Surface | From | To | Evidence |
|---|---|---|---|---|
| 2026-08-07 | all | unassessed | recorded | Initial reconnaissance |
| 2026-08-07 | Git remote | live push target | `no_push` | T-0. `git remote -v` |
| 2026-08-07 | all backend surfaces | BLOCKED | PASS | T-1. 68 tests pass; import with credentials present yields 14 deny flags |
| 2026-08-07 | Analytics | BLOCKED | still BLOCKED | Frontend consent gate arrives with T-2 |
