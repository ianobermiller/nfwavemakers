import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import { compact } from './compact';

export interface UserSummary {
  _id: Id<'users'>;
  avatarUrl: string | null;
  email?: string;
  name?: string;
  role?: 'admin' | 'parent' | 'student';
}

export async function toUserSummary(
  ctx: MutationCtx | QueryCtx,
  user: Doc<'users'>,
): Promise<UserSummary> {
  const avatarUrl = user.avatarStorageId
    ? await ctx.storage.getUrl(user.avatarStorageId)
    : null;
  return compact({
    _id: user._id,
    avatarUrl,
    email: user.email,
    name: user.name,
    role: user.role,
  });
}

export async function loadUserSummary(
  ctx: MutationCtx | QueryCtx,
  userId: Id<'users'>,
): Promise<UserSummary | null> {
  const user = await ctx.db.get(userId);
  if (!user) {
    return null;
  }
  return await toUserSummary(ctx, user);
}
