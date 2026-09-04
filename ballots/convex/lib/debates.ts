import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import { loadUserSummary, type UserSummary } from './users';

export interface DebateTeams {
  affTeam: UserSummary[];
  judges: UserSummary[];
  negTeam: UserSummary[];
}

export function isActiveDebate(debate: Doc<'debates'>): boolean {
  return debate.deletedAt == null;
}

export async function loadDebateTeams(
  ctx: MutationCtx | QueryCtx,
  debateId: Id<'debates'>,
): Promise<DebateTeams> {
  const participants = await ctx.db
    .query('debateParticipants')
    .withIndex('by_debate', (q) => q.eq('debateId', debateId))
    .collect();

  const aff = participants.filter((p) => p.side === 'aff').sort((a, b) => a.slot - b.slot);
  const neg = participants.filter((p) => p.side === 'neg').sort((a, b) => a.slot - b.slot);
  const judges = participants.filter((p) => p.side === 'judge').sort((a, b) => a.slot - b.slot);

  const toUsers = async (rows: typeof participants): Promise<UserSummary[]> => {
    const users: UserSummary[] = [];
    for (const row of rows) {
      const user = await loadUserSummary(ctx, row.userId);
      if (user) {
        users.push(user);
      }
    }
    return users;
  };

  return {
    affTeam: await toUsers(aff),
    judges: await toUsers(judges),
    negTeam: await toUsers(neg),
  };
}

export async function replaceParticipants(
  ctx: MutationCtx,
  debateId: Id<'debates'>,
  affTeam: Id<'users'>[],
  negTeam: Id<'users'>[],
  judges: Id<'users'>[],
): Promise<void> {
  const existing = await ctx.db
    .query('debateParticipants')
    .withIndex('by_debate', (q) => q.eq('debateId', debateId))
    .collect();
  for (const row of existing) {
    await ctx.db.delete(row._id);
  }

  const insertSide = async (
    side: 'aff' | 'neg' | 'judge',
    userIds: Id<'users'>[],
  ): Promise<void> => {
    for (let slot = 0; slot < userIds.length; slot += 1) {
      const userId = userIds[slot];
      if (!userId) continue;
      await ctx.db.insert('debateParticipants', { debateId, side, slot, userId });
    }
  };

  await insertSide('aff', affTeam);
  await insertSide('neg', negTeam);
  await insertSide('judge', judges);
}
