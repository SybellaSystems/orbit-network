'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase, ORBIT_LABELS, LEVEL_ROLES, ORBIT_COLORS, PROMOTION_THRESHOLD, MIN_TASKS_FOR_PROMOTION } from '@/lib/supabase';
import type { Promotion } from '@/lib/supabase';
import { LevelBadge } from '@/components/orbit/LevelBadge';
import { OrbitTag } from '@/components/orbit/OrbitTag';
import { ContributionMeter } from '@/components/orbit/ContributionMeter';
import { ScoreCard } from '@/components/orbit/ScoreCard';
import { MemberAvatar } from '@/components/orbit/MemberAvatar';
import { Plus, X, TrendingUp, AlertCircle } from 'lucide-react';

interface ScoreBreakdown { quality: number; collaboration: number; consistency: number; completion: number; }

export default function ProfilePage() {
  const { member, refresh } = useAuth();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [scores, setScores] = useState<ScoreBreakdown | null>(null);
  const [newSkill, setNewSkill] = useState('');
  const [saving, setSaving] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!member) return;
    async function load() {
      const [{ data: promoData }, { count }, { data: scoreData }] = await Promise.all([
        supabase.from('promotions').select('*').eq('member_id', member!.id).order('requested_at', { ascending: false }),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('assignee_id', member!.id).eq('status', 'COMPLETE'),
        supabase.rpc('get_member_score_breakdown', { target_member_id: member!.id }),
      ]);
      setPromotions(promoData ?? []);
      setCompletedCount(count ?? 0);
      if (scoreData && scoreData.length > 0) {
        const s = scoreData[0];
        setScores({ quality: s.quality, collaboration: s.collaboration, consistency: s.consistency, completion: s.completion });
      }
    }
    load();
  }, [member]);

  async function addSkill() {
    if (!newSkill.trim() || !member) return;
    const updated = [...(member.skills ?? []), newSkill.trim()];
    setSaving(true);
    const { error: err } = await supabase.from('members').update({ skills: updated }).eq('id', member.id);
    if (!err) { await refresh(); setNewSkill(''); }
    else setError(err.message);
    setSaving(false);
  }

  async function removeSkill(skill: string) {
    if (!member) return;
    const updated = member.skills.filter((s) => s !== skill);
    const { error: err } = await supabase.from('members').update({ skills: updated }).eq('id', member.id);
    if (!err) await refresh();
    else setError(err.message);
  }

  async function requestPromotion() {
    if (!member) return;
    setRequesting(true); setError(''); setSuccess('');
    const eligible = member.contribution_score >= PROMOTION_THRESHOLD && completedCount >= MIN_TASKS_FOR_PROMOTION;
    if (!eligible) { setError('Requirements not met. Score ≥ 7.5 and 5 completed tasks required.'); setRequesting(false); return; }
    if (promotions.find((p) => p.status === 'PENDING')) { setError('A promotion request is already under review.'); setRequesting(false); return; }
    const { error: err } = await supabase.from('promotions').insert({ member_id: member.id, from_level: member.level, to_level: member.level + 1, scorecard: { contribution_score: member.contribution_score, completed_tasks: completedCount, requested_at: new Date().toISOString() } });
    if (err) setError(err.message);
    else {
      setSuccess('Promotion request submitted. The Network Council will review your scorecard.');
      const { data } = await supabase.from('promotions').select('*').eq('member_id', member.id).order('requested_at', { ascending: false });
      setPromotions(data ?? []);
    }
    setRequesting(false);
  }

  if (!member) return null;
  const eligible = member.contribution_score >= PROMOTION_THRESHOLD && completedCount >= MIN_TASKS_FOR_PROMOTION;
  const sb = scores ?? { quality: member.contribution_score, collaboration: member.contribution_score, consistency: member.contribution_score * 0.8, completion: member.contribution_score * 0.9 };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-[#F5F5F5] mb-6" style={{ fontFamily: 'Syne, system-ui, sans-serif' }}>Profile</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-6">
            <div className="flex items-center gap-4 mb-5">
              <MemberAvatar member={member} size="xl" />
              <div>
                <h2 className="text-xl font-bold text-[#F5F5F5]" style={{ fontFamily: 'Syne, system-ui, sans-serif' }}>{member.name}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap"><OrbitTag orbit={member.orbit} /><span className="text-sm text-[#888888]">{LEVEL_ROLES[member.level]}</span></div>
              </div>
              <div className="ml-auto"><LevelBadge level={member.level} orbit={member.orbit} size="lg" showRole={false} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#2E2E2E]">
              <div><div className="text-xs text-[#888888] mb-1">Email</div><div className="text-sm text-[#F5F5F5] font-mono">{member.email}</div></div>
              <div><div className="text-xs text-[#888888] mb-1">Joined</div><div className="text-sm text-[#F5F5F5]">{new Date(member.joined_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div></div>
              <div><div className="text-xs text-[#888888] mb-1">Orbit</div><div className="text-sm text-[#F5F5F5]">{ORBIT_LABELS[member.orbit]}</div></div>
              <div><div className="text-xs text-[#888888] mb-1">Tasks Completed</div><div className="text-sm font-mono font-bold" style={{ color: ORBIT_COLORS[member.orbit] }}>{completedCount}</div></div>
            </div>
          </div>

          <div className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-5">
            <h3 className="text-sm font-semibold text-[#F5F5F5] mb-4" style={{ fontFamily: 'Syne, system-ui, sans-serif' }}>Skills</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {member.skills.length === 0 ? <span className="text-xs text-[#444444]">No skills listed yet.</span> : member.skills.map((skill) => (
                <span key={skill} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border border-[#2E2E2E] text-[#888888]">
                  {skill}<button onClick={() => removeSkill(skill)} className="text-[#444444] hover:text-red-400"><X size={10} /></button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input type="text" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                placeholder="Add a skill" className="flex-1 px-3 py-2 rounded-lg text-sm outline-none" style={{ background: '#222222', border: '1px solid #2E2E2E', color: '#F5F5F5' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#0F6E56'; }} onBlur={(e) => { e.currentTarget.style.borderColor = '#2E2E2E'; }} />
              <button onClick={addSkill} disabled={!newSkill.trim() || saving} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40" style={{ background: '#0F6E56' }}><Plus size={13} />Add</button>
            </div>
          </div>

          <div className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-5">
            <h3 className="text-sm font-semibold text-[#F5F5F5] mb-4" style={{ fontFamily: 'Syne, system-ui, sans-serif' }}>Level History</h3>
            {promotions.length === 0 ? <p className="text-xs text-[#444444]">No promotion requests yet.</p> : (
              <div className="space-y-2">
                {promotions.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-[#2E2E2E] last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="text-xs font-mono font-bold" style={{ color: p.status === 'APPROVED' ? '#1D9E75' : p.status === 'DEFERRED' ? '#A32D2D' : '#BA7517' }}>L{p.from_level} → L{p.to_level}</div>
                      <div className="text-xs text-[#888888]">{new Date(p.requested_at).toLocaleDateString()}</div>
                    </div>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded" style={{ color: p.status === 'APPROVED' ? '#1D9E75' : p.status === 'DEFERRED' ? '#A32D2D' : '#BA7517', background: p.status === 'APPROVED' ? '#1D9E7520' : p.status === 'DEFERRED' ? '#A32D2D20' : '#BA751720' }}>{p.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <ContributionMeter score={member.contribution_score} className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-5" />
          <ScoreCard quality={sb.quality} collaboration={sb.collaboration} consistency={sb.consistency} completion={sb.completion} />
          {member.level < 7 && (
            <div className="rounded-xl border p-5" style={{ borderColor: eligible ? '#1D9E7540' : '#2E2E2E', background: eligible ? 'rgba(29, 158, 117, 0.05)' : '#1A1A1A' }}>
              <div className="flex items-center gap-2 mb-3"><TrendingUp size={13} style={{ color: eligible ? '#1D9E75' : '#888888' }} /><span className="text-xs font-display uppercase tracking-wide" style={{ color: eligible ? '#1D9E75' : '#888888' }}>L{member.level + 1} Promotion</span></div>
              {success && <div className="mb-3 text-xs text-[#1D9E75] bg-[#1D9E7515] rounded-lg p-3">{success}</div>}
              {error && <div className="mb-3 flex items-start gap-2 text-xs text-red-400 bg-red-950/20 rounded-lg p-3"><AlertCircle size={12} className="flex-shrink-0 mt-0.5" />{error}</div>}
              {promotions.find((p) => p.status === 'PENDING') ? <p className="text-xs text-[#888888]">Request pending Council review.</p> : eligible ? (
                <><p className="text-xs text-[#888888] mb-3">All requirements met.</p>
                <button onClick={requestPromotion} disabled={requesting} className="w-full py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #0F6E56 0%, #1D9E75 100%)' }}>{requesting ? 'Submitting...' : 'Request Promotion'}</button></>
              ) : (
                <div className="space-y-1.5 text-xs text-[#888888]">
                  <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full" style={{ background: member.contribution_score >= PROMOTION_THRESHOLD ? '#1D9E75' : '#888888' }} />Score ≥ 7.5 ({member.contribution_score.toFixed(1)})</div>
                  <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full" style={{ background: completedCount >= MIN_TASKS_FOR_PROMOTION ? '#1D9E75' : '#888888' }} />5 tasks ({completedCount})</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
