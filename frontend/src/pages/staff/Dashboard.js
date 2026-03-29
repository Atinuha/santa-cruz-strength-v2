import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getLeads, getStats, exportLeadsCSV, createManualLead } from '../../lib/api';
import { LEAD_STATUSES, LEAD_SOURCES, GYM_CONFIG, INTEREST_TYPES } from '../../config';
import { gvCall, gvText } from '../../utils/googleVoice';
import { formatPhone } from '../../utils/phone';
import KanbanBoard from '../../components/staff/KanbanBoard';
import {
  Search, Download, Plus, LogOut, RefreshCw, Phone,
  ChevronRight, Users, TrendingUp, Calendar, Activity,
  Loader2, LayoutGrid, List, Settings, Zap, ArrowLeft, BookOpen, Megaphone, ShieldOff
} from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { toast } from 'sonner';

// Quick Add strip for walk-ins
function QuickAddStrip({ onAdded }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    first_name: '', last_name: '', phone: '', email: '',
    interest_type: 'General Membership', lead_source: 'walk_in',
    location: 'santa_cruz', notes: '', training_goals: '', start_timeline: 'ASAP', preferred_contact: 'call'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.first_name || !form.phone) { toast.error('First name and phone required'); return; }
    setLoading(true);
    try {
      await createManualLead(form);
      toast.success(`Added: ${form.first_name} ${form.last_name}`);
      setForm({ first_name: '', last_name: '', phone: '', email: '', interest_type: 'General Membership', lead_source: 'walk_in', location: 'santa_cruz', notes: '', training_goals: '', start_timeline: 'ASAP', preferred_contact: 'call' });
      setOpen(false);
      onAdded();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'bg-white/5 border border-white/12 text-white placeholder:text-white/45 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 transition-colors duration-200';

  return (
    <div className="mb-4">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 text-sm text-white/62 hover:text-white bg-white/3 hover:bg-white/6 border border-white/8 hover:border-white/15 px-4 py-2.5 rounded-lg w-full transition-colors duration-200"
        >
          <Zap size={14} className="text-[#1B7A4A]" />
          <span className="font-medium">Quick Add</span>
          <span className="text-white/45 text-xs ml-1">— walk-in, call-in, or any quick entry</span>
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="bg-[var(--surface)] border border-[#1B7A4A]/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-[#1B7A4A]" />
              <span className="text-white text-sm font-semibold">Quick Add Lead</span>
              <span className="text-white/48 text-xs">walk-in / call-in</span>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="text-white/52 hover:text-white text-xs px-2 py-1">
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
            <input
              required value={form.first_name}
              onChange={(e) => setForm(p => ({...p, first_name: e.target.value}))}
              placeholder="First Name *" className={inputClass}
            />
            <input
              value={form.last_name}
              onChange={(e) => setForm(p => ({...p, last_name: e.target.value}))}
              placeholder="Last Name" className={inputClass}
            />
            <input
              required value={form.phone}
              onChange={(e) => setForm(p => ({...p, phone: e.target.value}))}
              placeholder="Phone *" type="tel" className={inputClass}
            />
            <input
              value={form.email}
              onChange={(e) => setForm(p => ({...p, email: e.target.value}))}
              placeholder="Email (optional)" type="email" className={inputClass}
            />
          </div>
          <div className="flex gap-2">
            <input
              value={form.notes}
              onChange={(e) => setForm(p => ({...p, notes: e.target.value}))}
              placeholder="Quick note (optional)"
              className={`${inputClass} flex-1`}
            />
            <button
              type="submit" disabled={loading}
              className="btn-scs-primary px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap"
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Add
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const found = LEAD_STATUSES.find((s) => s.value === status);
  const colorClass = found?.color || 'bg-white/10 text-white border-white/15';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colorClass}`}>
      {found?.label || status}
    </span>
  );
}

const SOURCE_LABELS = {
  website_form: 'Website',
  book_a_tour: 'Tour Form',
  book_a_visit: 'Book Visit',
  contact_page: 'Contact',
  personal_training_inquiry: 'PT Inquiry',
  manual_entry: 'Manual',
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'table'
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [addLeadLoading, setAddLeadLoading] = useState(false);
  const [newLead, setNewLead] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    interest_type: 'General Membership', training_goals: '',
    start_timeline: 'ASAP', preferred_contact: 'call', notes: '', location: 'santa_cruz',
  });

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (sourceFilter !== 'all') params.lead_source = sourceFilter;

      const [leadsRes, statsRes] = await Promise.all([getLeads({ ...params, limit: 200 }), getStats()]);
      setLeads(leadsRes.data.leads);
      setTotal(leadsRes.data.total);
      setStats(statsRes.data);
    } catch {
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, statusFilter, sourceFilter]);

  useEffect(() => {
    const timer = setTimeout(() => fetchData(), search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [fetchData, search]);

  const handleExport = async () => {
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      const res = await exportLeadsCSV(params);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = 'scs-leads.csv'; a.click();
      URL.revokeObjectURL(url);
      toast.success('Leads exported');
    } catch { toast.error('Export failed'); }
  };

  const handleAddLead = async (e) => {
    e.preventDefault();
    setAddLeadLoading(true);
    try {
      await createManualLead(newLead);
      toast.success('Lead added');
      setAddLeadOpen(false);
      setNewLead({ first_name: '', last_name: '', email: '', phone: '', interest_type: 'General Membership', training_goals: '', start_timeline: 'ASAP', preferred_contact: 'call', notes: '', location: 'santa_cruz' });
      fetchData(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add lead');
    } finally { setAddLeadLoading(false); }
  };

  const KPI_STATS = [
    { label: 'New (7 days)', value: stats?.new_7d ?? '—', icon: <TrendingUp size={15} />, testid: 'crm-dashboard-kpi-new', color: 'text-white/58' },
    { label: 'Tour Booked', value: stats?.by_status?.['Booked Visit'] ?? 0, icon: <Calendar size={15} />, testid: 'crm-dashboard-kpi-booked', color: 'text-[#7FCCA6]/50' },
    { label: 'Members', value: stats?.by_status?.['Joined'] ?? 0, icon: <Users size={15} />, testid: 'crm-dashboard-kpi-joined', color: 'text-[#1B7A4A]/70' },
    { label: 'Total Leads', value: stats?.total ?? '—', icon: <Activity size={15} />, testid: 'crm-dashboard-kpi-total', color: 'text-white/58' },
  ];

  const inputClass = 'bg-white/5 border border-white/12 text-white placeholder:text-white/48 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-transparent transition-colors duration-200';

  return (
    <div className="min-h-screen bg-[var(--ink)]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--ink)]/96 backdrop-blur border-b border-white/8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/" className="flex items-center gap-2 group" title="Back to website">
              <div className="w-7 h-7 rounded overflow-hidden flex items-center justify-center shrink-0">
                <img src="https://customer-assets.emergentagent.com/job_local-gym-hub/artifacts/luzlwc0v_SCS_Circle_Logo_1_20260308_193638_0000.jpg"
                  alt="SCS" className="w-full h-full object-contain"
                  style={{ filter: 'invert(1)', mixBlendMode: 'screen' }} />
              </div>
              <span className="font-display text-white tracking-wider text-sm hidden sm:block">SANTA CRUZ STRENGTH</span>
              <span className="font-display text-white tracking-wider text-sm sm:hidden">SCS</span>
            </Link>
            <span className="text-white/38 hidden sm:block">|</span>
            <span className="text-white/58 text-xs hidden sm:block">Lead CRM</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Website link — always visible on mobile */}
            <Link
              to="/"
              className="flex items-center gap-1 text-white/58 hover:text-white text-xs font-medium border border-white/12 hover:border-white/28 px-2.5 py-1.5 rounded-md transition-colors duration-200"
            >
              <ArrowLeft size={11} />
              <span>Website</span>
            </Link>
            <Link to="/staff/settings" className="text-white/58 hover:text-white p-1.5 rounded transition-colors duration-200" title="Settings">
              <Settings size={14} />
            </Link>
            <Link to="/staff/blog" className="text-white/58 hover:text-white p-1.5 rounded transition-colors duration-200" title="Blog Manager">
              <BookOpen size={14} />
            </Link>
            <Link to="/staff/events" className="text-white/58 hover:text-white p-1.5 rounded transition-colors duration-200" title="Events Manager">
              <Calendar size={14} />
            </Link>
            <Link to="/staff/campaigns" className="text-white/58 hover:text-white p-1.5 rounded transition-colors duration-200" title="Campaigns">
              <Megaphone size={14} />
            </Link>
            <span className="text-white/58 text-xs hidden sm:block max-w-[80px] truncate">{user?.name}</span>
            <button onClick={() => { logout(); navigate('/staff/login'); }}
              className="text-white/52 hover:text-white/70 p-1.5 rounded transition-colors duration-200" title="Logout">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {KPI_STATS.map((kpi, i) => (
            <div key={i} className="card-marketing p-4" data-testid={kpi.testid}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/38 text-xs uppercase tracking-wider">{kpi.label}</span>
                <span className={kpi.color}>{kpi.icon}</span>
              </div>
              <span className="text-white text-2xl font-bold font-display tracking-wide">{kpi.value}</span>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1 min-w-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/48" />
            <input type="text" placeholder="Search name, phone, email..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              data-testid="crm-dashboard-search-input"
              className={`${inputClass} pl-9 w-full`} />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger data-testid="crm-dashboard-status-filter-select"
              className="w-full sm:w-44 bg-white/5 border-white/12 text-white text-sm h-9">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent className="bg-[var(--elevated)] border-white/12">
              <SelectItem value="all" className="text-white text-sm">All Statuses</SelectItem>
              {LEAD_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value} className="text-white text-sm">{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-white/5 border-white/12 text-white text-sm h-9">
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent className="bg-[var(--elevated)] border-white/12">
              <SelectItem value="all" className="text-white text-sm">All Sources</SelectItem>
              {LEAD_SOURCES.map((s) => (
                <SelectItem key={s.value} value={s.value} className="text-white text-sm">{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            {/* View toggle */}
            <div className="flex border border-white/12 rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors duration-200 ${
                  viewMode === 'kanban' ? 'bg-[#1B7A4A] text-white' : 'text-white/58 hover:text-white hover:bg-white/5'
                }`}
                title="Kanban view"
              >
                <LayoutGrid size={14} />
                <span className="hidden sm:block text-xs">Board</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors duration-200 ${
                  viewMode === 'table' ? 'bg-[#1B7A4A] text-white' : 'text-white/58 hover:text-white hover:bg-white/5'
                }`}
                title="Table view"
              >
                <List size={14} />
                <span className="hidden sm:block text-xs">List</span>
              </button>
            </div>

            <button onClick={() => fetchData(true)}
              className="btn-scs-secondary px-3 py-2 rounded-md text-sm flex items-center gap-1.5"
              title="Refresh">
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <button onClick={handleExport}
              className="btn-scs-secondary px-3 py-2 rounded-md text-sm flex items-center gap-1.5">
              <Download size={13} />
            </button>
            <button onClick={() => setAddLeadOpen(true)}
              className="btn-scs-primary px-3 py-2 rounded-md text-sm flex items-center gap-1.5">
              <Plus size={13} />
              <span className="hidden sm:block text-xs">Add Lead</span>
            </button>
          </div>
        </div>

        {/* Quick Add strip for walk-ins */}
        <QuickAddStrip onAdded={() => fetchData(true)} />

        {/* Lead count */}
        <div className="mb-4">
          <p className="text-white/52 text-xs">
            {loading ? 'Loading...' : `${total} lead${total !== 1 ? 's' : ''}${search || statusFilter !== 'all' || sourceFilter !== 'all' ? ' (filtered)' : ''}`}
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-[#1B7A4A] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : leads.length === 0 ? (
          <div className="card-marketing text-center py-20">
            <Users size={32} className="text-white/18 mx-auto mb-3" />
            <p className="text-white/52 text-sm">No leads found</p>
            <p className="text-white/38 text-xs mt-1">Adjust your filters or add a new lead</p>
          </div>
        ) : viewMode === 'kanban' ? (
          <KanbanBoard leads={leads} onLeadsUpdated={() => fetchData(true)} />
        ) : (
          // TABLE VIEW
          <div className="card-marketing overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full crm-table" data-testid="crm-dashboard-leads-table">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left hidden sm:table-cell">Phone</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">Source</th>
                    <th className="px-4 py-3 text-left hidden lg:table-cell">Interest</th>
                    <th className="px-4 py-3 text-left hidden lg:table-cell">Date</th>
                    <th className="px-4 py-3 text-left"></th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id}
                      className="border-t border-white/5 cursor-pointer transition-colors duration-150"
                      onClick={() => navigate(`/staff/leads/${lead.id}`)}>
                      <td className="px-4 py-3">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-white text-sm font-medium">{lead.first_name} {lead.last_name}</p>
                            {lead.blacklisted && <ShieldOff size={11} className="text-red-400/70" title="Blacklisted" />}
                          </div>
                          <p className="text-white/52 text-xs">{lead.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                          <button onClick={() => gvCall(lead.phone)}
                            title="Call via Google Voice"
                            className="text-white/50 hover:text-[#7FCCA6] text-xs flex items-center gap-1 transition-colors duration-150">
                            <Phone size={11} />{formatPhone(lead.phone)}
                          </button>
                          {lead.phone && (
                            <button onClick={() => gvText(lead.phone)}
                              title="Text via Google Voice"
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/20 text-purple-300 hover:bg-purple-500/25 transition-colors duration-150 shrink-0">
                              Txt
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-white/58 text-xs">{SOURCE_LABELS[lead.lead_source] || lead.lead_source}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-white/58 text-xs">{lead.interest_type}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-white/48 text-xs">
                          {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight size={13} className="text-white/42" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Lead Dialog */}
      <Dialog open={addLeadOpen} onOpenChange={setAddLeadOpen}>
        <DialogContent className="bg-[var(--surface)] border-white/12 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display tracking-wide text-lg">ADD LEAD</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddLead} className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/55 mb-1">First Name *</label>
                <input required value={newLead.first_name} onChange={(e) => setNewLead(p => ({...p, first_name: e.target.value}))}
                  className={inputClass + ' w-full'} placeholder="Alex" />
              </div>
              <div>
                <label className="block text-xs text-white/55 mb-1">Last Name *</label>
                <input required value={newLead.last_name} onChange={(e) => setNewLead(p => ({...p, last_name: e.target.value}))}
                  className={inputClass + ' w-full'} placeholder="Smith" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-white/55 mb-1">Phone *</label>
              <input required type="tel" value={newLead.phone} onChange={(e) => setNewLead(p => ({...p, phone: e.target.value}))}
                className={inputClass + ' w-full'} placeholder="(831) 555-0100" />
            </div>
            <div>
              <label className="block text-xs text-white/55 mb-1">Email *</label>
              <input required type="email" value={newLead.email} onChange={(e) => setNewLead(p => ({...p, email: e.target.value}))}
                className={inputClass + ' w-full'} placeholder="alex@example.com" />
            </div>
            <div>
              <label className="block text-xs text-white/55 mb-1">Interest</label>
              <select value={newLead.interest_type} onChange={(e) => setNewLead(p => ({...p, interest_type: e.target.value}))}
                className={inputClass + ' w-full appearance-none'} style={{backgroundColor:'var(--elevated)'}}>
                {INTEREST_TYPES.map(t => <option key={t} value={t} style={{background:'#1A1A1A'}}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-white/55 mb-1">Notes</label>
              <textarea value={newLead.notes} onChange={(e) => setNewLead(p => ({...p, notes: e.target.value}))}
                className={inputClass + ' w-full resize-none'} rows={2} placeholder="Any notes..." />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setAddLeadOpen(false)} className="flex-1 btn-scs-secondary py-2.5 rounded-md text-sm">Cancel</button>
              <button type="submit" disabled={addLeadLoading} className="flex-1 btn-scs-primary py-2.5 rounded-md text-sm flex items-center justify-center gap-2">
                {addLeadLoading ? <><Loader2 size={13} className="animate-spin" /> Adding...</> : 'Add Lead'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
