import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, Eye, EyeOff, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { GYM_CONFIG } from '../../config';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState('');

  const inputClass = `w-full bg-white/5 border border-white/12 text-white placeholder:text-white/48
    rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/45
    transition-colors duration-200`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8)  { setError('Password must be at least 8 characters'); return; }
    setError('');
    setLoading(true);
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
      const res = await fetch(`${backendUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Reset failed');
      setSuccess(true);
      setTimeout(() => navigate('/staff/login'), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[var(--ink)] flex items-center justify-center px-4">
        <div className="text-center">
          <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
          <p className="text-white font-semibold mb-2">Invalid reset link</p>
          <p className="text-white/55 text-sm mb-4">This link is missing required information.</p>
          <Link to="/staff/forgot-password" className="text-[#7FCCA6] text-sm font-semibold hover:text-white transition-colors duration-200">Request a new reset link →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--ink)] flex flex-col px-4">
      <div className="py-4">
        <Link to="/staff/login"
          className="inline-flex items-center gap-1.5 text-sm text-white/52 hover:text-white transition-colors duration-200 group">
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform duration-200" />
          Back to login
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="font-display text-2xl text-white tracking-wide">SET NEW PASSWORD</h1>
            <p className="text-white/52 text-sm mt-1">{GYM_CONFIG.name} — Staff Portal</p>
          </div>

          <div className="card-marketing p-6">
            {success ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-[#1B7A4A]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={22} className="text-[#7FCCA6]" />
                </div>
                <p className="text-white font-semibold mb-2">Password updated!</p>
                <p className="text-white/55 text-sm">Redirecting you to login...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">New Password</label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 8 characters" required
                      className={`${inputClass} pr-10`}
                      data-testid="reset-password-input" />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/52 hover:text-white/65 transition-colors duration-200">
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Confirm New Password</label>
                  <input type="password" value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat password" required
                    className={inputClass}
                    data-testid="reset-password-confirm" />
                </div>

                {error && (
                  <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/18 rounded px-3 py-2">{error}</p>
                )}

                <button type="submit" disabled={loading}
                  className="w-full btn-scs-primary py-3 rounded-md font-semibold text-sm flex items-center justify-center gap-2"
                  data-testid="reset-password-submit">
                  {loading ? <><Loader2 size={14} className="animate-spin" /> Updating...</> : 'Set New Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
