import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  ArrowLeft, Play, Pause, Plus, Loader2, CheckCircle2,
  Clock, Mail, MessageSquare, Users, BarChart2, Zap, RefreshCw, Pencil, Eye, X
} from 'lucide-react';
import { toast } from 'sonner';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';
const JOIN_URL = 'https://onlinejoin.abcfitness.com/signup/plan?club=31691';

const SUBJECTS_DEFAULT = [
  "We've been thinking about you.",
  "Your spot's still here.",
  "Come back and train with us.",
];

const STATUS_STYLES = {
  draft:     'bg-white/8 text-white/45 border-white/12',
  active:    'bg-[#1B7A4A]/20 text-[#7FCCA6] border-[#1B7A4A]/30',
  paused:    'bg-amber-500/15 text-amber-300 border-amber-500/25',
  completed: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
};

function ProgressBar({ value, max, color = '#1B7A4A' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="w-full bg-white/8 rounded-full h-2 overflow-hidden">
      <div className="h-2 rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function CampaignManager() {
  const { user } = useAuth();
  const token = localStorage.getItem('scs_token');
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [creating, setCreating]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [selected, setSelected]   = useState(null);
  const [detail, setDetail]       = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // New campaign form
  const [form, setForm] = useState({
    name: 'Iron Roses Re-engagement 2026',
    batch_size_per_day: 70,
    send_email: true,
    send_sms: true,
    join_url: JOIN_URL,
    tag_filter: 'imported',
    source_filter: 'csv_import',
    status_filter: [],          // [] = all statuses
    interest_filter: '',        // '' = all interests
    wave2_delay_days: 7,
    wave3_delay_days: 14,
  });
  const [previewCount, setPreviewCount] = useState(null);
  const [countLoading, setCountLoading] = useState(false);

  const STATUSES = ['New', 'Contacted', 'Attempted Call', 'Texted', 'Booked Visit', 'No Response'];
  const SOURCES  = ['csv_import', 'website_form', 'walk_in', 'manual_entry', 'book_a_tour', 'contact_page'];
  const INTERESTS = ['General Membership', 'Personal Training', 'Group Classes', 'Open Gym', 'Powerlifting Program'];

  const fetchPreviewCount = async (f = form) => {
    setCountLoading(true);
    try {
      const params = new URLSearchParams({
        tag: f.tag_filter || '',
        source: f.source_filter || '',
        interest: f.interest_filter || '',
        statuses: (f.status_filter || []).join(','),
      });
      const res = await fetch(`${BACKEND}/api/staff/campaigns/preview-count?${params}`, { headers });
      if (res.ok) { const d = await res.json(); setPreviewCount(d.count); }
    } catch (err) { console.error('Failed to fetch preview count:', err); }
    finally { setCountLoading(false); }
  };

  const fetchCampaigns = async () => {
    try {
      const res = await fetch(`${BACKEND}/api/staff/campaigns`, { headers });
      if (res.ok) setCampaigns(await res.json());
    } catch (err) { console.error('Failed to fetch campaigns:', err); }
    finally { setLoading(false); }
  };

  const fetchDetail = async (id) => {
    const res = await fetch(`${BACKEND}/api/staff/campaigns/${id}`, { headers });
    if (res.ok) setDetail(await res.json());
  };

  useEffect(() => { fetchCampaigns(); }, []);
  useEffect(() => { if (selected) fetchDetail(selected); }, [selected]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${BACKEND}/api/staff/campaigns`, {
        method: 'POST', headers, body: JSON.stringify({ ...form, subject_options: SUBJECTS_DEFAULT }),
      });
      if (!res.ok) throw new Error('Failed');
      toast.success('Campaign created');
      await fetchCampaigns();
      setCreating(false);
    } catch { toast.error('Failed to create campaign'); }
    finally { setSaving(false); }
  };

  const handleStart = async (id) => {
    const res = await fetch(`${BACKEND}/api/staff/campaigns/${id}/start`, { method: 'POST', headers });
    const data = await res.json().catch(() => ({}));
    if (res.ok) { toast.success(data.message || 'Campaign started — first batch sending now'); await fetchCampaigns(); fetchDetail(id); }
    else { toast.error(data.detail || 'Failed to start'); }
  };

  const handlePause = async (id) => {
    const res = await fetch(`${BACKEND}/api/staff/campaigns/${id}/pause`, { method: 'POST', headers });
    if (res.ok) { toast.success('Campaign paused'); await fetchCampaigns(); fetchDetail(id); }
  };

  const inputCls = 'w-full bg-white/5 border border-white/12 text-white placeholder:text-white/35 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B7A4A]/50';
  const labelCls = 'block text-xs text-white/55 mb-1.5 font-semibold uppercase tracking-wider';

  return (
    <div className="min-h-screen bg-[var(--ink)] px-4 py-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to="/staff/dashboard" className="text-white/40 hover:text-white transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="font-display text-2xl text-white tracking-wide">CAMPAIGNS</h1>
              <p className="text-white/35 text-xs mt-0.5">Staggered email + SMS re-engagement</p>
            </div>
          </div>
          <button onClick={() => setCreating(true)}
            className="btn-scs-primary flex items-center gap-2 px-4 py-2 text-sm rounded-lg"
            data-testid="new-campaign-btn">
            <Plus size={14} /> New Campaign
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Campaign list */}
          <div className="lg:col-span-2 space-y-3">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 size={22} className="animate-spin text-white/30" /></div>
            ) : campaigns.length === 0 ? (
              <div className="card-marketing p-8 text-center">
                <Mail size={32} className="text-white/15 mx-auto mb-3" />
                <p className="text-white/35 text-sm font-semibold">No campaigns yet</p>
                <p className="text-white/20 text-xs mt-1">Create your first re-engagement campaign</p>
              </div>
            ) : (
              campaigns.map(c => {
                const pct = c.total_leads > 0 ? Math.round(((c.sent_count || 0) / c.total_leads) * 100) : 0;
                return (
                  <button key={c.id} onClick={() => setSelected(c.id)}
                    className={`w-full text-left card-marketing p-4 transition-all duration-150 ${selected === c.id ? 'border-[#1B7A4A]/50 ring-1 ring-[#1B7A4A]/30' : 'hover:border-white/15'}`}
                    data-testid={`campaign-${c.id}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-white font-semibold text-sm leading-snug">{c.name}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${STATUS_STYLES[c.status] || STATUS_STYLES.draft}`}>
                        {c.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white/35 mb-2">
                      <span className="flex items-center gap-1"><Users size={10} /> {c.total_leads} leads</span>
                      <span className="flex items-center gap-1"><Mail size={10} /> {c.sent_count || 0} sent</span>
                    </div>
                    <ProgressBar value={c.sent_count || 0} max={c.total_leads} />
                    <p className="text-white/25 text-[10px] mt-1.5">{pct}% complete · {c.batch_size_per_day}/day</p>
                  </button>
                );
              })
            )}
          </div>

          {/* Detail pane */}
          <div className="lg:col-span-3">
            {!selected && !creating && (
              <div className="card-marketing p-10 text-center h-full flex flex-col items-center justify-center">
                <BarChart2 size={36} className="text-white/15 mb-3" />
                <p className="text-white/30 text-sm">Select a campaign to view details</p>
                <p className="text-white/20 text-xs mt-1">or create a new one</p>
              </div>
            )}

            {/* CREATE FORM */}
            {creating && (
              <div className="card-marketing p-6">
                <h2 className="font-display text-xl text-white tracking-wide mb-5">NEW CAMPAIGN</h2>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className={labelCls}>Campaign Name</label>
                    <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      className={inputCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Emails per Day</label>
                      <input type="number" min="1" max="500" value={form.batch_size_per_day}
                        onChange={e => setForm(p => ({ ...p, batch_size_per_day: parseInt(e.target.value) }))}
                        className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Tag Filter</label>
                      <input value={form.tag_filter} onChange={e => setForm(p => ({ ...p, tag_filter: e.target.value }))}
                        className={inputCls} placeholder="imported" />
                    </div>
                  </div>

                  {/* Segmentation */}
                  <div className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-white/50 text-xs font-bold uppercase tracking-wider">Audience Segmentation</p>
                      <button type="button" onClick={() => fetchPreviewCount(form)}
                        className="text-[10px] text-[#7FCCA6] bg-[#1B7A4A]/15 px-2.5 py-1 rounded-full border border-[#1B7A4A]/25 hover:bg-[#1B7A4A]/25 transition-colors">
                        {countLoading ? '...' : previewCount !== null ? `${previewCount} leads match` : 'Preview count'}
                      </button>
                    </div>
                    <div>
                      <label className="block text-[10px] text-white/40 mb-1.5 font-semibold uppercase tracking-wider">Lead Source</label>
                      <select value={form.source_filter} onChange={e => setForm(p => ({ ...p, source_filter: e.target.value }))}
                        className={inputCls + ' appearance-none text-xs'} style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <option value="" style={{ background: '#111f16' }}>All sources</option>
                        {SOURCES.map(s => <option key={s} value={s} style={{ background: '#111f16' }}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-white/40 mb-1.5 font-semibold uppercase tracking-wider">Interest Type</label>
                      <select value={form.interest_filter} onChange={e => setForm(p => ({ ...p, interest_filter: e.target.value }))}
                        className={inputCls + ' appearance-none text-xs'} style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <option value="" style={{ background: '#111f16' }}>All interests</option>
                        {INTERESTS.map(s => <option key={s} value={s} style={{ background: '#111f16' }}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-white/40 mb-1.5 font-semibold uppercase tracking-wider">Lead Status (leave empty = all)</label>
                      <div className="flex flex-wrap gap-1.5">
                        {STATUSES.map(s => (
                          <button type="button" key={s}
                            onClick={() => setForm(p => ({
                              ...p,
                              status_filter: p.status_filter.includes(s)
                                ? p.status_filter.filter(x => x !== s)
                                : [...p.status_filter, s]
                            }))}
                            className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold transition-all duration-150 ${
                              form.status_filter.includes(s)
                                ? 'bg-[#1B7A4A] border-[#1B7A4A] text-white'
                                : 'bg-white/5 border-white/12 text-white/40 hover:border-white/25'
                            }`}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Follow-up (Wave 2) — days</label>
                      <input type="number" min="1" value={form.wave2_delay_days}
                        onChange={e => setForm(p => ({ ...p, wave2_delay_days: parseInt(e.target.value) }))}
                        className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Final (Wave 3) — days</label>
                      <input type="number" min="1" value={form.wave3_delay_days}
                        onChange={e => setForm(p => ({ ...p, wave3_delay_days: parseInt(e.target.value) }))}
                        className={inputCls} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[['send_email', 'Send Email'], ['send_sms', 'Send SMS']].map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                        <div onClick={() => setForm(p => ({ ...p, [key]: !p[key] }))}
                          className={`w-8 h-4 rounded-full transition-all duration-150 relative ${form[key] ? 'bg-[#1B7A4A]' : 'bg-white/15'}`}>
                          <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all duration-150 ${form[key] ? 'left-4' : 'left-0.5'}`} />
                        </div>
                        <span className={`text-sm font-semibold ${form[key] ? 'text-[#7FCCA6]' : 'text-white/35'}`}>{label}</span>
                      </label>
                    ))}
                  </div>

                  {/* Preview subject lines */}
                  <div className="bg-white/3 border border-white/8 rounded-xl p-4">
                    <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Subject lines (A/B rotated)</p>
                    {SUBJECTS_DEFAULT.map((s, i) => (
                      <p key={i} className="text-white/60 text-xs py-1 border-b border-white/5 last:border-0">
                        {i + 1}. "{s}"
                      </p>
                    ))}
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setCreating(false)}
                      className="flex-1 btn-scs-secondary py-2.5 rounded-lg text-sm">Cancel</button>
                    <button type="submit" disabled={saving}
                      className="flex-1 btn-scs-primary py-2.5 rounded-lg text-sm flex items-center justify-center gap-2">
                      {saving ? <><Loader2 size={13} className="animate-spin" /> Creating...</> : 'Create Campaign'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* DETAIL VIEW */}
            {selected && detail && !creating && (
              <div className="card-marketing p-6 space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-white text-lg">{detail.name}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[detail.status]}`}>
                        {detail.status}
                      </span>
                      <span className="text-white/35 text-xs">{detail.batch_size_per_day} emails/day · 10 AM PT</span>
                    </div>
                  </div>
                  <button onClick={() => fetchDetail(selected)}
                    className="text-white/30 hover:text-white p-1.5 rounded transition-colors">
                    <RefreshCw size={14} />
                  </button>
                </div>

                {/* Progress */}
                <div className="bg-white/4 border border-white/8 rounded-xl p-4 space-y-3">
                  {[
                    { label: 'Wave 1 — Initial', sent: detail.wave1_sent, total: detail.total_leads, color: '#1B7A4A' },
                    { label: 'Wave 2 — Follow-up (day ' + detail.wave2_delay_days + ')', sent: detail.wave2_sent, total: detail.wave1_sent, color: '#F59E0B' },
                    { label: 'Wave 3 — Final (day ' + detail.wave3_delay_days + ')', sent: detail.wave3_sent, total: detail.wave2_sent, color: '#FA5A5C' },
                  ].map(w => (
                    <div key={w.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/55 font-semibold">{w.label}</span>
                        <span className="text-white/40">{w.sent || 0} / {w.total || 0}</span>
                      </div>
                      <ProgressBar value={w.sent || 0} max={w.total || 1} color={w.color} />
                    </div>
                  ))}
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Total Leads', value: detail.total_leads, icon: <Users size={14} /> },
                    { label: 'Wave 1 Sent', value: detail.wave1_sent || 0, icon: <Mail size={14} /> },
                    { label: 'Days Left', value: Math.max(0, Math.ceil(((detail.total_leads || 0) - (detail.wave1_sent || 0)) / (detail.batch_size_per_day || 70))), icon: <Clock size={14} /> },
                  ].map(s => (
                    <div key={s.label} className="bg-white/4 border border-white/8 rounded-xl p-3 text-center">
                      <div className="text-white/35 flex justify-center mb-1">{s.icon}</div>
                      <p className="text-white font-bold text-xl">{s.value}</p>
                      <p className="text-white/35 text-[10px] mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Waves summary */}
                <div className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-2">
                  <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-3">3-Wave Flow</p>
                  {[
                    { wave: 'Wave 1', desc: 'Iron Roses re-engagement + 2 months free offer', day: 'Day 0', subjects: '"We\'ve been thinking about you." / "Your spot\'s still here."' },
                    { wave: 'Wave 2', desc: '"Last chance" follow-up', day: `Day ${detail.wave2_delay_days}` },
                    { wave: 'Wave 3', desc: '"We saved your spot" final message', day: `Day ${detail.wave3_delay_days}` },
                  ].map(w => (
                    <div key={w.wave} className="flex items-start gap-3 py-2 border-b border-white/6 last:border-0">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-white/8 rounded-full text-white/50 shrink-0 mt-0.5">{w.day}</span>
                      <div>
                        <p className="text-white/70 text-xs font-semibold">{w.wave} — {w.desc}</p>
                        {w.subjects && <p className="text-white/30 text-[10px] mt-0.5">{w.subjects}</p>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  {detail.status === 'draft' && (
                    <>
                      <Link to={`/staff/campaigns/builder/${detail.id}`}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-white/6 border border-white/12 text-white/70 hover:text-white text-sm font-semibold transition-colors">
                        <Mail size={14} /> Email
                      </Link>
                      <Link to={`/staff/campaigns/sms/${detail.id}`}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-purple-500/15 border border-purple-500/25 text-purple-300 hover:bg-purple-500/25 text-sm font-semibold transition-colors">
                        <MessageSquare size={14} />
                      </Link>
                      <button onClick={() => setPreviewOpen(true)}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-amber-500/15 border border-amber-500/25 text-amber-300 hover:bg-amber-500/25 text-sm font-semibold transition-colors">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => handleStart(detail.id)}
                        className="flex-1 btn-scs-primary py-3 rounded-lg text-sm flex items-center justify-center gap-2">
                        <Play size={14} /> Start
                      </button>
                    </>
                  )}
                  {detail.status === 'active' && (
                    <button onClick={() => handlePause(detail.id)}
                      className="flex-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 font-bold py-3 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors">
                      <Pause size={14} /> Pause
                    </button>
                  )}
                  {detail.status === 'paused' && (
                    <>
                      <Link to={`/staff/campaigns/builder/${detail.id}`}
                        className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-white/6 border border-white/12 text-white/70 hover:text-white text-sm font-semibold transition-colors">
                        <Pencil size={14} />
                      </Link>
                      <button onClick={() => handleStart(detail.id)}
                        className="flex-1 btn-scs-primary py-3 rounded-lg text-sm flex items-center justify-center gap-2">
                        <Play size={14} /> Resume
                      </button>
                    </>
                  )}
                  {detail.status === 'completed' && (
                    <div className="flex-1 flex items-center justify-center gap-2 py-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm font-bold">
                      <CheckCircle2 size={14} /> Campaign Completed
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Campaign Preview Modal */}
      {previewOpen && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setPreviewOpen(false)} />
          <div className="relative bg-[#0f1a14] border border-white/12 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
              <div>
                <h3 className="text-white font-bold">Campaign Preview</h3>
                <p className="text-white/35 text-xs mt-0.5">{detail.name}</p>
              </div>
              <button onClick={() => setPreviewOpen(false)} className="text-white/40 hover:text-white"><X size={18} /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              {/* Email preview */}
              <div>
                <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">📧 Email</p>
                {detail.email_html_template ? (
                  <>
                    <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 mb-2">
                      <p className="text-white/40 text-[10px]">Subject (A/B rotated)</p>
                      {(detail.subject_options || []).map((s, i) => (
                        <p key={i} className="text-white/70 text-xs">{i + 1}. "{s}"</p>
                      ))}
                    </div>
                    <iframe
                      srcDoc={detail.email_html_template
                        .replace(/\{\{first_name\}\}/g, 'Alex')
                        .replace(/\{\{gym_name\}\}/g, 'Santa Cruz Strength')
                        .replace(/\{\{join_url\}\}/g, detail.join_url || '#')
                        .replace(/\{\{gym_phone\}\}/g, '(408) 337-6709')}
                      title="Email Preview" className="w-full rounded-lg border border-white/10"
                      style={{ height: 320, background: '#fff' }} />
                  </>
                ) : (
                  <div className="bg-white/3 border border-white/8 rounded-lg p-6 text-center">
                    <p className="text-white/30 text-sm">No email built yet</p>
                    <Link to={`/staff/campaigns/builder/${detail.id}`} onClick={() => setPreviewOpen(false)}
                      className="text-[#7FCCA6] text-xs underline mt-1 block">→ Open Email Builder</Link>
                  </div>
                )}
              </div>
              {/* SMS preview */}
              <div>
                <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">📱 SMS</p>
                {detail.sms_template ? (
                  <div className="bg-[#1C1C1E] rounded-xl p-4">
                    <p className="text-white/60 text-xs font-mono leading-relaxed whitespace-pre-wrap">
                      {detail.sms_template.replace(/\{\{first_name\}\}/g, 'Alex').replace(/\{\{gym_name\}\}/g, 'Santa Cruz Strength')}
                    </p>
                    <p className="text-white/25 text-[10px] mt-2">{detail.sms_template.length} chars · {Math.ceil(detail.sms_template.length / 160)} segment(s)</p>
                  </div>
                ) : (
                  <div className="bg-white/3 border border-white/8 rounded-lg p-6 text-center">
                    <p className="text-white/30 text-sm">No SMS built yet</p>
                    <Link to={`/staff/campaigns/sms/${detail.id}`} onClick={() => setPreviewOpen(false)}
                      className="text-purple-300 text-xs underline mt-1 block">→ Open SMS Builder</Link>
                  </div>
                )}
              </div>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/8">
                {[
                  { label: 'Recipients', value: detail.total_leads },
                  { label: 'Batch / Day', value: detail.batch_size_per_day },
                  { label: 'Est. Days', value: Math.ceil((detail.total_leads || 0) / (detail.batch_size_per_day || 70)) },
                ].map(s => (
                  <div key={s.label} className="bg-white/4 rounded-xl p-3 text-center">
                    <p className="text-white font-bold text-xl">{s.value || '—'}</p>
                    <p className="text-white/35 text-[10px] mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
            {detail.status === 'draft' && (
              <div className="px-6 py-4 border-t border-white/8 flex gap-3">
                <button onClick={() => setPreviewOpen(false)} className="flex-1 btn-scs-secondary py-3 rounded-lg text-sm">Back to Edit</button>
                <button onClick={() => { setPreviewOpen(false); handleStart(detail.id); }}
                  className="flex-1 btn-scs-primary py-3 rounded-lg text-sm flex items-center justify-center gap-2">
                  <Play size={14} /> Confirm & Start Campaign
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
