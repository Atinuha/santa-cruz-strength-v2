import { captureAttribution, getLeadAttribution } from './attribution';

describe('preview attribution safety', () => {
  const originalPreview = process.env.REACT_APP_PREVIEW_MODE;
  const originalWindow = global.window;
  const originalDocument = global.document;

  afterEach(() => {
    process.env.REACT_APP_PREVIEW_MODE = originalPreview;
    global.window = originalWindow;
    global.document = originalDocument;
  });

  test('does not read or write attribution storage in preview mode', () => {
    process.env.REACT_APP_PREVIEW_MODE = 'true';
    const localStorage = { getItem: jest.fn(), setItem: jest.fn() };
    global.window = { localStorage, location: { hostname: 'localhost' } };
    global.document = { referrer: '' };

    expect(captureAttribution({ pathname: '/', search: '?utm_source=test' })).toBeNull();
    expect(getLeadAttribution()).toBeNull();
    expect(localStorage.getItem).not.toHaveBeenCalled();
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });
});
