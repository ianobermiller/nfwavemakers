import { useState } from 'react';
import { errorMessage } from '../data/pocketbase.ts';
import { saveLesson } from '../data/lessons.ts';
import type { Lesson } from '../data/model.ts';
import { useLesson } from '../hooks/data.ts';
import { navigate } from '@/hooks/useHashRoute.ts';
import { PageLayout } from '@/site/PageLayout.tsx';
import { Input } from './ui/Input.tsx';
import { Textarea } from './ui/Textarea.tsx';

interface LessonForm {
  year: string;
  number: string;
  title: string;
  date: string;
  body: string;
}

function makeEmpty(): LessonForm {
  const now = new Date();
  const seasonYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    year: String(seasonYear),
    number: '',
    title: '',
    date: '',
    body: '',
  };
}

function lessonToForm(lesson: Lesson): LessonForm {
  return {
    year: String(lesson.year),
    number: String(lesson.number),
    title: lesson.title,
    date: lesson.date,
    body: lesson.body,
  };
}

interface Props {
  lessonId?: string | undefined;
}

export function AdminLessonForm({ lessonId }: Props): React.JSX.Element {
  const lesson = useLesson(lessonId);

  if (lessonId && lesson === undefined) {
    return (
      <PageLayout>
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>
      </PageLayout>
    );
  }

  if (lessonId && lesson === null) {
    return (
      <PageLayout>
        <p className="text-sm text-red-600">Lesson not found.</p>
      </PageLayout>
    );
  }

  const initial = lessonId && lesson ? lessonToForm(lesson) : makeEmpty();
  return <AdminLessonFormEditor key={lessonId ?? 'new'} lessonId={lessonId} initial={initial} />;
}

function AdminLessonFormEditor({
  lessonId,
  initial,
}: {
  lessonId?: string | undefined;
  initial: LessonForm;
}): React.JSX.Element {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function update(field: keyof LessonForm, value: string): void {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(): Promise<void> {
    const year = Number(form.year);
    const number = Number(form.number);
    if (!Number.isFinite(year) || !Number.isFinite(number) || number < 1) {
      setError('Year and lesson number are required.');
      return;
    }
    if (!form.title.trim() || !form.date || !form.body.trim()) {
      setError('Title, date, and body are required.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
      setError('Date must be YYYY-MM-DD.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await saveLesson({
        ...(lessonId ? { id: lessonId } : {}),
        year,
        number,
        title: form.title,
        date: form.date,
        body: form.body,
      });
      navigate('admin-lessons');
    } catch (err: unknown) {
      setError(errorMessage(err, 'Could not save the lesson'));
      setSaving(false);
    }
  }

  return (
    <PageLayout>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          {lessonId ? 'Edit lesson' : 'New lesson'}
        </h1>
        <button
          className="cursor-pointer border-none bg-transparent text-sm font-medium text-nf-blue-mid"
          onClick={() => navigate('admin-lessons')}
          type="button"
        >
          Cancel
        </button>
      </div>

      <form
        className="flex max-w-3xl flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label htmlFor="lesson-year">Season year</label>
            <Input
              id="lesson-year"
              inputMode="numeric"
              onChange={(event) => update('year', event.target.value)}
              required
              value={form.year}
            />
          </div>
          <div>
            <label htmlFor="lesson-number">Number</label>
            <Input
              id="lesson-number"
              inputMode="numeric"
              onChange={(event) => update('number', event.target.value)}
              required
              value={form.number}
            />
          </div>
          <div className="col-span-2">
            <label htmlFor="lesson-date">Date</label>
            <Input
              id="lesson-date"
              onChange={(event) => update('date', event.target.value)}
              placeholder="YYYY-MM-DD"
              required
              type="date"
              value={form.date}
            />
          </div>
        </div>

        <div>
          <label htmlFor="lesson-title">Title</label>
          <Input
            id="lesson-title"
            onChange={(event) => update('title', event.target.value)}
            required
            value={form.title}
          />
        </div>

        <div>
          <label htmlFor="lesson-body">Body (markdown)</label>
          <Textarea
            className="min-h-80 font-mono text-xs leading-relaxed"
            id="lesson-body"
            onChange={(event) => update('body', event.target.value)}
            required
            spellCheck
            value={form.body}
          />
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Use <code>### Speech: …</code> and <code>### Debate: …</code> for section badges.
            Headings that include “homework” get the homework callout.
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <button
          className="cursor-pointer rounded-xl border-none bg-nf-blue px-4 py-3 font-semibold text-white transition-colors enabled:hover:bg-nf-blue-mid disabled:cursor-not-allowed disabled:opacity-50 dark:bg-nf-blue-d"
          disabled={saving}
          type="submit"
        >
          {saving ? 'Saving…' : 'Save lesson'}
        </button>
      </form>
    </PageLayout>
  );
}
