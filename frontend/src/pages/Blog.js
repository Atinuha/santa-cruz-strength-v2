import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { getBlogPosts } from '../lib/api';
import { Calendar, ArrowRight, Clock, FileText, AlertTriangle } from 'lucide-react';

const sanitize = (s) => (s || '').replace(/[\u2013\u2014]/g, ',');
const CATEGORIES = ['All', 'Outdoor Athletes', 'Strength Science', 'Getting Started', 'Gym Culture', 'Training Tips'];

function readingTime(html) {
  if (!html) return 0;
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return Math.max(1, Math.round(text.split(' ').length / 200));
}

function PostCard({ post, featured = false }) {
  const mins = post.reading_time_min || 0;
  return (
    <Link to={`/blog/${post.slug}`} data-testid={`blog-post-card-${post.slug}`}
      className={`group overflow-hidden flex flex-col transition-opacity duration-180 hover:opacity-90 ${featured ? 'md:flex-row' : ''}`}
      style={{ background: 'var(--scs-warm-white)', border: '1px solid var(--scs-border)', borderRadius: 'var(--scs-radius)' }}>
      {post.cover_image ? (
        <div className={`overflow-hidden shrink-0 scs-photo ${featured ? 'md:w-2/5 h-52 md:h-auto' : 'h-44'}`}>
          <img src={post.cover_image} alt="" className="w-full h-full object-cover" loading="lazy" />
        </div>
      ) : (
        <div className={`shrink-0 flex items-center justify-center ${featured ? 'md:w-2/5 h-52 md:h-auto' : 'h-36'}`}
          style={{ background: '#F0EDE7' }}>
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--scs-stone)' }}>Santa Cruz Strength</span>
        </div>
      )}
      <div className={`p-5 flex flex-col flex-1 ${featured ? 'md:p-6' : ''}`}>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--scs-stone)' }}>{post.category}</span>
          {post.created_at && (
            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--scs-text-light)' }}>
              <Calendar size={10} />{new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
          {mins > 0 && (
            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--scs-text-light)' }}>
              <Clock size={10} />{mins} min read
            </span>
          )}
        </div>
        <h2 className={`font-semibold leading-snug mb-2 group-hover:opacity-80 transition-opacity duration-180 ${featured ? 'text-lg' : 'text-base'}`} style={{ color: 'var(--scs-charcoal)' }}>{sanitize(post.title)}</h2>
        <p className="text-sm leading-relaxed flex-1 mb-4" style={{ color: 'var(--scs-text-muted)' }}>{sanitize(post.excerpt)}</p>
        <span className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--scs-charcoal)' }}>Read <ArrowRight size={11} /></span>
      </div>
    </Link>
  );
}

function DraftCard({ draft }) {
  const isEditorial = draft.review_status === 'editorial-review';
  return (
    <Link to={`/blog/${draft.slug}`} data-testid={`editorial-draft-${draft.slug}`}
      className="group flex items-start gap-4 p-4 transition-opacity duration-180 hover:opacity-90"
      style={{ background: 'var(--scs-warm-white)', border: '1px solid var(--scs-border)', borderRadius: 'var(--scs-radius)' }}>
      <div className="shrink-0 w-10 h-10 flex items-center justify-center" style={{ background: isEditorial ? '#A55438' : 'var(--scs-stone)', borderRadius: 'var(--scs-radius)' }}>
        <FileText size={16} style={{ color: 'var(--scs-chalk)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5" style={{ background: isEditorial ? 'rgba(165,84,56,0.1)' : 'rgba(142,134,122,0.15)', color: isEditorial ? '#A55438' : 'var(--scs-stone)', borderRadius: '2px' }}>{isEditorial ? 'Editorial Review' : 'Legacy Review'}</span>
          <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--scs-text-light)' }}>{draft.category}</span>
        </div>
        <h3 className="text-sm font-semibold leading-snug mb-1 group-hover:opacity-80" style={{ color: 'var(--scs-charcoal)' }}>{sanitize(draft.title)}</h3>
        <p className="text-xs leading-relaxed truncate" style={{ color: 'var(--scs-text-muted)' }}>{sanitize(draft.excerpt)}</p>
      </div>
      <ArrowRight size={14} className="shrink-0 mt-3" style={{ color: 'var(--scs-text-light)' }} />
    </Link>
  );
}

export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [cat, setCat] = useState('All');
  const [loading, setLoading] = useState(true);
  const isStaff = !!localStorage.getItem('token');

  useEffect(() => {
    document.title = 'Blog | Santa Cruz Strength';
    setLoading(true);
    // The API defaults to 20 and caps at 50 (server.py:2020). The index asked
    // for neither, so it silently showed the first 20 of 27 articles and seven
    // were unreachable except by direct URL. Ask for the maximum, and see the
    // test in utils/blogIndexLimit.test.js which fails once the corpus outgrows
    // the cap rather than letting articles disappear again.
    const p = { limit: 50 };
    if (cat !== 'All') p.category = cat;
    // Always fetch published posts regardless of environment/preview mode
    getBlogPosts(p)
      .then(r => setPosts(r.data.posts || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [cat]);

  useEffect(() => {
    if (isStaff) {
    }
  }, [isStaff]);

  // Two slugs are deliberately non indexable and cross canonical to the
  // articles that absorbed them. They must receive no internal links at all, or
  // the canonical is fighting a link the site itself keeps handing Google. The
  // index was not only linking to one, it was featuring it in the hero slot.
  // They stay reachable by URL so the canonical can still be read.
  const CONSOLIDATED = ['why-surfers-in-santa-cruz-should-lift-weights',
                        'how-many-days-a-week-should-you-lift'];
  const listed = posts.filter(post => !CONSOLIDATED.includes(post.slug));

  const featured = listed[0];
  const rest = listed.slice(1);
  const editorialDrafts = drafts.filter(d => d.review_status === 'editorial-review');
  const legacyDrafts = drafts.filter(d => d.review_status === 'legacy-review');

  return (
    <div className="min-h-screen" style={{ background: 'var(--scs-bg)' }}>
      <Navbar />
      <section className="pt-28 pb-8" style={{ background: 'var(--scs-chalk)', borderBottom: '1px solid var(--scs-border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] mb-3" style={{ color: 'var(--scs-stone)' }}>From the Gym</p>
          <h1 className="font-display text-3xl sm:text-4xl mb-3" style={{ color: 'var(--scs-charcoal)' }} data-testid="blog-list">Blog</h1>
          <div className="flex flex-wrap gap-2 mt-4">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setCat(c)}
                className="px-3 py-1.5 text-xs font-semibold transition-colors duration-180"
                style={{
                  border: `1px solid ${cat === c ? 'var(--scs-charcoal)' : 'var(--scs-border)'}`,
                  background: cat === c ? 'var(--scs-charcoal)' : 'var(--scs-warm-white)',
                  color: cat === c ? 'var(--scs-chalk)' : 'var(--scs-text-muted)',
                  borderRadius: 'var(--scs-radius)'
                }}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Editorial Review Section (staff only) */}

      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--scs-charcoal)', borderTopColor: 'transparent' }} />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-sm" style={{ color: 'var(--scs-text-muted)' }}>No posts found.</p>
            </div>
          ) : (
            <>
              {featured && cat === 'All' && <div className="mb-8"><PostCard post={featured} featured /></div>}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {(cat === 'All' ? rest : posts).map(p => <PostCard key={p.id} post={p} />)}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="py-12" style={{ background: 'var(--scs-chalk)', borderTop: '1px solid var(--scs-border)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-lg mb-3" style={{ color: 'var(--scs-charcoal)' }}>Visit the Gym</h2>
          <Link to="/contact" className="btn-clay inline-flex items-center gap-2 px-6 py-3 text-sm">Book a Free Facility Tour <ArrowRight size={14} /></Link>
        </div>
      </section>
      <Footer />
    </div>
  );
}
