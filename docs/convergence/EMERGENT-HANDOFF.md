# Ship Santa Cruz Strength:

```
Deploy a finished site. The code is green and the audits are closed; what is left is a domain, a host rule, and a short list of settings that only exist once a real URL does. Work the steps in order, report each in one line naming what you produced, and stop at any step whose answer you would have to invent.

CLONE
  git clone https://github.com/Atinuha/santa-cruz-strength    branch main, one branch only
  React 19 on CRACO in frontend/, FastAPI on Motor and MongoDB in backend/.

BUILD, exactly this
  cd frontend
  yarn install --frozen-lockfile
  REACT_APP_BACKEND_URL=<api-url> PRERENDER_API_URL=<api-url> REACT_APP_ALLOW_ANALYTICS=true yarn build

  PRERENDER_API_URL is new and it is not optional. The public pages are rendered to static HTML
  at build time by reading that API, which is what puts the copy and the article bodies into the
  first response instead of behind a fetch. The backend must be running and seeded before you
  build. Without it the build stops and says so, rather than emitting 38 pages with perfect
  metadata and empty bodies. Boot the backend first, then build.

  Use yarn throughout. npm cannot install this project: npm ci finds no lockfile, npm install
  dies on ERESOLVE, and --legacy-peer-deps installs 1510 packages, reports success, then fails
  the build on ajv. Seeing the ajv error means npm was used.

  A correct build prints "35 canonical URLs", then "39 routes plus 404.html and
  app-shell.html", then "[prerender] 39 routes rendered into their shells". Anything else,
  discard the directory and rerun. Reaching for npx craco build skips those hooks and yields an
  artifact that looks fine and is silently missing the sitemap and every route shell.

  REACT_APP_BACKEND_URL compiles into the bundle. Set it before building, never after.

BOOT, the five settings that decide whether it comes up
  CORS_ORIGINS            the real frontend origin. Unset on staging or production and the
                          backend refuses to start. Deliberate, fails closed.
  BOOTSTRAP_OWNER_EMAIL   with BOOTSTRAP_OWNER_PASSWORD, twelve characters or more. The only
                          path to a first admin. Skip them and the public site works perfectly
                          while nobody can ever sign in to the staff CRM.
  DB_NAME                 contains test, staging, preview, development, dev or local whenever
                          APP_ENV is not production.
  ALLOW_DATABASE_WRITES and ALLOW_SEEDING both true for the first boot, or it starts clean and
                          seeds nothing, and an empty blog reads as a broken deploy.
  Python 3.11, 3.12 or 3.13. On 3.14 the requirements are unresolvable.

  A healthy first boot logs 27 blog posts, 7 team members, 33 content keys. Confirm all three.

HOST RULE, the step that decides whether Google trusts the site
  deploy/ holds working configs for Netlify, Cloudflare Pages and Vercel with a README naming
  which file goes where. Serve static first, rewrite only /staff/*, /review/* and
  /implementation-preview to index.html with 200, send everything else to /404.html with a real
  404.

  Prove it, because three of these pass on a broken config and the first does not:
    curl -I https://<domain>/nothing-here      expect 404
    curl -I https://<domain>/staff/dashboard   expect 200
  Then type /staff/dashboard into a fresh tab and watch it boot. Client side navigation hides
  this failure completely. It surfaces only on a cold load, and when it does, staff are locked
  out of the CRM and every review link is dead.

SEARCH CONSOLE
  Create a DOMAIN property, verify by DNS TXT, submit sitemap.xml. Use DNS and only DNS. The
  analytics method cannot work here because the tag sits behind consent and a hostname check,
  so the verifier never sees it.

PROVIDERS, hold these shut
  Sixteen ALLOW_* flags exist and every one defaults off. They encode one rule worth keeping:
  holding an API key is never by itself permission to send. Leave the defaults, open one path
  at a time, and name in your report which flag you set and the evidence that made it safe.

  Resend needs three together: ALLOW_LEAD_RESEND with ALLOW_LEAD_OUTBOX_DISPATCH and
  ALLOW_EMAIL_SENDS. Verify the sending domain, enable, send one test to an address the human
  names, report the message ID.

  Twilio stays off. The A2P 10DLC campaign is rejected at the carrier, errors 30896 and 30917.
  No code change reaches that. Report it blocked and move on; a blocker reported as blocked is
  a finished step.

  GymMaster stays off. The account holds zero members, no membership types and no billing
  provider, and nobody has read a companyid out of it. Recording mode is gated but nothing
  feeds it, so switching it on produces nothing to observe.

ANALYTICS
  GA4 is gated three ways: the build flag above, the production hostname, and consent. Confirm
  with an open network tab that it stays silent before consent, fires after, and never fires on
  a non production hostname. There is no Meta pixel in this codebase.

  One third party loads before consent and it is deliberate: the Google Maps frame on /contact.
  The owner chose that. Leave it, and raise it with him before changing it.

HOLD THESE LINES
  Every photograph stays real. A previous build shipped AI gym photos and they were torn out
  for exactly that reason. A slot with no honest photograph stays empty and gets listed as
  needed.

  The 26 [FACT NEEDED] markers across 25 lines stay exactly as they are. They are the site
  visibly declining to invent a fact nobody has confirmed. A plausible guess in that slot is a
  false claim on a live business.

  Personal data lives in the database, never in the repository. Treat a lead export or any
  customer file appearing in a commit as a stop-work event.

CLOSE OUT WITH
  Live URLs. Both curl outputs. Test counts from the deployed configuration: 154 backend, 68
  frontend, 19 SEO. DNS verification and sitemap status. Every ALLOW_* flag you changed with its
  evidence. Open items listed as open.

FIVE ANSWERS ONLY THE GYM OWNER HAS. Surface these to Muhammad at handoff and again at launch,
and leave each slot marked rather than estimated:
  The day pass window. His live site publishes three different answers, and the figure it
  repeats twice, 9am to 9pm, matches nothing else it says. Sunday is staffed until 2pm.
  Somebody buys a pass and drives to a locked door until this is settled.
  Personal training rates and packages, published nowhere.
  Minimum age, and whether a parent must attend.
  Counts of platforms, racks and benches, the specialty bars by name, and the chalk policy.
  Whether Weekend Warrior tiers include 24/7 access within their three days.

Two trainers, Morghan King and Syon, have no photograph and render a placeholder. That needs a
camera, not code.
```

**PRODUCTION DOMAIN**:

**HOSTING PLATFORM (Netlify, Cloudflare Pages, or Vercel)**:

**MONGODB CONNECTION STRING**:
