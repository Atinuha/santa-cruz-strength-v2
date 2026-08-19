# Finish Santa Cruz Strength:

```
Your deploy is one setting away from complete. The blog is empty and the About page shows fallback copy for a single reason: the database seed never ran. Blog posts, About copy and the team all come from one seeded load, gated behind two flags, and without them the backend starts clean and serves empty states that look like missing code. Nothing is missing from the repository. Fix the flags, reboot, then prove every number below rather than assuming it.

STEP 1, SET AND REBOOT
  ALLOW_DATABASE_WRITES=true
  ALLOW_SEEDING=true
  Restart the backend. A healthy boot logs three lines. Read them:
    [SEED] Seeded 33 new site content keys
    [SEED] Created 7 team members
    [SEED] Seeded 27 blog posts
  Three lines, those numbers. Anything less means the seed is still gated; fix that before
  continuing, because every check below depends on it.

STEP 2, PROVE THE DATA. Three commands, three numbers.
  curl -s <api>/api/blog?limit=50 | grep -o '"slug"' | wc -l          expect 27
  curl -s <api>/api/team | grep -o '"name"' | wc -l                   expect 7
  curl -s <api>/api/content | grep -c "over 13 years"                 expect 1

  That last one is the About page. It proves the owner's real story loaded rather than the
  fallback string. If it returns 0 the About page will read as generic copy no matter how the
  frontend looks.

STEP 3, PROVE THE PAGES. Loop, do not click.
  for p in "" about join contact personal-training events blog local-wellness privacy terms; do
    echo "$p $(curl -s -o /dev/null -w '%{http_code}' https://<domain>/$p)"
  done
  Ten routes, ten 200s. Then four articles:
    /blog/gym-day-pass-santa-cruz  /blog/first-powerlifting-meet-guide
    /blog/women-strength-training-santa-cruz  /blog/return-to-lifting-after-injury

  Then open exactly three in a real browser and confirm text renders: the homepage, /about, and
  one article. A 200 with a blank body has shipped twice on this project, so a status code
  settles routing and a human eye settles rendering. Three pages is enough; the loop covers the
  rest.

  The blog index links 26 while all 27 resolve. That gap is deliberate: one article is a
  consolidated duplicate. It stays reachable and keeps its full text, with a canonical pointing
  at the article that supersedes it, and the index does not link it because a canonical pointing
  one way while the site links the other is a contradiction. Count 26 on the index and treat it
  as correct.

STEP 4, PROVE THE FUNNEL. This is the only thing on the site that makes money.
  Submit the tour form at /contact with real-looking data, land on /thank-you, then resubmit the
  same email through /api/v1/leads with a fresh request_id. A response carrying "duplicate":true
  proves the first one persisted. Anything else means leads are being lost silently, which
  outranks every other item here.

STEP 5, KEEP IT FAST
  The build ships one JS bundle near 268 kB gzipped and one CSS near 20 kB. Fonts are self
  hosted and preloaded, images are local, and analytics stays inert until consent. Serve the
  build directory as static files behind the host rule in deploy/ and it stays fast on its own.
  Preserve that by adding nothing: no CDN font link, no tag manager, no analytics beyond the
  gated GA4, no image host. Every one of those trades speed for something this site does not
  need.

  Confirm once with a Lighthouse run on the homepage and report Performance and Accessibility.

STEP 6, REPORT IN TEN LINES
  The three seed numbers. The three data counts. The route loop output. The funnel result. The
  Lighthouse pair. Then anything still open, named plainly.

WORK CHEAPLY, IT IS PART OF THE JOB
  Verify by counting, not by reading. Every check above is a command whose output is the proof,
  which is why none of them require opening a source file. Reach for the code only when a number
  comes back wrong, and then read only the file that number points at. Trust the repository:
  154 backend tests, 68 frontend, 19 SEO checks all pass on a fresh clone, so a failure here is
  configuration rather than code, and configuration is where to look first.
```

**API BASE URL**:

**PRODUCTION DOMAIN**:
