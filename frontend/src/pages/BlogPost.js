import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import DOMPurify from 'dompurify';
import { getBlogPost } from '../lib/api';
import { ArrowLeft, ArrowRight, Tag, AlertTriangle, Clock } from 'lucide-react';

import { GYM_CONFIG } from '../config';
import { preloaded, hasPreloaded } from '../lib/preload';

// created_at is not a publication date. It is the moment the seeder inserted
// the row, so every article in the corpus reports the same value and that value
// moves forward every time the backend restarts. Rendering it told a reader all
// 27 articles were published today, which is false, and told a crawler the
// whole corpus is republished on every deploy, which is worse.
//
// The build time JSON-LD already omits datePublished for exactly this reason.
// The visible page now agrees with it. When a real publication date per article
// exists, put it on the post record and render from that field; do not point
// this back at a database timestamp.

const sanitizeDashes = (s) => (s || '').replace(/[\u2013\u2014]/g, ',');
const stripSuffix = (s) => (s || '').replace(/\s*\|\s*Santa Cruz Strength\s*$/i, '');

function readingTime(html) {
  if (!html) return 0;
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return Math.max(1, Math.round(text.split(' ').length / 200));
}

// ArticleSchema and FAQSchema used to live here and both were deleted.
//
// Both wrote a second JSON-LD block on top of the one generate-route-heads.mjs
// already puts in every blog shell at build time, so each article carried two
// competing primary entities for one URL.
//
// ArticleSchema also invented all three of the fields the build step
// deliberately omits. Its datePublished read post.created_at, which is written
// by the seed at startup: all 17 articles currently report the identical value
// 2026-08-08T09:23:58, and it moves every time the backend restarts. Google
// would have seen the publication date of the whole corpus change on every
// crawl. Its author was an unevidenced Organization node. And its guard tested
// post.noindex and post.review_status, both of which the API returns as null on
// every article, so it fired on the two cross canonical duplicates too and
// asserted mainEntityOfPage back at the URLs we deliberately consolidated away.
//
// FAQSchema treated any h2 containing a question mark as a question and took
// the next 500 characters of stripped prose as the answer. Against the live
// corpus it fired on exactly one article, the noindex duplicate, and produced
// truncated body text rather than an answer.
//
// The build step now emits BlogPosting, BreadcrumbList and, for the ten
// articles that render one, a FAQPage mirroring the real pairs. It omits
// datePublished, author and image because none of them is known, and a
// validator check fails if the encoded FAQ drifts from the rendered copy.

export default function BlogPost() {
  const { slug } = useParams();
  // Seeded from the prerender payload. Without it this component returns a
  // spinner before it returns anything else, so the initial HTML of every
  // article was a spinning div and the body of the article existed only after
  // a fetch resolved. That is the one page on this site whose entire value is
  // its text.
  const [post, setPost] = useState(() => preloaded(`post:${slug}`, null));
  const [loading, setLoading] = useState(() => !hasPreloaded(`post:${slug}`));
  const [notFound, setNotFound] = useState(false);
  const [isDraft, setIsDraft] = useState(false);

  useEffect(() => {
    // Blanking to the spinner is only honest when there is nothing to show. On
    // a prerendered article the text is already on screen and already correct,
    // so replacing it with a spinner for the length of one fetch would be a
    // flash of nothing in place of content the visitor can read. Refresh
    // underneath instead.
    if (!hasPreloaded(`post:${slug}`)) setLoading(true);
    setNotFound(false); setIsDraft(false);
    // The staff draft fallback that used to sit in this catch called an
    // editorial-drafts endpoint this backend does not publish. An unpublished
    // slug is simply not found here.
    getBlogPost(slug)
      .then(r => { setPost(r.data); })
      .catch(() => { setNotFound(true); })
      .finally(() => setLoading(false));
  }, [slug]);

  // react-helmet-async was a dependency this app does not have, doing a job it
  // already does twice: generate-route-heads.mjs writes the real title,
  // canonical and description into each blog shell at build time, and RouteSeo
  // maintains them across client navigation. A third writer of the same tags is
  // how they drift. Only the draft title, which neither of those covers, stays.
  // isDraft rather than isReview, because isReview is declared below the early
  // returns and a hook cannot sit below those. Reading it here would be a
  // temporal dead zone error, which is exactly what blanked this page once.
  useEffect(() => {
    if (!post?.title) return;
    // Only drafts. On a published post this used to run too, re-appending
    // " | Santa Cruz Strength" to a title route metadata had already trimmed to
    // fit, which pushed fourteen rendered article titles past 60 characters.
    // The comment above always said drafts were the exception; the code did not.
    if (!(isDraft || post?.review_status)) return;
    document.title = `[Draft] ${stripSuffix(sanitizeDashes(post.seo_title || post.title))} | Santa Cruz Strength`;
  }, [post, isDraft]);

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--scs-bg)' }}><div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--scs-charcoal)', borderTopColor: 'transparent' }} /></div>;
  if (notFound) return <div className="min-h-screen" style={{ background: 'var(--scs-bg)' }}><Navbar /><div className="pt-32 pb-20 min-h-[60vh] flex items-center justify-center" data-testid="blog-post-not-found"><div className="text-center"><p className="text-sm mb-4" style={{ color: 'var(--scs-text-muted)' }}>Post not found.</p><Link to="/blog" className="btn-primary px-5 py-2.5 text-sm">Back to Blog</Link></div></div><Footer /></div>;

  const isReview = isDraft || post?.review_status;
  const isEditorial = post?.review_status === 'editorial-review';
  const isLegacy = post?.review_status === 'legacy-review';

  return (
    <div className="min-h-screen" style={{ background: 'var(--scs-bg)' }} data-testid="blog-post">
      <Navbar />

      {/* Editorial review banner */}
      {isReview && (
        <div className="mt-16 px-4 py-3 flex items-center justify-center gap-2" data-testid="editorial-review-banner"
          style={{ background: isEditorial ? 'rgba(165,84,56,0.08)' : 'rgba(142,134,122,0.1)', borderBottom: `2px solid ${isEditorial ? '#A55438' : 'var(--scs-stone)'}` }}>
          <AlertTriangle size={14} style={{ color: isEditorial ? '#A55438' : 'var(--scs-stone)' }} />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: isEditorial ? '#A55438' : 'var(--scs-stone)' }}>
            {isEditorial ? 'Editorial Review' : isLegacy ? 'Legacy Review' : 'Draft'} - Not Published - noindex
          </span>
        </div>
      )}

      {post?.cover_image && <div className={`relative h-56 sm:h-72 ${isReview ? '' : 'mt-16'} overflow-hidden scs-photo`} style={{ backgroundImage: `url(${post.cover_image})`, backgroundSize: 'cover', backgroundPosition: 'center 30%' }}><div className="absolute inset-0" style={{ background: 'rgba(232,225,214,0.2)' }} /></div>}
      <div className={`max-w-3xl mx-auto px-4 sm:px-6 ${post?.cover_image ? '-mt-10 relative z-10' : isReview ? 'pt-12' : 'pt-28'}`}>
        <article className="p-6 sm:p-8 mb-8" style={{ background: 'var(--scs-warm-white)', border: '1px solid var(--scs-border)', borderRadius: 'var(--scs-radius)' }}>
          <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm mb-5 transition-colors duration-180" style={{ color: 'var(--scs-text-muted)' }}><ArrowLeft size={13} /> Blog</Link>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--scs-stone)' }}>{post?.category}</span>

            {post?.content && <span className="text-xs flex items-center gap-1" style={{ color: 'var(--scs-text-light)' }}><Clock size={11} />{readingTime(post.content)} min read</span>}
            {post?.author && <span className="text-xs" style={{ color: 'var(--scs-text-light)' }}>by {post.author}</span>}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl leading-tight mb-4" style={{ color: 'var(--scs-charcoal)' }} data-testid="blog-post-title">{sanitizeDashes(post?.title || '')}</h1>
          {post?.excerpt && <p className="text-sm leading-relaxed pl-4 mb-6" style={{ color: 'var(--scs-text-muted)', borderLeft: '2px solid var(--scs-clay)' }}>{sanitizeDashes(post.excerpt)}</p>}
          <div className="prose-article leading-relaxed" data-testid="blog-post-content" style={{ color: 'var(--scs-text)', fontSize: '1rem', lineHeight: '1.75' }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(sanitizeDashes(post?.content || '')) }} />
        </article>
        {post?.tags?.length > 0 && <div className="flex flex-wrap items-center gap-2 mb-8"><Tag size={13} style={{ color: 'var(--scs-text-light)' }} />{post.tags.map((t, i) => <span key={`tag-${i}`} className="text-xs px-2 py-1" style={{ color: 'var(--scs-text-muted)', background: 'var(--scs-chalk)', border: '1px solid var(--scs-border)', borderRadius: 'var(--scs-radius)' }}>{t}</span>)}</div>}
        <div className="p-5 mb-10" style={{ background: 'var(--scs-chalk)', border: '1px solid var(--scs-border)', borderRadius: 'var(--scs-radius)' }}>
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--scs-charcoal)' }}>Train at Santa Cruz Strength</p>
          <p className="text-xs mb-3" style={{ color: 'var(--scs-text-muted)' }}>{GYM_CONFIG.address.full} &middot; {GYM_CONFIG.phone}</p>
          <div className="flex gap-2"><Link to="/contact" className="btn-clay px-4 py-2 text-xs">Book a Free Facility Tour <ArrowRight size={12} /></Link><Link to="/join" className="btn-outline px-4 py-2 text-xs">Compare Memberships</Link></div>
        </div>
        <div className="text-center pb-10"><Link to="/blog" className="text-sm flex items-center justify-center gap-2 transition-colors duration-180" style={{ color: 'var(--scs-text-muted)' }}><ArrowLeft size={14} /> All Articles</Link></div>
      </div>
      <Footer />
      <style>{`
        .prose-article h2 { color: var(--scs-charcoal); font-family: 'Barlow Condensed', Impact, sans-serif; font-size: 1.4rem; font-weight: 900; text-transform: uppercase; margin: 1.5rem 0 0.75rem; }
        .prose-article h3 { color: var(--scs-charcoal); font-size: 1.1rem; font-weight: 700; margin: 1.25rem 0 0.5rem; }
        .prose-article p { margin-bottom: 1rem; }
        .prose-article ul, .prose-article ol { margin: 0.75rem 0 1rem 1.25rem; }
        .prose-article li { margin-bottom: 0.3rem; }
        .prose-article ul li { list-style-type: disc; }
        .prose-article ol li { list-style-type: decimal; }
        .prose-article strong { color: var(--scs-charcoal); }
        .prose-article a { color: var(--scs-clay); text-decoration: underline; }
        .prose-article img { border-radius: var(--scs-radius); margin: 1rem 0; }
      `}</style>
    </div>
  );
}
