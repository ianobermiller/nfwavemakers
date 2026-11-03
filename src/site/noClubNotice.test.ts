import assert from 'node:assert/strict';
import { test } from 'node:test';
import { noClubNoticeWhen } from './noClubNotice.ts';

void test('before the tournament the note says next week', () => {
  // Tuesday, November 3, 2026, afternoon Eastern (EST, UTC-5)
  assert.equal(noClubNoticeWhen(new Date('2026-11-03T18:00:00Z')), 'next-week');
  // Monday night Eastern is still the day before
  assert.equal(noClubNoticeWhen(new Date('2026-11-10T04:59:00Z')), 'next-week');
});

void test('on November 10 Eastern the note says today', () => {
  assert.equal(noClubNoticeWhen(new Date('2026-11-10T05:00:00Z')), 'today');
  // 11:59 p.m. Eastern is 04:59 UTC the next calendar day
  assert.equal(noClubNoticeWhen(new Date('2026-11-11T04:59:00Z')), 'today');
});

void test('the note is gone at midnight Eastern on Wednesday, November 11', () => {
  assert.equal(noClubNoticeWhen(new Date('2026-11-11T05:00:00Z')), null);
  assert.equal(noClubNoticeWhen(new Date('2026-11-17T15:00:00Z')), null);
});
