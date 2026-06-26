import { cn } from 'cnfast';
import { db } from '../db.ts';
import { formatTeam } from '../utils.ts';

interface DebateCardProps {
  debateId: string;
  judgeId?: string;
  badge?: React.ReactNode;
  isExpanded?: boolean;
  onClick: () => void;
  id?: string;
  ariaControls?: string;
  className?: string;
}

export function DebateCard({
  debateId,
  judgeId,
  badge,
  isExpanded,
  onClick,
  id,
  ariaControls,
  className,
}: DebateCardProps): React.JSX.Element {
  const { data } = db.useQuery({
    debates: {
      $: { where: { id: debateId } },
      affTeam: {},
      negTeam: {},
    },
    ...(judgeId != null && {
      ballots: {
        $: { where: { 'debate.id': debateId, 'judge.id': judgeId } },
      },
    }),
  });

  const debate = data?.debates[0];
  const ballot = data?.ballots?.[0];
  const winnerBadge =
    judgeId != null
      ? ballot?.winner === 'aff'
        ? 'Affirmative wins'
        : ballot?.winner === 'neg'
          ? 'Negative wins'
          : '—'
      : null;
  const hasTeams = (debate?.affTeam?.length ?? 0) > 0 || (debate?.negTeam?.length ?? 0) > 0;
  const hasChevron = isExpanded !== undefined;

  return (
    <button
      id={id}
      className={cn(
        'w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-left cursor-pointer hover:border-nf-accent hover:shadow-sm transition-all',
        className,
      )}
      onClick={onClick}
      aria-expanded={hasChevron ? isExpanded : undefined}
      aria-controls={ariaControls}
    >
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {debate?.date}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">{debate?.room}</span>
          {badge != null && (
            <span className="text-xs text-slate-400 dark:text-slate-500">{badge}</span>
          )}
          {winnerBadge != null && (
            <span className="text-xs text-slate-400 dark:text-slate-500">{winnerBadge}</span>
          )}
        </div>
        {debate?.resolution && (
          <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
            {debate.resolution}
          </span>
        )}
        {hasTeams && (
          <span className="text-xs">
            <span className="text-aff dark:text-aff-d font-semibold">
              {formatTeam(debate?.affTeam ?? [])}
            </span>
            <span className="text-slate-400 dark:text-slate-500 mx-1">vs</span>
            <span className="text-neg dark:text-neg-d font-semibold">
              {formatTeam(debate?.negTeam ?? [])}
            </span>
          </span>
        )}
      </div>
      {hasChevron && (
        <span className="text-slate-400 text-xs shrink-0" aria-hidden="true">
          {isExpanded ? '▲' : '▼'}
        </span>
      )}
    </button>
  );
}
