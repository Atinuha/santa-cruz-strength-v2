import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getLeads, getStats, exportLeadsCSV, createManualLead } from '../../lib/api';
import { LEAD_STATUSES, LEAD_SOURCES, GYM_CONFIG, INTEREST_TYPES } from '../../config';
import KanbanBoard from '../../components/staff/KanbanBoard';
import {
  Search, Download, Plus, LogOut, RefreshCw, Phone,
  ChevronRight, Users, TrendingUp, Calendar, Activity,
  Loader2, LayoutGrid, List, Settings
} from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { toast } from 'sonner';

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
    { label: 'New (7 days)', value: stats?.new_7d ?? '—', icon: <TrendingUp size={15} />, testid: 'crm-dashboard-kpi-new', color: 'text-white/40' },
    { label: 'Tour Booked', value: stats?.by_status?.['Booked Visit'] ?? 0, icon: <Calendar size={15} />, testid: 'crm-dashboard-kpi-booked', color: 'text-[#7FCCA6]/50' },
    { label: 'Members', value: stats?.by_status?.['Joined'] ?? 0, icon: <Users size={15} />, testid: 'crm-dashboard-kpi-joined', color: 'text-[#1B7A4A]/70' },
    { label: 'Total Leads', value: stats?.total ?? '—', icon: <Activity size={15} />, testid: 'crm-dashboard-kpi-total', color: 'text-white/40' },
  ];

  const inputClass = 'bg-black/40 border border-white/12 text-white placeholder:text-white/30 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-transparent transition-colors duration-200';

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0A0A0A]/96 backdrop-blur border-b border-white/8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-[#1B7A4A] rounded flex items-center justify-center">
              <span className="font-display text-white text-xs">S</span>
            </div>
            <span className="font-display text-white tracking-wider text-sm hidden sm:block">SANTA CRUZ STRENGTH</span>
            <span className="font-display text-white tracking-wider text-sm sm:hidden">SCS</span>
            <span className="text-white/20 hidden sm:block">|</span>
            <span className="text-white/40 text-xs hidden sm:block">Lead CRM</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-white/35 hover:text-white text-xs transition-colors duration-200 hidden sm:block">View Site</Link>
            <Link to="/staff/settings" className="text-white/35 hover:text-white p-1.5 rounded transition-colors duration-200" title="Settings">
              <Settings size={14} />
            </Link>
            <span className="text-white/40 text-xs">{user?.name}</span>
            <button onClick={() => { logout(); navigate('/staff/login'); }}
              className="text-white/35 hover:text-white/70 p-1.5 rounded transition-colors duration-200" title="Logout">
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
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input type="text" placeholder="Search name, phone, email..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              data-testid="crm-dashboard-search-input"
              className={`${inputClass} pl-9 w-full`} />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger data-testid="crm-dashboard-status-filter-select"
              className="w-full sm:w-44 bg-black/40 border-white/12 text-white text-sm h-9">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A1A] border-white/12">
              <SelectItem value="all" className="text-white text-sm">All Statuses</SelectItem>
              {LEAD_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value} className="text-white text-sm">{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-full sm:w-40 bg-black/40 border-white/12 text-white text-sm h-9">
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent className="bg-[#1A1A1A] border-white/12">
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
                  viewMode === 'kanban' ? 'bg-[#1B7A4A] text-white' : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
                title="Kanban view"
              >
                <LayoutGrid size={14} />
                <span className="hidden sm:block text-xs">Board</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 text-sm flex items-center gap-1.5 transition-colors duration-200 ${
                  viewMode === 'table' ? 'bg-[#1B7A4A] text-white' : 'text-white/40 hover:text-white hover:bg-white/5'
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

        {/* Lead count */}
        <div className="mb-4">
          <p className="text-white/35 text-xs">
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
            <p className="text-white/35 text-sm">No leads found</p>
            <p className="text-white/20 text-xs mt-1">Adjust your filters or add a new lead</p>
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
                          <p className="text-white text-sm font-medium">{lead.first_name} {lead.last_name}</p>
                          <p className="text-white/35 text-xs">{lead.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <a href={`tel:${lead.phone}`} onClick={(e) => e.stopPropagation()}
                          className="text-white/60 hover:text-white text-sm flex items-center gap-1.5 transition-colors duration-200">
                          <Phone size={11} />{lead.phone}
                        </a>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-white/40 text-xs">{SOURCE_LABELS[lead.lead_source] || lead.lead_source}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-white/40 text-xs">{lead.interest_type}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-white/30 text-xs">
                          {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight size={13} className="text-white/25" />
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
        <DialogContent className="bg-[#111214] border-white/12 text-white max-w-lg max-h-[90vh] overflow-y-auto">
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
                className={inputClass + ' w-full appearance-none'} style={{backgroundColor:'rgba(0,0,0,0.5)'}}>
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
