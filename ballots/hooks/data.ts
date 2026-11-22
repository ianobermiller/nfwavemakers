import { useCallback, useEffect, useRef, useState } from 'react';
import type { RecordModel } from 'pocketbase';
import {
  getBallot,
  getDebate,
  getDebateCard,
  getDebateDetail,
  getDraftForJudge,
  listOpenAssignedDebates,
  listUpcomingDebates,
  listUsers,
} from '../data/api.ts';
import { getLesson, getLessonBySlug, listLessons } from '../data/lessons.ts';
import { affectsBallots, debateHasUser } from '../lib/liveEvents.ts';
import { formatLocalYmd } from '../lib/dates.ts';
import { ensureLive, readLive, subscribeLive } from '../lib/liveQuery.ts';
import { collections, pb } from '../data/pocketbase.ts';
import type { Role } from '../types.ts';
import { preloadDashboardHistory } from './useDashboardHistory.ts';

const ballotCollections = [
  collections.ballots,
  collections.speakerEvals,
  collections.debates,
  collections.users,
];
const debateCollections = [collections.debates, collections.users];
const userCollections = [collections.users];

export interface LiveQuery<T> {
  /** Call after the component's other hooks. Suspends until this query has a value. */
  read(): T;
}

function useLiveData<T>(
  key: string,
  load: () => Promise<T>,
  watchCollections: readonly string[],
  affects?: (collection: string, record: RecordModel, data: T, action: string) => boolean,
): LiveQuery<T> {
  ensureLive(key, load);
  const [, setTick] = useState(0);
  const affectsRef = useRef(affects);
  useEffect(() => {
    affectsRef.current = affects;
  }, [affects]);

  const read = useCallback((): T => {
    // The loader owns this key and writes T; the cache stores heterogeneous queries.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    return readLive(key) as T;
  }, [key]);

  useEffect(() => {
    const authId = pb.authStore.record?.id;
    return subscribeLive(
      key,
      {
        load,
        canLoad: () => pb.authStore.isValid && pb.authStore.record?.id === authId,
        watch: (invalidate) => {
          let active = true;
          const unsubscribes = watchCollections.map((collection) =>
            pb
              .collection(collection)
              .subscribe('*', (event) => {
                if (!active || !pb.authStore.isValid || pb.authStore.record?.id !== authId) return;
                if (
                  !affectsRef.current ||
                  affectsRef.current(collection, event.record, read(), event.action)
                )
                  invalidate();
              })
              .catch((error: unknown) => {
                console.error(`PocketBase subscription failed for ${collection}`, error);
                return (): void => {};
              }),
          );
          return () => {
            active = false;
            for (const unsubscribe of unsubscribes) void unsubscribe.then((stop) => stop());
          };
        },
      },
      () => setTick((tick) => tick + 1),
    );
  }, [key, load, read, watchCollections]);

  return { read };
}

/** Start the dashboard's queries together so sections don't fetch one after another. */
export function preloadDashboard(role: Role): void {
  const today = formatLocalYmd(new Date());
  if (role !== 'parent') ensureLive(`upcoming:${today}`, () => listUpcomingDebates(today));
  preloadDashboardHistory(role);
  if (role === 'parent' || role === 'admin') {
    ensureLive('open-assigned-debates', () => listOpenAssignedDebates());
  }
}

export function useUsers(includeArchived = false) {
  const load = useCallback(async () => await listUsers(includeArchived), [includeArchived]);
  return useLiveData(`users:${includeArchived ? 'all' : 'active'}`, load, userCollections);
}

export function useDebate(debateId?: string) {
  const load = useCallback(async () => (debateId ? await getDebate(debateId) : null), [debateId]);
  return useLiveData(
    `debate:${debateId ?? ''}`,
    load,
    debateCollections,
    (collection, record, debate) =>
      collection === collections.debates
        ? record.id === debateId
        : debateHasUser(debate, record.id),
  );
}

export function useUpcomingDebates(today: string) {
  const load = useCallback(async () => await listUpcomingDebates(today), [today]);
  return useLiveData(`upcoming:${today}`, load, debateCollections);
}

export function useOpenAssignedDebates() {
  const load = useCallback(async () => await listOpenAssignedDebates(), []);
  return useLiveData(
    'open-assigned-debates',
    load,
    ballotCollections,
    (collection, record) =>
      collection !== collections.speakerEvals &&
      (collection !== collections.ballots || record['judge'] === pb.authStore.record?.id),
  );
}

export function useDebateCard(debateId: string, judgeId?: string) {
  const load = useCallback(async () => await getDebateCard(debateId, judgeId), [debateId, judgeId]);
  return useLiveData(`debate-card:${debateId}:${judgeId ?? ''}`, load, ballotCollections);
}

export function useBallot(ballotId: string) {
  const load = useCallback(async () => await getBallot(ballotId), [ballotId]);
  return useLiveData(`ballot:${ballotId}`, load, ballotCollections, (collection, record, ballot) =>
    affectsBallots(collection, record, ballot ? [ballot] : [], { kind: 'ballot', id: ballotId }),
  );
}

export function useBallotDraft(debateId: string) {
  const load = useCallback(async () => await getDraftForJudge(debateId), [debateId]);
  return useLiveData(
    `ballot-draft:${debateId}`,
    load,
    ballotCollections,
    (collection, record, ballot) =>
      affectsBallots(collection, record, ballot ? [ballot] : [], { kind: 'debate', id: debateId }),
  );
}

export function useDebateDetail(debateId: string) {
  const load = useCallback(async () => await getDebateDetail(debateId), [debateId]);
  return useLiveData(
    `debate-detail:${debateId}`,
    load,
    ballotCollections,
    (collection, record, detail) =>
      (collection === collections.users && debateHasUser(detail?.debate, record.id)) ||
      affectsBallots(collection, record, detail?.ballots ?? [], { kind: 'debate', id: debateId }),
  );
}

const lessonCollections = [collections.lessons];

export function useLessons() {
  const load = useCallback(async () => await listLessons(), []);
  return useLiveData('lessons', load, lessonCollections);
}

export function useLessonBySlug(year: string, number: string) {
  const load = useCallback(async () => await getLessonBySlug(year, number), [year, number]);
  return useLiveData(
    `lesson:${year}/${number}`,
    load,
    lessonCollections,
    (_collection, record, lesson) =>
      record.id === lesson?.id ||
      (record['year'] === Number(year) && record['number'] === Number(number)),
  );
}

export function useLesson(id?: string) {
  const load = useCallback(async () => (id ? await getLesson(id) : null), [id]);
  return useLiveData(
    `lesson-id:${id ?? ''}`,
    load,
    lessonCollections,
    (_collection, record) => record.id === id,
  );
}
