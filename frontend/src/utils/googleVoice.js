/**
 * Google Voice utilities
 * All gym phones use wifi-only with Google Voice.
 * These helpers open Google Voice web with the number pre-populated.
 */

/**
 * Format any phone number to E.164 (+1XXXXXXXXXX)
 */
function toE164(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('1') && digits.length === 11) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

/**
 * Open Google Voice and initiate a call to the given number.
 * URL format: https://voice.google.com/u/0/calls?a=nc,+1XXXXXXXXXX
 */
export function gvCall(phone) {
  const e164 = toE164(phone);
  if (!e164) return;
  window.open(
    `https://voice.google.com/u/0/calls?a=nc,${encodeURIComponent(e164)}`,
    '_blank',
    'noopener,noreferrer'
  );
}

/**
 * Open Google Voice Messages with the number pre-populated.
 * URL format: https://voice.google.com/u/0/messages?itemId=t.+1XXXXXXXXXX
 */
export function gvText(phone) {
  const e164 = toE164(phone);
  if (!e164) return;
  window.open(
    `https://voice.google.com/u/0/messages?itemId=t.${encodeURIComponent(e164)}`,
    '_blank',
    'noopener,noreferrer'
  );
}
