import { test, expect } from '@playwright/test';
import PocketBase from 'pocketbase';

test('ballot realtime updates coalesce, ignore unrelated records, and survive navigation and logout', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  const pb = new PocketBase(process.env['POCKETBASE_TEST_URL']);
  await pb
    .collection('_superusers')
    .authWithPassword(
      process.env['PB_SUPERUSER_EMAIL'] ?? '',
      process.env['PB_SUPERUSER_PASSWORD'] ?? '',
    );
  const judge = await pb
    .collection('users')
    .getFirstListItem(`email = "${process.env['E2E_JUDGE_EMAIL']}"`);
  const student = await pb
    .collection('users')
    .getFirstListItem(`email = "${process.env['E2E_STUDENT_EMAIL']}"`);
  const debate = await pb.collection('debates').create({
    date: '2026-11-21',
    room: `Live ${testInfo.project.name}`,
    aff_team: [student.id],
    judges: [judge.id],
    event: 'tp',
  });
  const otherDebate = await pb.collection('debates').create({
    date: '2026-11-21',
    room: 'Unrelated',
    aff_team: [student.id],
    judges: [judge.id],
    event: 'tp',
  });
  const ballot = await pb.collection('ballots').create({
    debate: debate.id,
    judge: judge.id,
    winner: 'aff',
    reason_for_decision: 'Original decision',
    submitted_at: new Date().toISOString(),
  });
  const otherBallot = await pb.collection('ballots').create({
    debate: otherDebate.id,
    judge: judge.id,
    winner: 'aff',
    submitted_at: new Date().toISOString(),
  });
  const evaluation = await pb.collection('speaker_evals').create({
    ballot: ballot.id,
    speaker: student.id,
    position: 'aff1',
    notes: 'Original feedback',
  });
  const otherEvaluation = await pb.collection('speaker_evals').create({
    ballot: otherBallot.id,
    speaker: student.id,
    position: 'aff1',
    notes: 'Other feedback',
  });
  try {
    await page.goto('/ballots');
    await page.getByRole('button', { name: 'Use a password' }).click();
    await page.locator('#email').fill(process.env['E2E_JUDGE_EMAIL'] ?? '');
    await page.locator('#password').fill(process.env['E2E_PASSWORD'] ?? '');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page.locator('#email')).toBeHidden();
    const dismiss = page.getByRole('button', { name: 'Not now' });
    if (await dismiss.isVisible()) await dismiss.click();
    await page.goto(`/ballot/${ballot.id}`);
    await expect(page.getByText('Original decision', { exact: true })).toBeVisible();
    await page.screenshot({
      path: `/tmp/nfw-0i7n-ballot-${testInfo.project.name}.png`,
      fullPage: true,
    });
    let reloads = 0;
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === `/api/collections/ballots/records/${ballot.id}`)
        reloads++;
    });
    const batch = pb.createBatch();
    batch.collection('ballots').update(ballot.id, { reason_for_decision: 'Updated decision' });
    for (let i = 0; i < 4; i++)
      batch.collection('speaker_evals').update(evaluation.id, { notes: `Burst feedback ${i}` });
    await batch.send();
    await expect(page.getByText('Updated decision', { exact: true })).toBeVisible();
    await expect(page.getByText('Burst feedback 3', { exact: true })).toBeVisible();
    expect(reloads).toBe(1);
    await page.screenshot({
      path: `/tmp/nfw-0i7n-updated-${testInfo.project.name}.png`,
      fullPage: true,
    });
    const beforeUnrelated = reloads;
    await pb.collection('speaker_evals').update(otherEvaluation.id, { notes: 'Unrelated edit' });
    // A following relevant event establishes that the realtime stream has delivered this burst.
    await pb
      .collection('speaker_evals')
      .update(evaluation.id, { notes: 'Latest related feedback' });
    await expect(page.getByText('Latest related feedback', { exact: true })).toBeVisible();
    expect(reloads - beforeUnrelated).toBe(1);
    await page.reload();
    await expect(page.getByText('Latest related feedback', { exact: true })).toBeVisible();
    await page.goto('/lessons');
    await expect(page.getByRole('heading', { name: 'Lessons', exact: true })).toBeVisible();
    await page.goto(`/ballot/${ballot.id}`);
    await expect(page.getByText('Updated decision', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Sign Out', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Sign in or create account' })).toBeVisible();
    await page.screenshot({
      path: `/tmp/nfw-0i7n-signout-${testInfo.project.name}.png`,
      fullPage: true,
    });
    await pb.collection('speaker_evals').update(evaluation.id, { notes: 'After signout' });
    await expect(page.getByRole('heading', { name: 'Sign in or create account' })).toBeVisible();
    expect(pageErrors).toEqual([]);
  } finally {
    await pb.collection('speaker_evals').delete(evaluation.id);
    await pb.collection('speaker_evals').delete(otherEvaluation.id);
    await pb.collection('ballots').delete(ballot.id);
    await pb.collection('ballots').delete(otherBallot.id);
    await pb.collection('debates').delete(debate.id);
    await pb.collection('debates').delete(otherDebate.id);
  }
});
