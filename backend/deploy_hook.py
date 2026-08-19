"""Tell the host to rebuild when public content changes.

The public pages of this site are prerendered to static HTML at build time.
That is what put the copy, the prices and the article bodies into the first
response instead of leaving them behind a fetch. It also means the served HTML
is a photograph of the database taken at build time, and photographs do not
update themselves.

So publishing in the CRM is now a build-affecting act. Change the day pass
price, correct the hours, publish an article, add a coach: the database moves
and the HTML does not. The staff member sees their change in the CRM, the
public site keeps showing the old value, and the JSON-LD keeps asserting the old
price to Google. Nobody notices, because nothing is broken.

This module closes that gap. Every endpoint that writes something the public
pages render calls notify_public_content_changed() after the write succeeds.

Three properties worth keeping:

  It never blocks the response. The staff member's save is done; a slow or dead
  deploy hook must not make saving feel broken or fail a request that already
  committed.

  It never raises. A failed hook is logged and the write stands. The write is
  the source of truth and the rebuild is a consequence of it, not a condition
  on it.

  It is off by default. ALLOW_DEPLOY_HOOK and DEPLOY_HOOK_URL must both be set,
  because holding a URL that triggers a production build is not by itself
  permission to trigger one. With the flag off this records the intent in the
  log and the staff UI carries the standing warning that publishing requires a
  rebuild, which is the documented fallback.
"""

import asyncio
import logging
import os
from typing import Optional

try:
    from runtime_safety import ALLOW_DEPLOY_HOOK
except ImportError:
    from .runtime_safety import ALLOW_DEPLOY_HOOK

logger = logging.getLogger(__name__)

# Every field on this list is rendered into static HTML or into the structured
# data derived from it. Anything added to the public pages that reads from the
# database belongs here too.
PUBLIC_SURFACES = {
    'site_content',   # homepage copy, About story, hours and access statements
    'blog_post',      # article bodies, the index, and the sitemap
    'team_member',    # the About team grid and the coaches on /personal-training
    'event',          # /events
}


def _hook_url() -> Optional[str]:
    value = (os.environ.get('DEPLOY_HOOK_URL') or '').strip()
    return value or None


async def _post(url: str, surface: str, detail: str) -> None:
    try:
        import httpx
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json={'surface': surface, 'detail': detail})
        if response.status_code >= 400:
            logger.warning(
                '[DEPLOY] hook returned status=%s for surface=%s',
                response.status_code,
                surface,
            )
        else:
            logger.info('[DEPLOY] rebuild requested for surface=%s', surface)
    except Exception:  # noqa: BLE001 - a failed rebuild must not undo a saved edit
        # Provider exceptions can contain the hook URL, credentials, or request
        # payload. The public-content write has already succeeded, so record only
        # the fixed operational failure and never the exception text.
        logger.warning('[DEPLOY] hook request failed; saved content remains authoritative')


def notify_public_content_changed(surface: str, detail: str = '') -> None:
    """Request a rebuild because `surface` changed. Returns immediately.

    Call after the write has committed, never before: a rebuild triggered ahead
    of a write that then fails would publish the old content and report success.
    """
    if surface not in PUBLIC_SURFACES:
        logger.warning('[DEPLOY] unknown public surface; rebuild not requested')
        return

    url = _hook_url()
    if not ALLOW_DEPLOY_HOOK or not url:
        # The fallback path, and the common one until a hook is configured. The
        # log line is the record that the served HTML is now behind the
        # database, so a stale page can be explained after the fact rather than
        # investigated as a bug.
        logger.info(
            '[DEPLOY] surface=%s changed. Static HTML is now stale until the next build. '
            'Set ALLOW_DEPLOY_HOOK=true and DEPLOY_HOOK_URL to automate this.',
            surface,
        )
        return

    try:
        asyncio.get_running_loop().create_task(_post(url, surface, detail))
    except RuntimeError:
        # No loop, which means this was called from synchronous context. Log
        # rather than block; the standing warning in the staff UI still applies.
        logger.info(
            '[DEPLOY] surface=%s changed outside an event loop; rebuild not requested',
            surface,
        )
