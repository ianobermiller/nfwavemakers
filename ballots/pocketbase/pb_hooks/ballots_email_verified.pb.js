/**
 * Keep ballots_profiles.email_verified in sync with the shared users.verified
 * flag. Self-signup cannot set email_verified itself except by confirming the
 * PocketBase verification email (or completing an OTP that marks verified).
 */

function syncProfileEmailVerified(app, authUser) {
  if (!authUser || !authUser.getBool('verified')) return;

  let profile;
  try {
    profile = app.findFirstRecordByFilter('ballots_profiles', 'user = {:user}', {
      user: authUser.id,
    });
  } catch {
    return;
  }

  if (profile.getBool('email_verified')) return;
  profile.set('email_verified', true);
  app.save(profile);
}

onRecordAfterUpdateSuccess((e) => {
  if (e.record.collection().name === 'users') {
    syncProfileEmailVerified(e.app, e.record);
  }
  e.next();
});

onRecordAfterCreateSuccess((e) => {
  if (e.record.collection().name === 'users') {
    syncProfileEmailVerified(e.app, e.record);
  }
  e.next();
});

// OTP proves inbox access. Mark verified after a successful auth, then sync.
onRecordAuthWithOTPRequest((e) => {
  e.next();
  if (e.status() !== 200 || !e.record) return;
  if (!e.record.getBool('verified')) {
    e.record.set('verified', true);
    e.app.save(e.record);
  }
  syncProfileEmailVerified(e.app, e.record);
}, 'users');
