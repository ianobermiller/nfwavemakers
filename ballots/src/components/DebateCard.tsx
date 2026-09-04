import { cn } from 'cnfast';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { formatTeam } from '../utils.ts';
import { Avatar } from './Avatar.tsx';

function AvatarStack({
  members,
}: {
  members: { _id: string; name?: string; avatarUrl: string | null }[];
}): React.JSX.Element | null {
  if (members.length === 0) return null;
  return (
    <span className="flex -space-x-2 shrink-0">
      {members.map((m) => (
        <Avatar
          key={m._id}
          name={m.name ?? m._id}
          imageURL={m.avatarUrl ?? undefined}
          size="sm"
          className="ring-2 ring-white dark:ring-slate-800"
        />
      ))}
    </span>
  );
}

interface DebateCardProps {
  debateId: Id<'debates'>;
  judgeId?: Id<'users'>;
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
  const data = useQuery(api.debates.card, {
    debateId,
    ...(judgeId ? { judgeId } : {}),
  });

  const debate = data?.debate;
  const affTeam = debate?.affTeam ?? [];
  const negTeam = debate?.negTeam ?? [];
  const winnerBadge =
    judgeId != null
      ? data?.winner === 'aff'
        ? 'Affirmative wins'
        : data?.winner === 'neg'
          ? 'Negative wins'
          : '—'
      : null;
  const hasTeams = affTeam.length > 0 || negTeam.length > 0;
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
          <span className="text-xs flex items-center gap-1.5 flex-wrap">
            <AvatarStack members={affTeam} />
            <span className="text-aff dark:text-aff-d font-semibold">{formatTeam(affTeam)}</span>
            <span className="text-slate-400 dark:text-slate-500 mx-0.5">vs</span>
            <AvatarStack members={negTeam} />
            <span className="text-neg dark:text-neg-d font-semibold">{formatTeam(negTeam)}</span>
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
