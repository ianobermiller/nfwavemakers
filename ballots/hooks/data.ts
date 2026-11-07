import { useCallback, useEffect, useState } from 'react';
import {
  getBallot,
  getDebate,
  getDebateCard,
  getDebateDetail,
  getDraftForJudge,
  listAdminBallotsByDebate,
  listAdminBallotsByStudent,
  listAdminDebates,
  listAssignedDebates,
  listForSpeaker,
  listStrandedBallots,
  listSubmittedByMe,
  listUpcomingDebates,
  listUsers,
} from '../data/api.ts';
import { getLesson, getLessonBySlug, listLessons } from '../data/lessons.ts';
import { formatLocalYmd } from '../lib/dates.ts';
import { consumeFresh, ensureLive, readLive, writeLive } from '../lib/liveQuery.ts';
import { collections, pb } from '../data/pocketbase.ts';
import type { Role } from '../types.ts';

const ballotCollections = [
  collections.ballots,
  collections.speakerEvals,
  collections.debates,
  collections.users,
];
const debateCollections = [collections.debates, collections.users];
const userCollections = [collections.users];
const adminDebateCollections = [collections.debates, collections.ballots, collections.users];

export interface LiveQuery<T> {
  /** Call after the component's other hooks. Suspends until this query has a value. */
  read(): T;
}

function useLiveData<T>(
  key: string,
  load: () => Promise<T>,
  watchCollections: readonly string[],
): LiveQuery<T> {
  ensureLive(key, load);
  const [, setTick] = useState(0);

  useEffect(() => {
    let active = true;

    const refresh = (): void => {
      void load()
        .then((next) => {
          if (!active) return;
          writeLive(key, next);
          setTick((tick) => tick + 1);
        })
        .catch((error: unknown) => {
          if (active) console.error('PocketBase query failed', error);
        });
    };

    // The suspending read just filled the cache. Later mounts refresh in place.
    if (!consumeFresh(key)) refresh();

    const unsubscribes = watchCollections.map((collection) =>
      pb
        .collection(collection)
        .subscribe('*', refresh)
        .catch((error: unknown) => {
          console.error(`PocketBase subscription failed for ${collection}`, error);
          return (): void => {};
        }),
    );

    return () => {
      active = false;
      for (const unsubscribe of unsubscribes) void unsubscribe.then((stop) => stop());
    };
  }, [key, load, watchCollections]);

  return {
    read: (): T => {
      // One map holds every query, so the stored value is untyped. This hook wrote T under `key`.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      return readLive(key) as T;
    },
  };
}

/** Start the dashboard's queries together so sections don't fetch one after another. */
export function preloadDashboard(role: Role): void {
  const today = formatLocalYmd(new Date());
  if (role !== 'parent') ensureLive(`upcoming:${today}`, () => listUpcomingDebates(today));
  if (role === 'student' || role === 'admin') {
    ensureLive('speaker-ballots', () => listForSpeaker());
  }
  if (role === 'parent' || role === 'admin') {
    ensureLive('assigned-debates', () => listAssignedDebates());
    ensureLive('submitted-ballots', () => listSubmittedByMe());
  }
}

export function useUsers(includeArchived = false) {
  const load = useCallback(async () => await listUsers(includeArchived), [includeArchived]);
  return useLiveData(`users:${includeArchived ? 'all' : 'active'}`, load, userCollections);
}

export function useDebate(debateId?: string) {
  const load = useCallback(async () => (debateId ? await getDebate(debateId) : null), [debateId]);
  return useLiveData(`debate:${debateId ?? ''}`, load, debateCollections);
}

export function useUpcomingDebates(today: string) {
  const load = useCallback(async () => await listUpcomingDebates(today), [today]);
  return useLiveData(`upcoming:${today}`, load, debateCollections);
}

export function useAssignedDebates() {
  const load = useCallback(async () => await listAssignedDebates(), []);
  return useLiveData('assigned-debates', load, debateCollections);
}

export function useAdminDebates() {
  const load = useCallback(async () => await listAdminDebates(), []);
  return useLiveData('admin-debates', load, adminDebateCollections);
}

export function useDebateCard(debateId: string, judgeId?: string) {
  const load = useCallback(async () => await getDebateCard(debateId, judgeId), [debateId, judgeId]);
  return useLiveData(`debate-card:${debateId}:${judgeId ?? ''}`, load, ballotCollections);
}

export function useBallot(ballotId: string) {
  const load = useCallback(async () => await getBallot(ballotId), [ballotId]);
  return useLiveData(`ballot:${ballotId}`, load, ballotCollections);
}

export function useBallotDraft(debateId: string) {
  const load = useCallback(async () => await getDraftForJudge(debateId), [debateId]);
  return useLiveData(`ballot-draft:${debateId}`, load, ballotCollections);
}

export function useSubmittedBallots() {
  const load = useCallback(async () => await listSubmittedByMe(), []);
  return useLiveData('submitted-ballots', load, ballotCollections);
}

export function useSpeakerBallots() {
  const load = useCallback(async () => await listForSpeaker(), []);
  return useLiveData('speaker-ballots', load, ballotCollections);
}

export function useDebateDetail(debateId: string) {
  const load = useCallback(async () => await getDebateDetail(debateId), [debateId]);
  return useLiveData(`debate-detail:${debateId}`, load, ballotCollections);
}

export function useAdminBallotsByDebate() {
  const load = useCallback(async () => await listAdminBallotsByDebate(), []);
  return useLiveData('admin-ballots-debate', load, ballotCollections);
}

export function useAdminBallotsByStudent() {
  const load = useCallback(async () => await listAdminBallotsByStudent(), []);
  return useLiveData('admin-ballots-student', load, ballotCollections);
}

export function useStrandedBallots() {
  const load = useCallback(async () => await listStrandedBallots(), []);
  return useLiveData('stranded-ballots', load, ballotCollections);
}

const lessonCollections = [collections.lessons];

export function useLessons() {
  const load = useCallback(async () => await listLessons(), []);
  return useLiveData('lessons', load, lessonCollections);
}

export function useLessonBySlug(year: string, number: string) {
  const load = useCallback(async () => await getLessonBySlug(year, number), [year, number]);
  return useLiveData(`lesson:${year}/${number}`, load, lessonCollections);
}

export function useLesson(id?: string) {
  const load = useCallback(async () => (id ? await getLesson(id) : null), [id]);
  return useLiveData(`lesson-id:${id ?? ''}`, load, lessonCollections);
}
