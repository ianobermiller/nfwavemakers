import type { Position, Winner } from '../types.ts';

interface SaveEvalInput {
  conduct?: number;
  crossExamination?: number;
  delivery?: number;
  evalId?: string;
  evidenceAndSupport?: number;
  notes: string;
  organization?: number;
  position: Position;
  rank?: number;
  refutation?: number;
  speakerId?: string;
}

interface BallotSaveInput {
  ballotId?: string;
  debateId: string;
  evals: SaveEvalInput[];
  reasonForDecision: string;
  orderConfirmed?: Winner[];
  submittedAt?: number;
  winner?: Winner;
}

export type PreparedBallotSave = Omit<BallotSaveInput, 'ballotId' | 'evals'> & {
  ballotId: string;
  evals: (SaveEvalInput & { evalId: string })[];
};

/** Reserve IDs before I/O; retries upsert the same rows even if the response was lost. */
export function prepareBallotSave(
  input: BallotSaveInput,
  createId: () => string,
): PreparedBallotSave {
  return {
    ...input,
    ballotId: input.ballotId ?? createId(),
    evals: input.evals.map((evaluation) => ({
      ...evaluation,
      evalId: evaluation.evalId ?? createId(),
    })),
  };
}

function ballotBody(input: PreparedBallotSave) {
  return {
    debate: input.debateId,
    reason_for_decision: input.reasonForDecision.trim(),
    speaker_order_confirmed: input.orderConfirmed ?? [],
    // A late draft save must never clear a successfully submitted ballot.
    ...(input.submittedAt ? { submitted_at: new Date(input.submittedAt).toISOString() } : {}),
    winner: input.winner ?? '',
  };
}

function evaluationBody(
  input: PreparedBallotSave,
  evaluation: PreparedBallotSave['evals'][number],
) {
  return {
    ballot: input.ballotId,
    conduct: evaluation.conduct ?? null,
    cross_examination: evaluation.crossExamination ?? null,
    delivery: evaluation.delivery ?? null,
    evidence_and_support: evaluation.evidenceAndSupport ?? null,
    notes: evaluation.notes.trim(),
    organization: evaluation.organization ?? null,
    position: evaluation.position,
    rank: evaluation.rank ?? null,
    refutation: evaluation.refutation ?? null,
    speaker: evaluation.speakerId ?? '',
  };
}

/** Compare normalized persisted fields, independently for each row in the atomic batch. */
export function planBallotSave(input: PreparedBallotSave, acknowledged?: PreparedBallotSave) {
  const previous = acknowledged?.ballotId === input.ballotId ? acknowledged : undefined;
  const body = ballotBody(input);
  const previousEvals = new Map(
    previous?.evals.map((evaluation) => [evaluation.evalId, evaluation]),
  );
  return {
    ballot:
      !previous || JSON.stringify(body) !== JSON.stringify(ballotBody(previous)) ? body : null,
    evals: input.evals.flatMap((evaluation) => {
      const body = evaluationBody(input, evaluation);
      const old = previousEvals.get(evaluation.evalId);
      return previous &&
        old &&
        JSON.stringify(body) === JSON.stringify(evaluationBody(previous, old))
        ? []
        : [{ id: evaluation.evalId, body }];
    }),
  };
}
