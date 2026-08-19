import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(SRC, ...parts), 'utf8');

describe('tour submission safety wiring', () => {
  test('the transport checks the backend acknowledgement before it resolves', () => {
    const source = read('lib', 'api.js');
    const start = source.indexOf('export const createLead');
    const end = source.indexOf('export const createCorporateLead');
    const createLead = source.slice(start, end);

    expect(createLead).toMatch(/await api\.post\('\/v1\/leads'/);
    expect(createLead.indexOf('requireAcceptedLeadResponse')).toBeGreaterThan(createLead.indexOf('await api.post'));
    expect(createLead.indexOf('return response')).toBeGreaterThan(createLead.indexOf('requireAcceptedLeadResponse'));
  });

  test('the quiz blocks a second in-flight submit and records conversion only after acceptance', () => {
    const source = read('components', 'QuizForm.js');
    const start = source.indexOf('const submitForm = async');
    const end = source.indexOf('const inputClass');
    const submitForm = source.slice(start, end);

    expect(submitForm).toMatch(/if \(submitPendingRef\.current\) return;/);
    expect(submitForm.indexOf('submitPendingRef.current = true')).toBeLessThan(submitForm.indexOf('await createLead'));
    expect(submitForm.indexOf('await createLead')).toBeLessThan(submitForm.indexOf('trackLeadSubmit'));
    expect(submitForm.indexOf('trackLeadSubmit')).toBeLessThan(submitForm.indexOf("navigate('/thank-you'"));
    expect(submitForm).toMatch(/accepted: true/);
    expect(submitForm).toMatch(/submitPendingRef\.current = false/);
  });

  test('the thank-you route does not report success without accepted lead state', () => {
    const source = read('pages', 'ThankYou.js');

    expect(source).toMatch(/state\?\.accepted === true/);
    expect(source).toMatch(/if \(accepted\) trackThankYouPageView\(\)/);
    expect(source).toMatch(/if \(!accepted\)/);
    expect(source).toMatch(/data-testid="thank-you-unconfirmed"/);
  });

  test('tour destinations point to the anchored contact request form', () => {
    const config = read('config', 'index.js');
    const join = read('pages', 'Join.js');
    const contact = read('pages', 'Contact.js');

    expect(config).toContain("tourUrl: '/contact#tour-request'");
    expect(join).not.toContain('href="#book-a-tour"');
    expect(join).toContain('href="/contact#tour-request"');
    expect(contact).toContain('id="tour-request"');
    expect(contact).toContain("hash !== '#tour-request'");
  });
});
