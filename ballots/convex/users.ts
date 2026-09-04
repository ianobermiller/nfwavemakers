import { v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { getCurrentUser, getCurrentUserOrNull, requireAdmin } from './lib/auth';
import { compact } from './lib/compact';
import { normalizeEmail } from './lib/normalizeEmail';
import { isArchived, toUserSummary } from './lib/users';
import { roleValidator, userSummaryValidator } from './lib/validators';

export const ensureCurrent = mutation({
  args: {},
  returns: v.id('users'),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error('Not authenticated');
    }

    const linked = await ctx.db
      .query('users')
      .withIndex('by_auth_id', (q) => q.eq('authId', identity.subject))
      .unique();
    if (linked) {
      return linked._id;
    }

    const email = normalizeEmail(identity.email);
    if (!email) {
      throw new Error('Authenticated account has no email');
    }

    const existing = await ctx.db
      .query('users')
      .withIndex('email', (q) => q.eq('email', email))
      .unique();
    if (existing) {
      if (existing.authId && existing.authId !== identity.subject) {
        throw new Error('This email is already linked to another sign-in');
      }
      await ctx.db.patch(existing._id, {
        authId: identity.subject,
        emailVerificationTime: existing.emailVerificationTime ?? Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert(
      'users',
      compact({
        authId: identity.subject,
        email,
        emailVerificationTime: Date.now(),
        name: identity.name,
      }),
    );
  },
});

export const current = query({
  args: {},
  returns: v.union(userSummaryValidator, v.null()),
  handler: async (ctx) => {
    const user = await getCurrentUserOrNull(ctx);
    if (!user) {
      return null;
    }
    return await toUserSummary(ctx, user);
  },
});

export const list = query({
  args: { includeArchived: v.optional(v.boolean()) },
  returns: v.array(userSummaryValidator),
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);
    const users = await ctx.db.query('users').collect();
    const summaries = [];
    for (const user of users) {
      if (!args.includeArchived && isArchived(user)) continue;
      summaries.push(await toUserSummary(ctx, user));
    }
    summaries.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
    return summaries;
  },
});

export const setArchived = mutation({
  args: {
    archived: v.boolean(),
    userId: v.id('users'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    if (admin._id === args.userId) {
      throw new Error('You cannot archive your own account');
    }
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error('User not found');
    }
    await ctx.db.patch(args.userId, {
      archivedAt: args.archived ? Date.now() : undefined,
    });
    return null;
  },
});

export const updateProfile = mutation({
  args: {
    name: v.string(),
    role: roleValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const name = args.name.trim();
    if (!name) {
      throw new Error('Name is required');
    }
    if (user.role === 'admin' && args.role !== 'admin') {
      throw new Error('Admins cannot change their own role here');
    }
    const role = user.role === 'admin' ? 'admin' : args.role;
    await ctx.db.patch(user._id, { name, role });
    return null;
  },
});

export const generateAvatarUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await getCurrentUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveAvatar = mutation({
  args: { storageId: v.id('_storage') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (user.avatarStorageId) {
      await ctx.storage.delete(user.avatarStorageId);
    }
    await ctx.db.patch(user._id, { avatarStorageId: args.storageId });
    return null;
  },
});
