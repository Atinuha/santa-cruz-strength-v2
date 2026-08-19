import { blocksToHTML } from './emailBlocks';

test('marketing email footer uses an unsubscribe URL token', () => {
  const html = blocksToHTML([{ type: 'footer', unsubscribe: true }]);
  expect(html).toContain('href="{{unsubscribe_url}}"');
  expect(html).toContain('Unsubscribe from marketing emails');
  expect(html).not.toContain('reply with STOP');
});
