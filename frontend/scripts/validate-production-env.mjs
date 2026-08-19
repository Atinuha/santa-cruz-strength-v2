const backendUrl = process.env.REACT_APP_BACKEND_URL?.trim();

if (!backendUrl) {
  console.error('REACT_APP_BACKEND_URL is required for npm run build. Use npm run build:preview for a no-send review build.');
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(backendUrl);
} catch {
  console.error('REACT_APP_BACKEND_URL must be a valid absolute URL.');
  process.exit(1);
}

if (parsed.protocol !== 'https:') {
  console.error('REACT_APP_BACKEND_URL must use https in a production build.');
  process.exit(1);
}

if (parsed.username || parsed.password) {
  console.error('REACT_APP_BACKEND_URL cannot contain credentials.');
  process.exit(1);
}

if (parsed.pathname !== '/' || parsed.search || parsed.hash) {
  console.error('REACT_APP_BACKEND_URL must be an origin without a path, query, or fragment.');
  process.exit(1);
}

const hostname = parsed.hostname.toLowerCase();
// WHATWG URL keeps IPv6 brackets in `hostname` and canonicalizes every valid
// expanded spelling of 0:0:0:0:0:0:0:1 to [::1]. Check that canonical form so
// neither the compressed nor an expanded IPv6 loopback can pass this gate.
if (['localhost', '127.0.0.1', '[::1]'].includes(hostname)) {
  console.error('REACT_APP_BACKEND_URL cannot use a loopback host in production.');
  process.exit(1);
}

if (hostname.endsWith('.preview.emergentagent.com')) {
  console.error('REACT_APP_BACKEND_URL cannot use an Emergent preview host in production.');
  process.exit(1);
}

console.log(`Production backend configured for ${parsed.origin}.`);
