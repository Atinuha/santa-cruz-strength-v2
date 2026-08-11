# Deployment Learnings

Treat every failed deploy as accumulated evidence, not a reason to restart from zero.

## Deployment model

- **Emergent is the production deployment platform and release target.** Do not introduce Netlify, Vercel, or any alternate hosting/deployment architecture unless Emergent itself explicitly requires a compatibility artifact.
- Paths such as `deploy/netlify/_redirects` and `deploy/netlify/_headers` are repository/build compatibility filenames identified by Emergent Support; their names do **not** mean the site is deployed through Netlify.

## Known failure history

- **Production content gate:** deploys previously stopped because production held 7 blog posts while the app declared 27 blog routes. Resolve source/data mismatches at the authoritative boundary; do not weaken the gate or delete valid routes merely to ship.
- **Missing host-config sources:** Emergent Support identified `deploy/netlify/_redirects` and `deploy/netlify/_headers` as required source files. They are now present on `main`. `frontend/scripts/copy-host-config.mjs` copies and validates them during `postbuild`; preserve that invariant without treating Netlify as the deployment platform.
- **Overlapping publishes:** repeated publish clicks created simultaneous failed/building states and obscured the real failure. Run one Emergent release attempt at a time.
- **Generated output is not source:** `frontend/build/` is disposable build output. Repair canonical source files/scripts, then regenerate the build.
- **Frontend install/build contract:** install with Yarn against the committed `yarn.lock`; use the repository's defined production build path so pre/post-build validation and generated route shells execute.

## Release discipline

1. Read this file and the latest failed Emergent publish log before changing anything.
2. Find the **first deterministic failing step**; later errors are downstream noise until proven otherwise.
3. Fan out independent checks where useful, but give one release owner authority to converge findings and avoid conflicting edits.
4. Make the smallest root-cause repair that preserves validation, SEO, safety, data, domain bindings, and the existing Emergent deployment architecture.
5. Reproduce the production build cleanly before publishing.
6. Trigger exactly one Emergent publish; wait for completion.
7. Verify the live origin `https://santacruzstrength.com/`, not merely preview/build success.
8. Append any new failure, root cause, repair, and prevention rule here before the next release attempt.

## Current host-config invariant

`deploy/netlify/_redirects` and `deploy/netlify/_headers` remain canonical compatibility sources because the existing build script expects them. `frontend/scripts/copy-host-config.mjs` copies them into `frontend/build/` and verifies the required 404, staff/review rewrites, noindex header, and `app-shell.html`. Preserve the behavior, but keep deployment ownership with Emergent.
