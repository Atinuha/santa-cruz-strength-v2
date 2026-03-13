import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import { GYM_CONFIG } from '../../config';

export default function ForgotPassword() {
  const [email, setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]     = useState(false);
  const [error, setError]   = useState('');

  const inputClass = `w-full bg-white/5 border border-white/12 text-white placeholder:text-white/48
    rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/45
    transition-colors duration-200`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
      const res = await fetch(`${backendUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('Request failed');
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
            <h1 className="font-display text-2xl text-white tracking-wide">FORGOT PASSWORD</h1>
            <p className="text-white/52 text-sm mt-1">{GYM_CONFIG.name} — Staff Portal</p>
          </div>

          <div className="card-marketing p-6">
            {sent ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-[#1B7A4A]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={22} className="text-[#7FCCA6]" />
                </div>
                <p className="text-white font-semibold mb-2">Check your email</p>
                <p className="text-white/55 text-sm leading-relaxed">
                  If <span className="text-white">{email}</span> is registered, you'll receive a reset link shortly.
                </p>
                <Link to="/staff/login"
                  className="inline-block mt-5 text-sm text-[#7FCCA6] hover:text-white transition-colors duration-200 font-semibold">
                  Back to login →
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Your staff email address</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
                    <input
                      type="email" required value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@santacruzstrength.com"
                      className={`${inputClass} pl-9`}
                      data-testid="forgot-password-email-input"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/18 rounded px-3 py-2">{error}</p>
                )}

                <button type="submit" disabled={loading}
                  className="w-full btn-scs-primary py-3 rounded-md font-semibold text-sm flex items-center justify-center gap-2"
                  data-testid="forgot-password-submit">
                  {loading ? <><Loader2 size={14} className="animate-spin" /> Sending...</> : 'Send Reset Link'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
