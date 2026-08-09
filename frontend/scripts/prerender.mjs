/**
 * Writes the real page into every route shell, so the first response carries
 * the content instead of a promise to fetch it.
 *
 * Before this ran, `curl` on any public route returned 108 bytes of body: a
 * noscript line and an empty div. Titles, descriptions, canonicals and JSON-LD
 * were all correct and all describing a page with no text in it. Anything that
 * does not execute JavaScript, which includes several of the crawlers this site
 * now needs to be legible to, had nothing to read.
 *
 * How it works, in order:
 *
 *   1. Bundle src/App.js for node with the webpack and babel already installed
 *      for the browser build. No new dependency, no headless browser, no
 *      chromium download in someone's deploy pipeline.
 *   2. Fetch the three public endpoints the public pages read from, once.
 *   3. Render each route with react-dom/server against that data.
 *   4. Write the markup into the route's shell and the same data into a script
 *      tag, so the browser hydrates from what the server rendered from.
 *
 * This is not cloaking. The markup written here is what a visitor's browser
 * produces from the same data through the same components; there is no
 * crawler-only branch anywhere in it.
 *
 * Skipping is deliberate and loud. With no API to read, prerendering would bake
 * empty sections into every shell, which is worse than the shell it replaced
 * because it looks finished. No PRERENDER_API_URL means print why and leave the
 * shells alone.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const scriptDir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(scriptDir, '..');
const buildRoot = process.env.BUILD_DIR
  ? resolve(process.env.BUILD_DIR)
  : resolve(frontendRoot, 'build');
const ssrOut = resolve(scriptDir, 'ssr/.build');

const apiBase = (process.env.PRERENDER_API_URL || process.env.REACT_APP_BACKEND_URL || '')
  .trim()
  .replace(/\/+$/, '');

if (!apiBase) {
  console.log(
    '[prerender] skipped: no PRERENDER_API_URL or REACT_APP_BACKEND_URL.\n' +
    '[prerender] Route shells keep their metadata and stay body-empty.\n' +
    '[prerender] Set PRERENDER_API_URL to a reachable backend and rebuild to fill them.'
  );
  process.exit(0);
}

const registry = JSON.parse(
  await readFile(resolve(frontendRoot, 'src/seo/route-metadata.json'), 'utf8')
);

/* ---------------------------------------------------------------- the data */

const getJson = async (path) => {
  const url = `${apiBase}${path}`;
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`${response.status} from ${url}`);
  return response.json();
};

console.log(`[prerender] reading ${apiBase}`);

let content;
let team;
let postsIndex;
let postsHome;
try {
  [content, team, postsIndex, postsHome] = await Promise.all([
    getJson('/api/content'),
    getJson('/api/team'),
    getJson('/api/blog?limit=50'),
    getJson('/api/blog?limit=8'),
  ]);
} catch (error) {
  console.error(`[prerender] failed: ${error.message}`);
  console.error('[prerender] The backend must be running and seeded. Prerendering an');
  console.error('[prerender] empty database would publish empty pages that look finished.');
  process.exit(1);
}

const indexPosts = postsIndex.posts || [];
const homePosts = postsHome.posts || [];
console.log(
  `[prerender] ${Object.keys(content).length} content keys, ${team.length} team members, ${indexPosts.length} posts`
);

// Article bodies, one request each. The list endpoint returns excerpts, and an
// article page whose body arrives after mount is the exact problem this script
// exists to fix.
const articleRoutes = registry.routes.filter((route) => route.path.startsWith('/blog/'));
const articles = new Map();
for (const route of articleRoutes) {
  const slug = route.path.slice('/blog/'.length);
  try {
    articles.set(slug, await getJson(`/api/blog/post/${slug}`));
  } catch (error) {
    console.warn(`[prerender] no body for /blog/${slug}: ${error.message}`);
  }
}
console.log(`[prerender] ${articles.size}/${articleRoutes.length} article bodies`);

/** The data a given route actually reads. Shipping the rest would be dead weight. */
const payloadFor = (path) => {
  if (path === '/') return { content, postsHome: homePosts };
  if (path === '/blog') return { content, posts: indexPosts };
  if (path.startsWith('/blog/')) {
    const slug = path.slice('/blog/'.length);
    const post = articles.get(slug);
    return post ? { content, [`post:${slug}`]: post } : { content };
  }
  if (path === '/about' || path === '/personal-training') return { content, team };
  return { content };
};

/* ------------------------------------------------------------- the bundle */

const webpack = require('webpack');

console.log('[prerender] bundling the app for node');
await rm(ssrOut, { recursive: true, force: true });
await mkdir(ssrOut, { recursive: true });

const stats = await new Promise((done, fail) => {
  webpack(
    {
      mode: 'production',
      target: 'node',
      devtool: false,
      // Readable output builds faster and nothing ships it. This bundle is
      // deleted at the end of the run.
      optimization: { minimize: false },
      entry: resolve(scriptDir, 'ssr/entry.js'),
      output: {
        path: ssrOut,
        filename: 'ssr.cjs',
        library: { type: 'commonjs2' },
      },
      resolve: {
        extensions: ['.js', '.jsx', '.json'],
        alias: { '@': resolve(frontendRoot, 'src') },
      },
      module: {
        rules: [
          {
            test: /\.jsx?$/,
            exclude: /node_modules/,
            use: {
              loader: require.resolve('babel-loader'),
              options: {
                babelrc: false,
                configFile: false,
                presets: [
                  [require.resolve('@babel/preset-env'), { targets: { node: 'current' } }],
                  [require.resolve('@babel/preset-react'), { runtime: 'automatic' }],
                ],
                cacheDirectory: true,
              },
            },
          },
          {
            test: /\.css$/,
            use: require.resolve('./ssr/empty-module-loader.cjs'),
          },
          {
            test: /\.(png|jpe?g|gif|svg|webp|avif|woff2?|eot|ttf|otf)$/,
            type: 'asset/resource',
            generator: { emit: false, publicPath: '/static/media/', filename: '[name][ext]' },
          },
        ],
      },
      plugins: [
        new webpack.DefinePlugin({
          'process.env.NODE_ENV': JSON.stringify('production'),
        }),
      ],
      stats: 'errors-warnings',
    },
    (error, result) => (error ? fail(error) : done(result))
  );
});

if (stats.hasErrors()) {
  console.error(stats.toString({ colors: false, all: false, errors: true }));
  process.exit(1);
}

/* -------------------------------------------------------------- the render */

// DOMPurify binds to a window when it is imported and exposes nothing useful
// without one, so the article page's sanitize call is a no-op-shaped crash on
// node: "purify.sanitize is not a function", every article, no body rendered.
//
// The window goes up before the bundle is required, because that import is when
// DOMPurify decides. Sanitizing stays exactly where it is and keeps doing
// exactly what it does in a browser; the alternative, letting the prerender
// write CMS HTML straight into a file, would hand every no-JS reader and every
// crawler an unsanitized document. jsdom is a devDependency for this one line.
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: registry.site.origin + '/',
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
// node 21 and up define navigator themselves and define it getter-only, so a
// plain assignment throws. Node's own is close enough for anything rendering
// here; jsdom's only matters to code sniffing a user agent, and none does.
if (!('navigator' in globalThis)) globalThis.navigator = dom.window.navigator;
globalThis.Node = dom.window.Node;
globalThis.Element = dom.window.Element;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.DocumentFragment = dom.window.DocumentFragment;
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.matchMedia = dom.window.matchMedia || (() => ({
  matches: false, addEventListener() {}, removeEventListener() {},
  addListener() {}, removeListener() {},
}));

// A handful of modules read browser globals while rendering rather than in an
// effect: the auth context restores a session from localStorage, the blog index
// checks for a staff token. On the server those are all correctly "nothing
// stored", so an in-memory Storage that is always empty gives the same answer
// the real one would give a first-time visitor, which is the visitor a crawler
// is standing in for.
const memoryStorage = () => {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    clear: () => map.clear(),
    key: (index) => [...map.keys()][index] ?? null,
    get length() { return map.size; },
  };
};
globalThis.localStorage = memoryStorage();
globalThis.sessionStorage = memoryStorage();

const { render } = require(resolve(ssrOut, 'ssr.cjs'));

/** `</script>` inside JSON would close the tag it is sitting in. */
const embedJson = (value) =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

const shellPathFor = (routePath) =>
  routePath === '/'
    ? resolve(buildRoot, 'index.html')
    : resolve(buildRoot, `.${routePath}`, 'index.html');

const ROOT_DIV = /<div id="root">\s*<\/div>/;

let written = 0;
const failures = [];
const missingShells = [];

for (const route of registry.routes) {
  const shellPath = shellPathFor(route.path);
  if (!existsSync(shellPath)) {
    missingShells.push(route.path);
    continue;
  }

  let markup;
  try {
    markup = render(route.path, payloadFor(route.path));
  } catch (error) {
    failures.push(`${route.path}: ${error.message}`);
    continue;
  }

  let shell = await readFile(shellPath, 'utf8');
  if (!ROOT_DIV.test(shell)) {
    failures.push(`${route.path}: no empty #root to fill`);
    continue;
  }
  shell = shell.replace(ROOT_DIV, `<div id="root">${markup}</div>`);
  shell = shell.replace(
    '</body>',
    `<script id="scs-preload">window.__SCS_PRELOAD__=${embedJson(payloadFor(route.path))}</script>\n</body>`
  );
  await writeFile(shellPath, shell, 'utf8');
  written += 1;
}

await rm(ssrOut, { recursive: true, force: true });

if (missingShells.length) {
  console.warn(`[prerender] no shell for ${missingShells.length} route(s): ${missingShells.join(', ')}`);
}
if (failures.length) {
  console.error('[prerender] failed on:');
  for (const line of failures) console.error(`  ${line}`);
  process.exit(1);
}

console.log(`[prerender] ${written} routes rendered into their shells`);
