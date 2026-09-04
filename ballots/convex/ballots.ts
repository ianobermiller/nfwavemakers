import type { Infer} from 'convex/values';
import { v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import type { MutationCtx } from './_generated/server';
import { getCurrentUser, requireAdmin } from './lib/auth';
import { isActiveDebate, loadDebateTeams } from './lib/debates';
import { loadUserSummary } from './lib/users';
import { compact } from './lib/compact';
import {
  debateSummaryValidator,
  positionValidator,
  speakerEvalValidator,
  userSummaryValidator,
  winnerValidator,
} from './lib/validators';

const POSITIONS = ['aff1', 'aff2', 'neg1', 'neg2'] as const;

const evalInput = v.object({
  conduct: v.optional(v.number()),
  crossExamination: v.optional(v.number()),
  delivery: v.optional(v.number()),
  evalId: v.optional(v.id('speakerEvals')),
  evidenceAndSupport: v.optional(v.number()),
  notes: v.string(),
  organization: v.optional(v.number()),
  position: positionValidator,
  rank: v.optional(v.number()),
  refutation: v.optional(v.number()),
  speakerId: v.optional(v.id('users')),
});

const ballotDetailValidator = v.object({
  _id: v.id('ballots'),
  debate: v.union(debateSummaryValidator, v.null()),
  judge: v.union(userSummaryValidator, v.null()),
  reasonForDecision: v.optional(v.string()),
  speakerEvals: v.array(speakerEvalValidator),
  submittedAt: v.optional(v.number()),
  winner: v.optional(winnerValidator),
});

type BallotDetail = Infer<typeof ballotDetailValidator>;
type DebateSummary = Infer<typeof debateSummaryValidator>;

function isActiveBallot(ballot: Doc<'ballots'>): boolean {
  return ballot.deletedAt == null;
}

async function loadEvals(ctx: Parameters<typeof getCurrentUser>[0], ballotId: Id<'ballots'>) {
  const evals = await ctx.db
    .query('speakerEvals')
    .withIndex('by_ballot', (q) => q.eq('ballotId', ballotId))
    .collect();
  const result = [];
  for (const ev of evals) {
    const speaker = ev.speakerId ? await loadUserSummary(ctx, ev.speakerId) : null;
    result.push(
      compact({
        _id: ev._id,
        conduct: ev.conduct,
        crossExamination: ev.crossExamination,
        delivery: ev.delivery,
        evidenceAndSupport: ev.evidenceAndSupport,
        notes: ev.notes,
        organization: ev.organization,
        position: ev.position,
        rank: ev.rank,
        refutation: ev.refutation,
        speaker,
      }),
    );
  }
  return result;
}

async function loadDebateSummary(
  ctx: Parameters<typeof getCurrentUser>[0],
  debateId: Id<'debates'> | undefined,
) {
  if (!debateId) return null;
  const debate = await ctx.db.get(debateId);
  if (!debate || !isActiveDebate(debate)) return null;
  const teams = await loadDebateTeams(ctx, debate._id);
  return compact({
    _id: debate._id,
    date: debate.date,
    resolution: debate.resolution,
    room: debate.room,
    ...teams,
  }) as DebateSummary;
}

async function toBallotDetail(ctx: Parameters<typeof getCurrentUser>[0], ballot: Doc<'ballots'>) {
  const judge = await loadUserSummary(ctx, ballot.judgeId);
  return compact({
    _id: ballot._id,
    debate: await loadDebateSummary(ctx, ballot.debateId),
    judge,
    reasonForDecision: ballot.reasonForDecision,
    speakerEvals: await loadEvals(ctx, ballot._id),
    submittedAt: ballot.submittedAt,
    winner: ballot.winner,
  }) as BallotDetail;
}

export const get = query({
  args: { ballotId: v.id('ballots') },
  returns: v.union(ballotDetailValidator, v.null()),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const ballot = await ctx.db.get(args.ballotId);
    if (!ballot || !isActiveBallot(ballot)) {
      return null;
    }
    const detail = await toBallotDetail(ctx, ballot);
    const speakerIds = detail.speakerEvals.map((e) => e.speaker?._id).filter(Boolean);
    const canView =
      user.role === 'admin' ||
      ballot.judgeId === user._id ||
      speakerIds.some((id) => id === user._id);
    if (!canView) {
      return null;
    }
    return detail;
  },
});

export const debateDetail = query({
  args: { debateId: v.id('debates') },
  returns: v.union(
    v.object({
      debate: debateSummaryValidator,
      ballots: v.array(ballotDetailValidator),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    const debate = await loadDebateSummary(ctx, args.debateId);
    if (!debate) {
      return null;
    }
    const isMember =
      user.role === 'admin' ||
      debate.affTeam.some((u) => u._id === user._id) ||
      debate.negTeam.some((u) => u._id === user._id) ||
      debate.judges.some((u) => u._id === user._id);
    if (!isMember) {
      return null;
    }
    const ballots = (
      await ctx.db
        .query('ballots')
        .withIndex('by_debate', (q) => q.eq('debateId', args.debateId))
        .collect()
    ).filter((b) => isActiveBallot(b) && b.submittedAt != null);
    const details = [];
    for (const ballot of ballots) {
      details.push(await toBallotDetail(ctx, ballot));
    }
    return { debate, ballots: details };
  },
});

export const draftForJudge = query({
  args: { debateId: v.optional(v.id('debates')) },
  returns: v.union(ballotDetailValidator, v.null()),
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (args.debateId) {
      const ballots = await ctx.db
        .query('ballots')
        .withIndex('by_judge_and_debate', (q) =>
          q.eq('judgeId', user._id).eq('debateId', args.debateId),
        )
        .collect();
      const ballot = ballots.find(isActiveBallot);
      return ballot ? await toBallotDetail(ctx, ballot) : null;
    }
    const ballots = await ctx.db
      .query('ballots')
      .withIndex('by_judge', (q) => q.eq('judgeId', user._id))
      .collect();
    const draft = ballots.find((b) => isActiveBallot(b) && b.submittedAt == null && b.debateId == null);
    return draft ? await toBallotDetail(ctx, draft) : null;
  },
});

export const submittedByMe = query({
  args: {},
  returns: v.array(ballotDetailValidator),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const ballots = (
      await ctx.db
        .query('ballots')
        .withIndex('by_judge', (q) => q.eq('judgeId', user._id))
        .collect()
    ).filter((b) => isActiveBallot(b) && b.submittedAt != null);
    const result = [];
    for (const ballot of ballots) {
      result.push(await toBallotDetail(ctx, ballot));
    }
    return result;
  },
});

export const forSpeaker = query({
  args: {},
  returns: v.array(ballotDetailValidator),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    const evals = await ctx.db
      .query('speakerEvals')
      .withIndex('by_speaker', (q) => q.eq('speakerId', user._id))
      .collect();
    const seen = new Set<Id<'ballots'>>();
    const result = [];
    for (const ev of evals) {
      if (seen.has(ev.ballotId)) continue;
      seen.add(ev.ballotId);
      const ballot = await ctx.db.get(ev.ballotId);
      if (!ballot || !isActiveBallot(ballot) || ballot.submittedAt == null) continue;
      result.push(await toBallotDetail(ctx, ballot));
    }
    return result;
  },
});

export const adminByDebate = query({
  args: {},
  returns: v.array(
    v.object({
      debate: debateSummaryValidator,
      ballots: v.array(ballotDetailValidator),
    }),
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const debates = (await ctx.db.query('debates').collect())
      .filter(isActiveDebate)
      .sort((a, b) => b._creationTime - a._creationTime);
    const result = [];
    for (const debate of debates) {
      const summary = await loadDebateSummary(ctx, debate._id);
      if (!summary) continue;
      const ballots = (
        await ctx.db
          .query('ballots')
          .withIndex('by_debate', (q) => q.eq('debateId', debate._id))
          .collect()
      ).filter((b) => isActiveBallot(b) && b.submittedAt != null);
      const details = [];
      for (const ballot of ballots) {
        details.push(await toBallotDetail(ctx, ballot));
      }
      result.push({ debate: summary, ballots: details });
    }
    return result;
  },
});

export const adminByStudent = query({
  args: {},
  returns: v.array(
    v.object({
      evals: v.array(
        v.object({
          eval: speakerEvalValidator,
          ballot: ballotDetailValidator,
        }),
      ),
      student: userSummaryValidator,
    }),
  ),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const evals = await ctx.db.query('speakerEvals').collect();
    const byStudent = new Map<Id<'users'>, { eval: Doc<'speakerEvals'>; ballot: Doc<'ballots'> }[]>();
    for (const ev of evals) {
      if (!ev.speakerId) continue;
      const ballot = await ctx.db.get(ev.ballotId);
      if (!ballot || !isActiveBallot(ballot) || ballot.submittedAt == null) continue;
      const list = byStudent.get(ev.speakerId) ?? [];
      list.push({ eval: ev, ballot });
      byStudent.set(ev.speakerId, list);
    }
    const result = [];
    for (const [studentId, rows] of byStudent) {
      const student = await loadUserSummary(ctx, studentId);
      if (!student) continue;
      const packed = [];
      for (const row of rows) {
        packed.push({
          eval: compact({
            _id: row.eval._id,
            conduct: row.eval.conduct,
            crossExamination: row.eval.crossExamination,
            delivery: row.eval.delivery,
            evidenceAndSupport: row.eval.evidenceAndSupport,
            notes: row.eval.notes,
            organization: row.eval.organization,
            position: row.eval.position,
            rank: row.eval.rank,
            refutation: row.eval.refutation,
            speaker: student,
          }) as Infer<typeof speakerEvalValidator>,
          ballot: await toBallotDetail(ctx, row.ballot),
        });
      }
      result.push({ student, evals: packed });
    }
    result.sort((a, b) => (a.student.name ?? '').localeCompare(b.student.name ?? ''));
    return result;
  },
});

export const stranded = query({
  args: {},
  returns: v.array(ballotDetailValidator),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const ballots = (await ctx.db.query('ballots').collect())
      .filter((b) => isActiveBallot(b) && b.submittedAt != null && b.debateId == null)
      .sort((a, b) => (b.submittedAt ?? 0) - (a.submittedAt ?? 0));
    const result = [];
    for (const ballot of ballots) {
      result.push(await toBallotDetail(ctx, ballot));
    }
    return result;
  },
});

async function upsertBallot(
  ctx: MutationCtx,
  args: {
    ballotId?: Id<'ballots'>;
    debateId?: Id<'debates'>;
    evals: {
      conduct?: number;
      crossExamination?: number;
      delivery?: number;
      evalId?: Id<'speakerEvals'>;
      evidenceAndSupport?: number;
      notes: string;
      organization?: number;
      position: (typeof POSITIONS)[number];
      rank?: number;
      refutation?: number;
      speakerId?: Id<'users'>;
    }[];
    reasonForDecision: string;
    submittedAt?: number;
    winner?: 'aff' | 'neg';
  },
) {
  const user = await getCurrentUser(ctx);
  let ballotId = args.ballotId;
  if (ballotId) {
    const existing = await ctx.db.get(ballotId);
    if (!existing || !isActiveBallot(existing)) {
      throw new Error('Ballot not found');
    }
    if (existing.judgeId !== user._id && user.role !== 'admin') {
      throw new Error('Unauthorized');
    }
    await ctx.db.patch(
      ballotId,
      compact({
        debateId: args.debateId,
        reasonForDecision: args.reasonForDecision.trim() || undefined,
        submittedAt: args.submittedAt ?? existing.submittedAt,
        winner: args.winner,
      }),
    );
  } else {
    ballotId = await ctx.db.insert(
      'ballots',
      compact({
        debateId: args.debateId,
        judgeId: user._id,
        reasonForDecision: args.reasonForDecision.trim() || undefined,
        submittedAt: args.submittedAt,
        winner: args.winner,
      }),
    );
  }

  const evalIds: Record<string, Id<'speakerEvals'>> = {};
  for (const ev of args.evals) {
    const notes = ev.notes.trim() || undefined;
    const fields = compact({
      ballotId,
      conduct: ev.conduct,
      crossExamination: ev.crossExamination,
      delivery: ev.delivery,
      evidenceAndSupport: ev.evidenceAndSupport,
      notes,
      organization: ev.organization,
      position: ev.position,
      rank: ev.rank,
      refutation: ev.refutation,
      speakerId: ev.speakerId,
    });
    if (ev.evalId) {
      const existing = await ctx.db.get(ev.evalId);
      if (!existing) {
        throw new Error('Speaker eval not found');
      }
      await ctx.db.patch(ev.evalId, fields);
      evalIds[ev.position] = ev.evalId;
    } else {
      evalIds[ev.position] = await ctx.db.insert('speakerEvals', fields);
    }
  }
  return { ballotId, evalIds };
}

export const saveDraft = mutation({
  args: {
    ballotId: v.optional(v.id('ballots')),
    debateId: v.optional(v.id('debates')),
    evals: v.array(evalInput),
    reasonForDecision: v.string(),
    submittedAt: v.optional(v.number()),
    winner: v.optional(winnerValidator),
  },
  returns: v.object({
    ballotId: v.id('ballots'),
    evalIds: v.record(v.string(), v.id('speakerEvals')),
  }),
  handler: async (ctx, args) => {
    return await upsertBallot(ctx, args);
  },
});

export const softDelete = mutation({
  args: { ballotId: v.id('ballots') },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.ballotId, { deletedAt: Date.now() });
    return null;
  },
});

export const restore = mutation({
  args: { ballotId: v.id('ballots') },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.ballotId, { deletedAt: undefined });
    return null;
  },
});
