/**
 * The prerender must fail closed. This test is the proof, not the comment.
 *
 * The failure this guards against is the quiet one. A build that skips
 * prerendering still emits a complete-looking artefact: 39 route shells, every
 * title correct, every canonical correct, every JSON-LD graph correct, and a
 * 108-byte body behind each of them. It deploys, it serves 200, and the only
 * symptom is that nothing that reads HTML can see any content. That is why the
 * script exits non-zero rather than warning, and why the exit codes are pinned
 * here.
 *
 * Each case spawns the real script. Nothing is mocked, because the thing under
 * test is what the process does when a deployment pipeline runs it.
 */

const { spawn, spawnSync } = require('child_process');
const path = require('path');

const SCRIPT = path.resolve(__dirname, '../../scripts/prerender.mjs');
const FRONTEND = path.resolve(__dirname, '../..');

/** Runs the script with a clean environment plus `env`, and returns the result. */
const run = (env = {}) => {
  const base = { ...process.env };
  // Wipe anything the ambient shell or jest may have set, so a case that means
  // "no API URL" really means no API URL.
  for (const key of ['PRERENDER_API_URL', 'REACT_APP_BACKEND_URL', 'SKIP_PRERENDER', 'CI', 'APP_ENV']) {
    delete base[key];
  }
  // CRA's test runner sets NODE_ENV=test. The script treats production as a
  // must-prerender environment, so leaving it at test keeps the cases that are
  // about CI actually about CI.
  base.NODE_ENV = 'test';
  const result = spawnSync(process.execPath, [SCRIPT], {
    cwd: FRONTEND,
    env: { ...base, ...env },
    encoding: 'utf8',
    timeout: 60000,
  });
  return { code: result.status, out: `${result.stdout || ''}${result.stderr || ''}` };
};

/**
 * A backend that answers, but with empty collections. The dangerous case, and
 * the one this file exists for.
 *
 * It runs in its own process. The first version of this test served it from
 * jest itself, which deadlocks: spawnSync blocks the event loop, so the child's
 * requests sat in the accept queue of a server that could not run until the
 * child it was serving had exited. The test timed out and reported a null exit
 * code, which reads like a crash and was a self-inflicted hang.
 */
const startEmptyBackend = () =>
  new Promise((resolve, reject) => {
    const code = `
      const http = require('http');
      const s = http.createServer((req, res) => {
        const body = req.url.startsWith('/api/blog') ? { posts: [] }
                   : req.url.includes('/team') ? [] : {};
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(body));
      });
      s.listen(0, '127.0.0.1', () => console.log('READY ' + s.address().port));
    `;
    const child = spawn(process.execPath, ['-e', code], { stdio: ['ignore', 'pipe', 'inherit'] });
    const timer = setTimeout(() => { child.kill(); reject(new Error('stub backend never came up')); }, 15000);
    child.stdout.on('data', (chunk) => {
      const match = /READY (\d+)/.exec(String(chunk));
      if (match) { clearTimeout(timer); resolve({ child, port: Number(match[1]) }); }
    });
  });

describe('prerender fails closed', () => {
  test('no API url is a failed build, not a skipped step', () => {
    const { code, out } = run();
    expect(code).toBe(1);
    expect(out).toMatch(/no PRERENDER_API_URL/);
  });

  test('an unreachable backend is a failed build', () => {
    // Port 1 is reserved and nothing listens on it, so this refuses immediately
    // rather than waiting out a timeout.
    const { code } = run({ PRERENDER_API_URL: 'http://127.0.0.1:1' });
    expect(code).toBe(1);
  });

  test('a reachable but unseeded backend is a failed build', async () => {
    const { child, port } = await startEmptyBackend();
    try {
      const { code, out } = run({ PRERENDER_API_URL: `http://127.0.0.1:${port}` });
      expect(code).toBe(1);
      expect(out).toMatch(/reachable but not seeded/);
      expect(out).toMatch(/ALLOW_SEEDING/);
    } finally {
      child.kill();
    }
  });

  test('the opt-out works locally, and says the build must not be deployed', () => {
    const { code, out } = run({ SKIP_PRERENDER: 'true' });
    expect(code).toBe(0);
    expect(out).toMatch(/must not be deployed/);
  });

  test('the opt-out is refused under CI', () => {
    const { code, out } = run({ SKIP_PRERENDER: 'true', CI: 'true' });
    expect(code).toBe(1);
    expect(out).toMatch(/CI or production build/);
  });

  test('the opt-out is refused on a production build outside CI', () => {
    const { code } = run({ SKIP_PRERENDER: 'true', APP_ENV: 'production' });
    expect(code).toBe(1);
  });

  test('the success line is printed on exactly one path', () => {
    // The deployment checklist greps for this string, so it must not be
    // reachable from any branch that did not render every route.
    const source = require('fs').readFileSync(SCRIPT, 'utf8');
    const matches = source.match(/routes rendered into their shells/g) || [];
    expect(matches).toHaveLength(1);
    const line = source.slice(0, source.indexOf('routes rendered into their shells'));
    expect(line).toMatch(/written !== registry\.routes\.length/);
  });
});
