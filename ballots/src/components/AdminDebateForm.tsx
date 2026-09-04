import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { convexId } from '../lib/convexId.ts';
import { navigate } from '../hooks/useHashRoute.ts';
import { PageLayout } from './PageLayout.tsx';
import { Input } from './ui/Input.tsx';
import { StudentPicker } from './StudentPicker.tsx';
import { JudgePicker } from './JudgePicker.tsx';

interface DebateForm {
  date: string;
  room: string;
  resolution: string;
  aff1: Id<'users'> | '';
  aff2: Id<'users'> | '';
  neg1: Id<'users'> | '';
  neg2: Id<'users'> | '';
  judges: Id<'users'>[];
}

function makeEmpty(): DebateForm {
  return {
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

interface LoadedDebate {
  date: string;
  room: string;
  resolution?: string;
  affTeam: { _id: Id<'users'> }[];
  negTeam: { _id: Id<'users'> }[];
  judges: { _id: Id<'users'> }[];
}

function debateToForm(debate: LoadedDebate): DebateForm {
  return {
    date: debate.date,
    room: debate.room,
    resolution: debate.resolution ?? '',
    aff1: debate.affTeam[0]?._id ?? '',
    aff2: debate.affTeam[1]?._id ?? '',
    neg1: debate.negTeam[0]?._id ?? '',
    neg2: debate.negTeam[1]?._id ?? '',
    judges: debate.judges.map((j) => j._id),
  };
}

interface Props {
  debateId?: Id<'debates'> | undefined;
}

export function AdminDebateForm({ debateId }: Props): React.JSX.Element {
  const debate = useQuery(api.debates.get, debateId ? { debateId } : 'skip');

  if (debateId && debate === undefined) {
    return (
      <PageLayout>
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
      </PageLayout>
    );
  }

  const initial = debateId && debate ? debateToForm(debate) : makeEmpty();

  return <AdminDebateFormEditor key={debateId ?? 'new'} debateId={debateId} initial={initial} />;
}

function AdminDebateFormEditor({
  debateId,
  initial,
}: {
  debateId?: Id<'debates'> | undefined;
  initial: DebateForm;
}): React.JSX.Element {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const users = useQuery(api.users.list) ?? [];
  const saveDebate = useMutation(api.debates.save);

  const students = users.filter((u) => u.role === 'student');
  const judges = users.filter((u) => u.role === 'parent' || u.role === 'admin');

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
      await saveDebate({
        ...(debateId ? { debateId } : {}),
        date: form.date,
        room: form.room,
        resolution: form.resolution,
        affTeam: [form.aff1, form.aff2].filter((id): id is Id<'users'> => id !== ''),
        negTeam: [form.neg1, form.neg2].filter((id): id is Id<'users'> => id !== ''),
        judges: form.judges,
      });
      navigate('admin');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const studentOptions = students.map((s) => ({
    id: s._id,
    name: s.name,
    avatarURLs: s.avatarUrl ?? undefined,
  }));
  const judgeOptions = judges.map((j) => ({ id: j._id, name: j.name }));
  const studentAvatarURLs = Object.fromEntries(
    students
      .filter((s): s is typeof s & { avatarUrl: string } => s.avatarUrl != null)
      .map((s) => [s._id, s.avatarUrl]),
  );

  return (
    <PageLayout>
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="debate-date">Date</label>
            <Input
              id="debate-date"
              type="date"
              value={form.date}
              onChange={(e) => patch({ date: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="debate-room">Room</label>
            <Input
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
          <Input
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
                  onChange={(v) => patch({ aff1: v ? convexId<'users'>(v) : '' })}
                  students={studentOptions}
                  avatarURLs={studentAvatarURLs}
                />
              </div>
              <div>
                <label htmlFor="aff2">2nd Speaker</label>
                <StudentPicker
                  id="aff2"
                  value={form.aff2}
                  onChange={(v) => patch({ aff2: v ? convexId<'users'>(v) : '' })}
                  students={studentOptions}
                  avatarURLs={studentAvatarURLs}
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
                  onChange={(v) => patch({ neg1: v ? convexId<'users'>(v) : '' })}
                  students={studentOptions}
                  avatarURLs={studentAvatarURLs}
                />
              </div>
              <div>
                <label htmlFor="neg2">2nd Speaker</label>
                <StudentPicker
                  id="neg2"
                  value={form.neg2}
                  onChange={(v) => patch({ neg2: v ? convexId<'users'>(v) : '' })}
                  students={studentOptions}
                  avatarURLs={studentAvatarURLs}
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <label>Judges</label>
          <JudgePicker
            value={form.judges}
            onChange={(j) => patch({ judges: j.map((id) => convexId<'users'>(id)) })}
            judges={judgeOptions}
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
    </PageLayout>
  );
}
