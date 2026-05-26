import { i } from '@instantdb/react';

export const schema = i.schema({
  entities: {
    $users: i.entity({
      name: i.string().optional(),
      role: i.string().optional(), // 'admin' | 'student' | 'parent'
    }),
    debates: i.entity({
      date: i.string(),
      room: i.string(),
      resolution: i.string().optional(),
    }),
    ballots: i.entity({
      winner: i.string().optional(), // 'aff' | 'neg'
      reasonForDecision: i.string().optional(),
      submittedAt: i.number().optional(),
    }),
    speakerEvals: i.entity({
      position: i.string(), // 'aff1' | 'aff2' | 'neg1' | 'neg2'
      rank: i.number().optional(), // 1 = best speaker overall
      delivery: i.number().optional(), // 1–5
      organization: i.number().optional(), // 1–5
      evidenceAndSupport: i.number().optional(), // 1–5
      refutation: i.number().optional(), // 1–5
      crossExamination: i.number().optional(), // 1–5
      conduct: i.number().optional(), // 1–5
      notes: i.string().optional(),
    }),
  },
  links: {
    debateAffTeam: {
      forward: { on: 'debates', has: 'many', label: 'affTeam' },
      reverse: { on: '$users', has: 'many', label: 'affDebates' },
    },
    debateNegTeam: {
      forward: { on: 'debates', has: 'many', label: 'negTeam' },
      reverse: { on: '$users', has: 'many', label: 'negDebates' },
    },
    debateJudges: {
      forward: { on: 'debates', has: 'many', label: 'judges' },
      reverse: { on: '$users', has: 'many', label: 'judgedDebates' },
    },
    ballotsDebate: {
      forward: { on: 'ballots', has: 'one', label: 'debate' },
      reverse: { on: 'debates', has: 'many', label: 'ballots' },
    },
    ballotsJudge: {
      forward: { on: 'ballots', has: 'one', label: 'judge' },
      reverse: { on: '$users', has: 'many', label: 'myBallots' },
    },
    speakerEvalsBallot: {
      forward: { on: 'speakerEvals', has: 'one', label: 'ballot' },
      reverse: { on: 'ballots', has: 'many', label: 'speakerEvals' },
    },
    speakerEvalsSpeaker: {
      forward: { on: 'speakerEvals', has: 'one', label: 'speaker' },
      reverse: { on: '$users', has: 'many', label: 'myEvals' },
    },
  },
});
