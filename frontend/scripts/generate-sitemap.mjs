import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(scriptDir, '..');
const registry = JSON.parse(
  await readFile(resolve(frontendRoot, 'src/seo/route-metadata.json'), 'utf8')
);
const posts = JSON.parse(
  await readFile(resolve(frontendRoot, 'src/seo/published-posts.json'), 'utf8')
);

const publishedPosts = new Map(
  posts
    .filter((post) => post.published)
    .map((post) => [`/blog/${post.slug}`, post])
);

const entries = registry.routes
  .filter((route) => route.indexable)
  .map((route) => ({
    loc: route.canonical,
    lastModified: publishedPosts.get(route.path)?.lastModified || null,
  }));

const missingPosts = [...publishedPosts.keys()].filter(
  (path) => !registry.routes.some((route) => route.path === path && route.indexable)
);

if (missingPosts.length) {
  throw new Error(`Published posts missing from route metadata: ${missingPosts.join(', ')}`);
}

const escapeXml = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

const rows = entries.map(({ loc, lastModified }) => {
  if (!lastModified) return `  <url><loc>${escapeXml(loc)}</loc></url>`;
  return [
    '  <url>',
    `    <loc>${escapeXml(loc)}</loc>`,
    `    <lastmod>${escapeXml(lastModified)}</lastmod>`,
    '  </url>',
  ].join('\n');
});

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...rows,
  '</urlset>',
  '',
].join('\n');

await writeFile(resolve(frontendRoot, 'public/sitemap.xml'), xml, 'utf8');
console.log(`Generated sitemap with ${entries.length} canonical URLs.`);
