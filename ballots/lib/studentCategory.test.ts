import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseStudentCategory, studentMatchesDebateEvent } from '../types.ts';

void test('parseStudentCategory accepts speech, tp, and ld', () => {
  assert.equal(parseStudentCategory('speech'), 'speech');
  assert.equal(parseStudentCategory('tp'), 'tp');
  assert.equal(parseStudentCategory('ld'), 'ld');
  assert.equal(parseStudentCategory(''), undefined);
  assert.equal(parseStudentCategory('admin'), undefined);
});

void test('studentMatchesDebateEvent matches only the same event', () => {
  assert.equal(studentMatchesDebateEvent('tp', 'tp'), true);
  assert.equal(studentMatchesDebateEvent('ld', 'ld'), true);
  assert.equal(studentMatchesDebateEvent('tp', 'ld'), false);
  assert.equal(studentMatchesDebateEvent('ld', 'tp'), false);
  assert.equal(studentMatchesDebateEvent('speech', 'tp'), false);
  assert.equal(studentMatchesDebateEvent('speech', 'ld'), false);
  assert.equal(studentMatchesDebateEvent(undefined, 'tp'), false);
});
