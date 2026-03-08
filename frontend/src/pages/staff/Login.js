import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, Eye, EyeOff } from 'lucide-react';
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

  const inputClass = `w-full bg-black/40 border border-white/12 text-white placeholder:text-white/35
    rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent
    transition-colors duration-200`;

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-[#D32F2F] rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="font-display text-white text-2xl">S</span>
          </div>
          <h1 className="font-display text-2xl text-white tracking-wide">STAFF LOGIN</h1>
          <p className="text-white/40 text-sm mt-1">{GYM_CONFIG.name} — CRM Dashboard</p>
        </div>

        {/* Card */}
        <div className="card-marketing p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@santacruzstrength.com"
                required
                data-testid="staff-login-email-input"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  data-testid="staff-login-password-input"
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors duration-200"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              data-testid="staff-login-submit-button"
              className="w-full btn-scs-primary py-3 rounded-md font-semibold text-sm flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 size={15} className="animate-spin" /> Signing in...</> : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/25 text-xs mt-4">
          Staff access only. Contact admin for credentials.
        </p>
      </div>
    </div>
  );
}
