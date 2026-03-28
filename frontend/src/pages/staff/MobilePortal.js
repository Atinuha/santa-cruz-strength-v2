import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { updateLead, addNote, createManualLead } from '../../lib/api';
import { gvCall, gvText } from '../../utils/googleVoice';
import {
  Home, ListChecks, UserPlus, LogOut, Phone, MessageSquare,
  ChevronRight, Check, X, Mic, MicOff, Send, RefreshCw,
  Clock, AlertCircle, Star, Loader2, ChevronDown, User,
  CheckCircle2, XCircle, Calendar
} from 'lucide-react';
import { toast } from 'sonner';

const BACKEND = process.env.REACT_APP_BACKEND_URL || '';
const LOGO = 'https://customer-assets.emergentagent.com/job_f0e6860d-0e81-45b1-9e0b-f7bb6a04df72/artifacts/uf08gcdo_20260313_151045_0000.png';

const QUICK_STATUSES = [
  { value: 'Contacted',     label: 'Contacted',    color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { value: 'Attempted Call',label: 'Attempted',    color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  { value: 'Texted',        label: 'Texted',       color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { value: 'Booked Visit',  label: 'Tour Booked',  color: 'bg-[#1B7A4A]/25 text-[#7FCCA6] border-[#1B7A4A]/35' },
  { value: 'Joined',        label: 'Joined!',      color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  { value: 'No Response',   label: 'No Response',  color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
  { value: 'Lost',          label: 'Not Interested', color: 'bg-red-500/15 text-red-400 border-red-500/25' },
];

const INTERESTS = ['General Membership', 'Personal Training', 'Group Classes', 'Open Gym', 'Powerlifting Program', 'Other'];

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function LeadCard({ lead, onAction }) {
  const name = `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'No name';
  return (
    <div className="bg-[#111f16] border border-white/8 rounded-xl p-4 active:scale-[0.98] transition-transform duration-100"
      onClick={() => onAction(lead)} data-testid={`lead-card-${lead.id}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{name}</p>
          <p className="text-white/45 text-xs truncate">{lead.interest_type || 'General Membership'}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] text-white/35">{lead.created_at ? timeAgo(lead.created_at) : lead.next_follow_up_date || ''}</span>
          <ChevronRight size={14} className="text-white/25" />
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/6 border border-white/10 text-white/50">
          {lead.status || 'New'}
        </span>
        {lead.phone && (
          <button onClick={e => { e.stopPropagation(); gvCall(lead.phone); }}
            className="flex items-center gap-1 text-[10px] text-[#7FCCA6] bg-[#1B7A4A]/15 px-2 py-0.5 rounded-full border border-[#1B7A4A]/25 active:bg-[#1B7A4A]/30"
            data-testid="call-btn">
            <Phone size={9} /> Call
          </button>
        )}
        {lead.phone && (
          <button onClick={e => { e.stopPropagation(); gvText(lead.phone); }}
            className="flex items-center gap-1 text-[10px] text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded-full border border-purple-500/25"
            data-testid="sms-btn">
            <MessageSquare size={9} /> Text
          </button>
        )}
      </div>
    </div>
  );
}

function ActionSheet({ lead, onClose, onUpdated }) {
  const [note, setNote]         = useState('');
  const [listening, setListening] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [tab, setTab]           = useState('status'); // 'status' | 'note'
  const recognitionRef = useRef(null);
  const name = `${lead.first_name || ''} ${lead.last_name || ''}`.trim();

  const handleStatus = async (status) => {
    setSaving(true);
    try {
      await updateLead(lead.id, { status });
      toast.success(`${name} → ${status}`);
      onUpdated({ ...lead, status });
      onClose();
    } catch { toast.error('Failed to update'); }
    finally { setSaving(false); }
  };

  const handleNote = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await addNote(lead.id, note.trim());
      toast.success('Note saved');
      setNote('');
      onUpdated(lead);
      onClose();
    } catch { toast.error('Failed to save note'); }
    finally { setSaving(false); }
  };

  const handleClearFollowUp = async () => {
    setSaving(true);
    try {
      await updateLead(lead.id, { next_follow_up_date: '', next_follow_up_time: '' });
      toast.success('Follow-up cleared');
      onUpdated({ ...lead, next_follow_up_date: '' });
      onClose();
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error('Voice not supported on this browser'); return; }
    const r = new SR();
    r.continuous = false;
    r.interimResults = true;
    r.lang = 'en-US';
    r.onresult = (e) => {
      const t = Array.from(e.results).map(r => r[0].transcript).join('');
      setNote(t);
    };
    r.onend = () => setListening(false);
    r.onerror = () => { setListening(false); toast.error('Voice error — try again'); };
    recognitionRef.current = r;
    r.start();
    setListening(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-[#0f1a14] rounded-t-2xl border-t border-white/10 p-5 pb-safe max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()} data-testid="action-sheet">

        {/* Handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />

        {/* Lead header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white font-bold">{name}</p>
            <p className="text-white/45 text-xs">{lead.interest_type} · {lead.status}</p>
          </div>
          <div className="flex gap-2">
            {lead.phone && (
              <button onClick={() => gvCall(lead.phone)}
                className="w-9 h-9 rounded-full bg-[#1B7A4A]/20 border border-[#1B7A4A]/30 flex items-center justify-center"
                data-testid="sheet-call-btn">
                <Phone size={15} className="text-[#7FCCA6]" />
              </button>
            )}
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/6 flex items-center justify-center">
              <X size={15} className="text-white/60" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-white/5 rounded-lg p-0.5 mb-4">
          {[['status','Status'], ['note','Add Note']].map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all duration-150 ${
                tab === t ? 'bg-[#1B7A4A] text-white' : 'text-white/45'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Status tab */}
        {tab === 'status' && (
          <div className="space-y-2">
            {QUICK_STATUSES.map(s => (
              <button key={s.value} disabled={saving || lead.status === s.value}
                onClick={() => handleStatus(s.value)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-semibold transition-all duration-150 active:scale-[0.98] ${s.color} ${
                  lead.status === s.value ? 'opacity-40 cursor-default' : 'active:opacity-80'
                }`}
                data-testid={`status-${s.value}`}>
                <span>{s.label}</span>
                {lead.status === s.value
                  ? <Check size={14} />
                  : saving ? <Loader2 size={14} className="animate-spin opacity-50" /> : <ChevronRight size={14} className="opacity-50" />}
              </button>
            ))}

            {/* Clear follow-up */}
            {lead.next_follow_up_date && (
              <div className="pt-2 border-t border-white/8">
                <button onClick={handleClearFollowUp} disabled={saving}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-white/10 bg-white/4 text-sm text-white/60 active:bg-white/8"
                  data-testid="clear-followup-btn">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-white/40" />
                    <span>Mark follow-up done</span>
                  </div>
                  <CheckCircle2 size={14} className="text-[#7FCCA6]/60" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Note tab */}
        {tab === 'note' && (
          <div className="space-y-3">
            <div className="relative">
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Type a note or tap the mic to speak..."
                rows={4}
                data-testid="note-input"
                className="w-full bg-white/5 border border-white/12 text-white placeholder:text-white/28 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1B7A4A]/50 pr-12"
              />
              <button onClick={toggleVoice}
                data-testid="voice-btn"
                className={`absolute right-3 bottom-3 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 ${
                  listening
                    ? 'bg-red-500/30 border border-red-500/40 animate-pulse'
                    : 'bg-white/8 border border-white/15 active:bg-white/15'
                }`}>
                {listening ? <MicOff size={14} className="text-red-400" /> : <Mic size={14} className="text-white/60" />}
              </button>
            </div>
            {listening && (
              <p className="text-red-400/80 text-xs flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 bg-red-400 rounded-full" />
                Listening... tap mic to stop
              </p>
            )}
            <button onClick={handleNote} disabled={!note.trim() || saving}
              data-testid="save-note-btn"
              className="w-full btn-scs-primary py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40">
              {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : <><Send size={14} /> Save Note</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MobilePortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab]           = useState('home');
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Walk-in form
  const [walkIn, setWalkIn] = useState({ first_name: '', last_name: '', phone: '', interest_type: 'General Membership' });
  const [walkInSaving, setWalkInSaving] = useState(false);

  const fetchDashboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const token = localStorage.getItem('scs_token');
      const res = await fetch(`${BACKEND}/api/staff/mobile/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed');
      setData(await res.json());
    } catch { toast.error('Could not load dashboard'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const handleLeadUpdated = (updated) => {
    if (!data) return;
    const patch = (arr) => arr.map(l => l.id === updated.id ? { ...l, ...updated } : l);
    setData(d => ({ ...d, follow_ups: patch(d.follow_ups), overdue: patch(d.overdue), recent_leads: patch(d.recent_leads) }));
  };

  const handleWalkIn = async (e) => {
    e.preventDefault();
    if (!walkIn.first_name || !walkIn.phone) { toast.error('Name and phone required'); return; }
    setWalkInSaving(true);
    try {
      await createManualLead({ ...walkIn, lead_source: 'walk_in', status: 'New', location: 'santa_cruz' });
      toast.success(`${walkIn.first_name} added!`);
      setWalkIn({ first_name: '', last_name: '', phone: '', interest_type: 'General Membership' });
      fetchDashboard(true);
      setTab('home');
    } catch { toast.error('Failed to add lead'); }
    finally { setWalkInSaving(false); }
  };

  const handleLogout = () => { logout(); navigate('/staff/login'); };

  const inputCls = 'w-full bg-white/5 border border-white/12 text-white placeholder:text-white/35 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B7A4A]/50';

  if (loading) return (
    <div className="min-h-screen bg-[#0a0f0d] flex items-center justify-center">
      <Loader2 size={28} className="animate-spin text-[#1B7A4A]" />
    </div>
  );

  const followUps = data?.follow_ups || [];
  const overdue   = data?.overdue || [];
  const recent    = data?.recent_leads || [];
  const stats     = data?.stats || {};

  return (
    <div className="min-h-screen bg-[#0a0f0d] flex flex-col" style={{ paddingBottom: '80px' }}>

      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0a0f0d]/95 backdrop-blur border-b border-white/8 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#0D5D3E] flex items-center justify-center" style={{ padding: '2px' }}>
            <img src={LOGO} alt="SCS" className="w-full h-full object-contain" style={{ filter: 'invert(1) brightness(2)' }} />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">SCS Staff</p>
            <p className="text-white/35 text-[10px]">{user?.name || 'Staff'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchDashboard(true)} disabled={refreshing}
            className="w-8 h-8 rounded-full bg-white/6 flex items-center justify-center"
            data-testid="refresh-btn">
            <RefreshCw size={13} className={`text-white/50 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={handleLogout} className="w-8 h-8 rounded-full bg-white/6 flex items-center justify-center"
            data-testid="mobile-logout-btn">
            <LogOut size={13} className="text-white/50" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-4 overflow-y-auto">

        {/* ── HOME TAB ── */}
        {tab === 'home' && (
          <div className="space-y-4">
            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'New Today', value: stats.new_today ?? 0, color: 'text-[#7FCCA6]', bg: 'bg-[#1B7A4A]/15 border-[#1B7A4A]/25' },
                { label: "Today's Follow-ups", value: (stats.follow_up_today ?? 0) + (overdue.length), color: 'text-amber-300', bg: 'bg-amber-500/12 border-amber-500/20' },
                { label: 'Joined This Month', value: stats.joined_month ?? 0, color: 'text-purple-300', bg: 'bg-purple-500/12 border-purple-500/20' },
                { label: 'Total Leads', value: stats.total ?? 0, color: 'text-white/70', bg: 'bg-white/5 border-white/10' },
              ].map(s => (
                <div key={s.label} className={`${s.bg} border rounded-xl px-4 py-3`}>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-white/40 text-[11px] mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Overdue follow-ups banner */}
            {overdue.length > 0 && (
              <button onClick={() => setTab('followups')}
                className="w-full flex items-center gap-3 bg-amber-500/12 border border-amber-500/25 rounded-xl px-4 py-3 active:bg-amber-500/20"
                data-testid="overdue-banner">
                <AlertCircle size={16} className="text-amber-400 shrink-0" />
                <p className="text-amber-300 text-sm font-semibold flex-1 text-left">
                  {overdue.length} overdue follow-up{overdue.length !== 1 ? 's' : ''}
                </p>
                <ChevronRight size={14} className="text-amber-400/60" />
              </button>
            )}

            {/* Recent leads */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-white/60 text-xs font-bold uppercase tracking-wider">Recent Leads</p>
                <span className="text-[10px] text-white/30">Last 48h</span>
              </div>
              {recent.length === 0
                ? <p className="text-white/25 text-sm text-center py-8">No new leads yet today</p>
                : <div className="space-y-2">
                    {recent.map(l => <LeadCard key={l.id} lead={l} onAction={setSelectedLead} />)}
                  </div>
              }
            </div>
          </div>
        )}

        {/* ── FOLLOW-UPS TAB ── */}
        {tab === 'followups' && (
          <div className="space-y-4">
            {/* Overdue section */}
            {overdue.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <AlertCircle size={13} className="text-amber-400" />
                  <p className="text-amber-400/80 text-xs font-bold uppercase tracking-wider">Overdue</p>
                </div>
                <div className="space-y-2">
                  {overdue.map(l => <LeadCard key={l.id} lead={l} onAction={setSelectedLead} />)}
                </div>
              </div>
            )}

            {/* Today section */}
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <Clock size={13} className="text-[#7FCCA6]" />
                <p className="text-[#7FCCA6]/80 text-xs font-bold uppercase tracking-wider">Today</p>
              </div>
              {followUps.length === 0 && overdue.length === 0
                ? <div className="text-center py-12">
                    <CheckCircle2 size={32} className="text-[#1B7A4A]/40 mx-auto mb-3" />
                    <p className="text-white/30 text-sm">All caught up!</p>
                  </div>
                : followUps.length === 0
                  ? <p className="text-white/25 text-sm text-center py-6">No follow-ups scheduled for today</p>
                  : <div className="space-y-2">
                      {followUps.map(l => (
                        <div key={l.id}>
                          {l.next_follow_up_time && (
                            <p className="text-white/30 text-[10px] mb-1 pl-1 flex items-center gap-1">
                              <Clock size={9} /> {l.next_follow_up_time}
                            </p>
                          )}
                          <LeadCard lead={l} onAction={setSelectedLead} />
                        </div>
                      ))}
                    </div>
              }
            </div>
          </div>
        )}

        {/* ── WALK-IN TAB ── */}
        {tab === 'walkin' && (
          <div>
            <div className="mb-5">
              <h2 className="text-white font-bold text-lg mb-0.5">New Walk-in</h2>
              <p className="text-white/40 text-sm">Capture someone who just walked in</p>
            </div>
            <form onSubmit={handleWalkIn} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">First Name *</label>
                  <input value={walkIn.first_name} onChange={e => setWalkIn(p => ({ ...p, first_name: e.target.value }))}
                    placeholder="John" required className={inputCls} data-testid="walkin-first-name" />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">Last Name</label>
                  <input value={walkIn.last_name} onChange={e => setWalkIn(p => ({ ...p, last_name: e.target.value }))}
                    placeholder="Smith" className={inputCls} data-testid="walkin-last-name" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1.5">Phone *</label>
                <input type="tel" value={walkIn.phone} onChange={e => setWalkIn(p => ({ ...p, phone: e.target.value }))}
                  placeholder="(831) 555-0100" required className={inputCls} data-testid="walkin-phone" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1.5">Interest</label>
                <select value={walkIn.interest_type} onChange={e => setWalkIn(p => ({ ...p, interest_type: e.target.value }))}
                  className={inputCls + ' appearance-none'} style={{ background: 'rgba(255,255,255,0.05)' }}
                  data-testid="walkin-interest">
                  {INTERESTS.map(i => <option key={i} value={i} style={{ background: '#0f1a14' }}>{i}</option>)}
                </select>
              </div>
              <button type="submit" disabled={walkInSaving}
                className="w-full bg-[#0D5D3E] hover:bg-[#1B7A4A] text-white font-bold py-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors duration-150 active:scale-[0.98] mt-4"
                data-testid="walkin-submit-btn">
                {walkInSaving
                  ? <><Loader2 size={16} className="animate-spin" /> Adding...</>
                  : <><UserPlus size={16} /> Add Walk-in Lead</>}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#0a0f0d]/98 backdrop-blur border-t border-white/8 flex items-stretch">
        {[
          { id: 'home',      Icon: Home,       label: 'Home',       badge: null },
          { id: 'followups', Icon: ListChecks, label: 'Follow-ups', badge: (followUps.length + overdue.length) || null },
          { id: 'walkin',    Icon: UserPlus,   label: 'Walk-in',    badge: null },
        ].map(({ id, Icon, label, badge }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors duration-150 relative ${
              tab === id ? 'text-[#7FCCA6]' : 'text-white/35'
            }`}
            data-testid={`nav-${id}`}>
            <div className="relative">
              <Icon size={20} />
              {badge && (
                <span className="absolute -top-1 -right-1.5 w-4 h-4 bg-amber-500 rounded-full text-[9px] font-bold text-black flex items-center justify-center">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </div>
            <span className="text-[10px] font-semibold">{label}</span>
            {tab === id && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#1B7A4A] rounded-full" />}
          </button>
        ))}
      </div>

      {/* Action sheet */}
      {selectedLead && (
        <ActionSheet
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdated={handleLeadUpdated}
        />
      )}
    </div>
  );
}
