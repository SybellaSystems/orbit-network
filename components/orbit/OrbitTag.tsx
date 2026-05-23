import { ORBIT_COLORS, ORBIT_SHORT } from '@/lib/supabase';
import type { OrbitType } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface OrbitTagProps {
  orbit: OrbitType;
  size?: 'sm' | 'md';
  className?: string;
}

export function OrbitTag({ orbit, size = 'md', className }: OrbitTagProps) {
  const color = ORBIT_COLORS[orbit];
  return (
    <span
      className={cn('inline-flex items-center rounded-md font-display font-semibold tracking-wide uppercase', size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs', className)}
      style={{ backgroundColor: `${color}18`, color, border: `1px solid ${color}35` }}
    >
      {ORBIT_SHORT[orbit]}
    </span>
  );
}
