import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getStaffContent, updateSiteContent } from '../../lib/api';
import { toast } from 'sonner';
import { ArrowLeft, Save, Loader2, FileText, Type } from 'lucide-react';

const CONTENT_SECTIONS = [
  { label: 'About Page', keys: [
    { key: 'about_headline', label: 'Page Headline', type: 'text' },
    { key: 'about_mission', label: 'Mission Statement', type: 'text' },
    { key: 'about_story', label: 'Our Story', type: 'textarea' },
    { key: 'about_team_headline', label: 'Team Section Headline', type: 'text' },
    { key: 'about_team_subtitle', label: 'Team Section Subtitle', type: 'text' },
    { key: 'about_trainers_headline', label: 'Trainers Section Headline', type: 'text' },
    { key: 'about_trainers_subtitle', label: 'Trainers Section Subtitle', type: 'text' },
    { key: 'about_cta_headline', label: 'CTA Headline', type: 'text' },
    { key: 'about_cta_text', label: 'CTA Description', type: 'textarea' },
  ]},
];

export default function ContentManager() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState({});
  const [original, setOriginal] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});

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

  const handleSaveAll = async () => {
    const changed = Object.keys(content).filter(k => content[k] !== original[k]);
    if (changed.length === 0) { toast('No changes to save'); return; }
    for (const key of changed) {
      await handleSave(key);
    }
    toast.success(`${changed.length} field(s) saved`);
  };

  const hasChanges = Object.keys(content).some(k => content[k] !== original[k]);

  const inputCls = 'w-full bg-white/8 border border-white/12 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 transition-colors';

  return (
    <div style={{ minHeight: '100vh', background: '#0C1420', color: '#F0F4FF' }}>
      <header className="border-b border-white/8 px-4 sm:px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/staff')} className="text-white/50 hover:text-white transition-colors" data-testid="content-back-btn">
              <ArrowLeft size={16} />
            </button>
            <FileText size={16} className="text-emerald-400" />
            <h1 className="text-base font-bold tracking-wide">Content Manager</h1>
          </div>
          <div className="flex items-center gap-3">
            {hasChanges && (
              <button onClick={handleSaveAll} data-testid="save-all-content-btn"
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors duration-200">
                <Save size={13} /> Save All Changes
              </button>
            )}
            <span className="text-white/40 text-xs">{user?.name}</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={20} className="animate-spin text-white/40" />
          </div>
        ) : (
          <div className="space-y-8">
            {CONTENT_SECTIONS.map(section => (
              <div key={section.label}>
                <div className="flex items-center gap-2 mb-4">
                  <Type size={14} className="text-emerald-400" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white/70">{section.label}</h2>
                </div>
                <div className="bg-white/4 border border-white/8 rounded-xl p-5 space-y-4">
                  {section.keys.map(({ key, label, type }) => {
                    const changed = content[key] !== original[key];
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs text-white/50 font-medium">{label}</label>
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
                            rows={4}
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

            <div className="bg-white/4 border border-white/8 rounded-xl p-5">
              <p className="text-xs text-white/40 leading-relaxed">
                Changes are saved individually or all at once. Content updates appear on the public site immediately after saving (no deploy needed for preview, deploy needed for production).
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
