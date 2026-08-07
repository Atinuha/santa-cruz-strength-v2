import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { acceptInvite } from '../../lib/api';
import { Loader2, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [form, setForm] = useState({ name: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (!token) setError('Invalid invite link - no token found.');
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true); setError('');
    try {
      await acceptInvite({ token, password: form.password, name: form.name });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to accept invite');
    } finally { setLoading(false); }
  };

  const inputClass = 'w-full bg-black/40 border border-white/12 text-white placeholder:text-white/48 rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/45 transition-colors duration-200';

  if (done) return (
    <div className="min-h-screen bg-[var(--ink)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-14 h-14 rounded-full bg-[#1B7A4A]/15 border border-[#1B7A4A]/25 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 size={28} className="text-[#7FCCA6]" />
        </div>
        <h1 className="font-display text-3xl text-white tracking-wide mb-2">ACCOUNT CREATED</h1>
        <p className="text-white/65 text-sm mb-6">Your staff account is ready. Sign in to access the CRM dashboard.</p>
        <Link to="/staff/login" className="btn-scs-primary px-6 py-3 rounded-md font-semibold text-sm block text-center">
          Sign In Now
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--ink)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center mx-auto mb-4">
            <img src="/assets/scs/logo.png"
              alt="Santa Cruz Strength" className="w-full h-full object-contain"
              style={{ filter: 'invert(1)', mixBlendMode: 'screen' }} />
          </div>
          <h1 className="font-display text-2xl text-white tracking-wide">JOIN THE TEAM</h1>
          <p className="text-white/58 text-sm mt-1">Santa Cruz Strength - Staff Portal</p>
        </div>

        {!token ? (
          <div className="card-marketing p-6 text-center">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        ) : (
          <div className="card-marketing p-6">
            <p className="text-white/65 text-sm mb-5">Set up your account to get started.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Your Name</label>
                <input value={form.name} onChange={(e) => setForm(p => ({...p, name: e.target.value}))}
                  placeholder="Jane Smith" className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Password *</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={form.password}
                    onChange={(e) => setForm(p => ({...p, password: e.target.value}))}
                    placeholder="Min 8 characters" required className={`${inputClass} pr-10`} />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/52 hover:text-white/65">
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Confirm Password *</label>
                <input type="password" value={form.confirm}
                  onChange={(e) => setForm(p => ({...p, confirm: e.target.value}))}
                  placeholder="Repeat password" required className={inputClass} />
              </div>
              {error && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/18 rounded px-3 py-2">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full btn-scs-primary py-3 rounded-md font-semibold text-sm flex items-center justify-center gap-2">
                {loading ? <><Loader2 size={14} className="animate-spin" /> Creating Account...</> : 'Create My Account'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
