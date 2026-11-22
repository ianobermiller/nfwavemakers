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
  await page.goto('/admin-ballots');
  await page.getByRole('button', { name: 'Use a password' }).click();
  await page.locator('#email').fill(process.env['E2E_ADMIN_EMAIL'] ?? '');
  await page.locator('#password').fill(process.env['E2E_PASSWORD'] ?? '');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.locator('#email').waitFor({ state: 'hidden' });
  const notNow = page.getByRole('button', { name: 'Not now' });
  if (await notNow.isVisible()) await notNow.click();
  await page.goto('/admin-ballots');
  await expect(page.getByRole('heading', { name: 'All Ballots', exact: true })).toBeVisible();
}

test('admin summaries paginate without fetching feedback until expanded', async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== 'chromium',
    'Large pagination fixture runs once; mobile has its own UI check.',
  );
  const pb = await database();
  const judge = await pb.collection('users').getFirstListItem('email = "judge@example.com"');
  const suffix = crypto.randomUUID().slice(0, 8);
  const students: string[] = [];
  const debates: string[] = [];
  const ballots: string[] = [];
  try {
    for (let index = 0; index < 23; index += 1) {
      const student = await pb.collection('users').create({
        email: `summary-${suffix}-${index}@example.com`,
        name: `AAA Summary ${suffix} ${String(index).padStart(2, '0')}`,
        role: 'student',
        category: 'tp',
        approved: true,
        verified: true,
        password: 'summary-test-password',
        passwordConfirm: 'summary-test-password',
      });
      students.push(student.id);
      const debate = await pb.collection('debates').create({
        date: `2040-01-${String(index + 1).padStart(2, '0')}`,
        room: `Summary ${suffix} ${index}`,
        event: 'tp',
        aff_team: [student.id],
        neg_team: [],
        judges: [judge.id],
      });
      debates.push(debate.id);
      const ballot = await pb.collection('ballots').create({
        debate: debate.id,
        judge: judge.id,
        submitted_at: '2040-01-24 12:00:00.000Z',
        winner: 'aff',
        reason_for_decision: `Private feedback ${suffix} ${index}`,
      });
      ballots.push(ballot.id);
      await pb.collection('speaker_evals').create({
        ballot: ballot.id,
        speaker: student.id,
        position: 'aff1',
        rank: 1,
        delivery: 4,
        notes: `Speaker notes ${suffix} ${index}`,
      });
    }
    await signIn(page);
    const detailRequests: string[] = [];
    page.on('request', (request) => {
      if (/\/collections\/(ballots|speaker_evals)\/records/.test(request.url()))
        detailRequests.push(request.url());
    });
    await expect(page.locator('input[type=date]')).toHaveCount(0);
    const cards = page.locator('[id^="debate-btn-"]');
    await expect(cards).toHaveCount(20);
    await expect(
      page.getByRole('button', { name: new RegExp(`Summary ${suffix} 22`) }),
    ).toContainText('1 ballot');
    expect(detailRequests).toHaveLength(0);
    await expect(page.getByText(`Private feedback ${suffix} 22`)).toHaveCount(0);
    await page.screenshot({
      path: `/tmp/nfw-ru86-debates-${info.project.name}.png`,
      fullPage: false,
      scale: 'css',
    });
    await page.getByRole('button', { name: 'Load more', exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({
      path: '/tmp/nfw-ru86-load-more-link.png',
      fullPage: false,
      scale: 'css',
      animations: 'disabled',
    });
    let release = (): void => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/api/collections/admin_ballot_debates/records*', async (route) => {
      if (new URL(route.request().url()).searchParams.get('filter')?.includes('id <')) await gate;
      await route.continue();
    });
    await page.getByRole('button', { name: 'Load more', exact: true }).click();
    await expect(page.getByText('Loading more…')).toBeVisible();
    await expect(cards).toHaveCount(20);
    await page.screenshot({
      path: '/tmp/nfw-ru86-load-more-loading.png',
      fullPage: false,
      scale: 'css',
      animations: 'disabled',
    });
    release();
    await expect(page.locator(`#debate-btn-${debates[0]}`)).toBeVisible();
    await page.unroute('**/api/collections/admin_ballot_debates/records*');
    await expect(cards).not.toHaveCount(20);
    await expect(page.locator(`#debate-btn-${debates[22]}`)).toBeAttached();
    expect(detailRequests).toHaveLength(0);
    await page.locator(`#debate-btn-${debates[0]}`).scrollIntoViewIfNeeded();
    await page.screenshot({
      path: '/tmp/nfw-ru86-load-more-debates.png',
      fullPage: false,
      scale: 'css',
      animations: 'disabled',
    });
    const first = page.getByRole('button', { name: new RegExp(`Summary ${suffix} 22`) });
    await first.click();
    await expect(page.getByText(`Private feedback ${suffix} 22`)).toBeVisible();
    await expect(page.getByText(`Speaker notes ${suffix} 22`)).toBeVisible();
    expect(detailRequests.length).toBeGreaterThan(0);
    await page.screenshot({
      path: `/tmp/nfw-ru86-debate-open-${info.project.name}.png`,
      fullPage: false,
      scale: 'css',
    });
    await first.click();
    await expect(page.getByText(`Private feedback ${suffix} 22`)).toHaveCount(0);
    detailRequests.length = 0;

    // Moving a ballot away must refresh the old debate count too.
    await pb.collection('ballots').update(ballots[22] ?? '', { debate: '' });
    await expect(first).toContainText('0 ballots');
    await pb.collection('ballots').update(ballots[22] ?? '', { debate: debates[22] });
    await expect(first).toContainText('1 ballot');

    // A collapsed page must not fetch feedback when another ballot is created.
    const admin = await pb.collection('users').getFirstListItem('email = "admin@example.com"');
    const draft = await pb.collection('ballots').create({ debate: debates[0], judge: admin.id });
    ballots.push(draft.id);
    await page.waitForTimeout(400);
    expect(detailRequests).toHaveLength(0);
    // A visible ballot change updates its count without loading any feedback.
    detailRequests.length = 0;
    await pb
      .collection('ballots')
      .update(ballots[22] ?? '', { deleted_at: new Date().toISOString() });
    await expect(first).toContainText('0 ballots');
    expect(detailRequests).toHaveLength(0);
    await pb.collection('ballots').update(ballots[22] ?? '', { deleted_at: '' });
    await expect(first).toContainText('1 ballot');

    await page.getByRole('button', { name: 'By Student', exact: true }).click();
    const studentCards = page.locator('[id^="student-btn-"]');
    await expect(studentCards).toHaveCount(20);
    expect(detailRequests).toHaveLength(0);
    await page.screenshot({
      path: `/tmp/nfw-ru86-students-${info.project.name}.png`,
      fullPage: false,
      scale: 'css',
    });
    await studentCards.first().click();
    await expect(page.getByText(`Speaker notes ${suffix} 0`)).toBeVisible();
    await page.screenshot({
      path: `/tmp/nfw-ru86-student-open-${info.project.name}.png`,
      fullPage: true,
      scale: 'css',
    });
    let failedStudentRequests = 0;
    await page.route('**/api/collections/admin_ballot_students/records*', (route) => {
      if (new URL(route.request().url()).searchParams.get('filter')?.includes('id >')) {
        failedStudentRequests += 1;
        return route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Could not load more students' }),
        });
      }
      return route.continue();
    });
    await page.getByRole('button', { name: 'Load more', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Could not load more students');
    await expect(studentCards).toHaveCount(20);
    await expect(page.getByText(`Speaker notes ${suffix} 0`)).toBeVisible();
    await page.getByRole('alert').scrollIntoViewIfNeeded();
    await page.screenshot({
      path: '/tmp/nfw-ru86-load-more-error.png',
      fullPage: false,
      scale: 'css',
      animations: 'disabled',
    });
    const failedBeforeRefresh = failedStudentRequests;
    await pb
      .collection('ballots')
      .update(ballots[0] ?? '', { reason_for_decision: 'Updated while Load more awaits retry' });
    await expect.poll(() => failedStudentRequests).toBeGreaterThan(failedBeforeRefresh);
    await page.unroute('**/api/collections/admin_ballot_students/records*');
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await expect(page.locator(`#student-btn-${students[22]}`)).toBeVisible();
    await expect(page.getByText(`Speaker notes ${suffix} 0`)).toBeVisible();
    await page.locator(`#student-btn-${students[22]}`).scrollIntoViewIfNeeded();
    await page.screenshot({
      path: '/tmp/nfw-ru86-load-more-students.png',
      fullPage: false,
      scale: 'css',
      animations: 'disabled',
    });
    await page.getByRole('button', { name: 'By Debate', exact: true }).click();

    await page.route('**/api/collections/admin_ballot_students/records*', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Temporarily unavailable' }),
      }),
    );
    await page.getByRole('button', { name: 'By Student', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Temporarily unavailable');
    await page.screenshot({
      path: `/tmp/nfw-ru86-error-${info.project.name}.png`,
      fullPage: true,
      scale: 'css',
    });
    await page.unroute('**/api/collections/admin_ballot_students/records*');
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await expect(studentCards).toHaveCount(20);
  } finally {
    // Deleting debates cascades ballots/evaluations; users can then be removed.
    for (const id of ballots) await pb.collection('ballots').delete(id);
    for (const id of debates) await pb.collection('debates').delete(id);
    for (const id of students) await pb.collection('users').delete(id);
  }
});

test('ballot summary views enforce admin-only collection rules', async () => {
  const url = process.env['POCKETBASE_TEST_URL'];
  const guest = new PocketBase(url);
  const student = new PocketBase(url);
  await student
    .collection('users')
    .authWithPassword(process.env['E2E_STUDENT_EMAIL'] ?? '', process.env['E2E_PASSWORD'] ?? '');
  const admin = new PocketBase(url);
  await admin
    .collection('users')
    .authWithPassword(process.env['E2E_ADMIN_EMAIL'] ?? '', process.env['E2E_PASSWORD'] ?? '');
  for (const collection of ['admin_ballot_debates', 'admin_ballot_students']) {
    expect((await guest.collection(collection).getList(1, 20)).items).toEqual([]);
    expect((await student.collection(collection).getList(1, 20)).items).toEqual([]);
    const allowed = await admin.collection(collection).getList(1, 20);
    expect(allowed.items.length).toBeGreaterThan(0);
    await expect(
      guest.collection(collection).getOne(allowed.items[0]?.id ?? ''),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      student.collection(collection).getOne(allowed.items[0]?.id ?? ''),
    ).rejects.toMatchObject({ status: 404 });
  }
});

test('admin ballot views fit a phone and keep feedback inside the selected row', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'mobile', 'Responsive check uses a phone.');
  await signIn(page);

  const row = page.locator(`#debate-btn-${process.env['E2E_DEBATE_ID']}`);
  await expect(page.locator('[id^="debate-btn-"]').first()).toBeVisible();
  while ((await row.count()) === 0) {
    await page.getByRole('button', { name: 'Load more', exact: true }).click();
    await expect(page.getByText(/Loading (ballots|more)…/)).toHaveCount(0);
  }
  await expect(row).toBeVisible();
  await page.screenshot({ path: '/tmp/nfw-ru86-debates-mobile.png', fullPage: true, scale: 'css' });
  await row.click();
  await expect(page.getByText('Affirmative had stronger evidence.', { exact: true })).toBeVisible();
  await page.screenshot({
    path: '/tmp/nfw-ru86-debate-open-mobile.png',
    fullPage: true,
    scale: 'css',
  });
  await page.getByRole('button', { name: 'By Student', exact: true }).click();
  const pb = await database();
  const seededStudent = await pb
    .collection('users')
    .getFirstListItem('email = "student@example.com"');
  const student = page.locator(`#student-btn-${seededStudent.id}`);
  await expect(page.locator('[id^="student-btn-"]').first()).toBeVisible();
  while ((await student.count()) === 0) {
    await page.getByRole('button', { name: 'Load more', exact: true }).click();
    await expect(page.getByText(/Loading (ballots|more)…/)).toHaveCount(0);
  }
  await expect(student).toBeVisible();
  await student.click();
  await expect(page.getByRole('region')).toBeVisible();
  await expect(page.getByText(/Loading (ballots|more)…/)).toHaveCount(0);
  await page.screenshot({
    path: '/tmp/nfw-ru86-student-open-mobile.png',
    fullPage: true,
    scale: 'css',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Stranded', exact: true }).click();
  await expect(page.getByText(/Loading (ballots|more)…/)).toHaveCount(0);
  await page.screenshot({
    path: '/tmp/nfw-ru86-stranded-mobile.png',
    fullPage: true,
    scale: 'css',
  });
});

test('expanded feedback paginates and stranded ballot deletion can be undone', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'chromium', 'Fixture runs once.');
  const pb = await database();
  const student = await pb.collection('users').getFirstListItem('email = "student@example.com"');
  const suffix = crypto.randomUUID().slice(0, 8);
  const judges: string[] = [];
  const ballots: string[] = [];
  const debate = await pb.collection('debates').create({
    date: '2045-03-10',
    room: `Feedback ${suffix}`,
    event: 'ld',
    aff_team: [student.id],
    neg_team: [],
    judges: [],
  });
  let strandedId: string | undefined;
  try {
    for (let index = 0; index < 21; index += 1) {
      const judge = await pb.collection('users').create({
        email: `feedback-${suffix}-${index}@example.com`,
        name: `Feedback Judge ${index}`,
        role: 'parent',
        approved: true,
        verified: true,
        password: 'feedback-test-password',
        passwordConfirm: 'feedback-test-password',
      });
      judges.push(judge.id);
      const ballot = await pb.collection('ballots').create({
        judge: judge.id,
        debate: debate.id,
        submitted_at: `2045-03-10 12:${String(index).padStart(2, '0')}:00.000Z`,
        winner: 'aff',
        reason_for_decision: `Decision ${suffix} ${index}`,
      });
      ballots.push(ballot.id);
      await pb.collection('speaker_evals').create({
        ballot: ballot.id,
        speaker: student.id,
        position: 'aff1',
        delivery: 4,
        notes: `Feedback ${suffix} ${index}`,
      });
    }
    await signIn(page);

    const row = page.locator(`#debate-btn-${debate.id}`);
    await expect(row).toContainText('21 ballots');
    await row.click();
    await expect(page.getByText(`Decision ${suffix} 20`, { exact: true })).toBeVisible();
    await expect(page.getByText(`Decision ${suffix} 0`, { exact: true })).toHaveCount(0);
    const feedbackNav = page.getByRole('navigation', { name: 'Feedback pages' });
    await feedbackNav.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText(`Decision ${suffix} 0`, { exact: true })).toBeVisible();
    await expect(page.getByText(`Decision ${suffix} 20`, { exact: true })).toHaveCount(0);
    await page.screenshot({
      path: '/tmp/nfw-ru86-feedback-page-two.png',
      fullPage: true,
      scale: 'css',
    });
    await page.getByRole('button', { name: 'By Student', exact: true }).click();
    await page.locator(`#student-btn-${student.id}`).click();
    await expect(page.getByText(`Feedback ${suffix} 20`, { exact: true })).toBeVisible();
    await expect(page.getByText(`Feedback ${suffix} 0`, { exact: true })).toHaveCount(0);
    await feedbackNav.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText(`Feedback ${suffix} 0`, { exact: true })).toBeVisible();
    await page.screenshot({
      path: '/tmp/nfw-ru86-student-feedback-page-two.png',
      fullPage: true,
      scale: 'css',
    });

    const stranded = await pb
      .collection('ballots')
      .create({ judge: judges[0], debate: '', submitted_at: '2045-03-10 12:00:00.000Z' });
    strandedId = stranded.id;
    await page.getByRole('button', { name: 'Stranded', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Delete ballot', exact: true })).toBeVisible();
    await page.screenshot({ path: '/tmp/nfw-ru86-stranded.png', fullPage: true, scale: 'css' });
    await page.getByRole('button', { name: 'Delete ballot', exact: true }).click();
    await expect(page.getByText('Ballot deleted.', { exact: true })).toBeVisible();
    await page.screenshot({
      path: '/tmp/nfw-ru86-stranded-deleted.png',
      fullPage: true,
      scale: 'css',
    });
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Delete ballot', exact: true })).toBeVisible();
    expect((await pb.collection('ballots').getOne(stranded.id))['deleted_at']).toBe('');
  } finally {
    if (strandedId) await pb.collection('ballots').delete(strandedId);
    for (const id of ballots) await pb.collection('ballots').delete(id);
    await pb.collection('debates').delete(debate.id);
    for (const id of judges) await pb.collection('users').delete(id);
  }
});

test('summary cursors handle tied sort keys and live changes at the loaded boundary', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'chromium', 'Cursor fixture runs once.');
  const pb = await database();
  const judge = await pb.collection('users').getFirstListItem('email = "judge@example.com"');
  const suffix = crypto.randomUUID().slice(0, 8);
  const students: string[] = [];
  const debates: string[] = [];
  const ballots: string[] = [];
  const ballotByStudent = new Map<string, string>();
  const requests: URL[] = [];
  page.on('request', (request) => {
    if (/\/collections\/admin_ballot_(debates|students)\/records/.test(request.url()))
      requests.push(new URL(request.url()));
  });
  async function add(label: string, studentId?: string, debateId?: string) {
    const student = await pb.collection('users').create({
      ...(studentId ? { id: studentId } : {}),
      email: `cursor-${suffix}-${label}@example.com`,
      name: 'AAA Cursor Student',
      role: 'student',
      category: 'tp',
      approved: true,
      verified: true,
      password: 'cursor-test-password',
      passwordConfirm: 'cursor-test-password',
    });
    students.push(student.id);
    const debate = await pb.collection('debates').create({
      ...(debateId ? { id: debateId } : {}),
      date: '2049-01-10',
      room: `Cursor ${suffix} ${label}`,
      event: 'tp',
      aff_team: [student.id],
      neg_team: [],
      judges: [judge.id],
    });
    debates.push(debate.id);
    const ballot = await pb.collection('ballots').create({
      debate: debate.id,
      judge: judge.id,
      submitted_at: '2049-01-10 12:00:00.000Z',
      winner: 'aff',
      reason_for_decision: `Cursor decision ${suffix} ${label}`,
    });
    ballots.push(ballot.id);
    ballotByStudent.set(student.id, ballot.id);
    await pb.collection('speaker_evals').create({
      ballot: ballot.id,
      speaker: student.id,
      position: 'aff1',
      notes: `Cursor feedback ${suffix} ${label}`,
    });
    return { student, debate };
  }
  const debateCards = page.locator('[id^="debate-btn-"]');
  const studentCards = page.locator('[id^="student-btn-"]');
  const ids = (kind: 'debate' | 'student') =>
    page
      .locator(`[id^="${kind}-btn-"]`)
      .evaluateAll(
        (elements, prefix) => elements.map((element) => element.id.slice(prefix.length)),
        `${kind}-btn-`,
      );
  try {
    for (let index = 0; index < 25; index += 1) await add(String(index));
    const firstDebates = [...debates].sort().reverse().slice(0, 20);
    const originalDebateBoundary = firstDebates[19] ?? '';
    await signIn(page);
    await expect(debateCards).toHaveCount(20);
    expect(await ids('debate')).toEqual(firstDebates);
    const first = page.locator(`#debate-btn-${firstDebates[0]}`);
    await first.click();
    await expect(
      page.getByRole('region').getByText(new RegExp(`Cursor decision ${suffix}`)),
    ).toBeVisible();
    const inserted = await add('new-first', '000000000000001', 'zzzzzzzzzzzzzzz');
    await expect(debateCards).toHaveCount(21);
    expect(await ids('debate')).toEqual([inserted.debate.id, ...firstDebates]);
    await expect(first).toHaveAttribute('aria-expanded', 'true');
    await pb
      .collection('debates')
      .update(originalDebateBoundary, { deleted_at: new Date().toISOString() });
    await expect(debateCards).toHaveCount(20);
    await page.getByRole('button', { name: 'Load more', exact: true }).click();
    const expectedDebates = debates
      .filter((id) => id !== originalDebateBoundary)
      .sort()
      .reverse();
    await expect(async () => {
      const actual = await ids('debate');
      expect(actual.filter((id) => debates.includes(id))).toEqual(expectedDebates);
      expect(new Set(actual).size).toBe(actual.length);
    }).toPass();
    await expect(first).toHaveAttribute('aria-expanded', 'true');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: '/tmp/nfw-ru86-cursor-debates.png',
      fullPage: false,
      scale: 'css',
      animations: 'disabled',
    });

    await page.getByRole('button', { name: 'By Student', exact: true }).click();
    const firstStudents = [...students].sort().slice(0, 20);
    await expect(studentCards).toHaveCount(20);
    expect(await ids('student')).toEqual(firstStudents);
    const originalStudentBoundary = firstStudents[19] ?? '';
    await page.locator(`#student-btn-${firstStudents[0]}`).click();
    await expect(
      page.getByText(`Cursor feedback ${suffix} new-first`, { exact: true }),
    ).toBeVisible();
    await add('new-second', '000000000000002');
    await expect(studentCards).toHaveCount(21);
    expect(await ids('student')).toEqual([...firstStudents, '000000000000002'].sort());
    await pb.collection('ballots').update(ballotByStudent.get(originalStudentBoundary) ?? '', {
      deleted_at: new Date().toISOString(),
    });
    await expect(studentCards).toHaveCount(20);
    await page.getByRole('button', { name: 'Load more', exact: true }).click();
    const expectedStudents = students.filter((id) => id !== originalStudentBoundary).sort();
    await expect(async () => {
      const actual = await ids('student');
      expect(actual.filter((id) => students.includes(id))).toEqual(expectedStudents);
      expect(new Set(actual).size).toBe(actual.length);
    }).toPass();
    await expect(
      page.getByText(`Cursor feedback ${suffix} new-first`, { exact: true }),
    ).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: '/tmp/nfw-ru86-cursor-students.png',
      fullPage: false,
      scale: 'css',
      animations: 'disabled',
    });
    expect(requests.some((request) => request.searchParams.get('filter')?.includes('id <'))).toBe(
      true,
    );
    expect(requests.some((request) => request.searchParams.get('filter')?.includes('id >'))).toBe(
      true,
    );
    for (const request of requests) {
      expect(request.searchParams.get('page')).toBe('1');
      expect(request.searchParams.get('skipTotal')).toBe('true');
      if (request.searchParams.get('fields') === 'id') {
        expect(request.searchParams.get('perPage')).toBe('1');
        expect(request.searchParams.has('expand')).toBe(false);
      } else {
        const retainedRange = /id >=|id <=/.test(request.searchParams.get('filter') ?? '');
        expect(request.searchParams.get('perPage')).toBe(retainedRange ? '101' : '21');
      }
    }
  } finally {
    for (const id of ballots) await pb.collection('ballots').delete(id);
    for (const id of debates) await pb.collection('debates').delete(id);
    for (const id of students) await pb.collection('users').delete(id);
  }
});
