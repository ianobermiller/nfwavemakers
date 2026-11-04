import PocketBase from 'pocketbase';

const url = process.env.POCKETBASE_TEST_URL ?? process.env.VITE_POCKETBASE_URL;
// .env.local names these POCKETBASE_ADMIN_*, and global setup loads that file.
const superuserEmail = process.env.PB_SUPERUSER_EMAIL ?? process.env.POCKETBASE_ADMIN_EMAIL;
const superuserPassword = process.env.PB_SUPERUSER_PASSWORD ?? process.env.POCKETBASE_ADMIN_PASSWORD;
const password = process.env.TEST_ACCOUNT_PASSWORD ?? 'test-password';

if (!url) throw new Error('Set POCKETBASE_TEST_URL to the PocketBase test instance.');
if (!superuserEmail || !superuserPassword) {
  throw new Error(
    'Set PB_SUPERUSER_EMAIL and PB_SUPERUSER_PASSWORD (or POCKETBASE_ADMIN_*) to seed test data.',
  );
}
if (
  !url.includes('127.0.0.1') &&
  !url.includes('localhost') &&
  process.env.ALLOW_REMOTE_TEST_SEED !== '1'
) {
  throw new Error('Refusing to seed a remote PocketBase without ALLOW_REMOTE_TEST_SEED=1.');
}

const pb = new PocketBase(url);
await pb.collection('_superusers').authWithPassword(superuserEmail, superuserPassword);

async function upsertUser(email, name, role) {
  let authUser;
  try {
    authUser = await pb
      .collection('users')
      .getFirstListItem(pb.filter('email = {:email}', { email }));
  } catch (error) {
    if (error?.status !== 404) throw error;
  }

  const body = {
    email,
    emailVisibility: true,
    password,
    passwordConfirm: password,
    verified: true,
  };
  authUser = authUser
    ? await pb.collection('users').update(authUser.id, body)
    : await pb.collection('users').create(body);

  let profile;
  try {
    profile = await pb
      .collection('ballots_profiles')
      .getFirstListItem(pb.filter('user = {:user}', { user: authUser.id }));
  } catch (error) {
    if (error?.status !== 404) throw error;
  }
  const profileBody = {
    user: authUser.id,
    name,
    role,
    archived: false,
    approved: true,
    email_verified: true,
    ...(role === 'student' ? { category: 'tp' } : {}),
  };
  return profile
    ? await pb.collection('ballots_profiles').update(profile.id, profileBody)
    : await pb.collection('ballots_profiles').create(profileBody);
}

const student = await upsertUser('student@example.com', 'Alice Student', 'student');
const partner = await upsertUser('partner@example.com', 'Dana Partner', 'student');
const judge = await upsertUser('judge@example.com', 'Bob Judge', 'parent');
await upsertUser('admin@example.com', 'Carol Admin', 'admin');

let debate;
try {
  debate = await pb
    .collection('ballots_debates')
    .getFirstListItem('date = "2024-01-15" && room = "101"');
  debate = await pb.collection('ballots_debates').update(debate.id, {
    event: 'tp',
    aff_team: [student.id, partner.id],
    neg_team: [],
    judges: [judge.id],
    deleted_at: '',
  });
} catch (error) {
  if (error?.status !== 404) throw error;
  debate = await pb.collection('ballots_debates').create({
    date: '2024-01-15',
    room: '101',
    event: 'tp',
    resolution: 'Resolved: test data should be deterministic.',
    aff_team: [student.id, partner.id],
    neg_team: [],
    judges: [judge.id],
  });
}

let ballot;
try {
  ballot = await pb.collection('ballots_ballots').getFirstListItem(
    pb.filter('judge = {:judge} && debate = {:debate}', {
      judge: judge.id,
      debate: debate.id,
    }),
  );
  ballot = await pb.collection('ballots_ballots').update(ballot.id, {
    winner: 'aff',
    reason_for_decision: 'Affirmative had stronger evidence.',
    submitted_at: new Date('2024-01-15T18:00:00Z').toISOString(),
    deleted_at: '',
  });
} catch (error) {
  if (error?.status !== 404) throw error;
  ballot = await pb.collection('ballots_ballots').create({
    debate: debate.id,
    judge: judge.id,
    winner: 'aff',
    reason_for_decision: 'Affirmative had stronger evidence.',
    submitted_at: new Date('2024-01-15T18:00:00Z').toISOString(),
  });
}

async function upsertEval(body) {
  let evaluation;
  try {
    evaluation = await pb.collection('ballots_speaker_evals').getFirstListItem(
      pb.filter('ballot = {:ballot} && position = {:position}', {
        ballot: body.ballot,
        position: body.position,
      }),
    );
  } catch (error) {
    if (error?.status !== 404) throw error;
  }
  if (evaluation) {
    await pb.collection('ballots_speaker_evals').update(evaluation.id, body);
  } else {
    await pb.collection('ballots_speaker_evals').create(body);
  }
}

await upsertEval({
  ballot: ballot.id,
  speaker: student.id,
  position: 'aff1',
  rank: 1,
  delivery: 4,
  organization: 4,
  evidence_and_support: 5,
  refutation: 4,
  cross_examination: 4,
  conduct: 5,
  notes: 'Clear and persuasive.',
});
await upsertEval({
  ballot: ballot.id,
  speaker: partner.id,
  position: 'aff2',
  rank: 2,
  delivery: 3,
  organization: 3,
  evidence_and_support: 3,
  refutation: 3,
  cross_examination: 3,
  conduct: 4,
  notes: 'Partner kept the structure tight.',
});

console.log(`Seeded student@example.com, judge@example.com, admin@example.com`);
console.log(`Password: ${password}`);
console.log(
  JSON.stringify({
    ballotId: ballot.id,
    debateId: debate.id,
    adminEmail: 'admin@example.com',
    judgeEmail: 'judge@example.com',
    studentEmail: 'student@example.com',
  }),
);
