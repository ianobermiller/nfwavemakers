import { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
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
  makeEmptySpeakers,
  makeNewBallotIds,
  type BallotIds,
} from '../services/ballot.ts';

interface Props {
  debateId: string | undefined;
  judgeId: string;
}

function compactDefined<T extends object>(
  obj: T,
): {
  [K in keyof T as T[K] extends undefined ? never : undefined extends T[K] ? never : K]: T[K];
} & {
  [K in keyof T as undefined extends T[K]
    ? Exclude<T[K], undefined> extends never
      ? never
      : K
    : never]?: Exclude<T[K], undefined>;
} {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as never;
}

export function useBallotDraft({ debateId, judgeId: _judgeId }: Props) {
  const [winner, setWinner] = useState<Winner | undefined>(undefined);
  const [rfd, setRfd] = useState('');
  const [speakers, setSpeakers] = useState<Record<Position, SpeakerFormState>>(makeEmptySpeakers);
  const [ids, setIds] = useState<BallotIds>(makeNewBallotIds);
  const [rankOrder, setRankOrder] = useState<Position[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const users = useQuery(api.users.list);
  const students = (users ?? []).filter((u) => u.role === 'student');

  const debate = useQuery(
    api.debates.get,
    debateId ? { debateId: debateId as Id<'debates'> } : 'skip',
  );
  const existing = useQuery(api.ballots.draftForJudge, {
    ...(debateId ? { debateId: debateId as Id<'debates'> } : {}),
  });
  const saveDraft = useMutation(api.ballots.saveDraft);

  const speakersLocked = debate != null;

  useEffect(() => {
    if (initialized) return;
    if (debateId && debate === undefined) return;
    if (existing === undefined) return;

    const init = initBallotFormState(existing, debate);
    setSpeakers(init.speakers);
    setRankOrder(init.rankOrder);
    setWinner(init.winner);
    setRfd(init.rfd);
    setIds(init.ids);
    setInitialized(true);
  }, [debateId, debate, existing, initialized]);

  const { schedule: scheduleSave, cancel: cancelSave } = useDebouncedSave(
    () => {
      void saveDraft({
        ...(ids.ballotId ? { ballotId: ids.ballotId } : {}),
        ...(debateId ? { debateId: debateId as Id<'debates'> } : {}),
        evals: buildEvalPayload(speakers, ids, rankOrder),
        reasonForDecision: rfd,
        ...(winner ? { winner } : {}),
      }).then((result) => {
        setIds({
          ballotId: result.ballotId,
          evalIds: compactDefined({
            aff1: result.evalIds['aff1'],
            aff2: result.evalIds['aff2'],
            neg1: result.evalIds['neg1'],
            neg2: result.evalIds['neg2'],
          }),
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
      ...(debateId ? { debateId: debateId as Id<'debates'> } : {}),
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
