'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase, LEVEL_ROLES, ORBIT_COLORS, ROLE_LABELS } from '@/lib/supabase';
import type { Member, MemberRole } from '@/lib/supabase';
import { MemberAvatar } from '@/components/orbit/MemberAvatar';
import { OrbitTag } from '@/components/orbit/OrbitTag';
import { ContributionMeter } from '@/components/orbit/ContributionMeter';
import { Users, ChevronDown } from 'lucide-react';

export default function AdminMembersPage() {
  const { member } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingLevel, setEditingLevel] = useState<string | null>(null);
  const [newLevel, setNewLevel] = useState(0);

  useEffect(() => {
    if (!member) return;
    load();
  }, [member, router]);

  async function load() {
    const { data } = await supabase.from('members').select('*').order('joined_at', { ascending: false });
    setMembers(data ?? []); setLoading(false);
  }

  async function updateLevel(memberId: string, level: number) {
    await supabase.from('members').update({ level }).eq('id', memberId);
    setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, level } : m));
    setEditingLevel(null);
  }

  async function updateRole(memberId: string, role: MemberRole) {
    await supabase.from('members').update({ role }).eq('id', memberId);
    setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role } : m));
  }

  if (!member) return null;
  if (!['NETWORK_COUNCIL', 'ARCHITECTURE_BOARD'].includes(member.role)) { router.push('/dashboard'); return null; }
  const filtered = members.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6"><h1 className="text-2xl font-bold text-[#F5F5F5] mb-1" style={{ fontFamily: 'Syne, system-ui, sans-serif' }}>Member Directory</h1><p className="text-sm text-[#888888]">Full roster. Edit levels and roles directly.</p></div>
      <div className="flex items-center gap-3 mb-5">
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="flex-1 max-w-sm px-3.5 py-2.5 rounded-lg text-sm outline-none" style={{ background: '#1A1A1A', border: '1px solid #2E2E2E', color: '#F5F5F5' }} onFocus={(e) => { e.currentTarget.style.borderColor = '#0F6E56'; }} onBlur={(e) => { e.currentTarget.style.borderColor = '#2E2E2E'; }} />
        <span className="text-xs text-[#888888] font-mono">{filtered.length} members</span>
      </div>
      {loading ? <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-4 animate-pulse"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-[#2E2E2E]" /><div className="flex-1 space-y-1.5"><div className="h-4 bg-[#2E2E2E] rounded w-1/4" /><div className="h-3 bg-[#2E2E2E] rounded w-1/3" /></div></div></div>)}</div>
      : filtered.length === 0 ? <div className="rounded-xl border border-dashed border-[#2E2E2E] p-12 text-center"><Users size={24} className="text-[#2E2E2E] mx-auto mb-3" /><p className="text-sm text-[#888888]">No members found.</p></div>
      : <div className="space-y-2">{filtered.map((m) => (
        <div key={m.id} className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-4 hover:border-[#3E3E3E] transition-all duration-150">
          <div className="flex items-center gap-4 flex-wrap">
            <MemberAvatar member={m} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5"><span className="font-medium text-sm text-[#F5F5F5]">{m.name}</span><OrbitTag orbit={m.orbit} size="sm" /></div>
              <div className="text-xs text-[#888888]">{m.email}</div>
            </div>
            <div className="flex items-center gap-2">
              {editingLevel === m.id ? (
                <div className="flex items-center gap-2">
                  <select value={newLevel} onChange={(e) => setNewLevel(Number(e.target.value))} className="px-2 py-1.5 rounded text-xs outline-none" style={{ background: '#222222', border: '1px solid #0F6E56', color: '#F5F5F5' }}>
                    {Array.from({ length: 8 }, (_, i) => i).map((l) => <option key={l} value={l}>L{l} — {LEVEL_ROLES[l]}</option>)}
                  </select>
                  <button onClick={() => updateLevel(m.id, newLevel)} className="px-2.5 py-1.5 rounded text-xs font-medium text-white" style={{ background: '#0F6E56' }}>Save</button>
                  <button onClick={() => setEditingLevel(null)} className="px-2.5 py-1.5 rounded text-xs text-[#888888] border border-[#2E2E2E]">Cancel</button>
                </div>
              ) : (
                <button onClick={() => { setEditingLevel(m.id); setNewLevel(m.level); }} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs hover:bg-[#222222]" style={{ color: ORBIT_COLORS[m.orbit] }}>
                  <span className="font-mono font-bold">L{m.level}</span><ChevronDown size={10} />
                </button>
              )}
            </div>
            <select value={m.role} onChange={(e) => updateRole(m.id, e.target.value as MemberRole)} className="px-2.5 py-1.5 rounded-lg text-xs outline-none" style={{ background: '#222222', border: '1px solid #2E2E2E', color: '#888888' }}>
              {(['MEMBER', 'ORBIT_LEAD', 'NETWORK_COUNCIL', 'ARCHITECTURE_BOARD'] as MemberRole[]).map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
            </select>
            <div className="hidden lg:block w-28"><ContributionMeter score={m.contribution_score} showThreshold={false} /></div>
          </div>
        </div>
      ))}</div>}
    </div>
  );
}
