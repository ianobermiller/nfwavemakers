import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fuzzyRank } from './fuzzySearch.ts';

const people = [
  { name: 'John Smith', email: 'john@example.com' },
  { name: 'Jonathan Miles', email: 'jonathan@example.com' },
  { name: 'Mary Jones', email: 'mary@example.com' },
  { name: 'Abe', email: 'abe@example.com' },
  { name: 'Annabelle', email: 'annabelle@example.com' },
];

function names(query: string): string[] {
  return fuzzyRank(people, query, (person) => [person.name, person.email]).map(
    (person) => person.name,
  );
}

void test('an empty query keeps the original order', () => {
  assert.deepEqual(
    names('   '),
    people.map((person) => person.name),
  );
});

void test('weak short-query matches fall below the cutoff', () => {
  assert.deepEqual(names('jhn'), []);
  assert.deepEqual(names('Jhon'), []);
});

void test('a dropped letter in a longer name still matches', () => {
  assert.deepEqual(names('Jonathn'), ['Jonathan Miles']);
});

void test('exact short names and partial names still match', () => {
  assert.deepEqual(names('John'), ['John Smith']);
  assert.deepEqual(names('jo'), ['John Smith', 'Jonathan Miles', 'Mary Jones']);
});

void test('a swapped letter still matches', () => {
  assert.equal(names('Smtih')[0], 'John Smith');
});

void test('a substituted letter still matches', () => {
  assert.equal(names('Annabele')[0], 'Annabelle');
});

void test('tighter matches rank ahead of longer ones', () => {
  const ranked = names('abe');
  assert.ok(ranked.indexOf('Abe') < ranked.indexOf('Annabelle'));
});

void test('every word must match some field', () => {
  assert.equal(names('miles example')[0], 'Jonathan Miles');
  assert.deepEqual(names('miles zzz'), []);
  assert.deepEqual(names('jhn example'), []);
});

void test('matching is case insensitive', () => {
  assert.deepEqual(names('MARY'), ['Mary Jones']);
});

void test('an unrelated query matches nothing', () => {
  assert.deepEqual(names('zzz'), []);
});
