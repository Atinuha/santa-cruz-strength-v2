import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getUsers, createUser, updateUser, deleteUser, updateMe } from '../../lib/api';
import { ArrowLeft, Plus, Trash2, Loader2, LogOut, Shield, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { toast } from 'sonner';

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [addUserOpen, setAddUserOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.email || '', password: '', confirm_password: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'staff', location: 'santa_cruz' });

  const isAdmin = user?.role === 'admin';

  const fetchUsers = async () => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    try {
      const res = await getUsers();
      setUsers(res.data);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (profileForm.password && profileForm.password !== profileForm.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    setProfileSaving(true);
    try {
      const data = { name: profileForm.name, email: profileForm.email };
      if (profileForm.password) data.password = profileForm.password;
      await updateMe(data);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      await createUser(newUser);
      toast.success('Staff account created');
      setAddUserOpen(false);
      setNewUser({ name: '', email: '', password: '', role: 'staff', location: 'santa_cruz' });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create user');
    } finally {
      setAddLoading(false);
    }
  };

  const handleToggleActive = async (u) => {
    try {
      await updateUser(u.id, { is_active: !u.is_active });
      toast.success(u.is_active ? 'Account disabled' : 'Account enabled');
      fetchUsers();
    } catch {
      toast.error('Failed to update account');
    }
  };

  const handleDeleteUser = async (u) => {
    if (!window.confirm(`Delete account for ${u.name}? This cannot be undone.`)) return;
    try {
      await deleteUser(u.id);
      toast.success('User deleted');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete user');
    }
  };

  const inputClass = 'w-full bg-black/40 border border-white/12 text-white placeholder:text-white/35 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 transition-colors duration-200';

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0A0A0A]/95 backdrop-blur border-b border-white/8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/staff/dashboard')} className="text-white/50 hover:text-white flex items-center gap-1.5 text-sm transition-colors duration-200">
              <ArrowLeft size={15} /> Dashboard
            </button>
            <span className="text-white/20">/</span>
            <span className="text-white text-sm">Settings</span>
          </div>
          <button onClick={() => { logout(); navigate('/staff/login'); }} className="text-white/40 hover:text-white/70 p-1.5 rounded">
            <LogOut size={15} />
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* My Profile */}
        <section className="card-marketing p-6">
          <div className="flex items-center gap-2 mb-5">
            <User size={16} className="text-[#D32F2F]" />
            <h2 className="font-display text-xl text-white tracking-wide">MY PROFILE</h2>
          </div>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-white/60 mb-1.5">Full Name</label>
                <input value={profileForm.name} onChange={(e) => setProfileForm(p => ({...p, name: e.target.value}))} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1.5">Email</label>
                <input type="email" value={profileForm.email} onChange={(e) => setProfileForm(p => ({...p, email: e.target.value}))} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1.5">New Password (leave blank to keep current)</label>
                <input type="password" value={profileForm.password} onChange={(e) => setProfileForm(p => ({...p, password: e.target.value}))} className={inputClass} placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1.5">Confirm New Password</label>
                <input type="password" value={profileForm.confirm_password} onChange={(e) => setProfileForm(p => ({...p, confirm_password: e.target.value}))} className={inputClass} placeholder="••••••••" />
              </div>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-white/30 text-xs">Role: <span className="text-white/50">{user?.role}</span></span>
              <button type="submit" disabled={profileSaving} data-testid="crm-settings-update-profile-button"
                className="btn-scs-primary px-5 py-2.5 rounded-md text-sm font-semibold flex items-center gap-2">
                {profileSaving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : 'Save Changes'}
              </button>
            </div>
          </form>
        </section>

        {/* Staff Management (Admin only) */}
        {isAdmin && (
          <section className="card-marketing p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-[#D32F2F]" />
                <h2 className="font-display text-xl text-white tracking-wide">STAFF ACCOUNTS</h2>
              </div>
              <button onClick={() => setAddUserOpen(true)} className="btn-scs-primary px-3 py-2 rounded-md text-xs flex items-center gap-1.5">
                <Plus size={13} /> Add Staff
              </button>
            </div>

            {loadingUsers ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-[#D32F2F] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3 bg-white/3 border border-white/8 rounded-lg">
                    <div>
                      <p className="text-white text-sm font-medium">{u.name}</p>
                      <p className="text-white/40 text-xs">{u.email} · {u.role}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded border ${
                        u.is_active
                          ? 'bg-green-600/10 text-green-400 border-green-600/20'
                          : 'bg-gray-600/10 text-gray-400 border-gray-600/20'
                      }`}>
                        {u.is_active ? 'Active' : 'Disabled'}
                      </span>
                      {u.id !== user.id && (
                        <>
                          <button
                            onClick={() => handleToggleActive(u)}
                            className="text-white/40 hover:text-white text-xs btn-scs-secondary px-2 py-1 rounded"
                          >
                            {u.is_active ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            data-testid="crm-settings-delete-account-button"
                            className="text-red-400/60 hover:text-red-400 p-1 rounded transition-colors duration-200"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Email Config Note */}
        <section className="card-marketing p-6 border-yellow-500/20">
          <h2 className="font-display text-lg text-white tracking-wide mb-3">EMAIL NOTIFICATIONS</h2>
          <p className="text-white/55 text-sm leading-relaxed">
            Email notifications are currently configured via environment variables. Contact your system administrator to configure SMTP settings for live email delivery to:
          </p>
          <ul className="mt-3 space-y-1 text-white/40 text-xs">
            <li>SMTP_HOST — Email server hostname</li>
            <li>SMTP_USER — Authentication username</li>
            <li>SMTP_PASSWORD — Authentication password</li>
            <li>NOTIFICATION_EMAIL — Where lead alerts are sent</li>
            <li>FROM_EMAIL — Sender address</li>
          </ul>
        </section>
      </div>

      {/* Add User Dialog */}
      <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
        <DialogContent className="bg-[#111214] border-white/12 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display tracking-wide text-lg">ADD STAFF ACCOUNT</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-3 mt-2">
            <div>
              <label className="block text-xs text-white/60 mb-1">Full Name *</label>
              <input required value={newUser.name} onChange={(e) => setNewUser(p => ({...p, name: e.target.value}))} className={inputClass} placeholder="Jane Smith" />
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1">Email *</label>
              <input required type="email" value={newUser.email} onChange={(e) => setNewUser(p => ({...p, email: e.target.value}))} className={inputClass} placeholder="jane@santacruzstrength.com" />
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1">Password *</label>
              <input required type="password" value={newUser.password} onChange={(e) => setNewUser(p => ({...p, password: e.target.value}))} className={inputClass} placeholder="••••••••" />
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1">Role</label>
              <select value={newUser.role} onChange={(e) => setNewUser(p => ({...p, role: e.target.value}))} className={inputClass + ' appearance-none'} style={{backgroundColor:'rgba(0,0,0,0.5)'}}>
                <option value="staff" style={{background:'#1A1A1A'}}>Staff</option>
                <option value="admin" style={{background:'#1A1A1A'}}>Admin</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setAddUserOpen(false)} className="flex-1 btn-scs-secondary py-2.5 rounded-md text-sm">Cancel</button>
              <button type="submit" disabled={addLoading} className="flex-1 btn-scs-primary py-2.5 rounded-md text-sm flex items-center justify-center gap-2">
                {addLoading ? <><Loader2 size={14} className="animate-spin" /> Creating...</> : 'Create Account'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
