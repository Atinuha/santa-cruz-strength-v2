import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { getBlogPosts } from '../lib/api';
import { Calendar, Tag, ArrowRight, BookOpen } from 'lucide-react';

const CATEGORIES = ['All', 'Outdoor Athletes', 'Strength Science', 'Getting Started', 'Gym Culture', 'Training Tips'];

const CATEGORY_COLORS = {
  'Outdoor Athletes': 'bg-[#2E6B8F]/20 text-[#8BC4DF] border-[#2E6B8F]/25',
  'Strength Science': 'bg-[#1B7A4A]/15 text-[#7FCCA6] border-[#1B7A4A]/20',
  'Getting Started': 'bg-purple-500/15 text-purple-300 border-purple-500/20',
  'Gym Culture': 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  'Training Tips': 'bg-white/10 text-white/80 border-white/15',
};

function CategoryBadge({ category, className = '' }) {
  const colors = CATEGORY_COLORS[category] || 'bg-white/10 text-white/70 border-white/12';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${colors} ${className}`}>
      {category}
    </span>
  );
}

function PostCard({ post, featured = false }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className={`group card-marketing overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:border-white/18 ${
        featured ? 'md:flex-row' : ''
      }`}
    >
      {post.cover_image && (
        <div className={`relative overflow-hidden shrink-0 ${
          featured ? 'md:w-2/5 h-52 md:h-auto' : 'h-48'
        }`}>
          <img
            src={post.cover_image}
            alt={post.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0C1420]/60 to-transparent" />
        </div>
      )}
      <div className={`p-5 flex flex-col flex-1 ${featured ? 'md:p-7' : ''}`}>
        <div className="flex items-center gap-2 mb-3">
          <CategoryBadge category={post.category} />
          {post.created_at && (
            <span className="text-white/40 text-xs flex items-center gap-1">
              <Calendar size={11} />
              {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
        </div>
        <h2 className={`text-white font-semibold leading-snug mb-2 group-hover:text-[#7FCCA6] transition-colors duration-200 ${
          featured ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'
        }`}>
          {post.title}
        </h2>
        <p className="text-white/55 text-sm leading-relaxed flex-1 mb-4">{post.excerpt}</p>
        <div className="flex items-center gap-1.5 text-[#1B7A4A] text-xs font-semibold">
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
    getBlogPosts(params)
      .then(r => { setPosts(r.data.posts); setTotal(r.data.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeCategory]);

  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <div className="min-h-screen bg-[var(--ink)]">
      <Navbar />

      {/* Header */}
      <section className="pt-28 pb-10 bg-[var(--surface)] border-b border-white/8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-3">
            <BookOpen size={20} className="text-[#1B7A4A]" />
            <span className="green-accent-line mb-0" style={{ marginBottom: 0, display: 'inline-block', verticalAlign: 'middle' }} />
          </div>
          <h1 className="font-display text-5xl sm:text-6xl text-white tracking-wide mb-3">
            STRENGTH KNOWLEDGE
          </h1>
          <p className="text-white/58 text-base max-w-2xl">
            Training insights, Santa Cruz athlete stories, and answers to the fitness questions
            people in our community are actually asking.
          </p>

          {/* Category filter */}
          <div className="flex flex-wrap gap-2 mt-6">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors duration-200 border ${
                  activeCategory === cat
                    ? 'bg-[#1B7A4A] text-white border-[#1B7A4A]'
                    : 'bg-white/5 text-white/55 border-white/12 hover:bg-white/10 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Posts */}
      <section className="py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#1B7A4A] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-white/40 text-sm">No posts found in this category.</p>
            </div>
          ) : (
            <>
              {/* Featured post */}
              {featured && activeCategory === 'All' && (
                <div className="mb-8">
                  <p className="text-[#1B7A4A] text-xs font-semibold uppercase tracking-wider mb-3">Latest Post</p>
                  <PostCard post={featured} featured />
                </div>
              )}

              {/* Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {(activeCategory === 'All' ? rest : posts).map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 bg-[var(--surface)] border-t border-white/8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-3xl text-white tracking-wide mb-3">TRAIN WITH US</h2>
          <p className="text-white/55 text-sm mb-6">Ready to put this into practice? Book a free tour of Santa Cruz Strength.</p>
          <Link to="/join" className="btn-scs-primary inline-flex items-center gap-2 px-6 py-3 rounded-md font-semibold text-sm">
            Book a Tour <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
