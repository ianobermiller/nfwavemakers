import { cn } from 'cnfast';
import type { Debate, User } from '../data/model.ts';
import { useDebateCard } from '../hooks/data.ts';
import { DEBATE_EVENT_LABELS, type Winner } from '../types.ts';
import { compareByLastName, formatTeam } from '../utils/format.ts';
import { Avatar } from './Avatar.tsx';
import { Card } from './ui/Card.tsx';
import { Heading } from './ui/Heading.tsx';
import { Muted } from './ui/Muted.tsx';

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
  actions?: React.ReactNode | undefined;
  isExpanded?: boolean | undefined;
  onClick?: (() => void) | undefined;
  id?: string | undefined;
  ariaControls?: string | undefined;
  className?: string | undefined;
}

function DebateCardShell({
  debate,
  winnerBadge,
  badge,
  actions,
  isExpanded,
  onClick,
  id,
  ariaControls,
  className,
}: DebateCardShellProps): React.JSX.Element {
  const affTeam = debate?.affTeam ?? [];
  const negTeam = debate?.negTeam ?? [];
  const judges = [...(debate?.judges ?? [])].sort(compareByLastName);
  const judgeNames = judges.map((u) => u.name ?? '?');
  const hasTeams = affTeam.length > 0 || negTeam.length > 0;
  const hasChevron = isExpanded !== undefined;
  const hasActions = actions != null;

  const details = (
    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
      <div className="flex items-center gap-2 flex-wrap">
        <Heading as="span" variant="name">
          {debate?.date}
        </Heading>
        <Muted as="span" size="xs">
          {debate?.room}
        </Muted>
        {debate != null && (
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {DEBATE_EVENT_LABELS[debate.event]}
          </span>
        )}
        {badge != null && (
          <span className="text-xs text-slate-400 dark:text-slate-500">{badge}</span>
        )}
        {winnerBadge != null && (
          <span className="text-xs text-slate-400 dark:text-slate-500">{winnerBadge}</span>
        )}
      </div>
      {debate?.caseTitle && (
        <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
          {debate.caseTitle}
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
      {judgeNames.length > 0 && (
        <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5 flex-wrap">
          <AvatarStack members={judges} />
          <span>
            Judge{judgeNames.length === 1 ? '' : 's'}: {judgeNames.join(', ')}
          </span>
        </span>
      )}
    </div>
  );

  const chevron = hasChevron ? (
    <span className="text-slate-400 text-xs shrink-0" aria-hidden="true">
      {isExpanded ? '▲' : '▼'}
    </span>
  ) : null;

  const sharedClassName = cn('flex w-full items-center justify-between gap-3', className);

  // Actions live inside the card. Keep them as a sibling of the clickable
  // region so the kebab is not nested inside the navigate button.
  if (hasActions) {
    const main = (
      <>
        {details}
        {chevron}
      </>
    );
    return (
      <Card id={id} padding="sm" interactive={onClick != null} className={sharedClassName}>
        {onClick != null ? (
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left cursor-pointer bg-transparent border-0 p-0"
            onClick={onClick}
            aria-expanded={hasChevron ? isExpanded : undefined}
            aria-controls={ariaControls}
          >
            {main}
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 items-center justify-between gap-3">{main}</div>
        )}
        <div className="shrink-0 self-center">{actions}</div>
      </Card>
    );
  }

  const content = (
    <>
      {details}
      {chevron}
    </>
  );

  if (onClick != null) {
    return (
      <Card
        as="button"
        interactive
        padding="sm"
        id={id}
        className={sharedClassName}
        onClick={onClick}
        aria-expanded={hasChevron ? isExpanded : undefined}
        aria-controls={ariaControls}
      >
        {content}
      </Card>
    );
  }

  return (
    <Card id={id} padding="sm" className={sharedClassName}>
      {content}
    </Card>
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
  /** Trailing control rendered inside the card on the right (e.g. kebab menu). */
  actions?: React.ReactNode | undefined;
  isExpanded?: boolean | undefined;
  onClick?: (() => void) | undefined;
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
  actions,
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
      actions={actions}
      isExpanded={isExpanded}
      onClick={onClick}
      id={id}
      ariaControls={ariaControls}
      className={className}
    />
  );
}

export function DebateCard(props: DebateCardProps): React.JSX.Element {
  const {
    debate,
    winner,
    judgeId,
    badge,
    actions,
    isExpanded,
    onClick,
    id,
    ariaControls,
    className,
  } = props;

  // Callers that already have the debate paint immediately; no second fetch.
  if (debate !== undefined) {
    return (
      <DebateCardShell
        debate={debate}
        winnerBadge={judgeId != null ? winnerLabel(winner) : null}
        badge={badge}
        actions={actions}
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
