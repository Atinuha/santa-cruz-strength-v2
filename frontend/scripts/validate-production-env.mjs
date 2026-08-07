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

if (!['http:', 'https:'].includes(parsed.protocol)) {
  console.error('REACT_APP_BACKEND_URL must use http or https.');
  process.exit(1);
}

console.log(`Production backend configured for ${parsed.origin}.`);
