import { test, expect } from '@playwright/test';

for (const role of ['admin', 'student', 'judge'] as const) {
  test(`${role} dashboard fetches only data used by its sections`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    const requests: URL[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (
        request.method() === 'GET' &&
        /\/api\/collections\/(ballots|speaker_evals|debates)\/records$/.test(url.pathname)
      )
        requests.push(url);
    });
    await page.goto('/ballots');
    await page.getByRole('button', { name: 'Use a password' }).click();
    const emails = {
      admin: process.env['E2E_ADMIN_EMAIL'],
      student: process.env['E2E_STUDENT_EMAIL'],
      judge: process.env['E2E_JUDGE_EMAIL'],
    };
    await page.locator('#email').fill(emails[role] ?? '');
    await page.locator('#password').fill(process.env['E2E_PASSWORD'] ?? '');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await page.locator('#email').waitFor({ state: 'hidden' });
    const notNow = page.getByRole('button', { name: 'Not now' });
    if (await notNow.isVisible()) await notNow.click();
    if (role === 'student') {
      await expect(page.getByRole('heading', { name: 'My Feedback', exact: true })).toBeVisible();
      expect(requests.some((url) => url.pathname.includes('/speaker_evals/'))).toBe(true);
      expect(requests.some((url) => url.pathname.includes('/debates/'))).toBe(true);
    } else {
      await expect(
        page.getByRole('heading', {
          name: role === 'admin' ? 'Manage Debates' : 'Your Submitted Ballots',
          exact: true,
        }),
      ).toBeVisible();
      expect(requests.some((url) => url.pathname.includes('/ballots/'))).toBe(true);
      expect(requests.some((url) => url.pathname.includes('/debates/'))).toBe(true);
      expect(requests.filter((url) => url.pathname.includes('/speaker_evals/'))).toHaveLength(0);
      if (role === 'admin')
        await expect(
          page.getByRole('heading', { name: 'Manage Debates', exact: true }),
        ).toBeVisible();
    }
    await page.screenshot({
      path: `/tmp/nfw-bi7a-${role}-${info.project.name}.png`,
      animations: 'disabled',
      scale: 'css',
    });
  });
}
