/**
 * Track whether the person has chosen a sign-in password (as opposed to the
 * random one created for code-only accounts). Profile settings use this to
 * show either the change form or the email-a-link path.
 *
 * Helpers are required inside the handler. A top-level function is not
 * visible when PocketBase runs the handler, and a throw after the user row
 * is written fails the request even though the password was saved.
 */

onRecordUpdate((e) => {
  // Plain is set only when this save includes a password the person typed.
  // SetRandomPassword clears it, so code-only accounts stay unmarked.
  // Read it before e.next(): the password field wipes the plain value after
  // a successful write.
  const plain = e.record.get('password');
  e.next();
  if (typeof plain !== 'string' || plain === '') return;

  const { markPasswordSet } = require(`${__hooks}/ballots_profile_flags.js`);
  try {
    markPasswordSet(e.app, e.record);
  } catch (err) {
    console.error('Failed to record password_set', err);
  }
}, 'users');

// Someone who already chose a password before this flag existed, or who only
// signs in with a password, should see the change form on the next visit.
onRecordAuthWithPasswordRequest((e) => {
  e.next();
  if (e.status() !== 200 || !e.record) return;

  const { markPasswordSet } = require(`${__hooks}/ballots_profile_flags.js`);
  try {
    markPasswordSet(e.app, e.record);
  } catch (err) {
    console.error('Failed to record password_set after password sign-in', err);
  }
}, 'users');
