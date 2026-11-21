import { test, expect, type Page } from '@playwright/test';
import PocketBase from 'pocketbase';

async function signIn(page: Page, email: string): Promise<void> {
  await page.goto('/ballots');
  await page.getByRole('button', { name: 'Use a password' }).click();
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(process.env['E2E_PASSWORD'] ?? '');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.locator('#email').waitFor({ state: 'hidden' });
  const notNow = page.getByRole('button', { name: 'Not now' });
  if (await notNow.isVisible()) await notNow.click();
}

async function testDatabase() {
  const pb = new PocketBase(process.env['POCKETBASE_TEST_URL']);
  await pb
    .collection('_superusers')
    .authWithPassword(
      process.env['PB_SUPERUSER_EMAIL'] ?? '',
      process.env['PB_SUPERUSER_PASSWORD'] ?? '',
    );
  return pb;
}

async function createStudent(pb: PocketBase, name: string) {
  const password = process.env['E2E_PASSWORD'];
  return await pb.collection('users').create({
    email: `order-${crypto.randomUUID()}@example.com`,
    name,
    role: 'student',
    category: 'tp',
    approved: true,
    verified: true,
    password,
    passwordConfirm: password,
  });
}

test('setup leaves speaker positions to the judge', async ({ page }, testInfo) => {
  await signIn(page, process.env['E2E_ADMIN_EMAIL'] ?? '');
  await page.goto('/admin/new');
  await expect(
    page.getByText('Judges choose speaking order on their ballots.', { exact: false }),
  ).toBeVisible();
  await expect(page.locator('label').filter({ hasText: /1st Speaker|2nd Speaker/ })).toHaveCount(0);
  await expect(page.getByText('Partner', { exact: true })).toHaveCount(2);
  await page.screenshot({
    path: `/tmp/nfw-dcd2-setup-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test('judges choose and change order without moving feedback between students', async ({
  page,
}, testInfo) => {
  const pb = await testDatabase();
  const alice = await createStudent(pb, 'Alice Student');
  const dana = await createStudent(pb, 'Dana Partner');
  const judge = await pb.collection('users').getFirstListItem('email = "judge@example.com"');
  const cara = await createStudent(pb, 'Cara Debater');
  const eli = await createStudent(pb, 'Eli Debater');
  const debate = await pb.collection('debates').create({
    date: '2026-11-24',
    room: `Order ${testInfo.project.name}`,
    event: 'tp',
    aff_team: [alice.id, dana.id],
    neg_team: [cara.id, eli.id],
    judges: [judge.id],
  });

  await signIn(page, process.env['E2E_JUDGE_EMAIL'] ?? '');
  await page.goto(`/judge/${debate.id}`);
  const aff = page.getByRole('group', { name: 'Affirmative speaking order', exact: true });
  const neg = page.getByRole('group', { name: 'Negative speaking order', exact: true });
  await expect(aff).toBeVisible();
  await expect(neg).toBeAttached();
  await expect(aff.getByRole('radio', { checked: true })).toHaveCount(0);
  await expect(neg.getByRole('radio', { checked: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /1st Speaker|2nd Speaker/ })).toHaveCount(0);
  await page.screenshot({
    path: `/tmp/nfw-dcd2-unselected-${testInfo.project.name}.png`,
    fullPage: true,
  });

  // Complete the ballot before choosing order, so order is the only missing requirement.
  await page.getByText('Affirmative wins', { exact: true }).click();
  for (const [index, pos] of ['aff1', 'aff2', 'neg1', 'neg2'].entries()) {
    const card = page.locator('div.rounded-xl').filter({ has: page.locator(`#speaker-${pos}`) });
    const labels = card
      .locator('label')
      .filter({ has: page.locator('input[type="radio"][value="4"]') });
    for (const label of await labels.all()) await label.click();
    await card
      .getByRole('combobox')
      .last()
      .selectOption(String(index + 1));
  }
  const aliceCard = page.locator('div.rounded-xl').filter({ has: page.locator('#speaker-aff1') });
  await aliceCard.getByPlaceholder('Notes…').fill('Alice: clear evidence');
  await expect(page.getByRole('button', { name: 'Submit Ballot' })).toBeDisabled();
  await expect(page.getByText('Choose who speaks first for each team to submit.')).toBeVisible();

  await aff.getByText('Dana Partner', { exact: true }).click();
  await expect(page.locator('#speaker-aff1')).toHaveValue('Dana Partner');
  await expect(page.locator('#speaker-aff2')).toHaveValue('Alice Student');
  const movedAlice = page.locator('div.rounded-xl').filter({ has: page.locator('#speaker-aff2') });
  await expect(movedAlice.getByPlaceholder('Notes…')).toHaveValue('Alice: clear evidence');
  await expect(movedAlice.getByRole('combobox').last()).toHaveValue('1');
  await expect(page.getByRole('button', { name: 'Submit Ballot' })).toBeDisabled();
  await neg.getByText('Eli Debater', { exact: true }).click();
  await expect(page.getByRole('button', { name: 'Submit Ballot' })).toBeEnabled();
  await expect(page.getByRole('status', { name: 'Ballot save status' })).toHaveText('Saved');

  await page.reload();
  await expect(aff.getByRole('radio', { name: 'Dana Partner' })).toBeChecked();
  await expect(neg.getByRole('radio', { name: 'Eli Debater' })).toBeChecked();
  await expect(movedAlice.getByPlaceholder('Notes…')).toHaveValue('Alice: clear evidence');
  await page.screenshot({
    path: `/tmp/nfw-dcd2-selected-${testInfo.project.name}.png`,
    fullPage: true,
  });

  // A later correction still follows the student, including after another reload.
  await aff.getByText('Alice Student', { exact: true }).click();
  await expect(page.locator('#speaker-aff1')).toHaveValue('Alice Student');
  await expect(aliceCard.getByPlaceholder('Notes…')).toHaveValue('Alice: clear evidence');
  await expect(aliceCard.getByRole('combobox').last()).toHaveValue('1');
  await expect(page.getByRole('status', { name: 'Ballot save status' })).toHaveText('Saved');
  await page.reload();
  await expect(aff.getByRole('radio', { name: 'Alice Student' })).toBeChecked();
  await expect(aliceCard.getByPlaceholder('Notes…')).toHaveValue('Alice: clear evidence');
  await expect(page.getByRole('button', { name: 'Submit Ballot' })).toBeEnabled();
  await page.getByRole('button', { name: 'Submit Ballot' }).click();
  await expect(page).toHaveURL(/dashboard/);
  const saved = await pb
    .collection('ballots')
    .getFirstListItem(pb.filter('debate = {:debate}', { debate: debate.id }));
  expect(saved['submitted_at']).toBeTruthy();
  expect(saved['speaker_order_confirmed'].sort()).toEqual(['aff', 'neg']);
  const evaluations = await pb
    .collection('speaker_evals')
    .getFullList({ filter: pb.filter('ballot = {:ballot}', { ballot: saved.id }) });
  expect(evaluations.find((ev) => ev['speaker'] === alice.id)).toMatchObject({
    position: 'aff1',
    rank: 1,
    delivery: 4,
    notes: 'Alice: clear evidence',
  });
  expect(evaluations.find((ev) => ev['speaker'] === eli.id)).toMatchObject({ position: 'neg1' });
});

test('Lincoln-Douglas needs no speaking-order choices', async ({ page }, testInfo) => {
  const pb = await testDatabase();
  const alice = await createStudent(pb, 'Alice Student');
  const dana = await createStudent(pb, 'Dana Partner');
  const judge = await pb.collection('users').getFirstListItem('email = "judge@example.com"');
  const debate = await pb.collection('debates').create({
    date: '2026-11-24',
    room: `LD ${testInfo.project.name}`,
    event: 'ld',
    aff_team: [alice.id],
    neg_team: [dana.id],
    judges: [judge.id],
  });
  await signIn(page, process.env['E2E_JUDGE_EMAIL'] ?? '');
  await page.goto(`/judge/${debate.id}`);
  await expect(page.getByRole('heading', { name: 'Debater', exact: true })).toHaveCount(2);
  await expect(page.getByText('Who speaks first?', { exact: true })).toHaveCount(0);
  await page.getByText('Affirmative wins', { exact: true }).click();
  for (const [index, pos] of ['aff1', 'neg1'].entries()) {
    const card = page.locator('div.rounded-xl').filter({ has: page.locator(`#speaker-${pos}`) });
    for (const label of await card
      .locator('label')
      .filter({ has: page.locator('input[type="radio"][value="4"]') })
      .all())
      await label.click();
    await card
      .getByRole('combobox')
      .last()
      .selectOption(String(index + 1));
  }
  await expect(page.getByRole('button', { name: 'Submit Ballot' })).toBeEnabled();
  await page.screenshot({ path: `/tmp/nfw-dcd2-ld-${testInfo.project.name}.png`, fullPage: true });
});
