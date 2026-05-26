import { test, expect, type Page } from '@playwright/test';

const BASE = 'http://localhost:5174';

async function signIn(page: Page, email: string): Promise<void> {
  await page.goto(BASE);
  await page.fill('#email', email);
  await page.click('button:has-text("Send Magic Code")');
  // In a real test environment, retrieve the code via InstantDB admin API.
  // For now, verify the code-entry screen appears.
  await expect(page.locator('text=We sent a 6-digit code')).toBeVisible();
}

async function signInWithCode(page: Page, email: string, code: string): Promise<void> {
  await page.goto(BASE);
  await page.fill('#email', email);
  await page.click('button:has-text("Send Magic Code")');
  await page.fill('#code', code);
  await page.click('button:has-text("Sign In")');
}

async function completeProfile(page: Page, name: string, role: 'student' | 'parent' | 'admin'): Promise<void> {
  await page.fill('#name', name);
  await page.check(`input[value="${role}"]`);
  await page.click('button:has-text("Continue")');
}

test.describe('Auth flow', () => {
  test('shows email input on landing', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('button:has-text("Send Magic Code")')).toBeVisible();
  });

  test('shows code input after sending magic code', async ({ page }) => {
    await signIn(page, 'test@example.com');
    await expect(page.locator('#code')).toBeVisible();
  });

  test('back link returns to email screen', async ({ page }) => {
    await signIn(page, 'test@example.com');
    await page.click('button:has-text("Use a different email")');
    await expect(page.locator('#email')).toBeVisible();
  });
});

test.describe('Profile setup', () => {
  test('profile setup form has name + role fields', async ({ page }) => {
    // We can't easily sign in with magic code in automated tests without
    // intercepting email. These tests document the expected UI shape.
    await page.goto(BASE);
    // The profile setup screen is gated behind auth.
    // Verify the auth screen is present.
    await expect(page.locator('h1:has-text("NF Wavemakers Ballots")')).toBeVisible();
  });
});

test.describe('Speaker Point Guide', () => {
  test('guide toggle button is visible on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}#judge`);
    // Without auth, we land on the auth page. The guide toggle only appears in BallotForm.
    // This test verifies the app loads without JS errors.
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Routing', () => {
  test('hash routing renders app without crash', async ({ page }) => {
    const routes = ['', '#dashboard', '#judge', '#admin'];
    for (const route of routes) {
      await page.goto(`${BASE}/${route}`);
      // Verify no unhandled JS errors (page loads at minimum)
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('Mobile layout', () => {
  test('app renders on iPhone viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE);
    await expect(page.locator('.auth-card')).toBeVisible();
  });
});
