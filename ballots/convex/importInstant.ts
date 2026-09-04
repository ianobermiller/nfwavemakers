import { v } from 'convex/values';

import type { Id } from './_generated/dataModel';
import { internalMutation } from './_generated/server';
import { compact } from './lib/compact';
import { replaceParticipants } from './lib/debates';
import { normalizeEmail } from './lib/normalizeEmail';

const userDump = v.object({
  email: v.optional(v.string()),
  instantId: v.string(),
  name: v.optional(v.string()),
  role: v.optional(v.union(v.literal('admin'), v.literal('student'), v.literal('parent'))),
});

const debateDump = v.object({
  affInstantIds: v.array(v.string()),
  date: v.string(),
  deletedAt: v.optional(v.number()),
  instantId: v.string(),
  judgeInstantIds: v.array(v.string()),
  negInstantIds: v.array(v.string()),
  resolution: v.optional(v.string()),
  room: v.string(),
});

const evalDump = v.object({
  conduct: v.optional(v.number()),
  crossExamination: v.optional(v.number()),
  delivery: v.optional(v.number()),
  evidenceAndSupport: v.optional(v.number()),
  instantId: v.string(),
  notes: v.optional(v.string()),
  organization: v.optional(v.number()),
  position: v.union(v.literal('aff1'), v.literal('aff2'), v.literal('neg1'), v.literal('neg2')),
  rank: v.optional(v.number()),
  refutation: v.optional(v.number()),
  speakerInstantId: v.optional(v.string()),
});

const ballotDump = v.object({
  debateInstantId: v.optional(v.string()),
  deletedAt: v.optional(v.number()),
  evals: v.array(evalDump),
  instantId: v.string(),
  judgeInstantId: v.string(),
  reasonForDecision: v.optional(v.string()),
  submittedAt: v.optional(v.number()),
  winner: v.optional(v.union(v.literal('aff'), v.literal('neg'))),
});

export const importDump = internalMutation({
  args: {
    ballots: v.array(ballotDump),
    debates: v.array(debateDump),
    users: v.array(userDump),
  },
  returns: v.object({
    ballots: v.number(),
    debates: v.number(),
    users: v.number(),
  }),
  handler: async (ctx, args) => {
    const usersByInstantId = new Map<string, Id<'users'>>();
    let users = 0;

    for (const user of args.users) {
      const email = normalizeEmail(user.email);
      const existingByInstant = await ctx.db
        .query('users')
        .withIndex('by_instant_id', (q) => q.eq('instantId', user.instantId))
        .unique();
      if (existingByInstant) {
        usersByInstantId.set(user.instantId, existingByInstant._id);
        continue;
      }

      const existingByEmail = email
        ? await ctx.db
            .query('users')
            .withIndex('email', (q) => q.eq('email', email))
            .unique()
        : null;

      if (existingByEmail) {
        await ctx.db.patch(existingByEmail._id, {
          email,
          emailVerificationTime: existingByEmail.emailVerificationTime ?? Date.now(),
          instantId: user.instantId,
          name: existingByEmail.name ?? user.name,
          role: existingByEmail.role ?? user.role,
        });
        usersByInstantId.set(user.instantId, existingByEmail._id);
        users += 1;
        continue;
      }

      const userId = await ctx.db.insert(
        'users',
        compact({
          email,
          emailVerificationTime: email ? Date.now() : undefined,
          instantId: user.instantId,
          name: user.name,
          role: user.role,
        }),
      );
      usersByInstantId.set(user.instantId, userId);
      users += 1;
    }

    const requireUser = (instantId: string): Id<'users'> => {
      const userId = usersByInstantId.get(instantId);
      if (!userId) {
        throw new Error(`Unknown Instant user ${instantId}`);
      }
      return userId;
    };

    const debatesByInstantId = new Map<string, Id<'debates'>>();
    let debates = 0;
    for (const debate of args.debates) {
      const existing = await ctx.db
        .query('debates')
        .withIndex('by_instant_id', (q) => q.eq('instantId', debate.instantId))
        .unique();
      if (existing) {
        debatesByInstantId.set(debate.instantId, existing._id);
        continue;
      }
      const debateId = await ctx.db.insert(
        'debates',
        compact({
          date: debate.date,
          deletedAt: debate.deletedAt,
          instantId: debate.instantId,
          resolution: debate.resolution,
          room: debate.room,
        }),
      );
      await replaceParticipants(
        ctx,
        debateId,
        debate.affInstantIds.map(requireUser),
        debate.negInstantIds.map(requireUser),
        debate.judgeInstantIds.map(requireUser),
      );
      debatesByInstantId.set(debate.instantId, debateId);
      debates += 1;
    }

    let ballots = 0;
    for (const ballot of args.ballots) {
      const existing = await ctx.db
        .query('ballots')
        .withIndex('by_instant_id', (q) => q.eq('instantId', ballot.instantId))
        .unique();
      if (existing) {
        continue;
      }
      const ballotId = await ctx.db.insert(
        'ballots',
        compact({
          debateId: ballot.debateInstantId
            ? debatesByInstantId.get(ballot.debateInstantId)
            : undefined,
          deletedAt: ballot.deletedAt,
          instantId: ballot.instantId,
          judgeId: requireUser(ballot.judgeInstantId),
          reasonForDecision: ballot.reasonForDecision,
          submittedAt: ballot.submittedAt,
          winner: ballot.winner,
        }),
      );
      for (const ev of ballot.evals) {
        await ctx.db.insert(
          'speakerEvals',
          compact({
            ballotId,
            conduct: ev.conduct,
            crossExamination: ev.crossExamination,
            delivery: ev.delivery,
            evidenceAndSupport: ev.evidenceAndSupport,
            instantId: ev.instantId,
            notes: ev.notes,
            organization: ev.organization,
            position: ev.position,
            rank: ev.rank,
            refutation: ev.refutation,
            speakerId: ev.speakerInstantId ? requireUser(ev.speakerInstantId) : undefined,
          }),
        );
      }
      ballots += 1;
    }

    return { ballots, debates, users };
  },
});
