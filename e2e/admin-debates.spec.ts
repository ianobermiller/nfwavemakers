import { test, expect, type Page } from '@playwright/test';
import PocketBase from 'pocketbase';

test.describe.configure({ mode: 'serial' });

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

async function signIn(page: Page) {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Use a password' }).click();
  await page.locator('#email').fill(process.env['E2E_ADMIN_EMAIL'] ?? '');
  await page.locator('#password').fill(process.env['E2E_PASSWORD'] ?? '');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.locator('#email').waitFor({ state: 'hidden' });
  const notNow = page.getByRole('button', { name: 'Not now' });
  if (await notNow.isVisible()) await notNow.click();
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Manage Debates', exact: true })).toBeVisible();
}

test('Manage Debates uses cursor summaries and fetches ballot IDs only for delete', async ({
  page,
}, info) => {
  test.skip(
    info.project.use.isMobile === true,
    'Large fixture runs once; mobile has its own check.',
  );
  const pb = await database();
  const judge = await pb.collection('users').getFirstListItem('email = "judge@example.com"');
  const admin = await pb.collection('users').getFirstListItem('email = "admin@example.com"');
  const suffix = crypto.randomUUID().slice(0, 8);
  const debateIds: string[] = [];
  const ballotIds: string[] = [];
  try {
    for (let index = 0; index < 23; index += 1) {
      const debate = await pb.collection('debates').create({
        date: '2042-01-01',
        room: `Manage ${suffix} ${index}`,
        event: 'tp',
        judges: [judge.id],
        aff_team: [],
        neg_team: [],
      });
      debateIds.push(debate.id);
    }
    const sorted = [...debateIds].sort().reverse();
    const target = sorted[0] ?? '';
    for (const [index, user] of [judge, admin].entries()) {
      const ballot = await pb.collection('ballots').create({
        debate: target,
        judge: user.id,
        submitted_at: index ? '' : '2042-01-01 12:00:00.000Z',
        reason_for_decision: 'Large private feedback must not load',
        winner: index ? '' : 'aff',
      });
      ballotIds.push(ballot.id);
    }
    const deleted = await pb
      .collection('ballots')
      .create({ debate: target, judge: judge.id, deleted_at: '2042-01-01 12:00:00.000Z' });
    ballotIds.push(deleted.id);
    const detailRequests: URL[] = [];
    const summaryRequests: URL[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (/\/collections\/(ballots|speaker_evals)\/records/.test(url.pathname))
        detailRequests.push(url);
      if (url.pathname.endsWith('/collections/admin_debate_summaries/records'))
        summaryRequests.push(url);
    });
    await signIn(page);
    const rows = page.locator('[id^="manage-debate-"]');
    await expect(rows).toHaveCount(20);
    expect(
      await rows.evaluateAll((nodes) => nodes.map((node) => node.id.replace('manage-debate-', ''))),
    ).toEqual(sorted.slice(0, 20));
    await expect(page.locator(`[id="manage-debate-${target}"]`)).toContainText('2 ballots');
    expect(detailRequests).toHaveLength(0);
    expect(summaryRequests.length).toBeGreaterThan(0);
    for (const request of summaryRequests) {
      expect(request.searchParams.get('page')).toBe('1');
      expect(request.searchParams.get('perPage')).toBe('21');
      expect(request.searchParams.get('skipTotal')).toBe('true');
    }
    await page.screenshot({
      path: '/tmp/nfw-u466-populated.png',
      animations: 'disabled',
      scale: 'css',
    });
    await page.getByRole('button', { name: 'Load more', exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({
      path: '/tmp/nfw-u466-load-more.png',
      animations: 'disabled',
      scale: 'css',
    });
    await page.route('**/api/collections/admin_debate_summaries/records*', async (route) => {
      if (new URL(route.request().url()).searchParams.get('filter')?.includes('id <')) {
        await route.fulfill({ status: 503, json: { message: 'Could not load more debates.' } });
      } else await route.continue();
    });
    await page.getByRole('button', { name: 'Load more', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Could not load more debates.');
    await expect(rows).toHaveCount(20);
    await page.getByRole('alert').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: '/tmp/nfw-u466-append-error.png',
      animations: 'disabled',
      scale: 'css',
    });
    await page.unroute('**/api/collections/admin_debate_summaries/records*');
    let releaseMore = (): void => {};
    const gate = new Promise<void>((resolve) => {
      releaseMore = resolve;
    });
    await page.route('**/api/collections/admin_debate_summaries/records*', async (route) => {
      if (new URL(route.request().url()).searchParams.get('filter')?.includes('id <')) await gate;
      await route.continue();
    });
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await expect(page.getByText('Loading more…')).toBeVisible();
    await page.getByText('Loading more…').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: '/tmp/nfw-u466-append-loading.png',
      animations: 'disabled',
      scale: 'css',
    });
    releaseMore();
    await expect(page.locator(`[id="manage-debate-${sorted[22]}"]`)).toBeVisible();
    await page.unroute('**/api/collections/admin_debate_summaries/records*');
    expect(
      (
        await rows.evaluateAll((nodes) =>
          nodes.map((node) => node.id.replace('manage-debate-', '')),
        )
      ).filter((id) => debateIds.includes(id)),
    ).toEqual(sorted);
    expect(detailRequests).toHaveLength(0);

    // Live count changes include drafts without fetching ballot bodies.
    await pb
      .collection('ballots')
      .update(ballotIds[1] ?? '', { deleted_at: '2042-01-01 12:00:00.000Z' });
    await expect(page.locator(`[id="manage-debate-${target}"]`)).toContainText('1 ballot');
    await pb.collection('ballots').update(ballotIds[1] ?? '', { deleted_at: '' });
    await expect(page.locator(`[id="manage-debate-${target}"]`)).toContainText('2 ballots');
    expect(detailRequests).toHaveLength(0);

    await page
      .locator(`[id="manage-debate-${target}"]`)
      .getByRole('button', { name: 'Debate actions' })
      .click();
    await page.screenshot({ path: '/tmp/nfw-u466-menu.png', animations: 'disabled', scale: 'css' });
    await page.getByRole('menuitem', { name: 'Delete', exact: true }).click();
    await expect(page.getByText('Debate and 2 ballots deleted.')).toBeVisible();
    await page.screenshot({ path: '/tmp/nfw-u466-undo.png', animations: 'disabled', scale: 'css' });
    expect(detailRequests).toHaveLength(1);
    expect(detailRequests[0]?.searchParams.get('fields')).toBe('id');
    await expect
      .poll(async () => (await pb.collection('debates').getOne(target))['deleted_at'])
      .not.toBe('');
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(page.locator(`[id="manage-debate-${target}"]`)).toContainText('2 ballots');
    expect((await pb.collection('ballots').getOne(deleted.id))['deleted_at']).not.toBe('');
    for (const id of ballotIds.slice(0, 2))
      expect((await pb.collection('ballots').getOne(id))['deleted_at']).toBe('');
    const student = new PocketBase(process.env['POCKETBASE_TEST_URL']);
    await student
      .collection('users')
      .authWithPassword(process.env['E2E_STUDENT_EMAIL'] ?? '', process.env['E2E_PASSWORD'] ?? '');
    await expect(
      student.collection('admin_debate_summaries').getList(1, 20),
    ).resolves.toMatchObject({ items: [] });
  } finally {
    for (const id of ballotIds) await pb.collection('ballots').delete(id);
    for (const id of debateIds) await pb.collection('debates').delete(id);
  }
});

test('Manage Debates loading and retry retain dark mobile layout', async ({ page }, info) => {
  const device = info.project.use.isMobile ? 'mobile' : 'chromium';
  await signIn(page);
  await page.screenshot({
    path: `/tmp/nfw-u466-${device}.png`,
    animations: 'disabled',
    scale: 'css',
  });
  await page.route('**/api/collections/admin_debate_summaries/records*', (route) =>
    route.fulfill({ status: 503, json: { message: 'Debates are temporarily unavailable.' } }),
  );
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('Debates are temporarily unavailable.');
  await page.screenshot({
    path: `/tmp/nfw-u466-error-${device}.png`,
    animations: 'disabled',
    scale: 'css',
  });
  await page.unroute('**/api/collections/admin_debate_summaries/records*');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  let release = (): void => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/collections/admin_debate_summaries/records*', async (route) => {
    await gate;
    await route.continue();
  });
  await page.reload();
  await expect(page.getByText('Loading debates…')).toBeVisible();
  await page.screenshot({
    path: `/tmp/nfw-u466-loading-${device}.png`,
    animations: 'disabled',
    scale: 'css',
  });
  release();
  await expect(page.getByText('Loading debates…')).toHaveCount(0);
  await page.unroute('**/api/collections/admin_debate_summaries/records*');
  await page.route('**/api/collections/admin_debate_summaries/records*', (route) =>
    route.fulfill({ json: { page: 1, perPage: 21, totalItems: -1, totalPages: -1, items: [] } }),
  );
  await page.reload();
  await expect(page.getByText('No debates yet.', { exact: true })).toBeVisible();
  await page.screenshot({
    path: `/tmp/nfw-u466-empty-${device}.png`,
    animations: 'disabled',
    scale: 'css',
  });
});
