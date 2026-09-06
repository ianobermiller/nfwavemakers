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
import { collections, pb } from '../data/pocketbase.ts';

const ballotCollections = [
  collections.ballots,
  collections.speakerEvals,
  collections.debates,
  collections.profiles,
];
const debateCollections = [collections.debates, collections.profiles];
const userCollections = [collections.profiles];
const adminDebateCollections = [collections.debates, collections.ballots, collections.profiles];

function useLiveData<T>(
  load: () => Promise<T>,
  watchCollections: readonly string[],
): T | undefined {
  const [value, setValue] = useState<T>();

  useEffect(() => {
    let active = true;

    const refresh = (): void => {
      void load()
        .then((next) => {
          if (active) setValue(next);
        })
        .catch((error: unknown) => {
          if (active) console.error('PocketBase query failed', error);
        });
    };

    refresh();
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
  }, [load, watchCollections]);

  return value;
}

export function useUsers(includeArchived = false) {
  const load = useCallback(async () => await listUsers(includeArchived), [includeArchived]);
  return useLiveData(load, userCollections);
}

export function useDebate(debateId?: string) {
  const load = useCallback(async () => (debateId ? await getDebate(debateId) : null), [debateId]);
  return useLiveData(load, debateCollections);
}

export function useUpcomingDebates(today: string) {
  const load = useCallback(async () => await listUpcomingDebates(today), [today]);
  return useLiveData(load, debateCollections);
}

export function useAssignedDebates() {
  const load = useCallback(async () => await listAssignedDebates(), []);
  return useLiveData(load, debateCollections);
}

export function useAdminDebates() {
  const load = useCallback(async () => await listAdminDebates(), []);
  return useLiveData(load, adminDebateCollections);
}

export function useDebateCard(debateId: string, judgeId?: string) {
  const load = useCallback(async () => await getDebateCard(debateId, judgeId), [debateId, judgeId]);
  return useLiveData(load, ballotCollections);
}

export function useBallot(ballotId: string) {
  const load = useCallback(async () => await getBallot(ballotId), [ballotId]);
  return useLiveData(load, ballotCollections);
}

export function useBallotDraft(debateId?: string) {
  const load = useCallback(async () => await getDraftForJudge(debateId), [debateId]);
  return useLiveData(load, ballotCollections);
}

export function useSubmittedBallots() {
  const load = useCallback(async () => await listSubmittedByMe(), []);
  return useLiveData(load, ballotCollections);
}

export function useSpeakerBallots() {
  const load = useCallback(async () => await listForSpeaker(), []);
  return useLiveData(load, ballotCollections);
}

export function useDebateDetail(debateId: string) {
  const load = useCallback(async () => await getDebateDetail(debateId), [debateId]);
  return useLiveData(load, ballotCollections);
}

export function useAdminBallotsByDebate() {
  const load = useCallback(async () => await listAdminBallotsByDebate(), []);
  return useLiveData(load, ballotCollections);
}

export function useAdminBallotsByStudent() {
  const load = useCallback(async () => await listAdminBallotsByStudent(), []);
  return useLiveData(load, ballotCollections);
}

export function useStrandedBallots() {
  const load = useCallback(async () => await listStrandedBallots(), []);
  return useLiveData(load, ballotCollections);
}
