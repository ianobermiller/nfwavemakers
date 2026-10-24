import { useEffect } from 'react';
import { navigate } from '../hooks/useHashRoute.ts';
import { adjacentLessons, lessonBySlug } from './content/lessons.ts';
import lesson1 from './content/lesson-2026-1.html?raw';
import lesson2 from './content/lesson-2026-2.html?raw';
import lesson3 from './content/lesson-2026-3.html?raw';
import lesson4 from './content/lesson-2026-4.html?raw';
import lesson5 from './content/lesson-2026-5.html?raw';
import lesson6 from './content/lesson-2026-6.html?raw';
import { SiteLayout } from './SiteLayout.tsx';

const BODIES: Record<string, string> = {
  '2026/1': lesson1,
  '2026/2': lesson2,
  '2026/3': lesson3,
  '2026/4': lesson4,
  '2026/5': lesson5,
  '2026/6': lesson6,
};

const article =
  'max-w-3xl text-base leading-relaxed text-slate-800 dark:text-slate-100 ' +
  '[&_p]:mb-3.5 [&_h3]:mt-7 [&_h3]:mb-2.5 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-nf-blue dark:[&_h3]:text-white ' +
  '[&_h3:first-child]:mt-0 [&_h4]:mt-5 [&_h4]:mb-2 [&_h4]:font-bold [&_h4]:text-nf-blue dark:[&_h4]:text-white ' +
  '[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1.5 ' +
  '[&_a]:text-nf-blue-mid [&_a]:underline-offset-2 hover:[&_a]:underline [&_strong]:font-semibold';

interface Props {
  year: string;
  number: string;
}

export function LessonPage({ year, number }: Props): React.JSX.Element {
  const lesson = lessonBySlug(year, number);
  const body = lesson ? BODIES[lesson.slug] : undefined;

  useEffect(() => {
    if (lesson) {
      document.title = `Lesson ${lesson.number}: ${lesson.title} — North Florida Wavemakers`;
    } else {
      document.title = 'Lesson not found — North Florida Wavemakers';
    }
  }, [lesson]);

  if (!lesson || !body) {
    return (
      <SiteLayout current="lessons">
        <div className="bg-gradient-to-br from-nf-blue to-nf-blue-mid px-5 py-14 text-center text-white">
          <h1 className="text-4xl font-extrabold">Lesson not found</h1>
          <p className="mt-3">
            <a
              href="/lessons"
              className="font-semibold text-white underline"
              onClick={(event) => {
                event.preventDefault();
                navigate('lessons');
              }}
            >
              Back to all lessons
            </a>
          </p>
        </div>
      </SiteLayout>
    );
  }

  const { prev, next } = adjacentLessons(lesson);

  return (
    <SiteLayout current="lessons">
      <div className="bg-gradient-to-br from-nf-blue to-nf-blue-mid px-5 py-14 text-center text-white">
        <p className="mb-2 text-xs font-bold tracking-widest text-sky-100 uppercase">
          <a
            href="/lessons"
            className="text-white underline-offset-2 hover:underline"
            onClick={(event) => {
              event.preventDefault();
              navigate('lessons');
            }}
          >
            Lessons
          </a>{' '}
          · 2026–27
        </p>
        <h1 className="text-4xl font-extrabold tracking-tight">{lesson.title}</h1>
        <p className="mt-3 text-sky-100">
          Lesson {lesson.number} · {lesson.dateLabel}
        </p>
      </div>

      <section className="px-5 py-16">
        <div className="mx-auto max-w-5xl">
          <div className={article} dangerouslySetInnerHTML={{ __html: body }} />
          <nav
            className="mt-10 grid max-w-3xl grid-cols-[1fr_auto_1fr] items-center gap-4 border-t border-slate-200 pt-4 font-semibold dark:border-white/10"
            aria-label="Lesson"
          >
            {prev ? (
              <a
                href={`/lessons/${prev.slug}`}
                className="text-nf-blue-mid no-underline hover:underline"
                onClick={(event) => {
                  event.preventDefault();
                  navigate(`lessons/${prev.slug}`);
                }}
              >
                ← Lesson {prev.number}
              </a>
            ) : (
              <span />
            )}
            <a
              href="/lessons"
              className="text-center text-nf-blue-mid no-underline hover:underline"
              onClick={(event) => {
                event.preventDefault();
                navigate('lessons');
              }}
            >
              All lessons
            </a>
            {next ? (
              <a
                href={`/lessons/${next.slug}`}
                className="text-right text-nf-blue-mid no-underline hover:underline"
                onClick={(event) => {
                  event.preventDefault();
                  navigate(`lessons/${next.slug}`);
                }}
              >
                Lesson {next.number} →
              </a>
            ) : (
              <span />
            )}
          </nav>
        </div>
      </section>
    </SiteLayout>
  );
}
