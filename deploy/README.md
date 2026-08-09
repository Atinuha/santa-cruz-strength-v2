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

Vercel serves static files before applying rewrites, and it serves `404.html`
with a genuine 404 status for unmatched paths automatically, so the file only
needs to declare the three rewrites that must return 200.

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
