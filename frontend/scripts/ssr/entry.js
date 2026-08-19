/**
 * The server half of the app. Bundled for node by scripts/prerender.mjs and
 * called once per route to turn a URL into HTML.
 *
 * It imports the same AppRoutes the browser mounts, so there is exactly one
 * route table and one set of components. Nothing here is written for crawlers:
 * the markup this produces is the markup a visitor's browser would produce from
 * the same data, which is the whole point. A separate crawler-only rendering
 * path would be cloaking.
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { AppRoutes } from '../../src/App';

/**
 * Renders `location` with `preload` visible to the components as the same
 * global the browser reads, so both sides render from identical data and
 * hydration has nothing to disagree about.
 */
export function render(location, preload) {
  globalThis.__SCS_PRELOAD__ = preload || {};
  try {
    return renderToString(
      React.createElement(
        StaticRouter,
        { location },
        React.createElement(AppRoutes)
      )
    );
  } finally {
    delete globalThis.__SCS_PRELOAD__;
  }
}
