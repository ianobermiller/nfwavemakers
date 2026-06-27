import { i } from '@instantdb/react';

const schema = i.schema({
  entities: {
    $users: i.entity({
      name: i.string().optional(),
      role: i.string().optional(),
    }),
    debates: i.entity({
      date: i.string(),
      room: i.string(),
      resolution: i.string().optional(),
      deletedAt: i.number().optional(),
    }),
    ballots: i.entity({
      winner: i.string().optional(),
      reasonForDecision: i.string().optional(),
      submittedAt: i.number().optional(),
      deletedAt: i.number().optional(),
    }),
    speakerEvals: i.entity({
      position: i.string(),
      rank: i.number().optional(),
      delivery: i.number().optional(),
      organization: i.number().optional(),
      evidenceAndSupport: i.number().optional(),
      refutation: i.number().optional(),
      crossExamination: i.number().optional(),
      conduct: i.number().optional(),
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

export default schema;
