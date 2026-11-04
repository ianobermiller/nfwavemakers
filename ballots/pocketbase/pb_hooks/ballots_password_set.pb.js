/**
 * Track whether the person has chosen a sign-in password (as opposed to the
 * random one created for code-only accounts). Profile settings use this to
 * show either the change form or the email-a-link path.
 */

function markPasswordSet(app, authUser) {
  if (!authUser) return;

  let profile;
  try {
    profile = app.findFirstRecordByFilter('ballots_profiles', 'user = {:user}', {
      user: authUser.id,
    });
  } catch {
    return;
  }

  if (profile.getBool('password_set')) return;
  profile.set('password_set', true);
  app.save(profile);
}

function passwordHashChanged(record) {
  if (!record) return false;
  const original = record.original();
  if (!original) return false;
  return record.get('password') !== original.get('password');
}

onRecordAfterUpdateSuccess((e) => {
  if (e.record.collection().name === 'users' && passwordHashChanged(e.record)) {
    markPasswordSet(e.app, e.record);
  }
  e.next();
});

// Someone who already chose a password before this flag existed, or who only
// signs in with a password, should see the change form on the next visit.
onRecordAuthWithPasswordRequest((e) => {
  e.next();
  if (e.status() !== 200 || !e.record) return;
  markPasswordSet(e.app, e.record);
}, 'users');
