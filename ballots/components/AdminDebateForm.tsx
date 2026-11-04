import { useState } from 'react';
import { cn } from 'cnfast';
import { saveDebate } from '../data/api.ts';
import type { Debate } from '../data/model.ts';
import { useDebate, useUsers } from '../hooks/data.ts';
import { nextTuesdayDate } from '../lib/dates.ts';
import { assignSpeaker, debatePartnerId, type SpeakerSlot } from '../lib/debatePartners.ts';
import { isPickerEligible } from '../lib/pickerUsers.ts';
import { DEBATE_EVENT_LABELS, studentMatchesDebateEvent, type DebateEvent } from '../types.ts';
import { navigate } from '@/hooks/useHashRoute.ts';
import { BackLink } from './BackLink.tsx';
import { PageLayout } from '@/site/PageLayout.tsx';
import { Input } from './ui/Input.tsx';
import { StudentPicker } from './StudentPicker.tsx';
import { JudgePicker } from './JudgePicker.tsx';

interface DebateForm {
  date: string;
  event: DebateEvent;
  room: string;
  aff1: string;
  aff2: string;
  neg1: string;
  neg2: string;
  judges: string[];
}

function makeEmpty(): DebateForm {
  return {
    date: nextTuesdayDate(),
    event: 'tp',
    room: '',
    aff1: '',
    aff2: '',
    neg1: '',
    neg2: '',
    judges: [],
  };
}

function debateToForm(debate: Debate): DebateForm {
  return {
    date: debate.date,
    event: debate.event,
    room: debate.room,
    aff1: debate.affTeam[0]?.id ?? '',
    aff2: debate.affTeam[1]?.id ?? '',
    neg1: debate.negTeam[0]?.id ?? '',
    neg2: debate.negTeam[1]?.id ?? '',
    judges: debate.judges.map((judge) => judge.id),
  };
}

interface Props {
  debateId?: string | undefined;
}

export function AdminDebateForm({ debateId }: Props): React.JSX.Element {
  const debateLive = useDebate(debateId);
  const usersLive = useUsers(true);
  const debate = debateLive.read();
  usersLive.read();

  const initial = debateId && debate ? debateToForm(debate) : makeEmpty();

  return <AdminDebateFormEditor key={debateId ?? 'new'} debateId={debateId} initial={initial} />;
}

function AdminDebateFormEditor({
  debateId,
  initial,
}: {
  debateId?: string | undefined;
  initial: DebateForm;
}): React.JSX.Element {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const users = useUsers(true).read();
  const isLd = form.event === 'ld';

  const selectedIds = [form.aff1, form.aff2, form.neg1, form.neg2, ...form.judges];
  const students = users.filter(
    (u) =>
      u.role === 'student' &&
      isPickerEligible(u, selectedIds) &&
      // Keep an already-assigned speaker visible even if their category changed.
      (selectedIds.includes(u.id) || studentMatchesDebateEvent(u.category, form.event)),
  );
  const judges = users.filter(
    (u) => (u.role === 'parent' || u.role === 'admin') && isPickerEligible(u, selectedIds),
  );

  function patch(p: Partial<DebateForm>): void {
    setForm((f) => ({ ...f, ...p }));
  }

  function setEvent(event: DebateEvent): void {
    setForm((current) => {
      if (current.event === event) return current;
      if (event === 'ld') {
        // LD has one seat per side; drop second speakers instead of inventing partners.
        return { ...current, event, aff2: '', neg2: '' };
      }
      return { ...current, event };
    });
  }

  function onSpeaker(slot: SpeakerSlot, studentId: string): void {
    setForm((current) => {
      if (current.event === 'ld') {
        return { ...current, [slot]: studentId };
      }
      return assignSpeaker(
        current,
        slot,
        studentId,
        (id) => debatePartnerId(users, id),
        current.judges,
      );
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
      const affTeam =
        form.event === 'ld' ? [form.aff1].filter(Boolean) : [form.aff1, form.aff2].filter(Boolean);
      const negTeam =
        form.event === 'ld' ? [form.neg1].filter(Boolean) : [form.neg1, form.neg2].filter(Boolean);
      await saveDebate({
        ...(debateId ? { debateId } : {}),
        date: form.date,
        event: form.event,
        room: form.room,
        affTeam,
        negTeam,
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
    id: s.id,
    name: s.name,
    avatarURLs: s.avatarUrl ?? undefined,
  }));
  const judgeOptions = judges.map((judge) => ({ id: judge.id, name: judge.name }));
  const studentAvatarURLs = Object.fromEntries(
    students
      .filter((s): s is typeof s & { avatarUrl: string } => s.avatarUrl != null)
      .map((student) => [student.id, student.avatarUrl]),
  );

  return (
    <PageLayout>
      <BackLink to="admin" label="Manage Debates" />
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

        <fieldset className="border-none p-0 m-0">
          <legend className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
            Event
          </legend>
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            {(['tp', 'ld'] as const).map((event) => (
              <label
                key={event}
                className={cn(
                  'inline-flex w-full items-center justify-center gap-2 px-4 py-3 border-2 rounded-xl cursor-pointer font-semibold text-sm transition-colors sm:w-auto sm:py-2',
                  form.event === event
                    ? 'border-nf-blue bg-nf-blue/10 dark:border-nf-blue-d dark:bg-nf-blue-d/20 text-nf-blue dark:text-nf-blue-d'
                    : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-300',
                )}
              >
                <input
                  className="sr-only"
                  type="radio"
                  name="debate-event"
                  value={event}
                  checked={form.event === event}
                  onChange={() => setEvent(event)}
                />
                {DEBATE_EVENT_LABELS[event]}
              </label>
            ))}
          </div>
        </fieldset>

        {isLd ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Lincoln-Douglas is one debater on each side. Partners are not filled in. Searches list
            Lincoln-Douglas students only.
          </p>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Choosing a student fills an open seat on that team with their debate partner. Either
            speaker can still be changed. Searches list Team Policy students only.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-aff-bg dark:bg-aff-bg-d text-aff dark:text-aff-d mb-3">
              {isLd ? 'Affirmative' : 'Affirmative Team'}
            </div>
            <div className="flex flex-col gap-2">
              <div>
                <label htmlFor="aff1">{isLd ? 'Debater' : '1st Speaker'}</label>
                <StudentPicker
                  id="aff1"
                  value={form.aff1}
                  onChange={(value) => onSpeaker('aff1', value)}
                  students={studentOptions}
                  avatarURLs={studentAvatarURLs}
                />
              </div>
              {!isLd && (
                <div>
                  <label htmlFor="aff2">2nd Speaker</label>
                  <StudentPicker
                    id="aff2"
                    value={form.aff2}
                    onChange={(value) => onSpeaker('aff2', value)}
                    students={studentOptions}
                    avatarURLs={studentAvatarURLs}
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-neg-bg dark:bg-neg-bg-d text-neg dark:text-neg-d mb-3">
              {isLd ? 'Negative' : 'Negative Team'}
            </div>
            <div className="flex flex-col gap-2">
              <div>
                <label htmlFor="neg1">{isLd ? 'Debater' : '1st Speaker'}</label>
                <StudentPicker
                  id="neg1"
                  value={form.neg1}
                  onChange={(value) => onSpeaker('neg1', value)}
                  students={studentOptions}
                  avatarURLs={studentAvatarURLs}
                />
              </div>
              {!isLd && (
                <div>
                  <label htmlFor="neg2">2nd Speaker</label>
                  <StudentPicker
                    id="neg2"
                    value={form.neg2}
                    onChange={(value) => onSpeaker('neg2', value)}
                    students={studentOptions}
                    avatarURLs={studentAvatarURLs}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <label>Judges</label>
          <JudgePicker
            value={form.judges}
            onChange={(judges) => patch({ judges })}
            judges={judgeOptions}
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          className="px-5 py-2.5 bg-nf-blue dark:bg-nf-blue-d enabled:hover:bg-nf-blue-mid text-white font-semibold rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-start"
          onClick={() => void save()}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save Debate'}
        </button>
      </div>
    </PageLayout>
  );
}
