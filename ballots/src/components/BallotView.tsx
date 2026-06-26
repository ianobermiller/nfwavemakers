import { db } from '../db.ts';
import { POSITIONS, POSITION_LABELS } from '../types.ts';
import { usePermissions } from '../hooks/usePermissions.ts';
import { formatSpeakerName, scoringTotal } from '../utils.ts';
import { AppBar } from './AppBar.tsx';
import { ScoringRows } from './ScoringRows.tsx';

interface Props {
  ballotId: string;
  currentUserId: string;
}

export function BallotView({ ballotId, currentUserId }: Props): React.JSX.Element {
  const { data, isLoading } = db.useQuery({
    ballots: {
      $: { where: { id: ballotId } },
      judge: {},
      debate: {},
      speakerEvals: {
        speaker: {},
      },
    },
  });

  if (isLoading) {
    return (
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        <p className="text-slate-500 dark:text-slate-400 text-sm">Loading…</p>
      </div>
    );
  }

  const ballot = data?.ballots?.[0];
  if (!ballot) {
    return (
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        <p className="text-slate-500 dark:text-slate-400 text-sm">Ballot not found.</p>
      </div>
    );
  }
  if (!ballot.submittedAt) {
    return (
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        <p className="text-slate-500 dark:text-slate-400 text-sm">Ballot not yet submitted.</p>
      </div>
    );
  }

  const debate = ballot.debate;
  const judge = ballot.judge;
  const evals = ballot.speakerEvals ?? [];

  const can = usePermissions(currentUserId);
  if (!can.canViewBallot(judge?.id, evals.map((e) => e.speaker?.id))) {
    return (
      <div className="flex flex-col min-h-screen">
        <AppBar />
        <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            You don't have access to this ballot.
          </p>
        </div>
      </div>
    );
  }

  const evalsByPosition = Object.fromEntries(
    POSITIONS.map((pos) => [pos, evals.find((e) => e.position === pos)]),
  );

  return (
    <div className="flex flex-col min-h-screen">
      <AppBar />

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-4 pb-12">
        <h1 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-3">
          {debate?.date
            ? `Ballot — ${debate.date}${debate.room ? `, Room ${debate.room}` : ''}`
            : 'Ballot'}
        </h1>

        {/* Compact metadata line */}
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-3 flex-wrap">
          {judge && <span>Judge: {judge.name}</span>}
          {judge && (debate?.date || debate?.room) && <span>·</span>}
          {debate?.date && <span>{debate.date}</span>}
          {debate?.date && debate?.room && <span>·</span>}
          {debate?.room && <span>Room {debate.room}</span>}
          {debate?.resolution && (
            <>
              <span>·</span>
              <span className="truncate">{debate.resolution}</span>
            </>
          )}
        </div>

        {/* Decision */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            {(['aff', 'neg'] as const).map((side) => (
              <span
                key={side}
                className={`inline-flex items-center px-4 py-2 border-2 rounded-xl font-semibold text-sm ${
                  ballot.winner === side
                    ? side === 'aff'
                      ? 'border-aff bg-aff-bg dark:border-aff-d dark:bg-aff-bg-d text-aff dark:text-aff-d'
                      : 'border-neg bg-neg-bg dark:border-neg-d dark:bg-neg-bg-d text-neg dark:text-neg-d'
                    : 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                }`}
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
                className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg mb-2 ${
                  side === 'aff'
                    ? 'bg-aff-bg dark:bg-aff-bg-d text-aff dark:text-aff-d'
                    : 'bg-neg-bg dark:bg-neg-bg-d text-neg dark:text-neg-d'
                }`}
              >
                {side === 'aff' ? 'Affirmative' : 'Negative'}
              </h2>
              {([`${side}1`, `${side}2`] as const).map((pos) => {
                const ev = evalsByPosition[pos];
                const total = scoringTotal(ev ?? {});
                return (
                  <div
                    key={pos}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 mb-3 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {POSITION_LABELS[pos]}
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
                    {ev?.notes && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-wrap">
                        {ev.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
