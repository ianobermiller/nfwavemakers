import { v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { internalMutation } from './_generated/server';
import { replaceParticipants } from './lib/debates';
import { compact } from './lib/compact';
import { normalizeEmail } from './lib/normalizeEmail';

const SEED_PREFIX = 'seed:';

const E2E_DATE = '2024-01-15';
const E2E_RESOLUTION = 'Resolved: Test resolution.';
const E2E_ROOM = 'A1';

type Position = 'aff1' | 'aff2' | 'neg1' | 'neg2';

interface SpeakerFeedback {
  conduct: number;
  crossExamination: number;
  delivery: number;
  evidenceAndSupport: number;
  organization: number;
  refutation: number;
  rank: number;
  notes: string;
}

const DEMO_STUDENTS = [
  { key: 'alice', name: 'Alice Student', email: 'student@example.com', main: true },
  { key: 'ben', name: 'Ben Carter', email: 'ben.carter@example.com' },
  { key: 'chloe', name: 'Chloe Nguyen', email: 'chloe.nguyen@example.com' },
  { key: 'daniel', name: 'Daniel Ortiz', email: 'daniel.ortiz@example.com' },
  { key: 'ella', name: 'Ella Brooks', email: 'ella.brooks@example.com' },
  { key: 'finn', name: 'Finn Walsh', email: 'finn.walsh@example.com' },
  { key: 'grace', name: 'Grace Kim', email: 'grace.kim@example.com' },
  { key: 'henry', name: 'Henry Patel', email: 'henry.patel@example.com' },
  { key: 'isla', name: 'Isla Morgan', email: 'isla.morgan@example.com' },
  { key: 'jack', name: 'Jack Sullivan', email: 'jack.sullivan@example.com' },
  { key: 'kate', name: 'Kate Hoffman', email: 'kate.hoffman@example.com' },
  { key: 'liam', name: 'Liam Torres', email: 'liam.torres@example.com' },
  { key: 'mia', name: 'Mia Reynolds', email: 'mia.reynolds@example.com' },
  { key: 'noah', name: 'Noah Bennett', email: 'noah.bennett@example.com' },
] as const;

const DEMO_JUDGES = [
  { key: 'bob', name: 'Bob Judge', email: 'judge@example.com', role: 'parent' as const, main: true },
  { key: 'carol', name: 'Carol Admin', email: 'admin@example.com', role: 'admin' as const },
  { key: 'diana', name: 'Diana Foster', email: 'diana.foster@example.com', role: 'parent' as const },
  { key: 'edward', name: 'Edward Hayes', email: 'edward.hayes@example.com', role: 'parent' as const },
  { key: 'fiona', name: 'Fiona Clarke', email: 'fiona.clarke@example.com', role: 'parent' as const },
  { key: 'george', name: 'George Webb', email: 'george.webb@example.com', role: 'parent' as const },
] as const;

async function deleteBallotTree(ctx: MutationCtx, ballot: Doc<'ballots'>): Promise<void> {
  const evals = await ctx.db
    .query('speakerEvals')
    .withIndex('by_ballot', (q) => q.eq('ballotId', ballot._id))
    .collect();
  for (const evaluation of evals) await ctx.db.delete(evaluation._id);
  await ctx.db.delete(ballot._id);
}

async function deleteDebateTree(ctx: MutationCtx, debateId: Id<'debates'>): Promise<void> {
  const participants = await ctx.db
    .query('debateParticipants')
    .withIndex('by_debate', (q) => q.eq('debateId', debateId))
    .collect();
  const ballots = await ctx.db
    .query('ballots')
    .withIndex('by_debate', (q) => q.eq('debateId', debateId))
    .collect();
  for (const ballot of ballots) await deleteBallotTree(ctx, ballot);
  for (const participant of participants) await ctx.db.delete(participant._id);
  await ctx.db.delete(debateId);
}

async function cleanPreviousSeed(ctx: MutationCtx): Promise<void> {
  const debates = await ctx.db.query('debates').collect();
  for (const debate of debates) {
    const isSeeded =
      debate.instantId?.startsWith(SEED_PREFIX) ||
      (debate.date === E2E_DATE &&
        debate.resolution === E2E_RESOLUTION &&
        debate.room === E2E_ROOM);
    if (isSeeded) await deleteDebateTree(ctx, debate._id);
  }

  const users = await ctx.db.query('users').collect();
  for (const user of users) {
    if (user.instantId?.startsWith(SEED_PREFIX)) {
      await ctx.db.delete(user._id);
    }
  }
}

async function upsertUser(
  ctx: MutationCtx,
  email: string,
  name: string,
  role: 'student' | 'parent' | 'admin',
  seedKey?: string,
): Promise<Id<'users'>> {
  const normalized = normalizeEmail(email) ?? email;
  const existing = await ctx.db
    .query('users')
    .withIndex('email', (q) => q.eq('email', normalized))
    .unique();
  const instantId = seedKey ? `${SEED_PREFIX}user-${seedKey}` : undefined;
  if (existing) {
    await ctx.db.patch(existing._id, compact({ name, role, instantId }));
    return existing._id;
  }
  return await ctx.db.insert('users', compact({ email: normalized, name, role, instantId }));
}

function feedback(
  rank: number,
  notes: string,
  scores: Partial<Omit<SpeakerFeedback, 'rank' | 'notes'>> = {},
): SpeakerFeedback {
  return {
    conduct: scores.conduct ?? 4,
    crossExamination: scores.crossExamination ?? 4,
    delivery: scores.delivery ?? 4,
    evidenceAndSupport: scores.evidenceAndSupport ?? 4,
    organization: scores.organization ?? 4,
    refutation: scores.refutation ?? 4,
    rank,
    notes,
  };
}

async function insertBallot(
  ctx: MutationCtx,
  opts: {
    affTeam: [Id<'users'>, Id<'users'>];
    debateId: Id<'debates'>;
    evals: Record<Position, SpeakerFeedback>;
    judgeId: Id<'users'>;
    negTeam: [Id<'users'>, Id<'users'>];
    reasonForDecision: string;
    seedKey: string;
    submittedAt: number;
    winner: 'aff' | 'neg';
  },
): Promise<Id<'ballots'>> {
  const ballotId = await ctx.db.insert('ballots', {
    debateId: opts.debateId,
    instantId: `${SEED_PREFIX}ballot-${opts.seedKey}`,
    judgeId: opts.judgeId,
    reasonForDecision: opts.reasonForDecision,
    submittedAt: opts.submittedAt,
    winner: opts.winner,
  });

  const speakers: Record<Position, Id<'users'>> = {
    aff1: opts.affTeam[0],
    aff2: opts.affTeam[1],
    neg1: opts.negTeam[0],
    neg2: opts.negTeam[1],
  };

  for (const position of ['aff1', 'aff2', 'neg1', 'neg2'] as const) {
    const ev = opts.evals[position];
    await ctx.db.insert('speakerEvals', {
      ballotId,
      conduct: ev.conduct,
      crossExamination: ev.crossExamination,
      delivery: ev.delivery,
      evidenceAndSupport: ev.evidenceAndSupport,
      instantId: `${SEED_PREFIX}eval-${opts.seedKey}-${position}`,
      notes: ev.notes,
      organization: ev.organization,
      position,
      rank: ev.rank,
      refutation: ev.refutation,
      speakerId: speakers[position],
    });
  }

  return ballotId;
}

export const seed = internalMutation({
  args: {},
  returns: v.object({
    adminEmail: v.string(),
    ballotId: v.id('ballots'),
    debateCount: v.number(),
    debateId: v.id('debates'),
    judgeEmail: v.string(),
    studentCount: v.number(),
    studentEmail: v.string(),
    submittedBallotCount: v.number(),
  }),
  handler: async (ctx) => {
    await cleanPreviousSeed(ctx);

    const students = new Map<string, Id<'users'>>();
    for (const student of DEMO_STUDENTS) {
      students.set(
        student.key,
        await upsertUser(ctx, student.email, student.name, 'student', student.key),
      );
    }

    const judges = new Map<string, Id<'users'>>();
    for (const judge of DEMO_JUDGES) {
      judges.set(
        judge.key,
        await upsertUser(ctx, judge.email, judge.name, judge.role, judge.key),
      );
    }

    const pick = (key: string): Id<'users'> => {
      const id = students.get(key) ?? judges.get(key);
      if (!id) throw new Error(`Unknown seed user key: ${key}`);
      return id;
    };

    let submittedBallotCount = 0;
    let debateCount = 0;

    const e2eDebateId = await ctx.db.insert('debates', {
      date: E2E_DATE,
      instantId: `${SEED_PREFIX}debate-e2e`,
      resolution: E2E_RESOLUTION,
      room: E2E_ROOM,
    });
    debateCount += 1;
    await replaceParticipants(
      ctx,
      e2eDebateId,
      [pick('alice'), pick('ben')],
      [pick('chloe'), pick('daniel')],
      [pick('bob')],
    );
    const e2eBallotId = await insertBallot(ctx, {
      affTeam: [pick('alice'), pick('ben')],
      debateId: e2eDebateId,
      evals: {
        aff1: feedback(
          1,
          'Strong opening. Good eye contact and clear signposting throughout the constructive.',
          { delivery: 5, evidenceAndSupport: 5 },
        ),
        aff2: feedback(2, 'Solid rebuttal structure. Could add one more sourced statistic in summary.'),
        neg1: feedback(3, 'Good clash on the value premise. Work on pacing in cross-examination.'),
        neg2: feedback(4, 'Closing was passionate but needed tighter weighing against affirmative impacts.'),
      },
      judgeId: pick('bob'),
      negTeam: [pick('chloe'), pick('daniel')],
      reasonForDecision: 'Affirmative had stronger evidence.',
      seedKey: 'e2e',
      submittedAt: Date.parse('2024-01-15T18:30:00Z'),
      winner: 'aff',
    });
    submittedBallotCount += 1;

    const pastDebates = [
      {
        aff: ['ella', 'finn'] as const,
        date: '2026-02-14',
        judge: 'diana',
        key: 'feb-valentine',
        neg: ['grace', 'henry'] as const,
        reason:
          'Affirmative proved the resolution on balance by tying their impacts to a clear standard and answering the negative counter-plan.',
        resolution:
          'Resolved: When in conflict, personal privacy ought to be valued above national security.',
        room: 'A2',
        submittedAt: Date.parse('2026-02-14T19:00:00Z'),
        winner: 'aff' as const,
      },
      {
        aff: ['isla', 'jack'] as const,
        date: '2026-03-07',
        judge: 'edward',
        key: 'march-1',
        neg: ['kate', 'liam'] as const,
        reason:
          'Negative won on framework: the affirmative never met their burden to show the policy would reduce harm net.',
        resolution:
          'Resolved: The United States federal government should significantly increase its protection of water resources.',
        room: 'B1',
        submittedAt: Date.parse('2026-03-07T18:45:00Z'),
        winner: 'neg' as const,
      },
      {
        aff: ['mia', 'noah'] as const,
        date: '2026-03-07',
        judge: 'fiona',
        key: 'march-2',
        neg: ['alice', 'ben'] as const,
        reason:
          'Affirmative carried the round with better evidence comparison and a cleaner final rebuttal extension.',
        resolution:
          'Resolved: In the United States, organized political lobbying does more harm than good.',
        room: 'B2',
        submittedAt: Date.parse('2026-03-07T20:15:00Z'),
        winner: 'aff' as const,
      },
      {
        aff: ['chloe', 'daniel'] as const,
        date: '2026-03-21',
        judge: 'george',
        key: 'march-3',
        neg: ['ella', 'finn'] as const,
        reason:
          'Negative successfully turned the affirmative advantage and won the impact calculus in the final focus.',
        resolution:
          'Resolved: The United States ought to prioritize the reduction of income inequality.',
        room: 'Main Hall',
        submittedAt: Date.parse('2026-03-21T19:30:00Z'),
        winner: 'neg' as const,
      },
      {
        aff: ['grace', 'henry'] as const,
        date: '2026-04-11',
        judge: 'bob',
        key: 'spring-1',
        neg: ['isla', 'jack'] as const,
        reason:
          'Affirmative won on solvency: their plan addressed the root cause while the negative disadvantages were mostly mitigated.',
        resolution:
          'Resolved: The United States federal government should substantially increase fiscal redistribution.',
        room: 'A1',
        submittedAt: Date.parse('2026-04-11T18:00:00Z'),
        winner: 'aff' as const,
      },
      {
        aff: ['kate', 'liam'] as const,
        date: '2026-04-11',
        judge: 'diana',
        key: 'spring-2',
        neg: ['mia', 'noah'] as const,
        reason:
          'Negative persuaded me that the affirmative plan created unintended consequences that outweighed the claimed benefits.',
        resolution:
          'Resolved: A just society ought to prioritize economic equality over economic freedom.',
        room: 'A2',
        submittedAt: Date.parse('2026-04-11T19:45:00Z'),
        winner: 'neg' as const,
      },
      {
        aff: ['alice', 'ella'] as const,
        date: '2026-05-02',
        judge: 'edward',
        key: 'showcase-1',
        neg: ['finn', 'grace'] as const,
        reason:
          'Affirmative maintained consistent internal links and won the comparative worlds analysis.',
        resolution:
          'Resolved: The United States ought to guarantee universal healthcare coverage.',
        room: 'Main Hall',
        submittedAt: Date.parse('2026-05-02T17:30:00Z'),
        winner: 'aff' as const,
      },
      {
        aff: ['ben', 'chloe'] as const,
        date: '2026-05-02',
        judge: 'fiona',
        key: 'showcase-2',
        neg: ['henry', 'isla'] as const,
        reason:
          'Negative took the round on cross-examination concessions that the affirmative could not recover from in summary.',
        resolution:
          'Resolved: In the United States, social media companies ought to be treated as publishers rather than platforms.',
        room: 'B1',
        submittedAt: Date.parse('2026-05-02T19:00:00Z'),
        winner: 'neg' as const,
      },
    ] as const;

    for (const debate of pastDebates) {
      const debateId = await ctx.db.insert('debates', {
        date: debate.date,
        instantId: `${SEED_PREFIX}debate-${debate.key}`,
        resolution: debate.resolution,
        room: debate.room,
      });
      debateCount += 1;
      await replaceParticipants(
        ctx,
        debateId,
        [pick(debate.aff[0]), pick(debate.aff[1])],
        [pick(debate.neg[0]), pick(debate.neg[1])],
        [pick(debate.judge)],
      );

      const winnerRanks =
        debate.winner === 'aff'
          ? { aff1: 1, aff2: 2, neg1: 3, neg2: 4 }
          : { aff1: 3, aff2: 4, neg1: 1, neg2: 2 };

      await insertBallot(ctx, {
        affTeam: [pick(debate.aff[0]), pick(debate.aff[1])],
        debateId,
        evals: {
          aff1: feedback(
            winnerRanks.aff1,
            'Clear thesis and good use of definitions. Keep projecting in the back half of the room.',
            { delivery: 4, organization: 5 },
          ),
          aff2: feedback(
            winnerRanks.aff2,
            'Strong evidence comparison in rebuttal. Watch time allocation in the summary speech.',
            { evidenceAndSupport: 5, refutation: 4 },
          ),
          neg1: feedback(
            winnerRanks.neg1,
            'Excellent questions in cross-examination. Framework needed one more sentence of explanation.',
            { crossExamination: 5, conduct: 5 },
          ),
          neg2: feedback(
            winnerRanks.neg2,
            'Passionate closing. Try to collapse the debate to one key voter earlier in the speech.',
            { delivery: 4, refutation: 3 },
          ),
        },
        judgeId: pick(debate.judge),
        negTeam: [pick(debate.neg[0]), pick(debate.neg[1])],
        reasonForDecision: debate.reason,
        seedKey: debate.key,
        submittedAt: debate.submittedAt,
        winner: debate.winner,
      });
      submittedBallotCount += 1;
    }

    const multiJudgeDebateId = await ctx.db.insert('debates', {
      date: '2026-05-16',
      instantId: `${SEED_PREFIX}debate-multi-judge`,
      resolution:
        'Resolved: The United States federal government should significantly reform its immigration policy.',
      room: 'Main Hall',
    });
    debateCount += 1;
    await replaceParticipants(
      ctx,
      multiJudgeDebateId,
      [pick('jack'), pick('kate')],
      [pick('liam'), pick('mia')],
      [pick('bob'), pick('carol')],
    );

    await insertBallot(ctx, {
      affTeam: [pick('jack'), pick('kate')],
      debateId: multiJudgeDebateId,
      evals: {
        aff1: feedback(2, 'Well-organized constructive with three clear contentions. Strong source citations.'),
        aff2: feedback(1, 'Outstanding summary that weighed impacts clearly. Best speech of the round.'),
        neg1: feedback(3, 'Good moral framing. Needed more specific solvency answers.'),
        neg2: feedback(4, 'Final focus raised important questions but arrived too late to flip the round.'),
      },
      judgeId: pick('bob'),
      negTeam: [pick('liam'), pick('mia')],
      reasonForDecision:
        'Affirmative won on balance: both teams argued well, but affirmative impacts were better extended.',
      seedKey: 'multi-judge-bob',
      submittedAt: Date.parse('2026-05-16T18:20:00Z'),
      winner: 'aff',
    });
    submittedBallotCount += 1;

    await insertBallot(ctx, {
      affTeam: [pick('jack'), pick('kate')],
      debateId: multiJudgeDebateId,
      evals: {
        aff1: feedback(2, 'Confident delivery. One contention needed a stronger warrant.'),
        aff2: feedback(3, 'Good rebuttal structure; summary could have spent more time on the negative turns.'),
        neg1: feedback(1, 'Excellent framework and consistent application throughout the round.'),
        neg2: feedback(4, 'Strong closing rhetoric. Weighing needed to come sooner.'),
      },
      judgeId: pick('carol'),
      negTeam: [pick('liam'), pick('mia')],
      reasonForDecision:
        'Negative won on framework: the affirmative plan did not prove it met the moral standard they proposed.',
      seedKey: 'multi-judge-carol',
      submittedAt: Date.parse('2026-05-16T18:25:00Z'),
      winner: 'neg',
    });
    submittedBallotCount += 1;

    const upcomingDebates = [
      {
        aff: ['noah', 'alice'] as const,
        date: '2026-09-13',
        judges: ['diana', 'george'] as const,
        key: 'fall-1',
        neg: ['ben', 'chloe'] as const,
        resolution:
          'Resolved: The United States ought to substantially increase public funding for renewable energy.',
        room: 'A1',
      },
      {
        aff: ['daniel', 'ella'] as const,
        date: '2026-09-20',
        judges: ['edward'] as const,
        key: 'fall-2',
        neg: ['finn', 'grace'] as const,
        resolution:
          'Resolved: In the United States, standardized testing does more harm than good.',
        room: 'A2',
      },
      {
        aff: ['henry', 'isla'] as const,
        date: '2026-10-04',
        judges: ['fiona', 'bob'] as const,
        key: 'fall-3',
        neg: ['jack', 'kate'] as const,
        resolution:
          'Resolved: The United States federal government should ban the use of consumer facial recognition technology.',
        room: 'Main Hall',
      },
    ] as const;

    for (const debate of upcomingDebates) {
      const debateId = await ctx.db.insert('debates', {
        date: debate.date,
        instantId: `${SEED_PREFIX}debate-${debate.key}`,
        resolution: debate.resolution,
        room: debate.room,
      });
      debateCount += 1;
      await replaceParticipants(
        ctx,
        debateId,
        [pick(debate.aff[0]), pick(debate.aff[1])],
        [pick(debate.neg[0]), pick(debate.neg[1])],
        debate.judges.map((j) => pick(j)),
      );
    }

    return {
      adminEmail: 'admin@example.com',
      ballotId: e2eBallotId,
      debateCount,
      debateId: e2eDebateId,
      judgeEmail: 'judge@example.com',
      studentCount: DEMO_STUDENTS.length,
      studentEmail: 'student@example.com',
      submittedBallotCount,
    };
  },
});
