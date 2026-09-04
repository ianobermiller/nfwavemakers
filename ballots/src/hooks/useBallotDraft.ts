import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { isPickerEligible } from '../lib/pickerUsers.ts';
import { navigate } from './useHashRoute.ts';
import { useDebouncedSave } from './useDebouncedSave.ts';
import { POSITIONS, type Position, type SpeakerFormState, type Winner } from '../types.ts';
import { scoringTotal } from '../utils.ts';
import {
  buildEvalPayload,
  canSubmitBallot,
  getActivePositions,
  initBallotFormState,
  isAllScored,
  type BallotFormInit,
  type BallotIds,
} from '../services/ballot.ts';

interface Props {
  initial: BallotFormInit;
  debateId?: Id<'debates'> | undefined;
}

export function useBallotDraft({ initial, debateId }: Props) {
  const [winner, setWinner] = useState(initial.winner);
  const [rfd, setRfd] = useState(initial.rfd);
  const [speakers, setSpeakers] = useState(initial.speakers);
  const [ids, setIds] = useState<BallotIds>(initial.ids);
  const [rankOrder, setRankOrder] = useState<Position[]>(initial.rankOrder);
  const [submitting, setSubmitting] = useState(false);

  const users = useQuery(api.users.list, { includeArchived: true });
  const selectedStudentIds = POSITIONS.map((pos) => speakers[pos].userId).filter(Boolean);
  const students = (users ?? []).filter(
    (u) => u.role === 'student' && isPickerEligible(u, selectedStudentIds),
  );

  const debate = useQuery(api.debates.get, debateId ? { debateId } : 'skip');
  const saveDraft = useMutation(api.ballots.saveDraft);

  const speakersLocked = debate != null;

  const { schedule: scheduleSave, cancel: cancelSave } = useDebouncedSave(
    () => {
      void saveDraft({
        ...(ids.ballotId ? { ballotId: ids.ballotId } : {}),
        ...(debateId ? { debateId } : {}),
        evals: buildEvalPayload(speakers, ids, rankOrder),
        reasonForDecision: rfd,
        ...(winner ? { winner } : {}),
      }).then((result) => {
        setIds({
          ballotId: result.ballotId,
          evalIds: {
            ...(result.evalIds['aff1'] ? { aff1: result.evalIds['aff1'] } : {}),
            ...(result.evalIds['aff2'] ? { aff2: result.evalIds['aff2'] } : {}),
            ...(result.evalIds['neg1'] ? { neg1: result.evalIds['neg1'] } : {}),
            ...(result.evalIds['neg2'] ? { neg2: result.evalIds['neg2'] } : {}),
          },
        });
      });
    },
    { flushOnUnmount: true },
  );

  function updateWinner(w: Winner): void {
    setWinner(w);
    scheduleSave();
  }

  function updateRfd(r: string): void {
    setRfd(r);
    scheduleSave();
  }

  function updateSpeaker(pos: Position, patch: Partial<SpeakerFormState>): void {
    setSpeakers((prev) => ({ ...prev, [pos]: { ...prev[pos], ...patch } }));
    if ('userId' in patch && !patch.userId) {
      setRankOrder((ro) => ro.filter((p) => p !== pos));
    }
    scheduleSave();
  }

  function assignRank(pos: Position, newRank: number): void {
    setRankOrder((prev) => {
      const next = prev.filter((p) => p !== pos);
      next.splice(newRank - 1, 0, pos);
      return next;
    });
    scheduleSave();
  }

  function suggestByPoints(): void {
    const active = POSITIONS.filter((pos) => speakers[pos].userId !== '');
    const sorted = [...active].sort(
      (a, b) => scoringTotal(speakers[b]) - scoringTotal(speakers[a]),
    );
    setRankOrder(sorted);
    scheduleSave();
  }

  async function submit(): Promise<void> {
    if (!canSubmitBallot(speakers, winner, rankOrder) || !winner) return;
    setSubmitting(true);
    cancelSave();
    await saveDraft({
      ...(ids.ballotId ? { ballotId: ids.ballotId } : {}),
      ...(debateId ? { debateId } : {}),
      evals: buildEvalPayload(speakers, ids, rankOrder),
      reasonForDecision: rfd,
      submittedAt: Date.now(),
      winner,
    });
    navigate('dashboard');
  }

  return {
    debate,
    students: students.map((s) => ({ id: s._id, name: s.name, avatarUrl: s.avatarUrl })),

    winner,
    rfd,
    speakers,
    rankOrder,
    activePositions: getActivePositions(speakers),
    allScored: isAllScored(speakers),
    speakersLocked,
    canSubmit: canSubmitBallot(speakers, winner, rankOrder),
    submitting,
    updateWinner,
    updateRfd,
    updateSpeaker,
    assignRank,
    suggestByPoints,
    submit,
  };
}

export function useBallotDraftLoader(debateId?: Id<'debates'>) {
  const debate = useQuery(api.debates.get, debateId ? { debateId } : 'skip');
  const existing = useQuery(api.ballots.draftForJudge, debateId ? { debateId } : {});

  const isLoading = existing === undefined || (debateId !== undefined && debate === undefined);
  const initial =
    existing === undefined || (debateId !== undefined && debate === undefined)
      ? undefined
      : initBallotFormState(existing, debate);

  return { debate, existing, initial, isLoading };
}
