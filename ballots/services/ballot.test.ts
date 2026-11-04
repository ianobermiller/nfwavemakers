import assert from 'node:assert/strict';
import { test } from 'node:test';
import { alignSpeakersToDebate, initBallotFormState, type DebateTeams } from './ballot.ts';
import type { Position, SpeakerFormState } from '../types.ts';

function speaker(userId: string, notes = ''): SpeakerFormState {
  return {
    userId,
    delivery: userId === 'alice' ? 4 : 3,
    organization: undefined,
    evidenceAndSupport: undefined,
    refutation: undefined,
    crossExamination: undefined,
    conduct: undefined,
    notes,
  };
}

function speakers(map: Partial<Record<Position, SpeakerFormState>>) {
  return {
    aff1: map.aff1 ?? speaker(''),
    aff2: map.aff2 ?? speaker(''),
    neg1: map.neg1 ?? speaker(''),
    neg2: map.neg2 ?? speaker(''),
  };
}

void test('alignSpeakersToDebate swaps affirmative order and keeps scores with each speaker', () => {
  const before = speakers({
    aff1: speaker('alice', 'alice notes'),
    aff2: speaker('bob', 'bob notes'),
    neg1: speaker('cara'),
    neg2: speaker('dan'),
  });
  const evalIds = { aff1: 'e-aff1', aff2: 'e-aff2', neg1: 'e-neg1', neg2: 'e-neg2' };
  const debate: DebateTeams = {
    affTeam: [{ id: 'bob' }, { id: 'alice' }],
    negTeam: [{ id: 'cara' }, { id: 'dan' }],
  };

  const aligned = alignSpeakersToDebate(before, evalIds, ['aff1', 'aff2', 'neg1', 'neg2'], debate);

  assert.equal(aligned.changed, true);
  assert.equal(aligned.speakers.aff1.userId, 'bob');
  assert.equal(aligned.speakers.aff1.notes, 'bob notes');
  assert.equal(aligned.speakers.aff1.delivery, 3);
  assert.equal(aligned.speakers.aff2.userId, 'alice');
  assert.equal(aligned.speakers.aff2.notes, 'alice notes');
  assert.equal(aligned.speakers.aff2.delivery, 4);
  assert.deepEqual(aligned.evalIds, evalIds);
  assert.deepEqual(aligned.rankOrder, ['aff2', 'aff1', 'neg1', 'neg2']);
});

void test('alignSpeakersToDebate is a no-op when slots already match the debate', () => {
  const before = speakers({
    aff1: speaker('alice'),
    aff2: speaker('bob'),
  });
  const debate: DebateTeams = {
    affTeam: [{ id: 'alice' }, { id: 'bob' }],
    negTeam: [],
  };

  const aligned = alignSpeakersToDebate(before, { aff1: 'e1' }, ['aff1', 'aff2'], debate);

  assert.equal(aligned.changed, false);
  assert.equal(aligned.speakers.aff1.userId, 'alice');
  assert.equal(aligned.speakers.aff2.userId, 'bob');
  assert.deepEqual(aligned.rankOrder, ['aff1', 'aff2']);
});

void test('initBallotFormState rematches an existing draft to the debate and marks needsPersist', () => {
  const init = initBallotFormState(
    {
      id: 'ballot-1',
      speakerEvals: [
        {
          id: 'e1',
          position: 'aff1',
          speaker: { id: 'alice' },
          notes: 'alice notes',
          delivery: 5,
          rank: 1,
        },
        {
          id: 'e2',
          position: 'aff2',
          speaker: { id: 'bob' },
          notes: 'bob notes',
          delivery: 2,
          rank: 2,
        },
      ],
    },
    {
      affTeam: [{ id: 'bob' }, { id: 'alice' }],
      negTeam: [],
    },
  );

  assert.equal(init.needsPersist, true);
  assert.equal(init.speakers.aff1.userId, 'bob');
  assert.equal(init.speakers.aff1.notes, 'bob notes');
  assert.equal(init.speakers.aff1.delivery, 2);
  assert.equal(init.speakers.aff2.userId, 'alice');
  assert.equal(init.speakers.aff2.notes, 'alice notes');
  assert.equal(init.speakers.aff2.delivery, 5);
  assert.deepEqual(init.ids.evalIds, { aff1: 'e1', aff2: 'e2' });
  assert.deepEqual(init.rankOrder, ['aff2', 'aff1']);
});
