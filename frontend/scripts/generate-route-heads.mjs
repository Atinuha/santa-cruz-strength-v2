import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
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
const posts = JSON.parse(
  await readFile(resolve(frontendRoot, 'src/seo/published-posts.json'), 'utf8')
);
const blogFaq = JSON.parse(
  await readFile(resolve(frontendRoot, 'src/seo/blog-faq.json'), 'utf8')
);
const template = await readFile(resolve(buildRoot, 'index.html'), 'utf8');

const lastModifiedBySlug = new Map(
  posts.filter((post) => post.published).map((post) => [post.slug, post.lastModified])
);

// Article schema for blog posts. Only properties evidenced by the page or the
// published-post record are encoded. datePublished, author and article image are
// deliberately absent: none of the three is known at build time, and an invented
// value is worse than an omitted one.
const buildArticleGraph = (route) => {
  const slug = route.path.slice('/blog/'.length);
  const lastModified = lastModifiedBySlug.get(slug);
  const article = {
    '@type': 'BlogPosting',
    '@id': `${route.canonical}#article`,
    headline: route.h1 || route.title,
    description: route.description,
    url: route.canonical,
    inLanguage: 'en-US',
    isPartOf: { '@id': `${registry.site.origin}/#website` },
    mainEntityOfPage: { '@id': route.canonical },
    publisher: {
      '@type': 'Organization',
      name: registry.site.name,
      url: `${registry.site.origin}/`,
      logo: {
        '@type': 'ImageObject',
        url: `${registry.site.origin}/assets/scs/logo.png`,
        width: 480,
        height: 486,
      },
    },
  };
  if (lastModified) article.dateModified = lastModified;

  // Ten articles render a visible "Frequently Asked Questions" section. Encoding
  // those pairs gives an answer engine a pre-chunked, attributable answer unit
  // instead of one it has to infer from prose. Google restricted FAQ rich results
  // to government and health sites in 2023, so this is a machine-readability
  // measure, not a rich-result play. The pairs are mirrored from the rendered
  // article and pinned to it by validate-seo.mjs, so schema cannot outlive copy.
  // Belt and braces against the leak that shipped ten editorial placeholders as
  // machine readable answers. The source file is clean and the validator now
  // excludes them, so this should never filter anything. It is here so that a
  // marker pasted back into the JSON cannot reach a crawler.
  const faq = (blogFaq[slug] ?? []).filter((entry) => !entry.answer.includes('[FACT NEEDED'));
  const faqNode = faq?.length ? {
    '@type': 'FAQPage',
    '@id': `${route.canonical}#faq`,
    url: route.canonical,
    inLanguage: 'en-US',
    isPartOf: { '@id': `${route.canonical}#article` },
    mainEntity: faq.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: { '@type': 'Answer', text: entry.answer },
    })),
  } : null;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      article,
      ...(faqNode ? [faqNode] : []),
      {
        '@type': 'BreadcrumbList',
        '@id': `${route.canonical}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${registry.site.origin}/` },
          { '@type': 'ListItem', position: 2, name: 'Articles', item: `${registry.site.origin}/blog` },
          { '@type': 'ListItem', position: 3, name: route.h1 || route.title },
        ],
      },
    ],
  };
};

// Self hosted fonts are render blocking on first paint, so preload them. Read
// the built stylesheet rather than the sources: it holds every @font-face from
// every origin (src/index.css and the @fontsource packages alike) already
// pointing at the hashed filenames webpack emitted, so nothing here can rot.
// Only basic latin at the two text weights is worth the bytes; a cyrillic or
// latin-ext subset would be fetched for glyphs this site never renders.
const PAINT_WEIGHTS = new Set(['400', '600']);
const isLatin = (face) => /u\+00\?\?|u\+0{1,4}-0{0,2}ff/i.test(face) || !/unicode-range/i.test(face);

const cssDir = resolve(buildRoot, 'static/css');
const builtCss = (await Promise.all(
  (await readdir(cssDir))
    .filter((name) => name.endsWith('.css'))
    .map((name) => readFile(resolve(cssDir, name), 'utf8'))
)).join('');

const findFonts = async () => [...builtCss.matchAll(/@font-face\{([^}]*)\}/g)]
  .map((match) => match[1])
  .filter((face) => isLatin(face) && PAINT_WEIGHTS.has(face.match(/font-weight:\s*(\d+)/)?.[1]))
  .map((face) => face.match(/url\((\/[^)]+\.woff2)\)/)?.[1])
  .filter(Boolean);

const fontPreloads = (await findFonts())
  .map((href) => `<link rel="preload" as="font" type="font/woff2" crossorigin href="${href}" />`)
  .join('\n    ');
if (!fontPreloads) console.warn('No latin woff2 subsets found in the build; skipping font preload.');

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

  html = html.replace(/<link[^>]+rel=["']preload["'][^>]+as=["']font["'][^>]*>\s*/gi, '');
  if (fontPreloads) html = html.replace('</head>', `    ${fontPreloads}\n</head>`);

  html = html.replace(/<script[^>]+id=["']site-schema["'][^>]*>[\s\S]*?<\/script>\s*/gi, '');
  html = html.replace(/<script[^>]+id=["']article-schema["'][^>]*>[\s\S]*?<\/script>\s*/gi, '');
  if (metadata.path === '/') {
    html = html.replace(
      '</head>',
      `    <script id="site-schema" type="application/ld+json">${JSON.stringify(homeSchema)}</script>\n</head>`
    );
  } else if (metadata.path.startsWith('/blog/') && metadata.indexable && canonical) {
    html = html.replace(
      '</head>',
      `    <script id="article-schema" type="application/ld+json">${JSON.stringify(buildArticleGraph(metadata))}</script>\n</head>`
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
