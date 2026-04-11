import React, { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { login as apiLogin, verifyOtp as apiVerifyOtp } from '../../lib/api';
import { Loader2, Eye, EyeOff, ArrowLeft, KeyRound, ShieldCheck, Monitor } from 'lucide-react';
import { GYM_CONFIG } from '../../config';

const LOGO_URL = 'https://customer-assets.emergentagent.com/job_f0e6860d-0e81-45b1-9e0b-f7bb6a04df72/artifacts/uf08gcdo_20260313_151045_0000.png';
const DEVICE_TOKEN_KEY = 'scs_device_token';
const DEVICE_EMAIL_KEY = 'scs_device_email';

/** Read stored device token for this email, or null if missing/expired */
function getStoredDeviceToken(email) {
  try {
    const stored = localStorage.getItem(DEVICE_TOKEN_KEY);
    const storedEmail = localStorage.getItem(DEVICE_EMAIL_KEY);
    if (!stored || storedEmail !== email.toLowerCase()) return null;
    return stored;
  } catch { return null; }
}

/** Persist device token (server validates expiry, but we also store it locally) */
function saveDeviceToken(email, token) {
  try {
    localStorage.setItem(DEVICE_TOKEN_KEY, token);
    localStorage.setItem(DEVICE_EMAIL_KEY, email.toLowerCase());
  } catch { /* storage blocked */ }
}

/** Clear device token (logout / use different account) */
function clearDeviceToken() {
  try {
    localStorage.removeItem(DEVICE_TOKEN_KEY);
    localStorage.removeItem(DEVICE_EMAIL_KEY);
  } catch { /* ignore */ }
}

export default function StaffLogin() {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Step 1 — credentials
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  // Step 2 — OTP
  const [step, setStep]             = useState('credentials');
  const [otp, setOtp]               = useState('');
  const [rememberDevice, setRememberDevice] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError]     = useState('');
  const [pendingEmail, setPendingEmail] = useState('');

  if (user) return <Navigate to="/staff/dashboard" replace />;

  const inputClass = `w-full bg-white/5 border border-white/12 text-white placeholder:text-white/48
    rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-white/45 focus:border-transparent
    transition-colors duration-200`;

  // ── Submit credentials — direct login (2FA disabled) ───────────────────────
  const handleCredentials = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiLogin(email, password);

      if (res.data?.step === 'authenticated') {
        const { access_token, user: userData, device_token } = res.data;
        // Always save device token for persistent sessions
        if (device_token) {
          saveDeviceToken(email, device_token);
        }
        await login(null, null, { access_token, user: userData });
        navigate('/staff/dashboard', { replace: true });
      } else if (res.data?.step === 'otp_required') {
        // Fallback in case 2FA is re-enabled later
        setPendingEmail(email);
        setStep('otp');
      }
    } catch (err) {
      clearDeviceToken();
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify OTP ─────────────────────────────────────────────────────
  const handleOtp = async (e) => {
    e.preventDefault();
    setOtpError('');
    setOtpLoading(true);
    try {
      const res = await apiVerifyOtp(pendingEmail, otp, rememberDevice);
      const { access_token, user: userData, device_token } = res.data;

      // Store device token if server issued one (remember_device was true)
      if (device_token) {
        saveDeviceToken(pendingEmail, device_token);
      }

      await login(null, null, { access_token, user: userData });
      navigate('/staff/dashboard', { replace: true });
    } catch (err) {
      setOtpError(err.response?.data?.detail || 'Incorrect or expired code');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResend = async () => {
    setOtpError('');
    setOtp('');
    try {
      await apiLogin(email, password);
      setOtpError('New code sent — check your email.');
    } catch {
      setOtpError('Could not resend. Go back and try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--ink)] flex flex-col px-4">
      <div className="py-4">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-white/52 hover:text-white transition-colors duration-200 group">
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform duration-200" />
          Back to website
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-[#0D5D3E] flex items-center justify-center mx-auto mb-4" style={{ padding: '3px' }}>
              <img src={LOGO_URL} alt="SCS" className="w-full h-full object-contain" style={{ filter: 'invert(1) brightness(2)' }} />
            </div>
            <h1 className="font-display text-2xl text-white tracking-wide">
              {step === 'otp' ? 'CHECK YOUR EMAIL' : 'STAFF LOGIN'}
            </h1>
            <p className="text-white/52 text-sm mt-1">{GYM_CONFIG.name} — Lead CRM</p>
          </div>

          <div className="card-marketing p-6">

            {/* ── STEP 1: Credentials ── */}
            {step === 'credentials' && (
              <form onSubmit={handleCredentials} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Email Address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@santacruzstrength.com" required autoComplete="email"
                    data-testid="staff-login-email-input" className={inputClass} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-white/60">Password</label>
                    <Link to="/staff/forgot-password" className="text-xs text-white/40 hover:text-[#7FCCA6] transition-colors duration-200">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                      required autoComplete="current-password"
                      data-testid="staff-login-password-input" className={`${inputClass} pr-10`} />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/52 hover:text-white/65 transition-colors duration-200">
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/18 rounded px-3 py-2"
                    data-testid="login-error">{error}</p>
                )}

                <button type="submit" disabled={loading}
                  data-testid="staff-login-submit-button"
                  className="w-full btn-scs-primary py-3 rounded-md font-semibold text-sm flex items-center justify-center gap-2">
                  {loading ? <><Loader2 size={14} className="animate-spin" /> Signing in...</> : 'Sign In'}
                </button>
              </form>
            )}

            {/* ── STEP 2: OTP ── */}
            {step === 'otp' && (
              <form onSubmit={handleOtp} className="space-y-4">
                <div className="flex items-start gap-3 bg-[#1B7A4A]/12 border border-[#1B7A4A]/25 rounded-lg px-4 py-3 mb-2">
                  <ShieldCheck size={16} className="text-[#7FCCA6] shrink-0 mt-0.5" />
                  <p className="text-[#CDE4DF] text-xs leading-relaxed">
                    A 6-digit code was sent to <strong className="text-white">{pendingEmail}</strong>. Enter it below to access the CRM.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Verification Code</label>
                  <div className="relative">
                    <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
                    <input
                      type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000" required autoFocus autoComplete="one-time-code"
                      data-testid="otp-input"
                      className={`${inputClass} pl-9 text-center text-2xl tracking-[0.5em] font-mono`}
                    />
                  </div>
                </div>

                {otpError && (
                  <p className={`text-xs rounded px-3 py-2 ${
                    otpError.includes('sent')
                      ? 'text-[#7FCCA6] bg-[#1B7A4A]/10 border border-[#1B7A4A]/20'
                      : 'text-red-400 bg-red-500/10 border border-red-500/18'
                  }`} data-testid="otp-error">{otpError}</p>
                )}

                {/* Remember device checkbox */}
                <label className="flex items-center gap-2.5 cursor-pointer group" data-testid="remember-device-checkbox">
                  <div
                    onClick={() => setRememberDevice(v => !v)}
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all duration-150 ${
                      rememberDevice
                        ? 'bg-[#1B7A4A] border-[#1B7A4A]'
                        : 'bg-white/5 border-white/20 group-hover:border-white/40'
                    }`}
                  >
                    {rememberDevice && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <div onClick={() => setRememberDevice(v => !v)} className="flex items-center gap-1.5">
                    <Monitor size={12} className="text-white/40" />
                    <span className="text-xs text-white/55 group-hover:text-white/75 transition-colors duration-150">
                      Remember this device for 7 days
                    </span>
                  </div>
                </label>

                <button type="submit"
                  disabled={otpLoading || otp.length !== 6}
                  data-testid="otp-verify-button"
                  className="w-full btn-scs-primary py-3 rounded-md font-semibold text-sm flex items-center justify-center gap-2">
                  {otpLoading
                    ? <><Loader2 size={14} className="animate-spin" /> Verifying...</>
                    : 'Verify & Sign In'}
                </button>

                <div className="flex items-center justify-between pt-1">
                  <button type="button"
                    onClick={() => { setStep('credentials'); setOtp(''); setOtpError(''); clearDeviceToken(); }}
                    className="text-xs text-white/40 hover:text-white transition-colors duration-200">
                    ← Use different account
                  </button>
                  <button type="button" onClick={handleResend}
                    className="text-xs text-white/40 hover:text-[#7FCCA6] transition-colors duration-200">
                    Resend code
                  </button>
                </div>
              </form>
            )}
          </div>

          <p className="text-center text-white/38 text-xs mt-4">Staff access only.</p>
        </div>
      </div>
    </div>
  );
}
