'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Task, TaskStatus } from '@/lib/supabase';
import { TaskCard } from '@/components/orbit/TaskCard';
import { CheckSquare } from 'lucide-react';

const STATUS_TABS: { label: string; value: TaskStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' }, { label: 'Pending', value: 'PENDING' },
  { label: 'In Review', value: 'IN_REVIEW' }, { label: 'Complete', value: 'COMPLETE' },
];

export default function TasksPage() {
  const { member } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<TaskStatus | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!member) return;
    async function load() {
      let query = supabase.from('tasks').select('*').eq('assignee_id', member!.id).order('deadline', { ascending: true });
      if (filter !== 'ALL') query = query.eq('status', filter);
      const { data } = await query;
      setTasks(data ?? []);
      setLoading(false);
    }
    load();
  }, [member, filter]);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#F5F5F5] mb-1" style={{ fontFamily: 'Syne, system-ui, sans-serif' }}>Tasks</h1>
        <p className="text-sm text-[#888888]">Your assigned work across all orbits.</p>
      </div>
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <button key={tab.value} onClick={() => setFilter(tab.value)}
            className="px-3.5 py-2 rounded-lg text-sm transition-all duration-150"
            style={{ background: filter === tab.value ? '#0F6E5620' : '#1A1A1A', border: filter === tab.value ? '1px solid #0F6E5640' : '1px solid #2E2E2E', color: filter === tab.value ? '#1D9E75' : '#888888' }}>
            {tab.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-[#888888]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
      </div>
      {loading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-4 animate-pulse"><div className="h-4 bg-[#2E2E2E] rounded w-2/3 mb-2" /><div className="h-3 bg-[#2E2E2E] rounded w-full mb-3" /><div className="h-3 bg-[#2E2E2E] rounded w-1/3" /></div>)}</div>
      ) : tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#2E2E2E] p-12 text-center">
          <CheckSquare size={28} className="text-[#2E2E2E] mx-auto mb-3" />
          <p className="text-sm text-[#888888] mb-1">No tasks found</p>
          <p className="text-xs text-[#444444]">{filter === 'ALL' ? 'Your Orbit Lead will assign tasks to you.' : `No ${filter.toLowerCase().replace('_', ' ')} tasks.`}</p>
        </div>
      ) : (
        <div className="space-y-3">{tasks.map((task) => <TaskCard key={task.id} task={task} onClick={() => router.push(`/tasks/${task.id}`)} />)}</div>
      )}
    </div>
  );
}
