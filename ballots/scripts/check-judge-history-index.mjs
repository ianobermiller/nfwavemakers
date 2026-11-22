import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { stripVTControlCharacters } from 'node:util';
import PocketBase from 'pocketbase';
import { runInNewContext } from 'node:vm';

// Starts only a disposable loopback PocketBase. Captures its real member-authorized
// SQL and runs EXPLAIN in the same SQLite runtime, without measuring wall time.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const binary = process.env.POCKETBASE_BIN ?? path.join(root, 'pocketbase/pocketbase');
if (!existsSync(binary)) throw new Error('Build pocketbase/pocketbase or set POCKETBASE_BIN.');
const directory = mkdtempSync(path.join(os.tmpdir(), 'nfw-history-index-'));
const dataDir = path.join(directory, 'pb_data');
mkdirSync(dataDir);
for (const name of ['pb_hooks', 'pb_migrations'])
  cpSync(path.join(root, 'ballots/pocketbase', name), path.join(directory, name), {
    recursive: true,
  });
let migration;
runInNewContext(
  readFileSync(
    path.join(root, 'ballots/pocketbase/pb_migrations/1808000000_judge_history_index.js'),
    'utf8',
  ),
  {
    migrate: (up, down) => {
      migration = { up, down };
    },
  },
);
writeFileSync(
  path.join(directory, 'pb_hooks/verification.pb.js'),
  `
routerAdd('POST','/api/verification/history-index',(e)=>{
  try {
  const body=e.requestInfo().body;
  const up=${migration.up};
  const down=${migration.down};
  if(body.action==='up')up(e.app);
  if(body.action==='down')down(e.app);
  if(body.action==='plan'){
    const rows=arrayOf(new DynamicModel({id:0,parent:0,notused:0,detail:''}));
    e.app.db().newQuery('EXPLAIN QUERY PLAN '+body.sql).all(rows);
    return e.json(200,rows);
  }
  if(body.action==='index'){
    e.app.db().newQuery('DROP INDEX IF EXISTS candidate_history').execute();
    if(body.sql)e.app.db().newQuery(body.sql).execute();
  }
  if(body.action==='analyze')e.app.db().newQuery('ANALYZE').execute();
  return e.json(200,{ok:true});
  }catch(error){return e.json(500,{message:String(error)});}
},$apis.requireSuperuserAuth());
`,
);
const password = 'history-index-test-password';
const setup = spawnSync(
  binary,
  ['superuser', 'upsert', 'index@verification.test', password, '--dir=' + dataDir],
  { encoding: 'utf8' },
);
if (setup.status !== 0) throw new Error(setup.stderr || setup.stdout);
const port = await new Promise((resolve) => {
  const socket = net.createServer();
  socket.listen(0, '127.0.0.1', () => {
    const address = socket.address();
    socket.close(() => resolve(address.port));
  });
});
const url = `http://127.0.0.1:${port}`;
const sqlLines = [];
let pendingLog = '';
const child = spawn(binary, ['serve', '--dev', '--dir=' + dataDir, '--http=127.0.0.1:' + port], {
  stdio: ['ignore', 'pipe', 'pipe'],
});
const ingest = (chunk) => {
  pendingLog += chunk;
  const lines = pendingLog.split('\n');
  pendingLog = lines.pop() ?? '';
  for (const raw of lines) {
    const line = stripVTControlCharacters(raw);
    if (
      /^\[[^\]]+\] SELECT DISTINCT `ballots`\.\* FROM `ballots`/.test(line) &&
      line.includes('ORDER BY') &&
      line.includes('LIMIT 21')
    )
      sqlLines.push(line.replace(/^\[[^\]]+\] /, ''));
  }
};
child.stdout.on('data', ingest);
child.stderr.on('data', ingest);
const id = () => randomBytes(8).toString('hex').slice(0, 15);
try {
  let ready = false;
  for (let attempt = 0; attempt < 200; attempt++) {
    if (child.exitCode !== null) throw new Error('PocketBase exited during startup: ' + pendingLog);
    try {
      if ((await fetch(url + '/api/health')).ok) {
        ready = true;
        break;
      }
    } catch {}
    await delay(25);
  }
  assert(ready, 'Disposable PocketBase must become healthy.');
  const admin = new PocketBase(url);
  admin.autoCancellation(false);
  await admin.collection('_superusers').authWithPassword('index@verification.test', password);
  const control = (body) => admin.send('/api/verification/history-index', { method: 'POST', body });
  await control({ action: 'down' });
  const judges = [];
  for (let i = 0; i < 8; i++) {
    const user = await admin.collection('users').create({
      email: `judge-${i}@verification.test`,
      password,
      passwordConfirm: password,
      name: `Verification Judge ${i}`,
      role: 'parent',
      approved: true,
      verified: true,
    });
    judges.push(user.id);
  }
  const students = [];
  for (let i = 0; i < 4; i++) {
    const user = await admin.collection('users').create({
      email: `student-${i}@verification.test`,
      password,
      passwordConfirm: password,
      name: `Verification Student ${i}`,
      role: 'student',
      category: 'tp',
      approved: true,
      verified: true,
    });
    students.push(user.id);
  }
  const writes = [];
  for (let i = 0; i < 96; i++) {
    const debate = id();
    writes.push([
      'debates',
      {
        id: debate,
        date: '2020-01-01',
        room: `Verification ${i}`,
        judges,
        aff_team: students.slice(0, 2),
        neg_team: students.slice(2),
        event: 'tp',
      },
    ]);
    for (const judge of judges) {
      const ballot = id();
      writes.push([
        'ballots',
        {
          id: ballot,
          debate,
          judge,
          winner: 'aff',
          submitted_at:
            i % 7 === 0 ? '' : `2044-01-${String(1 + (i % 20)).padStart(2, '0')} 12:00:00.000Z`,
          deleted_at: i % 11 === 0 ? '2044-02-01 12:00:00.000Z' : '',
          reason_for_decision: 'Private verification feedback',
        },
      ]);
      for (const [position, index] of ['aff1', 'aff2', 'neg1', 'neg2'].map((position, index) => [
        position,
        index,
      ]))
        writes.push([
          'speaker_evals',
          {
            id: id(),
            ballot,
            speaker: students[index],
            position,
            notes: 'Private speaker feedback',
          },
        ]);
    }
  }
  for (let offset = 0; offset < writes.length; offset += 50) {
    const batch = admin.createBatch();
    for (const [collection, record] of writes.slice(offset, offset + 50))
      batch.collection(collection).create(record);
    await batch.send();
  }
  await control({ action: 'analyze' });
  const member = new PocketBase(url);
  await member.collection('users').authWithPassword('judge-0@verification.test', password);
  const judge = member.authStore.record.id;
  const options = (after) => ({
    filter: [
      member.filter('deleted_at = "" && judge = {:judge} && submitted_at != ""', { judge }),
      after
        ? member.filter(
            '(submitted_at < {:submitted_at} || (submitted_at = {:submitted_at} && id < {:id}))',
            after,
          )
        : '',
    ]
      .filter(Boolean)
      .join(' && '),
    sort: '-submitted_at,-id',
    skipTotal: true,
    fields: 'id,debate,submitted_at,winner',
  });
  const first = await member.collection('ballots').getList(1, 21, options());
  const boundary = first.items[19];
  const after = { submitted_at: boundary.submitted_at, id: boundary.id };
  const next = await member.collection('ballots').getList(1, 21, options(after));
  for (let attempt = 0; sqlLines.length < 2 && attempt < 100; attempt++) await delay(5);
  assert.equal(sqlLines.length, 2, 'Capture the actual first and cursor queries.');
  for (const sql of sqlLines) {
    assert(
      sql.includes('LEFT JOIN `users` `__auth_users`'),
      'Member authorization must be present.',
    );
    assert(sql.includes('speaker_evals'), 'Relation-based ballot access rule must be present.');
  }
  const capturedSql = [...sqlLines];
  const explain = async () => {
    const pair = [];
    for (const sql of capturedSql)
      pair.push((await control({ action: 'plan', sql })).map((row) => row.detail));
    return pair;
  };
  const hasSort = (plan) => plan.some((detail) => detail.includes('TEMP B-TREE FOR ORDER BY'));
  const plans = { before: await explain() };
  assert(plans.before.every(hasSort), 'The existing indexes require sorting both history queries.');
  await control({
    action: 'index',
    sql: "CREATE INDEX candidate_history ON ballots (judge, submitted_at DESC, id DESC) WHERE deleted_at = '' AND submitted_at != ''",
  });
  await control({ action: 'analyze' });
  plans.strictPredicate = await explain();
  await control({ action: 'index', sql: '' });
  await control({ action: 'up' });
  await control({ action: 'analyze' });
  plans.after = await explain();
  for (const plan of plans.after) {
    assert(
      plan.some((detail) => detail.includes('USING INDEX idx_ballots_judge_submitted')),
      'Actual member SQL must select the migrated index.',
    );
    assert(!hasSort(plan), 'The migrated index must remove the ORDER BY temporary tree.');
  }
  const indexedFirst = await member.collection('ballots').getList(1, 21, options());
  const indexedNext = await member.collection('ballots').getList(1, 21, options(after));
  assert.deepEqual(
    indexedFirst.items.map((item) => item.id),
    first.items.map((item) => item.id),
  );
  assert.deepEqual(
    indexedNext.items.map((item) => item.id),
    next.items.map((item) => item.id),
  );
  assert.equal(
    new Set([...first.items.slice(0, 20), ...next.items.slice(0, 20)].map((item) => item.id)).size,
    40,
  );
  await control({ action: 'down' });
  await control({ action: 'analyze' });
  plans.rolledBack = await explain();
  assert(plans.rolledBack.every(hasSort), 'Rolling back the migration restores the original sort.');
  await control({ action: 'up' });
  const output = {
    directory,
    fixture: { judges: 8, debates: 96, ballots: 768, evaluations: 3072 },
    requests: { first: options(), next: options(after) },
    firstIds: first.items.slice(0, 20).map((item) => item.id),
    nextIds: next.items.slice(0, 20).map((item) => item.id),
    sql: capturedSql,
    plans,
    note: 'The partial index excludes drafts, retains soft-deleted submissions, and leaves the DISTINCT temporary tree required by existing authorization joins. No latency measurement.',
  };
  writeFileSync('/private/tmp/nfw-o92a-query-proof.json', JSON.stringify(output, null, 2));
  for (const [name, pair] of Object.entries(plans)) console.log(name, JSON.stringify(pair));
  if (process.argv.includes('--screenshots')) {
    const { chromium } = await import('@playwright/test');
    const vitePort = await new Promise((resolve) => {
      const socket = net.createServer();
      socket.listen(0, '127.0.0.1', () => {
        const address = socket.address();
        socket.close(() => resolve(address.port));
      });
    });
    const vite = spawn(
      path.join(root, 'node_modules/.bin/vite'),
      ['--host', '127.0.0.1', '--port', String(vitePort)],
      { cwd: root, env: { ...process.env, VITE_POCKETBASE_URL: url }, stdio: 'ignore' },
    );
    let browser;
    try {
      for (let attempt = 0; attempt < 100; attempt++) {
        try {
          if ((await fetch('http://127.0.0.1:' + vitePort)).ok) break;
        } catch {}
        await delay(25);
      }
      browser = await chromium.launch();
      const page = await browser.newPage({
        colorScheme: 'dark',
        viewport: { width: 1280, height: 800 },
      });
      await page.goto('http://127.0.0.1:' + vitePort + '/ballots');
      await page.getByRole('button', { name: 'Use a password' }).click();
      await page.locator('#email').fill('judge-0@verification.test');
      await page.locator('#password').fill(password);
      await page.getByRole('button', { name: 'Sign In', exact: true }).click();
      await page.locator('#email').waitFor({ state: 'hidden' });
      const dismiss = page.getByRole('button', { name: 'Not now' });
      if (await dismiss.isVisible()) await dismiss.click();
      await page.locator('[id^="history-ballot-"]').first().waitFor();
      assert.equal(await page.locator('[id^="history-ballot-"]').count(), 20);
      await page
        .getByRole('heading', { name: 'Your Submitted Ballots', exact: true })
        .scrollIntoViewIfNeeded();
      await page.screenshot({
        path: '/private/tmp/nfw-o92a-judge-desktop.png',
        scale: 'css',
        animations: 'disabled',
      });
      await page.setViewportSize({ width: 412, height: 839 });
      await page
        .getByRole('heading', { name: 'Your Submitted Ballots', exact: true })
        .scrollIntoViewIfNeeded();
      await page.screenshot({
        path: '/private/tmp/nfw-o92a-judge-mobile.png',
        scale: 'css',
        animations: 'disabled',
      });
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.setContent(
        '<html style="color-scheme:dark;background:#020617;color:#e2e8f0;font:18px system-ui;padding:32px"><h1>Judge history index: actual PocketBase SQL</h1><p>768 ballots · 3,072 evaluations · member authorization · first page and cursor</p><h2>Before</h2><pre></pre><h2>After</h2><pre></pre><p>Ordering and 40 unique displayed records preserved. Migration down/up passes.</p><p>Drafts excluded from index; soft-deleted submissions retained. DISTINCT tree remains.</p><p>No latency or speedup measurement.</p></html>',
      );
      await page
        .locator('pre')
        .nth(0)
        .evaluate((node, text) => {
          node.textContent = text;
        }, plans.before[0].join('\n'));
      await page
        .locator('pre')
        .nth(1)
        .evaluate((node, text) => {
          node.textContent = text;
        }, plans.after[0].join('\n'));
      await page.screenshot({
        path: '/private/tmp/nfw-o92a-query-plans.png',
        scale: 'css',
        animations: 'disabled',
        fullPage: true,
      });
    } finally {
      if (browser) await browser.close();
      vite.kill('SIGTERM');
      await new Promise((resolve) => vite.once('exit', resolve));
    }
  }
  console.log('Actual generated SQL and plans: /private/tmp/nfw-o92a-query-proof.json');
} catch (error) {
  console.error('Proof failed:', error.response ?? error.message);
  writeFileSync(
    '/private/tmp/nfw-o92a-failed-sql.json',
    JSON.stringify({ directory, sqlLines }, null, 2),
  );
  process.exitCode = 1;
} finally {
  child.kill('SIGTERM');
  await new Promise((resolve) => child.once('exit', resolve));
}
