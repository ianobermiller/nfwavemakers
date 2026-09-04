import { cn } from 'cnfast';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { POSITIONS, POSITION_LABELS } from '../types.ts';
import { formatSpeakerName } from '../utils.ts';
import { PageLayout } from './PageLayout.tsx';
import { ScoringRows } from './ScoringRows.tsx';
import { SpeakerNotes } from './SpeakerNotes.tsx';

interface Props {
  debateId: Id<'debates'>;
  currentUserId: Id<'users'>;
}

export function DebateView({ debateId, currentUserId }: Props): React.JSX.Element {
  const data = useQuery(api.ballots.debateDetail, { debateId });
  const isLoading = data === undefined;

  if (isLoading) {
    return (
      <PageLayout>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Loading…</p>
      </PageLayout>
    );
  }

  const debate = data?.debate;
  if (!debate) {
    return (
      <PageLayout>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Debate not found.</p>
      </PageLayout>
    );
  }

  const affIds = debate.affTeam.map((u) => u._id);
  const negIds = debate.negTeam.map((u) => u._id);
  const isMember = affIds.includes(currentUserId) || negIds.includes(currentUserId);
  if (!isMember) {
    return (
      <PageLayout>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          You don't have access to this debate.
        </p>
      </PageLayout>
    );
  }

  const ballots = data.ballots;

  return (
    <PageLayout>
      <h1 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-3">
        {debate.date ? `Debate — ${debate.date}, Room ${debate.room}` : 'Debate'}
      </h1>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 mb-6 flex flex-col gap-1 text-sm">
        <div>
          <strong>Date:</strong> {debate.date}
        </div>
        <div>
          <strong>Room:</strong> {debate.room}
        </div>
        {debate.resolution && (
          <div>
            <strong>Resolution:</strong> {debate.resolution}
          </div>
        )}
      </div>

      {ballots.length === 0 && (
        <p className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
          No submitted ballots yet.
        </p>
      )}

      {ballots.map((ballot) => {
        const evals = ballot.speakerEvals;
        const evalsByPos = Object.fromEntries(
          POSITIONS.map((pos) => [pos, evals.find((e) => e.position === pos)]),
        );
        return (
          <div
            key={ballot._id}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 mb-5 shadow-sm"
          >
            <h2 className="font-bold text-base text-slate-800 dark:text-slate-100 mb-1">
              Judge: {ballot.judge?.name ?? '—'}
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
              Winner:{' '}
              {ballot.winner === 'aff' ? 'Affirmative' : ballot.winner === 'neg' ? 'Negative' : '—'}
            </p>

            {ballot.reasonForDecision && (
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 whitespace-pre-wrap">
                {ballot.reasonForDecision}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(['aff', 'neg'] as const).map((side) => (
                <div key={side}>
                  <h3
                    className={cn(
                      'text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg mb-2',
                      side === 'aff'
                        ? 'bg-aff-bg dark:bg-aff-bg-d text-aff dark:text-aff-d'
                        : 'bg-neg-bg dark:bg-neg-bg-d text-neg dark:text-neg-d',
                    )}
                  >
                    {side === 'aff' ? 'Affirmative' : 'Negative'}
                  </h3>
                  {([`${side}1`, `${side}2`] as const).map((pos) => {
                    const ev = evalsByPos[pos];
                    return (
                      <div
                        key={pos}
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-lg px-3 py-2 mb-2"
                      >
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                          {POSITION_LABELS[pos]}
                          {ev?.speaker?.name && (
                            <span className="ml-2 font-normal">
                              {formatSpeakerName(ev.speaker.name)}
                            </span>
                          )}
                        </p>
                        <ScoringRows scores={ev ?? {}} />
                        {ev?.notes && <SpeakerNotes notes={ev.notes} />}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </PageLayout>
  );
}
