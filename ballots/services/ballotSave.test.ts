import assert from 'node:assert/strict';
import { test } from 'node:test';
import { prepareBallotSave, planBallotSave, type PreparedBallotSave } from './ballotSave.ts';

const saved: PreparedBallotSave = {
  ballotId: 'ballot',
  debateId: 'debate',
  orderConfirmed: ['aff', 'neg'],
  winner: 'aff',
  reasonForDecision: 'Original',
  evals: [
    {
      evalId: 'e1',
      speakerId: 's1',
      position: 'aff1',
      notes: 'First',
      rank: 1,
      delivery: 4,
      conduct: 3,
    },
    { evalId: 'e2', speakerId: 's2', position: 'neg1', notes: 'Second', rank: 2, delivery: 3 },
  ],
};

void test('unchanged normalized input sends no records', () => {
  assert.deepEqual(
    planBallotSave(
      {
        ...saved,
        reasonForDecision: ' Original ',
        evals: saved.evals.map((evaluation) => ({ ...evaluation, notes: ` ${evaluation.notes} ` })),
      },
      saved,
    ),
    { ballot: null, evals: [] },
  );
});

void test('decision-only changes write only the ballot and never clear submission', () => {
  const plan = planBallotSave({ ...saved, reasonForDecision: 'Updated' }, saved);
  assert.equal(plan.ballot?.reason_for_decision, 'Updated');
  assert.equal(plan.evals.length, 0);
  assert.equal(Object.hasOwn(plan.ballot, 'submitted_at'), false);
});

void test('one evaluation change writes that record only', () => {
  const next = {
    ...saved,
    evals: saved.evals.map((evaluation) =>
      evaluation.evalId === 'e1'
        ? { ...evaluation, notes: 'Changed notes', evidenceAndSupport: 5 }
        : evaluation,
    ),
  };
  const plan = planBallotSave(next, saved);
  assert.equal(plan.ballot, null);
  assert.deepEqual(
    plan.evals.map((evaluation) => evaluation.id),
    ['e1'],
  );
  assert.equal(plan.evals[0]?.body.evidence_and_support, 5);
});

void test('rank changes write every affected evaluation atomically', () => {
  const plan = planBallotSave(
    {
      ...saved,
      evals: saved.evals.map((evaluation) => ({
        ...evaluation,
        rank: evaluation.rank === 1 ? 2 : 1,
      })),
    },
    saved,
  );
  assert.equal(plan.ballot, null);
  assert.deepEqual(
    plan.evals.map((evaluation) => evaluation.id),
    ['e1', 'e2'],
  );
});

void test('cleared seats and scores persist explicit empty/null values', () => {
  const second = saved.evals[1];
  assert.ok(second);
  const plan = planBallotSave(
    { ...saved, evals: [{ evalId: 'e1', position: 'aff1', notes: '' }, second] },
    saved,
  );
  const first = plan.evals[0];
  assert.ok(first);
  assert.equal(first.body.speaker, '');
  assert.equal(first.body.notes, '');
  assert.equal(first.body.rank, null);
  assert.equal(first.body.delivery, null);
});

void test('new drafts reserve IDs which survive retries and serialize all initial records', () => {
  let id = 0;
  const initial = prepareBallotSave(
    {
      debateId: 'debate',
      reasonForDecision: '',
      evals: [{ position: 'aff1', speakerId: 's1', notes: '' }],
    },
    () => `id${++id}`,
  );
  const retry = prepareBallotSave(initial, () => assert.fail('retry must reuse IDs'));
  assert.deepEqual(retry, initial);
  assert.equal(planBallotSave(initial).evals.length, 1);
  assert.equal(planBallotSave(initial).ballot?.debate, 'debate');
});

void test('unsuccessful writes keep their old acknowledged baseline for retry', () => {
  const next = { ...saved, reasonForDecision: 'Unsynced' };
  const firstAttempt = planBallotSave(next, saved);
  const retry = planBallotSave(next, saved);
  assert.deepEqual(retry, firstAttempt);
  assert.equal(planBallotSave(next, next).ballot, null);
});

void test('a later edit remains dirty against the exact successful in-flight snapshot', () => {
  const inFlight = { ...saved, reasonForDecision: 'First edit' };
  const later = { ...inFlight, reasonForDecision: 'Second edit' };
  assert.equal(planBallotSave(later, inFlight).ballot?.reason_for_decision, 'Second edit');
});

void test('submission writes its timestamp even when all other fields were acknowledged', () => {
  const submitted = { ...saved, submittedAt: 1_800_000_000_000 };
  const plan = planBallotSave(submitted, saved);
  assert.equal(plan.ballot?.submitted_at, new Date(submitted.submittedAt).toISOString());
  assert.deepEqual(plan.evals, []);
  const lateDraft = planBallotSave(saved, submitted);
  assert.equal(Object.hasOwn(lateDraft.ballot ?? {}, 'submitted_at'), false);
});
