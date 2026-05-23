'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase, ORBIT_COLORS, ORBIT_SHORT, LEVEL_ROLES } from '@/lib/supabase';
import { MemberAvatar } from './MemberAvatar';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, CheckSquare, MessageSquare, User, Settings, Users,
  ShieldCheck, LogOut, ChevronRight, Menu, X, TrendingUp,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/profile', label: 'Profile', icon: User },
];

const LEAD_ITEMS: NavItem[] = [
  { href: '/manage/tasks', label: 'Manage Tasks', icon: Settings, roles: ['ORBIT_LEAD', 'NETWORK_COUNCIL', 'ARCHITECTURE_BOARD'] },
  { href: '/manage/members', label: 'Orbit Members', icon: Users, roles: ['ORBIT_LEAD', 'NETWORK_COUNCIL', 'ARCHITECTURE_BOARD'] },
];

const ADMIN_ITEMS: NavItem[] = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, roles: ['NETWORK_COUNCIL', 'ARCHITECTURE_BOARD'] },
  { href: '/admin/promotions', label: 'Promotions', icon: TrendingUp, roles: ['NETWORK_COUNCIL', 'ARCHITECTURE_BOARD'] },
  { href: '/admin/members', label: 'All Members', icon: ShieldCheck, roles: ['NETWORK_COUNCIL', 'ARCHITECTURE_BOARD'] },
];

function NavLink({ href, label, icon: Icon, active, onClick }: NavItem & { active: boolean; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150', active ? 'bg-[#0F6E56]/15 text-[#1D9E75] font-medium' : 'text-[#888888] hover:text-[#F5F5F5] hover:bg-[#222222]')}
    >
      <Icon size={15} />
      <span>{label}</span>
      {active && <ChevronRight size={12} className="ml-auto opacity-60" />}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { member } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = member?.role === 'NETWORK_COUNCIL' || member?.role === 'ARCHITECTURE_BOARD';
  const isLead = member?.role === 'ORBIT_LEAD' || isAdmin;
  const orbitColor = member?.orbit ? ORBIT_COLORS[member.orbit] : '#0F6E56';

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/');
  }

  const sidebar = (
    <aside className="flex flex-col h-full bg-[#111111] border-r border-[#1E1E1E]">
      <div className="px-5 py-5 border-b border-[#1E1E1E]">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <img src="/brand-logo.png" alt="Cogniforge logo" className="w-7 h-7 rounded-lg bg-[#0F6E56]/20 border border-[#0F6E56]/40 object-cover" />
          <span className="font-display font-bold text-[#F5F5F5] text-base tracking-tight">Cogniforge</span>
        </Link>
      </div>
      {member && (
        <div className="px-4 py-4 border-b border-[#1E1E1E]">
          <div className="flex items-center gap-3">
            <MemberAvatar member={member} size="md" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[#F5F5F5] truncate">{member.name}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-display font-semibold" style={{ color: orbitColor }}>L{member.level}</span>
                <span className="text-[#2E2E2E]">·</span>
                <span className="text-[10px] text-[#888888] truncate">{ORBIT_SHORT[member.orbit]} · {LEVEL_ROLES[member.level]}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} {...item} active={pathname === item.href || pathname.startsWith(item.href + '/')} onClick={() => setMobileOpen(false)} />
        ))}
        {isLead && (
          <>
            <div className="px-3 pt-4 pb-1"><span className="text-[10px] text-[#444444] font-display uppercase tracking-widest">Orbit Lead</span></div>
            {LEAD_ITEMS.map((item) => <NavLink key={item.href} {...item} active={pathname === item.href || pathname.startsWith(item.href + '/')} onClick={() => setMobileOpen(false)} />)}
          </>
        )}
        {isAdmin && (
          <>
            <div className="px-3 pt-4 pb-1"><span className="text-[10px] text-[#444444] font-display uppercase tracking-widest">Admin</span></div>
            {ADMIN_ITEMS.map((item) => <NavLink key={item.href} {...item} active={pathname === item.href || pathname.startsWith(item.href + '/')} onClick={() => setMobileOpen(false)} />)}
          </>
        )}
      </nav>
      <div className="px-3 py-3 border-t border-[#1E1E1E]">
        <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#888888] hover:text-[#F5F5F5] hover:bg-[#222222] transition-all duration-150">
          <LogOut size={15} /><span>Sign out</span>
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#0D0D0D]">
      <div className="hidden md:flex w-60 flex-shrink-0 flex-col">{sidebar}</div>
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 flex-shrink-0 flex flex-col z-10">{sidebar}</div>
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[#1E1E1E] bg-[#111111]">
          <Link href="/dashboard" className="flex items-center gap-2">
            <img src="/brand-logo.png" alt="Cogniforge logo" className="w-6 h-6 rounded-lg object-cover" />
            <span className="font-display font-bold text-[#F5F5F5] text-sm">Cogniforge</span>
          </Link>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1.5 text-[#888888] hover:text-[#F5F5F5]">
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
