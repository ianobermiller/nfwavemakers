import { test, expect, type Page, type Request as PlaywrightRequest } from '@playwright/test';
import PocketBase from 'pocketbase';
import { z } from 'zod';

const batchSchema = z.object({
  requests: z.array(
    z.object({ method: z.string(), url: z.string(), body: z.record(z.string(), z.unknown()) }),
  ),
});

async function readBatch(request: PlaywrightRequest) {
  const bytes = request.postDataBuffer();
  if (!bytes) throw new Error('Missing batch body');
  const form = await new Response(new Uint8Array(bytes), {
    headers: { 'Content-Type': request.headers()['content-type'] ?? '' },
  }).formData();
  const payload = form.get('@jsonPayload');
  if (typeof payload !== 'string') throw new Error('Missing batch JSON payload');
  return batchSchema.parse(JSON.parse(payload));
}

async function database() {
  const pb = new PocketBase(process.env['POCKETBASE_TEST_URL']);
  await pb
    .collection('_superusers')
    .authWithPassword(
      process.env['PB_SUPERUSER_EMAIL'] ?? '',
      process.env['PB_SUPERUSER_PASSWORD'] ?? '',
    );
  return pb;
}

async function fixture(pb: PocketBase, populated: boolean) {
  const judge = await pb
    .collection('users')
    .getFirstListItem(`email = "${process.env['E2E_JUDGE_EMAIL']}"`);
  const students: { id: string }[] = [];
  for (let i = 0; i < 4; i++)
    students.push(
      await pb.collection('users').create({
        email: `autosave-${crypto.randomUUID()}@example.com`,
        name: `Autosave Student ${i + 1}`,
        role: 'student',
        category: 'tp',
        approved: true,
        verified: true,
        password: 'test-password',
        passwordConfirm: 'test-password',
      }),
    );
  const debate = await pb.collection('debates').create({
    date: '2026-11-21',
    room: 'Autosave',
    event: 'tp',
    aff_team: students.slice(0, 2).map((student) => student.id),
    neg_team: students.slice(2).map((student) => student.id),
    judges: [judge.id],
  });
  if (populated) {
    const ballot = await pb.collection('ballots').create({
      debate: debate.id,
      judge: judge.id,
      winner: 'aff',
      reason_for_decision: 'Original decision',
      speaker_order_confirmed: ['aff', 'neg'],
    });
    for (const [index, position] of ['aff1', 'aff2', 'neg1', 'neg2'].entries())
      await pb.collection('speaker_evals').create({
        ballot: ballot.id,
        speaker: students[index]?.id,
        position,
        rank: index + 1,
        delivery: 4,
        organization: 4,
        evidence_and_support: 4,
        refutation: 4,
        cross_examination: 4,
        conduct: 4,
        notes: `Original ${position}`,
      });
  }
  return {
    debate,
    cleanup: async () => {
      const ballots = await pb
        .collection('ballots')
        .getFullList({ filter: pb.filter('debate = {:debate}', { debate: debate.id }) });
      for (const ballot of ballots) {
        const evals = await pb
          .collection('speaker_evals')
          .getFullList({ filter: pb.filter('ballot = {:ballot}', { ballot: ballot.id }) });
        for (const evaluation of evals) await pb.collection('speaker_evals').delete(evaluation.id);
        await pb.collection('ballots').delete(ballot.id);
      }
      await pb.collection('debates').delete(debate.id);
      for (const student of students) await pb.collection('users').delete(student.id);
    },
  };
}

async function openEditor(page: Page, debateId: string) {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/ballots');
  await page.getByRole('button', { name: 'Use a password' }).click();
  await page.locator('#email').fill(process.env['E2E_JUDGE_EMAIL'] ?? '');
  await page.locator('#password').fill(process.env['E2E_PASSWORD'] ?? '');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page.locator('#email')).toBeHidden();
  const dismiss = page.getByRole('button', { name: 'Not now' });
  if (await dismiss.isVisible()) await dismiss.click();
  await page.goto(`/judge/${debateId}`);
  await expect(page.getByPlaceholder('Reason for decision…')).toBeVisible();
}

test('autosave writes changed records only and submits after the in-flight save', async ({
  page,
}, testInfo) => {
  const pb = await database();
  const data = await fixture(pb, true);
  const batches: z.infer<typeof batchSchema>[] = [];
  const control: { mode: 'normal' | 'fail' | 'hold'; held: boolean; release: () => void } = {
    mode: 'normal',
    held: false,
    release: () => {},
  };
  await page.route('**/api/batch', async (route) => {
    batches.push(await readBatch(route.request()));
    if (control.mode === 'fail') {
      control.mode = 'normal';
      await route.fulfill({ status: 503, json: { message: 'Temporary test outage' } });
    } else {
      if (control.mode === 'hold') {
        control.mode = 'normal';
        control.held = true;
        await new Promise<void>((resolve) => {
          control.release = resolve;
        });
      }
      await route.continue();
    }
  });
  try {
    await openEditor(page, data.debate.id);
    const status = page.getByRole('status', { name: 'Ballot save status' });
    const decision = page.getByPlaceholder('Reason for decision…');
    await expect(status).toHaveText('Saved');
    await decision.fill('Decision only');
    await expect.poll(() => batches.length).toBe(1);
    await expect(status).toHaveText('Saved');
    expect(batches[0]?.requests).toHaveLength(1);
    expect(batches[0]?.requests[0]?.url).toContain('/ballots/records');
    expect(batches[0]?.requests[0]?.body).not.toHaveProperty('submitted_at');
    await decision.fill('Decision only ');
    await expect(status).toHaveText('Saved');
    expect(batches).toHaveLength(1);
    const notes = page.getByPlaceholder('Notes…').first();
    await notes.fill('One evaluation changed');
    await expect.poll(() => batches.length).toBe(2);
    await expect(status).toHaveText('Saved');
    expect(batches[1]?.requests).toHaveLength(1);
    expect(batches[1]?.requests[0]?.url).toContain('/speaker_evals/records');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(150);
    await page.screenshot({
      path: `/tmp/nfw-7i44-saved-${testInfo.project.name}.png`,
      fullPage: true,
      scale: 'css',
    });
    control.mode = 'fail';
    await notes.fill('Failed edit must retry');
    await expect(status).toContainText("Couldn't sync");
    const failed = batches.at(-1);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(150);
    await page.screenshot({
      path: `/tmp/nfw-7i44-retry-${testInfo.project.name}.png`,
      fullPage: true,
      scale: 'css',
    });
    await status.getByRole('button', { name: 'Try again' }).click();
    await expect(status).toHaveText('Saved');
    expect(batches.at(-1)).toEqual(failed);
    control.mode = 'hold';
    await decision.fill('First in-flight decision');
    await expect.poll(() => control.held).toBe(true);
    await expect(status).toHaveText('Saving…');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(150);
    await page.screenshot({
      path: `/tmp/nfw-7i44-saving-${testInfo.project.name}.png`,
      fullPage: true,
      scale: 'css',
    });
    await decision.fill('Latest edit before submitting');
    const beforeSubmission = batches.length;
    await page.getByRole('button', { name: 'Submit Ballot', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Submitting…', exact: true })).toBeDisabled();
    await expect(decision).toBeDisabled();
    expect(batches).toHaveLength(beforeSubmission);
    control.release();
    await expect(page).toHaveURL(/dashboard/);
    expect(batches).toHaveLength(beforeSubmission + 1);
    const submitted = await pb
      .collection('ballots')
      .getFirstListItem(pb.filter('debate = {:debate}', { debate: data.debate.id }));
    expect(submitted['reason_for_decision']).toBe('Latest edit before submitting');
    expect(submitted['submitted_at']).toBeTruthy();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(150);
    await page.screenshot({
      path: `/tmp/nfw-7i44-submitted-${testInfo.project.name}.png`,
      fullPage: true,
      scale: 'css',
    });
    // Allow any obsolete debounce to fire; it must not enqueue a post-submit draft.
    await page.waitForTimeout(650);
    expect(batches).toHaveLength(beforeSubmission + 1);
  } finally {
    control.release();
    await data.cleanup();
  }
});

test('a lost creation response retries the same upsert IDs without remounting or duplicating the draft', async ({
  page,
}, testInfo) => {
  const pb = await database();
  const data = await fixture(pb, false);
  const batches: z.infer<typeof batchSchema>[] = [];
  await page.route('**/api/batch', async (route) => {
    batches.push(await readBatch(route.request()));
    if (batches.length === 1) {
      // PocketBase commits; the browser sees a failure instead of its response.
      await route.fetch();
      await route.fulfill({ status: 503, json: { message: 'Response lost after commit' } });
    } else await route.continue();
  });
  try {
    await openEditor(page, data.debate.id);
    const status = page.getByRole('status', { name: 'Ballot save status' });
    await page.getByPlaceholder('Reason for decision…').fill('Recoverable new draft');
    await expect(status).toContainText("Couldn't sync");
    await expect(page.getByPlaceholder('Reason for decision…')).toHaveValue(
      'Recoverable new draft',
    );
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(150);
    await page.screenshot({
      path: `/tmp/nfw-7i44-creation-retry-${testInfo.project.name}.png`,
      fullPage: true,
      scale: 'css',
    });
    await status.getByRole('button', { name: 'Try again' }).click();
    await expect(status).toHaveText('Saved');
    expect(batches).toHaveLength(2);
    expect(batches[1]?.requests).toEqual(batches[0]?.requests);
    const saved = await pb
      .collection('ballots')
      .getFullList({ filter: pb.filter('debate = {:debate}', { debate: data.debate.id }) });
    expect(saved).toHaveLength(1);
    const evaluations = await pb
      .collection('speaker_evals')
      .getFullList({ filter: pb.filter('ballot = {:ballot}', { ballot: saved[0]?.id }) });
    expect(evaluations).toHaveLength(4);
    await page.reload();
    await expect(page.getByPlaceholder('Reason for decision…')).toHaveValue(
      'Recoverable new draft',
    );
  } finally {
    await data.cleanup();
  }
});
