import { db } from '../db.ts';
import { POSITIONS, POSITION_LABELS, SCORE_CATEGORIES } from '../types.ts';
import { navigate } from '../hooks/useHashRoute.ts';

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
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        <p className="text-slate-500 dark:text-slate-400 text-sm">Loading…</p>
      </div>
    );
  }

  const ballot = data?.ballots?.[0];
  if (!ballot) {
    return (
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        <p className="text-slate-500 dark:text-slate-400 text-sm">Ballot not found.</p>
      </div>
    );
  }
  if (!ballot.submittedAt) {
    return (
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        <p className="text-slate-500 dark:text-slate-400 text-sm">Ballot not yet submitted.</p>
      </div>
    );
  }

  const debate = ballot.debate;
  const judge = ballot.judge;
  const evals = ballot.speakerEvals ?? [];

  const isSpeaker = evals.some((e) => e.speaker?.id === currentUserId);
  if (!isSpeaker) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="bg-nf-blue dark:bg-slate-900 text-white h-14 flex items-center px-4 sticky top-0 z-10 shadow">
          <button
            className="text-white/80 hover:text-white cursor-pointer bg-transparent border-none text-sm"
            onClick={() => navigate('dashboard')}
          >
            ← Back
          </button>
        </div>
        <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
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
      <div className="bg-nf-blue dark:bg-slate-900 text-white h-14 flex items-center justify-between px-4 sticky top-0 z-10 shadow">
        <button
          className="text-white/80 hover:text-white cursor-pointer bg-transparent border-none text-sm"
          onClick={() => navigate('dashboard')}
        >
          ← Back
        </button>
        <span className="font-bold text-base">Ballot</span>
        <span className="w-16" />
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 pb-12">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 mb-4 flex flex-col gap-1 text-sm">
          <div>
            <strong>Judge:</strong> {judge?.name ?? '—'}
          </div>
          {debate && (
            <>
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
            </>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
            Decision
          </h2>
          <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
            <strong>Winner:</strong>{' '}
            {ballot.winner === 'aff' ? 'Affirmative' : ballot.winner === 'neg' ? 'Negative' : '—'}
          </p>
          {ballot.reasonForDecision && (
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Reason for Decision
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {ballot.reasonForDecision}
              </p>
            </div>
          )}
        </div>

        {(['aff', 'neg'] as const).map((side) => (
          <div key={side} className="mb-6">
            <h2
              className={`text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-lg mb-3 ${
                side === 'aff'
                  ? 'bg-aff-bg dark:bg-aff-bg-d text-aff dark:text-aff-d'
                  : 'bg-neg-bg dark:bg-neg-bg-d text-neg dark:text-neg-d'
              }`}
            >
              {side === 'aff' ? 'Affirmative' : 'Negative'}
            </h2>
            {([`${side}1`, `${side}2`] as const).map((pos) => {
              const ev = evalsByPosition[pos];
              if (!ev) return null;
              const total = SCORE_CATEGORIES.reduce((sum, c) => {
                const v = ev[c.key as keyof typeof ev];
                return sum + (typeof v === 'number' ? v : 0);
              }, 0);
              return (
                <div
                  key={pos}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-3 shadow-sm"
                >
                  <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100 mb-3">
                    {POSITION_LABELS[pos]} — {ev.speaker?.name ?? 'Unknown'}
                  </h3>
                  <div className="flex flex-col gap-1 mb-3">
                    {SCORE_CATEGORIES.map((cat) => {
                      const val = ev[cat.key as keyof typeof ev];
                      return (
                        <div
                          key={cat.key}
                          className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-700 text-sm last:border-b-0"
                        >
                          <span className="text-slate-500 dark:text-slate-400 text-xs">
                            {cat.label}
                          </span>
                          <span className="font-bold text-nf-blue dark:text-nf-blue-d min-w-6 text-right">
                            {typeof val === 'number' ? val : '—'}
                          </span>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between py-1 text-sm">
                      <span className="font-bold text-slate-700 dark:text-slate-200 text-xs">
                        Total
                      </span>
                      <span className="font-bold text-nf-blue dark:text-nf-blue-d min-w-6 text-right">
                        {total}
                      </span>
                    </div>
                  </div>
                  {ev.notes && (
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-lg px-3 py-2">
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
    </div>
  );
}
