import { test, expect, type Page } from '@playwright/test';
import PocketBase, { type RecordModel } from 'pocketbase';

async function database() {
  const pb = new PocketBase(process.env['POCKETBASE_TEST_URL']);
  pb.autoCancellation(false);
  await pb
    .collection('_superusers')
    .authWithPassword(
      process.env['PB_SUPERUSER_EMAIL'] ?? '',
      process.env['PB_SUPERUSER_PASSWORD'] ?? '',
    );
  return pb;
}

async function signIn(page: Page, email: string): Promise<void> {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/ballots');
  await page.getByRole('button', { name: 'Use a password' }).click();
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(process.env['E2E_PASSWORD'] ?? '');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.locator('#email').waitFor({ state: 'hidden' });
  const notNow = page.getByRole('button', { name: 'Not now' });
  if (await notNow.isVisible()) await notNow.click();
}

async function fixture(pb: PocketBase, submitted: boolean) {
  const suffix = crypto.randomUUID().slice(0, 8);
  const judge = await pb
    .collection('users')
    .getFirstListItem(`email = "${process.env['E2E_JUDGE_EMAIL']}"`);
  const students: RecordModel[] = [];
  for (let index = 0; index < 5; index += 1) {
    students.push(
      await pb.collection('users').create({
        email: `loading-${suffix}-${index}@example.com`,
        name: `Loading Speaker ${index}`,
        role: 'student',
        category: 'tp',
        approved: true,
        verified: true,
        archived: index === 0,
        password: process.env['E2E_PASSWORD'],
        passwordConfirm: process.env['E2E_PASSWORD'],
      }),
    );
  }
  const avatar = new FormData();
  avatar.set(
    'avatar',
    new File(
      [
        Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
          'base64',
        ),
      ],
      'portrait.png',
      { type: 'image/png' },
    ),
  );
  await pb.collection('users').update(students[0]!.id, avatar);
  const debate = await pb.collection('debates').create({
    date: '2026-12-01',
    room: `Loading ${suffix}`,
    event: 'tp',
    aff_team: students.slice(0, 2).map((student) => student.id),
    neg_team: students.slice(2, 4).map((student) => student.id),
    judges: [judge.id],
  });
  const ballot = await pb.collection('ballots').create({
    debate: debate.id,
    judge: judge.id,
    winner: 'aff',
    speaker_order_confirmed: ['aff', 'neg'],
    submitted_at: submitted ? new Date().toISOString() : '',
    reason_for_decision: 'Loading fixture decision',
  });
  for (const [index, position] of ['aff1', 'aff2', 'neg1', 'neg2'].entries()) {
    await pb.collection('speaker_evals').create({
      ballot: ballot.id,
      speaker: students[index]!.id,
      position,
      rank: index + 1,
      delivery: 4,
      organization: 4,
      evidence_and_support: 4,
      refutation: 4,
      cross_examination: 4,
      conduct: 4,
      notes: `Loading feedback ${position}`,
    });
  }
  return {
    debate,
    ballot,
    students,
    cleanup: async () => {
      const evals = await pb
        .collection('speaker_evals')
        .getFullList({ filter: pb.filter('ballot = {:id}', { id: ballot.id }) });
      for (const record of evals) await pb.collection('speaker_evals').delete(record.id);
      await pb.collection('ballots').delete(ballot.id);
      await pb.collection('debates').delete(debate.id);
      for (const student of students) await pb.collection('users').delete(student.id);
    },
  };
}

test('locked editor loads archived team members and avatars without a directory request', async ({
  page,
}, info) => {
  const pb = await database();
  const data = await fixture(pb, false);
  const directoryRequests: string[] = [];
  await page.route(
    (url) => url.pathname.endsWith('/collections/users/records'),
    async (route) => {
      directoryRequests.push(route.request().url());
      await route.fulfill({
        status: 503,
        json: { message: 'The directory should not be needed.' },
      });
    },
  );
  try {
    await signIn(page, process.env['E2E_JUDGE_EMAIL'] ?? '');
    await page.goto(`/judge/${data.debate.id}`);
    await expect(page.getByPlaceholder('Reason for decision…')).toHaveValue(
      'Loading fixture decision',
    );
    await expect(page.locator('#speaker-aff1')).toHaveValue('Loading Speaker 0');
    await expect(page.locator('#speaker-aff1')).toBeDisabled();
    const portrait = page.locator('#speaker-aff1').locator('..').getByRole('img');
    await expect(portrait).toBeVisible();
    await expect
      .poll(() =>
        portrait.evaluate(
          (image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
        ),
      )
      .toBe(true);
    expect(directoryRequests).toHaveLength(0);
    await page.screenshot({
      path: `/tmp/nfw-eqmb-editor-${info.project.name}.png`,
      scale: 'css',
      animations: 'disabled',
    });
    const firstSpeaker = page
      .locator('div.rounded-xl')
      .filter({ has: page.locator('#speaker-aff1') });
    await firstSpeaker
      .getByPlaceholder('Notes…')
      .fill('Keep archived speaker feedback through team changes.');
    await expect(page.getByRole('status', { name: 'Ballot save status' })).toHaveText('Saved');
    await pb
      .collection('debates')
      .update(data.debate.id, { aff_team: [data.students[0]!.id, data.students[4]!.id] });
    await expect(page.locator('#speaker-aff2')).toHaveValue('Loading Speaker 4');
    await expect(firstSpeaker.getByPlaceholder('Notes…')).toHaveValue(
      'Keep archived speaker feedback through team changes.',
    );
    await pb.collection('users').update(data.students[0]!.id, { name: 'Archived Speaker Renamed' });
    await expect(page.locator('#speaker-aff1')).toHaveValue('Archived Speaker Renamed');
    await expect(page.getByRole('status', { name: 'Ballot save status' })).toHaveText('Saved');
    expect(directoryRequests).toHaveLength(0);
    await firstSpeaker.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `/tmp/nfw-eqmb-live-team-${info.project.name}.png`,
      scale: 'css',
      animations: 'disabled',
    });
    await page.reload();
    await expect(page.locator('#speaker-aff2')).toHaveValue('Loading Speaker 4');
    await expect(firstSpeaker.getByPlaceholder('Notes…')).toHaveValue(
      'Keep archived speaker feedback through team changes.',
    );
    expect(directoryRequests).toHaveLength(0);
  } finally {
    await page.goto('/');
    await data.cleanup();
  }
});

test('debate detail starts independent reads together and hydrates the debate once', async ({
  page,
}, info) => {
  const pb = await database();
  const data = await fixture(pb, true);
  let releaseDebate = (): void => {};
  const gate = new Promise<void>((resolve) => {
    releaseDebate = resolve;
  });
  const requests: URL[] = [];
  try {
    await signIn(page, data.students[1]!['email']);
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (/\/collections\/(debates|ballots|speaker_evals)\/records/.test(url.pathname))
        requests.push(url);
    });
    await page.route(
      (url) => url.pathname.endsWith(`/collections/debates/records/${data.debate.id}`),
      async (route) => {
        await gate;
        await route.continue();
      },
    );
    await page.goto(`/debate/${data.debate.id}`, { waitUntil: 'domcontentloaded' });
    await expect
      .poll(
        () =>
          requests.filter((url) => url.pathname.endsWith('/collections/ballots/records')).length,
      )
      .toBe(1);
    await expect
      .poll(
        () =>
          requests.filter((url) => url.pathname.endsWith('/collections/speaker_evals/records'))
            .length,
      )
      .toBe(1);
    await expect(page.locator('[aria-busy="true"]')).toBeVisible();
    await page.screenshot({
      path: `/tmp/nfw-eqmb-detail-loading-${info.project.name}.png`,
      scale: 'css',
      animations: 'disabled',
    });
    releaseDebate();
    await expect(page.getByText('Loading fixture decision', { exact: true })).toBeVisible();
    await expect(page.getByText('Loading feedback aff1', { exact: true })).toBeVisible();
    expect(
      requests.filter((url) => url.pathname.includes('/collections/debates/records')),
    ).toHaveLength(1);
    expect(
      requests.filter((url) => url.pathname.endsWith('/collections/speaker_evals/records')),
    ).toHaveLength(1);
    await page.screenshot({
      path: `/tmp/nfw-eqmb-detail-${info.project.name}.png`,
      scale: 'css',
      animations: 'disabled',
    });
  } finally {
    releaseDebate();
    await page.goto('/');
    await data.cleanup();
  }
});

test('a missing debate does not open an unlocked editor', async ({ page }, info) => {
  await signIn(page, process.env['E2E_JUDGE_EMAIL'] ?? '');
  await page.goto('/judge/missingdebate00');
  await expect(page.getByText('Debate not found.', { exact: true })).toBeVisible();
  await expect(page.getByPlaceholder('Reason for decision…')).toHaveCount(0);
  await page.screenshot({
    path: `/tmp/nfw-eqmb-missing-${info.project.name}.png`,
    scale: 'css',
    animations: 'disabled',
  });
});
