import fs from 'fs';
import path from 'path';

describe('staff preview mutation safety', () => {
  test('guards direct image upload and blog idea fetches before network dispatch', () => {
    const imageUpload = fs.readFileSync(path.resolve(__dirname, '../components/ImageUploadField.js'), 'utf8');
    const blogSeo = fs.readFileSync(path.resolve(__dirname, '../components/staff/BlogSEOPanel.js'), 'utf8');
    const apiClient = fs.readFileSync(path.resolve(__dirname, '../lib/api.js'), 'utf8');

    expect(imageUpload).toContain('uploadMedia(form)');
    expect(blogSeo).toContain('generateBlogIdeas(force)');
    expect(imageUpload).not.toContain('fetch(');
    expect(blogSeo).not.toContain('fetch(');
    expect(apiClient).toContain("export const uploadMedia = (formData) => api.post('/upload'");
    expect(apiClient).toContain("export const generateBlogIdeas = (force = false) => api.post('/staff/blog/ideas'");
  });
});
