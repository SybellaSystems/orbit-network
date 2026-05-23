import { cn } from '@/lib/utils';

interface ScoreCardProps {
  quality: number;
  collaboration: number;
  consistency: number;
  completion: number;
  className?: string;
}

function ScoreSegment({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-[#888888] uppercase tracking-wide font-display">{label}</span>
        <span className="font-mono text-xs font-medium" style={{ color }}>{value.toFixed(1)}</span>
      </div>
      <div className="h-1 rounded-full bg-[#2E2E2E] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(value / 10) * 100}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export function ScoreCard({ quality, collaboration, consistency, completion, className }: ScoreCardProps) {
  return (
    <div className={cn('rounded-xl border border-[#2E2E2E] bg-[#1A1A1A] p-4 space-y-3', className)}>
      <h4 className="text-xs text-[#888888] font-display uppercase tracking-wider mb-3">Score Breakdown</h4>
      <ScoreSegment label="Quality" value={quality} color="#1D9E75" />
      <ScoreSegment label="Collaboration" value={collaboration} color="#378ADD" />
      <ScoreSegment label="Consistency" value={consistency} color="#BA7517" />
      <ScoreSegment label="Completion" value={completion} color="#888780" />
    </div>
  );
}
