import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getStaffTeamMembers, createTeamMember, updateTeamMember, deleteTeamMember } from '../../lib/api';
import ImageUploadField from '../../components/ImageUploadField';
import { toast } from 'sonner';
import StaticSiteNotice from '../../components/StaticSiteNotice';
import {
  ArrowLeft, Plus, Pencil, Trash2, GripVertical, Eye, EyeOff,
  Users, Dumbbell, Save, X, Loader2, ChevronUp, ChevronDown,
} from 'lucide-react';

const EMPTY_MEMBER = { name: '', role: '', bio: '', photo_url: '', category: 'team', sort_order: 0, is_visible: true };

export default function TeamManager() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_MEMBER });
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('team');

  const load = useCallback(async () => {
    try {
      const { data } = await getStaffTeamMembers();
      setMembers(data);
    } catch { toast.error('Failed to load team'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = members.filter(m => m.category === tab);

  const startCreate = () => {
    setEditing('new');
    setForm({ ...EMPTY_MEMBER, category: tab, sort_order: filtered.length });
  };

  const startEdit = (m) => {
    setEditing(m.id);
    setForm({ ...m });
  };

  const cancel = () => { setEditing(null); setForm({ ...EMPTY_MEMBER }); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!form.role.trim()) { toast.error('Role is required'); return; }
    setSaving(true);
    try {
      if (editing === 'new') {
        await createTeamMember(form);
        toast.success('Team member added');
      } else {
        await updateTeamMember(editing, form);
        toast.success('Team member updated');
      }
      cancel();
      await load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    try {
      await deleteTeamMember(id);
      toast.success(`${name} removed`);
      await load();
    } catch { toast.error('Delete failed'); }
  };

  const handleToggleVisibility = async (m) => {
    try {
      await updateTeamMember(m.id, { is_visible: !m.is_visible });
      await load();
      toast.success(m.is_visible ? `${m.name} hidden` : `${m.name} visible`);
    } catch { toast.error('Update failed'); }
  };

  const handleReorder = async (m, dir) => {
    const idx = filtered.findIndex(f => f.id === m.id);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= filtered.length) return;
    const other = filtered[swapIdx];
    try {
      await updateTeamMember(m.id, { sort_order: other.sort_order });
      await updateTeamMember(other.id, { sort_order: m.sort_order });
      await load();
    } catch { toast.error('Reorder failed'); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0C1420', color: '#F0F4FF' }}>
      {/* Header */}
      <header className="border-b border-white/8 px-4 sm:px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/staff')} className="text-white/50 hover:text-white transition-colors" data-testid="back-to-dashboard">
              <ArrowLeft size={16} />
            </button>
            <h1 className="text-base font-bold tracking-wide">Team Manager</h1>
          </div>
          <span className="text-white/40 text-xs">{user?.name}</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <StaticSiteNotice surface="the team and coaches" />
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => { setTab('team'); cancel(); }}
            data-testid="tab-team"
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              tab === 'team' ? 'bg-white/12 text-white' : 'text-white/50 hover:text-white/80'
            }`}
          >
            <Users size={14} /> Staff
          </button>
          <button
            onClick={() => { setTab('trainer'); cancel(); }}
            data-testid="tab-trainers"
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              tab === 'trainer' ? 'bg-white/12 text-white' : 'text-white/50 hover:text-white/80'
            }`}
          >
            <Dumbbell size={14} /> Trainers
          </button>
          <div className="flex-1" />
          <button
            onClick={startCreate}
            data-testid="add-team-member-btn"
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors duration-200"
          >
            <Plus size={13} /> Add {tab === 'team' ? 'Staff' : 'Trainer'}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={20} className="animate-spin text-white/40" />
          </div>
        ) : (
          <div className="space-y-3">
            {/* Create / Edit Form */}
            {editing && (
              <div className="bg-white/6 border border-white/10 rounded-xl p-5 mb-4" data-testid="team-member-form">
                <h3 className="text-sm font-bold mb-4">{editing === 'new' ? 'Add New' : 'Edit'} {tab === 'team' ? 'Staff Member' : 'Trainer'}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Name *</label>
                    <input
                      data-testid="team-member-name"
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full bg-white/8 border border-white/12 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50"
                      placeholder="Full name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Role / Title *</label>
                    <input
                      data-testid="team-member-role"
                      value={form.role}
                      onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                      className="w-full bg-white/8 border border-white/12 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50"
                      placeholder="e.g. Community Manager"
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-xs text-white/50 mb-1">Bio (optional)</label>
                  <textarea
                    data-testid="team-member-bio"
                    value={form.bio}
                    onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                    className="w-full bg-white/8 border border-white/12 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 resize-none"
                    rows={2}
                    placeholder="Short bio..."
                  />
                </div>
                <div className="mb-4">
                  <ImageUploadField
                    value={form.photo_url}
                    onChange={url => setForm(p => ({ ...p, photo_url: url }))}
                    label="Photo"
                    darkMode={true}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={handleSave} disabled={saving} data-testid="save-team-member-btn"
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors duration-200">
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    {editing === 'new' ? 'Add Member' : 'Save Changes'}
                  </button>
                  <button onClick={cancel} className="text-white/50 hover:text-white text-xs font-semibold flex items-center gap-1">
                    <X size={13} /> Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Member List */}
            {filtered.length === 0 && !editing && (
              <div className="text-center py-16 text-white/30 text-sm">
                No {tab === 'team' ? 'staff members' : 'trainers'} yet. Click "Add" to get started.
              </div>
            )}

            {filtered.map((m) => (
              <div key={m.id} data-testid={`team-member-${m.id}`}
                className={`flex items-center gap-4 bg-white/4 hover:bg-white/6 border border-white/8 rounded-xl px-4 py-3 transition-colors duration-200 ${
                  !m.is_visible ? 'opacity-50' : ''
                }`}>
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => handleReorder(m, 'up')} className="text-white/30 hover:text-white/70 transition-colors">
                    <ChevronUp size={12} />
                  </button>
                  <GripVertical size={12} className="text-white/20" />
                  <button onClick={() => handleReorder(m, 'down')} className="text-white/30 hover:text-white/70 transition-colors">
                    <ChevronDown size={12} />
                  </button>
                </div>

                {m.photo_url ? (
                  <img src={m.photo_url} alt={m.name}
                    className="w-12 h-12 rounded-full object-cover border border-white/10 shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-white/8 border border-white/10 flex items-center justify-center shrink-0">
                    <span className="text-white/40 text-sm font-bold">{m.name?.[0]}</span>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{m.name}</p>
                  <p className="text-xs text-white/50 truncate">{m.role}</p>
                  {m.bio && <p className="text-xs text-white/35 truncate mt-0.5">{m.bio}</p>}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => handleToggleVisibility(m)}
                    className="text-white/30 hover:text-white/70 p-1.5 rounded transition-colors" title={m.is_visible ? 'Hide' : 'Show'}>
                    {m.is_visible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button onClick={() => startEdit(m)}
                    className="text-white/30 hover:text-emerald-400 p-1.5 rounded transition-colors" title="Edit">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(m.id, m.name)}
                    className="text-white/30 hover:text-red-400 p-1.5 rounded transition-colors" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
