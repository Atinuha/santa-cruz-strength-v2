import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { getBlogPost } from '../lib/api';
import { Calendar, ArrowLeft, ArrowRight, BookOpen, Tag } from 'lucide-react';
import { GYM_CONFIG } from '../config';

const CATEGORY_COLORS = {
  'Outdoor Athletes': 'bg-[#2E6B8F]/20 text-[#8BC4DF] border-[#2E6B8F]/25',
  'Strength Science': 'bg-[#1B7A4A]/15 text-[#7FCCA6] border-[#1B7A4A]/20',
  'Getting Started': 'bg-purple-500/15 text-purple-300 border-purple-500/20',
  'Gym Culture': 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  'Training Tips': 'bg-white/10 text-white/80 border-white/15',
};

export default function BlogPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    getBlogPost(slug)
      .then(r => setPost(r.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--clr-bg)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#1B7A4A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[var(--clr-bg)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/40 text-sm mb-4">Post not found.</p>
          <Link to="/blog" className="btn-scs-primary px-5 py-2.5 rounded-md text-sm font-semibold">← Back to Blog</Link>
        </div>
      </div>
    );
  }

  const catColor = CATEGORY_COLORS[post?.category] || 'bg-white/10 text-white/70 border-white/12';

  return (
    <div className="min-h-screen bg-[var(--clr-bg)]">
      {/* SEO meta via helmet-ish approach — just set document title */}
      {post && (document.title = `${post.seo_title || post.title} | Santa Cruz Strength`)}

      <Navbar />

      {/* Hero */}
      {post?.cover_image && (
        <div
          className="relative h-64 sm:h-80 mt-16 overflow-hidden"
          style={{ backgroundImage: `url(${post.cover_image})`, backgroundSize: 'cover', backgroundPosition: 'center 30%' }}
        >
          <div className="absolute inset-0 bg-white/40" />
        </div>
      )}

      <div className={`max-w-3xl mx-auto px-4 sm:px-6 ${post?.cover_image ? '-mt-16 relative z-10' : 'pt-28'}`}>

        {/* Article header card */}
        <div className="card-light p-6 sm:p-8 mb-8">
          {/* Back link */}
          <Link to="/blog" className="inline-flex items-center gap-1.5 text-[var(--clr-text-muted)] hover:text-white text-sm transition-colors duration-200 mb-5 group">
            <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform duration-200" />
            Back to Blog
          </Link>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-2.5 mb-4">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${catColor}`}>
              {post?.category}
            </span>
            {post?.created_at && (
              <span className="text-[var(--clr-text-light)] text-xs flex items-center gap-1">
                <Calendar size={11} />
                {new Date(post.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            )}
            {post?.author && (
              <span className="text-[var(--clr-text-light)] text-xs">by {post.author}</span>
            )}
          </div>

          <h1 className="font-display text-3xl sm:text-4xl text-white tracking-wide leading-tight mb-3">
            {post?.title}
          </h1>

          {post?.excerpt && (
            <p className="text-[var(--clr-text)] text-base leading-relaxed border-l-2 border-[#1B7A4A] pl-4">
              {post.excerpt}
            </p>
          )}
        </div>

        {/* Article content */}
        <article className="card-light p-6 sm:p-8 mb-8 prose-article">
          <div
            className="text-[var(--clr-text)] leading-relaxed"
            style={{ fontSize: '1rem', lineHeight: '1.75' }}
            dangerouslySetInnerHTML={{ __html: post?.content || '' }}
          />
        </article>

        {/* Tags */}
        {post?.tags?.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-8">
            <Tag size={13} className="text-[var(--clr-text-light)]" />
            {post.tags.map((tag, i) => (
              <span key={i} className="text-xs text-white/45 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="card-light p-6 sm:p-7 mb-12 border-[#1B7A4A]/25 bg-[#1B7A4A]/5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#1B7A4A] flex items-center justify-center shrink-0">
              <span className="font-display text-white text-lg">S</span>
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm mb-1">Ready to train at Santa Cruz Strength?</p>
              <p className="text-white/55 text-xs leading-relaxed mb-3">
                {GYM_CONFIG.address.full} · {GYM_CONFIG.phone}
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Link to="/join" className="btn-scs-primary px-4 py-2 rounded-md text-xs font-semibold flex items-center gap-1.5">
                  Book a Tour <ArrowRight size={12} />
                </Link>
                <a href={GYM_CONFIG.joinUrl} target="_blank" rel="noopener noreferrer"
                  className="btn-scs-secondary px-4 py-2 rounded-md text-xs font-semibold">
                  Join Now
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Back to blog */}
        <div className="text-center pb-12">
          <Link to="/blog" className="inline-flex items-center gap-2 text-[var(--clr-text-muted)] hover:text-white text-sm transition-colors duration-200">
            <ArrowLeft size={14} /> All Articles
          </Link>
        </div>
      </div>

      <Footer />

      {/* Article content styling */}
      <style>{`
        .prose-article h2 { color: #fff; font-family: 'Bebas Neue', Impact, sans-serif; font-size: 1.6rem; letter-spacing: 0.05em; margin: 1.75rem 0 0.75rem; }
        .prose-article h3 { color: rgba(255,255,255,0.9); font-size: 1.1rem; font-weight: 600; margin: 1.5rem 0 0.6rem; }
        .prose-article p { margin-bottom: 1.1rem; }
        .prose-article ul, .prose-article ol { margin: 0.75rem 0 1.1rem 1.25rem; }
        .prose-article li { margin-bottom: 0.4rem; }
        .prose-article ul li { list-style-type: disc; }
        .prose-article ol li { list-style-type: decimal; }
        .prose-article strong { color: rgba(255,255,255,0.92); }
        .prose-article a { color: #7FCCA6; text-decoration: underline; }
      `}</style>
    </div>
  );
}
