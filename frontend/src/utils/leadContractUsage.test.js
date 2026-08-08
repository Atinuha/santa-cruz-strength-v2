import fs from 'fs';
import path from 'path';

/**
 * Every form that posts a lead must build its payload with the contract helper.
 *
 * The backend validates a v1 contract on both lead endpoints: schema version,
 * brand, location, form and offer identifiers, a consent object that agrees with
 * the flat consent booleans, and a UUID request id. Miss any of them and the
 * submission is rejected 422 before it touches the database.
 *
 * The member forms were migrated to that contract. The corporate form on
 * /local-wellness was not, and posted a bare spread of its own state. Every
 * business enquiry got back "Unsupported form schema version", shown to the
 * visitor as a toast that then vanished, and no B2B lead was ever stored. The
 * builder for it already existed in leadContracts.js, with a passing unit test.
 * Nothing connected the two, and nothing noticed for as long as that page has
 * been live.
 *
 * A unit test on a builder proves the builder works. This proves it is called.
 */

const SRC = path.resolve(__dirname, '..');

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith('.js') && !entry.name.endsWith('.test.js') ? [full] : [];
  });

// Endpoints that enforce the contract. A post to one of these from a component
// that never imports a builder cannot be carrying a valid payload.
const LEAD_ENDPOINTS = /['"`]\/(v1\/leads|leads|corporate-leads)['"`]/;
const BUILDERS = /build(Member|Corporate)LeadPayload/;

describe('lead submissions use the contract builder', () => {
  const sources = walk(SRC).filter((file) => !file.includes(`${path.sep}tournament${path.sep}`));

  test('the scan found source files, so this is not vacuous', () => {
    expect(sources.length).toBeGreaterThan(20);
  });

  test('no component posts to a lead endpoint without building the contract', () => {
    // lib/api.js is the transport. It names the endpoints and forwards whatever
    // it is handed, which is exactly its job, so it can never build a contract
    // and is not an offender.
    const TRANSPORT = path.join(SRC, 'lib', 'api.js');
    const offenders = sources.filter((file) => {
      if (file === TRANSPORT) return false;
      const source = fs.readFileSync(file, 'utf8');
      if (!/\.post\(/.test(source) || !LEAD_ENDPOINTS.test(source)) return false;
      return !BUILDERS.test(source);
    });

    expect(offenders.map((file) => path.relative(SRC, file))).toEqual([]);
  });

  test('both builders are actually used somewhere', () => {
    // Guards the reverse failure: a builder kept alive only by its own unit
    // test, which is exactly the state the corporate one was in.
    const all = sources.map((file) => fs.readFileSync(file, 'utf8')).join('\n');

    expect(all).toMatch(/buildMemberLeadPayload/);
    expect(all).toMatch(/buildCorporateLeadPayload/);
  });
});
