'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Task, Member, OrbitType } from '@/lib/supabase';
import { TaskCard } from '@/components/orbit/TaskCard';
import { Plus, X, AlertCircle } from 'lucide-react';

const ORBITS: OrbitType[] = ['FORGE', 'LABS', 'CORE', 'OPEN', 'INTELLIGENCE'];

export default function ManageTasksPage() {
  const { member } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [orbit, setOrbit] = useState<OrbitType>(member?.orbit ?? 'FORGE');
  const [assigneeId, setAssigneeId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!member) return;
    setOrbit(member.orbit);
    async function load() {
      const [{ data: taskData }, { data: memberData }] = await Promise.all([
        supabase.from('tasks').select('*').order('created_at', { ascending: false }).limit(30),
        supabase.from('members').select('*').order('name'),
      ]);
      setTasks(taskData ?? []); setMembers(memberData ?? []); setLoading(false);
    }
    load();
  }, [member, router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!member) return;
    setCreating(true); setError('');
    const { error: err } = await supabase.from('tasks').insert({ title, description, orbit, assignee_id: assigneeId, created_by: member.id, deadline: new Date(deadline).toISOString(), status: 'PENDING' });
    if (err) setError(err.message);
    else {
      setShowForm(false); setTitle(''); setDescription(''); setAssigneeId(''); setDeadline('');
      const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false }).limit(30);
      setTasks(data ?? []);
    }
    setCreating(false);
  }

  if (!member) return null;
  if (!['ORBIT_LEAD', 'NETWORK_COUNCIL', 'ARCHITECTURE_BOARD'].includes(member.role)) { router.push('/dashboard'); return null; }
  const inputStyle = { background: '#222222', border: '1px solid #2E2E2E', color: '#F5F5F5' };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-[#F5F5F5] mb-1" style={{ fontFamily: 'Syne, system-ui, sans-serif' }}>Manage Tasks</h1><p className="text-sm text-[#888888]">Create and assign tasks to orbit members.</p></div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white" style={{ background: 'linear-gradient(135deg, #0F6E56 0%, #1D9E75 100%)' }}>
          {showForm ? <X size={14} /> : <Plus size={14} />}{showForm ? 'Cancel' : 'New Task'}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-6 mb-6">
          <h3 className="text-sm font-semibold text-[#F5F5F5] mb-5" style={{ fontFamily: 'Syne, system-ui, sans-serif' }}>Create Task</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2"><label className="block text-xs text-[#888888] mb-1.5 font-display uppercase tracking-wide">Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Build authentication middleware" required className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={inputStyle} onFocus={(e) => { e.currentTarget.style.borderColor = '#0F6E56'; }} onBlur={(e) => { e.currentTarget.style.borderColor = '#2E2E2E'; }} /></div>
              <div className="md:col-span-2"><label className="block text-xs text-[#888888] mb-1.5 font-display uppercase tracking-wide">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Task description and criteria" required rows={4} className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none" style={inputStyle} onFocus={(e) => { e.currentTarget.style.borderColor = '#0F6E56'; }} onBlur={(e) => { e.currentTarget.style.borderColor = '#2E2E2E'; }} /></div>
              <div><label className="block text-xs text-[#888888] mb-1.5 font-display uppercase tracking-wide">Orbit</label>
                <select value={orbit} onChange={(e) => setOrbit(e.target.value as OrbitType)} className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={inputStyle}>{ORBITS.map((o) => <option key={o} value={o}>{o}</option>)}</select></div>
              <div><label className="block text-xs text-[#888888] mb-1.5 font-display uppercase tracking-wide">Assignee</label>
                <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} required className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={inputStyle}>
                  <option value="">Select a member</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name} (L{m.level} · {m.orbit})</option>)}</select></div>
              <div><label className="block text-xs text-[#888888] mb-1.5 font-display uppercase tracking-wide">Deadline</label>
                <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required min={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={inputStyle} onFocus={(e) => { e.currentTarget.style.borderColor = '#0F6E56'; }} onBlur={(e) => { e.currentTarget.style.borderColor = '#2E2E2E'; }} /></div>
            </div>
            {error && <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/20 rounded-lg p-3"><AlertCircle size={12} />{error}</div>}
            <button type="submit" disabled={creating} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #0F6E56 0%, #1D9E75 100%)' }}><Plus size={13} />{creating ? 'Creating...' : 'Create Task'}</button>
          </form>
        </div>
      )}

      {loading ? <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-4 animate-pulse"><div className="h-4 bg-[#2E2E2E] rounded w-2/3 mb-2" /><div className="h-3 bg-[#2E2E2E] rounded w-full" /></div>)}</div>
      : tasks.length === 0 ? <div className="rounded-xl border border-dashed border-[#2E2E2E] p-12 text-center"><Plus size={24} className="text-[#2E2E2E] mx-auto mb-3" /><p className="text-sm text-[#888888]">No tasks created yet.</p></div>
      : <div className="space-y-3">{tasks.map((task) => <TaskCard key={task.id} task={task} onClick={() => router.push(`/tasks/${task.id}`)} />)}</div>}
    </div>
  );
}
