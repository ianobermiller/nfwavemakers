import { useState } from 'react';
import { id, type TransactionChunk } from '@instantdb/react';
import { db } from '../db.ts';
import { navigate } from '../hooks/useHashRoute.ts';
import { PageHeader } from './PageHeader.tsx';
import { StudentPicker } from './StudentPicker.tsx';
import { formatTeam } from '../utils.ts';

interface DebateForm {
  debateId: string;
  date: string;
  room: string;
  resolution: string;
  aff1: string;
  aff2: string;
  neg1: string;
  neg2: string;
  judges: string[];
}

function makeEmpty(): DebateForm {
  return {
    debateId: id(),
    date: '',
    room: '',
    resolution: '',
    aff1: '',
    aff2: '',
    neg1: '',
    neg2: '',
    judges: [],
  };
}

export function AdminDebates(): React.JSX.Element {
  const [form, setForm] = useState<DebateForm>(makeEmpty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { data: usersData } = db.useQuery({ $users: {} });
  const { data: debatesData, isLoading } = db.useQuery({
    debates: {
      $: { order: { serverCreatedAt: 'desc' } },
      affTeam: {},
      negTeam: {},
      judges: {},
    },
  });

  const allUsers = usersData?.$users ?? [];
  const students = allUsers.filter((u) => u.role === 'student');
  const parents = allUsers.filter((u) => u.role === 'parent' || u.role === 'admin');
  const debates = debatesData?.debates ?? [];

  function patch(p: Partial<DebateForm>): void {
    setForm((f) => ({ ...f, ...p }));
  }

  function toggleJudge(judgeId: string): void {
    setForm((f) => ({
      ...f,
      judges: f.judges.includes(judgeId)
        ? f.judges.filter((j) => j !== judgeId)
        : [...f.judges, judgeId],
    }));
  }

  function loadDebate(debate: (typeof debates)[number]): void {
    const affTeam = debate.affTeam ?? [];
    const negTeam = debate.negTeam ?? [];
    const judgesList = debate.judges ?? [];
    setForm({
      debateId: debate.id,
      date: debate.date,
      room: debate.room,
      resolution: debate.resolution ?? '',
      aff1: affTeam[0]?.id ?? '',
      aff2: affTeam[1]?.id ?? '',
      neg1: negTeam[0]?.id ?? '',
      neg2: negTeam[1]?.id ?? '',
      judges: judgesList.map((j) => j.id),
    });
  }

  async function save(): Promise<void> {
    if (!form.date || !form.room) {
      setError('Date and room are required.');
      return;
    }
    setSaving(true);
    setError('');

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const txs: TransactionChunk<any, any>[] = [
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        db.tx.debates[form.debateId]!.update({
          date: form.date,
          room: form.room,
          resolution: form.resolution || null,
        }),
      ];

      const affTeamMembers = [form.aff1, form.aff2].filter(Boolean);
      const negTeamMembers = [form.neg1, form.neg2].filter(Boolean);

      if (affTeamMembers.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        txs.push(db.tx.debates[form.debateId]!.link({ affTeam: affTeamMembers }));
      }
      if (negTeamMembers.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        txs.push(db.tx.debates[form.debateId]!.link({ negTeam: negTeamMembers }));
      }
      if (form.judges.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        txs.push(db.tx.debates[form.debateId]!.link({ judges: form.judges }));
      }

      await db.transact(txs);
      setForm(makeEmpty());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const isEditing = debates.some((d) => d.id === form.debateId);

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Manage Debates" onBack={() => navigate('dashboard')} />

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 pb-12">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 mb-6 shadow-sm flex flex-col gap-4">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
            {isEditing ? 'Edit Debate' : 'New Debate'}
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="debate-date">Date</label>
              <input
                id="debate-date"
                type="date"
                value={form.date}
                onChange={(e) => patch({ date: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="debate-room">Room</label>
              <input
                id="debate-room"
                type="text"
                value={form.room}
                onChange={(e) => patch({ room: e.target.value })}
                placeholder="Room 101"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-aff-bg dark:bg-aff-bg-d text-aff dark:text-aff-d mb-3">
                Affirmative Team
              </div>
              <div className="flex flex-col gap-2">
                <div>
                  <label htmlFor="aff1">1st Speaker</label>
                  <StudentPicker
                    id="aff1"
                    value={form.aff1}
                    onChange={(v) => patch({ aff1: v })}
                    students={students}
                  />
                </div>
                <div>
                  <label htmlFor="aff2">2nd Speaker</label>
                  <StudentPicker
                    id="aff2"
                    value={form.aff2}
                    onChange={(v) => patch({ aff2: v })}
                    students={students}
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-neg-bg dark:bg-neg-bg-d text-neg dark:text-neg-d mb-3">
                Negative Team
              </div>
              <div className="flex flex-col gap-2">
                <div>
                  <label htmlFor="neg1">1st Speaker</label>
                  <StudentPicker
                    id="neg1"
                    value={form.neg1}
                    onChange={(v) => patch({ neg1: v })}
                    students={students}
                  />
                </div>
                <div>
                  <label htmlFor="neg2">2nd Speaker</label>
                  <StudentPicker
                    id="neg2"
                    value={form.neg2}
                    onChange={(v) => patch({ neg2: v })}
                    students={students}
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label>Judges</label>
            {parents.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500">No parent accounts yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {parents.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-3 px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <input
                      type="checkbox"
                      className="w-auto cursor-pointer accent-nf-blue"
                      checked={form.judges.includes(p.id)}
                      onChange={() => toggleJudge(p.id)}
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-200">
                      {p.name ?? p.id}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex items-center gap-3">
            <button
              className="px-5 py-2.5 bg-nf-blue dark:bg-nf-blue-d hover:bg-nf-blue-mid text-white font-semibold rounded-xl cursor-pointer disabled:opacity-50 transition-colors"
              onClick={() => void save()}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save Debate'}
            </button>
            {isEditing && (
              <button
                className="text-sm text-nf-accent underline cursor-pointer bg-transparent border-none"
                onClick={() => setForm(makeEmpty())}
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        <section>
          <h2 className="text-base font-bold text-slate-700 dark:text-slate-300 mb-3">Debates</h2>
          {isLoading && (
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
          )}
          {!isLoading && debates.length === 0 && (
            <p className="text-center py-12 text-slate-400 dark:text-slate-500 text-sm">
              No debates yet.
            </p>
          )}
          <div className="flex flex-col gap-3">
            {debates.map((d) => (
              <div
                key={d.id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {d.date}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Room {d.room}</span>
                  {d.resolution && (
                    <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
                      {d.resolution}
                    </span>
                  )}
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="text-aff dark:text-aff-d font-semibold">{formatTeam(d.affTeam ?? [])}</span>
                    <span className="text-slate-400 dark:text-slate-500 mx-1">vs</span>
                    <span className="text-neg dark:text-neg-d font-semibold">{formatTeam(d.negTeam ?? [])}</span>
                  </span>
                </div>
                <button
                  className="shrink-0 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-lg cursor-pointer border border-slate-200 dark:border-slate-600 transition-colors"
                  onClick={() => loadDebate(d)}
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
