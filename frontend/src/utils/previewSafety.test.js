import {
  PreviewMutationBlockedError,
  assertMutationAllowed,
  buildApiUrl,
  isMutationMethod,
  isPreviewMode,
  resolveApiBaseUrl,
  validateProductionBackendUrl,
} from './previewSafety';

describe('preview safety policy', () => {
  test('enables preview behavior only for an explicit true value', () => {
    expect(isPreviewMode('true')).toBe(true);
    expect(isPreviewMode('false')).toBe(false);
    expect(isPreviewMode('TRUE')).toBe(false);
    expect(isPreviewMode()).toBe(false);
  });

  test('blocks every HTTP mutation method in preview mode', () => {
    ['post', 'put', 'patch', 'delete'].forEach((method) => expect(isMutationMethod(method)).toBe(true));
    expect(isMutationMethod('get')).toBe(false);
    expect(() => assertMutationAllowed('Lead submission', 'true')).toThrow(PreviewMutationBlockedError);
    expect(assertMutationAllowed('Lead submission', 'false')).toBe(true);
  });

  test('uses a safe same-origin API fallback and never creates an undefined URL', () => {
    expect(resolveApiBaseUrl(undefined)).toBe('');
    expect(resolveApiBaseUrl(' https://api.example.com/// ')).toBe('https://api.example.com');
    expect(buildApiUrl('/api/leads', '')).toBe('/api/leads');
    expect(buildApiUrl('api/leads', '')).toBe('/api/leads');
    expect(buildApiUrl('/api/leads', resolveApiBaseUrl(undefined))).not.toContain('undefined');
  });

  test('requires an explicit backend for production but exempts the no-send preview build', () => {
    expect(() => validateProductionBackendUrl({ backendUrl: '', nodeEnv: 'production', previewValue: 'false' }))
      .toThrow('REACT_APP_BACKEND_URL is required');
    expect(validateProductionBackendUrl({ backendUrl: '', nodeEnv: 'production', previewValue: 'true' })).toBe(true);
    expect(validateProductionBackendUrl({ backendUrl: 'https://api.example.com', nodeEnv: 'production', previewValue: 'false' })).toBe(true);
  });
});
