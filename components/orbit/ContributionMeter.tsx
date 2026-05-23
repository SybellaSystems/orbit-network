import { PROMOTION_THRESHOLD } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface ContributionMeterProps {
  score: number;
  showThreshold?: boolean;
  className?: string;
}

export function ContributionMeter({ score, showThreshold = true, className }: ContributionMeterProps) {
  const pct = Math.min((score / 10) * 100, 100);
  const thresholdPct = (PROMOTION_THRESHOLD / 10) * 100;
  const eligible = score >= PROMOTION_THRESHOLD;
  const barColor = eligible ? '#1D9E75' : score >= 5 ? '#BA7517' : '#888780';

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#888888] font-display uppercase tracking-wide">Contribution Score</span>
        <span className="font-mono text-sm font-medium" style={{ color: barColor }}>
          {score.toFixed(1)}<span className="text-[#888888] text-xs">/10</span>
        </span>
      </div>
      <div className="relative h-1.5 rounded-full bg-[#2E2E2E] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: barColor }} />
        {showThreshold && <div className="absolute top-0 bottom-0 w-px bg-[#F5F5F5]/30" style={{ left: `${thresholdPct}%` }} />}
      </div>
      {showThreshold && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[#888888]">
            {eligible ? 'Eligible for promotion' : `${(PROMOTION_THRESHOLD - score).toFixed(1)} pts to eligibility`}
          </span>
          {eligible && <span className="text-[11px] font-medium" style={{ color: '#1D9E75' }}>Ready</span>}
        </div>
      )}
    </div>
  );
}
