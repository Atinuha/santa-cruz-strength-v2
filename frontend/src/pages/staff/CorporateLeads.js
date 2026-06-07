import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { toast } from 'sonner';
import {
  ArrowLeft, Building2, Users, Loader2, Plus, Search, ChevronRight,
  Calendar, Mail, Phone, Clock, FileText, Send, X, Save,
  BarChart2, Briefcase, CheckCircle2, Globe, MapPin, ExternalLink,
  ChevronDown, Zap, Eye, Trash2, ArrowRight, RefreshCw, Copy,
} from 'lucide-react';

const STAGES = [
  'Discovered', 'Queued', 'Email 1 Sent', 'Email 2 Sent', 'Email 3 Sent',
  'Replied', 'Discovery Scheduled', 'Proposal Sent', 'Verbal Yes',
  'Active Corporate Account', 'Lost / Not Now'
];

const STAGE_COLORS = {
  'Discovered': '#64748B', 'Queued': '#3B82F6', 'Email 1 Sent': '#8B5CF6',
  'Email 2 Sent': '#A855F7', 'Email 3 Sent': '#D946EF', 'Replied': '#F59E0B',
  'Discovery Scheduled': '#EC4899', 'Proposal Sent': '#F97316',
  'Verbal Yes': '#10B981', 'Active Corporate Account': '#059669', 'Lost / Not Now': '#6B7280',
};

const CONTRIB_LABELS = {
  'employer_pays_all': 'Employer Pays All', 'employer_pays_part': 'Employer Pays Part',
  'employee_discount': 'Employee Discount', 'not_sure': 'Not Sure Yet',
};

const CATEGORIES = [
  { value: 'cafe', label: 'Coffee Shops' },
  { value: 'restaurant', label: 'Restaurants' },
  { value: 'bar', label: 'Bars / Breweries' },
  { value: 'retail', label: 'Retail Shops' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'office', label: 'Offices' },
  { value: 'school', label: 'Schools' },
];

export default function CorporateLeads() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('pipeline');
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [showProposal, setShowProposal] = useState(false);
  const [proposalForm, setProposalForm] = useState({});
  const [savingProposal, setSavingProposal] = useState(false);

  // Discover state
  const [discoverCat, setDiscoverCat] = useState('cafe');
  const [discoverRadius, setDiscoverRadius] = useState(3000);
  const [discovered, setDiscovered] = useState([]);
  const [discovering, setDiscovering] = useState(false);
  const [selectedBiz, setSelectedBiz] = useState(new Set());

  // Cold email
  const [sendingEmail, setSendingEmail] = useState(null);
  const [bulkSelected, setBulkSelected] = useState(new Set());

  const load = useCallback(async () => {
    try {
      const [lr, sr] = await Promise.all([api.get('/staff/corporate-leads'), api.get('/staff/corporate-leads/stats')]);
      setLeads(lr.data);
      setStats(sr.data);
    } catch (err) { console.error('Load error:', err); toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Discover
  const handleDiscover = async () => {
    setDiscovering(true);
    try {
      const res = await api.get(`/staff/corporate-leads/discover?category=${discoverCat}&radius=${discoverRadius}`);
      setDiscovered(res.data.businesses || []);
      if (res.data.businesses?.length === 0) toast('No new businesses found in this category');
    } catch { toast.error('Discovery failed'); }
    finally { setDiscovering(false); }
  };

  const handleImportBiz = async (biz) => {
    try {
      await api.post('/staff/corporate-leads/import-discovered', { name: biz.name, address: `${biz.address}, ${biz.city}`, phone: biz.phone, website: biz.website, email: biz.email, category: biz.category, lead_source: 'overpass_discovery' });
      toast.success(`${biz.name} added to pipeline`);
      setDiscovered(prev => prev.filter(b => b.name !== biz.name));
      load();
    } catch { toast.error('Import failed'); }
  };

  const handleBulkImport = async () => {
    const toImport = discovered.filter(b => selectedBiz.has(b.name));
    for (const biz of toImport) {
      try {
        await api.post('/staff/corporate-leads/import-discovered', { name: biz.name, address: `${biz.address}, ${biz.city}`, phone: biz.phone, website: biz.website, email: biz.email, category: biz.category, lead_source: 'overpass_discovery' });
      } catch (err) { console.error('Import failed:', err); }
    }
    toast.success(`${toImport.length} businesses imported`);
    setSelectedBiz(new Set());
    setDiscovered(prev => prev.filter(b => !selectedBiz.has(b.name)));
    load();
  };

  // Lead detail
  const loadDetail = async (id) => {
    try { const res = await api.get(`/staff/corporate-leads/${id}`); setDetail(res.data); setSelected(id); } catch { toast.error('Failed to load lead'); }
  };
  const handleStatusChange = async (id, s) => {
    try { await api.put(`/staff/corporate-leads/${id}`, { status: s }); toast.success(`Status: ${s}`); load(); if (selected === id) loadDetail(id); } catch { toast.error('Failed'); }
  };
  const handleAddNote = async () => {
    if (!noteText.trim() || !selected) return;
    setSavingNote(true);
    try { await api.post(`/staff/corporate-leads/${selected}/note`, { note: noteText }); setNoteText(''); toast.success('Note added'); loadDetail(selected); } catch { toast.error('Failed'); }
    finally { setSavingNote(false); }
  };
  const handleSendColdEmail = async (id) => {
    setSendingEmail(id);
    try { const res = await api.post(`/staff/corporate-leads/${id}/send-cold-email`); toast.success(`Email ${res.data.wave} sent to ${res.data.sent_to}`); load(); if (selected === id) loadDetail(id); } catch (err) { toast.error(err.response?.data?.detail || 'Send failed'); }
    finally { setSendingEmail(null); }
  };
  const handleBulkEmail = async () => {
    const ids = [...bulkSelected];
    if (!ids.length) return;
    try { const res = await api.post('/staff/corporate-leads/bulk-action', { lead_ids: ids, action: 'send_next_email' }); toast.success(`${res.data.success} emails sent, ${res.data.failed} failed`); setBulkSelected(new Set()); load(); } catch { toast.error('Bulk send failed'); }
  };
  const openProposal = (lead) => {
    setProposalForm({ company_name: lead.business_name, employee_count: lead.employee_count, estimated_participants: lead.estimated_enrolled, contribution_model: CONTRIB_LABELS[lead.contribution_model] || lead.contribution_model, discount_tier: lead.discount_tier, proposed_monthly_price: '', notes: '' });
    setShowProposal(true);
  };
  const handleGenerateProposal = async () => {
    if (!selected) return;
    setSavingProposal(true);
    try { await api.post(`/staff/corporate-leads/${selected}/proposal`, proposalForm); toast.success('Proposal generated'); setShowProposal(false); loadDetail(selected); load(); } catch { toast.error('Failed'); }
    finally { setSavingProposal(false); }
  };

  const filtered = leads.filter(l => {
    if (stageFilter !== 'all' && l.status !== stageFilter) return false;
    if (search) { const q = search.toLowerCase(); return l.business_name?.toLowerCase().includes(q) || l.contact_name?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q); }
    return true;
  });

  const inputCls = 'w-full bg-white/8 border border-white/12 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50';

  return (
    <div style={{ minHeight: '100vh', background: '#0C1420', color: '#F0F4FF' }}>
      <header className="border-b border-white/8 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/staff')} className="text-white/50 hover:text-white transition-colors"><ArrowLeft size={16} /></button>
            <Building2 size={16} className="text-emerald-400" />
            <h1 className="text-base font-bold tracking-wide">B2B Corporate Leads</h1>
          </div>
          <span className="text-white/40 text-xs">{user?.name}</span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Total Leads', val: stats.total || 0, icon: Building2 },
            { label: 'New This Week', val: stats.new_this_week || 0, icon: Plus },
            { label: 'Follow-Ups Due', val: stats.followups_due || 0, icon: Clock, warn: true },
            { label: 'Proposals Sent', val: stats.proposals_sent || 0, icon: FileText },
            { label: 'Active Accounts', val: stats.active_accounts || 0, icon: CheckCircle2 },
            { label: 'Enrolled Employees', val: stats.enrolled_employees || 0, icon: Users },
          ].map((s) => { const Icon = s.icon; return (
            <div key={s.label} className="bg-white/4 border border-white/8 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1"><Icon size={12} className={s.warn && s.val > 0 ? 'text-amber-400' : 'text-white/30'} /><span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">{s.label}</span></div>
              <p className="text-xl font-bold text-white">{s.val}</p>
            </div>
          ); })}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-5 overflow-x-auto pb-1">
          {[
            { id: 'discover', label: 'Discover', icon: Globe },
            { id: 'pipeline', label: 'Pipeline', icon: Briefcase },
            { id: 'cold-email', label: 'Cold Email', icon: Mail },
          ].map(t => { const Icon = t.icon; return (
            <button key={t.id} onClick={() => { setTab(t.id); setSelected(null); setDetail(null); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 ${tab === t.id ? 'bg-white/12 text-white' : 'text-white/45 hover:text-white/75'}`}>
              <Icon size={14} /> {t.label}
            </button>
          ); })}
        </div>

        {/* DISCOVER TAB */}
        {tab === 'discover' && (
          <div>
            <div className="flex flex-wrap items-end gap-3 mb-5">
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider font-bold block mb-1">Category</label>
                <select value={discoverCat} onChange={e => setDiscoverCat(e.target.value)} className="bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider font-bold block mb-1">Radius</label>
                <select value={discoverRadius} onChange={e => setDiscoverRadius(Number(e.target.value))} className="bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                  <option value={1000}>1 km</option><option value={2000}>2 km</option><option value={3000}>3 km</option><option value={5000}>5 km</option><option value={10000}>10 km</option>
                </select>
              </div>
              <button onClick={handleDiscover} disabled={discovering} data-testid="discover-btn"
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-colors">
                {discovering ? <Loader2 size={13} className="animate-spin" /> : <Globe size={13} />} Search Local Businesses
              </button>
              {selectedBiz.size > 0 && (
                <button onClick={handleBulkImport} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-colors">
                  <Plus size={13} /> Import {selectedBiz.size} Selected
                </button>
              )}
            </div>
            {discovered.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-white/40 mb-2">{discovered.length} businesses found near Santa Cruz Strength — not yet in your CRM</p>
                {discovered.map((biz) => (
                  <div key={biz.osm_id || biz.name} className="flex items-center gap-3 bg-white/4 border border-white/8 rounded-xl px-4 py-3 hover:bg-white/6 transition-colors">
                    <input type="checkbox" checked={selectedBiz.has(biz.name)} onChange={() => setSelectedBiz(prev => { const n = new Set(prev); n.has(biz.name) ? n.delete(biz.name) : n.add(biz.name); return n; })}
                      className="w-4 h-4 rounded accent-emerald-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{biz.name}</p>
                      <div className="flex items-center gap-3 text-[10px] text-white/35 mt-0.5">
                        <span className="px-1.5 py-0.5 rounded bg-white/8 text-white/50 font-semibold">{biz.category}</span>
                        {biz.address && <span><MapPin size={9} className="inline mr-0.5" />{biz.address}</span>}
                        {biz.phone && <span><Phone size={9} className="inline mr-0.5" />{biz.phone}</span>}
                        {biz.website && <span><Globe size={9} className="inline mr-0.5" />{biz.website.replace(/https?:\/\//, '').slice(0, 30)}</span>}
                      </div>
                    </div>
                    <button onClick={() => handleImportBiz(biz)} className="flex items-center gap-1 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all">
                      <Plus size={12} /> Add
                    </button>
                  </div>
                ))}
              </div>
            ) : !discovering && (
              <div className="text-center py-16 text-white/25 text-sm">
                <Globe size={32} className="mx-auto mb-3 opacity-30" />
                <p>Search for local Santa Cruz businesses to add to your corporate pipeline.</p>
                <p className="text-[10px] mt-1">Powered by OpenStreetMap data</p>
              </div>
            )}
          </div>
        )}

        {/* PIPELINE TAB */}
        {tab === 'pipeline' && (
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full bg-white/6 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50" />
              </div>
              <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} className="bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                <option value="all">All Stages</option>
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="flex gap-4">
              <div className={`${selected ? 'hidden lg:block lg:w-[360px]' : 'w-full'} shrink-0 space-y-2`}>
                {loading ? <div className="flex items-center justify-center py-20"><Loader2 size={20} className="animate-spin text-white/40" /></div> :
                filtered.length === 0 ? <div className="text-center py-16 text-white/30 text-sm">No leads. Use Discover to find businesses.</div> :
                filtered.map(l => (
                  <button key={l.id} onClick={() => loadDetail(l.id)}
                    className={`w-full text-left bg-white/4 hover:bg-white/6 border rounded-xl px-4 py-3 transition-all ${selected === l.id ? 'border-emerald-500/40 bg-white/6' : 'border-white/8'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold text-white truncate">{l.business_name}</p>
                      <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ml-2" style={{ background: (STAGE_COLORS[l.status] || '#666') + '22', color: STAGE_COLORS[l.status] || '#666' }}>
                        {l.status}
                      </span>
                    </div>
                    <p className="text-xs text-white/45 truncate">{l.contact_name || 'No contact'} {l.email ? `— ${l.email}` : ''}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-white/30">
                      {l.estimated_enrolled > 0 && <span><Users size={10} className="inline mr-0.5" />{l.estimated_enrolled}</span>}
                      {l.cold_email_wave > 0 && <span><Mail size={10} className="inline mr-0.5" />Wave {l.cold_email_wave}/3</span>}
                      {l.score > 0 && <span><Zap size={10} className="inline mr-0.5" />{l.score}pts</span>}
                    </div>
                  </button>
                ))}
              </div>

              {/* Detail Panel */}
              {selected && detail && (
                <div className="flex-1 min-w-0">
                  <div className="bg-white/4 border border-white/8 rounded-xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
                      <div>
                        <h2 className="text-base font-bold text-white">{detail.business_name}</h2>
                        <p className="text-xs text-white/45">{detail.contact_name} {detail.contact_title ? `— ${detail.contact_title}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {detail.email && detail.cold_email_wave < 3 && (
                          <button onClick={() => handleSendColdEmail(detail.id)} disabled={sendingEmail === detail.id}
                            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors">
                            {sendingEmail === detail.id ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
                            Email {(detail.cold_email_wave || 0) + 1}/3
                          </button>
                        )}
                        <button onClick={() => openProposal(detail)} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors">
                          <FileText size={12} /> Proposal
                        </button>
                        <button onClick={() => { setSelected(null); setDetail(null); }} className="text-white/30 hover:text-white p-1 lg:hidden"><X size={16} /></button>
                      </div>
                    </div>
                    <div className="p-5 space-y-5">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                        <div><span className="text-white/35 block">Email</span>{detail.email ? <a href={`mailto:${detail.email}`} className="text-emerald-400">{detail.email}</a> : <span className="text-white/20">—</span>}</div>
                        <div><span className="text-white/35 block">Phone</span><span className="text-white/70">{detail.phone || '—'}</span></div>
                        <div><span className="text-white/35 block">Address</span><span className="text-white/70">{detail.business_address || '—'}</span></div>
                        <div><span className="text-white/35 block">Website</span>{detail.website_or_instagram ? <a href={detail.website_or_instagram.startsWith('http') ? detail.website_or_instagram : `https://${detail.website_or_instagram}`} target="_blank" rel="noopener noreferrer" className="text-emerald-400">{detail.website_or_instagram}</a> : <span className="text-white/20">—</span>}</div>
                        <div><span className="text-white/35 block">Employees</span><span className="text-white/70">{detail.employee_count || '—'}</span></div>
                        <div><span className="text-white/35 block">Est. Enrolled</span><span className="text-white font-bold">{detail.estimated_enrolled || '—'}</span></div>
                        <div><span className="text-white/35 block">Model</span><span className="text-white/70">{CONTRIB_LABELS[detail.contribution_model] || detail.contribution_model || '—'}</span></div>
                        <div><span className="text-white/35 block">Lead Score</span><span className="text-emerald-400 font-bold">{detail.score || 0}/100</span></div>
                        <div><span className="text-white/35 block">Email Wave</span><span className="text-white/70">{detail.cold_email_wave || 0}/3</span></div>
                      </div>
                      <div>
                        <span className="text-[10px] text-white/35 uppercase tracking-wider font-bold block mb-2">Pipeline</span>
                        <div className="flex flex-wrap gap-1.5">
                          {STAGES.map(stage => (
                            <button key={stage} onClick={() => handleStatusChange(detail.id, stage)}
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${detail.status === stage ? 'border-transparent text-white' : 'border-white/10 text-white/35 hover:text-white/60'}`}
                              style={detail.status === stage ? { background: STAGE_COLORS[stage] } : {}}>{stage}</button>
                          ))}
                        </div>
                      </div>
                      {detail.proposal && (
                        <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-lg px-4 py-3">
                          <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold">Proposal</span>
                          <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                            <div><span className="text-white/35">Participants:</span> <span className="text-white">{detail.proposal.estimated_participants}</span></div>
                            <div><span className="text-white/35">Price:</span> <span className="text-emerald-400 font-bold">{detail.proposal.proposed_monthly_price}</span></div>
                          </div>
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] text-white/35 uppercase tracking-wider font-bold block mb-2">Add Note</span>
                        <div className="flex gap-2">
                          <input value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a note..." className={inputCls + ' flex-1'} onKeyDown={e => e.key === 'Enter' && handleAddNote()} />
                          <button onClick={handleAddNote} disabled={savingNote || !noteText.trim()} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors">
                            {savingNote ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                          </button>
                        </div>
                      </div>
                      {detail.activity_log?.length > 0 && (
                        <div>
                          <span className="text-[10px] text-white/35 uppercase tracking-wider font-bold block mb-2">Activity</span>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {[...detail.activity_log].reverse().map((a) => (
                              <div key={`${a.timestamp}-${a.action}`} className="flex items-start gap-2 text-xs">
                                <span className="text-white/20 shrink-0">{new Date(a.timestamp).toLocaleDateString()}</span>
                                <div><span className="text-white/50 font-semibold">{a.action}</span>{a.note && <p className="text-white/35">{a.note}</p>}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* COLD EMAIL TAB */}
        {tab === 'cold-email' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-white/40">Select leads with email addresses to send compliant cold outreach. 3-email sequence per lead.</p>
              {bulkSelected.size > 0 && (
                <button onClick={handleBulkEmail} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors">
                  <Send size={12} /> Send Next Email to {bulkSelected.size} Leads
                </button>
              )}
            </div>
            <div className="space-y-2">
              {leads.filter(l => l.email && l.status !== 'Active Corporate Account' && l.status !== 'Lost / Not Now').map(l => (
                <div key={l.id} className="flex items-center gap-3 bg-white/4 border border-white/8 rounded-xl px-4 py-3">
                  <input type="checkbox" checked={bulkSelected.has(l.id)} disabled={(l.cold_email_wave || 0) >= 3}
                    onChange={() => setBulkSelected(prev => { const n = new Set(prev); n.has(l.id) ? n.delete(l.id) : n.add(l.id); return n; })}
                    className="w-4 h-4 rounded accent-blue-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{l.business_name}</p>
                    <p className="text-xs text-white/35 truncate">{l.email}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex gap-0.5">
                      {[1,2,3].map(w => (
                        <div key={w} className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${(l.cold_email_wave || 0) >= w ? 'bg-blue-500 text-white' : 'bg-white/8 text-white/25'}`}>{w}</div>
                      ))}
                    </div>
                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: (STAGE_COLORS[l.status] || '#666') + '22', color: STAGE_COLORS[l.status] || '#666' }}>{l.status}</span>
                    {(l.cold_email_wave || 0) < 3 ? (
                      <button onClick={() => handleSendColdEmail(l.id)} disabled={sendingEmail === l.id}
                        className="flex items-center gap-1 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all">
                        {sendingEmail === l.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Send
                      </button>
                    ) : (
                      <span className="text-[10px] text-white/25 font-semibold">Complete</span>
                    )}
                  </div>
                </div>
              ))}
              {leads.filter(l => l.email).length === 0 && (
                <div className="text-center py-16 text-white/25 text-sm">
                  <Mail size={32} className="mx-auto mb-3 opacity-30" />
                  <p>No leads with email addresses yet. Discover businesses first.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Proposal Modal */}
      {showProposal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowProposal(false)}>
          <div className="bg-[#0C1420] border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Generate Proposal</h3>
              <button onClick={() => setShowProposal(false)} className="text-white/30 hover:text-white"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'company_name', label: 'Company' },
                { key: 'employee_count', label: 'Employees', type: 'number' },
                { key: 'estimated_participants', label: 'Participants', type: 'number' },
                { key: 'contribution_model', label: 'Model' },
                { key: 'discount_tier', label: 'Tier' },
                { key: 'proposed_monthly_price', label: 'Price/mo', placeholder: '$65/person' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-[10px] text-white/40 uppercase tracking-wider font-bold block mb-1">{f.label}</label>
                  <input type={f.type || 'text'} value={proposalForm[f.key] || ''} onChange={e => setProposalForm(p => ({ ...p, [f.key]: f.type === 'number' ? parseInt(e.target.value) || 0 : e.target.value }))} className={inputCls} placeholder={f.placeholder} />
                </div>
              ))}
            </div>
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider font-bold block mb-1">Notes</label>
              <textarea value={proposalForm.notes || ''} onChange={e => setProposalForm(p => ({ ...p, notes: e.target.value }))} className={`${inputCls} resize-none`} rows={2} />
            </div>
            <button onClick={handleGenerateProposal} disabled={savingProposal}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
              {savingProposal ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} Generate Proposal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
