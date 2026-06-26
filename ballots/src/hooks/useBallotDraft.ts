import { useEffect, useState } from 'react';
import { db } from '../db.ts';
import { navigate } from './useHashRoute.ts';
import { useDebouncedSave } from './useDebouncedSave.ts';
import { POSITIONS, type Position, type SpeakerFormState, type Winner } from '../types.ts';
import { scoringTotal } from '../utils.ts';
import {
  buildBallotTxs,
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

export function useBallotDraft({ debateId, judgeId }: Props) {
  const [winner, setWinner] = useState<Winner | undefined>(undefined);
  const [rfd, setRfd] = useState('');
  const [speakers, setSpeakers] = useState<Record<Position, SpeakerFormState>>(makeEmptySpeakers);
  const [ids, setIds] = useState<BallotIds>(makeNewBallotIds);
  const [rankOrder, setRankOrder] = useState<Position[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: usersData } = db.useQuery({ $users: {} });
  const students = (usersData?.$users ?? []).filter((u) => u.role === 'student');

  const { data: debateData } = db.useQuery(
    debateId ? { debates: { $: { where: { id: debateId } }, affTeam: {}, negTeam: {} } } : null,
  );

  const { data: existingData } = db.useQuery(
    debateId
      ? {
          ballots: {
            $: { where: { 'judge.id': judgeId, 'debate.id': debateId } },
            speakerEvals: { speaker: {} },
          },
        }
      : { ballots: { $: { where: { 'judge.id': judgeId } }, speakerEvals: { speaker: {} } } },
  );

  const debate = debateData?.debates?.[0];

  const speakersLocked = debate != null;

  useEffect(() => {
    if (initialized) return;
    if (debateId && !debate) return;
    if (existingData === undefined) return;

    const existingBallots = existingData.ballots ?? [];
    const existing = debateId
      ? existingBallots[0]
      : existingBallots.find((b) => b.submittedAt == null);

    const init = initBallotFormState(existing, debate);
    setSpeakers(init.speakers);
    setRankOrder(init.rankOrder);
    setWinner(init.winner);
    setRfd(init.rfd);
    setIds(init.ids);
    setInitialized(true);
  }, [debateId, debate, existingData, initialized]);

  const { schedule: scheduleSave, cancel: cancelSave } = useDebouncedSave(
    () => {
      void db.transact(buildBallotTxs(winner, rfd, speakers, ids, rankOrder, judgeId, debateId));
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
    await db.transact(
      buildBallotTxs(winner, rfd, speakers, ids, rankOrder, judgeId, debateId, Date.now()),
    );
    navigate('dashboard');
  }

  return {
    debate,
    students,

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
