import React, { useEffect, useState } from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PublicImage from '../components/PublicImage';
import { getBlogPosts } from '../lib/api';
import { SCS_MEDIA } from '../config/media';

const PREVIEW_MODE = process.env.REACT_APP_PREVIEW_MODE === 'true';

function PublishedPost({ post, featured = false }) {
  return (
    <Link to={`/blog/${post.slug}`} className={`scs-article-card ${featured ? 'scs-article-featured' : ''}`}>
      {post.cover_image && <PublicImage src={post.cover_image} alt={`${post.title} article cover`} loading="lazy" />}
      <div>
        <span>{post.category || 'Training article'}</span>
        <h2>{post.title}</h2>
        <p>{post.excerpt}</p>
        <strong>Read article <ArrowRight size={16} aria-hidden="true" /></strong>
      </div>
    </Link>
  );
}

export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(!PREVIEW_MODE);

  useEffect(() => {
    if (PREVIEW_MODE) return;
    getBlogPosts({})
      .then(({ data }) => setPosts(data.posts || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="scs-site scs-subpage min-h-screen">
      <Navbar />
      <main>
        <section className="scs-subhero scs-blog-hero">
          <div className="scs-shell scs-subhero-layout">
            <div>
              <p className="scs-location-line"><BookOpen size={17} aria-hidden="true" /> Strength training knowledge</p>
              <h1>Useful answers before and after you walk in</h1>
              <p>Local training guidance, first-visit questions and practical ways to evaluate whether a strength gym fits.</p>
              <Link to="/contact" className="scs-button scs-button-primary">Book a facility tour <ArrowRight size={17} aria-hidden="true" /></Link>
            </div>
            <figure>
              <PublicImage src={SCS_MEDIA.chalkHands} alt="Chalked hands preparing for a strength training session" width="1448" height="1086" />
              <figcaption>Training knowledge should help people make a better decision, not bury the next step.</figcaption>
            </figure>
          </div>
        </section>

        <section className="scs-section scs-published-articles" aria-labelledby="published-title">
          <div className="scs-shell">
            <div className="scs-section-heading"><h2 id="published-title">Published by the gym</h2><p>Only articles marked published in the current content system appear here.</p></div>
            {loading ? (
              <p className="scs-empty-copy">Loading published articles...</p>
            ) : posts.length > 0 ? (
              <div className="scs-article-grid">{posts.map((post, index) => <PublishedPost key={post.id} post={post} featured={index === 0} />)}</div>
            ) : (
              <div className="scs-empty-state" role="status"><BookOpen aria-hidden="true" /><h3>{PREVIEW_MODE ? 'No public articles are available in this preview' : 'No published articles are available'}</h3><p>Internal drafts stay outside the public website. For a direct answer, book a facility tour or contact the team.</p><Link to="/contact" className="scs-button scs-button-primary">Contact the gym</Link></div>
            )}
          </div>
        </section>

        <section className="scs-closing" aria-label="Book a facility tour">
          <div className="scs-shell"><h2>Use the guide. Then evaluate the room.</h2><Link to="/contact" className="scs-button scs-button-light">Book a free tour <ArrowRight size={17} aria-hidden="true" /></Link></div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
