import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  getStaffBlogPosts, getStaffBlogPost, createBlogPost,
  updateBlogPost, deleteBlogPost
} from '../../lib/api';
import BlogSEOPanel from '../../components/staff/BlogSEOPanel';
import ImageUploadField from '../../components/ImageUploadField';
import {
  ArrowLeft, Plus, Trash2, Edit3, Eye, EyeOff,
  Globe, FileText, LogOut, Loader2, Save, X, BookOpen
} from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = ['Training Tips', 'Strength Science', 'Outdoor Athletes', 'Getting Started', 'Gym Culture'];

const BLANK_POST = {
  title: '', slug: '', excerpt: '', content: '', category: 'Training Tips',
  tags: '', cover_image: '', published: false, seo_title: '', seo_description: '', author: ''
};

export default function BlogManager() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' | 'edit'
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK_POST);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  const fetchPosts = async () => {
    try {
      const res = await getStaffBlogPosts();
      setPosts(res.data);
    } catch { toast.error('Failed to load posts'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPosts(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ ...BLANK_POST, author: user?.name || '' });
    setView('edit');
    setPreview(false);
  };

  const openEdit = async (post) => {
    try {
      const res = await getStaffBlogPost(post.id);
      const p = res.data;
      setForm({
        ...p,
        tags: Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || ''),
      });
      setEditing(p.id);
      setView('edit');
      setPreview(false);
    } catch { toast.error('Failed to load post'); }
  };

  const handleDelete = async (post) => {
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    try {
      await deleteBlogPost(post.id);
      toast.success('Post deleted');
      fetchPosts();
    } catch { toast.error('Failed to delete post'); }
  };

  const handleTogglePublish = async (post) => {
    try {
      await updateBlogPost(post.id, { published: !post.published });
      toast.success(post.published ? 'Post unpublished' : 'Post published!');
      fetchPosts();
    } catch { toast.error('Failed to update post'); }
  };

  const autoSlug = (title) => title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');

  const handleChange = (field, value) => {
    setForm(p => ({
      ...p,
      [field]: value,
      ...(field === 'title' && !editing ? { slug: autoSlug(value) } : {}),
    }));
  };

  const handleSave = async (publishNow = false) => {
    if (!form.title.trim() || !form.excerpt.trim() || !form.content.trim()) {
      toast.error('Title, excerpt, and content are required');
      return;
    }
    setSaving(true);
    try {
      const data = {
        ...form,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        published: publishNow ? true : form.published,
      };
      if (editing) {
        await updateBlogPost(editing, data);
        toast.success('Post updated');
      } else {
        await createBlogPost(data);
        toast.success('Post created');
      }
      setView('list');
      fetchPosts();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save post');
    } finally { setSaving(false); }
  };

  const inputClass = 'w-full bg-white/5 border border-white/12 text-white placeholder:text-white/30 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/45 transition-colors duration-200';

  return (
    <div className="min-h-screen bg-[var(--ink)]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--ink)]/96 backdrop-blur border-b border-white/8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {view === 'edit' ? (
              <button onClick={() => setView('list')} className="text-white/62 hover:text-white flex items-center gap-1.5 text-sm transition-colors duration-200">
                <ArrowLeft size={14} /> All Posts
              </button>
            ) : (
              <button onClick={() => navigate('/staff/dashboard')} className="text-white/62 hover:text-white flex items-center gap-1.5 text-sm transition-colors duration-200">
                <ArrowLeft size={14} /> Dashboard
              </button>
            )}
            <span className="text-white/38">/</span>
            <div className="flex items-center gap-1.5">
              <BookOpen size={14} className="text-[#1B7A4A]" />
              <span className="text-white text-sm">{view === 'edit' ? (editing ? 'Edit Post' : 'New Post') : 'Blog'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/blog" target="_blank"
              className="flex items-center gap-1 text-white/52 hover:text-white text-xs font-medium border border-white/12 hover:border-white/25 px-2.5 py-1.5 rounded-md transition-colors duration-200">
              <Globe size={11} /> View Blog
            </Link>
            <Link to="/"
              className="flex items-center gap-1 text-white/52 hover:text-white text-xs font-medium border border-white/12 hover:border-white/25 px-2.5 py-1.5 rounded-md transition-colors duration-200">
              <ArrowLeft size={11} /> Website
            </Link>
            <button onClick={() => { logout(); navigate('/staff/login'); }} className="text-white/52 hover:text-white/70 p-1.5 rounded">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">

        {/* LIST VIEW */}
        {view === 'list' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="font-display text-2xl text-white tracking-wide">BLOG POSTS</h1>
                <p className="text-white/42 text-xs mt-0.5">{posts.length} article{posts.length !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={openNew} className="btn-scs-primary px-4 py-2.5 rounded-md text-sm font-semibold flex items-center gap-2">
                <Plus size={15} /> New Post
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-2 border-[#1B7A4A] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : posts.length === 0 ? (
              <div className="card-marketing text-center py-16">
                <BookOpen size={32} className="text-white/18 mx-auto mb-3" />
                <p className="text-white/40 text-sm">No posts yet.</p>
                <button onClick={openNew} className="mt-4 btn-scs-primary px-4 py-2 rounded-md text-sm">Create First Post</button>
              </div>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => (
                  <div key={post.id} className="card-marketing p-4 flex items-center gap-4">
                    {post.cover_image && (
                      <img src={post.cover_image} alt={post.title} className="w-16 h-12 object-cover rounded-md shrink-0 hidden sm:block" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-white text-sm font-medium truncate">{post.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded border ${
                          post.published
                            ? 'bg-[#1B7A4A]/15 text-[#7FCCA6] border-[#1B7A4A]/20'
                            : 'bg-white/8 text-white/45 border-white/12'
                        }`}>
                          {post.published ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      <p className="text-white/40 text-xs mt-0.5 truncate">{post.excerpt}</p>
                      <div className="flex items-center gap-3 mt-1 text-white/30 text-xs">
                        <span>{post.category}</span>
                        <span>{new Date(post.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => handleTogglePublish(post)}
                        className="p-2 rounded text-white/42 hover:text-white transition-colors duration-200"
                        title={post.published ? 'Unpublish' : 'Publish'}>
                        {post.published ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      {post.published && (
                        <Link to={`/blog/${post.slug}`} target="_blank"
                          className="p-2 rounded text-white/42 hover:text-[#7FCCA6] transition-colors duration-200" title="View post">
                          <Globe size={14} />
                        </Link>
                      )}
                      <button onClick={() => openEdit(post)}
                        className="p-2 rounded text-white/42 hover:text-white transition-colors duration-200" title="Edit">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => handleDelete(post)}
                        className="p-2 rounded text-red-400/42 hover:text-red-400 transition-colors duration-200" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* EDIT VIEW */}
        {view === 'edit' && (
          <div className="space-y-5">
            {/* Toolbar */}
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl text-white tracking-wide">
                {editing ? 'EDIT POST' : 'NEW POST'}
              </h2>
              <div className="flex gap-2">
                <button onClick={() => setPreview(!preview)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium border transition-colors duration-200 ${
                    preview ? 'bg-[#1B7A4A]/15 border-[#1B7A4A]/30 text-[#7FCCA6]' : 'btn-scs-secondary'
                  }`}>
                  <Eye size={13} /> {preview ? 'Edit' : 'Preview'}
                </button>
                <button onClick={() => handleSave(false)} disabled={saving}
                  className="btn-scs-secondary flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium">
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  Save Draft
                </button>
                <button onClick={() => handleSave(true)} disabled={saving}
                  className="btn-scs-primary flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold">
                  {saving ? <Loader2 size={12} className="animate-spin" /> : <Globe size={12} />}
                  Publish
                </button>
              </div>
            </div>

            {preview ? (
              /* Preview */
              <div className="card-marketing p-6 sm:p-8">
                <div className="mb-4">
                  <span className="text-[#7FCCA6] text-xs">{form.category}</span>
                  <h1 className="font-display text-3xl text-white tracking-wide mt-1">{form.title || 'Untitled'}</h1>
                  <p className="text-white/62 text-base mt-2 border-l-2 border-[#1B7A4A] pl-4">{form.excerpt}</p>
                </div>
                <div
                  className="text-white/75 prose-article"
                  style={{ fontSize: '0.9375rem', lineHeight: '1.75' }}
                  dangerouslySetInnerHTML={{ __html: form.content }}
                />
                <style>{`
                  .prose-article h2 { color:#fff;font-family:'Bebas Neue',Impact,sans-serif;font-size:1.5rem;letter-spacing:0.05em;margin:1.5rem 0 0.75rem; }
                  .prose-article h3 { color:rgba(255,255,255,0.9);font-size:1rem;font-weight:600;margin:1.25rem 0 0.5rem; }
                  .prose-article p { margin-bottom:1rem; }
                  .prose-article ul,.prose-article ol { margin:0.75rem 0 1rem 1.25rem; }
                  .prose-article li { margin-bottom:0.35rem; }
                  .prose-article ul li { list-style-type:disc; }
                  .prose-article ol li { list-style-type:decimal; }
                  .prose-article strong { color:rgba(255,255,255,0.92); }
                `}</style>
              </div>
            ) : (
              /* Form */
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Main content */}
                <div className="lg:col-span-2 space-y-4">
                  <div>
                    <label className="block text-xs text-white/58 mb-1.5">Title *</label>
                    <input value={form.title} onChange={(e) => handleChange('title', e.target.value)}
                      placeholder="Why Surfers Should Lift Weights" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs text-white/58 mb-1.5">Excerpt * (shown in blog listing)</label>
                    <textarea value={form.excerpt} onChange={(e) => handleChange('excerpt', e.target.value)}
                      rows={2} placeholder="A compelling 1-2 sentence summary..." className={`${inputClass} resize-none`} />
                  </div>
                  <div>
                    <label className="block text-xs text-white/58 mb-1.5">
                      Content * (HTML supported: &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt;)
                    </label>
                    <textarea
                      value={form.content}
                      onChange={(e) => handleChange('content', e.target.value)}
                      rows={18}
                      placeholder={`<p>Your article content here...</p>\n\n<h2>Section Heading</h2>\n<p>Paragraph text...</p>\n\n<ul>\n<li>Point one</li>\n<li>Point two</li>\n</ul>`}
                      className={`${inputClass} resize-y font-mono text-xs`}
                    />
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                  {/* Publish status */}
                  <div className="card-marketing p-4">
                    <h3 className="text-white text-xs font-semibold uppercase tracking-wider mb-3">Status</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-white/58 text-sm">{form.published ? 'Published' : 'Draft'}</span>
                      <button type="button"
                        onClick={() => handleChange('published', !form.published)}
                        className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${
                          form.published ? 'bg-[#1B7A4A]' : 'bg-white/18'
                        }`}>
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-200 ${
                          form.published ? 'left-5' : 'left-0.5'
                        }`} />
                      </button>
                    </div>
                  </div>

                  <div className="card-marketing p-4 space-y-3">
                    <h3 className="text-white text-xs font-semibold uppercase tracking-wider mb-1">Details</h3>
                    <div>
                      <label className="block text-xs text-white/52 mb-1">Category</label>
                      <select value={form.category} onChange={(e) => handleChange('category', e.target.value)}
                        className={`${inputClass} appearance-none`} style={{backgroundColor:'var(--elevated)'}}>
                        {CATEGORIES.map(c => <option key={c} value={c} style={{background:'var(--elevated)'}}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-white/52 mb-1">URL Slug</label>
                      <input value={form.slug} onChange={(e) => handleChange('slug', e.target.value)}
                        placeholder="url-friendly-title" className={`${inputClass} font-mono text-xs`} />
                    </div>
                    <div>
                      <label className="block text-xs text-white/52 mb-1">Author</label>
                      <input value={form.author} onChange={(e) => handleChange('author', e.target.value)}
                        placeholder="Santa Cruz Strength" className={inputClass} />
                    </div>
                    <div>
                      <ImageUploadField
                        label="Cover Image"
                        value={form.cover_image}
                        onChange={(url) => handleChange('cover_image', url)}
                        inputClass={inputClass}
                        darkMode={true}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-white/52 mb-1">Tags (comma separated)</label>
                      <input value={form.tags} onChange={(e) => handleChange('tags', e.target.value)}
                        placeholder="surfing, strength, Santa Cruz" className={inputClass} />
                    </div>
                  </div>

                  {/* SEO Audit + Article Ideas — live panel */}
                  <BlogSEOPanel form={form} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
