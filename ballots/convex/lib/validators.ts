import { v } from 'convex/values';

export const roleValidator = v.union(
  v.literal('admin'),
  v.literal('student'),
  v.literal('parent'),
);

export const positionValidator = v.union(
  v.literal('aff1'),
  v.literal('aff2'),
  v.literal('neg1'),
  v.literal('neg2'),
);

export const winnerValidator = v.union(v.literal('aff'), v.literal('neg'));

export const userSummaryValidator = v.object({
  _id: v.id('users'),
  avatarUrl: v.union(v.string(), v.null()),
  email: v.optional(v.string()),
  name: v.optional(v.string()),
  role: v.optional(roleValidator),
});

export const scoresValidator = v.object({
  conduct: v.optional(v.number()),
  crossExamination: v.optional(v.number()),
  delivery: v.optional(v.number()),
  evidenceAndSupport: v.optional(v.number()),
  organization: v.optional(v.number()),
  refutation: v.optional(v.number()),
});

export const speakerEvalValidator = v.object({
  _id: v.id('speakerEvals'),
  conduct: v.optional(v.number()),
  crossExamination: v.optional(v.number()),
  delivery: v.optional(v.number()),
  evidenceAndSupport: v.optional(v.number()),
  notes: v.optional(v.string()),
  organization: v.optional(v.number()),
  position: positionValidator,
  rank: v.optional(v.number()),
  refutation: v.optional(v.number()),
  speaker: v.union(userSummaryValidator, v.null()),
});

export const debateSummaryValidator = v.object({
  _id: v.id('debates'),
  affTeam: v.array(userSummaryValidator),
  date: v.string(),
  judges: v.array(userSummaryValidator),
  negTeam: v.array(userSummaryValidator),
  resolution: v.optional(v.string()),
  room: v.string(),
});
