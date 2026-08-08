import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import QuizForm from '../components/QuizForm';
import { GYM_CONFIG } from '../config';
import { SCS_MEDIA } from '../config/media';
import MapEmbed from '../components/MapEmbed';
import { getSiteContent, getBlogPosts } from '../lib/api';
import { withoutConsolidated } from '../seo/consolidatedSlugs';
import { MEMBER_STORIES } from '../config/testimonials';
import { trackBookTourClick, trackPhoneClick } from '../utils/analytics';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { ArrowRight, MapPin, Phone, Clock, Calendar } from 'lucide-react';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';

/* Verified brand images (Aug 2026 upload) */
// The approved design shipped with AI generated photographs on a remote CDN.
// The composition is kept exactly; only the subjects are real now. Each slot
// below is a verified photograph of this gym, served from public/assets.
// See src/config/media.js for what exists and what deliberately does not.
const HERO_IMG = SCS_MEDIA.heroFacility;        // wide training floor, wall seal, racks
const COACHING_IMG = SCS_MEDIA.coachingFloor;   // coaching crew on the platform
const COMMUNITY_IMG = SCS_MEDIA.communityFloor; // members, branded backdrop
const EQUIP_IMG = SCS_MEDIA.openGym;            // racks, benches, plate storage
const WALKTHROUGH_IMG = SCS_MEDIA.openGym;      // the space a tour actually walks
const LOGO_URL = SCS_MEDIA.logo;

const FAQ_ITEMS = [
  { q: 'Do I need experience to start?', a: 'No. The gym works for people at every level. Staff can help you get oriented.' },
  { q: 'What happens on a facility tour?', a: 'You walk through the space, see the equipment, ask questions, and talk through which membership fits.' },
  { q: 'What equipment is available?', a: 'Power racks, barbells, bumper and iron plates, specialty bars, dumbbells, kettlebells, and conditioning equipment.' },
  { q: 'Is coaching available?', a: 'Staff can help during staffed hours. Structured personal training is a separate service.' },
  { q: 'Where is the gym?', a: '151 Harvey West Blvd Ste D, Santa Cruz, CA 95060. Harvey West Business Park.' },
];

export default function Home() {
  const [c, setC] = useState({});
  const copy = (key, approved) => c[key] || approved;
  const [blogPosts, setBlogPosts] = useState([]);

  useEffect(() => {
    getSiteContent().then(({ data }) => setC(data)).catch(() => {});
    // Ask for more than three, drop the consolidated ones, then take three.
    // Unfiltered, the homepage could link both cross canonical duplicates:
    // every post shares one seed timestamp, so the sort tie break is
    // arbitrary and those two are the first rows the seeder inserts.
    getBlogPosts({ limit: 8 }).then(r => setBlogPosts(withoutConsolidated(r.data.posts || []).slice(0, 3))).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen" style={{ background: 'var(--scs-bg)' }}>
      <Navbar />

      {/* 1. SPACE-FIRST HERO */}
      <section data-testid="home-hero" className="relative pt-16" style={{ backgroundColor: 'var(--scs-carbon)' }}>
        <div className="relative min-h-[440px] sm:min-h-[62vh] lg:min-h-[66vh] max-h-[680px] flex items-end">
          <div className="absolute inset-0" style={{ backgroundImage: `url(${HERO_IMG})`, backgroundSize: 'cover', backgroundPosition: 'center 78%', filter: 'saturate(0.55) contrast(1.08) brightness(0.62)' }} />
          <div className="absolute inset-0" style={{ backgroundColor: 'rgba(12,12,11,0.55)' }} />
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 w-full pb-10 sm:pb-14 pt-20">
            <div className="max-w-xl">
              <h1 className="font-display text-[2rem] sm:text-[2.75rem] lg:text-[3.25rem] mb-4" style={{ color: 'var(--scs-chalk)' }}>
                {copy('home_hero_headline_v2', 'A Santa Cruz strength gym you can see before you join.')}
              </h1>
              <p className="text-sm sm:text-base mb-6 leading-relaxed" style={{ color: 'var(--scs-chalk)' }}>
                {copy('home_hero_subtitle_v2', 'See the racks, platforms, training floor, and access setup before you choose a membership.')}
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Link to="/contact" data-testid="home-hero-book-visit-button"
                  className="btn-clay px-6 py-3 text-sm uppercase tracking-wider font-semibold inline-flex items-center gap-2 w-full sm:w-auto justify-center"
                  onClick={() => trackBookTourClick('hero')}>
                  Book a Free Facility Tour <ArrowRight size={14} />
                </Link>
                <Link to="/join" className="btn-outline px-6 py-3 text-sm w-full sm:w-auto text-center" style={{ borderColor: 'rgba(232,225,214,0.3)', color: 'var(--scs-chalk)' }}>
                  Compare Memberships
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. VERIFIED DECISION STRIP */}
      <section className="py-5" style={{ background: 'var(--scs-charcoal)', borderTop: '1px solid var(--scs-border-dark)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MapPin size={14} style={{ color: 'var(--scs-stone)' }} />
            <span className="text-sm" style={{ color: 'var(--scs-chalk)' }}>151 Harvey West Blvd Ste D, Santa Cruz, CA 95060</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/contact" className="text-sm font-semibold hover:opacity-80 transition-opacity" style={{ color: 'var(--scs-clay)' }}>
              Book a Free Facility Tour
            </Link>
            <a href={GYM_CONFIG.phoneHref} onClick={() => trackPhoneClick()} className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--scs-stone)' }}>
              <Phone size={13} />{GYM_CONFIG.phone}
            </a>
          </div>
        </div>
      </section>

      {/* 3. FACILITY WALKTHROUGH */}
      <section className="py-16 sm:py-20" style={{ background: 'var(--scs-chalk)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="overflow-hidden scs-photo" style={{ borderRadius: 'var(--scs-radius)' }}>
              <img src={WALKTHROUGH_IMG} alt="Racks, benches and plate storage on the Santa Cruz Strength training floor" className="w-full h-64 sm:h-80 object-cover" style={{ objectPosition: 'center 60%' }} loading="lazy" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] mb-3" style={{ color: 'var(--scs-stone)' }}>Walk the space</p>
              <h2 className="font-display text-2xl sm:text-3xl mb-4" style={{ color: 'var(--scs-charcoal)' }}>
                Walk through the space. Ask how access works. Leave with a clear answer.
              </h2>
              <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--scs-text-muted)' }}>
                A facility tour lets you see every part of the gym, see the equipment and ask what is available, and talk to staff before you decide anything.
              </p>
              <ul className="space-y-2 mb-6">
                {['See the full training floor and equipment', 'Ask about membership options and access', 'Meet available staff', 'No paperwork required to visit'].map((item, i) => (
                  <li key={`wt-${i}`} className="flex items-start gap-2 text-sm" style={{ color: 'var(--scs-text)' }}>
                    <span className="w-1 h-1 rounded-full mt-2 shrink-0" style={{ background: 'var(--scs-clay)' }} />{item}
                  </li>
                ))}
              </ul>
              <Link to="/contact" className="btn-clay px-6 py-3 text-sm inline-flex items-center gap-2">
                Book a Free Facility Tour <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. THREE STARTING POINTS */}
      <section className="py-16 sm:py-20" style={{ background: 'var(--scs-bg)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] mb-3" style={{ color: 'var(--scs-stone)' }}>Starting points</p>
          <h2 className="font-display text-2xl sm:text-3xl mb-8" style={{ color: 'var(--scs-charcoal)' }}>
            Three ways people start here.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'First-time lifter', desc: 'New to strength training and looking for a place with clear equipment and available guidance.' },
              { title: 'Independent member', desc: 'You have your own program. You need a focused space with the right equipment to run it.' },
              { title: 'Experienced strength athlete', desc: 'Competing or training at a high level. You need racks, bars, and platforms that match.' },
            ].map((item, i) => (
              <div key={`sp-${i}`} className="p-6" style={{ background: 'var(--scs-warm-white)', border: '1px solid var(--scs-border)', borderRadius: 'var(--scs-radius)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-3" style={{ color: 'var(--scs-stone)' }}>0{i + 1}</p>
                <h3 className="font-display-medium text-base mb-2" style={{ color: 'var(--scs-charcoal)' }}>{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--scs-text-muted)' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. PRACTICAL COACHING PATH */}
      <section className="py-16 sm:py-20" style={{ background: 'var(--scs-charcoal)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] mb-3" style={{ color: 'var(--scs-stone)' }}>Coaching</p>
              <h2 className="font-display text-2xl sm:text-3xl mb-4" style={{ color: 'var(--scs-chalk)' }}>
                Practical coaching for people who want a plan.
              </h2>
              <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--scs-stone)' }}>
                Personal training is available for members who want structured programming, technique work, or a starting plan built around their goals.
              </p>
              <Link to="/personal-training" className="text-sm font-semibold inline-flex items-center gap-2 transition-opacity hover:opacity-80" style={{ color: 'var(--scs-clay)' }}>
                Ask About Personal Training <ArrowRight size={14} />
              </Link>
            </div>
            <div className="overflow-hidden scs-photo" style={{ borderRadius: 'var(--scs-radius)' }}>
              <img src={COACHING_IMG} alt="The Santa Cruz Strength coaching crew on the lifting platform" className="w-full h-64 sm:h-80 object-cover" style={{ objectPosition: 'center 35%' }} loading="lazy" />
            </div>
          </div>
        </div>
      </section>

      {/* 6. MEMBERSHIP AND ACCESS */}
      <section className="py-16 sm:py-20" style={{ background: 'var(--scs-chalk)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="overflow-hidden scs-photo" style={{ borderRadius: 'var(--scs-radius)' }}>
              <img src={COMMUNITY_IMG} alt="Members together on the training floor" className="w-full h-64 sm:h-80 object-cover" style={{ objectPosition: 'center 30%' }} loading="lazy" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] mb-3" style={{ color: 'var(--scs-stone)' }}>Membership</p>
              <h2 className="font-display text-2xl sm:text-3xl mb-4" style={{ color: 'var(--scs-charcoal)' }}>
                Memberships built around how you train.
              </h2>
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--scs-text-muted)' }}>
                Day passes, monthly plans, and commitment options. Tour the facility to see what is included in each plan.
              </p>
              <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--scs-text-muted)' }}>
                Tour the facility first, or compare plans online.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/join" className="btn-primary px-6 py-3 text-sm inline-flex items-center gap-2">
                  Compare Memberships <ArrowRight size={14} />
                </Link>
                <Link to="/contact" className="btn-outline px-6 py-3 text-sm">Book a Free Facility Tour</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. VERIFIED PROOF PLACEHOLDER */}
      {/* Testimonials withheld. Render only when source URL, capture date, exact wording, and permission exist. */}

      {/* 8. LOCAL GYM STORY */}
      <section className="py-16 sm:py-20" style={{ background: 'var(--scs-bg)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center border" style={{ borderColor: 'var(--scs-border)', padding: '2px' }}>
              <img src={LOGO_URL} alt="" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="font-display-medium text-sm" style={{ color: 'var(--scs-charcoal)' }}>Santa Cruz Strength</p>
              <p className="text-xs" style={{ color: 'var(--scs-stone)' }}>Strength Gym, Santa Cruz CA</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--scs-text-muted)' }}>
            Santa Cruz Strength is a strength training gym at 151 Harvey West Blvd in Santa Cruz, California. The facility is equipped for barbell training, powerlifting, and general strength work.
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--scs-text-muted)' }}>
            Coaching is available. Memberships range from day passes to annual plans. The best way to learn about the gym is to visit in person.
          </p>
        </div>
      </section>

      {/* 9. MEMBER STORIES, transcribed verbatim from the live site */}
      <section className="py-16 sm:py-20" style={{ background: 'var(--scs-bg)', borderTop: '1px solid var(--scs-border)' }} data-testid="home-testimonials-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="font-display text-xl sm:text-2xl mb-2" style={{ color: 'var(--scs-charcoal)' }}>Hear It From The Members</h2>
          <p className="text-sm mb-8" style={{ color: 'var(--scs-text-muted)' }}>Published on our site as written. Nothing edited.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {MEMBER_STORIES.map(story => (
              <figure key={story.name} className="p-5 flex flex-col" data-testid={`home-testimonial-${story.name.split(' ')[0].toLowerCase()}`}
                style={{ background: 'var(--scs-warm-white)', border: '1px solid var(--scs-border)', borderRadius: 'var(--scs-radius)' }}>
                <blockquote className="text-sm leading-relaxed flex-1" style={{ color: 'var(--scs-charcoal)' }}>{story.quote}</blockquote>
                <figcaption className="mt-4 pt-4" style={{ borderTop: '1px solid var(--scs-border)' }}>
                  <span className="text-sm font-semibold block" style={{ color: 'var(--scs-charcoal)' }}>{story.name}</span>
                  <span className="text-xs" style={{ color: 'var(--scs-stone)' }}>{story.detail}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* 9. BLOG PREVIEW */}
      {blogPosts.length > 0 && (
        <section className="py-14" style={{ background: 'var(--scs-chalk)', borderTop: '1px solid var(--scs-border)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] mb-3" style={{ color: 'var(--scs-stone)' }}>From the gym</p>
                <h2 className="font-display text-xl sm:text-2xl" style={{ color: 'var(--scs-charcoal)' }}>Recent Posts</h2>
              </div>
              <Link to="/blog" className="text-sm font-semibold hidden sm:flex items-center gap-1 transition-opacity hover:opacity-80" style={{ color: 'var(--scs-charcoal)' }}>
                All posts <ArrowRight size={13} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {blogPosts.map(post => (
                <Link key={post.id} to={`/blog/${post.slug}`} className="group" style={{ background: 'var(--scs-warm-white)', border: '1px solid var(--scs-border)', borderRadius: 'var(--scs-radius)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {post.cover_image && <div className="h-40 overflow-hidden scs-photo"><img src={post.cover_image} alt={post.title} className="w-full h-full object-cover" loading="lazy" /></div>}
                  <div className="p-4 flex flex-col flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--scs-stone)' }}>{post.category}</p>
                    <h3 className="text-sm font-semibold mb-2 group-hover:opacity-80 transition-opacity" style={{ color: 'var(--scs-charcoal)' }}>{(post.title || '').replace(/[\u2013\u2014]/g, ',')}</h3>
                    <p className="text-xs leading-relaxed flex-1" style={{ color: 'var(--scs-text-muted)' }}>{(post.excerpt || '').replace(/[\u2013\u2014]/g, ',').slice(0, 100)}{(post.excerpt || '').length > 100 ? '...' : ''}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 10. MAP AND TOUR FORM */}
      <section className="py-16 sm:py-20" style={{ background: 'var(--scs-charcoal)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="p-6 sm:p-8" style={{ background: 'var(--scs-warm-white)', borderRadius: 'var(--scs-radius)' }}>
              <h2 className="font-display text-xl sm:text-2xl mb-1" style={{ color: 'var(--scs-charcoal)' }}>
                Request Your Free Facility Tour
              </h2>
              <p className="text-sm mb-5" style={{ color: 'var(--scs-text-muted)' }}>
                Fill out the form and a team member will follow up.
              </p>
              <QuizForm source="book_a_tour" noAutoFocus />
            </div>
            <div className="flex flex-col">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center border" style={{ borderColor: 'rgba(232,225,214,0.12)', padding: '2px' }}>
                    <img src={LOGO_URL} alt="" className="w-full h-full object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
                  </div>
                  <div>
                    <p className="font-display-medium text-sm" style={{ color: 'var(--scs-chalk)' }}>Santa Cruz Strength</p>
                    <p className="text-xs" style={{ color: 'var(--scs-stone)' }}>Strength Gym</p>
                  </div>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2" data-testid="contact-address-block">
                    <MapPin size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--scs-stone)' }} />
                    <span className="text-sm" style={{ color: 'var(--scs-chalk)' }}>{GYM_CONFIG.address.full}</span>
                  </li>
                  <li><a href={GYM_CONFIG.phoneHref} data-testid="contact-click-to-call-button" className="flex items-center gap-2 hover:opacity-80 transition-opacity"><Phone size={14} style={{ color: 'var(--scs-stone)' }} /><span className="text-sm" style={{ color: 'var(--scs-chalk)' }}>{GYM_CONFIG.phone}</span></a></li>
                  <li className="flex items-start gap-2" data-testid="contact-hours-block">
                    <Clock size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--scs-stone)' }} />
                    <span className="text-xs" style={{ color: 'var(--scs-stone)' }}>Contact for current staffed hours</span>
                  </li>
                </ul>
              </div>
              <div>
                <a href="https://maps.google.com/?q=151+Harvey+West+Blvd+Ste+D+Santa+Cruz+CA+95060" target="_blank" rel="noopener noreferrer" className="btn-outline px-5 py-2.5 text-sm mb-4 inline-flex items-center gap-2 w-full sm:w-auto justify-center" style={{ borderColor: 'rgba(232,225,214,0.2)', color: 'var(--scs-chalk)' }}>
                  <MapPin size={13} /> Get Directions
                </a>
                <MapEmbed testId="home-map-embed" className="flex-1 min-h-[280px]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14" style={{ background: 'var(--scs-bg)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <h2 className="font-display text-xl sm:text-2xl mb-6" style={{ color: 'var(--scs-charcoal)' }} data-testid="home-faq-accordion">Common Questions</h2>
          <Accordion type="single" collapsible className="space-y-2">
            {FAQ_ITEMS.map(item => (
              <AccordionItem key={item.q} value={item.q} className="px-5" style={{ background: 'var(--scs-warm-white)', border: '1px solid var(--scs-border)', borderRadius: 'var(--scs-radius)' }}>
                <AccordionTrigger className="text-sm font-semibold py-4 hover:no-underline" style={{ color: 'var(--scs-charcoal)' }}>{item.q}</AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed pb-4" style={{ color: 'var(--scs-text-muted)' }}>{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <Footer />
    </div>
  );
}
