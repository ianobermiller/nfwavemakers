import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  users: defineTable({
    archivedAt: v.optional(v.number()),
    authId: v.optional(v.string()),
    avatarStorageId: v.optional(v.id('_storage')),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    instantId: v.optional(v.string()),
    name: v.optional(v.string()),
    role: v.optional(v.union(v.literal('admin'), v.literal('student'), v.literal('parent'))),
  })
    .index('by_auth_id', ['authId'])
    .index('email', ['email'])
    .index('by_instant_id', ['instantId']),

  debates: defineTable({
    date: v.string(),
    deletedAt: v.optional(v.number()),
    instantId: v.optional(v.string()),
    resolution: v.optional(v.string()),
    room: v.string(),
  })
    .index('by_date', ['date'])
    .index('by_instant_id', ['instantId']),

  debateParticipants: defineTable({
    debateId: v.id('debates'),
    side: v.union(v.literal('aff'), v.literal('neg'), v.literal('judge')),
    slot: v.number(),
    userId: v.id('users'),
  })
    .index('by_debate', ['debateId'])
    .index('by_user', ['userId'])
    .index('by_debate_and_user', ['debateId', 'userId']),

  ballots: defineTable({
    debateId: v.optional(v.id('debates')),
    deletedAt: v.optional(v.number()),
    instantId: v.optional(v.string()),
    judgeId: v.id('users'),
    reasonForDecision: v.optional(v.string()),
    submittedAt: v.optional(v.number()),
    winner: v.optional(v.union(v.literal('aff'), v.literal('neg'))),
  })
    .index('by_debate', ['debateId'])
    .index('by_judge', ['judgeId'])
    .index('by_judge_and_debate', ['judgeId', 'debateId'])
    .index('by_instant_id', ['instantId']),

  speakerEvals: defineTable({
    ballotId: v.id('ballots'),
    conduct: v.optional(v.number()),
    crossExamination: v.optional(v.number()),
    delivery: v.optional(v.number()),
    evidenceAndSupport: v.optional(v.number()),
    instantId: v.optional(v.string()),
    notes: v.optional(v.string()),
    organization: v.optional(v.number()),
    position: v.union(
      v.literal('aff1'),
      v.literal('aff2'),
      v.literal('neg1'),
      v.literal('neg2'),
    ),
    rank: v.optional(v.number()),
    refutation: v.optional(v.number()),
    speakerId: v.optional(v.id('users')),
  })
    .index('by_ballot', ['ballotId'])
    .index('by_speaker', ['speakerId'])
    .index('by_instant_id', ['instantId']),

  devOtps: defineTable({
    email: v.string(),
    otp: v.string(),
  }).index('by_email', ['email']),
});
