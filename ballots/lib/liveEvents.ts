import type { Ballot, Debate } from '../data/model.ts';

export interface LiveRecord {
  id: string;
  [field: string]: unknown;
}

export function debateHasUser(debate: Debate | null | undefined, userId: string): boolean {
  return [...(debate?.affTeam ?? []), ...(debate?.negTeam ?? []), ...(debate?.judges ?? [])].some(
    (user) => user.id === userId,
  );
}

function ballotHasUser(ballot: Ballot, userId: string): boolean {
  return (
    ballot.judge?.id === userId ||
    debateHasUser(ballot.debate, userId) ||
    ballot.speakerEvals.some((evaluation) => evaluation.speaker?.id === userId)
  );
}

/** Update/delete events only carry the new record, so retain membership from loaded rows too. */
export function affectsBallots(
  collection: string,
  record: LiveRecord,
  ballots: Ballot[],
  scope: { kind: 'ballot' | 'debate'; id: string },
): boolean {
  if (collection === 'users') return ballots.some((ballot) => ballotHasUser(ballot, record.id));
  if (collection === 'debates') {
    return scope.kind === 'debate'
      ? record.id === scope.id
      : ballots.some((ballot) => ballot.debate?.id === record.id);
  }
  if (collection === 'speaker_evals') {
    return (
      ballots.some((ballot) =>
        ballot.speakerEvals.some((evaluation) => evaluation.id === record.id),
      ) ||
      (scope.kind === 'ballot'
        ? record['ballot'] === scope.id
        : ballots.some((ballot) => ballot.id === record['ballot']))
    );
  }
  return scope.kind === 'ballot'
    ? record.id === scope.id
    : record['debate'] === scope.id || ballots.some((ballot) => ballot.id === record.id);
}
