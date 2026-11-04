import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchBallotRelations, orEqualFilter, uniqueIds } from './ballotHydrate.ts';

void test('uniqueIds drops blanks and duplicates', () => {
  assert.deepEqual(uniqueIds(['a', '', 'b', 'a', null, undefined]), ['a', 'b']);
});

void test('orEqualFilter builds one OR clause per id', () => {
  const filter = (expr: string, params: { value: string }) =>
    expr.replace('{:value}', `"${params.value}"`);
  assert.equal(orEqualFilter('id', ['d1', 'd2'], filter), 'id = "d1" || id = "d2"');
  assert.equal(orEqualFilter('id', [], filter), null);
});

void test('fetchBallotRelations loads debates and evals once for the whole list', async () => {
  let debateCalls = 0;
  let evalCalls = 0;
  const debateArgs: string[][] = [];
  const evalArgs: string[][] = [];

  const result = await fetchBallotRelations(['d1', 'd1', 'd2', ''], ['b1', 'b2', 'b3'], true, {
    loadDebates: async (ids) => {
      debateCalls += 1;
      debateArgs.push(ids);
      return new Map(ids.map((id) => [id, { id }]));
    },
    loadEvals: async (ids) => {
      evalCalls += 1;
      evalArgs.push(ids);
      return new Map(ids.map((id) => [id, [{ ballot: id }]]));
    },
  });

  assert.equal(debateCalls, 1);
  assert.equal(evalCalls, 1);
  assert.deepEqual(debateArgs[0]?.slice().sort(), ['d1', 'd2']);
  assert.deepEqual(evalArgs[0]?.slice().sort(), ['b1', 'b2', 'b3']);
  assert.equal(result.debates.size, 2);
  assert.equal(result.evalsByBallot.size, 3);
});

void test('fetchBallotRelations skips speaker scores when the list does not need them', async () => {
  let evalCalls = 0;

  await fetchBallotRelations(['d1'], ['b1', 'b2'], false, {
    loadDebates: async (ids) => new Map(ids.map((id) => [id, { id }])),
    loadEvals: async () => {
      evalCalls += 1;
      return new Map();
    },
  });

  assert.equal(evalCalls, 0);
});

void test('fetchBallotRelations skips empty id sets without calling loaders', async () => {
  let debateCalls = 0;
  let evalCalls = 0;

  const result = await fetchBallotRelations([], [], true, {
    loadDebates: async () => {
      debateCalls += 1;
      return new Map();
    },
    loadEvals: async () => {
      evalCalls += 1;
      return new Map();
    },
  });

  assert.equal(debateCalls, 0);
  assert.equal(evalCalls, 0);
  assert.equal(result.debates.size, 0);
  assert.equal(result.evalsByBallot.size, 0);
});
