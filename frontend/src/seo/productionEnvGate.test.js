import { spawnSync } from 'node:child_process';
import path from 'node:path';

const script = path.resolve(__dirname, '../../scripts/validate-production-env.mjs');

function validate(value) {
  return spawnSync(process.execPath, [script], {
    env: { ...process.env, REACT_APP_BACKEND_URL: value },
    encoding: 'utf8',
  });
}

describe('production backend URL gate', () => {
  test('accepts one stable HTTPS origin', () => {
    const result = validate('https://api.santacruzstrength.com');
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('https://api.santacruzstrength.com');
  });

  test.each([
    ['HTTP', 'http://api.santacruzstrength.com'],
    ['loopback', 'https://localhost:8000'],
    ['compressed IPv6 loopback', 'https://[::1]:8000'],
    ['expanded IPv6 loopback', 'https://[0:0:0:0:0:0:0:1]:8000'],
    ['zero-padded IPv6 loopback', 'https://[0000:0000:0000:0000:0000:0000:0000:0001]'],
    ['credentials', 'https://user:secret@api.santacruzstrength.com'],
    ['API path', 'https://api.santacruzstrength.com/api'],
    ['query', 'https://api.santacruzstrength.com?mode=live'],
    ['fragment', 'https://api.santacruzstrength.com#api'],
    ['Emergent preview host', 'https://crm-staff-portal-1.preview.emergentagent.com'],
  ])('rejects %s backend URLs', (_label, value) => {
    const result = validate(value);
    expect(result.status).not.toBe(0);
  });
});
