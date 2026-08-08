# Take Santa Cruz Strength Live:

```
Take a working local build of the Santa Cruz Strength site into production and wire the integrations that only exist once a real domain does. The code is finished and green. What remains is deployment, DNS, one host rule, and a set of third party connections where several are deliberately held shut. Move through the sequence in order. Halt at every gate marked HUMAN CONFIRM and wait for a written go from Muhammad Atif before proceeding past it. Report what you did after each numbered step in one line, naming the artifact you produced or the setting you changed.

=== WHERE THE CODE IS, START HERE ===

  repository: https://github.com/Atinuha/santa-cruz-strength-site
  branch:     convergence/t1-backend
  commit:     3b88cf9

Clone that branch. Do not use main, which is an older state and deliberately
untouched so a comparison remains possible.

=== ALREADY HANDLED, DO NOT REDO ===

Git history previously carried a 389 KB blob holding a real customer export:
1329 email addresses with names, phone numbers, dates of birth, and home
addresses. It was purged from all 131 commits with git filter-repo before this
branch was ever pushed, and the purge was verified three ways: the blob sha is
unreachable, no path matches the filename anywhere in history, and no blob in
the repository begins with those column headers. The remote returns Not Found
for that path. A full backup bundle of the pre-purge repository is held offline
by Muhammad Atif.

What this means for you: the history you clone is clean, and it must stay that
way. Treat any reappearance of a customer export, a lead dump, or any file
carrying personal data as a stop-work event, report it, and do not commit it.
Keep personal data in the database where it belongs, never in the repository.

=== THE STANDING INVARIANT, HOLD IT THROUGHOUT ===

Fourteen ALLOW_* environment flags exist, every one defaulting to disabled, behind a global write gate middleware. The invariant they encode: possessing an API key is never by itself sufficient to send anything outward. Keep it that way. Turning any outbound path on is a separate, deliberate, reviewed act, and each time you enable one you state in your report which flag you set, on which service, and the evidence that made it safe. Leave the flags present, leave their defaults disabled, and let configuration rather than code decide what is live.

=== BUILD ===

Build the frontend with exactly this, from the repo root:

  cd frontend && REACT_APP_BACKEND_URL=<api-url> npm run build

Use that form every time. It carries the prebuild and postbuild hooks that generate the sitemap and all 39 route shells. Reaching for `npx craco build` skips those hooks and yields an artifact that looks fine and is silently missing the shells and the sitemap. If a build finishes and the output lacks 39 route shells or sitemap.xml, discard it and rerun the command above.

Ship state to preserve, verify each after deploy:
  React 19 SPA on CRACO, FastAPI backend on Motor and MongoDB.
  Backend seeds 27 blog posts, site content, and 7 team members at startup.
  132 backend tests, 35 frontend tests, 30 SEO validator checks, all passing. Run all three suites against the deployed configuration and paste the counts.
  27 blog articles, 83 internal links, 34 URL sitemap, 99 FAQ schema pairs, 39 route shells.
  Approved design ported from the client approved preview: Barlow Condensed and DM Sans self hosted, chalk #E8E1D6, clay #A5543B. Keep the fonts self hosted and the tokens intact.

=== THE SEQUENCE ===

1. DEPLOY
Stand up frontend and backend with a real MongoDB instance. Point REACT_APP_BACKEND_URL at the deployed API before building, not after. That value is compiled into the JavaScript bundle, so a build made against a local address ships the local address. Any build directory produced before the API URL was known must be discarded and rebuilt, not patched. Confirm the seed ran: 27 posts, 7 team members, site content present. Confirm all three test suites pass against production configuration.

2. HOST RULE, REAL 404s
Write the host rule that returns an honest HTTP 404 for unknown URLs. This is a prerequisite for Google Search Console, not a polish item. A SPA catch all that answers every path with 200 will get the sitemap rejected and the site mis-indexed.

The rule, in order:
  Serve static files first.
  Rewrite only /staff/*, /review/*, and /implementation-preview to index.html with status 200.
  Send everything else to /404.html with a genuine 404 status.

Vercel, Netlify, and Cloudflare Pages configurations already exist in the repo notes. Use the one matching the chosen host rather than authoring a new pattern. Verify with `curl -I https://<domain>/this-path-does-not-exist` and confirm the response line reads 404, then confirm /staff/anything returns 200.

2b. TWO THINGS THAT BREAK ON FIRST DEPLOY, HANDLE THEM IN STEP 1

CORS_ORIGINS is mandatory or the backend will not boot. backend/security_controls.py raises at startup if CORS_ORIGINS is unset while APP_ENV is staging, preview or production, and it rejects localhost and 127.0.0.1 origins in those environments. This is deliberate, it fails closed rather than defaulting open. Set CORS_ORIGINS to the real deployed frontend origin before first boot. If the backend crashes on startup with a RuntimeError about origins, this is the cause, not a bug.

/staff and /review have no prerendered directory and depend entirely on the host rule. The build produces 39 route directories and a real 404.html that boots the full SPA bundle, but frontend/build/staff and frontend/build/review do not exist, because those routes are client only. If the host serves its own generic 404 for unmatched paths instead of following the rule in step 2, then a staff member who bookmarks or refreshes /staff/dashboard is locked out of the CRM, and a customer clicking a review link at /review/<token> hits a dead page and the review funnel fails silently. Verify both by hand after deploying: load /staff/dashboard directly in a fresh tab and confirm the app boots, then load /review/anything and confirm the same.

3. GOOGLE SEARCH CONSOLE
Create a DOMAIN property. Verify by DNS TXT record. Submit sitemap.xml as a relative path.
Verify by DNS, and only by DNS. GA4 verification fails here in a confusing way, because analytics is gated behind both a hostname check and a consent check, so the tag will not be present for the verifier. Reaching for the Google Analytics method will cost an hour and teach nothing. Go straight to the TXT record.

4. RESEND, TRANSACTIONAL EMAIL
The adapter exists and sits behind ALLOW_LEAD_RESEND. Configure the API key and verify the sending domain first. Enable the flag as its own deliberate step, send one test to an address the human names, and report the flag change with the message ID.

5. TWILIO, SMS: KEEP CLOSED
HUMAN BLOCKED AT THE CARRIER. NOT A CODE PROBLEM.

The A2P 10DLC campaign is REJECTED at the carrier, errors 30896 and 30917. The toll free number is unverified with messaging disabled. No code change, no library version, no alternate endpoint, and no different sender fixes this. Configure credentials if useful, leave the sending flag off, and leave the registration to be resolved by a human with the carrier. Report the blocked state as blocked and move to the next step. Sending remains off until a human confirms the registration is approved.

6. GYMMASTERONLINE CRM: KEEP CLOSED
A recording adapter and a documented, cited contract exist. The account behind them is empty: zero members, no membership types, no billing provider configured, and nobody has yet read a companyid out of it. The adapter refuses to construct without both ALLOW_GYMMASTER_PROSPECT_WRITES and a durable journal, which is correct behavior, not a bug to route around.

Leave it off until all of these are true and evidenced: a companyid read from the live account, membership types configured, a billing provider connected, and a durable journal in place. Recording mode may run. Prospect and member writes stay off. Create nothing real in that CRM.

7. ANALYTICS
GA4 and Meta are consent gated and hostname gated. On the production domain, verify with an open network tab that neither fires before consent, that both fire after consent is granted, and that neither fires on a non production hostname. Report the four observations.

=== HOLD THESE LINES THROUGHOUT ===

Leave GymMaster prospect and member creation off. Recording only.
Leave Twilio sending off while the A2P registration reads rejected.
Keep all 14 ALLOW_* flags present and defaulting to disabled. Change what a deployment sets, never what the code defaults to.
Keep the customer lead export, and any file carrying personal data, out of every commit and every build artifact.
Keep every photograph real. The client approved positioning forbids stock and AI generated imagery explicitly, and the previous build's AI gym photos were removed for exactly that reason. Where an image is missing, leave the slot empty and list it as needed rather than filling it.
Keep the 25 [FACT NEEDED] markers in the blog articles exactly as they are. They are deliberate. The gym owner fills them or they stay visible. A plausible guess in that slot is a false claim on a live business website.

=== OPEN FACTS ONLY THE GYM OWNER CAN SUPPLY ===

Surface this list to the human at handoff and again at launch. Leave each corresponding slot marked rather than estimated:
  Personal training session rates and package structure.
  Minimum age for membership or supervised training, and whether a parent must be present.
  Exact counts of lifting platforms, squat racks, benches, and specialty bars, and whether chalk is allowed.
  Whether the day pass runs 9am to 6pm or the full staffed window. The published hours and the tier terms currently contradict each other, so one of them is wrong on a live page.
  Whether 24/7 app access applies to the Weekend Warrior tiers.

=== CLOSE OUT WITH ===

A deployment report carrying: the live URLs, the curl output proving a real 404 on an unknown path and a 200 on /staff/*, the three test suite counts, the DNS verification and sitemap submission status, every ALLOW_* flag you changed with the reason and evidence, and the still open items listed as open. Name what remains blocked plainly. A blocker reported as blocked is a finished step.

**PRODUCTION DOMAIN**:

**HOSTING PLATFORM (Vercel, Netlify, or Cloudflare Pages)**:

**MONGODB CONNECTION STRING**:
```
