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

// Breadcrumbs for the ordinary pages: everything indexable that is neither the
// homepage nor an article. Two levels, because this site is two levels deep.
// The final item deliberately carries no `item` property, per schema.org: the
// last crumb is the current page and linking a page to itself is noise.
// The membership prices this page publishes, encoded once. Every figure here is
// rendered on /join in the plan cards; nothing is described that a visitor
// cannot read for themselves, which is the only condition under which encoding
// it is honest.
//
// OfferCatalog rather than Product. A gym membership is access to a service,
// not a thing that ships, and forcing Product onto it to reach a rich result
// would be describing this business as something it is not. The Offers carry
// price, currency and what the price is for, and stop there: no aggregateRating
// because there are no per-review ratings behind the stars, no availability
// window because nobody has confirmed one.
const MEMBERSHIP_OFFERS = [
  { name: 'Day Pass', price: '20', description: 'Single day access, valid for same-day use during staffed hours.' },
  { name: '12-Month Membership, Huscler', price: '75', unit: 'MON', description: 'Full facility access on a 12-month agreement, billed monthly.' },
  { name: 'Annual Membership Paid in Full, Huscler', price: '825', description: 'Full facility access for 13 months, paid in full at signup.' },
  { name: 'Month-to-Month Membership, Flex Huscler', price: '120', unit: 'MON', description: 'Full facility access with no agreement, billed monthly.' },
  { name: '6-Month Membership, Huscler', price: '82', unit: 'MON', description: 'Full facility access on a 6-month agreement, billed monthly.' },
  { name: '12-Month Couples Membership', price: '120', unit: 'MON', description: 'Full facility access for two members on a 12-month agreement, $60 per person.' },
  { name: '6-Month Couples Membership', price: '136', unit: 'MON', description: 'Full facility access for two members on a 6-month agreement, $68 per person.' },
  { name: '12-Month Weekend Membership, Weekend Warrior', price: '45', unit: 'MON', description: 'Friday to Sunday access on a 12-month agreement, billed monthly.' },
  { name: '6-Month Weekend Membership, Weekend Warrior', price: '55', unit: 'MON', description: 'Friday to Sunday access on a 6-month agreement, billed monthly.' },
];

// Extra nodes for the two routes that describe something the gym sells. Both
// hang off the same #gym entity the homepage declares, so a parser resolves one
// business rather than three that happen to share a name.
const pageExtras = (route) => {
  const gym = { '@id': `${registry.site.origin}/#gym` };

  if (route.path === '/personal-training') {
    return [{
      '@type': 'Service',
      '@id': `${route.canonical}#service`,
      name: 'Personal Training',
      serviceType: 'Strength training coaching',
      description: route.description,
      url: route.canonical,
      provider: gym,
      areaServed: { '@type': 'City', name: 'Santa Cruz', address: { '@type': 'PostalAddress', addressLocality: 'Santa Cruz', addressRegion: 'CA', addressCountry: 'US' } },
      // No offers node. Rates and packages are published nowhere on this site
      // and nobody has confirmed them, so there is no price to encode and a
      // placeholder would be an invented one.
    }];
  }

  if (route.path === '/join') {
    return [{
      '@type': 'OfferCatalog',
      '@id': `${route.canonical}#memberships`,
      name: 'Santa Cruz Strength memberships',
      url: route.canonical,
      provider: gym,
      itemListElement: MEMBERSHIP_OFFERS.map((offer, index) => ({
        '@type': 'Offer',
        position: index + 1,
        name: offer.name,
        description: offer.description,
        price: offer.price,
        priceCurrency: 'USD',
        url: route.canonical,
        category: 'Gym membership',
        offeredBy: gym,
        ...(offer.unit
          ? { priceSpecification: { '@type': 'UnitPriceSpecification', price: offer.price, priceCurrency: 'USD', unitCode: offer.unit } }
          : {}),
      })),
    }];
  }

  return [];
};

const buildPageGraph = (route) => ({
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'BreadcrumbList',
      '@id': `${route.canonical}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${registry.site.origin}/` },
        { '@type': 'ListItem', position: 2, name: route.h1 || route.title },
      ],
    },
    ...pageExtras(route),
  ],
});

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
  } else if (metadata.indexable && canonical) {
    // Everything else that a crawler is allowed to index. Before this branch
    // existed the chain was home, then articles, then nothing, so /about,
    // /join, /contact, /personal-training, /events, /blog, /privacy and /terms
    // all shipped with no structured data at all. The approved build carried a
    // breadcrumb on each of them through a client side injector, which was
    // removed on the correct reasoning that a build time tag is better and the
    // incorrect assumption that the generator already emitted one.
    html = html.replace(
      '</head>',
      `    <script id="page-schema" type="application/ld+json">${JSON.stringify(buildPageGraph(metadata))}</script>\n</head>`
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
