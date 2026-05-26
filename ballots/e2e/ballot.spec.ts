import { test, expect, type Page } from '@playwright/test';

const BASE = 'http://localhost:5174';

type InstantDb = { auth: { signInWithToken: (token: string) => Promise<void> } };

async function signInWithToken(page: Page, token: string): Promise<void> {
  await page.goto(BASE);
  await page.waitForFunction(() => (window as Record<string, unknown>)['__db'] !== undefined);
  await page.evaluate(async (t: string) => {
    const db = (window as Record<string, unknown>)['__db'] as InstantDb;
    await db.auth.signInWithToken(t);
  }, token);
  // Wait for auth state to propagate and redirect away from auth screen.
  await page.waitForURL((url) => url.hash !== '' || url.pathname !== '/');
}

test.describe('Auth flow', () => {
  test('shows email input on landing', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('button:has-text("Send Magic Code")')).toBeVisible();
  });

  test('shows code input after sending magic code', async ({ page }) => {
    await page.goto(BASE);
    await page.fill('#email', 'test@example.com');
    await page.click('button:has-text("Send Magic Code")');
    await expect(page.locator('#code')).toBeVisible();
  });

  test('back link returns to email screen', async ({ page }) => {
    await page.goto(BASE);
    await page.fill('#email', 'test@example.com');
    await page.click('button:has-text("Send Magic Code")');
    await page.click('button:has-text("Use a different email")');
    await expect(page.locator('#email')).toBeVisible();
  });
});

test.describe('Student picker', () => {
  test('judge can search for and find a student', async ({ page }) => {
    const judgeToken = process.env['E2E_JUDGE_TOKEN'];
    const studentName = process.env['E2E_STUDENT_NAME'];
    if (!judgeToken || !studentName) throw new Error('Missing e2e env vars — run full test suite with globalSetup');

    await signInWithToken(page, judgeToken);

    // Profile may need to be set for judge — if profile setup is shown, skip it
    // (global-setup already set the role via admin API, so we just dismiss if present)
    const profileSetup = page.locator('text=Choose your role');
    if (await profileSetup.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.fill('#name', 'Bob Judge');
      await page.click('button[data-role="parent"]');
      await page.click('button:has-text("Continue")');
    }

    // Navigate to the judge / ballot form
    await page.goto(`${BASE}#judge`);
    await page.waitForSelector('input[placeholder="Search students…"]', { timeout: 5000 });

    // Focus the first student picker and type the student's name
    const picker = page.locator('input[placeholder="Search students…"]').first();
    await picker.click();
    await picker.fill(studentName.split(' ')[0] ?? studentName);

    // The student should appear in the dropdown — not "No students found"
    await expect(page.locator(`button:has-text("${studentName}")`).first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=No students found')).not.toBeVisible();
  });
});

test.describe('Routing', () => {
  test('hash routing renders app without crash', async ({ page }) => {
    const routes = ['', '#dashboard', '#judge', '#admin'];
    for (const route of routes) {
      await page.goto(`${BASE}/${route}`);
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('Mobile layout', () => {
  test('app renders auth screen on iPhone viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE);
    await expect(page.locator('#email')).toBeVisible();
  });
});
