import { v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { getCurrentUser, requireAdmin } from './lib/auth';
import { isActiveDebate, loadDebateTeams, replaceParticipants } from './lib/debates';
import { compact } from './lib/compact';
import { debateSummaryValidator, winnerValidator } from './lib/validators';

export const listUpcoming = query({
  args: { today: v.string() },
  returns: v.array(debateSummaryValidator),
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);
    const debates = await ctx.db.query('debates').withIndex('by_date').collect();
    const upcoming = debates
      .filter((d) => isActiveDebate(d) && d.date >= args.today)
      .sort((a, b) => a.date.localeCompare(b.date) || a._creationTime - b._creationTime);
    const result = [];
    for (const debate of upcoming) {
      const teams = await loadDebateTeams(ctx, debate._id);
      result.push(
        compact({
          _id: debate._id,
          date: debate.date,
          resolution: debate.resolution,
          room: debate.room,
          ...teams,
        }),
      );
    }
    return result;
  },
});

export const listAll = query({
  args: {},
  returns: v.array(
    v.object({
      ...debateSummaryValidator.fields,
      ballotCount: v.number(),
      ballotIds: v.array(v.id('ballots')),
    }),
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const debates = (await ctx.db.query('debates').collect())
      .filter(isActiveDebate)
      .sort((a, b) => b._creationTime - a._creationTime);
    const result = [];
    for (const debate of debates) {
      const teams = await loadDebateTeams(ctx, debate._id);
      const ballots = (
        await ctx.db
          .query('ballots')
          .withIndex('by_debate', (q) => q.eq('debateId', debate._id))
          .collect()
      ).filter((b) => b.deletedAt == null);
      result.push(
        compact({
          _id: debate._id,
          ballotCount: ballots.length,
          ballotIds: ballots.map((b) => b._id),
          date: debate.date,
          resolution: debate.resolution,
          room: debate.room,
          ...teams,
        }),
      );
    }
    return result;
  },
});

export const listAssigned = query({
  args: {},
  returns: v.array(debateSummaryValidator),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const parts = await ctx.db
      .query('debateParticipants')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();
    const debateIds = [...new Set(parts.filter((p) => p.side === 'judge').map((p) => p.debateId))];
    const result = [];
    for (const debateId of debateIds) {
      const debate = await ctx.db.get(debateId);
      if (!debate || !isActiveDebate(debate)) continue;
      const teams = await loadDebateTeams(ctx, debate._id);
      result.push(
        compact({
          _id: debate._id,
          date: debate.date,
          resolution: debate.resolution,
          room: debate.room,
          ...teams,
        }),
      );
    }
    return result;
  },
});

export const get = query({
  args: { debateId: v.id('debates') },
  returns: v.union(debateSummaryValidator, v.null()),
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);
    const debate = await ctx.db.get(args.debateId);
    if (!debate || !isActiveDebate(debate)) {
      return null;
    }
    const teams = await loadDebateTeams(ctx, debate._id);
    return compact({
      _id: debate._id,
      date: debate.date,
      resolution: debate.resolution,
      room: debate.room,
      ...teams,
    });
  },
});

export const card = query({
  args: {
    debateId: v.id('debates'),
    judgeId: v.optional(v.id('users')),
  },
  returns: v.union(
    v.object({
      debate: debateSummaryValidator,
      winner: v.optional(winnerValidator),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);
    const debate = await ctx.db.get(args.debateId);
    if (!debate || !isActiveDebate(debate)) {
      return null;
    }
    const teams = await loadDebateTeams(ctx, debate._id);
    let winner: 'aff' | 'neg' | undefined;
    if (args.judgeId) {
      const ballots = await ctx.db
        .query('ballots')
        .withIndex('by_judge_and_debate', (q) =>
          q.eq('judgeId', args.judgeId!).eq('debateId', args.debateId),
        )
        .collect();
      const ballot = ballots.find((b) => b.deletedAt == null);
      winner = ballot?.winner;
    }
    return compact({
      debate: compact({
        _id: debate._id,
        date: debate.date,
        resolution: debate.resolution,
        room: debate.room,
        ...teams,
      }),
      winner,
    });
  },
});

export const save = mutation({
  args: {
    affTeam: v.array(v.id('users')),
    date: v.string(),
    debateId: v.optional(v.id('debates')),
    judges: v.array(v.id('users')),
    negTeam: v.array(v.id('users')),
    resolution: v.string(),
    room: v.string(),
  },
  returns: v.id('debates'),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!args.date || !args.room.trim()) {
      throw new Error('Date and room are required.');
    }
    const resolution = args.resolution.trim() || undefined;
    let debateId = args.debateId;
    if (debateId) {
      const existing = await ctx.db.get(debateId);
      if (!existing || !isActiveDebate(existing)) {
        throw new Error('Debate not found');
      }
      await ctx.db.patch(
        debateId,
        compact({
          date: args.date,
          resolution,
          room: args.room.trim(),
        }),
      );
    } else {
      debateId = await ctx.db.insert(
        'debates',
        compact({
          date: args.date,
          resolution,
          room: args.room.trim(),
        }),
      );
    }
    await replaceParticipants(ctx, debateId, args.affTeam, args.negTeam, args.judges);
    return debateId;
  },
});

export const softDelete = mutation({
  args: { debateId: v.id('debates') },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const debate = await ctx.db.get(args.debateId);
    if (!debate) {
      throw new Error('Debate not found');
    }
    const now = Date.now();
    await ctx.db.patch(args.debateId, { deletedAt: now });
    const ballots = await ctx.db
      .query('ballots')
      .withIndex('by_debate', (q) => q.eq('debateId', args.debateId))
      .collect();
    for (const ballot of ballots) {
      if (ballot.deletedAt == null) {
        await ctx.db.patch(ballot._id, { deletedAt: now });
      }
    }
    return null;
  },
});

export const restore = mutation({
  args: {
    ballotIds: v.array(v.id('ballots')),
    debateId: v.id('debates'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.debateId, { deletedAt: undefined });
    for (const ballotId of args.ballotIds) {
      await ctx.db.patch(ballotId, { deletedAt: undefined });
    }
    return null;
  },
});
