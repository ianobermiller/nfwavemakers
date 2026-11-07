/**
 * OTP proves inbox access, so a successful code sign-in marks the auth
 * record verified. Club email visibility stays on so admins can see
 * addresses in Manage Users (this instance is only the club).
 * An admin creating a member marks that record verified: the admin is
 * admitting them, same as the old profile email_verified flag.
 *
 * A throw after the auth row is written fails the request even though the
 * sign-in succeeded, so the verified update is caught.
 */

onRecordCreateRequest((e) => {
  e.record.set('emailVisibility', true);
  const auth = e.auth;
  if (auth && auth.collection().name === 'users' && auth.getString('role') === 'admin') {
    e.record.set('verified', true);
  }
  e.next();
}, 'users');

onRecordAuthWithOTPRequest((e) => {
  e.next();
  if (e.status() !== 200 || !e.record || e.record.getBool('verified')) return;
  try {
    e.record.set('verified', true);
    e.app.save(e.record);
  } catch (err) {
    console.error('Failed to mark verified after OTP', err);
  }
}, 'users');
