import { listStudentFeedback, listSubmittedByMe } from '../data/api.ts';
import { pb } from '../data/pocketbase.ts';
import { createPreloadedCursorList } from '../lib/preloadedCursorList.ts';
import type { QueryRequest } from '../lib/cursorList.ts';
import { useAdminBallotQuery } from './useAdminBallotQuery.ts';
import type { Role } from '../types.ts';

let sessionGeneration = 0;
let sourceUserId: string | undefined;

function createHistorySource<T, C>(options: Parameters<typeof createPreloadedCursorList<T, C>>[0]) {
  const generation = sessionGeneration;
  const userId = pb.authStore.record?.id;
  const source = createPreloadedCursorList(options);
  const assertSession = (): void => {
    if (
      generation !== sessionGeneration ||
      !pb.authStore.isValid ||
      pb.authStore.record?.id !== userId
    )
      throw new Error('History session changed');
  };
  return {
    load: async (request: QueryRequest) => {
      assertSession();
      const result = await source.load(request);
      assertSession();
      return result;
    },
  };
}

const createStudentSource = () =>
  createHistorySource({ load: listStudentFeedback, key: (row) => row.id });
const createJudgeSource = () =>
  createHistorySource({ load: listSubmittedByMe, key: (row) => row.id });
const students = new Map<string, ReturnType<typeof createStudentSource>>();
const judges = new Map<string, ReturnType<typeof createJudgeSource>>();

export function clearDashboardHistory(): void {
  sessionGeneration += 1;
  sourceUserId = undefined;
  students.clear();
  judges.clear();
}

function sourceFor<T>(sources: Map<string, T>, create: () => T): T {
  const userId = pb.authStore.record?.id;
  if (!userId) throw new Error('Not authenticated');
  if (sourceUserId !== userId) {
    clearDashboardHistory();
    sourceUserId = userId;
  }
  let source = sources.get(userId);
  if (!source) {
    source = create();
    sources.set(userId, source);
  }
  return source;
}

export function preloadDashboardHistory(role: Role): void {
  if (role === 'student') sourceFor(students, createStudentSource);
  else sourceFor(judges, createJudgeSource);
}

export function useStudentFeedback() {
  const source = sourceFor(students, createStudentSource);
  // Membership moves and name changes can affect group boundaries or judge labels.
  return useAdminBallotQuery(source.load, () => true);
}

export function useSubmittedHistory() {
  const source = sourceFor(judges, createJudgeSource);
  return useAdminBallotQuery(source.load, (collection, record, data) => {
    if (collection === 'speaker_evals') return false;
    if (collection === 'ballots')
      return (
        record['judge'] === pb.authStore.record?.id ||
        data?.items.some((row) => row.id === record.id) === true
      );
    return true;
  });
}
