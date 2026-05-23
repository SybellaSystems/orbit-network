'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase, ORBIT_LABELS, LEVEL_ROLES, ORBIT_COLORS, PROMOTION_THRESHOLD, MIN_TASKS_FOR_PROMOTION } from '@/lib/supabase';
import type { Task, Promotion } from '@/lib/supabase';
import { LevelBadge } from '@/components/orbit/LevelBadge';
import { OrbitTag } from '@/components/orbit/OrbitTag';
import { ContributionMeter } from '@/components/orbit/ContributionMeter';
import { TaskCard } from '@/components/orbit/TaskCard';
import { TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';

export default function DashboardPage() {
  const { member } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recentPromotion, setRecentPromotion] = useState<Promotion | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [inReviewCount, setInReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!member) return;
    async function load() {
      const [{ data: taskData }, { data: promoData }, { count: completedCount }, { count: pendingCnt }, { count: inReviewCnt }] = await Promise.all([
        supabase.from('tasks').select('*').eq('assignee_id', member!.id).order('created_at', { ascending: false }).limit(6),
        supabase.from('promotions').select('*').eq('member_id', member!.id).order('requested_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('assignee_id', member!.id).eq('status', 'COMPLETE'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('assignee_id', member!.id).eq('status', 'PENDING'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('assignee_id', member!.id).eq('status', 'IN_REVIEW'),
      ]);
      setTasks(taskData ?? []);
      setRecentPromotion(promoData);
      setCompletedCount(completedCount ?? 0);
      setPendingCount(pendingCnt ?? 0);
      setInReviewCount(inReviewCnt ?? 0);
      setLoading(false);
    }
    load();
  }, [member]);

  if (!member) return null;

  const orbitColor = ORBIT_COLORS[member.orbit];
  const eligible = member.contribution_score >= PROMOTION_THRESHOLD && completedCount >= MIN_TASKS_FOR_PROMOTION;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#F5F5F5] mb-1" style={{ fontFamily: 'Syne, system-ui, sans-serif' }}>{member.name}</h1>
            <div className="flex items-center gap-2 flex-wrap"><OrbitTag orbit={member.orbit} /><span className="text-[#888888] text-sm">· {LEVEL_ROLES[member.level]}</span></div>
          </div>
          <LevelBadge level={member.level} orbit={member.orbit} size="lg" showRole={false} />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Level', value: `L${member.level}`, sublabel: LEVEL_ROLES[member.level], color: orbitColor },
          { label: 'Completed Tasks', value: completedCount.toString(), sublabel: 'all time', color: '#1D9E75' },
          { label: 'In Review', value: inReviewCount.toString(), sublabel: 'pending review', color: '#378ADD' },
          { label: 'Pending', value: pendingCount.toString(), sublabel: 'to do', color: '#888780' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-4">
            <div className="text-xs text-[#888888] mb-2 font-display uppercase tracking-wide">{stat.label}</div>
            <div className="text-2xl font-bold mb-0.5" style={{ fontFamily: 'Syne, system-ui, sans-serif', color: stat.color }}>{stat.value}</div>
            <div className="text-xs text-[#888888]">{stat.sublabel}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-[#F5F5F5]" style={{ fontFamily: 'Syne, system-ui, sans-serif' }}>Recent Tasks</h2>
              <button onClick={() => router.push('/tasks')} className="text-xs text-[#888888] hover:text-[#F5F5F5]">View all</button>
            </div>
            {loading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-4 animate-pulse"><div className="h-4 bg-[#2E2E2E] rounded w-3/4 mb-2" /><div className="h-3 bg-[#2E2E2E] rounded w-1/2" /></div>)}</div>
            ) : tasks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#2E2E2E] p-8 text-center">
                <CheckCircle size={24} className="text-[#2E2E2E] mx-auto mb-3" />
                <p className="text-sm text-[#888888] mb-3">No tasks assigned yet.</p>
                <p className="text-xs text-[#444444]">Tasks will appear here once your Orbit Lead assigns work.</p>
              </div>
            ) : (
              <div className="space-y-3">{tasks.map((task) => <TaskCard key={task.id} task={task} onClick={() => router.push(`/tasks/${task.id}`)} />)}</div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-5"><ContributionMeter score={member.contribution_score} /></div>

          <div className="rounded-xl border p-5" style={{ borderColor: eligible ? '#1D9E75' + '40' : '#2E2E2E', background: eligible ? 'rgba(29, 158, 117, 0.05)' : '#1A1A1A' }}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} style={{ color: eligible ? '#1D9E75' : '#888888' }} />
              <span className="text-xs font-display uppercase tracking-wide" style={{ color: eligible ? '#1D9E75' : '#888888' }}>Promotion Status</span>
            </div>
            {recentPromotion?.status === 'PENDING' ? (
              <div><div className="text-sm font-medium text-[#BA7517] mb-1">Under Review</div><p className="text-xs text-[#888888]">Your L{recentPromotion.from_level} → L{recentPromotion.to_level} request is being reviewed.</p></div>
            ) : recentPromotion?.status === 'APPROVED' ? (
              <div><div className="text-sm font-medium text-[#1D9E75] mb-1">Promotion Approved</div><p className="text-xs text-[#888888]">Congratulations on reaching L{recentPromotion.to_level}.</p></div>
            ) : eligible ? (
              <div>
                <div className="text-sm font-medium text-[#1D9E75] mb-2">Eligible for L{member.level + 1}</div>
                <p className="text-xs text-[#888888] mb-3">Score {member.contribution_score.toFixed(1)} ≥ 7.5 and {completedCount} tasks completed.</p>
                <button onClick={() => router.push('/profile')} className="w-full py-2 rounded-lg text-xs font-medium text-white" style={{ background: 'linear-gradient(135deg, #0F6E56 0%, #1D9E75 100%)' }}>Request Promotion</button>
              </div>
            ) : (
              <div>
                <div className="text-sm font-medium text-[#888888] mb-1">Not yet eligible</div>
                <div className="space-y-1.5 text-xs text-[#888888]">
                  <div className="flex items-center gap-1.5">{member.contribution_score >= PROMOTION_THRESHOLD ? <CheckCircle size={11} className="text-[#1D9E75]" /> : <AlertCircle size={11} />}Score ≥ 7.5 ({member.contribution_score.toFixed(1)})</div>
                  <div className="flex items-center gap-1.5">{completedCount >= MIN_TASKS_FOR_PROMOTION ? <CheckCircle size={11} className="text-[#1D9E75]" /> : <AlertCircle size={11} />}{MIN_TASKS_FOR_PROMOTION} completed tasks ({completedCount})</div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-5">
            <div className="text-xs text-[#888888] font-display uppercase tracking-wide mb-3">Your Orbit</div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: orbitColor }} />
              <span className="font-display font-semibold text-[#F5F5F5] text-sm">{ORBIT_LABELS[member.orbit]}</span>
            </div>
            {member.skills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">{member.skills.slice(0, 6).map((skill) => <span key={skill} className="px-2 py-0.5 rounded text-[11px] text-[#888888] border border-[#2E2E2E]">{skill}</span>)}</div>
            ) : <p className="text-xs text-[#444444]">No skills listed yet. Update your profile.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
