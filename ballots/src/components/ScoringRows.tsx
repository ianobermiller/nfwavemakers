import { SCORE_CATEGORIES, type SpeakerScores } from '../types.ts';

interface Props {
  scores: Partial<Record<keyof SpeakerScores, number | null | undefined>>;
  showTotal?: boolean;
}

export function ScoringRows({ scores, showTotal = false }: Props): React.JSX.Element {
  const total = SCORE_CATEGORIES.reduce((sum, cat) => sum + (scores[cat.key] ?? 0), 0);
  return (
    <>
      {SCORE_CATEGORIES.map((cat) => {
        const val = scores[cat.key];
        return (
          <div
            key={cat.key}
            className="flex items-center justify-between py-0.5 border-b border-slate-100 dark:border-slate-700 last:border-b-0"
          >
            <span className="text-xs text-slate-500 dark:text-slate-400">{cat.label}</span>
            <span className="text-xs font-bold text-nf-blue dark:text-nf-blue-d min-w-4 text-right">
              {typeof val === 'number' ? val : '—'}
            </span>
          </div>
        );
      })}
      {showTotal && (
        <div className="flex items-center justify-between py-1 text-sm">
          <span className="font-bold text-slate-700 dark:text-slate-200 text-xs">Total</span>
          <span className="font-bold text-nf-blue dark:text-nf-blue-d min-w-6 text-right">
            {total}
          </span>
        </div>
      )}
    </>
  );
}
