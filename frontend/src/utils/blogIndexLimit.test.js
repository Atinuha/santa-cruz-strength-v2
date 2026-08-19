import fs from 'fs';
import path from 'path';

/**
 * The blog index must be able to show every published article.
 *
 * The list endpoint defaults to 20 results and caps at 50. Blog.js passed no
 * limit, so once the corpus passed 20 articles the index silently showed the
 * first 20 and the rest were reachable only by typing the URL. Nothing failed:
 * the articles existed, served, sat in the sitemap and carried schema. They
 * were simply not linked from the page whose entire job is linking to them.
 *
 * This asserts the two halves of that: the index asks for a limit at all, and
 * the corpus still fits inside the endpoint's ceiling. The second half is the
 * one that matters later. When article 51 is written this fails, which is the
 * moment pagination has to exist rather than the moment someone notices an
 * article missing.
 */

const SRC = path.resolve(__dirname, '..');
const BACKEND = path.resolve(SRC, '..', '..', 'backend');

const blogPage = fs.readFileSync(path.join(SRC, 'pages', 'Blog.js'), 'utf8');
const server = fs.readFileSync(path.join(BACKEND, 'server.py'), 'utf8');

const requested = Number(blogPage.match(/limit:\s*(\d+)/)?.[1] ?? 0);
const ceiling = Number(server.match(/async def list_blog_posts[\s\S]*?limit: int = Query\(\d+,\s*le=(\d+)\)/)?.[1] ?? 0);

const countArticles = () => {
  const files = fs.readdirSync(BACKEND).filter((f) => /^blog_articles.*\.py$/.test(f));
  const fromModules = files.reduce(
    (n, f) => n + [...fs.readFileSync(path.join(BACKEND, f), 'utf8').matchAll(/^\s*'slug':/gm)].length,
    0,
  );
  const seeded = [...server.matchAll(/^\s*'slug': '[a-z0-9-]+',$/gm)].length;
  return fromModules + seeded;
};

describe('blog index coverage', () => {
  test('the index requests an explicit limit', () => {
    expect(requested).toBeGreaterThan(0);
  });

  test('the requested limit does not exceed what the endpoint allows', () => {
    expect(ceiling).toBeGreaterThan(0);
    expect(requested).toBeLessThanOrEqual(ceiling);
  });

  test('every published article fits inside the requested limit', () => {
    const total = countArticles();
    expect(total).toBeGreaterThan(20);
    expect(total).toBeLessThanOrEqual(requested);
  });
});
