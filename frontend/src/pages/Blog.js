import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BlogCover from '../components/BlogCover';
import BlueprintIcon from '../components/BlueprintIcon';
import { getBlogPosts } from '../lib/api';
import { withoutConsolidated } from '../seo/consolidatedSlugs';
import { ArrowRight, Clock } from 'lucide-react';

import { preloaded, hasPreloaded } from '../lib/preload';

// See the note in BlogPost.js: created_at is a seed timestamp, not a
// publication date, so no card shows one.

const sanitize = (s) => (s || '').replace(/[\u2013\u2014]/g, ',');
const CATEGORIES = ['All', 'Outdoor Athletes', 'Strength Science', 'Getting Started', 'Gym Culture', 'Training Tips'];

/**
 * One card, three shapes.
 *
 * The index used to be twenty-seven identical tiles, which is a
 * spreadsheet rather than a publication. Size now carries meaning: one
 * lead article, two seconds, and the rest at list scale. The variation
 * is structural, so it survives a category filter changing what is in
 * each slot.
 */
function PostCard({ post, variant = 'grid' }) {
  const mins = post.reading_time_min || 0;
  const lead = variant === 'lead';
  const row = variant === 'row';

  return (
    <Link
      to={`/blog/${post.slug}`}
      data-testid={`blog-post-card-${post.slug}`}
      className={`group flex overflow-hidden ${row ? 'flex-row items-stretch gap-0' : 'flex-col'}`}
      style={{
        background: 'var(--scs-white)',
        border: '1px solid var(--scs-border)',
        borderRadius: 'var(--scs-radius-card)',
      }}
    >
      <div className={row ? 'w-1/3 shrink-0 relative' : 'relative'}>
        {post.cover_image ? (
          <div className={`overflow-hidden ${lead ? 'h-64 sm:h-80' : row ? 'h-full min-h-[120px]' : 'h-44'}`}>
            <img src={post.cover_image} alt="" className="w-full h-full object-cover scs-photo" loading="lazy" />
          </div>
        ) : (
          <BlogCover category={post.category} title={sanitize(post.title)} size={lead ? 'large' : 'default'} />
        )}
      </div>

      <div className={`flex flex-col flex-1 ${lead ? 'p-6 sm:p-8' : 'p-5'}`}>
        <p className="flex items-center gap-3 flex-wrap m-0 mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--scs-forest)' }}>{post.category}</span>
          {mins > 0 && (
            <span className="text-xs flex items-center gap-1" style={{ color: 'var(--scs-text-muted)' }}>
              <Clock size={11} aria-hidden="true" />{mins} min read
            </span>
          )}
        </p>
        <h2
          className={`font-display-medium leading-tight mb-2 ${lead ? 'text-2xl sm:text-3xl' : row ? 'text-base' : 'text-lg'}`}
          style={{ color: 'var(--scs-ink)' }}
        >
          {sanitize(post.title)}
        </h2>
        {!row && (
          <p className={`leading-relaxed flex-1 mb-4 m-0 ${lead ? 'text-base max-w-[62ch]' : 'text-sm'}`} style={{ color: 'var(--scs-text-muted)' }}>
            {sanitize(post.excerpt)}
          </p>
        )}
        <span className="scs-advance text-sm font-semibold flex items-center gap-2 mt-auto" style={{ color: 'var(--scs-forest)' }}>
          Read this article <ArrowRight size={13} />
        </span>
      </div>
    </Link>
  );
}

export default function Blog() {
  const [posts, setPosts] = useState(() => preloaded('posts', []));
  const [cat, setCat] = useState('All');
  const [loading, setLoading] = useState(() => !hasPreloaded('posts'));
  const [loadFailed, setLoadFailed] = useState(false);

  // One request, then filter in the browser.
  //
  // This used to refetch on every category tab, with `.catch(() => setPosts([]))`
  // on the end. That catch was a live bug: the shell arrives from the prerender
  // carrying all 26 articles, and the moment the refresh failed for any reason,
  // a transient network blip, a backend restart, a wrong API base in a preview
  // build, the page threw away 26 correct articles and rendered its own empty
  // state. Content that was right became content that said there was none.
  //
  // Fetching once and filtering client side removes the whole class of problem:
  // there is one load rather than six, the tabs are instant, and a failure can
  // only ever leave the prerendered list in place rather than replace it. The
  // API still defaults to 20 and caps at 50 (server.py), so the limit stays at
  // the maximum, and utils/blogIndexLimit.test.js still fails the build if the
  // corpus outgrows that cap.
  useEffect(() => {
    if (!hasPreloaded('posts')) setLoading(true);
    let cancelled = false;
    getBlogPosts({ limit: 50 })
      .then(r => { if (!cancelled) { setPosts(r.data.posts || []); setLoadFailed(false); } })
      .catch(() => { if (!cancelled) setLoadFailed(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const listed = withoutConsolidated(posts)
    .filter(post => cat === 'All' || post.category === cat);
  const showHierarchy = cat === 'All' && listed.length > 3;
  const lead = showHierarchy ? listed[0] : null;
  const seconds = showHierarchy ? listed.slice(1, 3) : [];
  const rest = showHierarchy ? listed.slice(3) : listed;
  // Only the true zero-article case is a failure worth naming. An empty
  // category with articles elsewhere on the page is just an empty category.
  const nothingAtAll = withoutConsolidated(posts).length === 0;

  return (
    <div className="min-h-screen" style={{ background: 'var(--scs-bg)' }}>
      <Navbar />

      <main id="main">
        {/* --------------------------------------------------------------
            MASTHEAD
            An editorial header rather than a page banner. The rack
            elevation sits beside the title the way a plate illustration
            sits on the cover of a training manual.
            -------------------------------------------------------------- */}
        <section className="pt-28 pb-10" style={{ background: 'var(--scs-cream)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end mb-10">
              <div className="lg:col-span-7">
                {/* The heading the SEO registry already records for this
                    route. The page used to render the word "Blog" while
                    route-metadata.json recorded this sentence, so the
                    document and its own metadata disagreed about what the
                    page is called. They agree now. */}
                <h1 className="font-display m-0 mb-4" style={{ color: 'var(--scs-forest)', fontSize: 'clamp(2.25rem, 5.5vw, 3.75rem)', lineHeight: 0.96 }} data-testid="blog-list">
                  Useful Answers Before and After You Walk In
                </h1>
                <p className="text-base sm:text-lg leading-relaxed max-w-[60ch] m-0" style={{ color: 'var(--scs-text-muted)' }}>
                  Training advice, gym culture, and the questions people actually ask on a facility tour.
                </p>
              </div>
              <div className="hidden lg:block lg:col-span-4 lg:col-start-9">
                <BlueprintIcon name="rack" size={168} draw className="ml-auto" />
              </div>
            </div>

            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter articles by category">
              {CATEGORIES.map(c => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  aria-pressed={cat === c}
                  className="px-4 py-2 text-sm font-semibold"
                  style={{
                    border: `1px solid ${cat === c ? 'var(--scs-forest)' : 'rgba(27,27,25,0.18)'}`,
                    background: cat === c ? 'var(--scs-forest)' : 'transparent',
                    color: cat === c ? 'var(--scs-white)' : 'var(--scs-text)',
                    borderRadius: 'var(--scs-radius)',
                    minHeight: '40px',
                  }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-16" style={{ background: 'var(--scs-sand)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            {loading ? (
              /* Skeleton in the shape of the result, not a spinner in the
                 middle of an empty page. */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" aria-hidden="true">
                <div className="lg:col-span-7 h-96" style={{ background: 'rgba(27,27,25,0.06)', borderRadius: 'var(--scs-radius-card)' }} />
                <div className="lg:col-span-5 flex flex-col gap-6">
                  <div className="flex-1 min-h-[180px]" style={{ background: 'rgba(27,27,25,0.06)', borderRadius: 'var(--scs-radius-card)' }} />
                  <div className="flex-1 min-h-[180px]" style={{ background: 'rgba(27,27,25,0.06)', borderRadius: 'var(--scs-radius-card)' }} />
                </div>
              </div>
            ) : listed.length === 0 ? (
              /* Three different nothings, and they are not the same message.
                 An empty category is normal. An empty site after a failed
                 load is a problem the visitor should be told about rather
                 than being shown a confident claim that nothing is written. */
              <div className="py-20 max-w-md">
                <BlueprintIcon name="own-program" size={72} className="mb-5" />
                {nothingAtAll && loadFailed ? (
                  <>
                    <h2 className="font-display text-2xl mb-2" style={{ color: 'var(--scs-forest)' }}>The articles did not load</h2>
                    <p className="text-sm mb-6" style={{ color: 'var(--scs-text-muted)' }}>
                      Something went wrong reaching the site. Reloading usually fixes it.
                    </p>
                    <button onClick={() => window.location.reload()} className="btn-primary text-sm">Reload the page</button>
                  </>
                ) : nothingAtAll ? (
                  <>
                    <h2 className="font-display text-2xl mb-2" style={{ color: 'var(--scs-forest)' }}>Nothing published yet</h2>
                    <p className="text-sm mb-6" style={{ color: 'var(--scs-text-muted)' }}>
                      There are no articles on the blog at the moment. The gym is still open.
                    </p>
                    <Link to="/contact#tour-request" className="btn-clay text-sm">Book a Free Facility Tour</Link>
                  </>
                ) : (
                  <>
                    <h2 className="font-display text-2xl mb-2" style={{ color: 'var(--scs-forest)' }}>Nothing in {cat} yet</h2>
                    <p className="text-sm mb-6" style={{ color: 'var(--scs-text-muted)' }}>
                      No articles carry this category. The rest of the writing is still there.
                    </p>
                    <button onClick={() => setCat('All')} className="btn-outline text-sm">Show all articles</button>
                  </>
                )}
              </div>
            ) : (
              <>
                {showHierarchy && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
                    <div className="lg:col-span-7"><PostCard post={lead} variant="lead" /></div>
                    <div className="lg:col-span-5 flex flex-col gap-6">
                      {seconds.map(p => <PostCard key={p.id} post={p} variant="row" />)}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rest.map(p => <PostCard key={p.id} post={p} />)}
                </div>
              </>
            )}
          </div>
        </section>

        <section className="py-16 on-dark" style={{ background: 'var(--scs-forest-deep)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <h2 className="font-display text-2xl sm:text-3xl m-0" style={{ color: 'var(--scs-white)' }}>Reading about it is not the same as standing in it.</h2>
            <Link to="/contact#tour-request" className="btn-clay text-sm shrink-0">Book a Free Facility Tour <ArrowRight size={14} /></Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
