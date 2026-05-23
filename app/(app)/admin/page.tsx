'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase, ORBIT_COLORS, type Member, type Agreement } from '@/lib/supabase';
import { Users, CheckSquare, TrendingUp, Clock, Activity } from 'lucide-react';

const NEXT_STAGE: Record<string, string | null> = {
  IDENTITY: 'TRAINING',
  TRAINING: 'ORIENTATION',
  ORIENTATION: 'AGREEMENT',
  AGREEMENT: 'APPROVAL',
  APPROVAL: 'COMPLETE',
  COMPLETE: null,
};

export default function AdminPage() {
  const { member } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ totalMembers: 0, activeTasks: 0, pendingPromotions: 0, completedTasks: 0, orbitBreakdown: [] as { orbit: string; count: number }[] });
  const [members, setMembers] = useState<Member[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [documentCount, setDocumentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // HR Console state
  const [activeHrTab, setActiveHrTab] = useState<'recruitment' | 'onboarding' | 'agreements' | 'workforce'>('recruitment');
  const [hrToast, setHrToast] = useState<string | null>(null);
  const [newAgreement, setNewAgreement] = useState({ title: '', type: '', orbit: '' as string | null, required_level: 0, content: '' });

  useEffect(() => {
    if (!hrToast) return;
    const t = window.setTimeout(() => setHrToast(null), 2500);
    return () => window.clearTimeout(t);
  }, [hrToast]);

  useEffect(() => {
    if (!member) return;
    async function load() {
      const [membersCount, tasksActive, promoPending, tasksCompleted, orbitData, membersData, agreementsData, documentsCount] = await Promise.all([
        supabase.from('members').select('*', { count: 'exact', head: true }),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).in('status', ['PENDING', 'IN_REVIEW']),
        supabase.from('promotions').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'COMPLETE'),
        supabase.from('members').select('orbit'),
        supabase.from('members').select('*').order('created_at', { ascending: false }),
        supabase.from('agreements').select('*').order('created_at', { ascending: false }),
        supabase.from('documents').select('*', { count: 'exact', head: true }),
      ]);

      const orbitMap: Record<string, number> = {};
      (orbitData.data ?? []).forEach((m) => {
        orbitMap[m.orbit] = (orbitMap[m.orbit] ?? 0) + 1;
      });

      setStats({
        totalMembers: membersCount.count ?? 0,
        activeTasks: tasksActive.count ?? 0,
        pendingPromotions: promoPending.count ?? 0,
        completedTasks: tasksCompleted.count ?? 0,
        orbitBreakdown: Object.entries(orbitMap).map(([orbit, count]) => ({ orbit, count })),
      });
      setMembers(membersData.data ?? []);
      setAgreements(agreementsData.data ?? []);
      setDocumentCount(documentsCount.count ?? 0);
      setLoading(false);
    }
    load();
  }, [member]);

  const candidateMembers = useMemo(() => members.filter((m) => m.role === 'MEMBER'), [members]);

  async function refreshData() {
    if (!member) return;
    setLoading(true);
    const [membersData, agreementsData, documentsCount] = await Promise.all([
      supabase.from('members').select('*').order('created_at', { ascending: false }),
      supabase.from('agreements').select('*').order('created_at', { ascending: false }),
      supabase.from('documents').select('*', { count: 'exact', head: true }),
    ]);
    setMembers(membersData.data ?? []);
    setAgreements(agreementsData.data ?? []);
    setDocumentCount(documentsCount.count ?? 0);
    setLoading(false);
  }

  async function handleUpdateStage(candidate: Member) {
    const nextStage = NEXT_STAGE[candidate.onboarding_stage];
    if (!nextStage) return;
    const { error } = await supabase.from('members').update({ onboarding_stage: nextStage, onboarding_complete: nextStage === 'COMPLETE' }).eq('id', candidate.id);
    if (error) return setHrToast(error.message);
    setHrToast(`Moved ${candidate.name} to ${nextStage}`);
    refreshData();
  }

  async function handleMarkComplete(candidate: Member) {
    const { error } = await supabase.from('members').update({ onboarding_stage: 'COMPLETE', onboarding_complete: true }).eq('id', candidate.id);
    if (error) return setHrToast(error.message);
    setHrToast(`Marked ${candidate.name} complete`);
    refreshData();
  }

  async function handleCreateAgreement() {
    if (!newAgreement.title.trim() || !newAgreement.type.trim() || !newAgreement.content.trim()) {
      return setHrToast('Please fill title, type, and content.');
    }
    const { error } = await supabase.from('agreements').insert([{ ...newAgreement, created_by: member!.id }]);
    if (error) return setHrToast(error.message);
    setNewAgreement({ title: '', type: '', orbit: null, required_level: 0, content: '' });
    setHrToast('Agreement created.');
    refreshData();
  }

  if (!member) return null;
  if (!['NETWORK_COUNCIL', 'ARCHITECTURE_BOARD'].includes(member.role)) { router.push('/dashboard'); return null; }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#F5F5F5] mb-1" style={{ fontFamily: 'Syne, system-ui, sans-serif' }}>Admin Overview</h1>
        <p className="text-sm text-[#888888]">Cogniforge workforce health at a glance.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Total Members', value: stats.totalMembers, icon: Users, color: '#1D9E75' },
          { label: 'Active Tasks', value: stats.activeTasks, icon: Clock, color: '#378ADD' },
          { label: 'Pending Promotions', value: stats.pendingPromotions, icon: TrendingUp, color: '#BA7517' },
          { label: 'Completed Tasks', value: stats.completedTasks, icon: CheckSquare, color: '#888780' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-5">
            <div className="flex items-center justify-between mb-3">
              <stat.icon size={16} style={{ color: stat.color }} />
              {stat.label === 'Pending Promotions' && stats.pendingPromotions > 0 && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: '#BA751730', color: '#BA7517' }}>Action</span>
              )}
            </div>
            <div className="text-3xl font-bold mb-1" style={{ fontFamily: 'Syne, system-ui, sans-serif', color: stat.color }}>{loading ? '—' : stat.value}</div>
            <div className="text-xs text-[#888888]">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity size={13} className="text-[#888888]" />
            <span className="text-xs font-display uppercase tracking-wide text-[#888888]">Members by Orbit</span>
          </div>
          {loading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-8 bg-[#2E2E2E] rounded animate-pulse" />)}</div>
          ) : stats.orbitBreakdown.length === 0 ? (
            <p className="text-xs text-[#444444]">No members yet.</p>
          ) : (
            <div className="space-y-3">{stats.orbitBreakdown.map(({ orbit, count }) => {
              const color = ORBIT_COLORS[orbit as keyof typeof ORBIT_COLORS] ?? '#888888';
              const pct = stats.totalMembers > 0 ? (count / stats.totalMembers) * 100 : 0;
              return (
                <div key={orbit}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium" style={{ color }}>{orbit}</span>
                    <span className="text-xs font-mono text-[#888888]">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#2E2E2E] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}</div>
          )}
        </div>

        <div className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-5">
          <span className="text-xs font-display uppercase tracking-wide text-[#888888] mb-4 block">Quick Actions</span>
          <div className="space-y-2">
            {[
              { label: 'Review Promotion Requests', href: '/admin/promotions', count: stats.pendingPromotions, color: '#BA7517' },
              { label: 'Manage All Members', href: '/admin/members', count: stats.totalMembers, color: '#378ADD' },
            ].map((action) => (
              <button
                key={action.href}
                onClick={() => router.push(action.href)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-[#2E2E2E] hover:border-[#3E3E3E] bg-[#222222] hover:bg-[#272727] transition-all duration-150"
              >
                <span className="text-sm text-[#F5F5F5]">{action.label}</span>
                {action.count > 0 && (
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded" style={{ background: `${action.color}20`, color: action.color }}>{action.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* HR Console */}
      <div className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-sm font-display uppercase tracking-wide text-[#888888] mb-1">Council HR Console</h2>
            <p className="text-xs text-[#444444]">Recruitment → Onboarding → Agreements → Workforce management</p>
          </div>
          {hrToast && (
            <div className="text-xs text-[#1D9E75] bg-[#0F6E5620] border border-[#0F6E5640] px-3 py-2 rounded-lg">{hrToast}</div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { key: 'recruitment', label: 'Recruitment' },
            { key: 'onboarding', label: 'Onboarding' },
            { key: 'agreements', label: 'Agreements' },
            { key: 'workforce', label: 'Workforce' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveHrTab(t.key as any)}
              className="px-3.5 py-2 rounded-lg text-sm transition-all duration-150"
              style={{
                background: activeHrTab === t.key ? '#0F6E5620' : '#222222',
                border: activeHrTab === t.key ? '1px solid #0F6E5640' : '1px solid #2E2E2E',
                color: activeHrTab === t.key ? '#1D9E75' : '#888888',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeHrTab === 'recruitment' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              {['IDENTITY', 'TRAINING', 'ORIENTATION', 'AGREEMENT', 'APPROVAL', 'COMPLETE'].map((stage) => {
                const count = members.filter((m) => m.onboarding_stage === stage).length;
                return (
                  <div key={stage} className="rounded-xl border border-[#2E2E2E] bg-[#111111] p-4">
                    <div className="text-xs text-[#888888] uppercase tracking-wide mb-2">{stage}</div>
                    <div className="text-3xl font-bold text-[#F5F5F5]">{count}</div>
                    <div className="text-xs text-[#666] mt-2">{count === 0 ? 'No members' : `${count} candidate${count === 1 ? '' : 's'}`}</div>
                  </div>
                );
              })}
            </div>
            <div className="space-y-3">
              {candidateMembers.slice(0, 8).map((candidate) => {
                const nextStage = NEXT_STAGE[candidate.onboarding_stage];
                return (
                  <div key={candidate.id} className="rounded-xl border border-[#2E2E2E] bg-[#111111] p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-[#F5F5F5]">{candidate.name}</div>
                      <div className="text-xs text-[#888888]">{candidate.email}</div>
                      <div className="text-xs text-[#888888]">Orbit: {candidate.orbit} · Level {candidate.level}</div>
                    </div>
                    <div className="text-xs text-[#888888]">Stage: <span className="text-[#F5F5F5]">{candidate.onboarding_stage}</span></div>
                    <div className="flex flex-wrap gap-2 items-center">
                      {candidate.onboarding_complete ? (
                        <span className="text-xs text-[#1D9E75] bg-[#1D9E7520] px-3 py-2 rounded-lg">Onboarding complete</span>
                      ) : (
                        <button
                          className="px-3 py-2 rounded-lg text-xs font-medium text-white"
                          style={{ background: '#0F6E56' }}
                          onClick={() => handleUpdateStage(candidate)}
                        >
                          {nextStage ? `Advance to ${nextStage}` : 'No action'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeHrTab === 'onboarding' && (
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium text-[#F5F5F5]">Onboarding Tasks</div>
              <div className="text-xs text-[#888888]">Promote candidate completion, review onboarding, and capture approvals.</div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {candidateMembers.slice(0, 6).map((candidate) => (
                <div key={candidate.id} className="rounded-xl border border-[#2E2E2E] bg-[#111111] p-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                  <div>
                    <div className="text-sm text-[#F5F5F5]">{candidate.name}</div>
                    <div className="text-xs text-[#888888]">{candidate.email}</div>
                  </div>
                  <div className="text-xs text-[#888888]">{candidate.onboarding_stage}</div>
                  <div className="text-xs text-[#888888]">Complete: {candidate.onboarding_complete ? 'Yes' : 'No'}</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="px-3 py-2 rounded-lg text-xs font-medium text-white"
                      style={{ background: '#0F6E56' }}
                      onClick={() => handleUpdateStage(candidate)}
                    >
                      Next stage
                    </button>
                    {!candidate.onboarding_complete && (
                      <button
                        className="px-3 py-2 rounded-lg text-xs font-medium text-white"
                        style={{ background: '#378ADD' }}
                        onClick={() => handleMarkComplete(candidate)}
                      >
                        Mark complete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeHrTab === 'agreements' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-1 rounded-xl border border-[#2E2E2E] bg-[#111111] p-4">
              <div className="text-sm font-medium text-[#F5F5F5] mb-3">Create new agreement</div>
              <input value={newAgreement.title} onChange={(e) => setNewAgreement((prev) => ({ ...prev, title: e.target.value }))} placeholder="Title" className="w-full mb-3 px-3 py-2 rounded-lg bg-[#1A1A1A] border border-[#2E2E2E] text-sm text-[#F5F5F5]" />
              <input value={newAgreement.type} onChange={(e) => setNewAgreement((prev) => ({ ...prev, type: e.target.value }))} placeholder="Type" className="w-full mb-3 px-3 py-2 rounded-lg bg-[#1A1A1A] border border-[#2E2E2E] text-sm text-[#F5F5F5]" />
              <select value={newAgreement.orbit || ''} onChange={(e) => setNewAgreement((prev) => ({ ...prev, orbit: e.target.value || null }))} className="w-full mb-3 px-3 py-2 rounded-lg bg-[#1A1A1A] border border-[#2E2E2E] text-sm text-[#F5F5F5]">
                <option value="">Global</option>
                {Object.keys(ORBIT_COLORS).map((orbit) => (<option key={orbit} value={orbit}>{orbit}</option>))}
              </select>
              <input type="number" value={newAgreement.required_level} onChange={(e) => setNewAgreement((prev) => ({ ...prev, required_level: Number(e.target.value) }))} min={0} max={7} placeholder="Required level" className="w-full mb-3 px-3 py-2 rounded-lg bg-[#1A1A1A] border border-[#2E2E2E] text-sm text-[#F5F5F5]" />
              <textarea value={newAgreement.content} onChange={(e) => setNewAgreement((prev) => ({ ...prev, content: e.target.value }))} rows={5} placeholder="Agreement content" className="w-full mb-3 px-3 py-2 rounded-lg bg-[#1A1A1A] border border-[#2E2E2E] text-sm text-[#F5F5F5]" />
              <button className="w-full px-3 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: '#0F6E56' }} onClick={handleCreateAgreement}>Create agreement</button>
            </div>
            <div className="xl:col-span-2 rounded-xl border border-[#2E2E2E] bg-[#111111] p-4 space-y-3">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <div className="text-sm font-medium text-[#F5F5F5]">Agreement library</div>
                  <div className="text-xs text-[#888888]">All agreement templates available to members.</div>
                </div>
                <span className="text-xs text-[#666]">{agreements.length} total</span>
              </div>
              {agreements.length === 0 ? (
                <div className="text-xs text-[#444444]">No agreements defined yet.</div>
              ) : (
                <div className="space-y-3">
                  {agreements.map((agreement) => (
                    <div key={agreement.id} className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-[#F5F5F5]">{agreement.title}</div>
                          <div className="text-xs text-[#888888]">{agreement.type} · Level {agreement.required_level} · {agreement.orbit ?? 'Global'}</div>
                        </div>
                        <span className="text-xs font-mono text-[#888888]">v{agreement.version}</span>
                      </div>
                      <p className="mt-3 text-xs text-[#888888] line-clamp-3">{agreement.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeHrTab === 'workforce' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-[#2E2E2E] bg-[#111111] p-4">
              <div className="text-xs text-[#888888] uppercase tracking-wide mb-2">Active Members</div>
              <div className="text-3xl font-bold text-[#F5F5F5]">{stats.totalMembers}</div>
              <div className="text-xs text-[#666] mt-2">All authenticated members in the system.</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { title: 'Assign roles', desc: 'Council assigns leadership' },
                { title: 'Track tasks', desc: 'Tasks tied to workforce' },
                { title: 'Unlock promotions', desc: 'Threshold + readiness checks' },
              ].map((c) => (
                <div key={c.title} className="rounded-xl border border-[#2E2E2E] bg-[#111111] p-4">
                  <div className="text-xs font-medium text-[#F5F5F5] mb-1">{c.title}</div>
                  <div className="text-xs text-[#888888]">{c.desc}</div>
                  <button
                    className="mt-3 w-full px-3 py-2 rounded-lg text-xs font-medium"
                    style={{ background: '#0F6E5620', color: '#1D9E75', border: '1px solid #0F6E5640' }}
                    onClick={() => setHrToast(`${c.title} queued (placeholder)`)}
                  >
                    Configure
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
