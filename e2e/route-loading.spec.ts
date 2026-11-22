import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, expect, type Page } from '@playwright/test';
import { z } from 'zod';

const preview = process.env['PLAYWRIGHT_PREVIEW'] === '1';
const manifestSchema = z.record(
  z.string(),
  z.object({
    file: z.string(),
    imports: z.array(z.string()).optional(),
    isDynamicEntry: z.boolean().optional(),
  }),
);

function manifest() {
  return manifestSchema.parse(
    JSON.parse(
      readFileSync(fileURLToPath(new URL('../_site/.vite/manifest.json', import.meta.url)), 'utf8'),
    ),
  );
}

function modulePath(source: string): string {
  if (!preview) return `/${source}`;
  const entry = manifest()[source];
  if (!entry) throw new Error(`Missing build entry for ${source}`);
  return `/${entry.file}`;
}

async function signIn(page: Page, role: 'ADMIN' | 'STUDENT'): Promise<void> {
  const email = process.env[`E2E_${role}_EMAIL`];
  const password = process.env['E2E_PASSWORD'];
  if (!email || !password) throw new Error('Missing seeded account');
  await page.goto('/ballots');
  await page.getByRole('button', { name: 'Use a password' }).click();
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.locator('#email').waitFor({ state: 'hidden' });
  const notNow = page.getByRole('button', { name: 'Not now' });
  if (await notNow.isVisible()) await notNow.click();
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
});

test('public entry defers member, editor and lesson screen chunks', async ({ page }, testInfo) => {
  const deferredSources = [
    'ballots/components/Auth.tsx',
    'ballots/components/Dashboard.tsx',
    'ballots/components/BallotForm.tsx',
    'ballots/components/AdminBallots.tsx',
    'ballots/components/AdminUsers.tsx',
    'ballots/components/AdminLessonForm.tsx',
    'src/site/LessonPage.tsx',
    'src/site/LessonsIndex.tsx',
  ];
  if (preview) {
    const build = manifest();
    const initialFiles = new Set<string>();
    function visit(key: string): void {
      const entry = build[key];
      if (!entry || initialFiles.has(entry.file)) return;
      initialFiles.add(entry.file);
      for (const dependency of entry.imports ?? []) visit(dependency);
    }
    visit('index.html');
    for (const source of deferredSources) {
      const entry = build[source];
      expect(entry?.isDynamicEntry, source).toBe(true);
      expect(initialFiles.has(entry!.file), source).toBe(false);
    }
  }
  const scripts: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'script') scripts.push(new URL(request.url()).pathname);
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Make Waves/ })).toBeVisible();
  await page.waitForLoadState('networkidle');
  for (const source of deferredSources) expect(scripts).not.toContain(modulePath(source));
  await page.screenshot({
    path: `/tmp/nfw-fs3x-public-${testInfo.project.name}.png`,
    scale: 'css',
  });
});

test('cold route loads retain a visible skeleton until its module arrives', async ({
  page,
}, testInfo) => {
  const target = modulePath('src/site/AboutPage.tsx');
  let release = (): void => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    (url) => url.pathname === target,
    async (route) => {
      await gate;
      await route.continue();
    },
  );
  await page.goto('/about', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[aria-busy="true"]')).toBeVisible();
  await page.screenshot({
    path: `/tmp/nfw-fs3x-cold-loading-${testInfo.project.name}.png`,
    scale: 'css',
  });
  release();
  await expect(page.getByRole('heading', { name: 'About', exact: true })).toBeVisible();
  await expect(page).toHaveTitle('About — North Florida Wavemakers');
});

test('in-app navigation retains the current page and reuses warm route modules', async ({
  page,
}, testInfo) => {
  const target = modulePath('src/site/AboutPage.tsx');
  let moduleRequests = 0;
  let release = (): void => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    (url) => url.pathname === target,
    async (route) => {
      moduleRequests++;
      await gate;
      await route.continue();
    },
  );
  await page.goto('/');
  await page.getByRole('link', { name: 'About the Club', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Make Waves/ })).toBeVisible();
  await expect(page.getByRole('progressbar')).toBeVisible();
  await page.screenshot({
    path: `/tmp/nfw-fs3x-transition-${testInfo.project.name}.png`,
    scale: 'css',
  });
  release();
  await expect(page.getByRole('heading', { name: 'About', exact: true })).toBeVisible();
  await expect(page).toHaveTitle('About — North Florida Wavemakers');
  await page.goBack();
  await expect(page.getByRole('heading', { name: /Make Waves/ })).toBeVisible();
  await page.getByRole('link', { name: 'About the Club', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'About', exact: true })).toBeVisible();
  expect(moduleRequests).toBe(1);
  await page.screenshot({ path: `/tmp/nfw-fs3x-about-${testInfo.project.name}.png`, scale: 'css' });
});

test('a failed route import recovers through a document reload', async ({ page }, testInfo) => {
  const target = modulePath('src/site/AboutPage.tsx');
  let fail = true;
  let moduleRequests = 0;
  await page.route(
    (url) => url.pathname === target,
    async (route) => {
      moduleRequests++;
      if (fail) await route.abort('failed');
      else await route.continue();
    },
  );
  await page.goto('/about');
  await expect(page.getByText('Couldn’t load this page.')).toBeVisible();
  await page.screenshot({
    path: `/tmp/nfw-fs3x-import-error-${testInfo.project.name}.png`,
    scale: 'css',
  });
  fail = false;
  const reloaded = page.waitForEvent('framenavigated', (frame) => frame === page.mainFrame());
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await reloaded;
  await expect(page.getByRole('heading', { name: 'About', exact: true })).toBeVisible();
  await expect(page).toHaveTitle('About — North Florida Wavemakers');
  expect(moduleRequests).toBe(2);
});

test('cold admin and lesson routes load their own screens and retain titles', async ({
  page,
}, testInfo) => {
  await signIn(page, 'ADMIN');
  for (const [path, title] of [
    ['/admin', 'Manage Debates'],
    ['/admin-ballots', 'All Ballots'],
    ['/admin-users', 'Manage Users'],
    ['/lessons', 'Lessons'],
    ['/lessons/2026/1', 'Lesson 1: Finding Your Voice'],
    ['/about', 'About'],
    ['/schedule', 'Schedule'],
    ['/join', 'Join Us'],
  ]) {
    await page.goto(path!);
    await expect(page).toHaveTitle(`${title} — North Florida Wavemakers`);
    await expect(page.getByText('Couldn’t load this page.')).toHaveCount(0);
    if (path === '/admin-users' || path === '/lessons/2026/1') {
      await page.screenshot({
        path: `/tmp/nfw-fs3x-${path === '/admin-users' ? 'admin' : 'lesson'}-${testInfo.project.name}.png`,
        scale: 'css',
      });
    }
  }
  await page.goto('/lessons/new');
  await expect(page.getByRole('heading', { name: 'New lesson', exact: true })).toBeVisible();
});

test('member and sign-in gates do not download unauthorized screen modules', async ({
  page,
}, testInfo) => {
  const scripts: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'script') scripts.push(new URL(request.url()).pathname);
  });
  await page.goto('/admin-users');
  await expect(page.getByRole('heading', { name: 'Sign in or create account' })).toBeVisible();
  expect(scripts).not.toContain(modulePath('ballots/components/AdminUsers.tsx'));
  await signIn(page, 'STUDENT');
  await page.goto('/admin-users');
  await expect(page).toHaveTitle('Ballots — North Florida Wavemakers');
  await expect(page.getByRole('heading', { name: 'My Feedback', exact: true })).toBeVisible();
  expect(scripts).not.toContain(modulePath('ballots/components/AdminUsers.tsx'));
  await page.screenshot({
    path: `/tmp/nfw-fs3x-member-${testInfo.project.name}.png`,
    scale: 'css',
  });
});
