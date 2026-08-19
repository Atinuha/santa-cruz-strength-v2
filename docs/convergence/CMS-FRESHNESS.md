# Publishing in the CRM does not change the live site

The public pages are prerendered to static HTML at build time. That is what put
the copy, the prices and the article bodies into the first response instead of
leaving them behind a fetch, and it is why a crawler that runs no JavaScript can
read this site at all.

The cost is a gap that is invisible from inside the CRM: **the served HTML is a
photograph of the database taken when the site was last built.** Saving a change
moves the database. It does not move the photograph.

Nothing errors. The CRM shows the new value, the site keeps serving the old one,
and the JSON-LD keeps asserting the old one to Google, for as long as it takes
somebody to compare the two by hand.

## What is affected

Everything a public page reads from the database:

| Surface | Where it shows | What goes stale |
|---|---|---|
| `site_content` | homepage copy, About story, access statement | visible copy, and the CMS-driven parts of the entity definition |
| `blog_post` | article bodies, the blog index, the sitemap | article text, the index, `BlogPosting` and `FAQPage` schema |
| `team_member` | About team grid, coaches on `/personal-training` | names, roles, bios, photographs |
| `event` | `/events` | the whole page |

Membership prices and terms are not in this table, because they are not in the
database. They live in `frontend/src/pages/Join.js`, so changing them is a code
change and a rebuild happens by definition. The `OfferCatalog` schema is
generated from the same source at build time, so the page and the structured
data cannot disagree.

## The automatic path, preferred

Every endpoint that writes one of those four surfaces calls
`notify_public_content_changed()` after the write commits.
`backend/deploy_hook.py` turns that into a POST to your host's build hook.

Two settings, both required:

```
ALLOW_DEPLOY_HOOK=true
DEPLOY_HOOK_URL=<your host's build hook URL>
```

Off by default, like every other outbound capability in this codebase. Holding a
URL that triggers a production build is not by itself permission to trigger one.

Where the URL comes from:

- **Netlify** — Site settings, Build & deploy, Build hooks, Add build hook
- **Cloudflare Pages** — the project's Settings, Builds & deployments, Deploy hooks
- **Vercel** — Settings, Git, Deploy Hooks

Three properties worth knowing, because they decide what happens on a bad day:

- **It never blocks the response.** The staff member's save is already done.
- **It never raises.** A dead hook is logged, the write stands. The write is the
  source of truth; the rebuild is a consequence of it, not a condition on it.
- **The build then has to succeed.** The prerender fails closed, so a rebuild
  fired against a backend that is down or unseeded stops rather than replacing
  a good site with an empty one. The old site stays up. Check the build log.

Confirm it is armed: `GET /api/health` reports `"deploy_hook": true` in the
runtime summary, and every publish writes a `[DEPLOY]` line to the backend log.

## The fallback, if no hook is configured

The staff UI carries a standing notice on all four managers, Content, Blog, Team
and Events:

> **Saving is not publishing.** The public site is built as static pages, so
> changes appear on santacruzstrength.com after the next site build, not
> immediately.

With the flag off, every public write still logs:

```
[DEPLOY] site_content changed (key home_definition_access). Static HTML is now
stale until the next build.
```

That line is the record that the served HTML is behind the database, so a stale
page can be explained after the fact rather than investigated as a bug.

The notice stays visible even when the hook is armed. A hook that silently
stopped firing would otherwise look exactly like a hook that is working.

## Rebuilding by hand

```
cd frontend
REACT_APP_BACKEND_URL=<api> PRERENDER_API_URL=<api> yarn build
```

A build that worked prints, last:

```
[prerender] 38 routes rendered into their shells
```

Anything else, do not deploy the output.

## Adding a new public surface

If you add a page that reads from the database, or a new field to one that does:

1. Add the surface name to `PUBLIC_SURFACES` in `backend/deploy_hook.py`.
2. Call `notify_public_content_changed('<surface>', '<detail>')` after each
   write commits, never before: a rebuild fired ahead of a write that then fails
   publishes the old content and reports success.
3. Add the endpoint to `PUBLIC_WRITE_ENDPOINTS` in
   `backend/tests/test_deploy_hook_coverage.py`.

That test fails when a public-write endpoint has no rebuild behind it, which is
the moment nobody would think to add one.
