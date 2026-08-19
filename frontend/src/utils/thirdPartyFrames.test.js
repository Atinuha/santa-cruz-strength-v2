import fs from 'fs';
import path from 'path';

/**
 * No public page may load a third party frame or a remote font on page load.
 *
 * Both of these fire before the consent banner can be answered, so both send
 * the visitor's IP address to a third party whether or not the visitor agreed.
 * The analytics gate in this app exists to prevent exactly that, and an iframe
 * or an @import quietly walks around it.
 *
 * This is a source assertion rather than a render assertion because the project
 * has no component testing dependency, and adding one to prove a property that
 * is visible in the source would cost more than it returns.
 */

const SRC = path.resolve(__dirname, '..');

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  if (entry.isDirectory()) return walk(full);
  return /\.(js|css)$/.test(entry.name) && !/\.test\.js$/.test(entry.name) ? [full] : [];
});

const files = walk(SRC);

describe('third party loading policy', () => {
  test('no source file imports a remote font', () => {
    const offenders = files.filter((file) => {
      const body = fs.readFileSync(file, 'utf8');
      return /@import\s+url\(\s*['"]?https?:/.test(body) || /fonts\.googleapis\.com/.test(body);
    });
    expect(offenders).toEqual([]);
  });

  test('the served HTML shell does not reach a font host either', () => {
    // Removing the @import from index.css is not sufficient on its own. A
    // <link> or a preconnect in the shell fetches from the same host, at the
    // same point in the page life, with the same consequence.
    const shell = fs.readFileSync(path.resolve(SRC, '..', 'public', 'index.html'), 'utf8');
    expect(shell).not.toMatch(/fonts\.googleapis\.com/);
    expect(shell).not.toMatch(/fonts\.gstatic\.com/);
  });

  test('the bundled font faces resolve from src, not from public', () => {
    // public/ is copied verbatim and is not resolvable at build time, so a
    // root absolute url(/fonts/...) in CSS fails the build rather than falling
    // back. This asserts the form that actually compiles.
    const body = fs.readFileSync(path.join(SRC, 'index.css'), 'utf8');
    expect(body).toMatch(/url\(\.\/fonts\//);
    expect(body).not.toMatch(/url\(\/fonts\//);
  });

  test('the location map lives in exactly one component', () => {
    // Staff screens are excluded on purpose. Their frames render srcDoc email
    // previews from local strings, reach no third party, and sit behind auth.
    //
    // The map itself is no longer behind a load button: the owner asked for it
    // to be visible on arrival, and that decision is recorded in MapEmbed.js.
    // What still matters is that the frame has one home. A page that inlines
    // its own <iframe> is a second copy that will drift from this one and will
    // not be found when the privacy decision is next revisited.
    const publicFiles = files.filter((file) => !file.includes(`${path.sep}staff${path.sep}`));
    const withIframe = publicFiles.filter((file) => /<iframe/.test(fs.readFileSync(file, 'utf8')));
    expect(withIframe.map((file) => path.basename(file))).toEqual(['MapEmbed.js']);
  });

  test('the map frame is built from config, not a hardcoded address', () => {
    // Home.js used to carry its own maps.google.com URL with the address typed
    // into the query string. config/index.js is the single source for the
    // address, so a move would have left that copy pointing at the old one.
    const body = fs.readFileSync(path.join(SRC, 'components', 'MapEmbed.js'), 'utf8');
    expect(body).toMatch(/GYM_CONFIG\.mapEmbedUrl/);
    expect(body).not.toMatch(/https:\/\/(www\.)?maps\.google\.com/);
  });
});
