/**
 * Track whether the person has chosen a sign-in password (as opposed to the
 * random one created for code-only accounts). Profile settings use this to
 * show either the change form or the email-a-link path.
 *
 * Helpers live inside the callbacks. PocketBase recompiles hook callbacks
 * as standalone scripts, so file-level functions are not in scope.
 */

onRecordAfterUpdateSuccess((e) => {
  const record = e.record;
  if (!record || record.collection().name !== 'users') {
    e.next();
    return;
  }
  const original = record.original();
  const passwordChanged = original && record.get('password') !== original.get('password');
  if (passwordChanged && !record.getBool('password_set')) {
    record.set('password_set', true);
    e.app.save(record);
  }
  e.next();
}, 'users');

// Someone who already chose a password before this flag existed, or who only
// signs in with a password, should see the change form on the next visit.
onRecordAuthWithPasswordRequest((e) => {
  e.next();
  if (e.status() !== 200 || !e.record || e.record.getBool('password_set')) return;
  e.record.set('password_set', true);
  e.app.save(e.record);
}, 'users');
