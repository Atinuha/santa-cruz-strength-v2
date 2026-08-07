import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(scriptDir, '..');
const buildRoot = process.env.BUILD_DIR
  ? resolve(process.env.BUILD_DIR)
  : resolve(frontendRoot, 'build');
const registry = JSON.parse(
  await readFile(resolve(frontendRoot, 'src/seo/route-metadata.json'), 'utf8')
);
const homeSchema = JSON.parse(
  await readFile(resolve(frontendRoot, 'src/seo/home-schema.json'), 'utf8')
);
const template = await readFile(resolve(buildRoot, 'index.html'), 'utf8');

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('"', '&quot;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

const replaceOrInsert = (html, expression, replacement) => {
  if (expression.test(html)) return html.replace(expression, replacement);
  return html.replace('</head>', `    ${replacement}\n</head>`);
};

const renderHead = (metadata) => {
  const robots = metadata.robots || registry.site.defaultRobots;
  const canonical = metadata.canonical || '';
  const pageType = metadata.path.startsWith('/blog/') ? 'article' : 'website';
  let html = template;

  html = replaceOrInsert(html, /<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(metadata.title)}</title>`);
  html = replaceOrInsert(
    html,
    /<meta[^>]+name=["']description["'][^>]*>/i,
    `<meta name="description" content="${escapeHtml(metadata.description)}" />`
  );
  html = replaceOrInsert(
    html,
    /<meta[^>]+name=["']robots["'][^>]*>/i,
    `<meta name="robots" content="${escapeHtml(robots)}" />`
  );
  html = replaceOrInsert(
    html,
    /<meta[^>]+property=["']og:title["'][^>]*>/i,
    `<meta property="og:title" content="${escapeHtml(metadata.title)}" />`
  );
  html = replaceOrInsert(
    html,
    /<meta[^>]+property=["']og:description["'][^>]*>/i,
    `<meta property="og:description" content="${escapeHtml(metadata.description)}" />`
  );
  html = replaceOrInsert(
    html,
    /<meta[^>]+property=["']og:url["'][^>]*>/i,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`
  );
  html = replaceOrInsert(
    html,
    /<meta[^>]+property=["']og:type["'][^>]*>/i,
    `<meta property="og:type" content="${pageType}" />`
  );
  html = replaceOrInsert(
    html,
    /<meta[^>]+name=["']twitter:title["'][^>]*>/i,
    `<meta name="twitter:title" content="${escapeHtml(metadata.title)}" />`
  );
  html = replaceOrInsert(
    html,
    /<meta[^>]+name=["']twitter:description["'][^>]*>/i,
    `<meta name="twitter:description" content="${escapeHtml(metadata.description)}" />`
  );

  html = html.replace(/<link[^>]+rel=["']canonical["'][^>]*>\s*/gi, '');
  if (canonical) {
    html = html.replace('</head>', `    <link rel="canonical" href="${escapeHtml(canonical)}" />\n</head>`);
  }

  html = html.replace(/<script[^>]+id=["']site-schema["'][^>]*>[\s\S]*?<\/script>\s*/gi, '');
  if (metadata.path === '/') {
    html = html.replace(
      '</head>',
      `    <script id="site-schema" type="application/ld+json">${JSON.stringify(homeSchema)}</script>\n</head>`
    );
  }

  return html;
};

for (const route of registry.routes) {
  if (route.path === '/') {
    await writeFile(resolve(buildRoot, 'index.html'), renderHead(route), 'utf8');
    continue;
  }

  const targetDir = resolve(buildRoot, route.path.slice(1));
  await mkdir(targetDir, { recursive: true });
  await writeFile(resolve(targetDir, 'index.html'), renderHead(route), 'utf8');
}

if (process.env.REACT_APP_PREVIEW_MODE === 'true') {
  const reviewPreview = {
    path: '/review/preview-token',
    title: 'Review Preview | Santa Cruz Strength',
    description: 'Preview the Santa Cruz Strength member feedback experience without submitting information.',
    canonical: null,
    robots: 'noindex,nofollow',
  };
  const previewDir = resolve(buildRoot, 'review/preview-token');
  await mkdir(previewDir, { recursive: true });
  await writeFile(resolve(previewDir, 'index.html'), renderHead(reviewPreview), 'utf8');
}

const notFound = {
  path: '/404',
  title: 'Page Not Found | Santa Cruz Strength',
  description: 'The requested Santa Cruz Strength page could not be found.',
  canonical: null,
  robots: 'noindex,nofollow',
};
await writeFile(resolve(buildRoot, '404.html'), renderHead(notFound), 'utf8');
const previewMessage = process.env.REACT_APP_PREVIEW_MODE === 'true' ? ', review preview shell' : '';
console.log(`Generated route-specific head shells for ${registry.routes.length} routes${previewMessage} plus 404.html.`);
