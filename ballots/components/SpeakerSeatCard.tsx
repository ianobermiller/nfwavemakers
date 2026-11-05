import { cn } from 'cnfast';
import type { SpeakerScores } from '../types.ts';
import { ScoringRows } from './ScoringRows.tsx';
import { SpeakerPointsTotal } from './SpeakerPointsTotal.tsx';

interface Props {
  role: string;
  name: string | undefined;
  rank: number | undefined;
  total: number;
  scores: Partial<Record<keyof SpeakerScores, number | null | undefined>>;
  notes: string | undefined;
  /** The signed-in debater's own seat. */
  isYou: boolean;
}

export function SpeakerSeatCard({
  role,
  name,
  rank,
  total,
  scores,
  notes,
  isYou,
}: Props): React.JSX.Element {
  return (
    <div
      className={cn(
        'mb-2 rounded-lg border px-3 py-2.5',
        isYou
          ? 'border-nf-blue/40 bg-nf-blue-light ring-1 ring-nf-blue/20 dark:border-nf-blue-d/55 dark:bg-nf-blue-d/10 dark:ring-nf-blue-d/40'
          : 'border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-900',
      )}
    >
      <div className="mb-1.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {name && (
            <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
              {role}
            </p>
          )}
          <p className="text-base font-bold text-slate-900 dark:text-slate-50">{name ?? role}</p>
          {isYou && <p className="sr-only">Your scores</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end">
          {rank != null && (
            <p className="text-lg leading-tight font-bold text-nf-blue tabular-nums dark:text-nf-blue-d">
              Ranked #{rank}
            </p>
          )}
          <SpeakerPointsTotal total={total} />
        </div>
      </div>
      {/* Own parent so the last score row is :last-child and drops its bottom border. */}
      <div>
        <ScoringRows scores={scores} />
      </div>
      {notes && (
        <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-200">
          {notes}
        </p>
      )}
    </div>
  );
}
