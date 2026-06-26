import { test, expect, type Page } from '@playwright/test';

const BASE = 'http://localhost:5174/ballots/';

type InstantDb = { auth: { signInWithToken: (token: string) => Promise<void> } };

async function signInWithToken(page: Page, token: string): Promise<void> {
  await page.goto(BASE);
  await page.waitForFunction(() => (window as Record<string, unknown>)['__db'] !== undefined);
  await page.evaluate(async (t: string) => {
    const db = (window as Record<string, unknown>)['__db'] as InstantDb;
    await db.auth.signInWithToken(t);
  }, token);
  // Wait for the auth screen (email input) to disappear — indicates sign-in succeeded.
  await page.locator('#email').waitFor({ state: 'hidden', timeout: 15_000 });
}

test.describe('Auth flow', () => {
  test('shows email input on landing', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('button:has-text("Send Magic Code")')).toBeVisible();
  });

  test.skip('shows code input after sending magic code', async ({ page }) => {
    // Requires real email delivery to test@example.com — skip in automated runs.
    await page.goto(BASE);
    await page.fill('#email', 'test@example.com');
    await page.click('button:has-text("Send Magic Code")');
    await expect(page.locator('#code')).toBeVisible();
  });

  test.skip('back link returns to email screen', async ({ page }) => {
    // Depends on "shows code input" — skipped along with it.
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
    if (!judgeToken || !studentName)
      throw new Error('Missing e2e env vars — run full test suite with globalSetup');

    await signInWithToken(page, judgeToken);

    // Navigate to the judge / ballot form
    await page.goto(`${BASE}judge`);
    await page.waitForSelector('input[placeholder="Search students…"]', { timeout: 10_000 });

    // Focus the first student picker and type the student's name
    const picker = page.locator('input[placeholder="Search students…"]').first();
    await picker.click();
    await picker.fill(studentName.split(' ')[0] ?? studentName);

    // The student should appear in the dropdown — not "No students found"
    await expect(page.locator(`button:has-text("${studentName}")`).first()).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator('text=No students found')).not.toBeVisible();
  });
});

test.describe('Judge ballot view', () => {
  test('judge sees submitted ballot in dashboard', async ({ page }) => {
    const judgeToken = process.env['E2E_JUDGE_TOKEN'];
    if (!judgeToken) throw new Error('Missing E2E_JUDGE_TOKEN');

    await signInWithToken(page, judgeToken);
    await page.goto(`${BASE}dashboard`);

    await expect(page.locator('text=Submitted Ballots')).toBeVisible({ timeout: 5000 });
    // The seeded debate has date 2024-01-15 — card should be clickable
    await expect(page.locator('text=2024-01-15').first()).toBeVisible({ timeout: 5000 });
  });

  test('judge can view submitted ballot as read-only', async ({ page }) => {
    const judgeToken = process.env['E2E_JUDGE_TOKEN'];
    const ballotId = process.env['E2E_BALLOT_ID'];
    if (!judgeToken || !ballotId) throw new Error('Missing e2e env vars');

    await signInWithToken(page, judgeToken);
    await page.goto(`${BASE}ballot/${ballotId}`);

    // Should show ballot content
    await expect(page.locator('text=Affirmative wins')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Affirmative had stronger evidence.')).toBeVisible({
      timeout: 5000,
    });

    // Should NOT show any edit controls
    await expect(page.locator('input[type="radio"]')).not.toBeVisible();
    await expect(page.locator('button:has-text("Submit Ballot")')).not.toBeVisible();
    await expect(page.locator("text=You don't have access")).not.toBeVisible();
  });
});

test.describe('Student ballot view', () => {
  test('student sees submitted ballot in dashboard', async ({ page }) => {
    const studentToken = process.env['E2E_STUDENT_TOKEN'];
    if (!studentToken) throw new Error('Missing E2E_STUDENT_TOKEN');

    await signInWithToken(page, studentToken);
    await page.goto(`${BASE}dashboard`);

    await expect(page.locator('text=My Feedback')).toBeVisible({ timeout: 5000 });
    // The card shows the judge name — confirms the seeded ballot appears
    await expect(page.locator('text=Judge: Bob Judge')).toBeVisible({ timeout: 5000 });
  });

  test('student can view full ballot for their debate', async ({ page }) => {
    const studentToken = process.env['E2E_STUDENT_TOKEN'];
    const debateId = process.env['E2E_DEBATE_ID'];
    if (!studentToken || !debateId) throw new Error('Missing e2e env vars');

    await signInWithToken(page, studentToken);
    await page.goto(`${BASE}debate/${debateId}`);

    // Should show the ballot with judge name and winner
    await expect(page.locator('text=Bob Judge')).toBeVisible({ timeout: 5000 });
    // DebateView renders "Winner: Affirmative" (not "Affirmative wins"), verify via the RFD which is unique
    await expect(page.locator('text=Affirmative had stronger evidence.')).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator('text=No submitted ballots yet')).not.toBeVisible();
  });
});

test.describe('Routing', () => {
  test('hash routing renders app without crash', async ({ page }) => {
    const routes = ['', 'dashboard', 'judge', 'admin'];
    for (const route of routes) {
      await page.goto(route ? `${BASE}${route}` : BASE);
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('Mobile layout', () => {
  test('app renders auth screen on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE);
    await expect(page.locator('#email')).toBeVisible();
  });
});
