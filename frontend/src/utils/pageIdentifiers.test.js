import fs from 'fs';
import path from 'path';

/**
 * A component used in JSX must be imported in the same file.
 *
 * Seven public routes shipped a blank page because a strip pass removed the
 * `import { BreadcrumbSchema }` line and left `<BreadcrumbSchema ... />` in the
 * markup. React throws ReferenceError at render, so the route serves an empty
 * div. Nothing catches it earlier: the build compiles, HTTP returns 200, the
 * route shell has the right title and canonical, and the SEO validator passes.
 * Every check the project had looked green while half the site was blank.
 *
 * This asserts the one property that would have caught it, cheaply, without a
 * renderer: every capitalised JSX tag resolves to something the file declares.
 */

const SRC = path.resolve(__dirname, '..');

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  if (entry.isDirectory()) return walk(full);
  return /\.js$/.test(entry.name) && !/\.test\.js$/.test(entry.name) ? [full] : [];
});

// Tags React resolves itself, plus the SVG elements that are legitimately
// capitalised in JSX.
const BUILT_IN = new Set(['React', 'Fragment', 'Suspense', 'StrictMode', 'Profiler']);

describe('JSX identifier resolution', () => {
  const files = walk(SRC);

  test('the scan actually finds files', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  test('every component rendered in JSX is declared or imported in its file', () => {
    const offenders = [];
    for (const file of files) {
      const body = fs.readFileSync(file, 'utf8');
      const used = new Set(
        [...body.matchAll(/<([A-Z][A-Za-z0-9_]*)[\s/>]/g)].map((m) => m[1]),
      );
      if (!used.size) continue;

      const declared = new Set(BUILT_IN);
      // import X, { A as B, C } from '...'
      for (const m of body.matchAll(/import\s+([^;]+?)\s+from\s+['"][^'"]+['"]/g)) {
        for (const part of m[1].replace(/[{}]/g, ',').split(',')) {
          const name = part.trim().split(/\s+as\s+/).pop().trim();
          if (name) declared.add(name);
        }
      }
      for (const m of body.matchAll(/(?:function|class)\s+([A-Z][A-Za-z0-9_]*)/g)) declared.add(m[1]);
      for (const m of body.matchAll(/(?:const|let|var)\s+([A-Z][A-Za-z0-9_]*)\s*=/g)) declared.add(m[1]);
      // A component can also arrive by destructuring, which is how icon tables
      // are rendered here: `.map(([label, detail, Icon]) => <Icon />)` and
      // `.map(({ id, Icon }) => <Icon />)`. Both are real bindings.
      for (const m of body.matchAll(/[[{]([^[\]{}]*)[\]}]\s*(?:=>|\)\s*=>)/g)) {
        for (const part of m[1].split(',')) {
          const name = part.trim().split(':').pop().trim();
          if (/^[A-Z][A-Za-z0-9_]*$/.test(name)) declared.add(name);
        }
      }
      // Destructuring as its own statement, `const { Component } = candidate;`,
      // which is how a component picked out of a lookup table gets rendered.
      // The arrow-parameter pattern above did not cover this shape, so a real
      // binding read as an undeclared tag. A guard that cries wolf is worse
      // than no guard, because the next person learns to skip past it.
      for (const m of body.matchAll(/(?:const|let|var)\s*{([^{}]*)}\s*=/g)) {
        for (const part of m[1].split(',')) {
          const name = part.trim().split(':').pop().trim();
          if (/^[A-Z][A-Za-z0-9_]*$/.test(name)) declared.add(name);
        }
      }
      // Namespaced tags such as <Accordion.Item /> resolve through their root.
      for (const name of used) {
        const root = name.split('.')[0];
        if (!declared.has(root)) {
          offenders.push(`${path.relative(SRC, file)}: <${name}>`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
