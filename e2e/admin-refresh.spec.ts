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

async function signIn(page: Page): Promise<void> {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Use a password' }).click();
  await page.locator('#email').fill(process.env['E2E_ADMIN_EMAIL'] ?? '');
  await page.locator('#password').fill(process.env['E2E_PASSWORD'] ?? '');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.locator('#email').waitFor({ state: 'hidden' });
  const notNow = page.getByRole('button', { name: 'Not now' });
  if (await notNow.isVisible()) await notNow.click();
}

test('80 loaded rows refresh with one bounded range and an id-only existence request', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const pb = await database();
  const judge = await pb.collection('users').getFirstListItem('email = "judge@example.com"');
  const suffix = crypto.randomUUID().slice(0, 8);
  const students: string[] = [];
  const debates: string[] = [];
  const ballots: string[] = [];
  const studentNames = new Map<string, string>();
  const studentNotes = new Map<string, string>();
  const debateRooms = new Map<string, string>();
  const requests: URL[] = [];
  const viewNames = ['admin_debate_summaries', 'admin_ballot_debates', 'admin_ballot_students'];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (viewNames.some((name) => url.pathname.endsWith(`/collections/${name}/records`)))
      requests.push(url);
  });
  try {
    for (let index = 0; index < 85; index += 1) {
      const name = `ZZZ Refresh ${suffix} ${String(index).padStart(3, '0')}`;
      const student = await pb.collection('users').create({
        email: `refresh-${suffix}-${index}@example.com`,
        name,
        role: 'student',
        category: 'tp',
        approved: true,
        verified: true,
        password: 'refresh-test-password',
        passwordConfirm: 'refresh-test-password',
      });
      students.push(student.id);
      studentNames.set(student.id, name);
      const room = `Refresh ${suffix} ${index}`;
      const debate = await pb.collection('debates').create({
        date: '1940-01-10',
        room,
        event: 'tp',
        aff_team: [student.id],
        neg_team: [],
        judges: [judge.id],
      });
      debates.push(debate.id);
      debateRooms.set(debate.id, room);
      const ballot = await pb.collection('ballots').create({
        debate: debate.id,
        judge: judge.id,
        submitted_at: '1940-01-10 12:00:00.000Z',
        winner: 'aff',
        reason_for_decision: `Refresh feedback ${suffix} ${index}`,
      });
      ballots.push(ballot.id);
      await pb.collection('speaker_evals').create({
        ballot: ballot.id,
        speaker: student.id,
        position: 'aff1',
        notes: `Refresh notes ${suffix} ${index}`,
      });
      studentNotes.set(student.id, `Refresh notes ${suffix} ${index}`);
    }
    await signIn(page);
    for (const [kind, collection, prefix] of [
      ['manage', 'admin_debate_summaries', 'manage-debate-'],
      ['debate', 'admin_ballot_debates', 'debate-btn-'],
      ['student', 'admin_ballot_students', 'student-btn-'],
    ]) {
      await page.goto(kind === 'manage' ? '/admin' : '/admin-ballots');
      if (kind === 'student')
        await page.getByRole('button', { name: 'By Student', exact: true }).click();
      const cards = page.locator(`[id^="${prefix}"]`);
      await expect(cards).toHaveCount(20);
      for (let count = 40; count <= 80; count += 20) {
        await page.getByRole('button', { name: 'Load more', exact: true }).click();
        await expect(cards).toHaveCount(count);
      }
      const before = await cards.evaluateAll(
        (nodes, start) => nodes.map((node) => node.id.slice(start.length)),
        prefix!,
      );
      const target = before.find((id) => (kind === 'student' ? studentNames : debateRooms).has(id));
      if (!target) throw new Error('No fixture record loaded');
      const card = page.locator(`[id="${prefix}${target}"]`);
      if (kind === 'student') {
        await card.click();
        await expect(page.getByText(studentNotes.get(target) ?? '', { exact: true })).toBeVisible();
      }
      for (const request of requests.filter((url) =>
        url.pathname.endsWith(`/collections/${collection}/records`),
      )) {
        expect(request.searchParams.get('page')).toBe('1');
        expect(request.searchParams.get('perPage')).toBe('21');
      }
      requests.length = 0;
      const tailResponse = page.waitForResponse((response) => {
        const url = new URL(response.url());
        return (
          url.pathname.endsWith(`/collections/${collection}/records`) &&
          url.searchParams.get('fields') === 'id'
        );
      });
      if (kind === 'student') {
        await pb
          .collection('users')
          .update(target, { name: `${studentNames.get(target)} Refreshed` });
      } else {
        const room = `${debateRooms.get(target)} ${kind} refreshed`;
        debateRooms.set(target, room);
        await pb.collection('debates').update(target, { room });
      }
      const tail = await tailResponse;
      await expect(card).toContainText(kind === 'student' ? 'Refreshed' : `${kind} refreshed`);
      await expect(cards).toHaveCount(80);
      expect(
        await cards.evaluateAll(
          (nodes, start) => nodes.map((node) => node.id.slice(start.length)),
          prefix!,
        ),
      ).toEqual(before);
      expect(new Set(before).size).toBe(80);
      const refreshRequests = requests.filter((url) =>
        url.pathname.endsWith(`/collections/${collection}/records`),
      );
      expect(refreshRequests).toHaveLength(2);
      expect(refreshRequests.map((url) => url.searchParams.get('perPage'))).toEqual(['101', '1']);
      for (const request of refreshRequests) {
        expect(request.searchParams.get('page')).toBe('1');
        expect(request.searchParams.get('skipTotal')).toBe('true');
      }
      expect(refreshRequests[0]?.searchParams.get('filter')).toMatch(/id >=|id <=/);
      expect(refreshRequests[1]?.searchParams.get('fields')).toBe('id');
      expect(refreshRequests[1]?.searchParams.has('expand')).toBe(false);
      const payload = await tail.json();
      expect(payload.items).toHaveLength(1);
      expect(Object.keys(payload.items[0])).toEqual(['id']);
      if (kind === 'student') {
        await expect(card).toHaveAttribute('aria-expanded', 'true');
        await expect(page.getByText(studentNotes.get(target) ?? '', { exact: true })).toBeVisible();
      }
      await card.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `/tmp/nfw-w6gf-${kind}-refreshed.png`,
        scale: 'css',
        animations: 'disabled',
      });
      await page.getByRole('button', { name: 'Load more', exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `/tmp/nfw-w6gf-${kind}-load-more.png`,
        scale: 'css',
        animations: 'disabled',
      });
      if (kind === 'student') {
        await page.route('**/api/collections/admin_ballot_students/records*', async (route) => {
          if (new URL(route.request().url()).searchParams.get('fields') === 'id') {
            await route.fulfill({ status: 503, json: { message: 'Existence check unavailable.' } });
          } else await route.continue();
        });
        await pb
          .collection('users')
          .update(target, { name: `${studentNames.get(target)} Recovered` });
        await expect(page.getByRole('alert')).toContainText('Existence check unavailable.');
        await expect(card).toContainText('Refreshed');
        await expect(cards).toHaveCount(80);
        await page.getByRole('alert').scrollIntoViewIfNeeded();
        await page.screenshot({
          path: '/tmp/nfw-w6gf-refresh-error.png',
          scale: 'css',
          animations: 'disabled',
        });
        await page.unroute('**/api/collections/admin_ballot_students/records*');
        await page.getByRole('button', { name: 'Try again', exact: true }).click();
        await expect(page.getByRole('alert')).toHaveCount(0);
        await expect(card).toContainText('Recovered');
        await expect(card).toHaveAttribute('aria-expanded', 'true');
        await expect(cards).toHaveCount(80);
        await page.setViewportSize({ width: 390, height: 844 });
        await card.scrollIntoViewIfNeeded();
        await page.screenshot({
          path: '/tmp/nfw-w6gf-retry-mobile.png',
          scale: 'css',
          animations: 'disabled',
        });
      }
      requests.length = 0;
    }
  } finally {
    await page.goto('/');
    for (const id of ballots) await pb.collection('ballots').delete(id);
    for (const id of debates) await pb.collection('debates').delete(id);
    for (const id of students) await pb.collection('users').delete(id);
  }
});
