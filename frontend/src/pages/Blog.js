import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { getBlogPosts } from '../lib/api';
import { Calendar, ArrowRight, BookOpen } from 'lucide-react';

const CATEGORIES = ['All', 'Outdoor Athletes', 'Strength Science', 'Getting Started', 'Gym Culture', 'Training Tips'];

const CATEGORY_COLORS = {
  'Outdoor Athletes':  'bg-[var(--clr-bg-green)] text-[var(--clr-green)] border-[var(--clr-border-green)]',
  'Strength Science':  'bg-[var(--clr-seafoam)]/60 text-[var(--clr-green)] border-[var(--clr-seafoam-dark)]',
  'Getting Started':   'bg-purple-50 text-purple-700 border-purple-200',
  'Gym Culture':       'bg-amber-50 text-amber-700 border-amber-200',
  'Training Tips':     'bg-gray-50 text-gray-600 border-gray-200',
};

function CategoryBadge({ category }) {
  const colors = CATEGORY_COLORS[category] || 'bg-gray-50 text-gray-600 border-gray-200';
  return <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${colors}`}>{category}</span>;
}

function PostCard({ post, featured = false }) {
  return (
    <Link to={`/blog/${post.slug}`}
      className={`group card-light overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-1 ${featured ? 'md:flex-row' : ''}`}>
      {post.cover_image && (
        <div className={`relative overflow-hidden shrink-0 ${featured ? 'md:w-2/5 h-52 md:h-auto' : 'h-48'}`}>
          <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
        </div>
      )}
      <div className={`p-5 flex flex-col flex-1 ${featured ? 'md:p-7' : ''}`}>
        <div className="flex items-center gap-2 mb-3">
          <CategoryBadge category={post.category} />
          {post.created_at && (
            <span className="text-[var(--clr-text-light)] text-xs flex items-center gap-1">
              <Calendar size={11} />{new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
        </div>
        <h2 className={`font-bold leading-snug mb-2 text-[var(--clr-charcoal)] group-hover:text-[var(--clr-green)] transition-colors duration-200 ${featured ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'}`}>
          {post.title}
        </h2>
        <p className="text-[var(--clr-text-muted)] text-sm leading-relaxed flex-1 mb-4">{post.excerpt}</p>
        <div className="flex items-center gap-1.5 text-[var(--clr-green)] text-xs font-bold">
          Read more <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform duration-200" />
        </div>
      </div>
    </Link>
  );
}

export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (activeCategory !== 'All') params.category = activeCategory;
    getBlogPosts(params).then(r => { setPosts(r.data.posts); setTotal(r.data.total); }).catch(() => {}).finally(() => setLoading(false));
  }, [activeCategory]);

  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <div className="min-h-screen" style={{ background: 'var(--clr-bg)' }}>
      <Navbar />
      <section className="pt-28 pb-10 bg-white border-b" style={{ borderColor: 'var(--clr-border)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={20} style={{ color: 'var(--clr-green)' }} />
            <span className="green-accent-line mb-0" style={{ display: 'inline-block', verticalAlign: 'middle', marginBottom: 0 }} />
          </div>
          <h1 className="font-display text-5xl sm:text-6xl tracking-wide mb-3" style={{ color: 'var(--clr-charcoal)' }}>STRENGTH KNOWLEDGE</h1>
          <p className="text-[var(--clr-text-muted)] text-base max-w-2xl font-semibold">
            Training insights, Santa Cruz athlete stories, and answers to the fitness questions people in our community are actually asking.
          </p>
          <div className="flex flex-wrap gap-2 mt-6">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border ${
                  activeCategory === cat
                    ? 'bg-[var(--clr-green)] text-white border-[var(--clr-green)]'
                    : 'bg-white text-[var(--clr-text-muted)] border-[var(--clr-border)] hover:border-[var(--clr-green)] hover:text-[var(--clr-green)]'
                }`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--clr-green)', borderTopColor: 'transparent' }} />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-[var(--clr-text-muted)] text-sm">No posts in this category yet.</p>
            </div>
          ) : (
            <>
              {featured && activeCategory === 'All' && (
                <div className="mb-8">
                  <p className="text-[var(--clr-green)] text-xs font-bold uppercase tracking-wider mb-3">Latest Post</p>
                  <PostCard post={featured} featured />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {(activeCategory === 'All' ? rest : posts).map(post => <PostCard key={post.id} post={post} />)}
              </div>
            </>
          )}
        </div>
      </section>

      <section className="py-14 border-t" style={{ background: 'var(--clr-seafoam)', borderColor: 'var(--clr-border)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-3xl tracking-wide mb-3" style={{ color: 'var(--clr-green)' }}>TRAIN WITH US</h2>
          <p className="text-[var(--clr-text)] text-sm mb-6 font-semibold">Ready to put this into practice? Book a free tour of Santa Cruz Strength.</p>
          <Link to="/join" className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-sm">
            Book a Tour <ArrowRight size={14} />
          </Link>
        </div>
      </section>
      <Footer />
    </div>
  );
}
