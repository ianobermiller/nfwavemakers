import { useEffect } from 'react';
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

  return (
    <SiteLayout current="lessons">
      <div className="bg-gradient-to-br from-nf-blue to-nf-blue-mid px-5 py-14 text-center text-white">
        <h1 className="text-4xl font-extrabold tracking-tight">Lessons</h1>
        <p className="mx-auto mt-3 max-w-xl text-balance text-sky-100">
          Topics and homework from Coach Shannon’s club emails. Most recent lesson first.
        </p>
        {isAdmin && (
          <p className="mt-4">
            <a
              href="/admin-lessons"
              className="text-sm font-semibold text-white underline-offset-2 hover:underline"
              onClick={(event) => {
                event.preventDefault();
                navigate('admin-lessons');
              }}
            >
              Manage lessons
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
                        <a
                          key={lesson.id}
                          className="block rounded-lg border-l-4 border-nf-accent bg-white px-5 py-4 no-underline shadow-sm hover:no-underline dark:bg-slate-800"
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
