import { PlatformApi } from '@instantdb/platform';
import { init } from '@instantdb/admin';
import { schema } from '../src/schema.ts';

export default async function globalSetup(): Promise<void> {
  const platform = new PlatformApi({});
  const { app } = await platform.createTemporaryApp({ title: 'nfwm-e2e-test', schema });

  process.env['VITE_INSTANT_APP_ID'] = app.id;
  process.env['INSTANT_ADMIN_TOKEN'] = app.adminToken;
  console.log(`[e2e] Using temporary InstantDB app: ${app.id}`);

  const adminDb = init({ appId: app.id, adminToken: app.adminToken });
  const authedPlatform = new PlatformApi({ auth: { token: app.adminToken } });

  await authedPlatform.pushPerms(app.id, {
    perms: {
      $users: {
        allow: {
          view: 'auth.id != null',
          create: 'false',
          update: 'auth.id == data.id',
          delete: 'false',
        },
      },
      debates: {
        allow: {
          view: 'auth.id != null',
          create: 'auth.id != null',
          update: 'auth.id != null',
          delete: 'auth.id != null',
        },
      },
      ballots: {
        allow: {
          view: 'auth.id != null',
          create: 'auth.id != null',
          update: 'auth.id != null',
          delete: 'auth.id != null',
        },
      },
      speakerEvals: {
        allow: {
          view: 'auth.id != null',
          create: 'auth.id != null',
          update: 'auth.id != null',
          delete: 'auth.id != null',
        },
      },
    },
  });

  const studentToken = await adminDb.auth.createToken('student@test.com');
  const judgeToken = await adminDb.auth.createToken('judge@test.com');

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const studentUser = (await adminDb.auth.getUser({ email: 'student@test.com' }))!;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const judgeUser = (await adminDb.auth.getUser({ email: 'judge@test.com' }))!;

  await adminDb.transact([
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    adminDb.tx.$users[studentUser.id]!.update({ name: 'Alice Student', role: 'student' }),
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    adminDb.tx.$users[judgeUser.id]!.update({ name: 'Bob Judge', role: 'parent' }),
  ]);

  // Seed a debate with Alice as aff speaker and Bob as judge, plus a submitted ballot.
  const debateId = crypto.randomUUID();
  const ballotId = crypto.randomUUID();
  const evalAff1Id = crypto.randomUUID();

  await adminDb.transact([
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    adminDb.tx.debates[debateId]!.update({
      date: '2024-01-15',
      room: 'A1',
      resolution: 'Resolved: Test resolution.',
    }),
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    adminDb.tx.debates[debateId]!.link({ affTeam: studentUser.id }),
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    adminDb.tx.debates[debateId]!.link({ judges: judgeUser.id }),
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    adminDb.tx.ballots[ballotId]!.update({
      winner: 'aff',
      reasonForDecision: 'Affirmative had stronger evidence.',
      submittedAt: Date.now(),
    }),
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    adminDb.tx.ballots[ballotId]!.link({ debate: debateId }),
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    adminDb.tx.ballots[ballotId]!.link({ judge: judgeUser.id }),
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    adminDb.tx.speakerEvals[evalAff1Id]!.update({
      position: 'aff1',
      delivery: 4,
      organization: 4,
      evidenceAndSupport: 5,
      refutation: 3,
      crossExamination: 4,
      conduct: 5,
      notes: 'Strong opening. Good eye contact.',
    }),
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    adminDb.tx.speakerEvals[evalAff1Id]!.link({ ballot: ballotId }),
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    adminDb.tx.speakerEvals[evalAff1Id]!.link({ speaker: studentUser.id }),
  ]);

  process.env['E2E_STUDENT_TOKEN'] = studentToken;
  process.env['E2E_JUDGE_TOKEN'] = judgeToken;
  process.env['E2E_STUDENT_NAME'] = 'Alice Student';
  process.env['E2E_DEBATE_ID'] = debateId;
  process.env['E2E_BALLOT_ID'] = ballotId;
}
