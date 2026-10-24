import assert from 'node:assert/strict';
import { test } from 'node:test';
import { assignSpeaker, debatePartnerUpdates, type SpeakerSlot } from './debatePartners.ts';

const students = [
  { id: 'a', partnerId: 'b' },
  { id: 'b', partnerId: 'a' },
  { id: 'c', partnerId: 'd' },
  { id: 'd', partnerId: 'c' },
  { id: 'e', partnerId: '' },
];

void test('debatePartnerUpdates pairs two students and unpairs their previous partners', () => {
  const updates = debatePartnerUpdates(students, 'a', 'c');
  assert.deepEqual(Object.fromEntries(updates.map((update) => [update.id, update.partnerId])), {
    a: 'c',
    b: '',
    c: 'a',
    d: '',
  });
});

void test('debatePartnerUpdates clears both sides of a partnership', () => {
  const updates = debatePartnerUpdates(students, 'a', '');
  assert.deepEqual(Object.fromEntries(updates.map((update) => [update.id, update.partnerId])), {
    a: '',
    b: '',
  });
});

void test('debatePartnerUpdates is a no-op when the partnership is already mutual', () => {
  assert.deepEqual(debatePartnerUpdates(students, 'a', 'b'), []);
  assert.deepEqual(debatePartnerUpdates(students, 'e', ''), []);
});

void test('debatePartnerUpdates repairs a one-sided link', () => {
  const broken = [
    { id: 'a', partnerId: 'b' },
    { id: 'b', partnerId: '' },
  ];
  const updates = debatePartnerUpdates(broken, 'a', 'b');
  assert.deepEqual(Object.fromEntries(updates.map((update) => [update.id, update.partnerId])), {
    a: 'b',
    b: 'a',
  });
});

void test('debatePartnerUpdates rejects a student partnering with themselves', () => {
  assert.throws(() => debatePartnerUpdates(students, 'a', 'a'), /own debate partner/);
});

void test('debatePartnerUpdates rejects an unknown partner', () => {
  assert.throws(() => debatePartnerUpdates(students, 'a', 'missing'), /Choose a student/);
});

function form(slots: Partial<Record<SpeakerSlot, string>> = {}) {
  return {
    aff1: slots.aff1 ?? '',
    aff2: slots.aff2 ?? '',
    neg1: slots.neg1 ?? '',
    neg2: slots.neg2 ?? '',
  };
}

const partners = new Map([
  ['a', 'b'],
  ['b', 'a'],
  ['c', 'd'],
  ['e', 'e'],
]);

function partnerOf(id: string): string | undefined {
  return partners.get(id);
}

void test('assignSpeaker fills the open seat on the same team with the partner', () => {
  assert.deepEqual(assignSpeaker(form(), 'aff1', 'a', partnerOf), form({ aff1: 'a', aff2: 'b' }));
  assert.deepEqual(assignSpeaker(form(), 'neg2', 'c', partnerOf), form({ neg1: 'd', neg2: 'c' }));
});

void test('assignSpeaker keeps a replacement when the auto-filled partner is changed', () => {
  const filled = assignSpeaker(form(), 'aff1', 'a', partnerOf);
  assert.deepEqual(assignSpeaker(filled, 'aff2', 'c', partnerOf), form({ aff1: 'a', aff2: 'c' }));
  assert.deepEqual(assignSpeaker(filled, 'aff2', 'e', partnerOf), form({ aff1: 'a', aff2: 'e' }));
});

void test('assignSpeaker leaves an occupied teammate seat alone', () => {
  assert.deepEqual(
    assignSpeaker(form({ aff2: 'c' }), 'aff1', 'a', partnerOf),
    form({ aff1: 'a', aff2: 'c' }),
  );
});

void test('assignSpeaker does not move a partner who is already on the other team', () => {
  assert.deepEqual(
    assignSpeaker(form({ neg1: 'b' }), 'aff1', 'a', partnerOf),
    form({ aff1: 'a', neg1: 'b' }),
  );
});

void test('assignSpeaker does not fill a partner who is blocked, such as a judge', () => {
  assert.deepEqual(assignSpeaker(form(), 'aff1', 'a', partnerOf, ['b']), form({ aff1: 'a' }));
});

void test('assignSpeaker ignores a missing partner and a self-partner', () => {
  assert.deepEqual(assignSpeaker(form(), 'aff1', 'z', partnerOf), form({ aff1: 'z' }));
  assert.deepEqual(assignSpeaker(form(), 'aff1', 'e', partnerOf), form({ aff1: 'e' }));
});

void test('assignSpeaker clearing a seat does not clear the teammate', () => {
  assert.deepEqual(
    assignSpeaker(form({ aff1: 'a', aff2: 'b' }), 'aff1', '', partnerOf),
    form({ aff2: 'b' }),
  );
});
