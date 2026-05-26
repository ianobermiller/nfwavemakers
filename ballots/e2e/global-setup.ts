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

  // Push permissions so $users is readable by all authenticated users.
  // (Same rules as instant.perms.ts — duplicated here to keep the temp test app consistent.)
  await adminDb.updateRules({
    rules: {
      $users: { allow: { view: 'auth.id != null', create: 'false', update: 'auth.id == data.id', delete: 'false' } },
      debates: { allow: { view: 'auth.id != null', create: 'auth.id != null', update: 'auth.id != null', delete: 'auth.id != null' } },
      ballots: { allow: { view: 'auth.id != null', create: 'auth.id != null', update: 'auth.id != null', delete: 'auth.id != null' } },
      speakerEvals: { allow: { view: 'auth.id != null', create: 'auth.id != null', update: 'auth.id != null', delete: 'auth.id != null' } },
    },
  });

  // Create a student user and a judge (parent) user, and store their tokens.
  const studentToken = await adminDb.auth.createToken('student@test.com');
  const judgeToken = await adminDb.auth.createToken('judge@test.com');

  // Resolve the user IDs so we can set roles via transact.
  const { user: studentUser } = await adminDb.auth.getUser({ email: 'student@test.com' });
  const { user: judgeUser } = await adminDb.auth.getUser({ email: 'judge@test.com' });

  await adminDb.transact([
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    adminDb.tx.$users[studentUser.id]!.update({ name: 'Alice Student', role: 'student' }),
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    adminDb.tx.$users[judgeUser.id]!.update({ name: 'Bob Judge', role: 'parent' }),
  ]);

  process.env['E2E_STUDENT_TOKEN'] = studentToken;
  process.env['E2E_JUDGE_TOKEN'] = judgeToken;
  process.env['E2E_STUDENT_NAME'] = 'Alice Student';
}
