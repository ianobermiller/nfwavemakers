import { useCallback, useEffect, useRef, useState } from 'react';
import { saveBallot } from '../data/api.ts';
import { errorMessage } from '../data/pocketbase.ts';
import { isPickerEligible } from '../lib/pickerUsers.ts';
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
  getActivePositions,
  initBallotFormState,
  isAllScored,
  type BallotFormInit,
  type BallotIds,
  type DebateTeams,
} from '../services/ballot.ts';
import { useBallotDraft as useBallotDraftRecord, useDebate, useUsers } from './data.ts';

export type BallotSyncStatus = 'saved' | 'saving' | 'pending' | 'error';

interface Props {
  initial: BallotFormInit;
  judgeId: string;
  debateId?: string | undefined;
  storage?: DraftStorage;
}

const RETRY_DELAYS_MS = [2_000, 5_000, 15_000, 30_000];

export function useBallotDraft({
  initial: serverInitial,
  judgeId,
  debateId,
  storage = browserDraftStorage(),
}: Props) {
  // The form loader suspends until these queries resolve, so reading here does not suspend.
  const users = useUsers(true).read();
  const debate = useDebate(debateId).read();

  const [boot] = useState(() => restoreBallotFormState(serverInitial, judgeId, debateId, storage));
  const initial = boot.initial;
  const startedFromLocal = boot.restoredFromLocal;

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
  const savingRef = useRef(false);
  const retryAttemptRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageRef = useRef(storage);
  const scheduleAfterSaveRef = useRef<() => void>(() => {});
  const saveToServerRef = useRef<() => Promise<void>>(async () => {});

  const selectedStudentIds = POSITIONS.map((pos) => speakers[pos].userId).filter(Boolean);
  const students = users.filter(
    (u) => u.role === 'student' && isPickerEligible(u, selectedStudentIds),
  );
  const speakersLocked = debate != null;

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

  const saveToServer = useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    clearRetry();
    const generation = dirtyGenerationRef.current;
    setSyncStatus('saving');

    const speakersToSave = speakersRef.current;
    const idsToSave = idsRef.current;
    const rankOrderToSave = rankOrderRef.current;
    const winnerToSave = winnerRef.current;
    const rfdToSave = rfdRef.current;

    try {
      const result = await saveBallot({
        ...(idsToSave.ballotId ? { ballotId: idsToSave.ballotId } : {}),
        ...(debateId ? { debateId } : {}),
        evals: buildEvalPayload(speakersToSave, idsToSave, rankOrderToSave),
        reasonForDecision: rfdToSave,
        ...(winnerToSave ? { winner: winnerToSave } : {}),
      });
      const nextIds: BallotIds = {
        ballotId: result.ballotId,
        evalIds: {
          ...(result.evalIds['aff1'] ? { aff1: result.evalIds['aff1'] } : {}),
          ...(result.evalIds['aff2'] ? { aff2: result.evalIds['aff2'] } : {}),
          ...(result.evalIds['neg1'] ? { neg1: result.evalIds['neg1'] } : {}),
          ...(result.evalIds['neg2'] ? { neg2: result.evalIds['neg2'] } : {}),
        },
      };
      idsRef.current = nextIds;
      setIds(nextIds);
      persistLocal({
        speakers: speakersToSave,
        ids: nextIds,
        rankOrder: rankOrderToSave,
        winner: winnerToSave,
        rfd: rfdToSave,
      });
      retryAttemptRef.current = 0;
      setSyncError(undefined);
      if (dirtyGenerationRef.current === generation) {
        setSyncStatus('saved');
      } else {
        setSyncStatus('pending');
      }
    } catch (error: unknown) {
      setSyncStatus('error');
      setSyncError(errorMessage(error, 'Could not save your ballot'));
      const delay = RETRY_DELAYS_MS[Math.min(retryAttemptRef.current, RETRY_DELAYS_MS.length - 1)]!;
      retryAttemptRef.current += 1;
      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null;
        void saveToServerRef.current();
      }, delay);
    } finally {
      savingRef.current = false;
      if (dirtyGenerationRef.current !== generation) {
        scheduleAfterSaveRef.current();
      }
    }
  }, [clearRetry, debateId, persistLocal]);

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
    return () => clearRetry();
  }, [clearRetry]);

  const debateSpeakerKey = debate
    ? `${debate.affTeam.map((user) => user.id).join('|')}:${debate.negTeam.map((user) => user.id).join('|')}`
    : '';

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
    if (!canSubmitBallot(speakers, winner, rankOrder) || !winner) return;
    setSubmitting(true);
    cancelDebouncedSave();
    clearRetry();
    try {
      await saveBallot({
        ...(ids.ballotId ? { ballotId: ids.ballotId } : {}),
        ...(debateId ? { debateId } : {}),
        evals: buildEvalPayload(speakers, ids, rankOrder),
        reasonForDecision: rfd,
        submittedAt: Date.now(),
        winner,
      });
      clearLocalDraft(judgeId, debateId, storageRef.current);
      navigate('dashboard');
    } catch (error: unknown) {
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
    speakersLocked,
    canSubmit: canSubmitBallot(speakers, winner, rankOrder),
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

export function useBallotDraftLoader(debateId?: string) {
  const debateLive = useDebate(debateId);
  const existingLive = useBallotDraftRecord(debateId);
  const usersLive = useUsers(true);
  const debate = debateLive.read();
  const existing = existingLive.read();
  // The editor also reads users. Wait here so it can mount without suspending again.
  usersLive.read();

  const initial = initBallotFormState(existing, debate);

  return { debate, existing, initial };
}
