/**
 * Admin (or superuser) can attach a ballots_profiles row to an existing
 * shared users auth record. The users list/view rules hide other members'
 * emails from the SPA, so the client cannot look up the auth id itself.
 */
routerAdd(
  'POST',
  '/api/ballots/link-profile',
  (e) => {
    if (!e.hasSuperuserAuth()) {
      const auth = e.auth;
      if (!auth) {
        throw new UnauthorizedError('Sign in required');
      }
      try {
        e.app.findFirstRecordByFilter(
          'ballots_profiles',
          "user = {:user} && role = 'admin'",
          { user: auth.id },
        );
      } catch {
        throw new ForbiddenError('Admin only');
      }
    }

    const body = e.requestInfo().body || {};
    const email = String(body.email || '')
      .trim()
      .toLowerCase();
    const name = String(body.name || '').trim();
    const role = String(body.role || 'student')
      .trim()
      .toLowerCase();

    if (!email || !name) {
      throw new BadRequestError('Name and email are required');
    }
    if (role !== 'admin' && role !== 'student' && role !== 'parent') {
      throw new BadRequestError('Invalid role');
    }

    let authUser;
    try {
      authUser = e.app.findAuthRecordByEmail('users', email);
    } catch {
      throw new NotFoundError('No sign-in account for that email');
    }

    try {
      const existing = e.app.findFirstRecordByFilter(
        'ballots_profiles',
        'user = {:user} || email = {:email}',
        { user: authUser.id, email },
      );
      return e.json(200, {
        status: 'exists',
        userId: existing.id,
        email,
        name: existing.getString('name') || name,
        role: existing.getString('role') || role,
      });
    } catch {
      // No profile yet — create one linked to the existing auth user.
    }

    const collection = e.app.findCollectionByNameOrId('ballots_profiles');
    const profile = new Record(collection);
    profile.set('user', authUser.id);
    profile.set('name', name);
    profile.set('email', email);
    profile.set('role', role);
    profile.set('archived', false);
    e.app.save(profile);

    return e.json(200, {
      status: 'created',
      userId: profile.id,
      email,
      name,
      role,
    });
  },
  $apis.requireAuth(),
);
