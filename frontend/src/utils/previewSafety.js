export const PREVIEW_MODE = process.env.REACT_APP_PREVIEW_MODE === 'true';

export class PreviewMutationBlockedError extends Error {
  constructor(action = 'This action') {
    super(`${action} is disabled in preview mode. No data was sent or stored.`);
    this.name = 'PreviewMutationBlockedError';
    this.code = 'PREVIEW_MUTATION_BLOCKED';
  }
}

export function isPreviewMode(value = process.env.REACT_APP_PREVIEW_MODE) {
  return value === 'true';
}

export function isMutationMethod(method = 'get') {
  return ['post', 'put', 'patch', 'delete'].includes(String(method).toLowerCase());
}

export function assertMutationAllowed(action, previewValue = process.env.REACT_APP_PREVIEW_MODE) {
  if (isPreviewMode(previewValue)) throw new PreviewMutationBlockedError(action);
  return true;
}

export function resolveApiBaseUrl(value = process.env.REACT_APP_BACKEND_URL) {
  if (typeof value !== 'string' || !value.trim()) return '';
  return value.trim().replace(/\/+$/, '');
}

export function buildApiUrl(path, baseUrl = resolveApiBaseUrl()) {
  const safePath = String(path || '').startsWith('/') ? String(path || '') : `/${path || ''}`;
  return `${baseUrl}${safePath}`;
}

export function validateProductionBackendUrl({
  backendUrl = process.env.REACT_APP_BACKEND_URL,
  nodeEnv = process.env.NODE_ENV,
  previewValue = process.env.REACT_APP_PREVIEW_MODE,
} = {}) {
  if (nodeEnv === 'production' && !isPreviewMode(previewValue) && !resolveApiBaseUrl(backendUrl)) {
    throw new Error('REACT_APP_BACKEND_URL is required for a production build. Use npm run build:preview for a no-send review build.');
  }
  return true;
}
