import { cn } from 'cnfast';

interface Props {
  total: number;
  /** Keep layout when the total is still zero (ballot editor). */
  reserveSpace?: boolean;
}

/** Labeled speaker-point sum (six scores, out of 30). */
export function SpeakerPointsTotal({
  total,
  reserveSpace = false,
}: Props): React.JSX.Element | null {
  if (total <= 0 && !reserveSpace) return null;

  return (
    <span
      className={cn(
        'inline-flex items-baseline gap-1 text-sm font-bold text-nf-blue dark:text-nf-blue-d transition-opacity',
        reserveSpace && (total > 0 ? 'opacity-100' : 'opacity-0'),
      )}
      aria-label={`Speaker points ${total}`}
    >
      <span aria-hidden="true">{total > 0 ? total : '0'}</span>
      <span className="text-xs font-medium text-slate-400 dark:text-slate-500" aria-hidden="true">
        pts
      </span>
    </span>
  );
}
