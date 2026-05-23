'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase, LEVEL_ROLES, ORBIT_COLORS, ROLE_LABELS } from '@/lib/supabase';
import type { Member } from '@/lib/supabase';
import { MemberAvatar } from '@/components/orbit/MemberAvatar';
import { OrbitTag } from '@/components/orbit/OrbitTag';
import { ContributionMeter } from '@/components/orbit/ContributionMeter';
import { Users } from 'lucide-react';

export default function ManageMembersPage() {
  const { member } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!member) return;
    async function load() {
      let query = supabase.from('members').select('*').order('contribution_score', { ascending: false });
      if (member!.role === 'ORBIT_LEAD') query = query.eq('orbit', member!.orbit);
      const { data } = await query;
      setMembers(data ?? []); setLoading(false);
    }
    load();
  }, [member, router]);

  if (!member) return null;
  if (!['ORBIT_LEAD', 'NETWORK_COUNCIL', 'ARCHITECTURE_BOARD'].includes(member.role)) { router.push('/dashboard'); return null; }
  const filtered = members.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#F5F5F5] mb-1" style={{ fontFamily: 'Syne, system-ui, sans-serif' }}>Orbit Members</h1>
        <p className="text-sm text-[#888888]">{member.role === 'ORBIT_LEAD' ? `Members in Orbit ${member.orbit}` : 'All network members'}</p>
      </div>
      <div className="mb-5"><input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email"
        className="w-full max-w-sm px-3.5 py-2.5 rounded-lg text-sm outline-none" style={{ background: '#1A1A1A', border: '1px solid #2E2E2E', color: '#F5F5F5' }}
        onFocus={(e) => { e.currentTarget.style.borderColor = '#0F6E56'; }} onBlur={(e) => { e.currentTarget.style.borderColor = '#2E2E2E'; }} /></div>
      {loading ? <div className="space-y-2">{[1, 2, 3, 4].map((i) => <div key={i} className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-4 animate-pulse"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-[#2E2E2E]" /><div className="flex-1"><div className="h-4 bg-[#2E2E2E] rounded w-1/4 mb-1.5" /><div className="h-3 bg-[#2E2E2E] rounded w-1/3" /></div></div></div>)}</div>
      : filtered.length === 0 ? <div className="rounded-xl border border-dashed border-[#2E2E2E] p-12 text-center"><Users size={24} className="text-[#2E2E2E] mx-auto mb-3" /><p className="text-sm text-[#888888]">No members found.</p></div>
      : <div className="space-y-2">{filtered.map((m) => (
        <div key={m.id} className="rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-4 hover:border-[#3E3E3E] transition-all duration-150">
          <div className="flex items-center gap-4 flex-wrap">
            <MemberAvatar member={m} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap"><span className="font-medium text-sm text-[#F5F5F5]">{m.name}</span><OrbitTag orbit={m.orbit} size="sm" /><span className="text-[10px] font-mono font-bold" style={{ color: ORBIT_COLORS[m.orbit] }}>L{m.level}</span><span className="text-xs text-[#888888]">{LEVEL_ROLES[m.level]}</span></div>
              <div className="text-xs text-[#888888] mt-0.5">{m.email}</div>
            </div>
            <div className="w-32 hidden md:block"><ContributionMeter score={m.contribution_score} showThreshold={false} /></div>
            <div className="text-right"><div className="text-sm font-mono font-bold" style={{ color: ORBIT_COLORS[m.orbit] }}>{m.contribution_score.toFixed(1)}</div><div className="text-[10px] text-[#888888]">{ROLE_LABELS[m.role]}</div></div>
          </div>
        </div>
      ))}</div>}
    </div>
  );
}
