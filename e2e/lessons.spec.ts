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
    await expect(page.getByRole('heading', { name: 'Finding Your Voice', exact: true })).toBeVisible();
    await expect(page.getByText(/Your voice isn’t just how you sound/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Edit lesson' })).toHaveCount(0);
  });

  test('admins manage lessons from the lessons page', async ({ page }) => {
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

    await page.getByRole('link', { name: 'New lesson' }).click();
    await expect(page.getByRole('heading', { name: 'New lesson' })).toBeVisible();
    await page.getByRole('button', { name: '← Lessons' }).click();
    await expect(page.getByRole('heading', { name: 'Lessons' })).toBeVisible();

    await page.getByRole('button', { name: 'Edit' }).first().click();
    await expect(page.getByRole('heading', { name: 'Edit lesson' })).toBeVisible();
    await page.getByRole('button', { name: '← Lessons' }).click();
    await expect(page.getByRole('heading', { name: 'Lessons' })).toBeVisible();

    await page.getByRole('link', { name: /Finding Your Voice/ }).click();
    await expect(page.getByRole('link', { name: 'Edit lesson' })).toBeVisible();
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
