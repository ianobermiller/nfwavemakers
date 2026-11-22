import { test, expect } from '@playwright/test';
import PocketBase from 'pocketbase';
import { z } from 'zod';

const realtimeRecordSchema = z.object({
  record: z.object({ id: z.string(), notes: z.string().optional() }),
});

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
  const student = await pb.collection('users').create({
    email: `live-query-${crypto.randomUUID()}@example.com`,
    name: 'Realtime Student',
    role: 'student',
    category: 'tp',
    approved: true,
    verified: true,
    password: 'test-password',
    passwordConfirm: 'test-password',
  });
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
    const delivered: { id: string; notes: string }[] = [];
    const connection = await page.context().newCDPSession(page);
    await connection.send('Network.enable');
    connection.on('Network.eventSourceMessageReceived', (event) => {
      // Observe the app's real SSE connection in both dev and built-preview runs.
      // Connection handshakes have no record and are ignored by the schema.
      const parsed = realtimeRecordSchema.safeParse(JSON.parse(event.data));
      if (parsed.success)
        delivered.push({
          id: parsed.data.record.id,
          notes: parsed.data.record.notes ?? '',
        });
    });
    const now = Date.now();
    await page.clock.install({ time: now });
    await page.clock.pauseAt(now + 1000);
    await page.goto(`/ballot/${ballot.id}`);
    await expect(page.getByText('Original decision', { exact: true })).toBeVisible();
    await page.screenshot({
      path: `/tmp/nfw-0i7n-ballot-${testInfo.project.name}.png`,
      fullPage: true,
    });
    // A visible acknowledged update drains StrictMode's startup revalidation
    // through the same paused debounce, rather than guessing when startup is idle.
    await pb
      .collection('ballots')
      .update(ballot.id, { reason_for_decision: 'Ready for realtime test' });
    await expect.poll(() => delivered.some((event) => event.id === ballot.id)).toBe(true);
    await page.clock.runFor(100);
    await expect(page.getByText('Ready for realtime test', { exact: true })).toBeVisible();
    const beforeBurst = delivered.length;
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
    await expect
      .poll(
        () =>
          delivered
            .slice(beforeBurst)
            .filter((event) => event.id === ballot.id || event.id === evaluation.id).length,
      )
      .toBe(5);
    // Only advance the debounce after all five actual SSE events have arrived.
    await page.clock.runFor(100);
    await expect(page.getByText('Updated decision', { exact: true })).toBeVisible();
    await expect(page.getByText('Burst feedback 3', { exact: true })).toBeVisible();
    expect(reloads).toBe(1);
    await page.screenshot({
      path: `/tmp/nfw-0i7n-updated-${testInfo.project.name}.png`,
      fullPage: true,
    });
    const beforeUnrelated = reloads;
    await pb.collection('speaker_evals').update(otherEvaluation.id, { notes: 'Unrelated edit' });
    await expect
      .poll(() =>
        delivered.some(
          (event) => event.id === otherEvaluation.id && event.notes === 'Unrelated edit',
        ),
      )
      .toBe(true);
    await page.clock.runFor(100);
    expect(reloads).toBe(beforeUnrelated);
    await pb
      .collection('speaker_evals')
      .update(evaluation.id, { notes: 'Latest related feedback' });
    await expect
      .poll(() =>
        delivered.some(
          (event) => event.id === evaluation.id && event.notes === 'Latest related feedback',
        ),
      )
      .toBe(true);
    await page.clock.runFor(100);
    await expect(page.getByText('Latest related feedback', { exact: true })).toBeVisible();
    expect(reloads - beforeUnrelated).toBe(1);
    await page.clock.resume();
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
    await pb.collection('users').delete(student.id);
  }
});
