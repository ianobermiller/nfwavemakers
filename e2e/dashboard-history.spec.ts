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

async function signIn(page: Page, email: string, navigate = true) {
  await page.emulateMedia({ colorScheme: 'dark' });
  if (navigate) await page.goto('/ballots');
  await page.getByRole('button', { name: 'Use a password' }).click();
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(process.env['E2E_PASSWORD'] ?? '');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.locator('#email').waitFor({ state: 'hidden' });
  const notNow = page.getByRole('button', { name: 'Not now' });
  if (await notNow.isVisible()) await notNow.click();
}

const shot = (page: Page, name: string) =>
  page.screenshot({ path: `/tmp/nfw-wl3x-${name}.png`, scale: 'css', animations: 'disabled' });

async function fixture(pb: PocketBase, debateCount = 23) {
  const suffix = crypto.randomUUID().slice(0, 8);
  const users: string[] = [];
  const debates: string[] = [];
  const ballots: string[] = [];
  const evals: string[] = [];
  const createUser = async (name: string, role: string) => {
    const email = `history-${suffix}-${users.length}@example.com`;
    const user = await pb.collection('users').create({
      email,
      name,
      role,
      category: role === 'student' ? 'tp' : '',
      approved: true,
      verified: true,
      password: process.env['E2E_PASSWORD'],
      passwordConfirm: process.env['E2E_PASSWORD'],
    });
    users.push(user.id);
    return { id: user.id, email };
  };
  const student = await createUser('History Student', 'student');
  const otherStudent = await createUser('Other History Student', 'student');
  const judge = await createUser('History Judge Alpha', 'parent');
  const secondJudge = await createUser('History Judge Beta', 'parent');
  for (let index = 0; index < debateCount; index += 1) {
    const debate = await pb.collection('debates').create({
      date: '2020-01-01',
      room: `History ${suffix} ${index}`,
      event: 'tp',
      aff_team: [student.id],
      neg_team: [],
      judges: [judge.id, secondJudge.id],
    });
    debates.push(debate.id);
    for (const user of [judge, secondJudge]) {
      const ballot = await pb.collection('ballots').create({
        debate: debate.id,
        judge: user.id,
        submitted_at: '2043-01-01 12:00:00.000Z',
        winner: 'aff',
        reason_for_decision: 'History private decision',
      });
      ballots.push(ballot.id);
      const evaluation = await pb.collection('speaker_evals').create({
        ballot: ballot.id,
        speaker: student.id,
        position: 'aff1',
        notes: 'History private evaluation',
        delivery: 4,
        rank: 1,
      });
      evals.push(evaluation.id);
    }
  }
  const open = await pb.collection('debates').create({
    date: '2020-01-02',
    room: `Open ${suffix}`,
    event: 'tp',
    judges: [judge.id],
    aff_team: [],
    neg_team: [],
  });
  debates.push(open.id);
  return {
    student,
    otherStudent,
    judge,
    secondJudge,
    debates,
    ballots,
    open,
    cleanup: async () => {
      for (const id of evals) await pb.collection('speaker_evals').delete(id);
      for (const id of ballots) await pb.collection('ballots').delete(id);
      for (const id of debates) await pb.collection('debates').delete(id);
      for (const id of users) await pb.collection('users').delete(id);
    },
  };
}

test('student histories page whole debate groups without fetching private bodies', async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== 'chromium',
    'Large fixture runs once; mobile uses the seeded dashboard.',
  );
  const pb = await database();
  const data = await fixture(pb);
  try {
    const requests: URL[] = [];
    page.on('request', (request) => {
      if (request.method() === 'GET') requests.push(new URL(request.url()));
    });
    await signIn(page, data.student.email);
    const cards = page.locator('[id^="feedback-"]');
    await expect(cards).toHaveCount(20);
    for (const card of await cards.all()) {
      await expect(card).toContainText('Judge: History Judge Alpha');
      await expect(card).toContainText('Judge: History Judge Beta');
    }
    expect(
      requests.filter((url) =>
        /\/collections\/(ballots|speaker_evals)\/records/.test(url.pathname),
      ),
    ).toHaveLength(0);
    const summaries = requests.filter((url) =>
      url.pathname.includes('/student_feedback_summaries/'),
    );
    expect(summaries.length).toBeGreaterThan(0);
    expect(summaries[0]?.searchParams.get('perPage')).toBe('21');
    expect(summaries[0]?.searchParams.get('skipTotal')).toBe('true');
    await shot(page, 'student-populated');
    await page.getByRole('button', { name: 'Load more', exact: true }).scrollIntoViewIfNeeded();
    await shot(page, 'student-more');
    const cursors: string[] = [];
    await page.route('**/api/collections/student_feedback_summaries/records*', async (route) => {
      const filter = new URL(route.request().url()).searchParams.get('filter') ?? '';
      if (filter.includes('id <')) {
        cursors.push(filter);
        await route.fulfill({ status: 503, json: { message: 'History append failed.' } });
      } else await route.continue();
    });
    await page.getByRole('button', { name: 'Load more', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('History append failed.');
    await expect(cards).toHaveCount(20);
    await page.getByRole('alert').scrollIntoViewIfNeeded();
    await shot(page, 'student-append-error');
    await page.unroute('**/api/collections/student_feedback_summaries/records*');
    let release = (): void => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/api/collections/student_feedback_summaries/records*', async (route) => {
      const filter = new URL(route.request().url()).searchParams.get('filter') ?? '';
      if (filter.includes('id <')) {
        cursors.push(filter);
        await gate;
      }
      await route.continue();
    });
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await expect(page.getByText('Loading more…')).toBeVisible();
    await page.getByText('Loading more…').scrollIntoViewIfNeeded();
    await shot(page, 'student-append-loading');
    release();
    await expect(cards).toHaveCount(23);
    expect(cursors[0]).toBe(cursors[1]);
    await page.unroute('**/api/collections/student_feedback_summaries/records*');
    const ids = await cards.evaluateAll((nodes) => nodes.map((node) => node.id));
    expect(new Set(ids).size).toBe(23);
    const sortedDebates = data.debates.slice(0, 23).sort().reverse();
    expect(ids).toEqual(sortedDebates.map((id) => `feedback-${data.student.id}:${id}`));
    await pb.collection('users').update(data.secondJudge.id, { name: 'History Judge Updated' });
    await expect(cards.first()).toContainText('Judge: History Judge Updated');
    await expect(cards).toHaveCount(23);
    await pb.collection('users').update(data.secondJudge.id, { name: 'History Judge Beta' });
    await expect(cards.first()).toContainText('Judge: History Judge Beta');
    // A deleted cursor boundary does not cause duplicate/missing retained groups.
    const boundary = sortedDebates[19] ?? '';
    const index = data.debates.indexOf(boundary);
    for (const id of data.ballots.slice(index * 2, index * 2 + 2))
      await pb.collection('ballots').update(id, { deleted_at: '2043-01-02 12:00:00.000Z' });
    await expect(cards).toHaveCount(22);
    expect(new Set(await cards.evaluateAll((nodes) => nodes.map((node) => node.id))).size).toBe(22);
    expect(
      requests.filter((url) =>
        /\/collections\/(ballots|speaker_evals)\/records/.test(url.pathname),
      ),
    ).toHaveLength(0);

    // The new view must not expose other students or unapproved members.
    const studentClient = new PocketBase(process.env['POCKETBASE_TEST_URL']);
    await studentClient
      .collection('users')
      .authWithPassword(data.student.email, process.env['E2E_PASSWORD'] ?? '');
    const own = await studentClient.collection('student_feedback_summaries').getList(1, 1);
    const other = new PocketBase(process.env['POCKETBASE_TEST_URL']);
    await other
      .collection('users')
      .authWithPassword(data.otherStudent.email, process.env['E2E_PASSWORD'] ?? '');
    expect(
      (await other.collection('student_feedback_summaries').getList(1, 20)).items,
    ).toHaveLength(0);
    await expect(
      other.collection('student_feedback_summaries').getOne(own.items[0]?.id ?? ''),
    ).rejects.toMatchObject({ status: 404 });
    await pb.collection('users').update(data.student.id, { approved: false });
    expect(
      (await studentClient.collection('student_feedback_summaries').getList(1, 20)).items,
    ).toHaveLength(0);
    await expect(
      studentClient.collection('student_feedback_summaries').getOne(own.items[0]?.id ?? ''),
    ).rejects.toMatchObject({ status: 404 });
  } finally {
    await data.cleanup();
  }
});

test('judge history is bounded and old submitted assignments never reopen', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'chromium', 'Large fixture runs once.');
  const pb = await database();
  const data = await fixture(pb);
  try {
    const requests: URL[] = [];
    page.on('request', (request) => {
      if (request.method() === 'GET') requests.push(new URL(request.url()));
    });
    await signIn(page, data.judge.email);
    const submitted = page.locator('[id^="history-ballot-"]');
    await expect(submitted).toHaveCount(20);
    await expect(page.locator('[id^="assigned-debate-"]')).toHaveCount(1);
    await expect(page.locator(`[id="assigned-debate-${data.open.id}"]`)).toBeVisible();
    const ownBallots = data.ballots
      .filter((_, index) => index % 2 === 0)
      .sort()
      .reverse();
    expect(await submitted.evaluateAll((nodes) => nodes.map((node) => node.id))).toEqual(
      ownBallots.slice(0, 20).map((id) => `history-ballot-${id}`),
    );
    const ballotRequests = requests.filter((url) =>
      url.pathname.endsWith('/collections/ballots/records'),
    );
    expect(ballotRequests.length).toBeGreaterThan(0);
    for (const request of ballotRequests) {
      expect(request.searchParams.get('fields')).toBe('id,debate,submitted_at,winner');
      expect(request.searchParams.get('perPage')).toBe('21');
      expect(request.searchParams.get('page')).toBe('1');
      expect(request.searchParams.get('skipTotal')).toBe('true');
    }
    expect(requests.filter((url) => url.pathname.includes('/speaker_evals/'))).toHaveLength(0);
    await shot(page, 'judge-populated');
    await page.getByRole('button', { name: 'Load more', exact: true }).scrollIntoViewIfNeeded();
    await shot(page, 'judge-more');
    await page.getByRole('button', { name: 'Load more', exact: true }).click();
    await expect(submitted).toHaveCount(23);
    await expect(page.locator('[id^="assigned-debate-"]')).toHaveCount(1);
    expect(await submitted.evaluateAll((nodes) => nodes.map((node) => node.id))).toEqual(
      ownBallots.map((id) => `history-ballot-${id}`),
    );
    const old = ownBallots.at(-1) ?? '';
    const oldBallot = await pb.collection('ballots').getOne(old);
    await pb.collection('ballots').update(old, { deleted_at: '2043-01-02 12:00:00.000Z' });
    await expect(submitted).toHaveCount(22);
    await expect(page.locator(`[id="assigned-debate-${oldBallot['debate']}"]`)).toBeVisible();
    await pb.collection('ballots').update(old, { deleted_at: '' });
    await expect(submitted).toHaveCount(23);
    await expect(page.locator('[id^="assigned-debate-"]')).toHaveCount(1);
    const client = new PocketBase(process.env['POCKETBASE_TEST_URL']);
    await client
      .collection('users')
      .authWithPassword(data.judge.email, process.env['E2E_PASSWORD'] ?? '');
    const other = new PocketBase(process.env['POCKETBASE_TEST_URL']);
    await other
      .collection('users')
      .authWithPassword(data.secondJudge.email, process.env['E2E_PASSWORD'] ?? '');
    const ownOpen = await client.collection('judge_open_debates').getList(1, 20);
    await expect(
      other.collection('judge_open_debates').getOne(ownOpen.items[0]?.id ?? ''),
    ).rejects.toMatchObject({ status: 404 });
    await pb.collection('users').update(data.judge.id, { approved: false });
    expect((await client.collection('judge_open_debates').getList(1, 20)).items).toHaveLength(0);
  } finally {
    await data.cleanup();
  }
});

test('same-user relogin abandons pending preloaded history', async ({ page }, info) => {
  const pb = await database();
  const data = await fixture(pb, 2);
  const { student } = data;
  const debateId = data.debates[0];
  if (!debateId) throw new Error('Missing session debate fixture');
  const target = page.locator(`[id="feedback-${student.id}:${debateId}"]`);
  let release = (): void => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requests = 0;
  let delivered = (): void => {};
  const oldDelivered = new Promise<void>((resolve) => {
    delivered = resolve;
  });
  await page.route('**/api/collections/student_feedback_summaries/records*', async (route) => {
    requests += 1;
    if (requests === 1) {
      const response = await route.fetch();
      await gate;
      await route.fulfill({ response });
      delivered();
    } else await route.continue();
  });
  try {
    await signIn(page, student.email);
    await expect(page.getByText('Loading history…')).toBeVisible();
    await page.getByText('Loading history…').scrollIntoViewIfNeeded();
    await shot(page, `student-loading-${info.project.name}`);
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await page.getByRole('menuitem', { name: 'Sign Out', exact: true }).click();
    await page.locator('#email').waitFor({ state: 'visible' });
    await pb.collection('debates').update(debateId, { room: 'Fresh relogin history' });
    await signIn(page, student.email, false);
    await expect(target).toContainText('Fresh relogin history');
    await expect(page.locator('[id^="feedback-"]')).toHaveCount(2);
    expect(requests).toBeGreaterThanOrEqual(2);
    release();
    await oldDelivered;
    await expect(target).toContainText('Fresh relogin history');
    await target.scrollIntoViewIfNeeded();
    await shot(page, `student-relogin-${info.project.name}`);
  } finally {
    release();
    await data.cleanup();
  }
});

test('history initial errors retry and empty state renders in dark mode', async ({
  page,
}, info) => {
  const pb = await database();
  const data = await fixture(pb, 2);
  try {
    await page.route('**/api/collections/student_feedback_summaries/records*', (route) =>
      route.fulfill({ status: 503, json: { message: 'History unavailable.' } }),
    );
    await signIn(page, data.student.email);
    await expect(page.getByRole('alert')).toContainText('History unavailable.');
    await page.getByRole('alert').scrollIntoViewIfNeeded();
    await shot(page, `student-error-${info.project.name}`);
    await page.unroute('**/api/collections/student_feedback_summaries/records*');
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await expect(page.locator('[id^="feedback-"]')).toHaveCount(2);
    await page.locator('[id^="feedback-"]').first().scrollIntoViewIfNeeded();
    await shot(page, `student-${info.project.name}`);
    await page.route('**/api/collections/student_feedback_summaries/records*', (route) =>
      route.fulfill({ json: { page: 1, perPage: 21, totalItems: -1, totalPages: -1, items: [] } }),
    );
    await page.reload();
    await expect(page.getByText('No submitted ballots yet.', { exact: true })).toBeVisible();
    await page.getByText('No submitted ballots yet.', { exact: true }).scrollIntoViewIfNeeded();
    await shot(page, `student-empty-${info.project.name}`);
  } finally {
    await data.cleanup();
  }
});
