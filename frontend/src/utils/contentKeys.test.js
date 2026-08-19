import fs from 'fs';
import path from 'path';

/**
 * Every CMS key the staff editor exposes must be a key a page actually reads.
 *
 * The homepage read home_hero_headline_v2 while the editor wrote
 * home_hero_headline. Editing the H1, which the editor itself labels as the
 * most important field for search, changed nothing and reported no error. A
 * control that silently does nothing costs more than a missing one, because
 * the owner believes the change landed.
 */

const SRC = path.resolve(__dirname, '..');
const MANAGER = path.join(SRC, 'pages', 'staff', 'ContentManager.js');

const walkPages = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  if (entry.isDirectory()) return entry.name === 'staff' ? [] : walkPages(full);
  return entry.name.endsWith('.js') ? [full] : [];
});

const readKeys = new Set(
  walkPages(path.join(SRC, 'pages'))
    .flatMap((file) => [...fs.readFileSync(file, 'utf8').matchAll(/\bcopy\('([a-z0-9_]+)'/g)])
    .map((match) => match[1]),
);

const editableKeys = [...fs.readFileSync(MANAGER, 'utf8').matchAll(/\{\s*key:\s*'([a-z0-9_]+)'/g)]
  .map((match) => match[1]);

describe('CMS key contract', () => {
  test('the homepage reads at least one CMS key', () => {
    // Guards the test itself. If getCopy is renamed, the set silently empties
    // and every assertion below passes for the wrong reason.
    expect(readKeys.size).toBeGreaterThan(0);
  });

  test('every key the homepage reads is editable in the staff manager', () => {
    const orphaned = [...readKeys].filter((key) => !editableKeys.includes(key));
    expect(orphaned).toEqual([]);
  });
});
