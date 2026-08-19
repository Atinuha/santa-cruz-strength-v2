/**
 * Put the host rules inside build/, because a comment cannot deploy itself.
 *
 * deploy/netlify/_redirects and _headers carried the instruction "copy this to
 * frontend/public/ before building" at the top of each file. Nothing did. The
 * build output shipped without either of them, and every rule in them was one
 * remembered manual step away from not existing.
 *
 * What is lost when they are missing is not cosmetic, and none of it announces
 * itself:
 *
 *   /nothing-here answers 200 with the SPA instead of 404. That is a soft 404,
 *   and Search Console rejects sitemaps over it.
 *
 *   /staff/* and /review/* fall through to index.html, which is the homepage.
 *   A cold load of /staff/login then serves the homepage's index,follow and the
 *   homepage's canonical, so the CRM login competes with the homepage for the
 *   homepage's own URL. app-shell.html exists precisely to stop that and is
 *   never reached without the rewrite.
 *
 *   The X-Robots-Tag noindex on those routes disappears, so the one mechanism
 *   that survives a rewrite going wrong goes with it.
 *
 * The files stay in deploy/ as the single source of truth. This copies them at
 * postbuild and fails the build if it cannot, because a deploy that silently
 * lost its host rules looks exactly like a deploy that kept them.
 */

import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.resolve(here, '..');
const repo = path.resolve(frontend, '..');
const source = path.join(repo, 'deploy', 'netlify');
const build = path.join(frontend, 'build');

const FILES = ['_redirects', '_headers'];

const fail = (...lines) => {
  for (const line of lines) console.error(`[host-config] ${line}`);
  process.exit(1);
};

if (!existsSync(build)) {
  fail(
    'build/ does not exist.',
    'This runs at postbuild, after craco has written the output directory.'
  );
}

await mkdir(build, { recursive: true });

for (const name of FILES) {
  const from = path.join(source, name);
  if (!existsSync(from)) {
    fail(
      `deploy/netlify/${name} is missing.`,
      'It is the source of truth for the host rules and the build will not',
      'ship without it. Restore it rather than removing this check.'
    );
  }
  await copyFile(from, path.join(build, name));
}

// Assert the rules that matter actually arrived, rather than trusting that a
// copy of the right filename means a copy of the right contents.
const redirects = await readFile(path.join(build, '_redirects'), 'utf8');
const headers = await readFile(path.join(build, '_headers'), 'utf8');

const required = [
  [redirects, '/404.html     404', 'the 404 catch-all'],
  [redirects, '/staff/*                 /app-shell.html   200', 'the staff rewrite to the noindex shell'],
  [redirects, '/review/*                /app-shell.html   200', 'the review rewrite to the noindex shell'],
  [headers, 'X-Robots-Tag: noindex, nofollow', 'the noindex header'],
];

const missing = required
  .filter(([content, needle]) => !content.includes(needle))
  .map(([, , what]) => what);

if (missing.length) {
  fail('the host files copied but do not contain:', ...missing);
}

if (!existsSync(path.join(build, 'app-shell.html'))) {
  fail(
    'build/app-shell.html is missing, and _redirects points three route',
    'patterns at it. Those routes would 404 into the catch-all.'
  );
}

console.log(`[host-config] ${FILES.join(' and ')} copied into build, rules verified`);
