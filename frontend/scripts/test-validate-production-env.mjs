/**
 * Tests for the production environment validator (validate-production-env.mjs).
 *
 * Runs the validator script as a child process with controlled env vars
 * and asserts exit codes: 0 for valid production configs, non-zero for
 * every rejection case.
 */
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = resolve(__dirname, 'validate-production-env.mjs');

const PROD_ORIGIN = 'https://santacruzstrength.com';
const PROD_ORIGIN_ALT = 'https://crm-staff-portal-1.emergent.host';
const PREVIEW_ORIGIN = 'https://crm-staff-portal-1.preview.emergentagent.com';

function run(env) {
  try {
    const stdout = execFileSync('node', [SCRIPT], {
      env: { ...process.env, ...env },
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { code: 0, stdout, stderr: '' };
  } catch (err) {
    return { code: err.status, stdout: err.stdout || '', stderr: err.stderr || '' };
  }
}

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    passed++;
    console.log(`  PASS: ${name}`);
  } else {
    failed++;
    console.error(`  FAIL: ${name}`);
  }
}

console.log('=== Positive cases ===');

{
  const r = run({ REACT_APP_BACKEND_URL: PROD_ORIGIN, PRERENDER_API_URL: PROD_ORIGIN });
  assert(r.code === 0, 'both URLs match approved origin → exit 0');
}

{
  const r = run({ REACT_APP_BACKEND_URL: PROD_ORIGIN_ALT, PRERENDER_API_URL: PROD_ORIGIN_ALT });
  assert(r.code === 0, 'both URLs match alternate approved origin → exit 0');
}

console.log('');
console.log('=== Negative cases: preview hostname ===');

{
  const r = run({ REACT_APP_BACKEND_URL: PREVIEW_ORIGIN, PRERENDER_API_URL: PREVIEW_ORIGIN });
  assert(r.code !== 0, 'both preview → rejected');
}

{
  const r = run({ REACT_APP_BACKEND_URL: PROD_ORIGIN, PRERENDER_API_URL: PREVIEW_ORIGIN });
  assert(r.code !== 0, 'PRERENDER_API_URL preview → rejected');
}

{
  const r = run({ REACT_APP_BACKEND_URL: PREVIEW_ORIGIN, PRERENDER_API_URL: PROD_ORIGIN });
  assert(r.code !== 0, 'REACT_APP_BACKEND_URL preview → rejected');
}

console.log('');
console.log('=== Negative cases: loopback ===');

{
  const r = run({ REACT_APP_BACKEND_URL: 'https://localhost', PRERENDER_API_URL: 'https://localhost' });
  assert(r.code !== 0, 'localhost → rejected');
}

{
  const r = run({ REACT_APP_BACKEND_URL: 'https://127.0.0.1', PRERENDER_API_URL: 'https://127.0.0.1' });
  assert(r.code !== 0, '127.0.0.1 → rejected');
}

{
  const r = run({ REACT_APP_BACKEND_URL: 'https://[::1]', PRERENDER_API_URL: 'https://[::1]' });
  assert(r.code !== 0, '[::1] → rejected');
}

console.log('');
console.log('=== Negative cases: credentials ===');

{
  const r = run({ REACT_APP_BACKEND_URL: 'https://user:pass@prod.example.com', PRERENDER_API_URL: PROD_ORIGIN });
  assert(r.code !== 0, 'REACT_APP_BACKEND_URL with credentials → rejected');
}

{
  const r = run({ REACT_APP_BACKEND_URL: PROD_ORIGIN, PRERENDER_API_URL: 'https://user:pass@prod.example.com' });
  assert(r.code !== 0, 'PRERENDER_API_URL with credentials → rejected');
}

console.log('');
console.log('=== Negative cases: path, query, fragment ===');

{
  const r = run({ REACT_APP_BACKEND_URL: PROD_ORIGIN + '/api', PRERENDER_API_URL: PROD_ORIGIN });
  assert(r.code !== 0, 'path in REACT_APP_BACKEND_URL → rejected');
}

{
  const r = run({ REACT_APP_BACKEND_URL: PROD_ORIGIN, PRERENDER_API_URL: PROD_ORIGIN + '?key=val' });
  assert(r.code !== 0, 'query in PRERENDER_API_URL → rejected');
}

{
  const r = run({ REACT_APP_BACKEND_URL: PROD_ORIGIN + '#frag', PRERENDER_API_URL: PROD_ORIGIN });
  assert(r.code !== 0, 'fragment in REACT_APP_BACKEND_URL → rejected');
}

console.log('');
console.log('=== Negative cases: mismatched origins ===');

{
  const r = run({ REACT_APP_BACKEND_URL: PROD_ORIGIN, PRERENDER_API_URL: PROD_ORIGIN_ALT });
  assert(r.code !== 0, 'mismatched origins → rejected');
}

{
  const r = run({ REACT_APP_BACKEND_URL: 'https://a.example.com', PRERENDER_API_URL: 'https://b.example.com' });
  assert(r.code !== 0, 'completely different origins → rejected');
}

console.log('');
console.log('=== Negative cases: missing / empty ===');

{
  const r = run({ REACT_APP_BACKEND_URL: '', PRERENDER_API_URL: PROD_ORIGIN });
  assert(r.code !== 0, 'empty REACT_APP_BACKEND_URL → rejected');
}

{
  const r = run({ REACT_APP_BACKEND_URL: PROD_ORIGIN, PRERENDER_API_URL: '' });
  assert(r.code !== 0, 'empty PRERENDER_API_URL → rejected');
}

console.log('');
console.log('=== Negative cases: http (not https) ===');

{
  const r = run({ REACT_APP_BACKEND_URL: 'http://prod.example.com', PRERENDER_API_URL: 'http://prod.example.com' });
  assert(r.code !== 0, 'http (not https) → rejected');
}

console.log('');
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
