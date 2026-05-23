import { ORBIT_COLORS } from '@/lib/supabase';
import type { OrbitType, Member } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface MemberAvatarProps {
  member?: Pick<Member, 'name' | 'orbit'>;
  name?: string;
  orbit?: OrbitType;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function MemberAvatar({ member, name: nameProp, orbit: orbitProp, size = 'md', className }: MemberAvatarProps) {
  const name = member?.name ?? nameProp ?? '?';
  const orbit = member?.orbit ?? orbitProp;
  const color = orbit ? ORBIT_COLORS[orbit] : '#0F6E56';
  const initials = name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
  const sizes = { sm: 'w-7 h-7 text-[11px]', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base', xl: 'w-14 h-14 text-lg' };

  return (
    <div
      className={cn('flex items-center justify-center rounded-full font-display font-bold flex-shrink-0', sizes[size], className)}
      style={{ backgroundColor: `${color}22`, border: `1.5px solid ${color}45`, color }}
    >
      {initials}
    </div>
  );
}
