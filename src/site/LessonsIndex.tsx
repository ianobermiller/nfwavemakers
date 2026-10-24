import { useEffect } from 'react';
import { navigate } from '../hooks/useHashRoute.ts';
import { LESSONS } from './content/lessons.ts';
import { SiteLayout } from './SiteLayout.tsx';

export function LessonsIndex(): React.JSX.Element {
  useEffect(() => {
    document.title = 'Lessons — North Florida Wavemakers';
  }, []);

  const newestFirst = [...LESSONS].sort((a, b) => b.number - a.number);

  return (
    <SiteLayout current="lessons">
      <div className="bg-gradient-to-br from-nf-blue to-nf-blue-mid px-5 py-14 text-center text-white">
        <h1 className="text-4xl font-extrabold tracking-tight">Lessons</h1>
        <p className="mx-auto mt-3 max-w-xl text-balance text-sky-100">
          Topics and homework from Coach Shannon’s club emails for the 2026–27 season. Most recent
          lesson first.
        </p>
      </div>

      <section className="px-5 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-6 text-3xl font-bold text-nf-blue dark:text-white">2026–27</h2>
          <div className="grid max-w-3xl gap-3">
            {newestFirst.map((lesson) => (
              <a
                key={lesson.slug}
                className="block rounded-lg border-l-4 border-nf-accent bg-white px-5 py-4 no-underline shadow-sm hover:no-underline dark:bg-slate-800"
                href={`/lessons/${lesson.slug}`}
                onClick={(event) => {
                  event.preventDefault();
                  navigate(`lessons/${lesson.slug}`);
                }}
              >
                <span className="block text-xs font-bold tracking-wide text-nf-blue-mid uppercase">
                  Lesson {lesson.number} ·{' '}
                  {new Date(lesson.dateIso + 'T12:00:00').toLocaleDateString('en-US', {
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
      </section>
    </SiteLayout>
  );
}
