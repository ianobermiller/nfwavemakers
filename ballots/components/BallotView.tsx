import { useBallot } from '../hooks/data.ts';
import { usePermissions } from '../hooks/usePermissions.ts';
import { cn } from 'cnfast';
import {
  DEBATE_EVENT_LABELS,
  positionLabel,
  positionsForEvent,
  type DebateEvent,
  type Position,
} from '../types.ts';
import { formatSpeakerName, scoringTotal } from '../utils/format.ts';
import { Avatar } from './Avatar.tsx';
import { BackLink } from './BackLink.tsx';
import { PageLayout } from '@/site/PageLayout.tsx';
import { ScoringRows } from './ScoringRows.tsx';
import { SpeakerNotes } from './SpeakerNotes.tsx';

interface Props {
  ballotId: string;
  currentUserId: string;
}

export function BallotView({ ballotId, currentUserId }: Props): React.JSX.Element {
  const ballotLive = useBallot(ballotId);
  const can = usePermissions(currentUserId);
  const ballot = ballotLive.read();

  if (!ballot) {
    return (
      <PageLayout>
        <BackLink to="dashboard" label="Dashboard" />
        <p className="text-slate-500 dark:text-slate-400 text-sm">Ballot not found.</p>
      </PageLayout>
    );
  }
  if (!ballot.submittedAt) {
    return (
      <PageLayout>
        <BackLink to="dashboard" label="Dashboard" />
        <p className="text-slate-500 dark:text-slate-400 text-sm">Ballot not yet submitted.</p>
      </PageLayout>
    );
  }

  const debate = ballot.debate;
  const judge = ballot.judge;
  const evals = ballot.speakerEvals;
  const event: DebateEvent = debate?.event ?? 'tp';
  const seats = positionsForEvent(event);

  const avatarURLs = Object.fromEntries(
    evals
      .filter(
        (
          e,
        ): e is typeof e & {
          speaker: NonNullable<typeof e.speaker> & { avatarUrl: string };
        } => e.speaker?.avatarUrl != null,
      )
      .map((evaluation) => [evaluation.speaker.id, evaluation.speaker.avatarUrl]),
  );

  if (
    !can.canViewBallot(
      judge?.id,
      evals.map((evaluation) => evaluation.speaker?.id),
    )
  ) {
    return (
      <PageLayout>
        <BackLink to="dashboard" label="Dashboard" />
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          You don't have access to this ballot.
        </p>
      </PageLayout>
    );
  }

  const evalsByPosition = Object.fromEntries(
    seats.map((pos) => [pos, evals.find((e) => e.position === pos)]),
  );

  function seatsForSide(side: 'aff' | 'neg'): Position[] {
    return seats.filter((pos) => pos.startsWith(side));
  }

  return (
    <PageLayout>
      <BackLink to="dashboard" label="Dashboard" />
      <h1 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-3">
        {debate?.date
          ? `Ballot — ${debate.date}${debate.room ? `, ${debate.room}` : ''}`
          : 'Ballot'}
      </h1>

      {/* Compact metadata line */}
      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-3 flex-wrap">
        <span>{DEBATE_EVENT_LABELS[event]}</span>
        {judge && (
          <>
            <span>·</span>
            <span>Judge: {judge.name}</span>
          </>
        )}
        {debate?.date && (
          <>
            <span>·</span>
            <span>{debate.date}</span>
          </>
        )}
        {debate?.room && (
          <>
            <span>·</span>
            <span>{debate.room}</span>
          </>
        )}
        {debate?.resolution && (
          <>
            <span>·</span>
            <span className="truncate">{debate.resolution}</span>
          </>
        )}
      </div>

      {/* Decision */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 mb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          {(['aff', 'neg'] as const).map((side) => (
            <span
              key={side}
              className={cn(
                'inline-flex w-full items-center justify-center px-4 py-3 border-2 rounded-xl font-semibold text-sm sm:w-auto sm:py-2',
                ballot.winner === side
                  ? side === 'aff'
                    ? 'border-aff bg-aff-bg dark:border-aff-d dark:bg-aff-bg-d text-aff dark:text-aff-d'
                    : 'border-neg bg-neg-bg dark:border-neg-d dark:bg-neg-bg-d text-neg dark:text-neg-d'
                  : 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500',
              )}
            >
              {side === 'aff' ? 'Affirmative wins' : 'Negative wins'}
            </span>
          ))}
        </div>
        {ballot.reasonForDecision && (
          <p className="text-sm text-slate-700 dark:text-slate-300 mt-3 whitespace-pre-wrap">
            {ballot.reasonForDecision}
          </p>
        )}
      </div>

      {/* Speakers — 2×2 grid on md+ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(['aff', 'neg'] as const).map((side) => (
          <div key={side}>
            <h2
              className={cn(
                'text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg mb-2',
                side === 'aff'
                  ? 'bg-aff-bg dark:bg-aff-bg-d text-aff dark:text-aff-d'
                  : 'bg-neg-bg dark:bg-neg-bg-d text-neg dark:text-neg-d',
              )}
            >
              {side === 'aff' ? 'Affirmative' : 'Negative'}
            </h2>
            {seatsForSide(side).map((pos) => {
              const ev = evalsByPosition[pos];
              const total = scoringTotal(ev ?? {});
              return (
                <div
                  key={pos}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 mb-3 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                      {ev?.speaker?.id && (
                        <Avatar
                          name={ev.speaker.name ?? ev.speaker.id}
                          imageURL={avatarURLs[ev.speaker.id]}
                          size="sm"
                        />
                      )}
                      <span>
                        {event === 'ld' ? 'Debater' : positionLabel(event, pos)}
                        {ev?.speaker?.name && (
                          <span className="ml-2 normal-case font-normal text-slate-700 dark:text-slate-200">
                            {formatSpeakerName(ev.speaker.name)}
                          </span>
                        )}
                        {ev?.rank != null && (
                          <span className="ml-2 normal-case font-normal text-slate-400 dark:text-slate-500">
                            · Ranked #{ev.rank}
                          </span>
                        )}
                      </span>
                    </h3>
                    {total > 0 && (
                      <span className="text-sm font-bold text-nf-blue dark:text-nf-blue-d">
                        {total}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <ScoringRows scores={ev ?? {}} />
                  </div>
                  {ev?.notes && <SpeakerNotes notes={ev.notes} />}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </PageLayout>
  );
}
