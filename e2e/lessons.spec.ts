import { test, expect, type Page } from '@playwright/test';

async function dismissPasskeyPrompt(page: Page): Promise<void> {
  const notNow = page.getByRole('button', { name: 'Not now' });
  if (await notNow.isVisible().catch(() => false)) await notNow.click();
}

async function signIn(page: Page, email: string): Promise<void> {
  const password = process.env['E2E_PASSWORD'];
  if (!password) throw new Error('Missing E2E_PASSWORD — run full test suite with globalSetup');

  await page.goto('/ballots');
  await page.getByRole('button', { name: 'Use a password' }).click();
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.locator('#email').waitFor({ state: 'hidden', timeout: 15_000 });
  await dismissPasskeyPrompt(page);
}

/** Click through the route load-error screen before the caller's assertion. */
async function waitForLoaded(
  page: Page,
  check: () => Promise<void>,
  options: { timeout?: number } = {},
): Promise<void> {
  await expect(async () => {
    const retry = page.getByRole('button', { name: 'Try again' });
    if (await retry.isVisible()) await retry.click();
    await check();
  }).toPass({ timeout: options.timeout ?? 20_000 });
}

test.describe('Lessons', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
  });

  test('asks visitors to sign in before showing lesson notes', async ({ page }) => {
    await page.goto('/lessons');
    await expect(page.getByRole('heading', { name: 'Sign in or create account' })).toBeVisible();
    await expect(page.getByText('Enter your email to read lesson notes.')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Finding Your Voice' })).toHaveCount(0);
  });

  test('signed-in members can open a lesson from the index', async ({ page }) => {
    const email = process.env['E2E_STUDENT_EMAIL'];
    if (!email) throw new Error('Missing E2E_STUDENT_EMAIL');

    await signIn(page, email);
    await page.goto('/lessons');
    await waitForLoaded(page, async () => {
      await expect(page.getByRole('heading', { name: 'Lessons' })).toBeVisible({ timeout: 2_000 });
      await expect(page.getByRole('link', { name: /Finding Your Voice/ })).toBeVisible({
        timeout: 2_000,
      });
    });
    await expect(page.getByRole('link', { name: 'New lesson' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0);
    await page.getByRole('link', { name: /Finding Your Voice/ }).click();
    await expect(
      page.getByRole('heading', { name: 'Finding Your Voice', exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/Your voice isn’t just how you sound/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Edit lesson' })).toHaveCount(0);
  });

  test('admins manage lessons from the lessons page', async ({ page }, testInfo) => {
    const email = process.env['E2E_ADMIN_EMAIL'];
    if (!email) throw new Error('Missing E2E_ADMIN_EMAIL');

    await signIn(page, email);
    await page.goto('/lessons');
    await waitForLoaded(page, async () => {
      await expect(page.getByRole('heading', { name: 'Lessons' })).toBeVisible({ timeout: 2_000 });
      await expect(page.getByRole('link', { name: 'New lesson' })).toBeVisible({ timeout: 2_000 });
      await expect(page.getByRole('button', { name: 'Edit' }).first()).toBeVisible({
        timeout: 2_000,
      });
    });
    await page.screenshot({
      path: `/tmp/nfw-saa1-index-${testInfo.project.name}.png`,
      fullPage: true,
      scale: 'css',
    });

    await page.getByRole('link', { name: 'New lesson' }).click();
    await expect(page.getByRole('heading', { name: 'New lesson' })).toBeVisible();
    await page.getByRole('button', { name: '← Lessons' }).click();
    await expect(page.getByRole('heading', { name: 'Lessons' })).toBeVisible();

    await page.getByRole('button', { name: 'Edit' }).first().click();
    await expect(page.getByRole('heading', { name: 'Edit lesson' })).toBeVisible();
    await expect(page.locator('#lesson-body')).not.toHaveValue('');
    await page.screenshot({
      path: `/tmp/nfw-saa1-editor-${testInfo.project.name}.png`,
      scale: 'css',
    });
    await page.getByRole('button', { name: '← Lessons' }).click();
    await expect(page.getByRole('heading', { name: 'Lessons' })).toBeVisible();

    await page.getByRole('link', { name: /Finding Your Voice/ }).click();
    await expect(page.getByRole('link', { name: 'Edit lesson' })).toBeVisible();
  });

  test('lesson listings request metadata without downloading bodies', async ({ page }) => {
    const email = process.env['E2E_STUDENT_EMAIL'];
    if (!email) throw new Error('Missing E2E_STUDENT_EMAIL');
    await signIn(page, email);
    const responsePromise = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === '/api/collections/lessons/records' && url.searchParams.has('fields');
    });
    await page.goto('/lessons');
    const response = await responsePromise;
    expect(new URL(response.url()).searchParams.get('fields')).toBe('id,year,number,title,date');
    const payload = await response.json();
    expect(payload.items.length).toBeGreaterThan(0);
    for (const item of payload.items) {
      expect(item).not.toHaveProperty('body');
      expect(item).toHaveProperty('title');
    }
    await expect(page.getByRole('link', { name: /Finding Your Voice/ })).toBeVisible();
  });

  test('an article renders while navigation metadata is pending', async ({ page }, testInfo) => {
    const email = process.env['E2E_STUDENT_EMAIL'];
    if (!email) throw new Error('Missing E2E_STUDENT_EMAIL');
    await signIn(page, email);
    let releaseNavigation = (): void => {};
    const navigationGate = new Promise<void>((resolve) => {
      releaseNavigation = resolve;
    });
    await page.route('**/api/collections/lessons/records?**', async (route) => {
      if (new URL(route.request().url()).searchParams.has('fields')) await navigationGate;
      await route.continue();
    });
    await page.goto('/lessons/2026/1');
    await expect(
      page.getByRole('heading', { name: 'Finding Your Voice', exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/Your voice isn’t just how you sound/)).toBeVisible();
    await expect(page.getByText('Loading lesson navigation…')).toBeVisible();
    await expect(page.getByRole('link', { name: 'All lessons', exact: true })).toBeVisible();
    await page.getByRole('navigation', { name: 'Lesson', exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `/tmp/nfw-saa1-navigation-pending-${testInfo.project.name}.png`,
      scale: 'css',
    });
    releaseNavigation();
    await expect(page.getByRole('link', { name: 'Lesson 2 →' })).toBeVisible();
    await expect(page.getByText('Loading lesson navigation…')).toHaveCount(0);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `/tmp/nfw-saa1-article-${testInfo.project.name}.png`,
      scale: 'css',
    });
    await page.getByRole('link', { name: 'Lesson 2 →' }).click();
    await expect(page.getByRole('link', { name: '← Lesson 1' })).toBeVisible();
  });

  test('navigation failure can retry without hiding the article', async ({ page }, testInfo) => {
    const email = process.env['E2E_STUDENT_EMAIL'];
    if (!email) throw new Error('Missing E2E_STUDENT_EMAIL');
    await signIn(page, email);
    let failNavigation = true;
    await page.route('**/api/collections/lessons/records?**', async (route) => {
      if (failNavigation && new URL(route.request().url()).searchParams.has('fields')) {
        await route.fulfill({ status: 503, json: { message: 'Metadata temporarily unavailable' } });
      } else await route.continue();
    });
    await page.goto('/lessons/2026/1');
    await expect(
      page.getByRole('heading', { name: 'Finding Your Voice', exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/Your voice isn’t just how you sound/)).toBeVisible();
    await expect(page.getByText('Couldn’t load lesson navigation.')).toBeVisible();
    await page.getByRole('navigation', { name: 'Lesson', exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `/tmp/nfw-saa1-navigation-error-${testInfo.project.name}.png`,
      scale: 'css',
    });
    failNavigation = false;
    await page.getByRole('button', { name: 'Retry navigation' }).click();
    await expect(page.getByRole('link', { name: 'Lesson 2 →' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Finding Your Voice', exact: true }),
    ).toBeVisible();
  });

  test('lesson bodies are not shipped in the public client bundle', async ({ request }) => {
    const response = await request.get('/');
    expect(response.ok()).toBeTruthy();
    const html = await response.text();
    const scriptSrcs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((match) => match[1]!);
    expect(scriptSrcs.length).toBeGreaterThan(0);

    for (const src of scriptSrcs) {
      const asset = await request.get(src);
      expect(asset.ok()).toBeTruthy();
      const body = await asset.text();
      expect(body).not.toContain('Your voice isn’t just how you sound');
      expect(body).not.toContain('Three dimensions of characterization');
    }
  });
});
