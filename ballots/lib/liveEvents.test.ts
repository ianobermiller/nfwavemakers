import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Ballot, Debate, User } from '../data/model.ts';
import { affectsBallots, debateHasUser } from './liveEvents.ts';

const user: User = {
  id: 'speaker',
  name: 'Speaker',
  approved: true,
  archived: false,
  avatarUrl: null,
  emailVerified: true,
  passwordSet: true,
};
const debate: Debate = {
  id: 'debate',
  created: '',
  date: '2026-11-21',
  event: 'tp',
  room: 'A',
  affTeam: [user],
  negTeam: [],
  judges: [],
};
const ballot: Ballot = {
  id: 'ballot',
  debate,
  judge: null,
  speakerEvals: [{ id: 'eval', position: 'aff1', speaker: user }],
};

void test('detail invalidation ignores unrelated ballots, evaluations, debates and members', () => {
  const scope = { kind: 'ballot', id: ballot.id } satisfies { kind: 'ballot'; id: string };
  assert.equal(affectsBallots('ballots', { id: 'other' }, [ballot], scope), false);
  assert.equal(
    affectsBallots('speaker_evals', { id: 'other', ballot: 'other' }, [ballot], scope),
    false,
  );
  assert.equal(affectsBallots('debates', { id: 'other' }, [ballot], scope), false);
  assert.equal(affectsBallots('users', { id: 'other' }, [ballot], scope), false);
  assert.equal(
    affectsBallots('speaker_evals', { id: 'eval', ballot: ballot.id }, [ballot], scope),
    true,
  );
  assert.equal(affectsBallots('users', { id: user.id }, [ballot], scope), true);
});

void test('debate scope catches inserted ballots and records moved away from the loaded debate', () => {
  const scope = { kind: 'debate', id: debate.id } satisfies { kind: 'debate'; id: string };
  assert.equal(affectsBallots('ballots', { id: 'new', debate: debate.id }, [ballot], scope), true);
  assert.equal(
    affectsBallots('ballots', { id: ballot.id, debate: 'other' }, [ballot], scope),
    true,
  );
  assert.equal(
    affectsBallots('speaker_evals', { id: 'new', ballot: ballot.id }, [ballot], scope),
    true,
  );
  assert.equal(affectsBallots('debates', { id: debate.id }, [], scope), true);
});

void test('expanded debate members drive user invalidation without a directory request', () => {
  assert.equal(debateHasUser(debate, user.id), true);
  assert.equal(debateHasUser(debate, 'unrelated'), false);
  assert.equal(debateHasUser(null, user.id), false);
});

void test('moving a loaded evaluation away still invalidates its previous ballot', () => {
  assert.equal(
    affectsBallots('speaker_evals', { id: 'eval', ballot: 'other' }, [ballot], {
      kind: 'ballot',
      id: ballot.id,
    }),
    true,
  );
});
