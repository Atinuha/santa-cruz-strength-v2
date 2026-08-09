# Take Santa Cruz Strength Live:

```
Take a working local build of the Santa Cruz Strength site into production and wire the integrations that only exist once a real domain does. The code is finished and green. What remains is deployment, DNS, one host rule, and a set of third party connections where several are deliberately held shut. Move through the sequence in order. Halt at every gate marked HUMAN CONFIRM and wait for a written go from Muhammad Atif before proceeding past it. Report what you did after each numbered step in one line, naming the artifact you produced or the setting you changed.

=== WHERE THE CODE IS, START HERE ===

  repository: https://github.com/Atinuha/santa-cruz-strength
  branch:     main

Clone it. That repository holds one branch and its history begins at the
converged state, so there is no older tree to pick up by accident.

Install the frontend with yarn, not npm. This is not a preference, npm cannot
install this project at all. Verified against a fresh clone of this repository:

  cd frontend
  yarn install --frozen-lockfile

If yarn is absent from the build image, `npx --yes yarn@1.22.22 install
--frozen-lockfile` works, or enable corepack. Yarn emits peer warnings about
react-day-picker, babel, typescript and workspaces. All are cosmetic and the
build is green with them present.

What happens if you reach for npm anyway, so you do not spend an hour on it:
  npm ci               fails immediately, no package-lock.json is committed
  npm install          fails in under a second, ERESOLVE, react-day-picker
                       8.10.1 wants date-fns 2 or 3 and the project is on 4
  npm install --legacy-peer-deps
                       appears to work, installs 1510 packages over two
                       minutes, and THEN the build dies on
                       "Cannot find module 'ajv/dist/compile/codegen'"

That last one is the trap. It fails late, after the log has already said the
install succeeded. If you see the ajv error, the cause is that npm was used to
install, not anything about the build.

=== ALREADY HANDLED, DO NOT REDO ===

An earlier repository carried a 389 KB blob holding a real customer export:
1324 real email addresses with names, phone numbers, dates of birth, and home
addresses, including EU data subjects. That repository has been abandoned. The
one you are cloning was created fresh and its history never contained the file.

Verified before the first push, against the isolated clone that seeded it, and
re-verified since on a fresh clone by scanning every blob in the object store: the export's blob sha absent from the object store, the
commit that introduced it absent, and no blob anywhere carrying that export.
Note that backend/server.py legitimately contains the strings date_of_birth and
zip_code: it generates the staff CSV import template, with one fabricated
sample row. A reviewer grepping for column names will hit that and should not
escalate over it. The GitHub API returns 404 for that blob by direct sha lookup on this
repository.

What this means for you: the history you clone is clean, and it must stay that
way. Treat any reappearance of a customer export, a lead dump, or any file
carrying personal data as a stop-work event, report it, and do not commit it.
Keep personal data in the database where it belongs, never in the repository.

=== THE STANDING INVARIANT, HOLD IT THROUGHOUT ===

Sixteen ALLOW_* environment flags exist, every one defaulting to disabled, behind a global write gate middleware. Fourteen are declared in backend/runtime_safety.py; ALLOW_LEAD_CRM_RECORDING and ALLOW_GYMMASTER_PROSPECT_WRITES are read where they are used, in provider_dispatch.py and gymmaster_adapter.py. The invariant they encode: possessing an API key is never by itself sufficient to send anything outward. Keep it that way. One limit of the gate worth knowing before you trust it: it inspects the HTTP method, so a GET handler that performs an outbound call passes straight through it. Corporate business discovery is exactly that and the gate could never have seen it. Blog idea generation is a POST and was already subject to the middleware; it needed a flag for a different reason, which is that possessing a model provider key was itself sufficient to send. Both are now flag gated. A third case was found later and fixed the same way: a staff settings read persisted a cache on a GET, so protected read-only mode was not read-only. Turning any outbound path on is a separate, deliberate, reviewed act, and each time you enable one you state in your report which flag you set, on which service, and the evidence that made it safe. Leave the flags present, leave their defaults disabled, and let configuration rather than code decide what is live.

=== BUILD ===

Build the frontend with exactly this, from the repo root:

  cd frontend && REACT_APP_BACKEND_URL=<api-url> npm run build

Use that form every time. It carries the prebuild and postbuild hooks that generate the sitemap and all 39 route shells. Reaching for `npx craco build` skips those hooks and yields an artifact that looks fine and is silently missing the shells and the sitemap. If a build finishes and the output lacks 39 route shells or sitemap.xml, discard it and rerun the command above.

A correct build prints these three lines and produces these artifacts. Measured
on a fresh clone of this repository, so treat any deviation as a real problem:

  prebuild   Generated sitemap with 34 canonical URLs.
  build      main.js about 268 kB gzipped, main.css about 19.6 kB gzipped
  postbuild  Generated route-specific head shells for 39 routes plus 404.html.

  build/sitemap.xml   exists, 34 <url> entries
  build/404.html      exists, boots the full SPA bundle
  route shells        38 subdirectory index.html files plus the root, 39 total

Ship state to preserve, verify each after deploy:
  React 19 SPA on CRACO, FastAPI backend on Motor and MongoDB.
  Backend seeds 27 blog posts, site content, and 7 team members at startup,
  but ONLY when ALLOW_DATABASE_WRITES and ALLOW_SEEDING are both true. With
  either off it starts cleanly and seeds nothing, and the site then serves an
  empty blog and no team, which reads as a broken deploy rather than a
  configuration one. Set both for the first boot.
  137 backend tests, 60 frontend tests, 32 SEO validator checks, all passing. Run all three suites against the deployed configuration and paste the counts.
  27 blog articles, 83 internal links, 34 URL sitemap, 89 FAQ schema pairs, 39 route shells.
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

Working configurations for Netlify, Cloudflare Pages and Vercel are committed at deploy/ in this repository, with a README explaining which file goes where and how to verify it. Use the one matching your host rather than authoring a new pattern. An earlier version of this document claimed these existed when they did not, which an acceptance test caught. Verify with `curl -I https://<domain>/this-path-does-not-exist` and confirm the response line reads 404, then confirm /staff/anything returns 200.

2b. FIVE THINGS THAT BREAK ON FIRST DEPLOY, HANDLE THEM IN STEP 1

Pin the backend to Python 3.11, 3.12 or 3.13. On 3.14 the requirements are
unresolvable: google-api-core demands grpcio-status 1.75.1 or newer there,
while this file pins 1.71.2, and pip stops with ResolutionImpossible. On 3.11
everything installs clean.

Two frontend build flags default off and cannot be set after the fact, because
they are compiled into the bundle. REACT_APP_ALLOW_ANALYTICS must be true on the
production build or GA4 can never load whatever consent a visitor gives.
REACT_APP_ALLOW_GIPHY governs the staff email builder's GIF search, which
reaches a third party from the browser, and holding a Giphy key is deliberately
not sufficient on its own. Both fail closed when unset.

Set BOOTSTRAP_OWNER_EMAIL and BOOTSTRAP_OWNER_PASSWORD before the first boot.
They are the only path to a first admin account. Without them the backend logs
"[BOOTSTRAP] No owner exists" on every start and nobody can sign in to the
staff CRM at all, which is not obvious because the public site works perfectly.

DB_NAME must contain one of test, staging, preview, development, dev or local
whenever APP_ENV is not production and database writes are on. Otherwise
startup raises. A name like scs_review fails this and the error reads as a
crash rather than as a rule.

CORS_ORIGINS is mandatory or the backend will not boot. backend/security_controls.py raises at startup if CORS_ORIGINS is unset while APP_ENV is staging, preview or production, and it rejects localhost and 127.0.0.1 origins in those environments. This is deliberate, it fails closed rather than defaulting open. Set CORS_ORIGINS to the real deployed frontend origin before first boot. If the backend crashes on startup with a RuntimeError about origins, this is the cause, not a bug.

/staff and /review have no prerendered directory and depend entirely on the host rule. The build produces 39 route directories and a real 404.html that boots the full SPA bundle, but frontend/build/staff and frontend/build/review do not exist, because those routes are client only. If the host serves its own generic 404 for unmatched paths instead of following the rule in step 2, then a staff member who bookmarks or refreshes /staff/dashboard is locked out of the CRM, and a customer clicking a review link at /review/<token> hits a dead page and the review funnel fails silently. Verify both by hand after deploying: load /staff/dashboard directly in a fresh tab and confirm the app boots, then load /review/anything and confirm the same.

3. GOOGLE SEARCH CONSOLE
Create a DOMAIN property. Verify by DNS TXT record. Submit sitemap.xml as a relative path.
Verify by DNS, and only by DNS. GA4 verification fails here in a confusing way, because analytics is gated behind both a hostname check and a consent check, so the tag will not be present for the verifier. Reaching for the Google Analytics method will cost an hour and teach nothing. Go straight to the TXT record.

4. RESEND, TRANSACTIONAL EMAIL
The adapter sits behind ALLOW_LEAD_RESEND, and that flag alone is not
sufficient. Sending also requires ALLOW_LEAD_OUTBOX_DISPATCH, because the
outbox is what performs the send, and ALLOW_EMAIL_SENDS. Runtime validation
refuses to start if a provider flag is on without the dispatch flag, so a
partial configuration fails loudly rather than sending nothing quietly.
LEAD_OUTBOX_TEST_RECIPIENT_MODE defaults true and confines delivery to the
allowlist; turning it off is a separate deliberate act. Configure the API key and verify the sending domain first. Enable the flag as its own deliberate step, send one test to an address the human names, and report the flag change with the message ID.

5. TWILIO, SMS: KEEP CLOSED
HUMAN BLOCKED AT THE CARRIER. NOT A CODE PROBLEM.

The A2P 10DLC campaign is REJECTED at the carrier, errors 30896 and 30917. The toll free number is unverified with messaging disabled. No code change, no library version, no alternate endpoint, and no different sender fixes this. Configure credentials if useful, leave the sending flag off, and leave the registration to be resolved by a human with the carrier. Report the blocked state as blocked and move to the next step. Sending remains off until a human confirms the registration is approved.

6. GYMMASTERONLINE CRM: KEEP CLOSED
A recording adapter and a documented, cited contract exist. The account behind them is empty: zero members, no membership types, no billing provider configured, and nobody has yet read a companyid out of it. The adapter refuses to construct without both ALLOW_GYMMASTER_PROSPECT_WRITES and a durable journal, which is correct behavior, not a bug to route around.

Leave it off until all of these are true and evidenced: a companyid read from
the live account, membership types configured, a billing provider connected,
and a durable journal in place.

On recording mode: ALLOW_LEAD_CRM_RECORDING exists and gates it, but nothing
currently feeds it, so enabling it produces no records. It is a capability
waiting on an intake path, not a feature you can switch on and observe. Do
not report it as working because the flag flipped. Prospect and member writes stay off. Create nothing real in that CRM.

7. ANALYTICS, AND THE ONE THIRD PARTY THAT LOADS BEFORE CONSENT

Verified in a browser against the production build, not asserted. On the
homepage and on /about the only hosts contacted are the site's own origin and
its own API. No Google, no Meta, no font CDN, no social widget. Fonts are self
hosted and the analytics tags are consent gated, so the invariant holds.

One exception, and it is deliberate rather than an oversight. On /contact the
Google Maps iframe loads immediately, which sends the visitor's IP to Google
and sets Google cookies before the consent control has been answered. The owner
reviewed this and asked for the map to be visible on arrival rather than behind
a button, which is the right call for a local gym whose visitors are mostly
working out how far away it is. The reasoning is recorded in
frontend/src/components/MapEmbed.js rather than hidden.

Do not silently "fix" this by putting the map back behind a click. If it ever
has to change, the honest fix is to gate the frame on the existing marketing
consent value in utils/analyticsConsent, not on a button nobody presses. Raise
it with the owner first. Worth knowing that the customer records handled by
this business include EU data subjects, so if a privacy review ever happens
this frame is the thing it will land on.
GA4 is gated three ways: a build time flag, the production hostname, and explicit consent. All three must be true.

Set REACT_APP_ALLOW_ANALYTICS=true on the production build or analytics can never load, whatever consent a visitor gives. It defaults off, like every other outbound capability here.

There is no Meta pixel in this codebase. An earlier version of this document told you to verify one fires, which would have sent you looking for something that does not exist. If Meta is wanted it has to be added, and it should be added behind the same three gates.

On the production domain, verify with an open network tab: GA4 does not fire before consent, does fire after consent is granted, and does not fire on a non production hostname. Report the three observations.

One third party does load before consent and it is deliberate. See step 7 above regarding the map.

=== HOLD THESE LINES THROUGHOUT ===

Leave GymMaster prospect and member creation off. Recording only.
Leave Twilio sending off while the A2P registration reads rejected.
Keep all 14 ALLOW_* flags present and defaulting to disabled. Change what a deployment sets, never what the code defaults to.
Keep the customer lead export, and any file carrying personal data, out of every commit and every build artifact.
Keep every photograph real. The client approved positioning forbids stock and AI generated imagery explicitly, and the previous build's AI gym photos were removed for exactly that reason. Where an image is missing, leave the slot empty and list it as needed rather than filling it.
Keep the [FACT NEEDED] markers in the blog articles exactly as they are. There are 26 of them across 25 lines, one line carrying two, spread over blog_articles.py, blog_articles_segments.py and blog_articles_authority.py. They are deliberate. The gym owner fills them or they stay visible. A plausible guess in that slot is a false claim on a live business website.

=== TWO THINGS WRONG ON THE CURRENT LIVE SITE, CARRY THEM ACROSS ===

Found by reading santacruzstrength.com directly. Neither is caused by this
rebuild and neither is fixed by deploying it. Surface both to the owner.

The day pass window contradicts itself three ways on the live site right now.
The footer and hours block say 9:00 AM to 6:00 PM, Monday through Sunday. The
day pass plan card says access during staffed hours, 9am to 9pm. The join page
FAQ repeats 9am to 9pm. Published staffed hours are 8 to 7 on weekdays and 9 to
2 at weekends, so 9am to 9pm matches nothing the business publishes anywhere.
Under the footer's claim a Sunday day pass runs to 6 PM; under the tier terms it
would end at 2 PM when the doors are staffed until. Somebody buys a pass and
drives to a locked door. The owner has to settle which is true.

The live structured data publishes hours the gym does not keep. Its JSON-LD
says Monday to Friday 05:30 to 21:00 and Saturday 07:00 to 17:00, against
visible copy of 8 to 7 and 9 to 2. That is what Google reads, so it may be
telling people to arrive at half past five in the morning. This rebuild
deliberately omits openingHoursSpecification rather than publish an unverified
claim, and a validator check enforces that omission. Do not add hours to the
schema until the owner has confirmed them in writing.

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
