import { id, type TransactionChunk } from '@instantdb/react';
import { db } from '../db.ts';
import {
  POSITIONS,
  SCORE_CATEGORIES,
  type Position,
  type SpeakerFormState,
  type Winner,
} from '../types.ts';

export interface BallotIds {
  ballotId: string;
  evalIds: Record<Position, string>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTxChunk = TransactionChunk<any, any>;

function makeEmptySpeaker(): SpeakerFormState {
  return {
    userId: '',
    delivery: undefined,
    organization: undefined,
    evidenceAndSupport: undefined,
    refutation: undefined,
    crossExamination: undefined,
    conduct: undefined,
    notes: '',
  };
}

export function makeEmptySpeakers(): Record<Position, SpeakerFormState> {
  return {
    aff1: makeEmptySpeaker(),
    aff2: makeEmptySpeaker(),
    neg1: makeEmptySpeaker(),
    neg2: makeEmptySpeaker(),
  };
}

export function makeNewBallotIds(): BallotIds {
  return {
    ballotId: id(),
    evalIds: { aff1: id(), aff2: id(), neg1: id(), neg2: id() },
  };
}

export function buildBallotTxs(
  winner: Winner | undefined,
  rfd: string,
  speakers: Record<Position, SpeakerFormState>,
  ids: BallotIds,
  rankOrder: Position[],
  judgeId: string,
  debateId: string | undefined,
  submittedAt?: number,
): AnyTxChunk[] {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const ballotChunk = db.tx.ballots[ids.ballotId]!;
  const txs: AnyTxChunk[] = [
    ballotChunk.update({
      winner: winner ?? null,
      reasonForDecision: rfd || null,
      ...(submittedAt !== undefined ? { submittedAt } : {}),
    }),
    ballotChunk.link({ judge: judgeId }),
  ];

  if (debateId) {
    txs.push(ballotChunk.link({ debate: debateId }));
  }

  for (const pos of POSITIONS) {
    const sp = speakers[pos];
    const evalId = ids.evalIds[pos];
    const rankIdx = rankOrder.indexOf(pos);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const evalChunk = db.tx.speakerEvals[evalId]!;
    txs.push(
      evalChunk.update({
        position: pos,
        rank: rankIdx >= 0 ? rankIdx + 1 : null,
        delivery: sp.delivery ?? null,
        organization: sp.organization ?? null,
        evidenceAndSupport: sp.evidenceAndSupport ?? null,
        refutation: sp.refutation ?? null,
        crossExamination: sp.crossExamination ?? null,
        conduct: sp.conduct ?? null,
        notes: sp.notes || null,
      }),
    );
    txs.push(evalChunk.link({ ballot: ids.ballotId }));
    if (sp.userId) {
      txs.push(evalChunk.link({ speaker: sp.userId }));
    }
  }

  return txs;
}

export function getActivePositions(speakers: Record<Position, SpeakerFormState>): Position[] {
  return POSITIONS.filter((pos) => speakers[pos].userId !== '');
}

export function isAllScored(speakers: Record<Position, SpeakerFormState>): boolean {
  return getActivePositions(speakers).every((pos) =>
    SCORE_CATEGORIES.every((cat) => speakers[pos][cat.key] !== undefined),
  );
}

function isAllRanked(speakers: Record<Position, SpeakerFormState>, rankOrder: Position[]): boolean {
  const active = getActivePositions(speakers);
  if (active.length === 0) return false;
  const ranked = new Set(rankOrder);
  return active.every((pos) => ranked.has(pos));
}

export function canSubmitBallot(
  speakers: Record<Position, SpeakerFormState>,
  winner: Winner | undefined,
  rankOrder: Position[],
): boolean {
  return winner !== undefined && isAllScored(speakers) && isAllRanked(speakers, rankOrder);
}

interface ExistingSpeakerEval {
  id: string;
  position: string;
  rank?: number | null;
  delivery?: number | null;
  organization?: number | null;
  evidenceAndSupport?: number | null;
  refutation?: number | null;
  crossExamination?: number | null;
  conduct?: number | null;
  notes?: string | null;
  speaker: { id: string } | undefined;
}

interface ExistingBallot {
  id: string;
  winner?: string | null;
  reasonForDecision?: string | null;
  speakerEvals?: ExistingSpeakerEval[];
}

interface DebateTeams {
  affTeam?: Array<{ id: string }>;
  negTeam?: Array<{ id: string }>;
}

export interface BallotFormInit {
  speakers: Record<Position, SpeakerFormState>;
  rankOrder: Position[];
  winner: Winner | undefined;
  rfd: string;
  ids: BallotIds;
}

export function initBallotFormState(
  existing: ExistingBallot | undefined,
  debate: DebateTeams | undefined,
): BallotFormInit {
  if (existing) {
    const ids: BallotIds = {
      ballotId: existing.id,
      evalIds: { aff1: id(), aff2: id(), neg1: id(), neg2: id() },
    };
    const speakers = makeEmptySpeakers();

    for (const ev of existing.speakerEvals ?? []) {
      const pos = ev.position as Position;
      if (!POSITIONS.includes(pos)) continue;
      ids.evalIds[pos] = ev.id;
      speakers[pos] = {
        userId: ev.speaker?.id ?? '',
        delivery: ev.delivery ?? undefined,
        organization: ev.organization ?? undefined,
        evidenceAndSupport: ev.evidenceAndSupport ?? undefined,
        refutation: ev.refutation ?? undefined,
        crossExamination: ev.crossExamination ?? undefined,
        conduct: ev.conduct ?? undefined,
        notes: ev.notes ?? '',
      };
    }

    const rankOrder = (existing.speakerEvals ?? [])
      .filter((ev) => ev.rank != null && speakers[ev.position as Position]?.userId)
      .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
      .map((ev) => ev.position as Position)
      .filter((pos) => POSITIONS.includes(pos));

    return {
      speakers,
      rankOrder,
      winner: (existing.winner as Winner | undefined) ?? undefined,
      rfd: existing.reasonForDecision ?? '',
      ids,
    };
  }

  const speakers = makeEmptySpeakers();

  if (debate) {
    const affTeam = debate.affTeam ?? [];
    const negTeam = debate.negTeam ?? [];
    if (affTeam[0]) speakers.aff1 = { ...makeEmptySpeaker(), userId: affTeam[0].id };
    if (affTeam[1]) speakers.aff2 = { ...makeEmptySpeaker(), userId: affTeam[1].id };
    if (negTeam[0]) speakers.neg1 = { ...makeEmptySpeaker(), userId: negTeam[0].id };
    if (negTeam[1]) speakers.neg2 = { ...makeEmptySpeaker(), userId: negTeam[1].id };
  }

  return { speakers, rankOrder: [], winner: undefined, rfd: '', ids: makeNewBallotIds() };
}
