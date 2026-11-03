import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatLocalYmd, nextTuesdayDate } from './dates.ts';

void test('formatLocalYmd uses the local calendar date', () => {
  assert.equal(formatLocalYmd(new Date(2026, 10, 3)), '2026-11-03');
});

void test('nextTuesdayDate returns today when today is Tuesday', () => {
  // 2026-11-03 is a Tuesday
  assert.equal(nextTuesdayDate(new Date(2026, 10, 3)), '2026-11-03');
});

void test('nextTuesdayDate advances to the following Tuesday', () => {
  // Monday → next day
  assert.equal(nextTuesdayDate(new Date(2026, 10, 2)), '2026-11-03');
  // Wednesday → next week's Tuesday
  assert.equal(nextTuesdayDate(new Date(2026, 10, 4)), '2026-11-10');
  // Sunday → Tuesday in two days
  assert.equal(nextTuesdayDate(new Date(2026, 10, 1)), '2026-11-03');
});
