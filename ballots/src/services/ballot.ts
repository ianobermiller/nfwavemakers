import { id, type TransactionChunk } from '@instantdb/react';
import { db } from '../db.ts';
import { POSITIONS, SCORE_CATEGORIES, type Position, type SpeakerFormState, type Winner } from '../types.ts';

export interface BallotIds {
  ballotId: string;
  evalIds: Record<Position, string>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTxChunk = TransactionChunk<any, any>;

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

export function isAllRanked(speakers: Record<Position, SpeakerFormState>, rankOrder: Position[]): boolean {
  const active = getActivePositions(speakers);
  return active.length > 0 && rankOrder.length === active.length;
}

export function canSubmitBallot(
  speakers: Record<Position, SpeakerFormState>,
  winner: Winner | undefined,
  rankOrder: Position[],
): boolean {
  return winner !== undefined && isAllScored(speakers) && isAllRanked(speakers, rankOrder);
}
