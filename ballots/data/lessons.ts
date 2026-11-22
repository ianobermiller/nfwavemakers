import type { RecordModel } from 'pocketbase';
import type { Lesson, LessonMetadata } from './model.ts';
import { collections, pb } from './pocketbase.ts';

interface LessonMetadataRecord extends RecordModel {
  date: string;
  number: number;
  title: string;
  year: number;
}

interface LessonRecord extends LessonMetadataRecord {
  body: string;
}

export interface LessonInput {
  year: number;
  number: number;
  title: string;
  date: string;
  body: string;
}

function mapLessonMetadata(record: LessonMetadataRecord): LessonMetadata {
  return {
    id: record.id,
    year: record.year,
    number: record.number,
    title: record.title,
    date: record.date,
    slug: `${record.year}/${record.number}`,
  };
}

function mapLesson(record: LessonRecord): Lesson {
  return { ...mapLessonMetadata(record), body: record.body };
}

export async function listLessons(): Promise<LessonMetadata[]> {
  const records = await pb.collection<LessonMetadataRecord>(collections.lessons).getFullList({
    fields: 'id,year,number,title,date',
    sort: '-year,-number',
  });
  return records.map(mapLessonMetadata);
}

export async function getLessonBySlug(year: string, number: string): Promise<Lesson | null> {
  const yearNum = Number(year);
  const numberNum = Number(number);
  if (!Number.isFinite(yearNum) || !Number.isFinite(numberNum)) return null;

  try {
    const record = await pb
      .collection<LessonRecord>(collections.lessons)
      .getFirstListItem(
        pb.filter('year = {:year} && number = {:number}', { year: yearNum, number: numberNum }),
      );
    return mapLesson(record);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'status' in error &&
      Reflect.get(error, 'status') === 404
    ) {
      return null;
    }
    throw error;
  }
}

export async function getLesson(id: string): Promise<Lesson | null> {
  try {
    const record = await pb.collection<LessonRecord>(collections.lessons).getOne(id);
    return mapLesson(record);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'status' in error &&
      Reflect.get(error, 'status') === 404
    ) {
      return null;
    }
    throw error;
  }
}

export async function saveLesson(input: LessonInput & { id?: string }): Promise<Lesson> {
  const body = {
    year: input.year,
    number: input.number,
    title: input.title.trim(),
    date: input.date,
    body: input.body,
  };
  const record = input.id
    ? await pb.collection<LessonRecord>(collections.lessons).update(input.id, body)
    : await pb.collection<LessonRecord>(collections.lessons).create(body);
  return mapLesson(record);
}

export async function deleteLesson(id: string): Promise<void> {
  await pb.collection(collections.lessons).delete(id);
}

export function adjacentLessons(
  lessons: LessonMetadata[],
  lesson: LessonMetadata,
): { prev: LessonMetadata | undefined; next: LessonMetadata | undefined } {
  const ordered = [...lessons]
    .filter((item) => item.year === lesson.year)
    .sort((a, b) => a.number - b.number);
  const idx = ordered.findIndex((item) => item.id === lesson.id);
  return {
    prev: idx > 0 ? ordered[idx - 1] : undefined,
    next: idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : undefined,
  };
}
