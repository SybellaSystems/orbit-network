'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { signIn, signUp } from '@/lib/auth';
import { Hexagon, Eye, EyeOff, AlertCircle } from 'lucide-react';

type Mode = 'login' | 'register';

const ORBIT_OPTIONS = [
  { value: 'FORGE', label: 'Orbit Forge', desc: 'Learning & onboarding', color: '#1D9E75' },
  { value: 'LABS', label: 'Orbit Labs', desc: 'AI research & experimentation', color: '#7F77DD' },
  { value: 'CORE', label: 'Orbit Core', desc: 'Engineering & infrastructure', color: '#888780' },
  { value: 'OPEN', label: 'Orbit Open', desc: 'Open-source development', color: '#BA7517' },
  { value: 'INTELLIGENCE', label: 'Orbit Intelligence', desc: 'Product & SaaS', color: '#378ADD' },
];

export default function LoginPage() {
  const router = useRouter();
  const { member } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [orbit, setOrbit] = useState('FORGE');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (member) router.push('/dashboard'); }, [member, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const result = await signIn(email, password);
        if (result.error) setError(result.error);
        else router.push('/dashboard');
      } else {
        if (!name.trim()) { setError('Name is required'); return; }
        const result = await signUp(email, password, name, orbit);
        if (result.error) setError(result.error);
        else router.push('/dashboard');
      }
    } finally { setLoading(false); }
  }

  const inputStyle = {
    background: '#1A1A1A', border: '1px solid #2E2E2E', color: '#F5F5F5',
    fontFamily: 'DM Sans, system-ui, sans-serif',
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 opacity-30 grid-bg" />
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(15,110,86,0.2) 0%, rgba(29,158,117,0.1) 100%)', border: '1px solid rgba(15, 110, 86, 0.4)' }}>
              <Hexagon size={20} color="#1D9E75" strokeWidth={2} />
            </div>
            <div>
              <div className="text-xl font-bold text-[#F5F5F5]" style={{ fontFamily: 'Syne, system-ui, sans-serif' }}>Orbit Network</div>
              <div className="text-xs text-[#888888] mt-0.5">Sybella Systems Ltd</div>
            </div>
          </Link>
        </div>

        <div className="rounded-2xl border border-[#2E2E2E] bg-[#111111] p-7 shadow-2xl">
          <div className="flex rounded-lg bg-[#1A1A1A] p-1 mb-7">
            {(['login', 'register'] as Mode[]).map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                className="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-150"
                style={{ fontFamily: 'DM Sans, system-ui, sans-serif', background: mode === m ? '#222222' : 'transparent', color: mode === m ? '#F5F5F5' : '#888888', border: mode === m ? '1px solid #2E2E2E' : '1px solid transparent' }}>
                {m === 'login' ? 'Sign in' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs text-[#888888] mb-1.5 font-display uppercase tracking-wide">Full name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Okonkwo" required
                  className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition-all duration-150"
                  style={inputStyle} onFocus={(e) => { e.currentTarget.style.borderColor = '#0F6E56'; }} onBlur={(e) => { e.currentTarget.style.borderColor = '#2E2E2E'; }} />
              </div>
            )}
            <div>
              <label className="block text-xs text-[#888888] mb-1.5 font-display uppercase tracking-wide">Email address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="builder@sybella.rw" required
                className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition-all duration-150"
                style={inputStyle} onFocus={(e) => { e.currentTarget.style.borderColor = '#0F6E56'; }} onBlur={(e) => { e.currentTarget.style.borderColor = '#2E2E2E'; }} />
            </div>
            <div>
              <label className="block text-xs text-[#888888] mb-1.5 font-display uppercase tracking-wide">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'Min. 8 characters' : '••••••••'} required minLength={mode === 'register' ? 8 : undefined}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg text-sm outline-none transition-all duration-150"
                  style={inputStyle} onFocus={(e) => { e.currentTarget.style.borderColor = '#0F6E56'; }} onBlur={(e) => { e.currentTarget.style.borderColor = '#2E2E2E'; }} />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888888] hover:text-[#F5F5F5]">
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            {mode === 'register' && (
              <div>
                <label className="block text-xs text-[#888888] mb-1.5 font-display uppercase tracking-wide">Select your Orbit</label>
                <div className="space-y-2">
                  {ORBIT_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all duration-150"
                      style={{ border: orbit === opt.value ? `1px solid ${opt.color}50` : '1px solid #2E2E2E', background: orbit === opt.value ? `${opt.color}10` : '#1A1A1A' }}>
                      <input type="radio" name="orbit" value={opt.value} checked={orbit === opt.value} onChange={(e) => setOrbit(e.target.value)} className="sr-only" />
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: orbit === opt.value ? opt.color : '#2E2E2E' }} />
                      <div>
                        <div className="text-sm font-medium" style={{ color: orbit === opt.value ? opt.color : '#F5F5F5' }}>{opt.label}</div>
                        <div className="text-xs text-[#888888]">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 px-3.5 py-3 rounded-lg bg-red-950/30 border border-red-900/40 text-red-400 text-sm">
                <AlertCircle size={14} className="flex-shrink-0" />{error}
              </div>
            )}
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200 disabled:opacity-50 mt-2"
              style={{ background: loading ? '#0F6E56' : 'linear-gradient(135deg, #0F6E56 0%, #1D9E75 100%)', fontFamily: 'DM Sans, system-ui, sans-serif', boxShadow: '0 0 16px rgba(15, 110, 86, 0.25)' }}>
              {loading ? 'Processing...' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-[#444444] mt-6" style={{ fontFamily: 'DM Sans, system-ui, sans-serif' }}>Orbit Network is invite-only. Access requires prior approval.</p>
      </div>
    </div>
  );
}
