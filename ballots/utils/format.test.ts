import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compareByLastName, formatSpeakerName, formatTeam } from './format.ts';

void test('compareByLastName sorts by last name then full name', () => {
  const people = [
    { name: 'Zed Adams' },
    { name: 'Ann Smith' },
    { name: 'Bob Smith' },
    { name: 'cara jones' },
    { name: 'Abe' },
  ];
  assert.deepEqual(
    [...people].sort(compareByLastName).map((person) => person.name),
    ['Abe', 'Zed Adams', 'cara jones', 'Ann Smith', 'Bob Smith'],
  );
});

void test('compareByLastName treats missing names as empty', () => {
  assert.ok(compareByLastName({}, { name: 'Ann Smith' }) < 0);
  assert.equal(compareByLastName({}, {}), 0);
});

void test('formatSpeakerName uses last name and first initial', () => {
  assert.equal(formatSpeakerName('Alice Smith'), 'Smith, A');
  assert.equal(formatSpeakerName('Abe'), 'Abe, A');
});

void test('formatTeam keeps speaker seat order', () => {
  assert.equal(formatTeam([{ name: 'Ann Smith' }, { name: 'Bob Jones' }]), 'Smith, A / Jones, B');
});
