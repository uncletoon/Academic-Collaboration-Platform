import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Lock, Mail, Loader2, ArrowRight, Users, BookOpen, Globe } from 'lucide-react';

const Login = ({ onSwitchRegister }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [focusField, setFocusField] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setErrorMsg(err.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  const getInputStyle = (fieldName) => ({
    background: '#FFFFFF',
    border: focusField === fieldName ? '2px solid #2563EB' : '1.5px solid #E2E8F0',
    color: '#0F172A',
    outline: 'none',
    boxShadow: focusField === fieldName ? '0 0 0 4px rgba(37,99,235,0.10)' : 'none',
    transition: 'border 0.2s, box-shadow 0.2s',
  });

  const stats = [
    { icon: Users, label: 'Academic members', value: '12,000+' },
    { icon: BookOpen, label: 'Projects', value: '3,400+' },
    { icon: Globe, label: 'Institutions', value: '280+' },
  ];

  return (
    <div className="min-h-screen flex relative overflow-hidden" style={{ background: '#F8FAFC' }}>

      {/* ════════════════════════════════════════════════════════
          LEFT PANEL — Deep navy hero
          ════════════════════════════════════════════════════════ */}
      <div
        className="hidden lg:flex flex-1 flex-col items-center justify-center p-16 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0F172A 0%, #1E3A8A 50%, #1D4ED8 100%)' }}
      >
        {/* Decorative background circles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #60A5FA 0%, transparent 70%)' }} />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, #3B82F6 0%, transparent 70%)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5"
            style={{ background: 'radial-gradient(circle, #93C5FD 0%, transparent 60%)' }} />
          {/* Dashed orbit rings */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full border border-dashed opacity-20 animate-spin-slow"
            style={{ borderColor: 'rgba(147,197,253,0.5)' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full border opacity-15"
            style={{ borderColor: 'rgba(147,197,253,0.4)', animation: 'spinSlow 18s linear infinite reverse' }} />
        </div>

        {/* Icon badge */}
        <div className="relative z-10 mb-10 animate-tilt-3d">
          <div className="w-28 h-28 rounded-3xl flex items-center justify-center shadow-2xl"
            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 100%)', border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(12px)' }}>
            <GraduationCap className="h-14 w-14" style={{ color: '#93C5FD' }} strokeWidth={1.5} />
          </div>
                 
        </div>

        {/* Heading */}
        <div className="relative z-10 text-center max-w-sm mb-12">
          <h1 className="text-4xl font-bold leading-tight mb-4" style={{ color: '#FFFFFF', fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em' }}>
            Academic Collaboration Network
          </h1>
          <p className="text-base leading-relaxed" style={{ color: 'rgba(186,230,253,0.85)' }}>
            Connect with academic members, join cross-institutional projects, and discover academic events worldwide.
          </p>
        </div>

        {/* Stats row */}
        <div className="relative z-10 flex gap-6">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex flex-col items-center gap-1.5 px-5 py-4 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', backdropFilter: 'blur(8px)' }}>
              <Icon className="h-5 w-5 mb-1" style={{ color: '#93C5FD' }} strokeWidth={1.5} />
              <span className="text-lg font-bold" style={{ color: '#FFFFFF', fontFamily: 'Outfit, sans-serif' }}>{value}</span>
              <span className="text-xs" style={{ color: 'rgba(186,230,253,0.7)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          RIGHT PANEL — Login Form
          ════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex items-center justify-center p-8 relative" style={{ background: '#F8FAFC' }}>

        {/* Subtle corner orb */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.06) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(99,179,237,0.05) 0%, transparent 70%)', filter: 'blur(40px)' }} />

        <div className="w-full max-w-md relative z-10 animate-slide-up">
          {/* Card */}
          <div className="rounded-3xl p-10" style={{ background: '#FFFFFF', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07), 0 20px 50px -12px rgba(37,99,235,0.12)', border: '1px solid #E2E8F0' }}>

            {/* Top accent line */}
            <div className="absolute top-0 left-10 right-10 h-[3px] rounded-b-full"
              style={{ background: 'linear-gradient(90deg, transparent, #2563EB, #60A5FA, transparent)' }} />

            {/* Header */}
            <div className="flex flex-col items-center mb-8">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)' }}>
                <GraduationCap className="h-7 w-7 text-blue-600" strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-bold text-center mb-1" style={{ color: '#0F172A', fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em' }}>
                Welcome Back
              </h2>
              <p className="text-xs text-center font-semibold uppercase tracking-widest" style={{ color: '#64748B' }}>
                Sign in to your portal
              </p>
            </div>

            {errorMsg && (
              <div className="mb-6 p-4 rounded-2xl text-sm font-medium flex items-center gap-2 animate-scale-in"
                style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: '#475569' }}>Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
                    style={{ color: focusField === 'email' ? '#2563EB' : '#94A3B8' }}>
                    <Mail className="h-4.5 w-4.5" />
                  </span>
                  <input
                    id="login-email"
                    type="email"
                    placeholder="name@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusField('email')}
                    onBlur={() => setFocusField(null)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm font-medium"
                    style={{ ...getInputStyle('email'), fontFamily: 'Inter, sans-serif' }}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: '#475569' }}>Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"
                    style={{ color: focusField === 'password' ? '#2563EB' : '#94A3B8' }}>
                    <Lock className="h-4.5 w-4.5" />
                  </span>
                  <input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusField('password')}
                    onBlur={() => setFocusField(null)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm font-medium"
                    style={{ ...getInputStyle('password'), fontFamily: 'Inter, sans-serif' }}
                    required
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 group"
                style={{
                  background: loading ? '#93C5FD' : 'linear-gradient(135deg, #1D4ED8, #2563EB)',
                  color: '#FFFFFF',
                  fontFamily: 'Outfit, sans-serif',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : '0 4px 14px rgba(37,99,235,0.35)',
                  letterSpacing: '0.01em',
                }}
                onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(37,99,235,0.45)'; } }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = loading ? 'none' : '0 4px 14px rgba(37,99,235,0.35)'; }}
              >
                {loading ? (
                  <><Loader2 className="h-5 w-5 animate-spin" /><span>Authenticating...</span></>
                ) : (
                  <><span>Sign In to Portal</span><ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-6 text-center" style={{ borderTop: '1px solid #E2E8F0' }}>
              <p className="text-sm" style={{ color: '#64748B' }}>
                Don&apos;t have an account?{' '}
                <button
                  onClick={onSwitchRegister}
                  className="font-bold transition-colors duration-200"
                  style={{ color: '#2563EB' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#1D4ED8'}
                  onMouseLeave={e => e.currentTarget.style.color = '#2563EB'}
                >
                  Create one now
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
