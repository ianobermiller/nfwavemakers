import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { BallotFormInit } from '../services/ballot.ts';
import type { Position, SpeakerFormState } from '../types.ts';
import {
  applyLocalDraft,
  buildLocalDraft,
  clearLocalDraft,
  feedbackWeight,
  localDraftKey,
  memoryDraftStorage,
  parseLocalDraft,
  preserveNotes,
  readLocalDraft,
  restoreBallotFormState,
  shouldRestoreLocalDraft,
  writeLocalDraft,
} from './ballotLocalDraft.ts';

function speaker(userId: string, notes = '', delivery?: number): SpeakerFormState {
  return {
    userId,
    delivery,
    organization: undefined,
    evidenceAndSupport: undefined,
    refutation: undefined,
    crossExamination: undefined,
    conduct: undefined,
    notes,
  };
}

function speakers(
  map: Partial<Record<Position, SpeakerFormState>>,
): Record<Position, SpeakerFormState> {
  return {
    aff1: map.aff1 ?? speaker(''),
    aff2: map.aff2 ?? speaker(''),
    neg1: map.neg1 ?? speaker(''),
    neg2: map.neg2 ?? speaker(''),
  };
}

function serverInit(
  partial: Partial<BallotFormInit> & { speakers: Record<Position, SpeakerFormState> },
): BallotFormInit {
  return {
    rankOrder: [],
    winner: undefined,
    rfd: '',
    ids: { evalIds: {} },
    needsPersist: false,
    ...partial,
  };
}

void test('localDraftKey scopes drafts to judge and debate', () => {
  assert.equal(localDraftKey('judge-1', 'debate-9'), 'ballots:draft:v1:judge-1:debate-9');
  assert.equal(localDraftKey('judge-1'), 'ballots:draft:v1:judge-1:new');
});

void test('write and read round-trip a draft through storage', () => {
  const storage = memoryDraftStorage();
  const draft = buildLocalDraft({
    judgeId: 'judge-1',
    debateId: 'debate-9',
    ids: { ballotId: 'b1', evalIds: { aff1: 'e1' } },
    speakers: speakers({ aff1: speaker('alice', 'hello alice') }),
    rankOrder: ['aff1'],
    winner: 'aff',
    rfd: 'reason',
    updatedAt: 100,
  });

  writeLocalDraft(draft, storage);
  assert.deepEqual(readLocalDraft('judge-1', 'debate-9', storage), draft);
});

void test('parseLocalDraft rejects corrupt or wrong-version payloads', () => {
  assert.equal(parseLocalDraft(null), null);
  assert.equal(parseLocalDraft('{'), null);
  assert.equal(parseLocalDraft(JSON.stringify({ version: 99, judgeId: 'j' })), null);
  assert.equal(parseLocalDraft(JSON.stringify({ version: 1, judgeId: '' })), null);
});

void test('shouldRestoreLocalDraft keeps the richer written feedback', () => {
  const server = serverInit({
    speakers: speakers({
      aff1: speaker('alice', ''),
      neg1: speaker('andrew', 'short'),
    }),
    rfd: '',
  });
  const local = buildLocalDraft({
    judgeId: 'j',
    debateId: 'd',
    ids: { evalIds: {} },
    speakers: speakers({
      aff1: speaker('alice', 'long notes for madison'),
      aff2: speaker('cates', 'cates notes'),
      neg1: speaker('andrew', 'short'),
      neg2: speaker('abe', 'abe notes'),
    }),
    rankOrder: [],
    winner: undefined,
    rfd: '',
  });

  assert.equal(shouldRestoreLocalDraft(server, local), true);
  assert.equal(
    shouldRestoreLocalDraft(
      serverInit({
        speakers: local.speakers,
        rfd: '',
      }),
      local,
    ),
    false,
  );
});

void test('feedbackWeight counts notes and reason text', () => {
  assert.equal(feedbackWeight(speakers({ aff1: speaker('a', 'abc') }), 'xy'), 5);
});

void test('applyLocalDraft restores notes and marks needsPersist', () => {
  const server = serverInit({
    speakers: speakers({ aff1: speaker('alice'), neg1: speaker('andrew', 'server only') }),
    ids: { ballotId: 'server-b', evalIds: { aff1: 'server-e1', neg1: 'server-e3' } },
  });
  const local = buildLocalDraft({
    judgeId: 'j',
    debateId: 'd',
    ids: { ballotId: 'local-b', evalIds: { neg1: 'local-e3' } },
    speakers: speakers({
      aff1: speaker('alice', 'restored notes'),
      neg1: speaker('andrew', 'local andrew'),
    }),
    rankOrder: ['aff1'],
    winner: 'neg',
    rfd: 'local rfd',
  });

  const applied = applyLocalDraft(server, local);
  assert.equal(applied.needsPersist, true);
  assert.equal(applied.speakers.aff1.notes, 'restored notes');
  assert.equal(applied.speakers.neg1.notes, 'local andrew');
  assert.equal(applied.rfd, 'local rfd');
  assert.equal(applied.winner, 'neg');
  assert.equal(applied.ids.ballotId, 'local-b');
  assert.equal(applied.ids.evalIds.aff1, 'server-e1');
  assert.equal(applied.ids.evalIds.neg1, 'local-e3');
});

void test('preserveNotes keeps typed notes when a later payload empties them', () => {
  const previous = speakers({
    aff1: speaker('alice', 'alice notes'),
    aff2: speaker('bob', 'bob notes'),
  });
  const wiped = speakers({
    aff1: speaker('alice', ''),
    aff2: speaker('bob', ''),
  });

  const kept = preserveNotes(previous, wiped);
  assert.equal(kept.aff1.notes, 'alice notes');
  assert.equal(kept.aff2.notes, 'bob notes');
});

void test('preserveNotes follows a speaker across slots', () => {
  const previous = speakers({
    aff1: speaker('alice', 'alice notes'),
    aff2: speaker('bob', 'bob notes'),
  });
  const swapped = speakers({
    aff1: speaker('bob', ''),
    aff2: speaker('alice', ''),
  });

  const kept = preserveNotes(previous, swapped);
  assert.equal(kept.aff1.notes, 'bob notes');
  assert.equal(kept.aff2.notes, 'alice notes');
});

void test('restoreBallotFormState reloads the local draft after a failed save left the server empty', () => {
  const storage = memoryDraftStorage();
  const local = buildLocalDraft({
    judgeId: 'judge-1',
    debateId: 'debate-9',
    ids: { ballotId: 'b1', evalIds: {} },
    speakers: speakers({
      aff1: speaker('madison', 'madison feedback'),
      aff2: speaker('cates', 'cates feedback'),
      neg1: speaker('andrew', 'andrew feedback'),
      neg2: speaker('abe', 'abe feedback'),
    }),
    rankOrder: [],
    winner: undefined,
    rfd: '',
  });
  writeLocalDraft(local, storage);

  const server = serverInit({
    speakers: speakers({
      aff1: speaker('madison'),
      aff2: speaker('cates'),
      neg1: speaker('andrew', 'andrew feedback'),
      neg2: speaker('abe'),
    }),
    ids: { ballotId: 'b1', evalIds: {} },
  });

  const restored = restoreBallotFormState(server, 'judge-1', 'debate-9', storage);
  assert.equal(restored.restoredFromLocal, true);
  assert.equal(restored.initial.speakers.aff1.notes, 'madison feedback');
  assert.equal(restored.initial.speakers.aff2.notes, 'cates feedback');
  assert.equal(restored.initial.speakers.neg2.notes, 'abe feedback');
  assert.equal(restored.initial.needsPersist, true);
});

void test('clearLocalDraft removes the stored copy after submit', () => {
  const storage = memoryDraftStorage();
  writeLocalDraft(
    buildLocalDraft({
      judgeId: 'j',
      debateId: 'd',
      ids: { evalIds: {} },
      speakers: speakers({ aff1: speaker('a', 'n') }),
      rankOrder: [],
      winner: undefined,
      rfd: '',
    }),
    storage,
  );
  clearLocalDraft('j', 'd', storage);
  assert.equal(readLocalDraft('j', 'd', storage), null);
});
