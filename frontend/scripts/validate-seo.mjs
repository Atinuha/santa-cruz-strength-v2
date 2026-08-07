import { readFile, readdir } from 'node:fs/promises';
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
check(
  posts.filter((post) => post.published).every((post) => sitemapLocations.includes(`${registry.site.origin}/blog/${post.slug}`)),
  'all published posts appear in sitemap'
);
check(
  registry.routes.filter((route) => !route.indexable).every((route) => !sitemapLocations.includes(route.canonical)),
  'no noindex route appears in sitemap'
);

check(publicIndex.includes('<link rel="canonical" href="https://santacruzstrength.com/"'), 'homepage has self-canonical');
check(publicIndex.includes('id="site-schema"'), 'homepage schema has a stable script identifier');
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
const dashFiles = [];
for (const path of textFiles) {
  const text = await readFile(path, 'utf8');
  if (/[\u2013\u2014]/u.test(text)) dashFiles.push(path.slice(frontendRoot.length + 1));
}
check(!dashFiles.length, `no en dash or em dash characters${dashFiles.length ? `: ${dashFiles.join(', ')}` : ''}`);

if (failures.length) {
  console.error('\nSEO VALIDATION FAILED');
  failures.forEach((failure) => console.error(`FAIL ${failure}`));
  process.exitCode = 1;
} else {
  console.log('\nSEO VALIDATION PASSED');
}
