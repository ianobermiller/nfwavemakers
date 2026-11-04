import { cn } from 'cnfast';
import type { Debate, User } from '../data/model.ts';
import { useDebateCard } from '../hooks/data.ts';
import type { Winner } from '../types.ts';
import { formatTeam } from '../utils/format.ts';
import { Avatar } from './Avatar.tsx';

function AvatarStack({ members }: { members: User[] }): React.JSX.Element | null {
  if (members.length === 0) return null;
  return (
    <span className="flex -space-x-2 shrink-0">
      {members.map((m) => (
        <Avatar
          key={m.id}
          name={m.name ?? m.id}
          imageURL={m.avatarUrl ?? undefined}
          size="sm"
          className="ring-2 ring-white dark:ring-slate-800"
        />
      ))}
    </span>
  );
}

interface DebateCardShellProps {
  debate: Debate | undefined;
  winnerBadge: string | null;
  badge?: React.ReactNode | undefined;
  isExpanded?: boolean | undefined;
  onClick: () => void;
  id?: string | undefined;
  ariaControls?: string | undefined;
  className?: string | undefined;
}

function DebateCardShell({
  debate,
  winnerBadge,
  badge,
  isExpanded,
  onClick,
  id,
  ariaControls,
  className,
}: DebateCardShellProps): React.JSX.Element {
  const affTeam = debate?.affTeam ?? [];
  const negTeam = debate?.negTeam ?? [];
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

function winnerLabel(winner: Winner | undefined): string {
  return winner === 'aff' ? 'Affirmative wins' : winner === 'neg' ? 'Negative wins' : '—';
}

interface DebateCardProps {
  debateId: string;
  /** When provided, skip the debate fetch and render immediately. */
  debate?: Debate | undefined;
  /** Winner label when judgeId is set; used with a provided debate (no second fetch). */
  winner?: Winner | undefined;
  judgeId?: string | undefined;
  badge?: React.ReactNode | undefined;
  isExpanded?: boolean | undefined;
  onClick: () => void;
  id?: string | undefined;
  ariaControls?: string | undefined;
  className?: string | undefined;
}

function DebateCardLoaded({
  debateId,
  debate: debateProp,
  winner: winnerProp,
  judgeId,
  badge,
  isExpanded,
  onClick,
  id,
  ariaControls,
  className,
}: DebateCardProps): React.JSX.Element {
  const data = useDebateCard(debateId, judgeId).read();
  const debate = debateProp ?? data?.debate;
  const winner = winnerProp ?? data?.winner;
  const winnerBadge = judgeId != null ? winnerLabel(winner) : null;

  return (
    <DebateCardShell
      debate={debate}
      winnerBadge={winnerBadge}
      badge={badge}
      isExpanded={isExpanded}
      onClick={onClick}
      id={id}
      ariaControls={ariaControls}
      className={className}
    />
  );
}

export function DebateCard(props: DebateCardProps): React.JSX.Element {
  const { debate, winner, judgeId, badge, isExpanded, onClick, id, ariaControls, className } =
    props;

  // Callers that already have the debate paint immediately; no second fetch.
  if (debate !== undefined) {
    return (
      <DebateCardShell
        debate={debate}
        winnerBadge={judgeId != null ? winnerLabel(winner) : null}
        badge={badge}
        isExpanded={isExpanded}
        onClick={onClick}
        id={id}
        ariaControls={ariaControls}
        className={className}
      />
    );
  }

  return <DebateCardLoaded {...props} />;
}
