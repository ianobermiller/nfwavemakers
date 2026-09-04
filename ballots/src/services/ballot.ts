import {
  POSITIONS,
  SCORE_CATEGORIES,
  type Position,
  type SpeakerFormState,
  type Winner,
} from '../types.ts';
import type { Id } from '../../convex/_generated/dataModel';

export interface BallotIds {
  ballotId?: Id<'ballots'>;
  evalIds: Partial<Record<Position, Id<'speakerEvals'>>>;
}

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
  return { evalIds: {} };
}

type ExistingSpeakerEval = {
  _id: Id<'speakerEvals'>;
  position: Position;
  rank?: number;
  delivery?: number;
  organization?: number;
  evidenceAndSupport?: number;
  refutation?: number;
  crossExamination?: number;
  conduct?: number;
  notes?: string;
  speaker: { _id: Id<'users'> } | null;
};

export type ExistingBallot = {
  _id: Id<'ballots'>;
  winner?: Winner;
  reasonForDecision?: string;
  speakerEvals: ExistingSpeakerEval[];
};

export type DebateTeams = {
  affTeam: Array<{ _id: Id<'users'> }>;
  negTeam: Array<{ _id: Id<'users'> }>;
};

export interface BallotFormInit {
  speakers: Record<Position, SpeakerFormState>;
  rankOrder: Position[];
  winner: Winner | undefined;
  rfd: string;
  ids: BallotIds;
}

export function initBallotFormState(
  existing: ExistingBallot | null | undefined,
  debate: DebateTeams | null | undefined,
): BallotFormInit {
  if (existing) {
    const ids: BallotIds = { ballotId: existing._id, evalIds: {} };
    const speakers = makeEmptySpeakers();

    for (const ev of existing.speakerEvals) {
      const pos = ev.position;
      if (!POSITIONS.includes(pos)) continue;
      ids.evalIds[pos] = ev._id;
      speakers[pos] = {
        userId: ev.speaker?._id ?? '',
        delivery: ev.delivery,
        organization: ev.organization,
        evidenceAndSupport: ev.evidenceAndSupport,
        refutation: ev.refutation,
        crossExamination: ev.crossExamination,
        conduct: ev.conduct,
        notes: ev.notes ?? '',
      };
    }

    const rankOrder = existing.speakerEvals
      .filter((ev) => ev.rank != null && speakers[ev.position]?.userId)
      .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
      .map((ev) => ev.position)
      .filter((pos) => POSITIONS.includes(pos));

    return {
      speakers,
      rankOrder,
      winner: existing.winner,
      rfd: existing.reasonForDecision ?? '',
      ids,
    };
  }

  const speakers = makeEmptySpeakers();

  if (debate) {
    const affTeam = debate.affTeam;
    const negTeam = debate.negTeam;
    if (affTeam[0]) speakers.aff1 = { ...makeEmptySpeaker(), userId: affTeam[0]._id };
    if (affTeam[1]) speakers.aff2 = { ...makeEmptySpeaker(), userId: affTeam[1]._id };
    if (negTeam[0]) speakers.neg1 = { ...makeEmptySpeaker(), userId: negTeam[0]._id };
    if (negTeam[1]) speakers.neg2 = { ...makeEmptySpeaker(), userId: negTeam[1]._id };
  }

  return { speakers, rankOrder: [], winner: undefined, rfd: '', ids: makeNewBallotIds() };
}

export function buildEvalPayload(
  speakers: Record<Position, SpeakerFormState>,
  ids: BallotIds,
  rankOrder: Position[],
) {
  return POSITIONS.map((pos) => {
    const sp = speakers[pos];
    const rankIdx = rankOrder.indexOf(pos);
    return {
      ...(ids.evalIds[pos] ? { evalId: ids.evalIds[pos] } : {}),
      position: pos,
      ...(rankIdx >= 0 ? { rank: rankIdx + 1 } : {}),
      ...(sp.delivery !== undefined ? { delivery: sp.delivery } : {}),
      ...(sp.organization !== undefined ? { organization: sp.organization } : {}),
      ...(sp.evidenceAndSupport !== undefined ? { evidenceAndSupport: sp.evidenceAndSupport } : {}),
      ...(sp.refutation !== undefined ? { refutation: sp.refutation } : {}),
      ...(sp.crossExamination !== undefined ? { crossExamination: sp.crossExamination } : {}),
      ...(sp.conduct !== undefined ? { conduct: sp.conduct } : {}),
      notes: sp.notes,
      ...(sp.userId ? { speakerId: sp.userId as Id<'users'> } : {}),
    };
  });
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
