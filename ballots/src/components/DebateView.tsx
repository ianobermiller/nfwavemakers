import { db } from '../db.ts';
import { POSITIONS, POSITION_LABELS } from '../types.ts';
import { formatSpeakerName } from '../utils.ts';
import { AppBar } from './AppBar.tsx';
import { ScoringRows } from './ScoringRows.tsx';

interface Props {
  debateId: string;
  currentUserId: string;
}

export function DebateView({ debateId, currentUserId }: Props): React.JSX.Element {
  const { data, isLoading } = db.useQuery({
    debates: {
      $: { where: { id: debateId } },
      affTeam: {},
      negTeam: {},
      ballots: {
        judge: {},
        speakerEvals: { speaker: {} },
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

  const debate = data?.debates?.[0];
  if (!debate) {
    return (
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        <p className="text-slate-500 dark:text-slate-400 text-sm">Debate not found.</p>
      </div>
    );
  }

  const affIds = (debate.affTeam ?? []).map((u) => u.id);
  const negIds = (debate.negTeam ?? []).map((u) => u.id);
  const isMember = affIds.includes(currentUserId) || negIds.includes(currentUserId);
  if (!isMember) {
    return (
      <div className="flex flex-col min-h-screen">
        <AppBar />
        <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            You don't have access to this debate.
          </p>
        </div>
      </div>
    );
  }

  const ballots = (debate.ballots ?? []).filter((b) => b.submittedAt != null);

  return (
    <div className="flex flex-col min-h-screen">
      <AppBar />

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 pb-12">
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
          const evals = ballot.speakerEvals ?? [];
          const evalsByPos = Object.fromEntries(
            POSITIONS.map((pos) => [pos, evals.find((e) => e.position === pos)]),
          );
          return (
            <div
              key={ballot.id}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 mb-5 shadow-sm"
            >
              <h2 className="font-bold text-base text-slate-800 dark:text-slate-100 mb-1">
                Judge: {ballot.judge?.name ?? '—'}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">
                <strong>Winner:</strong>{' '}
                {ballot.winner === 'aff'
                  ? 'Affirmative'
                  : ballot.winner === 'neg'
                    ? 'Negative'
                    : '—'}
              </p>
              {ballot.reasonForDecision && (
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 whitespace-pre-wrap">
                  <strong>Reason:</strong> {ballot.reasonForDecision}
                </p>
              )}

              {(['aff', 'neg'] as const).map((side) => (
                <div key={side} className="mb-4">
                  <h3
                    className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg mb-3 ${
                      side === 'aff'
                        ? 'bg-aff-bg dark:bg-aff-bg-d text-aff dark:text-aff-d'
                        : 'bg-neg-bg dark:bg-neg-bg-d text-neg dark:text-neg-d'
                    }`}
                  >
                    {side === 'aff' ? 'Affirmative' : 'Negative'}
                  </h3>
                  {([`${side}1`, `${side}2`] as const).map((pos) => {
                    const ev = evalsByPos[pos];
                    if (!ev) return null;
                    return (
                      <div
                        key={pos}
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl p-4 mb-3"
                      >
                        <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100 mb-3">
                          {POSITION_LABELS[pos]} —{' '}
                          {ev.speaker?.name ? formatSpeakerName(ev.speaker.name) : 'Unknown'}
                        </h4>
                        <div className="flex flex-col gap-1 mb-3">
                          <ScoringRows scores={ev} showTotal />
                        </div>
                        {ev.notes && (
                          <div className="bg-white dark:bg-slate-800 rounded-lg px-3 py-2">
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                              Notes
                            </p>
                            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                              {ev.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
