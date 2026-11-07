/**
 * Keep ballots_profiles.email_verified in sync with the shared users.verified
 * flag. Self-signup cannot set email_verified itself except by confirming the
 * PocketBase verification email (or completing an OTP that marks verified).
 *
 * Helpers are required inside the handler. A top-level function is not
 * visible when PocketBase runs the handler, and a throw after the user row
 * is written fails the request even though the change was saved.
 */

onRecordAfterUpdateSuccess((e) => {
  e.next();
  const { syncProfileEmailVerified } = require(`${__hooks}/ballots_profile_flags.js`);
  try {
    syncProfileEmailVerified(e.app, e.record);
  } catch (err) {
    console.error('Failed to sync email_verified', err);
  }
}, 'users');

onRecordAfterCreateSuccess((e) => {
  e.next();
  const { syncProfileEmailVerified } = require(`${__hooks}/ballots_profile_flags.js`);
  try {
    syncProfileEmailVerified(e.app, e.record);
  } catch (err) {
    console.error('Failed to sync email_verified', err);
  }
}, 'users');

// OTP proves inbox access. Mark verified after a successful auth, then sync.
onRecordAuthWithOTPRequest((e) => {
  e.next();
  if (e.status() !== 200 || !e.record) return;

  const { syncProfileEmailVerified } = require(`${__hooks}/ballots_profile_flags.js`);
  try {
    if (!e.record.getBool('verified')) {
      e.record.set('verified', true);
      e.app.save(e.record);
    }
    syncProfileEmailVerified(e.app, e.record);
  } catch (err) {
    console.error('Failed to sync email_verified after OTP', err);
  }
}, 'users');
