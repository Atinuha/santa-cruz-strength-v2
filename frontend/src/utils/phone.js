/**
 * Phone number utilities - consistent formatting across the app.
 * Display format: (123) 123-4567
 */

/**
 * Format any phone string to (XXX) XXX-XXXX for display.
 * Returns original value if it can't be parsed.
 */
export function formatPhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone; // return as-is if unrecognised
}

/**
 * Normalise to E.164 (+1XXXXXXXXXX) for SMS / Google Voice.
 * Already exported from googleVoice.js - keep this for backend-mirroring use.
 */
export function toE164(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('1') && digits.length === 11) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}
