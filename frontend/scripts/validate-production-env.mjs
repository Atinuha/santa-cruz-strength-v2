/**
 * Production build gate.
 *
 * Validates that both REACT_APP_BACKEND_URL (baked into the JS bundle) and
 * PRERENDER_API_URL (read by the prerender script) resolve to the same
 * approved production API origin. Rejects preview hosts, loopback,
 * credentials, paths, query strings, fragments, and mismatched origins.
 *
 * This gate runs as the prebuild step for `yarn build` (production).
 * `yarn build:preview` has its own prebuild that skips this validator.
 */

const LOOPBACK_HOSTS = ['localhost', '127.0.0.1', '[::1]'];
const BLOCKED_HOST_SUFFIXES = ['.preview.emergentagent.com'];

function validateOrigin(raw, label) {
  if (!raw) {
    console.error(`${label} is required for a production build.`);
    process.exit(1);
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    console.error(`${label} must be a valid absolute URL.`);
    process.exit(1);
  }

  if (parsed.protocol !== 'https:') {
    console.error(`${label} must use https in a production build.`);
    process.exit(1);
  }

  if (parsed.username || parsed.password) {
    console.error(`${label} cannot contain credentials.`);
    process.exit(1);
  }

  if (parsed.pathname !== '/' || parsed.search || parsed.hash) {
    console.error(`${label} must be an origin without a path, query, or fragment.`);
    process.exit(1);
  }

  const hostname = parsed.hostname.toLowerCase();
  if (LOOPBACK_HOSTS.includes(hostname)) {
    console.error(`${label} cannot use a loopback host in production.`);
    process.exit(1);
  }

  for (const suffix of BLOCKED_HOST_SUFFIXES) {
    if (hostname.endsWith(suffix)) {
      console.error(`${label} cannot use a preview host (${hostname}) in production.`);
      process.exit(1);
    }
  }

  return parsed.origin;
}

const backendUrl = (process.env.REACT_APP_BACKEND_URL || '').trim();
const prerenderUrl = (process.env.PRERENDER_API_URL || '').trim();

const backendOrigin = validateOrigin(backendUrl, 'REACT_APP_BACKEND_URL');
const prerenderOrigin = validateOrigin(prerenderUrl, 'PRERENDER_API_URL');

if (backendOrigin !== prerenderOrigin) {
  console.error(
    `REACT_APP_BACKEND_URL and PRERENDER_API_URL must resolve to the same production origin.\n` +
    `  REACT_APP_BACKEND_URL: ${backendOrigin}\n` +
    `  PRERENDER_API_URL:     ${prerenderOrigin}`
  );
  process.exit(1);
}

console.log(`Production build configured for ${backendOrigin}.`);
