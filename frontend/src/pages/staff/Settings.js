import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api, {
  getUsers, createUser, updateUser, deleteUser, updateMe,
  getInvites, createInvite, revokeInvite, revokeUserDevices,
  importLeadsCSV, downloadCSVTemplate,
  getStaffedHours, updateStaffedHours
} from '../../lib/api';
import {
  ArrowLeft, Plus, Trash2, Loader2, LogOut, Shield, User,
  Mail, Copy, Check, X, Upload, Download, RefreshCw, Clock, CalendarDays, MessageSquare, Phone as PhoneIcon, KeyRound, Smartphone
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { toast } from 'sonner';

const ROLE_COLORS = {
  owner: 'bg-[#1B7A4A]/15 text-[#7FCCA6] border-[#1B7A4A]/25',
  admin: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  staff: 'bg-white/8 text-white/60 border-white/12',
};

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const isAdmin = ['admin', 'owner'].includes(user?.role);
  const isOwner = user?.role === 'owner';

  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState(null);
  const [staffedHours, setStaffedHours] = useState(null);
  const [hoursSaving, setHoursSaving] = useState(false);
  const [smsNumbers, setSmsNumbers] = useState([]);
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsSaving, setSmsSaving] = useState(false);
  const [newSmsNumber, setNewSmsNumber] = useState('');
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.email || '', password: '', confirm_password: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'staff', location: 'santa_cruz' });
  const [newInvite, setNewInvite] = useState({ name: '', email: '', role: 'staff' });

  const fetchAll = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    try {
      const calls = [getUsers(), getInvites()];
      if (isOwner) calls.push(getStaffedHours());
      const [uRes, iRes, hRes] = await Promise.all(calls);
      setUsers(uRes.data);
      setInvites(iRes.data);
      if (hRes) setStaffedHours(hRes.data);
    } catch { toast.error('Failed to load staff data'); }
    finally { setLoadingUsers(false); }
    // Load SMS numbers separately (owner only)
    if (isOwner) {
      try {
        setSmsLoading(true);
        const res = await api.get('/staff/settings/sms-numbers');
        setSmsNumbers(res.data.numbers || []);
      } catch (err) { console.error('Failed to load SMS numbers:', err); }
      finally { setSmsLoading(false); }
    }
  }, [isAdmin, isOwner]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (profileForm.password && profileForm.password !== profileForm.confirm_password) {
      toast.error('Passwords do not match'); return;
    }
    setProfileSaving(true);
    try {
      const data = { name: profileForm.name, email: profileForm.email };
      if (profileForm.password) data.password = profileForm.password;
      await updateMe(data);
      toast.success('Profile updated');
      setProfileForm(p => ({ ...p, password: '', confirm_password: '' }));
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update profile');
    } finally { setProfileSaving(false); }
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    setInviteLoading(true); setInviteResult(null);
    try {
      const res = await createInvite(newInvite);
      setInviteResult(res.data);
      toast.success(res.data.email_sent ? 'Invite sent via email!' : 'Invite created - copy the link below');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create invite');
    } finally { setInviteLoading(false); }
  };

  const copyInviteLink = async (url) => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleRevokeInvite = async (inv) => {
    try {
      await revokeInvite(inv.id);
      toast.success('Invite revoked');
      fetchAll();
    } catch { toast.error('Failed to revoke invite'); }
  };

  const handleAddUser = async (e) => {
    e.preventDefault(); setAddLoading(true);
    try {
      await createUser(newUser);
      toast.success('Staff account created');
      setAddUserOpen(false);
      setNewUser({ name: '', email: '', password: '', role: 'staff', location: 'santa_cruz' });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create user');
    } finally { setAddLoading(false); }
  };

  const handleToggleActive = async (u) => {
    try {
      await updateUser(u.id, { is_active: !u.is_active });
      toast.success(u.is_active ? 'Account disabled' : 'Account enabled');
      fetchAll();
    } catch { toast.error('Failed to update account'); }
  };

  const handleDeleteUser = async (u) => {
    if (!window.confirm(`Delete account for ${u.name}? This cannot be undone.`)) return;
    try {
      await deleteUser(u.id);
      toast.success('User deleted');
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to delete user'); }
  };

  const handleRevokeDevices = async (u) => {
    if (!window.confirm(`Revoke all remembered devices for ${u.name}? They will need to log in again.`)) return;
    try {
      const res = await revokeUserDevices(u.id);
      toast.success(res.data?.message || 'Devices revoked');
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to revoke devices'); }
  };

  const handleSendReset = async (u) => {
    try {
      await api.post(`/staff/users/${u.id}/send-reset`);
      toast.success(`Password reset email sent to ${u.email}`);
    } catch (err) { console.error('Failed to send reset:', err); toast.error('Failed to send reset email'); }
  };

  const handleSaveHours = async () => {
    setHoursSaving(true);
    try {
      await updateStaffedHours(staffedHours);
      toast.success('Staffed hours saved');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save hours');
    } finally { setHoursSaving(false); }
  };

  const saveSmsNumbers = async (numbers) => {
    setSmsSaving(true);
    try {
      const res = await api.put('/staff/settings/sms-numbers', { numbers });
      setSmsNumbers(res.data.numbers);
      toast.success('SMS numbers updated');
    } catch (err) { console.error('Failed to save SMS numbers:', err); toast.error('Failed to save SMS numbers'); }
    finally { setSmsSaving(false); }
  };

  const handleAddSmsNumber = () => {
    const num = newSmsNumber.trim();
    if (!num.startsWith('+') || num.length < 10) {
      toast.error('Enter a valid E.164 number (e.g. +15103616605)'); return;
    }
    if (smsNumbers.includes(num)) { toast.error('Number already added'); return; }
    const updated = [...smsNumbers, num];
    setSmsNumbers(updated);
    setNewSmsNumber('');
    saveSmsNumbers(updated);
  };

  const handleRemoveSmsNumber = (num) => {
    const updated = smsNumbers.filter(n => n !== num);
    setSmsNumbers(updated);
    saveSmsNumbers(updated);
  };

  const handleCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvUploading(true); setCsvResult(null);
    try {
      const res = await importLeadsCSV(file);
      setCsvResult(res.data);
      toast.success(`Imported ${res.data.imported} leads`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Import failed');
    } finally {
      setCsvUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleTemplateDownload = async () => {
    try {
      const res = await downloadCSVTemplate();
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'scs-leads-template.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Download failed'); }
  };

  const inputClass = 'w-full bg-white/5 border border-white/12 text-white placeholder:text-white/48 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/45 transition-colors duration-200';

  return (
    <div className="min-h-screen bg-[var(--ink)]">
      <header className="sticky top-0 z-40 bg-[var(--ink)]/96 backdrop-blur border-b border-white/8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/staff/dashboard')} className="text-white/62 hover:text-white flex items-center gap-1.5 text-sm transition-colors duration-200">
              <ArrowLeft size={14} /> Dashboard
            </button>
            <span className="text-white/38">/</span>
            <span className="text-white text-sm">Settings</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/staff"
              className="flex items-center gap-1 text-white/58 hover:text-white text-xs font-medium border border-white/12 hover:border-white/28 px-2.5 py-1.5 rounded-md transition-colors duration-200"
            >
              <ArrowLeft size={11} />
              <span>Dashboard</span>
            </Link>
            <button onClick={() => { logout(); navigate('/staff/login'); }} className="text-white/52 hover:text-white/70 p-1.5 rounded">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-7">

        {/* Profile */}
        <section className="card-marketing p-6">
          <div className="flex items-center gap-2 mb-5">
            <User size={15} className="text-[#1B7A4A]" />
            <h2 className="font-display text-xl text-white tracking-wide">MY PROFILE</h2>
            <span className={`text-xs px-2 py-0.5 rounded border ${ROLE_COLORS[user?.role] || ROLE_COLORS.staff}`}>
              {user?.role}
            </span>
          </div>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-white/55 mb-1.5">Full Name</label>
                <input value={profileForm.name} onChange={(e) => setProfileForm(p => ({...p, name: e.target.value}))} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-white/55 mb-1.5">Email</label>
                <input type="email" value={profileForm.email} onChange={(e) => setProfileForm(p => ({...p, email: e.target.value}))} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-white/55 mb-1.5">New Password (leave blank to keep)</label>
                <input type="password" value={profileForm.password} onChange={(e) => setProfileForm(p => ({...p, password: e.target.value}))} className={inputClass} placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-xs text-white/55 mb-1.5">Confirm New Password</label>
                <input type="password" value={profileForm.confirm_password} onChange={(e) => setProfileForm(p => ({...p, confirm_password: e.target.value}))} className={inputClass} placeholder="••••••••" />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={profileSaving} data-testid="crm-settings-update-profile-button"
                className="btn-scs-primary px-5 py-2.5 rounded-md text-sm font-semibold flex items-center gap-2">
                {profileSaving ? <><Loader2 size={13} className="animate-spin" /> Saving...</> : 'Save Changes'}
              </button>
            </div>
          </form>
        </section>

        {/* CSV Import / Export */}
        <section className="card-marketing p-6">
          <div className="flex items-center gap-2 mb-5">
            <Upload size={15} className="text-[#1B7A4A]" />
            <h2 className="font-display text-xl text-white tracking-wide">IMPORT / EXPORT LEADS</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            {/* Template download */}
            <div className="bg-white/3 border border-white/8 rounded-lg p-4">
              <p className="text-white text-sm font-semibold mb-1">CSV Template</p>
              <p className="text-white/58 text-xs mb-3">Download the template to see the exact format for importing leads.</p>
              <button onClick={handleTemplateDownload}
                className="btn-scs-secondary px-3 py-2 rounded-md text-xs flex items-center gap-1.5 font-medium">
                <Download size={13} /> Download Template
              </button>
            </div>

            {/* Upload */}
            <div className="bg-white/3 border border-white/8 rounded-lg p-4">
              <p className="text-white text-sm font-semibold mb-1">Import Leads</p>
              <p className="text-white/58 text-xs mb-3">Upload a CSV file. Duplicate emails are automatically skipped.</p>
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" id="csv-upload" />
              <label htmlFor="csv-upload"
                className={`btn-scs-primary px-3 py-2 rounded-md text-xs flex items-center gap-1.5 font-medium cursor-pointer w-fit ${
                  csvUploading ? 'opacity-60 cursor-not-allowed' : ''
                }`}>
                {csvUploading ? <><Loader2 size={13} className="animate-spin" /> Importing...</> : <><Upload size={13} /> Upload CSV</>}
              </label>
            </div>
          </div>

          {csvResult && (
            <div className={`p-4 rounded-lg border text-sm ${
              csvResult.errors?.length > 0 ? 'bg-yellow-500/8 border-yellow-500/20' : 'bg-[#1B7A4A]/8 border-[#1B7A4A]/20'
            }`}>
              <p className="text-white font-medium mb-1">Import complete</p>
              <div className="space-y-0.5 text-xs">
                <p className="text-white/60">✓ Imported: <span className="text-white font-medium">{csvResult.imported}</span></p>
                <p className="text-white/60">• Skipped (duplicates/invalid): <span className="text-white/80">{csvResult.skipped}</span></p>
                {csvResult.errors?.slice(0, 3).map((err, i) => (
                  <p key={i} className="text-yellow-400/70">{err}</p>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Invite Staff */}
        {isAdmin && (
          <section className="card-marketing p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Mail size={15} className="text-[#1B7A4A]" />
                <h2 className="font-display text-xl text-white tracking-wide">INVITE STAFF</h2>
              </div>
              <button onClick={() => { setInviteOpen(true); setInviteResult(null); }}
                className="btn-scs-primary px-3 py-2 rounded-md text-xs flex items-center gap-1.5">
                <Plus size={13} /> Send Invite
              </button>
            </div>

            {invites.length === 0 ? (
              <p className="text-white/48 text-sm">No pending invites.</p>
            ) : (
              <div className="space-y-2">
                {invites.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-3 bg-white/3 border border-white/8 rounded-lg">
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium">{inv.name}</p>
                      <p className="text-white/58 text-xs">{inv.email} · {inv.role} · Invited by {inv.created_by_name}</p>
                      <p className="text-white/42 text-xs">Expires {new Date(inv.expires_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <button onClick={() => copyInviteLink(`${window.location.origin}/staff/accept-invite?token=${inv.token}`)}
                        className="text-white/58 hover:text-white p-1.5 rounded transition-colors duration-200" title="Copy invite link">
                        <Copy size={13} />
                      </button>
                      <button onClick={() => handleRevokeInvite(inv)}
                        className="text-red-400/50 hover:text-red-400 p-1.5 rounded transition-colors duration-200" title="Revoke">
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Staff Accounts */}
        {isAdmin && (
          <section className="card-marketing p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Shield size={15} className="text-[#1B7A4A]" />
                <h2 className="font-display text-xl text-white tracking-wide">STAFF ACCOUNTS</h2>
              </div>
              <div className="flex gap-2">
                <button onClick={fetchAll} className="btn-scs-secondary px-3 py-2 rounded-md text-xs">
                  <RefreshCw size={12} />
                </button>
                <button onClick={() => setAddUserOpen(true)} className="btn-scs-primary px-3 py-2 rounded-md text-xs flex items-center gap-1.5">
                  <Plus size={13} /> Add Directly
                </button>
              </div>
            </div>

            {loadingUsers ? (
              <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-[#1B7A4A] border-t-transparent rounded-full animate-spin" /></div>
            ) : (
              <div className="space-y-2">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3 bg-white/3 border border-white/8 rounded-lg">
                    <div>
                      <p className="text-white text-sm font-medium">{u.name} {u.id === user.id && <span className="text-[#7FCCA6]/70 text-xs">(you)</span>}</p>
                      <p className="text-white/58 text-xs">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded border ${ROLE_COLORS[u.role] || ROLE_COLORS.staff}`}>{u.role}</span>
                      <span className={`text-xs px-2 py-0.5 rounded border ${
                        u.is_active ? 'bg-green-600/10 text-green-400 border-green-600/20' : 'bg-gray-600/10 text-gray-400 border-gray-600/20'
                      }`}>{u.is_active ? 'Active' : 'Disabled'}</span>
                      {u.id !== user.id && u.role !== 'owner' && (
                        <>
                          <button onClick={() => handleToggleActive(u)}
                            className="text-white/52 hover:text-white text-xs btn-scs-secondary px-2 py-1 rounded">
                            {u.is_active ? 'Disable' : 'Enable'}
                          </button>
                          {isOwner && (
                            <button onClick={() => handleSendReset(u)}
                              title="Send password reset email"
                              data-testid={`send-reset-${u.id}`}
                              className="text-[#7FCCA6]/60 hover:text-[#7FCCA6] p-1.5 rounded transition-colors duration-200">
                              <KeyRound size={13} />
                            </button>
                          )}
                          {isOwner && (
                            <button onClick={() => handleRevokeDevices(u)}
                              title="Revoke all remembered devices"
                              data-testid={`revoke-devices-${u.id}`}
                              className="text-orange-400/50 hover:text-orange-400 p-1.5 rounded transition-colors duration-200">
                              <Smartphone size={13} />
                            </button>
                          )}
                          <button onClick={() => handleDeleteUser(u)} data-testid="crm-settings-delete-account-button"
                            className="text-red-400/50 hover:text-red-400 p-1.5 rounded transition-colors duration-200">
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 p-3 bg-white/3 rounded-lg border border-white/6">
              <p className="text-white/58 text-xs">
                <strong className="text-white/55">Role permissions:</strong>{' '}
                <span className="text-[#7FCCA6]/70">Owner</span> - full access including delete.{' '}
                <span className="text-blue-300/70">Admin</span> - manage staff, delete leads.{' '}
                <span className="text-white/65">Staff</span> - view leads, update status, add notes. Cannot delete.
              </p>
            </div>
          </section>
        )}

        {/* SMS Notification Numbers - Owner Only */}
        {isOwner && (
          <section className="card-marketing p-6" data-testid="sms-settings-section">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <MessageSquare size={15} className="text-[#1B7A4A]" />
                <h2 className="font-display text-xl text-white tracking-wide">SMS ALERT NUMBERS</h2>
                <span className="text-white/48 text-xs">owner only</span>
              </div>
              {smsSaving && <Loader2 size={13} className="animate-spin text-white/40" />}
            </div>
            <p className="text-white/45 text-xs mb-5 leading-relaxed">
              These numbers receive an instant text whenever a new lead submits the form. Use E.164 format (e.g. <span className="text-white/70 font-mono">+15103616605</span>).
            </p>

            {/* Current numbers */}
            {smsLoading ? (
              <div className="flex gap-2 mb-4">
                {[1,2].map(i => <div key={i} className="h-8 w-36 bg-white/8 rounded-full animate-pulse" />)}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 mb-4">
                {smsNumbers.length === 0 && (
                  <p className="text-white/30 text-xs italic">No numbers added yet</p>
                )}
                {smsNumbers.map(num => (
                  <div key={num} className="flex items-center gap-1.5 bg-[#1B7A4A]/12 border border-[#1B7A4A]/25 text-[#7FCCA6] text-xs font-mono px-3 py-1.5 rounded-full">
                    <PhoneIcon size={10} />
                    <span>{num}</span>
                    <button onClick={() => handleRemoveSmsNumber(num)}
                      className="ml-1 text-white/35 hover:text-red-400 transition-colors duration-150"
                      data-testid={`sms-remove-${num}`}>
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add number */}
            <div className="flex gap-2">
              <input
                value={newSmsNumber}
                onChange={e => setNewSmsNumber(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddSmsNumber()}
                placeholder="+15103616605"
                data-testid="sms-number-input"
                className="flex-1 bg-white/5 border border-white/12 text-white placeholder:text-white/28 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1B7A4A]/50"
              />
              <button
                onClick={handleAddSmsNumber}
                disabled={smsSaving}
                data-testid="sms-add-number-btn"
                className="flex items-center gap-1.5 btn-scs-primary px-4 py-2 text-sm rounded-lg"
              >
                <Plus size={14} /> Add
              </button>
            </div>
          </section>
        )}

        {/* Staff Schedule - Owner Only */}
        {isOwner && staffedHours && (
          <section className="card-marketing p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <CalendarDays size={15} className="text-[#1B7A4A]" />
                <h2 className="font-display text-xl text-white tracking-wide">STAFFED HOURS</h2>
                <span className="text-white/48 text-xs">owner only</span>
              </div>
              <button
                onClick={handleSaveHours}
                disabled={hoursSaving}
                className="btn-scs-primary px-3 py-2 rounded-md text-xs flex items-center gap-1.5"
              >
                {hoursSaving ? <><Loader2 size={12} className="animate-spin" /> Saving...</> : 'Save Hours'}
              </button>
            </div>

            <p className="text-white/58 text-xs mb-4">
              Set when staff are available. This shows on the follow-up scheduler so your team knows if someone will be around - but you can still schedule outside these hours.
            </p>

            <div className="space-y-2">
              {['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map((day) => {
                const d = staffedHours[day] || { enabled: false, open: '09:00', close: '17:00' };
                return (
                  <div key={day} className="flex items-center gap-3 p-3 bg-white/3 border border-white/7 rounded-lg">
                    <div className="w-24 shrink-0">
                      <p className="text-white text-sm capitalize font-medium">{day}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStaffedHours(p => ({ ...p, [day]: { ...d, enabled: !d.enabled } }))}
                      className={`w-10 h-5 rounded-full transition-colors duration-200 shrink-0 relative ${d.enabled ? 'bg-[#1B7A4A]' : 'bg-white/15'}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all duration-200 ${d.enabled ? 'left-5' : 'left-0.5'}`} />
                    </button>
                    {d.enabled ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="time"
                          value={d.open}
                          onChange={(e) => setStaffedHours(p => ({ ...p, [day]: { ...d, open: e.target.value } }))}
                          className="bg-white/5 border border-white/10 text-white rounded px-2 py-1 text-xs w-24"
                          style={{ colorScheme: 'dark' }}
                        />
                        <span className="text-white/48 text-xs">to</span>
                        <input
                          type="time"
                          value={d.close}
                          onChange={(e) => setStaffedHours(p => ({ ...p, [day]: { ...d, close: e.target.value } }))}
                          className="bg-white/5 border border-white/10 text-white rounded px-2 py-1 text-xs w-24"
                          style={{ colorScheme: 'dark' }}
                        />
                        <span className="text-white/58 text-xs">
                          {(() => {
                            const [oh, om] = d.open.split(':').map(Number);
                            const [ch, cm] = d.close.split(':').map(Number);
                            const hrs = ((ch * 60 + cm) - (oh * 60 + om)) / 60;
                            return hrs > 0 ? `${hrs}h` : '';
                          })()}
                        </span>
                      </div>
                    ) : (
                      <span className="text-white/42 text-xs">Closed / No staff</span>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="text-white/42 text-xs mt-3">
              * After-hours slots are shown dimmed on the follow-up scheduler. You can still pick them - they'll be marked as outside staffed hours.
            </p>
          </section>
        )}

        {/* Email Config Note */}
        <section className="card-marketing p-6 border-yellow-500/15">
          <h2 className="font-display text-lg text-white tracking-wide mb-3">EMAIL NOTIFICATIONS</h2>
          <p className="text-white/62 text-sm leading-relaxed">
            Email notifications and invite emails require SMTP configuration. Contact your system admin to set:
          </p>
          <ul className="mt-3 space-y-1 text-white/52 text-xs font-mono">
            <li>SMTP_HOST - e.g. smtp.gmail.com</li>
            <li>SMTP_USER - sending email address</li>
            <li>SMTP_PASSWORD - app password or SMTP password</li>
            <li>NOTIFICATION_EMAIL - where new lead alerts go</li>
            <li>FROM_EMAIL - display sender address</li>
          </ul>
          <p className="text-white/42 text-xs mt-3">Until configured, invite links can be copied and shared manually.</p>
        </section>

      </div>

      {/* Send Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={(open) => { setInviteOpen(open); if (!open) { setInviteResult(null); setNewInvite({ name: '', email: '', role: 'staff' }); } }}>
        <DialogContent className="bg-[var(--surface)] border-white/12 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display tracking-wide text-lg">INVITE STAFF MEMBER</DialogTitle>
          </DialogHeader>
          {inviteResult ? (
            <div className="mt-2 space-y-4">
              <div className={`p-3 rounded-lg border ${
                inviteResult.email_sent ? 'bg-[#1B7A4A]/10 border-[#1B7A4A]/25' : 'bg-yellow-500/8 border-yellow-500/20'
              }`}>
                <p className="text-white text-sm font-medium mb-1">
                  {inviteResult.email_sent ? '✓ Invite email sent!' : 'Invite created - email not configured'}
                </p>
                <p className="text-white/62 text-xs">Share this link with your staff member:</p>
              </div>
              <div className="relative">
                <input readOnly value={inviteResult.invite_url}
                  className="w-full bg-white/5 border border-white/12 text-white/70 text-xs rounded-md px-3 py-2.5 pr-10 font-mono" />
                <button onClick={() => copyInviteLink(inviteResult.invite_url)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/58 hover:text-white transition-colors duration-200">
                  {copied ? <Check size={14} className="text-[#7FCCA6]" /> : <Copy size={14} />}
                </button>
              </div>
              <p className="text-white/48 text-xs">Expires in 7 days. One-time use.</p>
              <button onClick={() => { setInviteOpen(false); setInviteResult(null); setNewInvite({ name: '', email: '', role: 'staff' }); }}
                className="w-full btn-scs-secondary py-2.5 rounded-md text-sm">Done</button>
            </div>
          ) : (
            <form onSubmit={handleSendInvite} className="space-y-3 mt-2">
              <div>
                <label className="block text-xs text-white/55 mb-1">Their Name *</label>
                <input required value={newInvite.name} onChange={(e) => setNewInvite(p => ({...p, name: e.target.value}))}
                  placeholder="Jane Smith" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-white/55 mb-1">Their Email *</label>
                <input required type="email" value={newInvite.email} onChange={(e) => setNewInvite(p => ({...p, email: e.target.value}))}
                  placeholder="jane@example.com" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-white/55 mb-1">Role</label>
                <select value={newInvite.role} onChange={(e) => setNewInvite(p => ({...p, role: e.target.value}))}
                  className={inputClass + ' appearance-none'} style={{backgroundColor:'var(--elevated)'}}>
                  <option value="staff" style={{background:'#1A1A1A'}}>Staff - view + notes (no delete)</option>
                  {isOwner && <option value="admin" style={{background:'#1A1A1A'}}>Admin - full access</option>}
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setInviteOpen(false)} className="flex-1 btn-scs-secondary py-2.5 rounded-md text-sm">Cancel</button>
                <button type="submit" disabled={inviteLoading} className="flex-1 btn-scs-primary py-2.5 rounded-md text-sm flex items-center justify-center gap-2">
                  {inviteLoading ? <><Loader2 size={13} className="animate-spin" /> Sending...</> : <><Mail size={13} /> Send Invite</>}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Add User Directly */}
      <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
        <DialogContent className="bg-[var(--surface)] border-white/12 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display tracking-wide text-lg">ADD STAFF (DIRECT)</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-3 mt-2">
            <div>
              <label className="block text-xs text-white/55 mb-1">Full Name *</label>
              <input required value={newUser.name} onChange={(e) => setNewUser(p => ({...p, name: e.target.value}))} className={inputClass} placeholder="Jane Smith" />
            </div>
            <div>
              <label className="block text-xs text-white/55 mb-1">Email *</label>
              <input required type="email" value={newUser.email} onChange={(e) => setNewUser(p => ({...p, email: e.target.value}))} className={inputClass} placeholder="jane@santacruzstrength.com" />
            </div>
            <div>
              <label className="block text-xs text-white/55 mb-1">Password *</label>
              <input required type="password" value={newUser.password} onChange={(e) => setNewUser(p => ({...p, password: e.target.value}))} className={inputClass} placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-xs text-white/55 mb-1">Role</label>
              <select value={newUser.role} onChange={(e) => setNewUser(p => ({...p, role: e.target.value}))}
                className={inputClass + ' appearance-none'} style={{backgroundColor:'var(--elevated)'}}>
                <option value="staff" style={{background:'#1A1A1A'}}>Staff</option>
                {isOwner && <option value="admin" style={{background:'#1A1A1A'}}>Admin</option>}
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setAddUserOpen(false)} className="flex-1 btn-scs-secondary py-2.5 rounded-md text-sm">Cancel</button>
              <button type="submit" disabled={addLoading} className="flex-1 btn-scs-primary py-2.5 rounded-md text-sm flex items-center justify-center gap-2">
                {addLoading ? <><Loader2 size={13} className="animate-spin" /> Creating...</> : 'Create Account'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
