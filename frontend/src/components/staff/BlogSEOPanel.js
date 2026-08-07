import React, { useState, useMemo, useCallback } from 'react';
import {
  CheckCircle2, XCircle, AlertCircle, TrendingUp,
  Lightbulb, Search, BookOpen, ArrowRight, ChevronDown, ChevronUp,
  RefreshCw, Loader2, Zap
} from 'lucide-react';
import { generateBlogIdeas } from '../../lib/api';

// ─── SEO SCORING ────────────────────────────────────────────────────────────

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function wordCount(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function countH2s(html) {
  return (html.match(/<h2[^>]*>/gi) || []).length;
}

function keywordDensity(text, keyword) {
  if (!keyword || !text) return 0;
  const words = text.toLowerCase().split(/\s+/);
  const kw = keyword.toLowerCase();
  const matches = words.filter(w => w.includes(kw)).length;
  return words.length > 0 ? (matches / words.length) * 100 : 0;
}

function scorePost(form, focusKeyword) {
  const kw = focusKeyword.trim().toLowerCase();
  const title = (form.title || '').trim();
  const desc = (form.seo_description || form.excerpt || '').trim();
  const contentText = stripHtml(form.content || '');
  const slug = (form.slug || '').toLowerCase();
  const wc = wordCount(contentText);
  const h2Count = countH2s(form.content || '');
  const kwDensity = keywordDensity(contentText, kw);

  const checks = [
    {
      id: 'title_length',
      label: 'Title length (50-60 chars)',
      score: title.length >= 50 && title.length <= 65 ? 10 : title.length >= 35 ? 5 : 0,
      max: 10,
      pass: title.length >= 50 && title.length <= 65,
      warn: title.length > 0 && (title.length < 50 || title.length > 65),
      detail: title.length ? `${title.length} chars ${title.length < 50 ? ' - too short' : title.length > 65 ? ' - too long' : '✓'}` : 'No title yet',
    },
    {
      id: 'title_kw',
      label: 'Focus keyword in title',
      score: kw && title.toLowerCase().includes(kw) ? 10 : 0,
      max: 10,
      pass: kw && title.toLowerCase().includes(kw),
      warn: !!kw && !title.toLowerCase().includes(kw),
      detail: kw ? (title.toLowerCase().includes(kw) ? `"${kw}" found in title` : `"${kw}" not in title`) : 'Set a focus keyword',
    },
    {
      id: 'desc_length',
      label: 'Meta description (150-160 chars)',
      score: desc.length >= 140 && desc.length <= 165 ? 10 : desc.length >= 100 ? 5 : 0,
      max: 10,
      pass: desc.length >= 140 && desc.length <= 165,
      warn: desc.length > 0 && (desc.length < 140 || desc.length > 165),
      detail: desc.length ? `${desc.length} chars ${desc.length < 140 ? ' - too short' : desc.length > 165 ? ' - too long' : '✓'}` : 'No description yet',
    },
    {
      id: 'desc_kw',
      label: 'Focus keyword in description',
      score: kw && desc.toLowerCase().includes(kw) ? 5 : 0,
      max: 5,
      pass: kw && desc.toLowerCase().includes(kw),
      warn: !!kw && !desc.toLowerCase().includes(kw),
      detail: kw ? (desc.toLowerCase().includes(kw) ? 'Found in description' : 'Missing from description') : 'Set a focus keyword',
    },
    {
      id: 'word_count',
      label: 'Content length (800+ words recommended)',
      score: wc >= 1000 ? 20 : wc >= 700 ? 15 : wc >= 400 ? 10 : wc >= 200 ? 5 : 0,
      max: 20,
      pass: wc >= 800,
      warn: wc > 0 && wc < 800,
      detail: wc > 0 ? `${wc} words ${wc < 400 ? ' - needs more content' : wc < 800 ? ' - good, aim for 800+' : '✓'}` : 'No content yet',
    },
    {
      id: 'headings',
      label: 'Uses H2 headings in content',
      score: h2Count >= 2 ? 10 : h2Count === 1 ? 5 : 0,
      max: 10,
      pass: h2Count >= 2,
      warn: h2Count === 1,
      detail: `${h2Count} H2 heading${h2Count !== 1 ? 's' : ''} found ${h2Count < 2 ? ' - add <h2> section headers' : '✓'}`,
    },
    {
      id: 'kw_density',
      label: 'Keyword density (1-3%)',
      score: kw && kwDensity >= 0.8 && kwDensity <= 3.5 ? 10 : kw && kwDensity > 0 ? 5 : 0,
      max: 10,
      pass: kw && kwDensity >= 0.8 && kwDensity <= 3.5,
      warn: kw && (kwDensity < 0.8 || kwDensity > 3.5),
      detail: kw ? `${kwDensity.toFixed(1)}% density ${kwDensity < 0.8 ? ' - use keyword more' : kwDensity > 3.5 ? ' - keyword stuffing risk' : '✓'}` : 'Set a focus keyword',
    },
    {
      id: 'slug_kw',
      label: 'Focus keyword in URL slug',
      score: kw && slug.includes(kw.replace(/\s+/g, '-')) ? 5 : 0,
      max: 5,
      pass: kw && slug.includes(kw.replace(/\s+/g, '-')),
      warn: !!kw && !slug.includes(kw.replace(/\s+/g, '-')),
      detail: kw ? (slug.includes(kw.replace(/\s+/g, '-')) ? 'Keyword in slug ✓' : 'Keyword missing from slug') : 'Set a focus keyword',
    },
    {
      id: 'cover_image',
      label: 'Cover image set',
      score: form.cover_image ? 10 : 0,
      max: 10,
      pass: !!form.cover_image,
      warn: false,
      detail: form.cover_image ? 'Cover image set ✓' : 'No cover image - images improve click-through rate',
    },
  ];

  const total = checks.reduce((sum, c) => sum + c.score, 0);
  const maxTotal = checks.reduce((sum, c) => sum + c.max, 0);
  return { checks, total, maxTotal, percent: Math.round((total / maxTotal) * 100) };
}

function ScoreRing({ percent }) {
  const color = percent >= 75 ? '#1B7A4A' : percent >= 50 ? '#F59E0B' : '#EF4444';
  const label = percent >= 75 ? 'Good' : percent >= 50 ? 'Needs work' : 'Poor';
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
          <circle cx="18" cy="18" r="15.9" fill="none" stroke={color} strokeWidth="3"
            strokeDasharray={`${percent} ${100 - percent}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white font-bold text-lg leading-none">{percent}</span>
        </div>
      </div>
      <span className="text-xs font-semibold" style={{ color }}>{label}</span>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

const CATEGORY_COLORS = {
  'Local SEO':       'bg-[#1B7A4A]/12 text-[#7FCCA6] border-[#1B7A4A]/20',
  'Outdoor Athletes':'bg-[#2E6B8F]/15 text-[#8BC4DF] border-[#2E6B8F]/20',
  'How-To':          'bg-emerald-500/12 text-emerald-300 border-emerald-500/18',
  'FAQ Content':     'bg-purple-500/12 text-purple-300 border-purple-500/18',
  'Gym Culture':     'bg-amber-500/12 text-amber-300 border-amber-500/18',
  'Trending':        'bg-pink-500/12 text-pink-300 border-pink-500/18',
  'Seasonal':        'bg-white/8 text-white/75 border-white/12',
};

const DEFAULT_CATEGORY_COLOR = 'bg-white/8 text-white/55 border-white/12';

export default function BlogSEOPanel({ form }) {
  const [activeTab, setActiveTab]       = useState('audit');
  const [focusKeyword, setFocusKeyword] = useState('');
  const [expandedCat, setExpandedCat]   = useState(null);

  // Dynamic ideas state
  const [dynamicIdeas, setDynamicIdeas] = useState(null);
  const [trendsUsed, setTrendsUsed]     = useState([]);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [ideasError, setIdeasError]     = useState('');
  const [fromCache, setFromCache]       = useState(false);
  const [generatedAt, setGeneratedAt]   = useState('');

  const seo = useMemo(() => scorePost(form, focusKeyword), [form, focusKeyword]);

  const fetchIdeas = useCallback(async (force = false) => {
    setIdeasLoading(true);
    setIdeasError('');
    try {
      const { data } = await generateBlogIdeas(force);
      setDynamicIdeas(data.ideas || []);
      setTrendsUsed(data.trends_used || []);
      setFromCache(data.cached || false);
      setGeneratedAt(data.generated_at || '');
      if (data.ideas?.length) setExpandedCat(data.ideas[0].category);
    } catch (e) {
      setIdeasError(e.response?.data?.detail || e.message || 'Something went wrong');
    } finally {
      setIdeasLoading(false);
    }
  }, []);

  // Group dynamic ideas by category
  const groupedIdeas = useMemo(() => {
    if (!dynamicIdeas) return null;
    const map = {};
    dynamicIdeas.forEach(idea => {
      const cat = idea.category || 'General';
      if (!map[cat]) map[cat] = [];
      map[cat].push(idea);
    });
    return Object.entries(map).map(([category, ideas]) => ({ category, ideas }));
  }, [dynamicIdeas]);

  const CheckIcon = ({ check }) => {
    if (check.pass) return <CheckCircle2 size={14} className="text-[#1B7A4A] shrink-0" />;
    if (check.warn) return <AlertCircle size={14} className="text-amber-400 shrink-0" />;
    return <XCircle size={14} className="text-red-400/60 shrink-0" />;
  };

  return (
    <div className="card-marketing overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-white/8">
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors duration-200 ${
            activeTab === 'audit'
              ? 'text-white border-b-2 border-[#1B7A4A] bg-[#1B7A4A]/8'
              : 'text-white/45 hover:text-white'
          }`}
        >
          <Search size={12} /> SEO Audit
        </button>
        <button
          onClick={() => setActiveTab('ideas')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors duration-200 ${
            activeTab === 'ideas'
              ? 'text-white border-b-2 border-[#1B7A4A] bg-[#1B7A4A]/8'
              : 'text-white/45 hover:text-white'
          }`}
        >
          <Lightbulb size={12} /> Article Ideas
        </button>
      </div>

      {/* SEO AUDIT TAB */}
      {activeTab === 'audit' && (
        <div className="p-4 space-y-4">
          {/* Score */}
          <div className="flex items-center gap-4">
            <ScoreRing percent={seo.percent} />
            <div className="flex-1">
              <p className="text-white text-sm font-semibold mb-1">SEO Score</p>
              <div className="w-full bg-white/8 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${seo.percent}%`,
                    backgroundColor: seo.percent >= 75 ? '#1B7A4A' : seo.percent >= 50 ? '#F59E0B' : '#EF4444'
                  }}
                />
              </div>
              <p className="text-white/42 text-xs mt-1">{seo.total}/{seo.maxTotal} points</p>
            </div>
          </div>

          {/* Focus keyword */}
          <div>
            <label className="block text-xs text-white/55 mb-1.5">Focus Keyword</label>
            <input
              value={focusKeyword}
              onChange={(e) => setFocusKeyword(e.target.value)}
              placeholder="e.g. strength gym Santa Cruz"
              className="w-full bg-white/5 border border-white/12 text-white placeholder:text-white/28 rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-white/35"
            />
          </div>

          {/* Checklist */}
          <div className="space-y-2">
            {seo.checks.map((check) => (
              <div key={check.id} className="flex items-start gap-2">
                <CheckIcon check={check} />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${
                    check.pass ? 'text-white/80' : check.warn ? 'text-amber-300/80' : 'text-white/45'
                  }`}>{check.label}</p>
                  <p className="text-white/35 text-[10px] mt-0.5 leading-relaxed">{check.detail}</p>
                </div>
                <span className="text-[10px] text-white/28 shrink-0">{check.score}/{check.max}</span>
              </div>
            ))}
          </div>

          {/* Tips */}
          <div className="border-t border-white/8 pt-3">
            <p className="text-white/38 text-[10px] leading-relaxed">
              <strong className="text-white/55">Tip:</strong> Aim for 800+ words, 2+ H2 headings, and include your keyword naturally in the first paragraph. Don't force it.
            </p>
          </div>
        </div>
      )}

      {/* IDEAS TAB */}
      {activeTab === 'ideas' && (
        <div>
          {/* Header + Refresh button */}
          <div className="px-4 pt-4 pb-3 border-b border-white/8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-white/85 text-xs font-semibold">AI-Generated Ideas</p>
                  {fromCache && generatedAt && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#1B7A4A]/15 border border-[#1B7A4A]/25 text-[#7FCCA6]/70">
                      ⚡ cached
                    </span>
                  )}
                </div>
                <p className="text-white/38 text-[10px] leading-relaxed">
                  {fromCache
                    ? 'Showing recent ideas - hit Refresh to pull fresh trends.'
                    : 'Pulls live Google Trends + AI generates ideas tailored to SCS.'}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Generate / load from cache */}
                <button
                  onClick={() => fetchIdeas(false)}
                  disabled={ideasLoading}
                  data-testid="blog-refresh-ideas-btn"
                  className="flex items-center gap-1.5 bg-[#1B7A4A]/20 hover:bg-[#1B7A4A]/35 border border-[#1B7A4A]/30 text-[#7FCCA6] text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {ideasLoading
                    ? <><Loader2 size={11} className="animate-spin" /> Loading…</>
                    : dynamicIdeas ? '⚡ Load' : 'Generate Ideas'
                  }
                </button>
                {/* Force fresh generation */}
                {dynamicIdeas && !ideasLoading && (
                  <button
                    onClick={() => fetchIdeas(true)}
                    title="Generate fresh ideas (ignores cache)"
                    className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/12 text-white/45 text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all duration-200"
                  >
                    <RefreshCw size={10} /> Fresh
                  </button>
                )}
              </div>
            </div>

            {/* Trends used chips */}
            {trendsUsed.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Zap size={10} className="text-amber-400" />
                  <span className="text-[9px] text-white/35 font-semibold uppercase tracking-wider">Trending right now</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {trendsUsed.slice(0, 10).map((t, i) => (
                    <span key={i} className="bg-white/5 border border-white/10 text-white/42 text-[9px] px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {ideasError && (
            <div className="mx-4 mt-3 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <p className="text-red-300 text-[10px]">{ideasError}</p>
            </div>
          )}

          {/* Empty / not loaded state */}
          {!dynamicIdeas && !ideasLoading && !ideasError && (
            <div className="px-4 py-10 flex flex-col items-center gap-3 text-center">
              <div className="w-10 h-10 bg-[#1B7A4A]/15 rounded-full flex items-center justify-center">
                <Lightbulb size={18} className="text-[#7FCCA6]" />
              </div>
              <p className="text-white/55 text-xs max-w-[180px] leading-relaxed">
                Hit <strong className="text-white/75">Generate Ideas</strong> to get fresh blog ideas from live trends.
              </p>
            </div>
          )}

          {/* Loading skeleton */}
          {ideasLoading && (
            <div className="px-4 py-4 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white/3 border border-white/7 rounded-lg p-3 animate-pulse">
                  <div className="h-3 bg-white/10 rounded w-3/4 mb-2" />
                  <div className="h-2 bg-white/6 rounded w-1/2 mb-3" />
                  <div className="space-y-1">
                    <div className="h-2 bg-white/5 rounded w-full" />
                    <div className="h-2 bg-white/5 rounded w-5/6" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Dynamic results grouped by category */}
          {groupedIdeas && !ideasLoading && (
            <div className="divide-y divide-white/6">
              {groupedIdeas.map((cat) => (
                <div key={cat.category}>
                  <button
                    onClick={() => setExpandedCat(expandedCat === cat.category ? '' : cat.category)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/3 transition-colors duration-200"
                  >
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${CATEGORY_COLORS[cat.category] || DEFAULT_CATEGORY_COLOR}`}>
                      {cat.category}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-white/30 text-xs">{cat.ideas.length} ideas</span>
                      {expandedCat === cat.category
                        ? <ChevronUp size={13} className="text-white/38" />
                        : <ChevronDown size={13} className="text-white/38" />}
                    </div>
                  </button>
                  {expandedCat === cat.category && (
                    <div className="px-4 pb-3 space-y-3">
                      {cat.ideas.map((idea, i) => (
                        <div key={i} className="bg-white/3 border border-white/7 rounded-lg p-3">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="text-white/85 text-xs font-medium leading-snug flex-1">{idea.title}</p>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border shrink-0 ${
                              idea.volume === 'High'
                                ? 'bg-[#1B7A4A]/15 text-[#7FCCA6] border-[#1B7A4A]/20'
                                : idea.volume === 'Medium'
                                ? 'bg-amber-500/12 text-amber-300 border-amber-500/18'
                                : 'bg-white/8 text-white/42 border-white/10'
                            }`}>
                              {idea.volume}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mb-1.5">
                            <Search size={10} className="text-white/28" />
                            <span className="text-white/35 text-[10px] italic">{idea.keyword}</span>
                          </div>
                          {idea.trend_hook && (
                            <div className="flex items-start gap-1 mb-2">
                              <Zap size={10} className="text-amber-400/60 shrink-0 mt-0.5" />
                              <span className="text-amber-300/60 text-[9px] leading-snug">{idea.trend_hook}</span>
                            </div>
                          )}
                          {idea.outline && (
                            <ul className="space-y-0.5">
                              {idea.outline.map((point, j) => (
                                <li key={j} className="text-white/42 text-[10px] flex items-start gap-1">
                                  <span className="text-[#1B7A4A]/60 shrink-0">•</span>
                                  {point}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
