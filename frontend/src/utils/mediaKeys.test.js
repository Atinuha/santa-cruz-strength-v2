import fs from 'fs';
import path from 'path';
import { SCS_MEDIA } from '../config/media';

/**
 * Every SCS_MEDIA key a component reads must exist, and its file must exist.
 *
 * `SCS_MEDIA.logo` was read by the navbar, the footer, the hero watermark and
 * the entity block, and was never defined. `undefined` is not an error in
 * JavaScript, so every one of those became `<img src={undefined}>` and rendered
 * as a broken mark on every page. The build passed and so did every other test.
 *
 * Keys that are deliberately `null` are a different thing and stay legal: they
 * record that no honest photograph exists, and components branch on them.
 */

const SRC = path.resolve(__dirname, '..');
const PUBLIC = path.resolve(SRC, '..', 'public');

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  if (entry.isDirectory()) return walk(full);
  return /\.js$/.test(entry.name) && !/\.test\.js$/.test(entry.name) ? [full] : [];
});

const used = new Map();
for (const file of walk(SRC)) {
  for (const m of fs.readFileSync(file, 'utf8').matchAll(/SCS_MEDIA\.([A-Za-z0-9_]+)/g)) {
    if (!used.has(m[1])) used.set(m[1], path.relative(SRC, file));
  }
}

describe('media key contract', () => {
  test('the scan finds keys in use', () => {
    expect(used.size).toBeGreaterThan(0);
  });

  test('every key a component reads is defined', () => {
    const missing = [...used.entries()]
      .filter(([key]) => !(key in SCS_MEDIA))
      .map(([key, file]) => `${file}: SCS_MEDIA.${key}`);
    expect(missing).toEqual([]);
  });

  test('every non null media path points at a file that exists', () => {
    const broken = Object.entries(SCS_MEDIA)
      .filter(([, value]) => typeof value === 'string' && value.startsWith('/'))
      .filter(([, value]) => !fs.existsSync(path.join(PUBLIC, value)))
      .map(([key, value]) => `${key} -> ${value}`);
    expect(broken).toEqual([]);
  });
});
