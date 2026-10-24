import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseAccountCsv } from './accountCsv.ts';

void test('parseAccountCsv parses a normal name,email,role CSV', () => {
  const result = parseAccountCsv(
    'name,email,role\nWellington Obermiller,wells@obermillers.com,student\n',
    'parent',
  );
  assert.deepEqual(result.issues, []);
  assert.equal(result.rows.length, 1);
  assert.deepEqual(result.rows[0], {
    name: 'Wellington Obermiller',
    email: 'wells@obermillers.com',
    role: 'student',
    line: 2,
  });
});

void test('parseAccountCsv swaps name and email when the columns are reversed', () => {
  const csv = [
    'name,email,role',
    'wells@obermillers.com,Wellington Obermiller,student',
    'isla@obermillers.com,Isla Obermiller,student',
  ].join('\n');
  const result = parseAccountCsv(csv, 'student');
  assert.deepEqual(result.issues, []);
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0]!.name, 'Wellington Obermiller');
  assert.equal(result.rows[0]!.email, 'wells@obermillers.com');
  assert.equal(result.rows[1]!.name, 'Isla Obermiller');
  assert.equal(result.rows[1]!.email, 'isla@obermillers.com');
});

void test('parseAccountCsv reports an invalid email before create', () => {
  const result = parseAccountCsv('name,email\nAlice,not-an-email\n', 'student');
  assert.equal(result.rows.length, 0);
  assert.deepEqual(result.issues, [{ line: 2, reason: '"not-an-email" is not a valid email' }]);
});
