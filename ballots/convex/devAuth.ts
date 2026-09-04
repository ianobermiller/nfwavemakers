import { v } from 'convex/values';

import { internalMutation, query } from './_generated/server';
import { normalizeEmail } from './lib/normalizeEmail';

function isLocalSite(): boolean {
  const siteUrl = process.env['SITE_URL'] ?? '';
  return siteUrl.includes('localhost') || siteUrl.includes('127.0.0.1');
}

export const storeOtp = internalMutation({
  args: { email: v.string(), otp: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email) ?? args.email;
    const existing = await ctx.db
      .query('devOtps')
      .withIndex('by_email', (q) => q.eq('email', email))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { otp: args.otp });
    } else {
      await ctx.db.insert('devOtps', { email, otp: args.otp });
    }
    return null;
  },
});

export const getOtp = query({
  args: { email: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    if (!isLocalSite()) {
      return null;
    }
    const email = normalizeEmail(args.email) ?? args.email;
    const row = await ctx.db
      .query('devOtps')
      .withIndex('by_email', (q) => q.eq('email', email))
      .unique();
    return row?.otp ?? null;
  },
});
