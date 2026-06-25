import { useEffect, useState } from 'react';
import { id, type TransactionChunk } from '@instantdb/react';
import { db } from '../db.ts';
import { navigate } from '../hooks/useHashRoute.ts';
import { PageHeader } from './PageHeader.tsx';
import { StudentPicker } from './StudentPicker.tsx';
import { JudgePicker } from './JudgePicker.tsx';

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

interface Props {
  debateId?: string | undefined;
}

export function AdminDebateForm({ debateId }: Props): React.JSX.Element {
  const isEditing = Boolean(debateId);
  const [form, setForm] = useState<DebateForm>(makeEmpty);
  const [initialized, setInitialized] = useState(!isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const { data: usersData } = db.useQuery({ $users: {} });
  const { data: debateData } = db.useQuery(
    debateId
      ? {
          debates: {
            $: { where: { id: debateId } },
            affTeam: {},
            negTeam: {},
            judges: {},
          },
        }
      : null,
  );

  const allUsers = usersData?.$users ?? [];
  const students = allUsers.filter((u) => u.role === 'student');
  const judges = allUsers.filter((u) => u.role === 'parent' || u.role === 'admin');

  useEffect(() => {
    if (initialized) return;
    const debate = debateData?.debates?.[0];
    if (!debate) return;
    const affTeam = debate.affTeam ?? [];
    const negTeam = debate.negTeam ?? [];
    setForm({
      debateId: debate.id,
      date: debate.date,
      room: debate.room,
      resolution: debate.resolution ?? '',
      aff1: affTeam[0]?.id ?? '',
      aff2: affTeam[1]?.id ?? '',
      neg1: negTeam[0]?.id ?? '',
      neg2: negTeam[1]?.id ?? '',
      judges: (debate.judges ?? []).map((j) => j.id),
    });
    setInitialized(true);
  }, [debateData, initialized]);

  function patch(p: Partial<DebateForm>): void {
    setForm((f) => ({ ...f, ...p }));
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
      navigate('admin');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (isEditing && !initialized) {
    return (
      <div className="flex flex-col min-h-screen">
        <PageHeader title="Edit Debate" onBack={() => navigate('admin')} />
        <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title={isEditing ? 'Edit Debate' : 'New Debate'}
        onBack={() => navigate('admin')}
      />

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 pb-12">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm flex flex-col gap-4">
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

          <div>
            <label htmlFor="debate-resolution">Resolution</label>
            <input
              id="debate-resolution"
              type="text"
              value={form.resolution}
              onChange={(e) => patch({ resolution: e.target.value })}
              placeholder="Resolved: …"
            />
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
            <JudgePicker
              value={form.judges}
              onChange={(j) => patch({ judges: j })}
              judges={judges}
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            className="px-5 py-2.5 bg-nf-blue dark:bg-nf-blue-d hover:bg-nf-blue-mid text-white font-semibold rounded-xl cursor-pointer disabled:opacity-50 transition-colors self-start"
            onClick={() => void save()}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save Debate'}
          </button>
        </div>
      </div>
    </div>
  );
}
