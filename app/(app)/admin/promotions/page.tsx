'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase, LEVEL_ROLES, ORBIT_COLORS } from '@/lib/supabase';
import type { Promotion, Member } from '@/lib/supabase';
import { MemberAvatar } from '@/components/orbit/MemberAvatar';
import { OrbitTag } from '@/components/orbit/OrbitTag';
import { ScoreCard } from '@/components/orbit/ScoreCard';
import { TrendingUp, CheckCircle, XCircle, Clock } from 'lucide-react';

type PromotionWithMember = Promotion & { member: Member };

export default function AdminPromotionsPage() {
  const { member } = useAuth();
  const router = useRouter();
  const [promotions, setPromotions] = useState<PromotionWithMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED' | 'DEFERRED' | 'ALL'>('PENDING');

  useEffect(() => {
    if (!member) return;
    load();
  }, [member, filter, router]);

  async function load() {
    let query = supabase.from('promotions').select('*, member:members(*)').order('requested_at', { ascending: false });
    if (filter !== 'ALL') query = query.eq('status', filter);
    const { data } = await query;
    setPromotions((data ?? []) as PromotionWithMember[]); setLoading(false);
  }

  async function decide(promotionId: string, decision: 'APPROVED' | 'DEFERRED', promo: PromotionWithMember) {
    if (!member) return;
    setDeciding(promotionId);
    const { error: promoErr } = await supabase.from('promotions').update({ status: decision, decided_at: new Date().toISOString(), decided_by: member.id, notes: notes[promotionId] ?? null }).eq('id', promotionId);
    if (promoErr) { setDeciding(null); return; }
    if (decision === 'APPROVED') {
      const { error: memberErr } = await supabase.from('members').update({ level: promo.to_level }).eq('id', promo.member_id);
      if (memberErr) { await supabase.from('promotions').update({ status: 'DEFERRED', notes: 'Level update failed — manual correction needed' }).eq('id', promotionId); }
    }
    await load(); setDeciding(null);
  }

  if (!member) return null;
  if (!['NETWORK_COUNCIL', 'ARCHITECTURE_BOARD'].includes(member.role)) { router.push('/dashboard'); return null; }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6"><h1 className="text-2xl font-bold text-[#F5F5F5] mb-1" style={{ fontFamily: 'Syne, system-ui, sans-serif' }}>Promotion Requests</h1><p className="text-sm text-[#888888]">Review and decide on member level promotions.</p></div>
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {['PENDING', 'APPROVED', 'DEFERRED', 'ALL'].map((tab) => (
          <button key={tab} onClick={() => setFilter(tab as typeof filter)} className="px-3.5 py-2 rounded-lg text-sm transition-all duration-150"
            style={{ background: filter === tab ? '#0F6E5620' : '#1A1A1A', border: filter === tab ? '1px solid #0F6E5640' : '1px solid #2E2E2E', color: filter === tab ? '#1D9E75' : '#888888' }}>{tab}</button>
        ))}
      </div>
      {loading ? <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-5 animate-pulse"><div className="h-5 bg-[#2E2E2E] rounded w-1/3 mb-3" /><div className="h-3 bg-[#2E2E2E] rounded w-2/3" /></div>)}</div>
      : promotions.length === 0 ? <div className="rounded-xl border border-dashed border-[#2E2E2E] p-12 text-center"><TrendingUp size={24} className="text-[#2E2E2E] mx-auto mb-3" /><p className="text-sm text-[#888888]">No {filter !== 'ALL' ? filter.toLowerCase() : ''} promotion requests.</p></div>
      : <div className="space-y-4">{promotions.map((promo) => {
        const sc = promo.scorecard as Record<string, number>;
        const score = sc?.contribution_score ?? 0;
        return (
          <div key={promo.id} className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-5" style={{ borderColor: promo.status === 'APPROVED' ? '#1D9E7540' : promo.status === 'DEFERRED' ? '#A32D2D40' : undefined }}>
            <div className="flex items-start gap-4 flex-wrap">
              <MemberAvatar member={promo.member} size="lg" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-2"><span className="font-semibold text-[#F5F5F5]" style={{ fontFamily: 'Syne, system-ui, sans-serif' }}>{promo.member.name}</span><OrbitTag orbit={promo.member.orbit} size="sm" /><span className="text-sm font-mono font-bold" style={{ color: ORBIT_COLORS[promo.member.orbit] }}>L{promo.from_level} → L{promo.to_level}</span></div>
                <div className="flex items-center gap-3 text-xs text-[#888888] flex-wrap">
                  <span>{LEVEL_ROLES[promo.from_level]} → {LEVEL_ROLES[promo.to_level]}</span><span className="text-[#2E2E2E]">·</span><span>Requested {new Date(promo.requested_at).toLocaleDateString()}</span><span className="text-[#2E2E2E]">·</span>
                  <span className="font-mono" style={{ color: score >= 7.5 ? '#1D9E75' : '#BA7517' }}>Score: {score.toFixed(1)}</span><span className="text-[#2E2E2E]">·</span><span>{sc?.completed_tasks ?? 0} tasks</span>
                </div>
                {promo.status === 'PENDING' && (
                  <div className="mt-4 space-y-3">
                    <ScoreCard quality={sc?.quality ?? score} collaboration={sc?.collaboration ?? score} consistency={sc?.consistency ?? score * 0.8} completion={sc?.completion ?? score * 0.9} />
                    <div><label className="block text-xs text-[#888888] mb-1.5 font-display uppercase tracking-wide">Decision Notes</label>
                      <textarea value={notes[promo.id] ?? ''} onChange={(e) => setNotes((n) => ({ ...n, [promo.id]: e.target.value }))} placeholder="Feedback (optional)" rows={2}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none" style={{ background: '#222222', border: '1px solid #2E2E2E', color: '#F5F5F5' }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = '#0F6E56'; }} onBlur={(e) => { e.currentTarget.style.borderColor = '#2E2E2E'; }} /></div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => decide(promo.id, 'APPROVED', promo)} disabled={deciding === promo.id} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #3B6D11 0%, #1D9E75 100%)' }}><CheckCircle size={13} />Approve</button>
                      <button onClick={() => decide(promo.id, 'DEFERRED', promo)} disabled={deciding === promo.id} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm disabled:opacity-50" style={{ background: '#1A1A1A', border: '1px solid #A32D2D50', color: '#A32D2D' }}><XCircle size={13} />Defer</button>
                    </div>
                  </div>
                )}
                {promo.status !== 'PENDING' && (
                  <div className="mt-3 flex items-center gap-2">
                    {promo.status === 'APPROVED' ? <CheckCircle size={13} className="text-[#1D9E75]" /> : <XCircle size={13} className="text-[#A32D2D]" />}
                    <span className="text-sm font-medium" style={{ color: promo.status === 'APPROVED' ? '#1D9E75' : '#A32D2D' }}>{promo.status}</span>
                    {promo.decided_at && <span className="text-xs text-[#888888]">on {new Date(promo.decided_at).toLocaleDateString()}</span>}
                    {promo.notes && <span className="text-xs text-[#888888] ml-2">— {promo.notes}</span>}
                  </div>
                )}
              </div>
              <div className="flex-shrink-0">
                <span className="text-xs font-medium px-2.5 py-1.5 rounded-lg" style={{ color: promo.status === 'APPROVED' ? '#1D9E75' : promo.status === 'DEFERRED' ? '#A32D2D' : '#BA7517', background: promo.status === 'APPROVED' ? '#1D9E7520' : promo.status === 'DEFERRED' ? '#A32D2D20' : '#BA751720' }}>
                  {promo.status === 'PENDING' ? <Clock size={11} className="inline mr-1" /> : null}{promo.status}
                </span>
              </div>
            </div>
          </div>
        );
      })}</div>}
    </div>
  );
}
