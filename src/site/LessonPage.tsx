import { useEffect } from 'react';
import { adjacentLessons } from '../../ballots/data/lessons.ts';
import { useAppUser } from '../../ballots/hooks/auth.tsx';
import { useLessonBySlug, useLessons } from '../../ballots/hooks/data.ts';
import { navigate } from '../hooks/useHashRoute.ts';
import { renderLessonMarkdown } from './renderLessonMarkdown.ts';
import { SiteLayout } from './SiteLayout.tsx';

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
  const lesson = useLessonBySlug(year, number);
  const lessons = useLessons();
  const user = useAppUser();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (lesson) {
      document.title = `Lesson ${lesson.number}: ${lesson.title} — North Florida Wavemakers`;
    } else if (lesson === null) {
      document.title = 'Lesson not found — North Florida Wavemakers';
    }
  }, [lesson]);

  if (lesson === undefined) {
    return (
      <SiteLayout current="lessons">
        <div className="bg-gradient-to-br from-nf-blue to-nf-blue-mid px-5 py-14 text-center text-white">
          <h1 className="text-4xl font-extrabold">Loading…</h1>
        </div>
      </SiteLayout>
    );
  }

  if (lesson === null) {
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

  const body = renderLessonMarkdown(lesson.body);
  const { prev, next } = adjacentLessons(lessons ?? [], lesson);
  const seasonLabel = `${lesson.year}–${String(lesson.year + 1).slice(2)}`;
  const dateLabel = new Date(lesson.date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

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
          · {seasonLabel}
        </p>
        <h1 className="text-4xl font-extrabold tracking-tight">{lesson.title}</h1>
        <p className="mt-3 text-sky-100">
          Lesson {lesson.number} · {dateLabel}
        </p>
        {isAdmin && (
          <p className="mt-4">
            <a
              href={`/lessons/edit/${lesson.id}`}
              className="inline-flex cursor-pointer rounded-lg border border-white/40 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white no-underline hover:bg-white/20 hover:no-underline"
              onClick={(event) => {
                event.preventDefault();
                navigate(`lessons/edit/${lesson.id}`);
              }}
            >
              Edit lesson
            </a>
          </p>
        )}
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
