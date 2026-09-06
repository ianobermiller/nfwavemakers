import {
  POSITIONS,
  SCORE_CATEGORIES,
  type Position,
  type SpeakerFormState,
  type Winner,
} from '../types.ts';

export interface BallotIds {
  ballotId?: string;
  evalIds: Partial<Record<Position, string>>;
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

function makeEmptySpeakers(): Record<Position, SpeakerFormState> {
  return {
    aff1: makeEmptySpeaker(),
    aff2: makeEmptySpeaker(),
    neg1: makeEmptySpeaker(),
    neg2: makeEmptySpeaker(),
  };
}

function makeNewBallotIds(): BallotIds {
  return { evalIds: {} };
}

interface ExistingSpeakerEval {
  id: string;
  position: Position;
  rank?: number | undefined;
  delivery?: number | undefined;
  organization?: number | undefined;
  evidenceAndSupport?: number | undefined;
  refutation?: number | undefined;
  crossExamination?: number | undefined;
  conduct?: number | undefined;
  notes?: string | undefined;
  speaker: { id: string } | null;
}

export interface ExistingBallot {
  id: string;
  winner?: Winner | undefined;
  reasonForDecision?: string | undefined;
  speakerEvals: ExistingSpeakerEval[];
}

export interface DebateTeams {
  affTeam: { id: string }[];
  negTeam: { id: string }[];
}

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
    const ids: BallotIds = { ballotId: existing.id, evalIds: {} };
    const speakers = makeEmptySpeakers();

    for (const ev of existing.speakerEvals) {
      const pos = ev.position;
      if (!POSITIONS.includes(pos)) continue;
      ids.evalIds[pos] = ev.id;
      speakers[pos] = {
        userId: ev.speaker?.id ?? '',
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
      .filter((ev) => ev.rank != null && speakers[ev.position].userId)
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
    if (affTeam[0]) speakers.aff1 = { ...makeEmptySpeaker(), userId: affTeam[0].id };
    if (affTeam[1]) speakers.aff2 = { ...makeEmptySpeaker(), userId: affTeam[1].id };
    if (negTeam[0]) speakers.neg1 = { ...makeEmptySpeaker(), userId: negTeam[0].id };
    if (negTeam[1]) speakers.neg2 = { ...makeEmptySpeaker(), userId: negTeam[1].id };
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
      ...(sp.userId ? { speakerId: sp.userId } : {}),
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
