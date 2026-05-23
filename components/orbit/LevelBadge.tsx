import { LEVEL_ROLES, ORBIT_COLORS } from '@/lib/supabase';
import type { OrbitType } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface LevelBadgeProps {
  level: number;
  orbit?: OrbitType;
  size?: 'sm' | 'md' | 'lg';
  showRole?: boolean;
  className?: string;
}

export function LevelBadge({ level, orbit, size = 'md', showRole = true, className }: LevelBadgeProps) {
  const color = orbit ? ORBIT_COLORS[orbit] : '#0F6E56';
  const sizes = {
    sm: { badge: 'w-8 h-8 text-xs', label: 'text-xs' },
    md: { badge: 'w-10 h-10 text-sm', label: 'text-sm' },
    lg: { badge: 'w-14 h-14 text-lg', label: 'text-base' },
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn('flex items-center justify-center rounded-lg font-display font-bold flex-shrink-0', sizes[size].badge)}
        style={{ backgroundColor: `${color}18`, border: `1.5px solid ${color}50`, color }}
      >
        L{level}
      </div>
      {showRole && (
        <div className={cn('font-display font-semibold text-[#F5F5F5]', sizes[size].label)}>
          {LEVEL_ROLES[level]}
        </div>
      )}
    </div>
  );
}
