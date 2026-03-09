import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GYM_CONFIG } from '../../config';

export default function StaffLogin() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (user) return <Navigate to="/staff/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      navigate('/staff/dashboard');
    } else {
      setError(result.error);
    }
  };

  const inputClass = `w-full bg-white/5 border border-white/12 text-white placeholder:text-white/48
    rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/45 focus:border-transparent
    transition-colors duration-200`;

  return (
    <div className="min-h-screen bg-[var(--ink)] flex flex-col px-4">
      {/* Back to website — top of page, always visible */}
      <div className="py-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-white/52 hover:text-white transition-colors duration-200 group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform duration-200" />
          Back to website
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center mx-auto mb-4">
            <img src="https://customer-assets.emergentagent.com/job_local-gym-hub/artifacts/luzlwc0v_SCS_Circle_Logo_1_20260308_193638_0000.jpg"
              alt="Santa Cruz Strength" className="w-full h-full object-contain"
              style={{ filter: 'invert(1)', mixBlendMode: 'screen' }} />
          </div>
          <h1 className="font-display text-2xl text-white tracking-wide">STAFF LOGIN</h1>
          <p className="text-white/52 text-sm mt-1">{GYM_CONFIG.name} — Lead CRM</p>
        </div>

        <div className="card-marketing p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="management@santacruzstrength.com"
                required data-testid="staff-login-email-input" className={inputClass} />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  required data-testid="staff-login-password-input" className={`${inputClass} pr-10`} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/52 hover:text-white/65 transition-colors duration-200">
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/18 rounded px-3 py-2">{error}</p>
            )}

            <button type="submit" disabled={loading} data-testid="staff-login-submit-button"
              className="w-full btn-scs-primary py-3 rounded-md font-semibold text-sm flex items-center justify-center gap-2">
              {loading ? <><Loader2 size={14} className="animate-spin" /> Signing in...</> : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/38 text-xs mt-4">Staff access only.</p>
      </div>
      </div>
    </div>
  );
}
