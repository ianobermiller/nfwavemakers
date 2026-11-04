import { deleteLesson } from '../data/lessons.ts';
import { useLessons } from '../hooks/data.ts';
import { navigate } from '@/hooks/useHashRoute.ts';
import { PageLayout } from '@/site/PageLayout.tsx';

export function AdminLessons(): React.JSX.Element {
  const lessons = useLessons();
  const isLoading = lessons === undefined;

  async function handleDelete(id: string, title: string): Promise<void> {
    if (!window.confirm(`Delete “${title}”? This cannot be undone.`)) return;
    await deleteLesson(id);
  }

  return (
    <PageLayout>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Manage Lessons</h1>
        <button
          className="cursor-pointer rounded-lg border-none bg-nf-blue px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-nf-blue-mid dark:bg-nf-blue-d"
          onClick={() => navigate('admin-lessons/new')}
          type="button"
        >
          + New
        </button>
      </div>
      {isLoading && <p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>}
      {!isLoading && lessons.length === 0 && (
        <p className="py-12 text-center text-sm text-slate-400 dark:text-slate-500">
          No lessons yet.
        </p>
      )}
      <div className="flex flex-col gap-3">
        {!isLoading &&
          lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
            >
              <button
                className="min-w-0 flex-1 cursor-pointer border-none bg-transparent p-0 text-left"
                onClick={() => navigate(`admin-lessons/${lesson.id}`)}
                type="button"
              >
                <span className="block text-xs font-bold tracking-wide text-nf-blue-mid uppercase">
                  Lesson {lesson.number} · {lesson.date}
                </span>
                <span className="mt-1 block font-bold text-slate-800 dark:text-slate-100">
                  {lesson.title}
                </span>
              </button>
              <button
                aria-label={`Delete ${lesson.title}`}
                className="shrink-0 cursor-pointer border-none bg-transparent px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:text-red-700 dark:text-red-400 dark:hover:text-red-200"
                onClick={() => void handleDelete(lesson.id, lesson.title)}
                type="button"
              >
                Delete
              </button>
            </div>
          ))}
      </div>
    </PageLayout>
  );
}
