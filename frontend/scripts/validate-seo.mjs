import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(scriptDir, '..');
const registryText = await readFile(resolve(frontendRoot, 'src/seo/route-metadata.json'), 'utf8');
const postsText = await readFile(resolve(frontendRoot, 'src/seo/published-posts.json'), 'utf8');
const robots = await readFile(resolve(frontendRoot, 'public/robots.txt'), 'utf8');
const sitemap = await readFile(resolve(frontendRoot, 'public/sitemap.xml'), 'utf8');
const publicIndex = await readFile(resolve(frontendRoot, 'public/index.html'), 'utf8');
const appSource = await readFile(resolve(frontendRoot, 'src/App.js'), 'utf8');
const analyticsSource = await readFile(resolve(frontendRoot, 'src/utils/analytics.js'), 'utf8');

const registry = JSON.parse(registryText);
const posts = JSON.parse(postsText);
const failures = [];

const check = (condition, label) => {
  if (condition) console.log(`PASS ${label}`);
  else failures.push(label);
};

check(robots.startsWith('User-agent: *') && !/<html/i.test(robots), 'robots is plain crawl control');
check(robots.includes('Disallow: /staff/'), 'staff routes are disallowed');
check(robots.includes('Disallow: /thank-you'), 'thank-you is disallowed');
check(robots.includes('Disallow: /review/'), 'review utility is disallowed');

const sitemapLocations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const expectedLocations = registry.routes.filter((route) => route.indexable).map((route) => route.canonical);
check(sitemap.startsWith('<?xml version="1.0"') && sitemap.includes('<urlset'), 'sitemap is XML-shaped');
check(
  sitemapLocations.length === expectedLocations.length
    && expectedLocations.every((location) => sitemapLocations.includes(location)),
  `sitemap matches ${expectedLocations.length} indexable routes`
);
check(new Set(sitemapLocations).size === sitemapLocations.length, 'sitemap locations are unique');
// Every published post is in the sitemap unless it is consolidated into another
// post, in which case the winner carries it.
const orphanedPosts = posts.filter((post) => post.published).filter((post) => {
  const route = registry.routes.find((candidate) => candidate.path === `/blog/${post.slug}`);
  if (route?.consolidatedInto) return !sitemapLocations.includes(route.canonical);
  return !sitemapLocations.includes(`${registry.site.origin}/blog/${post.slug}`);
});
check(
  !orphanedPosts.length,
  `all published posts are in the sitemap or consolidated into one that is${orphanedPosts.length ? `: ${orphanedPosts.map((post) => post.slug).join(', ')}` : ''}`
);
// Compare a route's own URL, not its canonical. A consolidated duplicate points
// its canonical at the winner, which is legitimately in the sitemap.
check(
  registry.routes
    .filter((route) => !route.indexable)
    .every((route) => !sitemapLocations.includes(`${registry.site.origin}${route.path}`)),
  'no route excluded from indexing appears in sitemap'
);

// A cross canonical must land on a page that is itself indexable and canonical
// to itself, or the signal dead ends in a chain.
const consolidated = registry.routes.filter((route) => route.consolidatedInto);
const brokenConsolidations = consolidated.filter((route) => {
  const target = registry.routes.find((candidate) => candidate.path === route.consolidatedInto);
  return !target
    || !target.indexable
    || target.canonical !== `${registry.site.origin}${target.path}`
    || route.canonical !== target.canonical;
});
check(
  !brokenConsolidations.length,
  `every consolidated route canonicals to an indexable self-canonical page${brokenConsolidations.length ? `: ${brokenConsolidations.map((route) => route.path).join(', ')}` : ''}`
);
check(
  consolidated.every((route) => !/noindex/.test(route.robots || '')),
  'consolidated routes stay crawlable so the canonical can be read'
);

const indexable = registry.routes.filter((route) => route.indexable);
const overLongTitles = indexable.filter((route) => route.title.length > 60).map((route) => `${route.path} (${route.title.length})`);
const overLongDescriptions = indexable.filter((route) => route.description.length > 160).map((route) => `${route.path} (${route.description.length})`);
const missingH1 = registry.routes.filter((route) => !route.h1).map((route) => route.path);
const duplicate = (key) => {
  const counts = new Map();
  indexable.forEach((route) => counts.set(route[key], (counts.get(route[key]) || 0) + 1));
  return [...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value);
};
const duplicateTitles = duplicate('title');
const duplicateDescriptions = duplicate('description');

check(!overLongTitles.length, `every indexable title is 60 characters or fewer${overLongTitles.length ? `: ${overLongTitles.join(', ')}` : ''}`);
check(!overLongDescriptions.length, `every indexable description is 160 characters or fewer${overLongDescriptions.length ? `: ${overLongDescriptions.join(', ')}` : ''}`);
check(!duplicateTitles.length, `indexable titles are unique${duplicateTitles.length ? `: ${duplicateTitles.join(', ')}` : ''}`);
check(!duplicateDescriptions.length, `indexable descriptions are unique${duplicateDescriptions.length ? `: ${duplicateDescriptions.join(', ')}` : ''}`);
check(!missingH1.length, `every route records the heading its page renders${missingH1.length ? `: ${missingH1.join(', ')}` : ''}`);

// Social preview images are asserted by absolute URL, so a rename silently ships
// a broken card. Resolve every referenced asset back to a file on disk.
const referencedImages = [...publicIndex.matchAll(/(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*content=["']([^"']+)["']/g)]
  .map((match) => match[1]);
const brokenImages = [];
for (const url of referencedImages) {
  const path = url.replace(registry.site.origin, '');
  if (!existsSync(resolve(frontendRoot, `public${path}`))) brokenImages.push(url);
}
check(
  referencedImages.length > 0 && !brokenImages.length,
  `social preview images resolve to real files${brokenImages.length ? `: missing ${brokenImages.join(', ')}` : ''}`
);

check(publicIndex.includes('<link rel="canonical" href="https://santacruzstrength.com/"'), 'homepage has self-canonical');
check(publicIndex.includes('id="site-schema"'), 'homepage schema has a stable script identifier');

// public/index.html carries an inline copy of the homepage graph so the shell is
// correct before the build rewrites it. Two copies drift; this pins them together.
const homeSchema = JSON.parse(await readFile(resolve(frontendRoot, 'src/seo/home-schema.json'), 'utf8'));
const inlineSchemaText = publicIndex.match(/id="site-schema"[^>]*>([\s\S]*?)<\/script>/)?.[1];
let inlineSchema = null;
try {
  inlineSchema = JSON.parse(inlineSchemaText);
} catch {
  inlineSchema = null;
}
check(
  inlineSchema !== null && JSON.stringify(inlineSchema) === JSON.stringify(homeSchema),
  'inline homepage schema matches src/seo/home-schema.json'
);

const faqNode = homeSchema['@graph'].find((node) => node['@type'] === 'FAQPage');
check(
  faqNode?.mainEntity?.length > 0
    && faqNode.mainEntity.every((entry) => entry.name && entry.acceptedAnswer?.text),
  'homepage FAQ schema carries a question and answer for every entry'
);

// FAQ schema may only assert what the homepage actually renders. If the visible
// copy is edited and the schema is not, this fails rather than shipping a claim
// the page does not make.
const homeSource = await readFile(resolve(frontendRoot, 'src/pages/Home.js'), 'utf8');
const faqBlock = homeSource.match(/const FAQ_ITEMS = \[([\s\S]*?)\n\];/)?.[1] ?? '';
const renderedFaq = [...faqBlock.matchAll(/\bq:\s*'((?:[^'\\]|\\.)*)',\s*a:\s*'((?:[^'\\]|\\.)*)'/g)]
  .map((match) => [match[1], match[2]]);
const encodedFaq = (faqNode?.mainEntity ?? []).map((entry) => [entry.name, entry.acceptedAnswer.text]);
check(
  renderedFaq.length > 0 && JSON.stringify(renderedFaq) === JSON.stringify(encodedFaq),
  `homepage FAQ schema mirrors the questions the page renders (page ${renderedFaq.length}, schema ${encodedFaq.length})`
);
// Same rule for blog FAQ schema: it may only assert Q and A pairs the article
// actually renders. The pairs live in the backend article source, so read that
// rather than trust a hand-kept copy. If the source moves, this fails loudly
// instead of letting stale schema ship.
// Articles are split across backend/blog_articles*.py and the set grows, so glob
// rather than name one file. A new sibling is picked up with no edit here.
const backendDir = resolve(frontendRoot, '../backend');
const articleSourcePaths = existsSync(backendDir)
  ? (await readdir(backendDir))
    .filter((name) => /^blog_articles.*\.py$/.test(name))
    .map((name) => resolve(backendDir, name))
  : [];
const blogFaq = JSON.parse(await readFile(resolve(frontendRoot, 'src/seo/blog-faq.json'), 'utf8'));
const stripTags = (value) => value
  .replace(/<[^>]+>/g, '')
  .replaceAll('&amp;', '&')
  .replaceAll('&quot;', '"')
  .replaceAll('&#39;', "'")
  .replaceAll('&lt;', '<')
  .replaceAll('&gt;', '>')
  .trim();
const renderedBlogFaq = {};
for (const path of articleSourcePaths) {
  const articleSource = await readFile(path, 'utf8');
  const segments = articleSource.split(/'slug':\s*'([a-z0-9-]+)'/);
  for (let index = 1; index < segments.length; index += 2) {
    const body = segments[index + 1];
    const faqStart = body.indexOf('Frequently Asked Questions');
    if (faqStart < 0) continue;
    const pairs = [...body.slice(faqStart).matchAll(/<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g)]
      .map((match) => ({ question: stripTags(match[1]), answer: stripTags(match[2]) }))
      // A [FACT NEEDED] marker is an editorial note to the gym owner. It is
      // correct in prose, where a reader can see the site declining to guess,
      // and wrong in schema, where it becomes the machine readable answer an
      // answer engine quotes. Ten of these were being served as the canonical
      // answer to questions like whether chalk is allowed. Excluded on both
      // sides of the mirror, so the check keeps its teeth without enforcing
      // the leak it was previously enforcing.
      .filter((pair) => !pair.answer.includes('[FACT NEEDED'));
    if (pairs.length) renderedBlogFaq[segments[index]] = pairs;
  }
}
const blogFaqDrift = [...new Set([...Object.keys(blogFaq), ...Object.keys(renderedBlogFaq)])]
  .filter((slug) => JSON.stringify(blogFaq[slug]) !== JSON.stringify(renderedBlogFaq[slug]));
const encodedFaqPairs = Object.values(blogFaq).reduce((total, entries) => total + entries.length, 0);
check(
  articleSourcePaths.length > 0 && encodedFaqPairs > 0 && !blogFaqDrift.length,
  `blog FAQ schema mirrors the questions the articles render (${Object.keys(blogFaq).length} articles, ${encodedFaqPairs} pairs)${blogFaqDrift.length ? `: drifted on ${blogFaqDrift.join(', ')}` : ''}`
);
// A FAQ block may only be encoded for a page a crawler is allowed to index.
const faqOnNonIndexable = Object.keys(blogFaq).filter((slug) => {
  const route = registry.routes.find((candidate) => candidate.path === `/blog/${slug}`);
  return !route || !route.indexable;
});
check(
  !faqOnNonIndexable.length,
  `blog FAQ schema is only encoded for indexable articles${faqOnNonIndexable.length ? `: ${faqOnNonIndexable.join(', ')}` : ''}`
);

// Structured data is written into the built shells, not the sources, so this is
// the only place it can be checked. Skipped when no build exists, because the
// validator is also run standalone before one has been produced.
//
// This exists because every indexable page except the homepage and the articles
// shipped with no JSON-LD at all, and nothing noticed. The client side injectors
// that used to carry a breadcrumb were removed in favour of build time tags, and
// the generator only ever emitted for two of the three route families.
const buildDir = resolve(frontendRoot, 'build');
if (existsSync(buildDir)) {
  const shellless = [];
  for (const route of registry.routes.filter((candidate) => candidate.indexable)) {
    const shell = resolve(buildDir, route.path === '/' ? 'index.html' : `${route.path.slice(1)}/index.html`);
    if (!existsSync(shell)) { shellless.push(`${route.path} (no shell)`); continue; }
    if (!(await readFile(shell, 'utf8')).includes('application/ld+json')) shellless.push(route.path);
  }
  check(
    !shellless.length,
    `every indexable route ships structured data${shellless.length ? `: missing on ${shellless.join(', ')}` : ` (${registry.routes.filter((r) => r.indexable).length} routes)`}`,
  );
}

check(!publicIndex.includes('openingHoursSpecification'), 'schema omits unverified hours');
check(appSource.includes('<RouteSeo />'), 'route SEO manager is mounted');
check(appSource.includes('<Route path="*" element={<NotFound />} />'), 'client fallback is a real not-found view');
check(analyticsSource.includes("gtag('event', 'page_view'"), 'page views use explicit GA4 events');
check(!analyticsSource.includes("fbq('track', 'Schedule'"), 'tour CTA clicks are not counted as completed schedules');

const textExtensions = /\.(js|jsx|json|html|css|md|xml|txt)$/i;
const textFiles = [];
const ignored = new Set(['node_modules', 'build', '.git']);
const walk = async (directory) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (textExtensions.test(entry.name)) textFiles.push(path);
  }
};
await walk(frontendRoot);
// One exemption, and only one. src/config/testimonials.js holds member quotes
// transcribed verbatim from the live site, and two of them contain an em dash.
// The no-dash rule governs copy this project writes. Editing the punctuation
// out of a real customer's sentence to satisfy our own house style would be
// altering a published review, which is a worse problem than the one the rule
// exists to prevent.
const DASH_EXEMPT = new Set(['src/config/testimonials.js']);
const dashFiles = [];
for (const path of textFiles) {
  const relative = path.slice(frontendRoot.length + 1);
  if (DASH_EXEMPT.has(relative)) continue;
  // Tournament candidates carry design documentation in markdown. That prose is
  // never rendered to a visitor, so the shipped-copy rule does not reach it.
  // Their .js is still scanned, because that does ship.
  if (relative.startsWith('src/tournament/') && relative.endsWith('.md')) continue;
  const text = await readFile(path, 'utf8');
  if (/[\u2013\u2014]/u.test(text)) dashFiles.push(relative);
}
check(!dashFiles.length, `no en dash or em dash characters${dashFiles.length ? `: ${dashFiles.join(', ')}` : ''}`);
// That check scans for the literal characters, which Join.js sidestepped by
// writing them as \u2013 escapes: invisible to the scan, rendered as en dashes by
// the browser. Four shipped on the membership page while the check passed.
// Only string literals count. Several pages carry the same escape inside a
// character class, in the regexes that strip dashes out of API copy, and those
// are the fix rather than the defect.
const escapedDashFiles = [];
for (const path of textFiles) {
  // Drop the dash-stripping character class first. Several pages sanitise API
  // copy with /[\u2013\u2014]/g, which necessarily contains the escape and is
  // the remedy rather than the defect. Whatever escape survives that removal is
  // an escape somebody typed into content.
  const text = (await readFile(path, 'utf8')).replaceAll('[\\u2013\\u2014]', '');
  if (/\\u201[34]/.test(text)) escapedDashFiles.push(path.slice(frontendRoot.length + 1));
}
check(!escapedDashFiles.length, `no escaped en dash or em dash sequences${escapedDashFiles.length ? `: ${escapedDashFiles.join(', ')}` : ''}`);

if (failures.length) {
  console.error('\nSEO VALIDATION FAILED');
  failures.forEach((failure) => console.error(`FAIL ${failure}`));
  process.exitCode = 1;
} else {
  console.log('\nSEO VALIDATION PASSED');
}
