import { useEffect } from 'react';
import { deleteLesson } from '../../ballots/data/lessons.ts';
import { useLessons } from '../../ballots/hooks/data.ts';
import { useAppUser } from '../../ballots/hooks/auth.tsx';
import { navigate } from '../hooks/useHashRoute.ts';
import { SiteLayout } from './SiteLayout.tsx';

export function LessonsIndex(): React.JSX.Element {
  const lessons = useLessons();
  const user = useAppUser();

  useEffect(() => {
    document.title = 'Lessons — North Florida Wavemakers';
  }, []);

  const isAdmin = user?.role === 'admin';

  async function handleDelete(id: string, title: string): Promise<void> {
    if (!window.confirm(`Delete “${title}”? This cannot be undone.`)) return;
    await deleteLesson(id);
  }

  return (
    <SiteLayout current="lessons">
      <div className="bg-gradient-to-br from-nf-blue to-nf-blue-mid px-5 py-14 text-center text-white">
        <h1 className="text-4xl font-extrabold tracking-tight">Lessons</h1>
        <p className="mx-auto mt-3 max-w-xl text-balance text-sky-100">
          Topics and homework from club.
        </p>
        {isAdmin && (
          <p className="mt-4">
            <a
              href="/lessons/new"
              className="inline-flex cursor-pointer rounded-lg border border-white/40 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white no-underline hover:bg-white/20 hover:no-underline"
              onClick={(event) => {
                event.preventDefault();
                navigate('lessons/new');
              }}
            >
              + New lesson
            </a>
          </p>
        )}
      </div>

      <section className="px-5 py-16">
        <div className="mx-auto max-w-5xl">
          {lessons === undefined && (
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading lessons…</p>
          )}
          {lessons !== undefined && lessons.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">No lessons published yet.</p>
          )}
          {lessons !== undefined && lessons.length > 0 && (
            <>
              {[...new Set(lessons.map((lesson) => lesson.year))].map((year) => {
                const forYear = lessons.filter((lesson) => lesson.year === year);
                const seasonLabel = `${year}–${String(year + 1).slice(2)}`;
                return (
                  <div key={year} className="mb-10 last:mb-0">
                    <h2 className="mb-6 text-3xl font-bold text-nf-blue dark:text-white">
                      {seasonLabel}
                    </h2>
                    <div className="grid max-w-3xl gap-3">
                      {forYear.map((lesson) => (
                        <div
                          key={lesson.id}
                          className="flex items-stretch gap-2 rounded-lg border-l-4 border-nf-accent bg-white shadow-sm dark:bg-slate-800"
                        >
                          <a
                            className="min-w-0 flex-1 px-5 py-4 no-underline hover:no-underline"
                            href={`/lessons/${lesson.slug}`}
                            onClick={(event) => {
                              event.preventDefault();
                              navigate(`lessons/${lesson.slug}`);
                            }}
                          >
                            <span className="block text-xs font-bold tracking-wide text-nf-blue-mid uppercase">
                              Lesson {lesson.number} ·{' '}
                              {new Date(lesson.date + 'T12:00:00').toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                            <span className="mt-1 block text-lg font-bold text-nf-blue dark:text-white">
                              {lesson.title}
                            </span>
                          </a>
                          {isAdmin && (
                            <div className="flex shrink-0 flex-col justify-center gap-1 border-l border-slate-100 px-3 py-2 dark:border-slate-700">
                              <button
                                className="cursor-pointer border-none bg-transparent px-2 py-1 text-left text-xs font-semibold text-nf-blue-mid transition-colors hover:text-nf-blue dark:hover:text-sky-300"
                                onClick={() => navigate(`lessons/edit/${lesson.id}`)}
                                type="button"
                              >
                                Edit
                              </button>
                              <button
                                aria-label={`Delete ${lesson.title}`}
                                className="cursor-pointer border-none bg-transparent px-2 py-1 text-left text-xs font-medium text-red-500 transition-colors hover:text-red-700 dark:text-red-400 dark:hover:text-red-200"
                                onClick={() => void handleDelete(lesson.id, lesson.title)}
                                type="button"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
