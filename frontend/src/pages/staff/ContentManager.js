import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getStaffContent, updateSiteContent } from '../../lib/api';
import { toast } from 'sonner';
import {
  ArrowLeft, Save, Loader2, FileText, Type, ExternalLink,
  Home, Info, Dumbbell, Phone, ChevronRight,
} from 'lucide-react';

const PAGES = [
  {
    id: 'home', label: 'Home', icon: Home, previewPath: '/',
    sections: [
      { heading: 'Hero Section', keys: [
        { key: 'home_hero_headline', label: 'Hero Headline', type: 'textarea', rows: 3, help: 'Use line breaks for stacked text' },
        { key: 'home_hero_subtitle', label: 'Hero Subtitle', type: 'text' },
        { key: 'home_hero_subtext', label: 'Hero Subtext', type: 'text' },
      ]},
      { heading: 'Benefits Section', keys: [
        { key: 'home_benefits_headline', label: 'Benefits Headline', type: 'text' },
        { key: 'home_benefits_subtitle', label: 'Benefits Subtitle', type: 'text' },
      ]},
      { heading: 'Training Environment', keys: [
        { key: 'home_environment_headline', label: 'Environment Headline', type: 'textarea', rows: 2 },
        { key: 'home_environment_text', label: 'Environment Text', type: 'textarea', rows: 3 },
        { key: 'home_environment_subtext', label: 'Environment Subtext', type: 'text' },
      ]},
      { heading: 'Who Trains Here', keys: [
        { key: 'home_who_headline', label: 'Who Headline', type: 'textarea', rows: 2 },
        { key: 'home_who_text', label: 'Who Text', type: 'text' },
        { key: 'home_who_subtext', label: 'Who Subtext', type: 'text' },
      ]},
    ],
  },
  {
    id: 'about', label: 'About', icon: Info, previewPath: '/about',
    sections: [
      { heading: 'Hero & Story', keys: [
        { key: 'about_headline', label: 'Page Headline', type: 'text' },
        { key: 'about_mission', label: 'Mission Statement', type: 'text' },
        { key: 'about_story', label: 'Our Story', type: 'textarea', rows: 6 },
      ]},
      { heading: 'Team Section', keys: [
        { key: 'about_team_headline', label: 'Team Headline', type: 'text' },
        { key: 'about_team_subtitle', label: 'Team Subtitle', type: 'text' },
      ]},
      { heading: 'Trainers Section', keys: [
        { key: 'about_trainers_headline', label: 'Trainers Headline', type: 'text' },
        { key: 'about_trainers_subtitle', label: 'Trainers Subtitle', type: 'text' },
      ]},
      { heading: 'Call to Action', keys: [
        { key: 'about_cta_headline', label: 'CTA Headline', type: 'text' },
        { key: 'about_cta_text', label: 'CTA Text', type: 'textarea', rows: 2 },
      ]},
    ],
  },
  {
    id: 'training', label: 'Training', icon: Dumbbell, previewPath: '/personal-training',
    sections: [
      { heading: 'Page Content', keys: [
        { key: 'training_headline', label: 'Page Headline', type: 'textarea', rows: 2 },
        { key: 'training_subtitle', label: 'Page Subtitle', type: 'text' },
        { key: 'training_cta_headline', label: 'Bottom CTA Headline', type: 'text' },
      ]},
    ],
  },
  {
    id: 'contact', label: 'Contact', icon: Phone, previewPath: '/contact',
    sections: [
      { heading: 'Page Content', keys: [
        { key: 'contact_headline', label: 'Page Headline', type: 'text' },
        { key: 'contact_subtitle', label: 'Page Subtitle', type: 'text' },
        { key: 'contact_form_headline', label: 'Form Headline', type: 'text' },
        { key: 'contact_form_subtitle', label: 'Form Subtitle', type: 'text' },
      ]},
    ],
  },
];

export default function ContentManager() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState({});
  const [original, setOriginal] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [activeTab, setActiveTab] = useState('home');

  const load = useCallback(async () => {
    try {
      const { data } = await getStaffContent();
      const map = {};
      data.forEach(d => { map[d.key] = d.value; });
      setContent(map);
      setOriginal(map);
    } catch { toast.error('Failed to load content'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleChange = (key, value) => {
    setContent(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (key) => {
    setSaving(prev => ({ ...prev, [key]: true }));
    try {
      await updateSiteContent(key, content[key] || '');
      setOriginal(prev => ({ ...prev, [key]: content[key] }));
      toast.success('Saved');
    } catch { toast.error('Save failed'); }
    finally { setSaving(prev => ({ ...prev, [key]: false })); }
  };

  const activePage = PAGES.find(p => p.id === activeTab);
  const pageKeys = activePage?.sections.flatMap(s => s.keys.map(k => k.key)) || [];
  const pageHasChanges = pageKeys.some(k => content[k] !== original[k]);

  const handleSaveAll = async () => {
    const changed = pageKeys.filter(k => content[k] !== original[k]);
    if (changed.length === 0) { toast('No changes to save'); return; }
    setSaving(prev => ({ ...prev, _all: true }));
    for (const key of changed) {
      try {
        await updateSiteContent(key, content[key] || '');
        setOriginal(prev => ({ ...prev, [key]: content[key] }));
      } catch { toast.error(`Failed to save ${key}`); }
    }
    setSaving(prev => ({ ...prev, _all: false }));
    toast.success(`${changed.length} field(s) saved`);
  };

  const inputCls = 'w-full bg-white/8 border border-white/12 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 transition-colors';

  return (
    <div style={{ minHeight: '100vh', background: '#0C1420', color: '#F0F4FF' }}>
      {/* Header */}
      <header className="border-b border-white/8 px-4 sm:px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/staff')} className="text-white/50 hover:text-white transition-colors" data-testid="content-back-btn">
              <ArrowLeft size={16} />
            </button>
            <FileText size={16} className="text-emerald-400" />
            <h1 className="text-base font-bold tracking-wide">Content Manager</h1>
          </div>
          <div className="flex items-center gap-3">
            {activePage && (
              <Link
                to={activePage.previewPath}
                target="_blank"
                data-testid="preview-page-btn"
                className="flex items-center gap-1.5 text-white/50 hover:text-emerald-400 text-xs font-semibold transition-colors"
              >
                <ExternalLink size={12} /> Preview Page
              </Link>
            )}
            {pageHasChanges && (
              <button onClick={handleSaveAll} disabled={saving._all} data-testid="save-all-content-btn"
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors duration-200">
                {saving._all ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Save All Changes
              </button>
            )}
            <span className="text-white/40 text-xs hidden sm:block">{user?.name}</span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Page Tabs */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
          {PAGES.map(page => {
            const Icon = page.icon;
            const isActive = activeTab === page.id;
            const tabKeys = page.sections.flatMap(s => s.keys.map(k => k.key));
            const hasUnsaved = tabKeys.some(k => content[k] !== original[k]);
            return (
              <button
                key={page.id}
                onClick={() => setActiveTab(page.id)}
                data-testid={`tab-${page.id}`}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                  isActive ? 'bg-white/12 text-white' : 'text-white/45 hover:text-white/75'
                }`}
              >
                <Icon size={14} />
                {page.label}
                {hasUnsaved && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1" />}
              </button>
            );
          })}

          <div className="flex-1" />

          {/* Quick nav to other admin pages */}
          <div className="flex items-center gap-1 border-l border-white/8 pl-3 ml-2">
            <Link to="/staff/team" className="text-white/35 hover:text-white/70 text-xs font-semibold px-2 py-1.5 rounded transition-colors">
              Team
            </Link>
            <Link to="/staff/blog" className="text-white/35 hover:text-white/70 text-xs font-semibold px-2 py-1.5 rounded transition-colors">
              Blog
            </Link>
            <Link to="/staff/events" className="text-white/35 hover:text-white/70 text-xs font-semibold px-2 py-1.5 rounded transition-colors">
              Events
            </Link>
            <Link to="/staff" className="text-white/35 hover:text-white/70 text-xs font-semibold px-2 py-1.5 rounded transition-colors">
              Dashboard
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={20} className="animate-spin text-white/40" />
          </div>
        ) : (
          <div className="space-y-6">
            {activePage?.sections.map(section => (
              <div key={section.heading}>
                <div className="flex items-center gap-2 mb-3">
                  <Type size={13} className="text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white/60">{section.heading}</h3>
                </div>
                <div className="bg-white/4 border border-white/8 rounded-xl p-5 space-y-4">
                  {section.keys.map(({ key, label, type, rows, help }) => {
                    const changed = content[key] !== original[key];
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div>
                            <label className="text-xs text-white/50 font-medium">{label}</label>
                            {help && <span className="text-[10px] text-white/25 ml-2">{help}</span>}
                          </div>
                          {changed && (
                            <button onClick={() => handleSave(key)} disabled={saving[key]}
                              className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-xs font-semibold transition-colors">
                              {saving[key] ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
                              Save
                            </button>
                          )}
                        </div>
                        {type === 'textarea' ? (
                          <textarea
                            data-testid={`content-${key}`}
                            value={content[key] || ''}
                            onChange={e => handleChange(key, e.target.value)}
                            className={`${inputCls} resize-none`}
                            rows={rows || 3}
                          />
                        ) : (
                          <input
                            data-testid={`content-${key}`}
                            value={content[key] || ''}
                            onChange={e => handleChange(key, e.target.value)}
                            className={inputCls}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Preview + Admin Nav */}
            <div className="flex items-center justify-between bg-white/4 border border-white/8 rounded-xl px-5 py-4">
              <p className="text-xs text-white/35">
                Changes appear immediately in preview. Deploy to push to production.
              </p>
              {activePage && (
                <Link
                  to={activePage.previewPath}
                  target="_blank"
                  className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 text-xs font-bold transition-colors"
                >
                  <ExternalLink size={12} /> Open {activePage.label} Page
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
