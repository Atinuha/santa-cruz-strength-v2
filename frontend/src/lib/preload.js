/**
 * Data captured once at build time so the first paint already has real copy.
 *
 * Every public page on this site reads its words from the CMS: About reads
 * about_story, Home reads its hero and its three recent posts, an article reads
 * its own body. All of it arrives after mount, which means the initial HTML
 * carried a spinner or an empty section, and a crawler that does not run
 * JavaScript saw exactly that.
 *
 * scripts/prerender.mjs fetches those three endpoints once, renders every route
 * against them with react-dom/server, and writes the result into each route
 * shell alongside a script tag holding the same payload. The browser then
 * hydrates against markup it can reproduce exactly, because it starts from the
 * same data the server rendered from.
 *
 * The payload is public API output and nothing else. It is the same JSON any
 * visitor can request from /api/content, /api/team and /api/blog, so nothing
 * private is being pushed into a static file. Anything staff-only stays behind
 * the API where it already is.
 *
 * Stale data is the tradeoff and it is bounded: the client still fetches on
 * mount and replaces this with whatever the CMS says now. The preload decides
 * the first frame, not the page.
 */

const store = () => {
  if (typeof globalThis === 'undefined') return null;
  const value = globalThis.__SCS_PRELOAD__;
  return value && typeof value === 'object' ? value : null;
};

/** Returns the prerendered value for `key`, or `fallback` when there is none. */
export function preloaded(key, fallback = null) {
  const source = store();
  if (!source) return fallback;
  const value = source[key];
  return value === undefined || value === null ? fallback : value;
}

/** True when `key` was captured, so a page can start with loading already false. */
export function hasPreloaded(key) {
  const source = store();
  if (!source) return false;
  const value = source[key];
  return value !== undefined && value !== null;
}
