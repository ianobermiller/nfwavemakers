import assert from 'node:assert/strict';
import { test } from 'node:test';
import { requestAuthToken, shouldEndSession } from './sessionRefresh.ts';

const token = 'login-token';

void test('a rejected token ends the session', () => {
  assert.equal(shouldEndSession({ status: 401 }, token, token), true);
});

void test('a newer token survives a stale refresh failure', () => {
  assert.equal(shouldEndSession({ status: 401 }, token, 'replaced-token'), false);
  assert.equal(shouldEndSession({ status: 401 }, '', ''), false);
});

void test('network, server, and aborted refreshes keep the login', () => {
  assert.equal(shouldEndSession({ status: 0 }, token, token), false);
  assert.equal(shouldEndSession({ status: 404 }, token, token), false);
  assert.equal(shouldEndSession({ status: 500 }, token, token), false);
  assert.equal(shouldEndSession({ status: 401, isAbort: true }, token, token), false);
  assert.equal(shouldEndSession(new Error('Failed to fetch'), token, token), false);
  assert.equal(shouldEndSession(null, token, token), false);
});

void test('requestAuthToken reads Authorization from each headers shape', () => {
  assert.equal(requestAuthToken(undefined), '');
  assert.equal(requestAuthToken({ Authorization: token }), token);
  assert.equal(requestAuthToken({ authorization: token }), token);
  assert.equal(requestAuthToken([['Authorization', token]]), token);
  assert.equal(requestAuthToken(new Headers({ Authorization: token })), token);
});
