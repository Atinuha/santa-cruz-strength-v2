import fs from 'fs';
import path from 'path';

/**
 * Three defects an SEO audit found, each of which passed every existing gate.
 *
 * The build was green, thirty validator checks passed, and thirty-five tests
 * passed, while every page title on the site was being replaced at render time,
 * the blog's own category tabs were re-linking two pages the site had spent
 * effort de-indexing, and ten editorial placeholders were being served to
 * answer engines as the canonical answer.
 *
 * They share a shape: the artifact the validator inspects was correct, and the
 * thing the browser produced was not. These assert on the second.
 */

const SRC = path.resolve(__dirname, '..');
const PAGES = path.join(SRC, 'pages');

const pageFiles = fs.readdirSync(PAGES).filter((f) => f.endsWith('.js'));
const read = (f) => fs.readFileSync(path.join(PAGES, f), 'utf8');

describe('RouteSeo owns the document title', () => {
  /**
   * Page effects mount below <RouteSeo/>, so they run last and win. Nine pages
   * set their own title, stripping the geo qualifiers ("in Santa Cruz", "in
   * Harvey West") that route metadata carries and the validator checks. A tenth
   * re-appended the brand suffix to blog titles that had been trimmed to fit,
   * pushing fourteen of them past sixty characters.
   */
  test.each(pageFiles)('%s does not set document.title', (file) => {
    const source = read(file);
    if (!source.includes('document.title')) return;

    // BlogPost may label a draft, which route metadata cannot know about. That
    // is the one legitimate writer, and only on the draft branch.
    expect(file).toBe('BlogPost.js');
    expect(source).toMatch(/if \(!\(isDraft \|\| post\?\.review_status\)\) return;/);
  });
});

describe('consolidated articles receive no internal links', () => {
  const { CONSOLIDATED_SLUGS, withoutConsolidated } = require('../seo/consolidatedSlugs');

  test('the list is not empty, or this whole file passes vacuously', () => {
    expect(CONSOLIDATED_SLUGS.length).toBeGreaterThan(0);
  });

  test('the filter removes them and keeps everything else', () => {
    const posts = [{ slug: CONSOLIDATED_SLUGS[0] }, { slug: 'a-real-article' }];

    expect(withoutConsolidated(posts)).toEqual([{ slug: 'a-real-article' }]);
  });

  test('every page that renders a list of posts filters it', () => {
    // Blog.js rendered `posts` on its category branch and `listed` on the other,
    // so each tab containing one re-linked it. Home.js never filtered at all.
    for (const file of ['Blog.js', 'Home.js']) {
      const source = read(file);
      if (!source.includes('getBlogPosts')) continue;
      expect(source).toContain('withoutConsolidated');
    }
  });

  test('no page hardcodes a consolidated slug in a link', () => {
    for (const file of pageFiles) {
      for (const slug of CONSOLIDATED_SLUGS) {
        expect(read(file)).not.toContain(`/blog/${slug}`);
      }
    }
  });
});

describe('editorial placeholders never reach structured data', () => {
  /**
   * [FACT NEEDED] markers are deliberate in prose: they are the site visibly
   * declining to invent a fact nobody has confirmed. In schema they become the
   * machine readable answer, so "is chalk allowed" was answered with a bracketed
   * internal work item.
   */
  const faq = JSON.parse(fs.readFileSync(path.join(SRC, 'seo', 'blog-faq.json'), 'utf8'));

  test('the corpus is present, so this is a real check', () => {
    expect(Object.keys(faq).length).toBeGreaterThan(0);
  });

  test('no encoded answer carries a placeholder', () => {
    const leaked = Object.entries(faq).flatMap(([slug, pairs]) =>
      pairs.filter((p) => p.answer.includes('[FACT NEEDED')).map((p) => `${slug}: ${p.question}`),
    );

    expect(leaked).toEqual([]);
  });
});
