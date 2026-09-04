import { v } from 'convex/values';

import type { MutationCtx } from './_generated/server';
import { internalMutation } from './_generated/server';
import { replaceParticipants } from './lib/debates';
import { normalizeEmail } from './lib/normalizeEmail';

const TEST_DATE = '2024-01-15';
const TEST_RESOLUTION = 'Resolved: Test resolution.';

async function cleanPreviousSeed(ctx: MutationCtx): Promise<void> {
  const candidates = await ctx.db
    .query('debates')
    .withIndex('by_date', (q) => q.eq('date', TEST_DATE))
    .collect();
  const debates = candidates.filter(
    (debate) => debate.resolution === TEST_RESOLUTION && debate.room === 'A1',
  );

  for (const debate of debates) {
    const participants = await ctx.db
      .query('debateParticipants')
      .withIndex('by_debate', (q) => q.eq('debateId', debate._id))
      .collect();
    const ballots = await ctx.db
      .query('ballots')
      .withIndex('by_debate', (q) => q.eq('debateId', debate._id))
      .collect();
    for (const ballot of ballots) {
      const evals = await ctx.db
        .query('speakerEvals')
        .withIndex('by_ballot', (q) => q.eq('ballotId', ballot._id))
        .collect();
      for (const evaluation of evals) await ctx.db.delete(evaluation._id);
      await ctx.db.delete(ballot._id);
    }
    for (const participant of participants) await ctx.db.delete(participant._id);
    await ctx.db.delete(debate._id);
  }

  for (const email of ['student@test.com', 'judge@test.com', 'admin@test.com']) {
    const user = await ctx.db
      .query('users')
      .withIndex('email', (q) => q.eq('email', email))
      .unique();
    if (user) await ctx.db.delete(user._id);
    const otp = await ctx.db
      .query('devOtps')
      .withIndex('by_email', (q) => q.eq('email', email))
      .unique();
    if (otp) await ctx.db.delete(otp._id);
  }
}

async function upsertUser(
  ctx: MutationCtx,
  email: string,
  name: string,
  role: 'student' | 'parent' | 'admin',
) {
  const normalized = normalizeEmail(email) ?? email;
  const existing = await ctx.db
    .query('users')
    .withIndex('email', (q) => q.eq('email', normalized))
    .unique();
  if (existing) {
    await ctx.db.patch(existing._id, { name, role });
    return existing._id;
  }
  return await ctx.db.insert('users', { email: normalized, name, role });
}

export const seed = internalMutation({
  args: {},
  returns: v.object({
    ballotId: v.id('ballots'),
    debateId: v.id('debates'),
    adminEmail: v.string(),
    judgeEmail: v.string(),
    studentEmail: v.string(),
  }),
  handler: async (ctx) => {
    await cleanPreviousSeed(ctx);
    const studentId = await upsertUser(ctx, 'student@example.com', 'Alice Student', 'student');
    const judgeId = await upsertUser(ctx, 'judge@example.com', 'Bob Judge', 'parent');
    await upsertUser(ctx, 'admin@example.com', 'Carol Admin', 'admin');

    const debateId = await ctx.db.insert('debates', {
      date: TEST_DATE,
      resolution: TEST_RESOLUTION,
      room: 'A1',
    });
    await replaceParticipants(ctx, debateId, [studentId], [], [judgeId]);

    const ballotId = await ctx.db.insert('ballots', {
      debateId,
      judgeId,
      reasonForDecision: 'Affirmative had stronger evidence.',
      submittedAt: Date.now(),
      winner: 'aff',
    });
    await ctx.db.insert('speakerEvals', {
      ballotId,
      conduct: 5,
      crossExamination: 4,
      delivery: 4,
      evidenceAndSupport: 5,
      notes: 'Strong opening. Good eye contact.',
      organization: 4,
      position: 'aff1',
      refutation: 3,
      speakerId: studentId,
    });

    return {
      ballotId,
      debateId,
      adminEmail: 'admin@example.com',
      judgeEmail: 'judge@example.com',
      studentEmail: 'student@example.com',
    };
  },
});
