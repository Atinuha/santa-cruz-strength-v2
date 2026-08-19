# Release Ledger — Santa Cruz Strength V2

## Evidence-only closeout (Aug 19, 2026)

No production deploy occurred. No provider was enabled.

### Git state

| Field | Value |
|---|---|
| HEAD | `24e2c69d70760400d45664a1e59df8e2b6e4a337` |
| Branch | `main` |
| Untracked | `frontend/yarn.lock`, `yarn.lock` |
| Dirty files | 0 |

### Changed files (git diff --stat HEAD~1)

```
frontend/scripts/validate-production-env.mjs       |  28 ++-
frontend/src/components/leadForms.behavior.test.js  | 278 +++
frontend/src/seo/productionEnvGate.test.js          |  35 +++
3 files changed, 339 insertions(+), 2 deletions(-)
```

### Preview database

| Field | Value |
|---|---|
| MONGO_URL | `mongodb://<redacted>` |
| DB_NAME | `test_database` |

### Content seed scope (12 keys in `site_content`)

| Key | SHA-256 prefix | Length |
|---|---|---|
| `about_cta_headline` | `f0f5bf3f487a` | 21 |
| `about_cta_text` | `f5b1fd925cb0` | 115 |
| `about_headline` | `51d2b4f3f05d` | 27 |
| `about_mission` | `44a8c4243201` | 37 |
| `about_story` | `e4b4c3ba24fe` | 1206 |
| `about_team_headline` | `55d9514e685e` | 13 |
| `about_team_subtitle` | `93b1a6197110` | 26 |
| `about_trainers_headline` | `2622466f1693` | 17 |
| `about_trainers_subtitle` | `a1e2cfb828ee` | 31 |
| `home_who_headline` | `2c96390a9d1f` | 30 |
| `home_who_subtext` | `1f751b15419f` | 96 |
| `home_who_text` | `2d808036a6d0` | 130 |

Unchanged collections: team_members (7), blog (27), leads (1412), users (3).

### Rollback (preview database only)

```python
# Scoped to test_database on localhost. Does not touch production.
from pymongo import MongoClient
db = MongoClient('mongodb://localhost:27017')['test_database']

# 8 keys inserted by pass 2 — delete them
for key in [
    'about_headline', 'about_story',
    'about_team_headline', 'about_team_subtitle',
    'about_trainers_headline', 'about_trainers_subtitle',
    'about_cta_headline', 'about_cta_text',
]:
    db.site_content.delete_one({'key': key})

# 4 keys updated by pass 2 — restore original values
db.site_content.update_one({'key': 'about_mission'}, {'$set': {'value': 'Come as you are, leave how you want!'}})
db.site_content.update_one({'key': 'home_who_headline'}, {'$set': {'value': 'IF YOU TRAIN,\nYOU BELONG HERE.'}})
db.site_content.update_one({'key': 'home_who_text'}, {'$set': {'value': 'Santa Cruz Strength serves lifters, athletes, and anyone who wants to get stronger, whether you have been training for years or you are just getting started.'}})
db.site_content.update_one({'key': 'home_who_subtext'}, {'$set': {'value': 'What brings people here is simple, and it stays simple. You want to get stronger. So do the people next to you.'}})
```

**Dry-run count: 8 deletes + 4 restores = 12 operations.**
Team members: 0 changes. Blog: 0 changes. Leads: 0 changes. Users: 0 changes.

### Provider gate values

| Gate | Value |
|---|---|
| `ALLOW_DATABASE_WRITES` | `true` (preview write access) |
| `ALLOW_SEEDING` | `false` |
| `ALLOW_SCHEDULERS` | `false` |
| `ALLOW_EMAIL_SENDS` | `false` |
| `ALLOW_SMS_SENDS` | `false` |
| `ALLOW_RESEND_WEBHOOKS` | `false` |
| `ALLOW_TWILIO_WEBHOOKS` | `false` |
| `ALLOW_LEAD_OUTBOX_DISPATCH` | `false` |
| `ALLOW_LEAD_RESEND` | `false` |
| `ALLOW_LEAD_TWILIO` | `false` |
| `ALLOW_GYMMASTER_PROSPECT_WRITES` | `false` |
| `ALLOW_ANALYTICS` | `false` |
| `ALLOW_THIRD_PARTY_RESEARCH` | `false` |
| `REACT_APP_ALLOW_ANALYTICS` | `false` |
| `REACT_APP_ENABLE_VOLUNTEER_PAGE` | `false` |

### Resend package version

`resend==2.23.0`

### Test counts

| Suite | Passed | Failed | Skipped |
|---|---|---|---|
| Backend (pytest) | 200 | 0 | 3 |
| Frontend (jest) | 100 | 0 | 0 |
| **Total** | **300** | **0** | **3** |

### Preview URL

`https://crm-staff-portal-1.preview.emergentagent.com`

### Statements of fact

- No production deploy occurred during this session.
- No provider (Resend, Twilio, GymMaster) was enabled.
- No email or SMS was sent.
- No GymMaster record was created.
- No analytics event was fired.
- No image, media file, or image assignment was changed.
- The production database was not written to.
- The production deployment at `https://santa-cruz-dev.emergent.host` was not modified.
