'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase, ORBIT_COLORS } from '@/lib/supabase';
import { Users, CheckSquare, TrendingUp, Clock, Activity } from 'lucide-react';

export default function AdminPage() {
  const { member } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ totalMembers: 0, activeTasks: 0, pendingPromotions: 0, completedTasks: 0, orbitBreakdown: [] as { orbit: string; count: number }[] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!member) return;
    async function load() {
      const [{ count: memberCount }, { count: activeCount }, { count: promoCount }, { count: completedCount }, { data: orbitData }] = await Promise.all([
        supabase.from('members').select('*', { count: 'exact', head: true }),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).in('status', ['PENDING', 'IN_REVIEW']),
        supabase.from('promotions').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'COMPLETE'),
        supabase.from('members').select('orbit'),
      ]);
      const orbitMap: Record<string, number> = {};
      (orbitData ?? []).forEach((m) => { orbitMap[m.orbit] = (orbitMap[m.orbit] ?? 0) + 1; });
      setStats({ totalMembers: memberCount ?? 0, activeTasks: activeCount ?? 0, pendingPromotions: promoCount ?? 0, completedTasks: completedCount ?? 0, orbitBreakdown: Object.entries(orbitMap).map(([orbit, count]) => ({ orbit, count })) });
      setLoading(false);
    }
    load();
  }, [member, router]);

  if (!member) return null;
  if (!['NETWORK_COUNCIL', 'ARCHITECTURE_BOARD'].includes(member.role)) { router.push('/dashboard'); return null; }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8"><h1 className="text-2xl font-bold text-[#F5F5F5] mb-1" style={{ fontFamily: 'Syne, system-ui, sans-serif' }}>Admin Overview</h1><p className="text-sm text-[#888888]">Orbit Network health at a glance.</p></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Total Members', value: stats.totalMembers, icon: Users, color: '#1D9E75' },
          { label: 'Active Tasks', value: stats.activeTasks, icon: Clock, color: '#378ADD' },
          { label: 'Pending Promotions', value: stats.pendingPromotions, icon: TrendingUp, color: '#BA7517' },
          { label: 'Completed Tasks', value: stats.completedTasks, icon: CheckSquare, color: '#888780' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-5">
            <div className="flex items-center justify-between mb-3"><stat.icon size={16} style={{ color: stat.color }} />{stat.label === 'Pending Promotions' && stats.pendingPromotions > 0 && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: '#BA751730', color: '#BA7517' }}>Action</span>}</div>
            <div className="text-3xl font-bold mb-1" style={{ fontFamily: 'Syne, system-ui, sans-serif', color: stat.color }}>{loading ? '—' : stat.value}</div>
            <div className="text-xs text-[#888888]">{stat.label}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-5">
          <div className="flex items-center gap-2 mb-4"><Activity size={13} className="text-[#888888]" /><span className="text-xs font-display uppercase tracking-wide text-[#888888]">Members by Orbit</span></div>
          {loading ? <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-8 bg-[#2E2E2E] rounded animate-pulse" />)}</div>
          : stats.orbitBreakdown.length === 0 ? <p className="text-xs text-[#444444]">No members yet.</p>
          : <div className="space-y-3">{stats.orbitBreakdown.map(({ orbit, count }) => {
            const color = ORBIT_COLORS[orbit as keyof typeof ORBIT_COLORS] ?? '#888888';
            const pct = stats.totalMembers > 0 ? (count / stats.totalMembers) * 100 : 0;
            return (<div key={orbit}><div className="flex items-center justify-between mb-1"><span className="text-xs font-medium" style={{ color }}>{orbit}</span><span className="text-xs font-mono text-[#888888]">{count}</span></div><div className="h-1.5 rounded-full bg-[#2E2E2E] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} /></div></div>);
          })}</div>}
        </div>
        <div className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-5">
          <span className="text-xs font-display uppercase tracking-wide text-[#888888] mb-4 block">Quick Actions</span>
          <div className="space-y-2">
            {[
              { label: 'Review Promotion Requests', href: '/admin/promotions', count: stats.pendingPromotions, color: '#BA7517' },
              { label: 'Manage All Members', href: '/admin/members', count: stats.totalMembers, color: '#378ADD' },
            ].map((action) => (
              <button key={action.href} onClick={() => router.push(action.href)} className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-[#2E2E2E] hover:border-[#3E3E3E] bg-[#222222] hover:bg-[#272727] transition-all duration-150">
                <span className="text-sm text-[#F5F5F5]">{action.label}</span>
                {action.count > 0 && <span className="text-xs font-mono font-bold px-2 py-0.5 rounded" style={{ background: `${action.color}20`, color: action.color }}>{action.count}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
