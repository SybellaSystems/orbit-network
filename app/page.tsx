import Link from 'next/link';
import { ArrowRight, Hexagon, Zap, Users, TrendingUp, Code2, Star } from 'lucide-react';

const ORBITS = [
  { name: 'Forge', description: 'Learning & onboarding for new builders entering the network.', color: '#1D9E75' },
  { name: 'Labs', description: 'AI research, experimentation, and frontier exploration.', color: '#7F77DD' },
  { name: 'Core', description: 'Engineering, infrastructure, and system reliability.', color: '#888780' },
  { name: 'Open', description: 'Open-source development and community contribution.', color: '#BA7517' },
  { name: 'Intelligence', description: 'Product development and SaaS innovation.', color: '#378ADD' },
];

const LEVELS = [
  { code: 'L0', name: 'Applicant' }, { code: 'L1', name: 'Explorer' }, { code: 'L2', name: 'Builder' },
  { code: 'L3', name: 'Contributor' }, { code: 'L4', name: 'Specialist' }, { code: 'L5', name: 'Lead Builder' },
  { code: 'L6', name: 'Architect' }, { code: 'L7', name: 'Vision Lead' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5F5]">
      <nav className="border-b border-[#1E1E1E] bg-[#0D0D0D]/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#0F6E56]/20 border border-[#0F6E56]/40">
              <Hexagon size={14} className="text-[#1D9E75]" strokeWidth={2} />
            </div>
            <span className="font-bold text-base tracking-tight text-[#F5F5F5]" style={{ fontFamily: 'Syne, system-ui, sans-serif' }}>Orbit Network</span>
          </div>
          <Link href="/login" className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 bg-[#0F6E56]/20 border border-[#0F6E56]/40 text-[#1D9E75] hover:bg-[#0F6E56]/30">
            Sign in <ArrowRight size={13} />
          </Link>
        </div>
      </nav>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-40 grid-bg" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#0F6E56]/50 to-transparent" />
        <div className="relative max-w-6xl mx-auto px-4 md:px-8 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#2E2E2E] bg-[#1A1A1A] text-xs text-[#888888] mb-8" style={{ fontFamily: 'DM Sans, system-ui, sans-serif' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75]" />Invite-only · Kigali, Rwanda
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-[#F5F5F5] mb-6 leading-tight" style={{ fontFamily: 'Syne, system-ui, sans-serif', letterSpacing: '-0.02em' }}>
            The structured ecosystem<br />for <span style={{ color: '#1D9E75' }}>AI builders</span>
          </h1>
          <p className="text-[#888888] text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed" style={{ fontFamily: 'DM Sans, system-ui, sans-serif' }}>
            Orbit Network grows individuals from beginners into advanced engineers through rigorous learning progression, contribution tracking, and merit-based promotion.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/login" className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200" style={{ background: 'linear-gradient(135deg, #0F6E56 0%, #1D9E75 100%)', fontFamily: 'DM Sans, system-ui, sans-serif', boxShadow: '0 0 20px rgba(15, 110, 86, 0.3)' }}>
              Access the Network <ArrowRight size={14} />
            </Link>
            <div className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm text-[#888888] border border-[#2E2E2E]" style={{ fontFamily: 'DM Sans, system-ui, sans-serif' }}>
              <Star size={13} className="text-[#BA7517]" />Invite-only access
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#1E1E1E] bg-[#111111] py-6">
        <div className="max-w-6xl mx-auto px-4 md:px-8 flex items-center justify-center gap-8 md:gap-16 flex-wrap">
          {['Learn', 'Build', 'Contribute', 'Evolve'].map((word, i) => (
            <div key={word} className="flex items-center gap-4 md:gap-8">
              <span className="text-lg md:text-xl font-bold text-[#F5F5F5]" style={{ fontFamily: 'Syne, system-ui, sans-serif' }}>{word}</span>
              {i < 3 && <span className="text-[#2E2E2E] text-2xl">·</span>}
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 md:px-8 py-20">
        <div className="mb-10">
          <p className="text-xs text-[#888888] uppercase tracking-widest font-display mb-2">Five functional domains</p>
          <h2 className="text-2xl md:text-3xl font-bold text-[#F5F5F5]" style={{ fontFamily: 'Syne, system-ui, sans-serif' }}>The Five Orbits</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ORBITS.map((orbit) => (
            <div key={orbit.name} className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-5 transition-all duration-200 hover:border-[#2E2E2E]" style={{ borderLeft: `3px solid ${orbit.color}` }}>
              <div className="text-sm font-bold mb-2" style={{ color: orbit.color, fontFamily: 'Syne, system-ui, sans-serif' }}>Orbit {orbit.name}</div>
              <p className="text-[#888888] text-sm leading-relaxed" style={{ fontFamily: 'DM Sans, system-ui, sans-serif' }}>{orbit.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-[#1E1E1E] py-20">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="mb-10">
            <p className="text-xs text-[#888888] uppercase tracking-widest font-display mb-2">Eight tiers of mastery</p>
            <h2 className="text-2xl md:text-3xl font-bold text-[#F5F5F5]" style={{ fontFamily: 'Syne, system-ui, sans-serif' }}>The Progression System</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {LEVELS.map((level, idx) => (
              <div key={level.code} className="rounded-xl border border-[#1E1E1E] bg-[#111111] p-3 text-center transition-all duration-200 hover:border-[#2E2E2E]">
                <div className="text-lg font-bold mb-1" style={{ fontFamily: 'Syne, system-ui, sans-serif', color: idx === 7 ? '#1D9E75' : idx >= 5 ? '#BA7517' : '#F5F5F5' }}>{level.code}</div>
                <div className="text-[10px] text-[#888888]" style={{ fontFamily: 'DM Sans, system-ui, sans-serif' }}>{level.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[#1E1E1E] bg-[#111111] py-20">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="mb-10">
            <p className="text-xs text-[#888888] uppercase tracking-widest font-display mb-2">Merit-based advancement</p>
            <h2 className="text-2xl md:text-3xl font-bold text-[#F5F5F5]" style={{ fontFamily: 'Syne, system-ui, sans-serif' }}>How Contribution Score Works</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Quality', pct: '40%', desc: 'Mean quality score across all peer reviews received.', icon: Star, color: '#1D9E75' },
              { label: 'Collaboration', pct: '30%', desc: 'Mean collaboration score from your reviewers.', icon: Users, color: '#378ADD' },
              { label: 'Consistency', pct: '20%', desc: 'Tasks submitted on time vs total assigned.', icon: Zap, color: '#BA7517' },
              { label: 'Completion', pct: '10%', desc: 'Tasks fully completed vs total assigned.', icon: TrendingUp, color: '#888780' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-5">
                <div className="flex items-center justify-between mb-3">
                  <item.icon size={16} style={{ color: item.color }} />
                  <span className="text-xl font-bold" style={{ color: item.color, fontFamily: 'Syne, system-ui, sans-serif' }}>{item.pct}</span>
                </div>
                <div className="text-sm font-semibold text-[#F5F5F5] mb-1" style={{ fontFamily: 'Syne, system-ui, sans-serif' }}>{item.label}</div>
                <p className="text-xs text-[#888888] leading-relaxed" style={{ fontFamily: 'DM Sans, system-ui, sans-serif' }}>{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-4 flex items-center gap-3">
            <Code2 size={14} className="text-[#888888] flex-shrink-0" />
            <code className="text-xs text-[#888888]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>score = (quality × 0.4) + (collaboration × 0.3) + (consistency × 0.2) + (completion × 0.1)</code>
            <span className="ml-auto text-xs text-[#888888] flex-shrink-0">Threshold: 7.5</span>
          </div>
        </div>
      </section>

      <section className="border-t border-[#1E1E1E] py-20">
        <div className="max-w-2xl mx-auto px-4 md:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#2E2E2E] bg-[#1A1A1A] text-xs text-[#888888] mb-6" style={{ fontFamily: 'DM Sans, system-ui, sans-serif' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#BA7517]" />Invite-only membership
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#F5F5F5] mb-4" style={{ fontFamily: 'Syne, system-ui, sans-serif' }}>Ready to evolve?</h2>
          <p className="text-[#888888] mb-8 leading-relaxed" style={{ fontFamily: 'DM Sans, system-ui, sans-serif' }}>Orbit Network is currently invite-only. If you have been accepted, sign in to access your orbit.</p>
          <Link href="/login" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm text-white transition-all duration-200" style={{ background: 'linear-gradient(135deg, #0F6E56 0%, #1D9E75 100%)', fontFamily: 'DM Sans, system-ui, sans-serif', boxShadow: '0 0 24px rgba(15, 110, 86, 0.25)' }}>
            Sign in to Orbit Network <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#1E1E1E] py-8">
        <div className="max-w-6xl mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Hexagon size={13} className="text-[#1D9E75]" />
            <span className="text-xs text-[#888888]" style={{ fontFamily: 'DM Sans, system-ui, sans-serif' }}>Orbit Network by Sybella Systems Ltd · Kigali, Rwanda</span>
          </div>
          <span className="text-xs text-[#444444]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>v1.0.0 · Phase 1</span>
        </div>
      </footer>
    </div>
  );
}
