import { db } from '../db.ts';
import { navigate } from '../hooks/useHashRoute.ts';
import type { Role } from '../types.ts';

interface Props {
  userId: string;
  role: Role;
  name: string;
}

export function Dashboard({ userId, role, name }: Props): React.JSX.Element {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="bg-nf-blue dark:bg-slate-900 text-white h-14 flex items-center justify-between px-4 sticky top-0 z-10 shadow">
        <span className="font-bold text-base">NF Wavemakers Ballots</span>
        <button
          className="text-white/80 hover:text-white text-sm cursor-pointer bg-transparent border-none underline"
          onClick={() => db.auth.signOut()}
        >
          Sign out
        </button>
      </div>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 pb-20">
        <h1 className="text-2xl font-bold mb-6">Hello, {name}!</h1>
        {role === 'parent' && <ParentDashboard userId={userId} />}
        {role === 'student' && <StudentDashboard userId={userId} />}
        {role === 'admin' && <AdminDashboard />}
      </div>
    </div>
  );
}

function ParentDashboard({ userId }: { userId: string }): React.JSX.Element {
  const { data, isLoading } = db.useQuery({
    debates: {
      $: { where: { 'judges.id': userId } },
    },
    ballots: {
      $: { where: { 'judge.id': userId } },
      debate: {},
    },
  });

  const debates = data?.debates ?? [];
  const submittedBallots = (data?.ballots ?? []).filter((b) => b.submittedAt != null);

  return (
    <div className="flex flex-col gap-6">
      <button
        className="w-full py-4 bg-nf-blue dark:bg-nf-blue-d hover:bg-nf-blue-mid text-white font-bold text-lg rounded-xl cursor-pointer transition-colors"
        onClick={() => navigate('judge')}
      >
        Judge a Round
      </button>

      {!isLoading && debates.length > 0 && (
        <section>
          <h2 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-3">
            Assigned Debates
          </h2>
          <div className="flex flex-col gap-3">
            {debates.map((d) => (
              <div
                key={d.id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {d.date}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Room {d.room}</span>
                  {d.resolution && (
                    <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
                      {d.resolution}
                    </span>
                  )}
                </div>
                <button
                  className="shrink-0 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-lg cursor-pointer border border-slate-200 dark:border-slate-600 transition-colors"
                  onClick={() => navigate(`judge/${d.id}`)}
                >
                  Fill Ballot
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {!isLoading && submittedBallots.length > 0 && (
        <section>
          <h2 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-3">
            Submitted Ballots
          </h2>
          <div className="flex flex-col gap-3">
            {submittedBallots.map((b) => {
              const displayDate = b.debate?.date ?? (b.submittedAt != null ? new Date(b.submittedAt).toLocaleDateString() : '—');
              return (
                <button
                  key={b.id}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex flex-col gap-1 text-left cursor-pointer hover:border-nf-accent hover:shadow-sm transition-all"
                  onClick={() => navigate(`ballot/${b.id}`)}
                >
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {displayDate}
                  </span>
                  {b.debate?.room && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Room {b.debate.room}
                    </span>
                  )}
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {b.winner === 'aff' ? 'Affirmative wins' : b.winner === 'neg' ? 'Negative wins' : '—'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function StudentDashboard({ userId }: { userId: string }): React.JSX.Element {
  const { data, isLoading } = db.useQuery({
    speakerEvals: {
      $: { where: { 'speaker.id': userId } },
      ballot: {
        debate: {},
        judge: {},
      },
    },
  });

  const evals = (data?.speakerEvals ?? []).filter((e) => e.ballot?.submittedAt != null);

  // Group by debateId when available, fall back to ballotId so standalone ballots still appear.
  const byGroup = new Map<string, typeof evals>();
  for (const e of evals) {
    const key = e.ballot?.debate?.id ?? e.ballot?.id;
    if (!key) continue;
    const arr = byGroup.get(key) ?? [];
    arr.push(e);
    byGroup.set(key, arr);
  }

  return (
    <div>
      <h2 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-3">My Feedback</h2>
      {isLoading && <p className="text-slate-500 dark:text-slate-400 text-sm">Loading…</p>}
      {!isLoading && byGroup.size === 0 && (
        <p className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
          No submitted ballots yet.
        </p>
      )}
      <div className="flex flex-col gap-3">
        {[...byGroup.entries()].map(([groupKey, evs]) => {
          const ballot = evs[0]?.ballot;
          const debate = ballot?.debate;
          const displayDate = debate?.date ?? (ballot?.submittedAt != null ? new Date(ballot.submittedAt).toLocaleDateString() : '—');
          const viewRoute = debate?.id ? `debate/${debate.id}` : `ballot/${ballot?.id}`;
          // Dedupe judges across multiple speakerEvals for the same ballot.
          const judgeNames = [...new Set(evs.map((ev) => ev.ballot?.judge?.name).filter(Boolean))];
          return (
            <button
              key={groupKey}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex flex-col gap-1 text-left cursor-pointer hover:border-nf-accent hover:shadow-sm transition-all"
              onClick={() => navigate(viewRoute)}
            >
              <strong className="text-sm text-slate-800 dark:text-slate-100">
                {displayDate}
                {debate?.room && (
                  <span className="font-normal text-slate-500 dark:text-slate-400 ml-2">
                    · Room {debate.room}
                  </span>
                )}
              </strong>
              {judgeNames.map((name) => (
                <span key={name} className="text-xs text-slate-500 dark:text-slate-400 italic">
                  Judge: {name}
                </span>
              ))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AdminDashboard(): React.JSX.Element {
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 text-left cursor-pointer hover:border-nf-accent hover:shadow-md transition-all"
          onClick={() => navigate('admin')}
        >
          <h2 className="font-bold text-base text-slate-800 dark:text-slate-100 mb-1">
            Manage Debates
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create and edit debates, assign students and judges.
          </p>
        </button>
      </div>
    </div>
  );
}
