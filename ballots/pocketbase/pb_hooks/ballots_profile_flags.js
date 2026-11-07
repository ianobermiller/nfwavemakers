/**
 * Profile flags for the shared users collection.
 *
 * Loaded with require() from inside a hook handler. PocketBase stringifies
 * handlers and runs them in a different VM, so a function declared at the
 * top of a .pb.js file is not in scope there.
 */

function findProfile(app, authUser) {
  if (!authUser) return null;
  try {
    return app.findFirstRecordByFilter('ballots_profiles', 'user = {:user}', {
      user: authUser.id,
    });
  } catch {
    return null;
  }
}

function markPasswordSet(app, authUser) {
  const profile = findProfile(app, authUser);
  if (!profile || profile.getBool('password_set')) return;
  profile.set('password_set', true);
  app.save(profile);
}

function syncProfileEmailVerified(app, authUser) {
  if (!authUser || !authUser.getBool('verified')) return;
  const profile = findProfile(app, authUser);
  if (!profile || profile.getBool('email_verified')) return;
  profile.set('email_verified', true);
  app.save(profile);
}

module.exports = {
  markPasswordSet,
  syncProfileEmailVerified,
};
