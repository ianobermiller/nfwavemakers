import { useCallback, useEffect, useRef, useState } from 'react';
import { saveBallot } from '../data/api.ts';
import { createRecordId, errorMessage } from '../data/pocketbase.ts';
import { prepareBallotSave, type PreparedBallotSave } from '../services/ballotSave.ts';
import type { Debate } from '../data/model.ts';
import {
  browserDraftStorage,
  buildLocalDraft,
  clearLocalDraft,
  preserveNotes,
  restoreBallotFormState,
  writeLocalDraft,
  type DraftStorage,
} from '../lib/ballotLocalDraft.ts';
import { navigate } from '@/hooks/useHashRoute.ts';
import { useDebouncedSave } from './useDebouncedSave.ts';
import { POSITIONS, type Position, type SpeakerFormState, type Winner } from '../types.ts';
import { scoringTotal } from '../utils/format.ts';
import {
  alignSpeakersToDebate,
  buildEvalPayload,
  canSubmitBallot,
  chooseFirstSpeaker,
  getActivePositions,
  initBallotFormState,
  isAllScored,
  type BallotFormInit,
  type BallotIds,
  type DebateTeams,
} from '../services/ballot.ts';
import { useBallotDraft as useBallotDraftRecord, useDebate } from './data.ts';

export type BallotSyncStatus = 'saved' | 'saving' | 'pending' | 'error';

interface Props {
  initial: BallotFormInit;
  debate: Debate;
  judgeId: string;
  debateId: string;
  storage?: DraftStorage;
}

const RETRY_DELAYS_MS = [2_000, 5_000, 15_000, 30_000];

export function useBallotDraft({
  initial: serverInitial,
  debate,
  judgeId,
  debateId,
  storage = browserDraftStorage(),
}: Props) {
  const [boot] = useState(() => restoreBallotFormState(serverInitial, judgeId, debateId, storage));
  const initial = boot.initial;
  const startedFromLocal = boot.restoredFromLocal;

  const [orderConfirmed, setOrderConfirmed] = useState(initial.orderConfirmed);
  const orderConfirmedRef = useRef(orderConfirmed);

  const [winner, setWinner] = useState(initial.winner);
  const [rfd, setRfd] = useState(initial.rfd);
  const [speakers, setSpeakers] = useState(initial.speakers);
  const [ids, setIds] = useState<BallotIds>(initial.ids);
  const [rankOrder, setRankOrder] = useState<Position[]>(initial.rankOrder);
  const [submitting, setSubmitting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<BallotSyncStatus>(
    startedFromLocal || initial.needsPersist ? 'pending' : 'saved',
  );
  const [syncError, setSyncError] = useState<string | undefined>(undefined);

  const speakersRef = useRef(speakers);
  const idsRef = useRef(ids);
  const rankOrderRef = useRef(rankOrder);
  const winnerRef = useRef(winner);
  const rfdRef = useRef(rfd);
  const debateRef = useRef<DebateTeams | null | undefined>(undefined);
  const dirtyGenerationRef = useRef(0);
  const savePromiseRef = useRef<Promise<void> | null>(null);
  const submittingRef = useRef(false);
  const mountedRef = useRef(true);
  const [acknowledged] = useState(() =>
    serverInitial.ids.ballotId && !serverInitial.needsPersist
      ? prepareBallotSave(
          {
            ballotId: serverInitial.ids.ballotId,
            debateId,
            orderConfirmed: serverInitial.orderConfirmed,
            evals: buildEvalPayload(
              serverInitial.speakers,
              serverInitial.ids,
              serverInitial.rankOrder,
            ),
            reasonForDecision: serverInitial.rfd,
            ...(serverInitial.winner ? { winner: serverInitial.winner } : {}),
          },
          createRecordId,
        )
      : undefined,
  );
  const acknowledgedRef = useRef<PreparedBallotSave | undefined>(acknowledged);
  const retryAttemptRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageRef = useRef(storage);
  const scheduleAfterSaveRef = useRef<() => void>(() => {});
  const saveToServerRef = useRef<() => Promise<void>>(async () => {});

  const students = [...debate.affTeam, ...debate.negTeam];

  useEffect(() => {
    storageRef.current = storage;
  }, [storage]);

  const persistLocal = useCallback(
    (next: {
      speakers: Record<Position, SpeakerFormState>;
      ids: BallotIds;
      rankOrder: Position[];
      winner: Winner | undefined;
      rfd: string;
    }) => {
      writeLocalDraft(
        buildLocalDraft({
          judgeId,
          debateId,
          orderConfirmed: orderConfirmedRef.current,
          ids: next.ids,
          speakers: next.speakers,
          rankOrder: next.rankOrder,
          winner: next.winner,
          rfd: next.rfd,
        }),
        storageRef.current,
      );
    },
    [debateId, judgeId],
  );

  const clearRetry = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const prepareCurrentSave = useCallback(
    (submittedAt?: number) => {
      const input = prepareBallotSave(
        {
          ...(idsRef.current.ballotId ? { ballotId: idsRef.current.ballotId } : {}),
          debateId,
          orderConfirmed: [...orderConfirmedRef.current],
          evals: buildEvalPayload(speakersRef.current, idsRef.current, rankOrderRef.current),
          reasonForDecision: rfdRef.current,
          ...(winnerRef.current ? { winner: winnerRef.current } : {}),
          ...(submittedAt ? { submittedAt } : {}),
        },
        createRecordId,
      );
      const nextIds: BallotIds = {
        ballotId: input.ballotId,
        evalIds: { ...idsRef.current.evalIds },
      };
      for (const evaluation of input.evals)
        nextIds.evalIds[evaluation.position] = evaluation.evalId;
      idsRef.current = nextIds;
      setIds(nextIds);
      persistLocal({
        speakers: speakersRef.current,
        ids: nextIds,
        rankOrder: rankOrderRef.current,
        winner: winnerRef.current,
        rfd: rfdRef.current,
      });
      return input;
    },
    [debateId, persistLocal],
  );

  const saveToServer = useCallback(async () => {
    if (submittingRef.current) return;
    if (savePromiseRef.current) return await savePromiseRef.current;
    const run = async (): Promise<void> => {
      clearRetry();
      const generation = dirtyGenerationRef.current;
      setSyncStatus('saving');
      try {
        const input = prepareCurrentSave();
        await saveBallot(input, acknowledgedRef.current);
        acknowledgedRef.current = input;
        retryAttemptRef.current = 0;
        setSyncError(undefined);
        setSyncStatus(dirtyGenerationRef.current === generation ? 'saved' : 'pending');
      } catch (error: unknown) {
        setSyncStatus('error');
        setSyncError(errorMessage(error, 'Could not save your ballot'));
        if (mountedRef.current && !submittingRef.current) {
          const delay =
            RETRY_DELAYS_MS[Math.min(retryAttemptRef.current, RETRY_DELAYS_MS.length - 1)]!;
          retryAttemptRef.current += 1;
          retryTimerRef.current = setTimeout(() => {
            retryTimerRef.current = null;
            void saveToServerRef.current();
          }, delay);
        }
      } finally {
        if (
          mountedRef.current &&
          !submittingRef.current &&
          dirtyGenerationRef.current !== generation
        ) {
          scheduleAfterSaveRef.current();
        }
      }
    };
    const request = run();
    savePromiseRef.current = request;
    try {
      await request;
    } finally {
      if (savePromiseRef.current === request) savePromiseRef.current = null;
    }
  }, [clearRetry, prepareCurrentSave]);

  useEffect(() => {
    saveToServerRef.current = saveToServer;
  }, [saveToServer]);

  const { schedule: scheduleDebouncedSave, cancel: cancelDebouncedSave } = useDebouncedSave(
    () => {
      void saveToServerRef.current();
    },
    { flushOnUnmount: true },
  );

  useEffect(() => {
    scheduleAfterSaveRef.current = scheduleDebouncedSave;
  }, [scheduleDebouncedSave]);

  const markDirtyAndSave = useCallback(
    (next: {
      speakers: Record<Position, SpeakerFormState>;
      ids: BallotIds;
      rankOrder: Position[];
      winner: Winner | undefined;
      rfd: string;
    }) => {
      dirtyGenerationRef.current += 1;
      persistLocal(next);
      setSyncStatus((status) => (status === 'saving' ? status : 'pending'));
      scheduleDebouncedSave();
    },
    [persistLocal, scheduleDebouncedSave],
  );

  useEffect(() => {
    speakersRef.current = speakers;
    idsRef.current = ids;
    rankOrderRef.current = rankOrder;
    winnerRef.current = winner;
    rfdRef.current = rfd;
    debateRef.current = debate;
  });

  // Re-push a restored or rematched draft once; later edits go through markDirtyAndSave.
  const bootstrappedRef = useRef(false);
  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    if (!(startedFromLocal || initial.needsPersist)) return;
    dirtyGenerationRef.current += 1;
    persistLocal({
      speakers: initial.speakers,
      ids: initial.ids,
      rankOrder: initial.rankOrder,
      winner: initial.winner,
      rfd: initial.rfd,
    });
    scheduleDebouncedSave();
  }, [initial, persistLocal, scheduleDebouncedSave, startedFromLocal]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearRetry();
    };
  }, [clearRetry]);

  const debateSpeakerKey = `${debate.affTeam.map((user) => user.id).join('|')}:${debate.negTeam.map((user) => user.id).join('|')}`;

  useEffect(() => {
    const currentDebate = debateRef.current;
    if (!currentDebate || !debateSpeakerKey) return;
    const aligned = alignSpeakersToDebate(
      speakersRef.current,
      idsRef.current.evalIds,
      rankOrderRef.current,
      currentDebate,
    );
    if (!aligned.changed) return;
    const nextConfirmed = orderConfirmedRef.current.filter((side) =>
      POSITIONS.filter((pos) => pos.startsWith(side)).every(
        (pos) => speakersRef.current[pos].userId === aligned.speakers[pos].userId,
      ),
    );
    orderConfirmedRef.current = nextConfirmed;
    setOrderConfirmed(nextConfirmed);
    const nextSpeakers = preserveNotes(speakersRef.current, aligned.speakers);
    const nextIds = { ...idsRef.current, evalIds: aligned.evalIds };
    setSpeakers(nextSpeakers);
    setIds(nextIds);
    setRankOrder(aligned.rankOrder);
    speakersRef.current = nextSpeakers;
    idsRef.current = nextIds;
    rankOrderRef.current = aligned.rankOrder;
    markDirtyAndSave({
      speakers: nextSpeakers,
      ids: nextIds,
      rankOrder: aligned.rankOrder,
      winner: winnerRef.current,
      rfd: rfdRef.current,
    });
  }, [debateSpeakerKey, markDirtyAndSave]);

  function selectFirstSpeaker(side: Winner, userId: string): void {
    const next = chooseFirstSpeaker(speakersRef.current, rankOrderRef.current, side, userId);
    const confirmed = [...new Set([...orderConfirmedRef.current, side])];
    orderConfirmedRef.current = confirmed;
    setOrderConfirmed(confirmed);
    speakersRef.current = next.speakers;
    rankOrderRef.current = next.rankOrder;
    setSpeakers(next.speakers);
    setRankOrder(next.rankOrder);
    markDirtyAndSave({
      ...next,
      ids: idsRef.current,
      winner: winnerRef.current,
      rfd: rfdRef.current,
    });
  }

  const orderComplete =
    debate.event === 'ld' ||
    (['aff', 'neg'] as const).every(
      (side) => !speakers[side === 'aff' ? 'aff2' : 'neg2'].userId || orderConfirmed.includes(side),
    );

  function updateWinner(w: Winner): void {
    setWinner(w);
    winnerRef.current = w;
    markDirtyAndSave({
      speakers: speakersRef.current,
      ids: idsRef.current,
      rankOrder: rankOrderRef.current,
      winner: w,
      rfd: rfdRef.current,
    });
  }

  function updateRfd(r: string): void {
    setRfd(r);
    rfdRef.current = r;
    markDirtyAndSave({
      speakers: speakersRef.current,
      ids: idsRef.current,
      rankOrder: rankOrderRef.current,
      winner: winnerRef.current,
      rfd: r,
    });
  }

  function updateSpeaker(pos: Position, patch: Partial<SpeakerFormState>): void {
    const next = { ...speakersRef.current, [pos]: { ...speakersRef.current[pos], ...patch } };
    let nextRank = rankOrderRef.current;
    if ('userId' in patch && !patch.userId) {
      nextRank = nextRank.filter((p) => p !== pos);
      setRankOrder(nextRank);
      rankOrderRef.current = nextRank;
    }
    speakersRef.current = next;
    setSpeakers(next);
    markDirtyAndSave({
      speakers: next,
      ids: idsRef.current,
      rankOrder: nextRank,
      winner: winnerRef.current,
      rfd: rfdRef.current,
    });
  }

  function assignRank(pos: Position, newRank: number): void {
    const next = rankOrderRef.current.filter((p) => p !== pos);
    next.splice(newRank - 1, 0, pos);
    rankOrderRef.current = next;
    setRankOrder(next);
    markDirtyAndSave({
      speakers: speakersRef.current,
      ids: idsRef.current,
      rankOrder: next,
      winner: winnerRef.current,
      rfd: rfdRef.current,
    });
  }

  function suggestByPoints(): void {
    const active = POSITIONS.filter((pos) => speakers[pos].userId !== '');
    const sorted = [...active].sort(
      (a, b) => scoringTotal(speakers[b]) - scoringTotal(speakers[a]),
    );
    setRankOrder(sorted);
    rankOrderRef.current = sorted;
    markDirtyAndSave({
      speakers: speakersRef.current,
      ids: idsRef.current,
      rankOrder: sorted,
      winner: winnerRef.current,
      rfd: rfdRef.current,
    });
  }

  function retrySync(): void {
    retryAttemptRef.current = 0;
    clearRetry();
    void saveToServerRef.current();
  }

  async function submit(): Promise<void> {
    if (
      submittingRef.current ||
      !orderComplete ||
      !canSubmitBallot(speakers, winner, rankOrder) ||
      !winner
    )
      return;
    submittingRef.current = true;
    setSubmitting(true);
    cancelDebouncedSave();
    clearRetry();
    try {
      // Let the earlier write finish, then submit the latest refs and acknowledged IDs.
      await savePromiseRef.current;
      cancelDebouncedSave();
      clearRetry();
      const input = prepareCurrentSave(Date.now());
      await saveBallot(input, acknowledgedRef.current);
      acknowledgedRef.current = input;
      clearLocalDraft(judgeId, debateId, storageRef.current);
      navigate('dashboard');
    } catch (error: unknown) {
      submittingRef.current = false;
      setSubmitting(false);
      setSyncStatus('error');
      setSyncError(errorMessage(error, 'Could not submit your ballot'));
    }
  }

  return {
    debate,
    students: students.map((student) => ({
      id: student.id,
      name: student.name,
      avatarUrl: student.avatarUrl,
    })),

    winner,
    rfd,
    speakers,
    rankOrder,
    activePositions: getActivePositions(speakers),
    allScored: isAllScored(speakers),
    speakersLocked: true,
    orderConfirmed,
    orderComplete,
    selectFirstSpeaker,
    canSubmit: orderComplete && canSubmitBallot(speakers, winner, rankOrder),
    submitting,
    syncStatus,
    syncError,
    retrySync,
    updateWinner,
    updateRfd,
    updateSpeaker,
    assignRank,
    suggestByPoints,
    submit,
  };
}

export function useBallotDraftLoader(debateId: string) {
  const debateLive = useDebate(debateId);
  const existingLive = useBallotDraftRecord(debateId);
  const debate = debateLive.read();
  const existing = existingLive.read();

  const initial = initBallotFormState(existing, debate);

  return { debate, existing, initial };
}
