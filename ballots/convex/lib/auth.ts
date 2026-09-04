import type { Doc } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';

export async function getCurrentUser(ctx: MutationCtx | QueryCtx): Promise<Doc<'users'>> {
  const user = await getCurrentUserOrNull(ctx);
  if (!user) {
    throw new Error('Not authenticated');
  }
  return user;
}

export async function getCurrentUserOrNull(
  ctx: MutationCtx | QueryCtx,
): Promise<Doc<'users'> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }
  return await ctx.db
    .query('users')
    .withIndex('by_auth_id', (q) => q.eq('authId', identity.subject))
    .unique();
}

export async function requireAdmin(ctx: MutationCtx | QueryCtx): Promise<Doc<'users'>> {
  const user = await getCurrentUser(ctx);
  if (user.role !== 'admin') {
    throw new Error('Admin access required');
  }
  return user;
}
