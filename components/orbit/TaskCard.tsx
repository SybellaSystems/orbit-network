import { ORBIT_COLORS } from '@/lib/supabase';
import type { Task } from '@/lib/supabase';
import { OrbitTag } from './OrbitTag';
import { cn } from '@/lib/utils';
import { Clock, CheckCircle, Circle, Eye } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  className?: string;
}

function getDeadlineInfo(deadline: string) {
  const diffDays = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, color: '#A32D2D' };
  if (diffDays === 0) return { label: 'Due today', color: '#BA7517' };
  if (diffDays <= 3) return { label: `${diffDays}d left`, color: '#BA7517' };
  return { label: `${diffDays}d left`, color: '#888888' };
}

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', Icon: Circle, color: '#888888' },
  IN_REVIEW: { label: 'In Review', Icon: Eye, color: '#378ADD' },
  COMPLETE: { label: 'Complete', Icon: CheckCircle, color: '#1D9E75' },
};

export function TaskCard({ task, onClick, className }: TaskCardProps) {
  const deadline = getDeadlineInfo(task.deadline);
  const status = STATUS_CONFIG[task.status];
  const orbitColor = ORBIT_COLORS[task.orbit];

  return (
    <div
      className={cn('rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-4 transition-all duration-200 hover:border-[#3E3E3E] hover:bg-[#1E1E1E]', onClick && 'cursor-pointer', className)}
      onClick={onClick}
      style={{ borderLeft: `3px solid ${orbitColor}40` }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-display font-semibold text-[#F5F5F5] text-sm leading-snug truncate">{task.title}</h3>
        <OrbitTag orbit={task.orbit} size="sm" />
      </div>
      <p className="text-[#888888] text-xs line-clamp-2 mb-3 leading-relaxed">{task.description}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <status.Icon size={12} style={{ color: status.color }} />
          <span className="text-xs font-medium" style={{ color: status.color }}>{status.label}</span>
        </div>
        <div className="flex items-center gap-1" style={{ color: deadline.color }}>
          <Clock size={11} />
          <span className="text-[11px] font-mono">{deadline.label}</span>
        </div>
      </div>
    </div>
  );
}
