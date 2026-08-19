# Host rules for a real 404

The handoff told a deployer that these configurations already existed. They did
not. An acceptance test on a fresh clone caught it, and this directory is the
fix.

## Why this matters more than it looks

A single page app served by a naive static host answers every path with the
index shell and HTTP 200. That is a soft 404, and it has three consequences
here, in descending order of cost:

Google Search Console rejects a sitemap submitted by a site that returns 200
for a URL that does not exist, and the site gets mis-indexed. The handoff calls
this a prerequisite, not a polish item, and it is right.

Two route families in this app are client only and have no prerendered
directory: `/staff/*` and `/review/*`. If the host serves its own generic 404
for unmatched paths instead of following the rule below, a staff member who
bookmarks or refreshes `/staff/dashboard` is locked out of the CRM entirely,
and every review link at `/review/<token>` is dead. The public site looks
perfect while both of those are broken, which is why it needs testing by hand.

## The rule, in order

1. Serve static files first.
2. Rewrite only `/staff/*`, `/review/*` and `/implementation-preview` to
   `/index.html` with status 200.
3. Send everything else to `/404.html` with a genuine 404 status.

The build already produces `404.html`, and it boots the full SPA bundle, so a
visitor who lands on it still gets a working site with navigation.

## Pick one, move it, delete the rest

Only one of these belongs in a given deployment. They are kept out of the build
directory deliberately, because shipping a Netlify file to Vercel is confusing
rather than harmless.

### Netlify

Copy `netlify/_redirects` to `frontend/public/_redirects` before building.
Create React App copies `public/` verbatim into `build/`, which is where
Netlify expects to find it.

### Cloudflare Pages

Same file, same place. Cloudflare Pages reads `_redirects` with the same syntax
as Netlify. Copy `netlify/_redirects` to `frontend/public/_redirects`.

### Vercel

Copy `vercel/vercel.json` to the repository root. Do not put it in `public/`.

Vercel serves static files before applying rewrites, so the file only needs to
declare the three rewrites that must return 200. Read the next section before
you deploy: half of that reasoning is confirmed and half is an assumption.

### One unverified assumption on Vercel, and why it matters

The Vercel config declares only the three rewrites that must return 200. It
assumes Vercel serves `404.html` with a genuine 404 status for unmatched paths
by itself. Two things about that.

The first half is confirmed by Vercel's own reference, which states it twice:
the filesystem takes precedence over rewrites, so static files and the 39
prerendered shells are served before any rule here is consulted. That part is
solid.

The second half, that unmatched paths automatically get `404.html` with a 404
status, is not stated in Vercel's documentation. It is very likely true for a
plain static output like this one, but it is not verified and it cannot be
without deploying. Treat the first curl in the block below as the test that
decides it.

If it turns out false, DO NOT reach for another rewrite. A rewrite always
returns 200; that is exactly what separates it from a redirect, so adding one
cannot produce a 404 and you will conclude Vercel is broken when it is not.
Serving a file with a 404 status on Vercel requires the legacy `routes`
property with an explicit `"status": 404`, and `routes` switches off all the
default routing behaviour including the filesystem precedence above. It is a
different configuration shape, not a line you add. Budget for that rather than
discovering it at two in the morning.

## Verify it, do not assume it

After deploying, run all four of these. Three of them pass on a broken
configuration, so the first one is the one that actually tests the rule:

    curl -I https://<domain>/this-path-does-not-exist
    expect: HTTP/2 404

    curl -I https://<domain>/staff/dashboard
    expect: HTTP/2 200

    curl -I https://<domain>/review/anything
    expect: HTTP/2 200

    curl -I https://<domain>/about
    expect: HTTP/2 200

Then open `/staff/dashboard` directly in a fresh tab, not by clicking through
from the homepage, and confirm the app boots. Client side navigation hides this
failure completely: it only appears on a cold load or a refresh.

## What changed in the SXO pass, and why the files moved

Three things were added to every host config. Each one closes a hole that was
open, not a preference.

### 1. Permanent redirects, ahead of the rewrites

```
/blog/why-surfers-in-santa-cruz-should-lift-weights  ->  /blog/strength-training-for-surfers-santa-cruz
/blog/how-many-days-a-week-should-a-beginner-lift    ->  /blog/how-many-days-a-week-should-you-lift
```

The first is a live, indexed URL whose replacement genuinely supersedes it: same
category, same tags, every heading covered, plus injury prevention and an FAQ.
The second never went live and exists only so that anything which linked it
during the rebuild lands on the article rather than a 404.

Order matters. A 301 that sits below a 200 rewrite never runs.

Both destinations are also reachable directly, and the source URLs still have a
shell carrying a cross canonical. That is deliberate belt and braces: if the
redirect is ever missing, the page degrades to a canonical rather than a 404 on
a URL Google already has.

### 2. `/staff/*` and `/review/*` rewrite to `app-shell.html`, not `index.html`

`index.html` is the homepage. Serving it for those paths handed a cold load of
`/staff/login` the homepage's `robots` directive, `index,follow`, and the
homepage's canonical. robots.txt disallowed the path, but robots.txt controls
crawling rather than indexing, and a disallowed URL can still be indexed from an
external link precisely because the crawler is not allowed in to read the
noindex it contains.

`app-shell.html` is generated by the same build step as every other shell and
carries `noindex,nofollow` with no canonical. The app boots from it identically.

### 3. `X-Robots-Tag` headers on the same paths

`deploy/netlify/_headers` for Netlify and Cloudflare Pages, the `headers` block
in `vercel.json` for Vercel. This says the same thing as the shell, at the
header level, so neither mechanism is the only one.

Copy `_headers` next to `_redirects` into `frontend/public/` before building.

## Prove it after deploying

```
curl -I https://<domain>/nothing-here                                    404
curl -I https://<domain>/staff/dashboard                                 200
curl -I https://<domain>/staff/login | grep -i x-robots-tag              noindex
curl -sI https://<domain>/blog/why-surfers-in-santa-cruz-should-lift-weights
                                                                         301
curl -I https://<domain>/                | grep -i x-robots-tag          nothing
```

The last one is the important negative. A staging `noindex` header that survives
the cutover deindexes the whole site, and nothing in this repository can remove
a header the host is adding.
