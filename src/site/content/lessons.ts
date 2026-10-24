export interface LessonMeta {
  year: number;
  number: number;
  title: string;
  dateLabel: string;
  dateIso: string;
  slug: string;
}

export const LESSONS: LessonMeta[] = [
  {
    year: 2026,
    number: 1,
    title: 'Finding Your Voice',
    dateLabel: 'Tuesday, September 15, 2026',
    dateIso: '2026-09-15',
    slug: '2026/1',
  },
  {
    year: 2026,
    number: 2,
    title: 'Interpretive Speeches Begin',
    dateLabel: 'Tuesday, September 22, 2026',
    dateIso: '2026-09-22',
    slug: '2026/2',
  },
  {
    year: 2026,
    number: 3,
    title: 'Choosing Interpretive Sources',
    dateLabel: 'Tuesday, September 29, 2026',
    dateIso: '2026-09-29',
    slug: '2026/3',
  },
  {
    year: 2026,
    number: 4,
    title: 'Conflict, Impromptu, and Platform Focus',
    dateLabel: 'Tuesday, October 6, 2026',
    dateIso: '2026-10-06',
    slug: '2026/4',
  },
  {
    year: 2026,
    number: 5,
    title: 'Plot, Theme, and Scenes',
    dateLabel: 'Tuesday, October 13, 2026',
    dateIso: '2026-10-13',
    slug: '2026/5',
  },
  {
    year: 2026,
    number: 6,
    title: 'Cutting an Interpretation',
    dateLabel: 'Tuesday, October 20, 2026',
    dateIso: '2026-10-20',
    slug: '2026/6',
  },
];

export function lessonBySlug(year: string, number: string): LessonMeta | undefined {
  return LESSONS.find((l) => String(l.year) === year && String(l.number) === number);
}

export function adjacentLessons(lesson: LessonMeta): {
  prev: LessonMeta | undefined;
  next: LessonMeta | undefined;
} {
  const ordered = [...LESSONS].sort((a, b) => a.number - b.number);
  const idx = ordered.findIndex((l) => l.slug === lesson.slug);
  return {
    prev: idx > 0 ? ordered[idx - 1] : undefined,
    next: idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : undefined,
  };
}
