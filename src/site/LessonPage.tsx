import { Component, Suspense, useEffect, type ReactNode } from 'react';
import { adjacentLessons } from '../../ballots/data/lessons.ts';
import { useAppUser } from '../../ballots/hooks/auth.tsx';
import { useLessonBySlug, useLessons } from '../../ballots/hooks/data.ts';
import type { Lesson, LessonMetadata } from '../../ballots/data/model.ts';
import { clearLiveErrors } from '../../ballots/lib/liveQuery.ts';
import { navigate } from '../hooks/useHashRoute.ts';
import { PageHero } from './PageHero.tsx';
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
  const lessonLive = useLessonBySlug(year, number);
  const lesson = lessonLive.read();
  if (lesson === null) return <MissingLesson />;
  return <LoadedLesson lesson={lesson} />;
}

function MissingLesson(): React.JSX.Element {
  return (
    <SiteLayout current="lessons">
      <PageHero title="Lesson not found">
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
      </PageHero>
    </SiteLayout>
  );
}

function LoadedLesson({ lesson }: { lesson: Lesson }): React.JSX.Element {
  const user = useAppUser();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    document.title = `Lesson ${lesson.number}: ${lesson.title} — North Florida Wavemakers`;
  }, [lesson]);

  const body = renderLessonMarkdown(lesson.body);
  const seasonLabel = `${lesson.year}–${String(lesson.year + 1).slice(2)}`;
  const dateLabel = new Date(lesson.date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <SiteLayout current="lessons">
      <PageHero
        eyebrow={
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
        }
        lead={`Lesson ${lesson.number} · ${dateLabel}`}
        leadClassName="mt-3"
        title={lesson.title}
      >
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
      </PageHero>

      <section className="px-5 py-16">
        <div className="mx-auto max-w-5xl">
          <div className={article} dangerouslySetInnerHTML={{ __html: body }} />
          <LessonNavigationBoundary key={lesson.id}>
            <Suspense fallback={<LessonNavigationLinks message="Loading lesson navigation…" />}>
              <LessonNavigation lesson={lesson} />
            </Suspense>
          </LessonNavigationBoundary>
        </div>
      </section>
    </SiteLayout>
  );
}

function LessonNavigation({ lesson }: { lesson: LessonMetadata }): React.JSX.Element {
  const lessons = useLessons().read();
  const { prev, next } = adjacentLessons(lessons, lesson);
  return <LessonNavigationLinks prev={prev} next={next} />;
}

function LessonNavigationLinks({
  prev,
  next,
  message,
  children,
}: {
  prev?: LessonMetadata | undefined;
  next?: LessonMetadata | undefined;
  message?: string;
  children?: ReactNode;
}): React.JSX.Element {
  return (
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
      {message && (
        <p
          role="status"
          className="col-span-3 text-center text-sm font-normal text-slate-500 dark:text-slate-400"
        >
          {message}
        </p>
      )}
      {children}
    </nav>
  );
}

class LessonNavigationBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  private retry = (): void => {
    clearLiveErrors();
    this.setState({ failed: false });
  };

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <LessonNavigationLinks>
        <div
          role="alert"
          className="col-span-3 text-center text-sm font-normal text-slate-500 dark:text-slate-400"
        >
          <p>Couldn’t load lesson navigation.</p>
          <button
            type="button"
            onClick={this.retry}
            className="mt-2 cursor-pointer border-none bg-transparent text-nf-blue-mid underline dark:text-sky-300"
          >
            Retry navigation
          </button>
        </div>
      </LessonNavigationLinks>
    );
  }
}
