import { joinUrl } from '../config';
/**
 * Email Block System - block definitions, defaults, and HTML generator
 * Blocks are stored as JSON and rendered to email-safe HTML at send time.
 */

export const BLOCK_TYPES = [
  { type: 'header',  label: 'Header',    emoji: '🏢', desc: 'Gym logo + title' },
  { type: 'text',    label: 'Text',       emoji: '📝', desc: 'Paragraph of text' },
  { type: 'image',   label: 'Image',      emoji: '🖼️', desc: 'Photo or graphic' },
  { type: 'gif',     label: 'GIF',        emoji: '🎬', desc: 'Animated GIF' },
  { type: 'button',  label: 'Button',     emoji: '🔘', desc: 'Call-to-action button' },
  { type: 'divider', label: 'Divider',    emoji: '➖', desc: 'Horizontal line' },
  { type: 'spacer',  label: 'Spacer',     emoji: '↕️', desc: 'Vertical space' },
  { type: 'footer',  label: 'Footer',     emoji: '📌', desc: 'Address + unsubscribe' },
];

export const DEFAULT_BLOCK = {
  header:  { type: 'header',  title: 'Santa Cruz Strength', subtitle: '',   bgColor: '#0D5D3E', textColor: '#ffffff' },
  text:    { type: 'text',    content: 'Write your message here. Use the merge tags above to personalise it.',
             align: 'left', size: '15', color: '#333333', bold: false, bgColor: '#ffffff' },
  image:   { type: 'image',   url: '', alt: '', width: '100', caption: '', rounded: true, bgColor: '#ffffff' },
  gif:     { type: 'gif',     url: '', alt: '', width: '100', bgColor: '#ffffff' },
  button:  { type: 'button',  text: 'Join Now', url: joinUrl(),
             bgColor: '#FA5A5C', textColor: '#ffffff', align: 'center' },
  divider: { type: 'divider', color: '#eeeeee', bgColor: '#ffffff' },
  spacer:  { type: 'spacer',  height: 24, bgColor: '#ffffff' },
  footer:  { type: 'footer',  address: '151 Harvey West Blvd Ste D, Santa Cruz CA 95060',
             phone: '(408) 337-6709', website: 'santacruzstrength.com',
             unsubscribe: true, bgColor: '#f9f9f9', textColor: '#aaaaaa' },
};

export const MERGE_FIELDS = [
  { label: 'First Name',  tag: '{{first_name}}' },
  { label: 'Last Name',   tag: '{{last_name}}' },
  { label: 'Gym Name',    tag: '{{gym_name}}' },
  { label: 'Join URL',    tag: '{{join_url}}' },
  { label: 'Phone',       tag: '{{gym_phone}}' },
  { label: 'Unsubscribe URL', tag: '{{unsubscribe_url}}' },
];

export const DEFAULT_GYM_DATA = {
  gym_name:  'Santa Cruz Strength',
  join_url:  joinUrl(),
  gym_phone: '(408) 337-6709',
};

/** Replace merge tags with real data */
export function replaceMergeTags(text = '', data = {}) {
  return text
    .replace(/\{\{first_name\}\}/g, data.first_name || 'Friend')
    .replace(/\{\{last_name\}\}/g,  data.last_name  || '')
    .replace(/\{\{gym_name\}\}/g,   data.gym_name   || 'Santa Cruz Strength')
    .replace(/\{\{join_url\}\}/g,   data.join_url   || '#')
    .replace(/\{\{gym_phone\}\}/g,  data.gym_phone  || '(408) 337-6709')
    .replace(/\{\{unsubscribe_url\}\}/g, data.unsubscribe_url || '{{unsubscribe_url}}');
}

/** Render a single block to email-safe HTML */
function renderBlock(block, data = {}) {
  const r = (t) => replaceMergeTags(t, data);

  switch (block.type) {
    case 'header':
      return `<tr><td style="background:${block.bgColor || '#0D5D3E'};padding:26px 36px;text-align:center;">
  <p style="margin:0;color:#CDE4DF;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;font-family:'Helvetica Neue',Arial,sans-serif;">Santa Cruz Strength</p>
  <p style="margin:8px 0 0;color:${block.textColor || '#ffffff'};font-size:22px;font-weight:800;font-family:'Helvetica Neue',Arial,sans-serif;">${r(block.title || '')}</p>
  ${block.subtitle ? `<p style="margin:6px 0 0;color:#CDE4DF;font-size:13px;font-family:'Helvetica Neue',Arial,sans-serif;">${r(block.subtitle)}</p>` : ''}
</td></tr>`;

    case 'text': {
      const fw = block.bold ? '700' : '400';
      const style = `font-size:${block.size || 15}px;color:${block.color || '#333333'};line-height:1.75;font-weight:${fw};text-align:${block.align || 'left'};font-family:'Helvetica Neue',Arial,sans-serif;`;
      return `<tr><td style="padding:14px 36px;background:${block.bgColor || '#ffffff'};">
  <div style="${style}">${r(block.content || '').replace(/\n/g, '<br>')}</div>
</td></tr>`;
    }

    case 'image':
      if (!block.url) return '';
      return `<tr><td style="padding:12px 36px;background:${block.bgColor || '#ffffff'};text-align:center;">
  <img src="${block.url}" alt="${block.alt || ''}" width="${block.width || 100}%" style="max-width:100%;display:block;margin:0 auto;${block.rounded ? 'border-radius:8px;' : ''}"/>
  ${block.caption ? `<p style="margin:8px 0 0;font-size:12px;color:#999999;font-family:'Helvetica Neue',Arial,sans-serif;">${block.caption}</p>` : ''}
</td></tr>`;

    case 'gif':
      if (!block.url) return '';
      return `<tr><td style="padding:12px 36px;background:${block.bgColor || '#ffffff'};text-align:center;">
  <img src="${block.url}" alt="${block.alt || 'gif'}" style="max-width:${block.width || 100}%;display:block;margin:0 auto;border-radius:4px;"/>
</td></tr>`;

    case 'button':
      return `<tr><td style="padding:16px 36px;background:#ffffff;text-align:${block.align || 'center'};">
  <table cellpadding="0" cellspacing="0" style="display:inline-block;">
    <tr><td style="background:${block.bgColor || '#FA5A5C'};border-radius:8px;mso-padding-alt:0;">
      <a href="${r(block.url || '#')}" style="display:inline-block;padding:13px 30px;color:${block.textColor || '#ffffff'};font-size:14px;font-weight:700;text-decoration:none;font-family:'Helvetica Neue',Arial,sans-serif;">${r(block.text || 'Click Here')}</a>
    </td></tr>
  </table>
</td></tr>`;

    case 'divider':
      return `<tr><td style="padding:8px 36px;background:${block.bgColor || '#ffffff'};">
  <hr style="border:none;border-top:1px solid ${block.color || '#eeeeee'};margin:0;"/>
</td></tr>`;

    case 'spacer':
      return `<tr><td style="height:${block.height || 24}px;background:${block.bgColor || '#ffffff'};">&nbsp;</td></tr>`;

    case 'footer':
      return `<tr><td style="padding:20px 36px;background:${block.bgColor || '#f9f9f9'};border-top:1px solid #eeeeee;text-align:center;">
  <p style="margin:0 0 4px;font-size:11px;color:${block.textColor || '#aaaaaa'};font-family:'Helvetica Neue',Arial,sans-serif;">${r(block.address || '')}</p>
  <p style="margin:0 0 4px;font-size:11px;color:${block.textColor || '#aaaaaa'};font-family:'Helvetica Neue',Arial,sans-serif;">${block.phone || ''} · ${block.website || ''}</p>
  ${block.unsubscribe ? `<p style="margin:8px 0 0;font-size:10px;color:#cccccc;font-family:'Helvetica Neue',Arial,sans-serif;"><a href="${r('{{unsubscribe_url}}')}" style="color:#888888;text-decoration:underline;">Unsubscribe from marketing emails</a></p>` : ''}
</td></tr>`;

    default:
      return '';
  }
}

/** Convert blocks array → full email HTML */
export function blocksToHTML(blocks = [], data = {}) {
  const bodyRows = blocks.map(b => renderBlock(b, data)).filter(Boolean).join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Santa Cruz Strength</title>
</head>
<body style="margin:0;padding:0;background:#F7F5F0;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F5F0;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      ${bodyRows}
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

/** Generate a preview-safe version (for iframe rendering) */
export function blocksToPreviewHTML(blocks = []) {
  return blocksToHTML(blocks, { first_name: 'Alex', last_name: 'Johnson', unsubscribe_url: '#unsubscribe-preview', ...DEFAULT_GYM_DATA });
}
