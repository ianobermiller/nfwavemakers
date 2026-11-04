/**
 * Batch-fetch debates and speaker scores for a ballot list.
 * Callers pass every id once; loaders run at most one time each.
 */
export interface BallotRelationLoaders<Debate, Eval> {
  loadDebates: (debateIds: string[]) => Promise<Map<string, Debate>>;
  loadEvals: (ballotIds: string[]) => Promise<Map<string, Eval[]>>;
}

export function uniqueIds(values: Iterable<string | null | undefined>): string[] {
  return [...new Set([...values].filter((id): id is string => !!id))];
}

/** PocketBase OR of `field = value` for each id. Null when there is nothing to fetch. */
export function orEqualFilter(
  field: string,
  values: string[],
  filter: (expr: string, params: { value: string }) => string,
): string | null {
  const ids = uniqueIds(values);
  if (ids.length === 0) return null;
  return ids.map((value) => filter(`${field} = {:value}`, { value })).join(' || ');
}

export async function fetchBallotRelations<Debate, Eval>(
  debateIds: string[],
  ballotIds: string[],
  includeEvals: boolean,
  loaders: BallotRelationLoaders<Debate, Eval>,
): Promise<{ debates: Map<string, Debate>; evalsByBallot: Map<string, Eval[]> }> {
  const uniqueDebates = uniqueIds(debateIds);
  const uniqueBallots = uniqueIds(ballotIds);

  const [debates, evalsByBallot] = await Promise.all([
    uniqueDebates.length === 0
      ? Promise.resolve(new Map<string, Debate>())
      : loaders.loadDebates(uniqueDebates),
    !includeEvals || uniqueBallots.length === 0
      ? Promise.resolve(new Map<string, Eval[]>())
      : loaders.loadEvals(uniqueBallots),
  ]);

  return { debates, evalsByBallot };
}
