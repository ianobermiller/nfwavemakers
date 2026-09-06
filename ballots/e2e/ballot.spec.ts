import { test, expect, type Page } from '@playwright/test';

const BASE = `http://localhost:${process.env['PLAYWRIGHT_PORT'] ?? '5174'}/`;

async function signIn(page: Page, email: string): Promise<void> {
  const password = process.env['E2E_PASSWORD'];
  if (!password) throw new Error('Missing E2E_PASSWORD — run full test suite with globalSetup');

  await page.goto(BASE);
  await page.getByRole('button', { name: 'Use a password' }).click();
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.locator('#email').waitFor({ state: 'hidden', timeout: 15_000 });
}

test.describe('Auth flow', () => {
  test('shows email input on landing', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('button:has-text("Send Sign-in Code")')).toBeVisible();
  });

  test('registers and signs back in with a passkey', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'WebAuthn CDP test runs in desktop Chromium');

    const email = process.env['E2E_JUDGE_EMAIL'];
    if (!email) throw new Error('Missing E2E_JUDGE_EMAIL');

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('WebAuthn.enable');
    const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
      options: {
        automaticPresenceSimulation: true,
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        protocol: 'ctap2',
        transport: 'internal',
      },
    });

    // Autofill would satisfy the virtual authenticator on load and sign in
    // before the button is clicked, so keep it out of this test.
    await page.addInitScript(() => {
      PublicKeyCredential.isConditionalMediationAvailable = async () => false;
    });

    try {
      await signIn(page, email);
      await page.goto(`${BASE}profile`);
      await page.getByRole('button', { name: 'Add a passkey' }).click();
      await expect(page.getByText('Passkey added. You can now use it to sign in.')).toBeVisible();

      const credentials = await cdp.send('WebAuthn.getCredentials', { authenticatorId });
      expect(credentials.credentials.map((c) => c.isResidentCredential)).toContain(true);

      await page.getByRole('button', { name: 'Menu' }).click();
      await page.getByRole('menuitem', { name: 'Sign Out' }).click();

      // No email typed: the authenticator picks the passkey.
      await expect(page.locator('#email')).toHaveValue('');
      await page.getByRole('button', { name: 'Sign in with a passkey' }).click();

      await expect(page.locator('#email')).toBeHidden();
      const auth = await page.evaluate(() => localStorage.getItem('pocketbase_auth'));
      expect(auth).toContain('"token"');
      expect(auth).toContain(email);
    } finally {
      await cdp.send('WebAuthn.removeVirtualAuthenticator', { authenticatorId });
      await cdp.send('WebAuthn.disable');
    }
  });
});

test.describe('Student picker', () => {
  test('judge can search for and find a student', async ({ page }) => {
    const judgeEmail = process.env['E2E_JUDGE_EMAIL'];
    const studentName = process.env['E2E_STUDENT_NAME'];
    if (!judgeEmail || !studentName)
      throw new Error('Missing e2e env vars — run full test suite with globalSetup');

    await signIn(page, judgeEmail);

    await page.goto(`${BASE}judge`);
    await page.waitForSelector('input[placeholder="Search students…"]', { timeout: 10_000 });

    const picker = page.locator('input[placeholder="Search students…"]').first();
    await picker.click();
    await picker.fill(studentName.split(' ')[0] ?? studentName);

    await expect(page.locator(`button:has-text("${studentName}")`).first()).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator('text=No students found')).not.toBeVisible();
  });
});

test.describe('Judge ballot view', () => {
  test('judge sees submitted ballot in dashboard', async ({ page }) => {
    const judgeEmail = process.env['E2E_JUDGE_EMAIL'];
    if (!judgeEmail) throw new Error('Missing E2E_JUDGE_EMAIL');

    await signIn(page, judgeEmail);
    await page.goto(`${BASE}dashboard`);

    await expect(page.locator('text=Submitted Ballots')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=2024-01-15').first()).toBeVisible({ timeout: 5000 });
  });

  test('judge can view submitted ballot as read-only', async ({ page }) => {
    const judgeEmail = process.env['E2E_JUDGE_EMAIL'];
    const ballotId = process.env['E2E_BALLOT_ID'];
    if (!judgeEmail || !ballotId) throw new Error('Missing e2e env vars');

    await signIn(page, judgeEmail);
    await page.goto(`${BASE}ballot/${ballotId}`);

    await expect(page.locator('text=Affirmative wins')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Affirmative had stronger evidence.')).toBeVisible({
      timeout: 5000,
    });

    await expect(page.locator('input[type="radio"]')).not.toBeVisible();
    await expect(page.locator('button:has-text("Submit Ballot")')).not.toBeVisible();
    await expect(page.locator("text=You don't have access")).not.toBeVisible();
  });
});

test.describe('Student ballot view', () => {
  test('student sees submitted ballot in dashboard', async ({ page }) => {
    const studentEmail = process.env['E2E_STUDENT_EMAIL'];
    if (!studentEmail) throw new Error('Missing E2E_STUDENT_EMAIL');

    await signIn(page, studentEmail);
    await page.goto(`${BASE}dashboard`);

    await expect(page.locator('text=My Feedback')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Judge: Bob Judge')).toBeVisible({ timeout: 5000 });
  });

  test('student can view full ballot for their debate', async ({ page }) => {
    const studentEmail = process.env['E2E_STUDENT_EMAIL'];
    const debateId = process.env['E2E_DEBATE_ID'];
    if (!studentEmail || !debateId) throw new Error('Missing e2e env vars');

    await signIn(page, studentEmail);
    await page.goto(`${BASE}debate/${debateId}`);

    await expect(page.locator('text=Bob Judge')).toBeVisible({ timeout: 5000 });
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
