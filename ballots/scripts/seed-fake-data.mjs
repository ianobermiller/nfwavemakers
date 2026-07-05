// Seeds the InstantDB app with fake students, parents, debates, and ballots so
// the UI can be exercised with realistic volumes of data.
//
//   node scripts/seed-fake-data.mjs          # create fake data
//   node scripts/seed-fake-data.mjs clean    # delete everything this script created
//
// All fake users get emails ending in @seed.nfwm.test so they are easy to spot.
// Every created entity id is recorded in scripts/.seed-ids.json so `clean` can
// remove exactly what was added without touching real data.

import { init } from '@instantdb/admin';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IDS_FILE = join(__dirname, '.seed-ids.json');

// --- Load credentials from .env.local -------------------------------------
function loadEnv() {
  const envPath = join(__dirname, '..', '.env.local');
  const out = {};
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const env = loadEnv();
const appId = env['VITE_INSTANT_APP_ID'];
const adminToken = env['INSTANT_ADMIN_TOKEN'];
if (!appId || !adminToken) {
  console.error('Missing VITE_INSTANT_APP_ID or INSTANT_ADMIN_TOKEN in .env.local');
  process.exit(1);
}

const db = init({ appId, adminToken });

// --- Fake data sources ----------------------------------------------------
const STUDENT_NAMES = [
  'Ava Thompson', 'Liam Carter', 'Sophia Nguyen', 'Noah Patel', 'Isabella Rossi',
  'Ethan Kim', 'Mia Johnson', 'Lucas Martinez', 'Charlotte Lee', 'Mason Brooks',
];
const PARENT_NAMES = [
  'David Thompson', 'Maria Nguyen', 'James Patel', 'Elena Rossi', 'Robert Kim',
  'Susan Johnson', 'Carlos Martinez', 'Linda Lee', 'Michael Brooks', 'Karen Carter',
];

const RESOLUTIONS = [
  'Resolved: The United States should significantly increase investment in renewable energy.',
  'Resolved: Social media has done more harm than good to society.',
  'Resolved: Standardized testing should be abolished in public schools.',
  'Resolved: The voting age should be lowered to sixteen.',
  'Resolved: Artificial intelligence poses a greater threat than benefit to humanity.',
  'Resolved: Public funding of professional sports stadiums should be banned.',
  'Resolved: Homework does more harm than good for student learning.',
  'Resolved: Space exploration is a justified use of public funds.',
];
const ROOMS = ['A1', 'A2', 'B1', 'B2', 'C1', 'Library', 'Auditorium'];
const RFDS = [
  'Stronger evidence and clearer impact calculus carried the round.',
  'Better refutation in rebuttals; opponents dropped key arguments.',
  'More organized case and superior cross examination.',
  'Closed the round with the cleanest weighing of the contentions.',
  'Controlled the framework debate and extended it convincingly.',
];

const SCORE_FIELDS = [
  'delivery', 'organization', 'evidenceAndSupport', 'refutation', 'crossExamination', 'conduct',
];
const POSITIONS = ['aff1', 'aff2', 'neg1', 'neg2'];

// Deterministic-ish PRNG so re-runs vary but stay reproducible within a run.
let seed = 12345;
function rng() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const randScore = () => 2 + Math.floor(rng() * 4); // 2..5
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const DAY = 24 * 60 * 60 * 1000;

async function seedData() {
  const created = { users: [], debates: [], ballots: [], speakerEvals: [] };
  const now = Date.now();

  // --- Users -------------------------------------------------------------
  console.log('Creating 10 students and 10 parents...');
  const students = [];
  const parents = [];

  async function makeUser(name, role, idx) {
    const slug = name.toLowerCase().replace(/[^a-z]+/g, '.');
    const email = `${slug}.${idx}@seed.nfwm.test`;
    // createToken provisions the $users record if it does not exist.
    await db.auth.createToken(email);
    const user = await db.auth.getUser({ email });
    created.users.push(user.id);
    return { id: user.id, name, role, email };
  }

  for (let i = 0; i < STUDENT_NAMES.length; i++) {
    students.push(await makeUser(STUDENT_NAMES[i], 'student', i));
  }
  for (let i = 0; i < PARENT_NAMES.length; i++) {
    parents.push(await makeUser(PARENT_NAMES[i], 'parent', i));
  }

  await db.transact([
    ...students.map((u) => db.tx.$users[u.id].update({ name: u.name, role: u.role })),
    ...parents.map((u) => db.tx.$users[u.id].update({ name: u.name, role: u.role })),
  ]);
  console.log(`  created ${students.length + parents.length} users`);

  // --- Debates + ballots -------------------------------------------------
  const NUM_DEBATES = 12;
  console.log(`Creating ${NUM_DEBATES} debates with ballots...`);
  const txs = [];

  for (let d = 0; d < NUM_DEBATES; d++) {
    const debateId = randomUUID();
    created.debates.push(debateId);

    // Spread debates from ~6 weeks ago to ~2 weeks out.
    const dayOffset = -42 + d * 5;
    const debateDate = new Date(now + dayOffset * DAY).toISOString().slice(0, 10);
    const isPast = dayOffset < 0;

    const roster = shuffle(students);
    const affTeam = roster.slice(0, 2);
    const negTeam = roster.slice(2, 4);
    const judges = shuffle(parents).slice(0, 1 + Math.floor(rng() * 3)); // 1-3 judges

    txs.push(
      db.tx.debates[debateId].update({
        date: debateDate,
        room: pick(ROOMS),
        resolution: pick(RESOLUTIONS),
      }),
    );
    for (const s of affTeam) txs.push(db.tx.debates[debateId].link({ affTeam: s.id }));
    for (const s of negTeam) txs.push(db.tx.debates[debateId].link({ negTeam: s.id }));
    for (const j of judges) txs.push(db.tx.debates[debateId].link({ judges: j.id }));

    const speakersByPos = {
      aff1: affTeam[0], aff2: affTeam[1], neg1: negTeam[0], neg2: negTeam[1],
    };

    for (const judge of judges) {
      // Past debates: submitted ballots. Future debates: leave most empty,
      // but submit one occasionally so the UI shows mixed states.
      const submit = isPast || rng() < 0.3;
      const ballotId = randomUUID();
      created.ballots.push(ballotId);

      const winner = rng() < 0.5 ? 'aff' : 'neg';
      txs.push(
        db.tx.ballots[ballotId].update({
          winner: submit ? winner : null,
          reasonForDecision: submit ? pick(RFDS) : null,
          ...(submit ? { submittedAt: now + dayOffset * DAY } : {}),
        }),
        db.tx.ballots[ballotId].link({ debate: debateId }),
        db.tx.ballots[ballotId].link({ judge: judge.id }),
      );

      // Rank order: shuffle positions to assign ranks 1-4.
      const rankOrder = shuffle(POSITIONS);

      for (const pos of POSITIONS) {
        const evalId = randomUUID();
        created.speakerEvals.push(evalId);
        const speaker = speakersByPos[pos];
        const scored = submit;
        const scores = {};
        for (const f of SCORE_FIELDS) scores[f] = scored ? randScore() : null;
        txs.push(
          db.tx.speakerEvals[evalId].update({
            position: pos,
            rank: scored ? rankOrder.indexOf(pos) + 1 : null,
            ...scores,
            notes: scored && rng() < 0.4 ? 'Solid performance overall.' : null,
          }),
          db.tx.speakerEvals[evalId].link({ ballot: ballotId }),
        );
        if (speaker) txs.push(db.tx.speakerEvals[evalId].link({ speaker: speaker.id }));
      }
    }
  }

  // Transact in chunks to keep payloads reasonable.
  const CHUNK = 200;
  for (let i = 0; i < txs.length; i += CHUNK) {
    await db.transact(txs.slice(i, i + CHUNK));
    console.log(`  committed ${Math.min(i + CHUNK, txs.length)}/${txs.length} ops`);
  }

  writeFileSync(IDS_FILE, JSON.stringify(created, null, 2));
  console.log('\nDone. Summary:');
  console.log(`  users:        ${created.users.length}`);
  console.log(`  debates:      ${created.debates.length}`);
  console.log(`  ballots:      ${created.ballots.length}`);
  console.log(`  speakerEvals: ${created.speakerEvals.length}`);
  console.log(`\nRecorded ids in ${IDS_FILE}`);
  console.log('Run `node scripts/seed-fake-data.mjs clean` to remove it all.');
}

async function cleanData() {
  if (!existsSync(IDS_FILE)) {
    console.error(`No ${IDS_FILE} found; nothing to clean.`);
    process.exit(1);
  }
  const created = JSON.parse(readFileSync(IDS_FILE, 'utf8'));
  const dels = [
    ...created.speakerEvals.map((id) => db.tx.speakerEvals[id].delete()),
    ...created.ballots.map((id) => db.tx.ballots[id].delete()),
    ...created.debates.map((id) => db.tx.debates[id].delete()),
    ...created.users.map((id) => db.tx.$users[id].delete()),
  ];
  console.log(`Deleting ${dels.length} entities...`);
  const CHUNK = 200;
  for (let i = 0; i < dels.length; i += CHUNK) {
    await db.transact(dels.slice(i, i + CHUNK));
    console.log(`  deleted ${Math.min(i + CHUNK, dels.length)}/${dels.length}`);
  }
  writeFileSync(IDS_FILE, JSON.stringify({ users: [], debates: [], ballots: [], speakerEvals: [] }, null, 2));
  console.log('Clean complete.');
}

const cmd = process.argv[2];
if (cmd === 'clean') {
  await cleanData();
} else {
  await seedData();
}
