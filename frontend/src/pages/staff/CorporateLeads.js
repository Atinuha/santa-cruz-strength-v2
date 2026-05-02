import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { toast } from 'sonner';
import {
  ArrowLeft, Building2, Users, Loader2, Plus, Search, ChevronRight,
  Calendar, Mail, Phone, MapPin, Clock, FileText, Send, X, Save,
  BarChart2, Briefcase, CheckCircle2, AlertCircle,
} from 'lucide-react';

const STAGES = [
  'New Corporate Lead', 'Contacted', 'Discovery Scheduled',
  'Proposal Sent', 'Verbal Yes', 'Active Corporate Account', 'Lost / Not Now'
];

const STAGE_COLORS = {
  'New Corporate Lead': '#3B82F6',
  'Contacted': '#F59E0B',
  'Discovery Scheduled': '#8B5CF6',
  'Proposal Sent': '#EC4899',
  'Verbal Yes': '#10B981',
  'Active Corporate Account': '#059669',
  'Lost / Not Now': '#6B7280',
};

const CONTRIB_LABELS = {
  'employer_pays_all': 'Employer Pays All',
  'employer_pays_part': 'Employer Pays Part',
  'employee_discount': 'Employee Discount',
  'not_sure': 'Not Sure Yet',
};

export default function CorporateLeads() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
  const [proposalForm, setProposalForm] = useState({
    company_name: '', employee_count: 0, estimated_participants: 0,
    contribution_model: '', discount_tier: '', proposed_monthly_price: '', notes: '',
  });
  const [savingProposal, setSavingProposal] = useState(false);

  const load = useCallback(async () => {
    try {
      const [leadsRes, statsRes] = await Promise.all([
        api.get('/staff/corporate-leads'),
        api.get('/staff/corporate-leads/stats'),
      ]);
      setLeads(leadsRes.data);
      setStats(statsRes.data);
    } catch (err) { console.error('Failed to load corporate leads:', err); toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadDetail = async (id) => {
    try {
      const res = await api.get(`/staff/corporate-leads/${id}`);
      setDetail(res.data);
      setSelected(id);
    } catch { toast.error('Failed to load lead'); }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.put(`/staff/corporate-leads/${id}`, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      await load();
      if (selected === id) loadDetail(id);
    } catch { toast.error('Failed to update'); }
  };

  const handleAddNote = async () => {
    if (!noteText.trim() || !selected) return;
    setSavingNote(true);
    try {
      await api.post(`/staff/corporate-leads/${selected}/note`, { note: noteText });
      setNoteText('');
      toast.success('Note added');
      loadDetail(selected);
    } catch { toast.error('Failed to add note'); }
    finally { setSavingNote(false); }
  };

  const handleGenerateProposal = async () => {
    if (!selected) return;
    setSavingProposal(true);
    try {
      await api.post(`/staff/corporate-leads/${selected}/proposal`, proposalForm);
      toast.success('Proposal generated');
      setShowProposal(false);
      loadDetail(selected);
      load();
    } catch { toast.error('Failed to generate proposal'); }
    finally { setSavingProposal(false); }
  };

  const openProposal = (lead) => {
    setProposalForm({
      company_name: lead.business_name,
      employee_count: lead.employee_count,
      estimated_participants: lead.estimated_enrolled,
      contribution_model: CONTRIB_LABELS[lead.contribution_model] || lead.contribution_model,
      discount_tier: lead.discount_tier,
      proposed_monthly_price: '',
      notes: '',
    });
    setShowProposal(true);
  };

  const filtered = leads.filter(l => {
    if (stageFilter !== 'all' && l.status !== stageFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return l.business_name?.toLowerCase().includes(q) || l.contact_name?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q);
    }
    return true;
  });

  const inputCls = 'w-full bg-white/8 border border-white/12 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50';

  return (
    <div style={{ minHeight: '100vh', background: '#0C1420', color: '#F0F4FF' }}>
      {/* Header */}
      <header className="border-b border-white/8 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/staff')} className="text-white/50 hover:text-white transition-colors">
              <ArrowLeft size={16} />
            </button>
            <Building2 size={16} className="text-emerald-400" />
            <h1 className="text-base font-bold tracking-wide">Corporate Leads</h1>
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
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="bg-white/4 border border-white/8 rounded-xl p-3" data-testid={`corp-stat-${i}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={12} className={s.warn && s.val > 0 ? 'text-amber-400' : 'text-white/30'} />
                  <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold">{s.label}</span>
                </div>
                <p className="text-xl font-bold text-white">{s.val}</p>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search companies..."
              className="w-full bg-white/6 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50" data-testid="corp-search" />
          </div>
          <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} data-testid="corp-stage-filter"
            className="bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
            <option value="all">All Stages</option>
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="flex gap-4">
          {/* Lead List */}
          <div className={`${selected ? 'hidden lg:block lg:w-[360px]' : 'w-full'} shrink-0 space-y-2`}>
            {loading ? (
              <div className="flex items-center justify-center py-20"><Loader2 size={20} className="animate-spin text-white/40" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-white/30 text-sm">No corporate leads yet.</div>
            ) : filtered.map(l => (
              <button key={l.id} onClick={() => loadDetail(l.id)} data-testid={`corp-lead-${l.id}`}
                className={`w-full text-left bg-white/4 hover:bg-white/6 border rounded-xl px-4 py-3 transition-all duration-200 ${
                  selected === l.id ? 'border-emerald-500/40 bg-white/6' : 'border-white/8'
                }`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold text-white truncate">{l.business_name}</p>
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ml-2"
                    style={{ background: STAGE_COLORS[l.status] + '22', color: STAGE_COLORS[l.status] }}>
                    {l.status?.replace('Corporate ', '').replace(' Corporate', '')}
                  </span>
                </div>
                <p className="text-xs text-white/45 truncate">{l.contact_name} — {CONTRIB_LABELS[l.contribution_model] || l.contribution_model}</p>
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-white/30">
                  <span><Users size={10} className="inline mr-0.5" />{l.estimated_enrolled || 0} employees</span>
                  <span>{l.discount_tier}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Detail Panel */}
          {selected && detail && (
            <div className="flex-1 min-w-0">
              <div className="bg-white/4 border border-white/8 rounded-xl overflow-hidden">
                {/* Detail Header */}
                <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-white">{detail.business_name}</h2>
                    <p className="text-xs text-white/45">{detail.contact_name} — {detail.contact_title}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openProposal(detail)} data-testid="generate-proposal-btn"
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors">
                      <FileText size={12} /> Proposal
                    </button>
                    <button onClick={() => { setSelected(null); setDetail(null); }}
                      className="text-white/30 hover:text-white p-1 lg:hidden"><X size={16} /></button>
                  </div>
                </div>

                <div className="p-5 space-y-5">
                  {/* Info Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                    <div><span className="text-white/35 block">Email</span><a href={`mailto:${detail.email}`} className="text-emerald-400">{detail.email}</a></div>
                    <div><span className="text-white/35 block">Phone</span><span className="text-white/70">{detail.phone || '—'}</span></div>
                    <div><span className="text-white/35 block">Address</span><span className="text-white/70">{detail.business_address || '—'}</span></div>
                    <div><span className="text-white/35 block">Website/IG</span><span className="text-white/70">{detail.website_or_instagram || '—'}</span></div>
                    <div><span className="text-white/35 block">Total Employees</span><span className="text-white/70">{detail.employee_count}</span></div>
                    <div><span className="text-white/35 block">Est. Enrolled</span><span className="text-white font-bold">{detail.estimated_enrolled}</span></div>
                    <div><span className="text-white/35 block">Model</span><span className="text-white/70">{CONTRIB_LABELS[detail.contribution_model] || detail.contribution_model}</span></div>
                    <div><span className="text-white/35 block">Discount Tier</span><span className="text-emerald-400 font-bold">{detail.discount_tier}</span></div>
                    <div><span className="text-white/35 block">Start Date</span><span className="text-white/70">{detail.desired_start_date || '—'}</span></div>
                    <div><span className="text-white/35 block">SMS Consent</span><span className={detail.sms_consent ? 'text-emerald-400' : 'text-white/30'}>{detail.sms_consent ? 'Yes' : 'No'}</span></div>
                  </div>

                  {/* Stage Pipeline */}
                  <div>
                    <span className="text-[10px] text-white/35 uppercase tracking-wider font-bold block mb-2">Pipeline Stage</span>
                    <div className="flex flex-wrap gap-1.5">
                      {STAGES.map(stage => (
                        <button key={stage} onClick={() => handleStatusChange(detail.id, stage)}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all duration-200 ${
                            detail.status === stage
                              ? 'border-transparent text-white'
                              : 'border-white/10 text-white/35 hover:text-white/60 hover:border-white/20'
                          }`}
                          style={detail.status === stage ? { background: STAGE_COLORS[stage] } : {}}>
                          {stage}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  {detail.notes && (
                    <div className="bg-white/[0.03] rounded-lg px-4 py-3">
                      <span className="text-[10px] text-white/35 uppercase tracking-wider font-bold">Inquiry Notes</span>
                      <p className="text-xs text-white/60 mt-1 leading-relaxed">{detail.notes}</p>
                    </div>
                  )}

                  {/* Proposal */}
                  {detail.proposal && (
                    <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-lg px-4 py-3">
                      <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold">Proposal</span>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                        <div><span className="text-white/35">Participants:</span> <span className="text-white">{detail.proposal.estimated_participants}</span></div>
                        <div><span className="text-white/35">Model:</span> <span className="text-white">{detail.proposal.contribution_model}</span></div>
                        <div><span className="text-white/35">Tier:</span> <span className="text-white">{detail.proposal.discount_tier}</span></div>
                        <div><span className="text-white/35">Price:</span> <span className="text-emerald-400 font-bold">{detail.proposal.proposed_monthly_price}</span></div>
                      </div>
                      {detail.proposal.notes && <p className="text-xs text-white/45 mt-2">{detail.proposal.notes}</p>}
                      <p className="text-[10px] text-white/25 mt-2">Generated {new Date(detail.proposal.generated_at).toLocaleDateString()} by {detail.proposal.generated_by}</p>
                    </div>
                  )}

                  {/* Add Note */}
                  <div>
                    <span className="text-[10px] text-white/35 uppercase tracking-wider font-bold block mb-2">Add Note</span>
                    <div className="flex gap-2">
                      <input value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Add a note..."
                        className={inputCls + ' flex-1'} data-testid="corp-note-input"
                        onKeyDown={e => e.key === 'Enter' && handleAddNote()} />
                      <button onClick={handleAddNote} disabled={savingNote || !noteText.trim()}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors">
                        {savingNote ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                      </button>
                    </div>
                  </div>

                  {/* Activity Log */}
                  {detail.activity_log?.length > 0 && (
                    <div>
                      <span className="text-[10px] text-white/35 uppercase tracking-wider font-bold block mb-2">Activity</span>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {[...detail.activity_log].reverse().map((a, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <span className="text-white/20 shrink-0 mt-0.5">{new Date(a.timestamp).toLocaleDateString()}</span>
                            <div>
                              <span className="text-white/50 font-semibold">{a.action}</span>
                              {a.note && <p className="text-white/35">{a.note}</p>}
                              {a.staff_name && <span className="text-white/20"> — {a.staff_name}</span>}
                            </div>
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

      {/* Proposal Modal */}
      {showProposal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowProposal(false)}>
          <div className="bg-[#0C1420] border border-white/10 rounded-2xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()} data-testid="proposal-modal">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Generate Proposal</h3>
              <button onClick={() => setShowProposal(false)} className="text-white/30 hover:text-white"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider font-bold block mb-1">Company</label>
                <input value={proposalForm.company_name} onChange={e => setProposalForm(p => ({ ...p, company_name: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider font-bold block mb-1">Employee Count</label>
                <input type="number" value={proposalForm.employee_count} onChange={e => setProposalForm(p => ({ ...p, employee_count: parseInt(e.target.value) || 0 }))} className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider font-bold block mb-1">Est. Participants</label>
                <input type="number" value={proposalForm.estimated_participants} onChange={e => setProposalForm(p => ({ ...p, estimated_participants: parseInt(e.target.value) || 0 }))} className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider font-bold block mb-1">Model</label>
                <input value={proposalForm.contribution_model} onChange={e => setProposalForm(p => ({ ...p, contribution_model: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider font-bold block mb-1">Discount Tier</label>
                <input value={proposalForm.discount_tier} onChange={e => setProposalForm(p => ({ ...p, discount_tier: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] text-white/40 uppercase tracking-wider font-bold block mb-1">Proposed Price/mo</label>
                <input value={proposalForm.proposed_monthly_price} onChange={e => setProposalForm(p => ({ ...p, proposed_monthly_price: e.target.value }))} className={inputCls} placeholder="e.g. $65/person" />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-white/40 uppercase tracking-wider font-bold block mb-1">Notes</label>
              <textarea value={proposalForm.notes} onChange={e => setProposalForm(p => ({ ...p, notes: e.target.value }))} className={`${inputCls} resize-none`} rows={2} />
            </div>
            <button onClick={handleGenerateProposal} disabled={savingProposal}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2">
              {savingProposal ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
              Generate Proposal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
