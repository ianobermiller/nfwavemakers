/**
 * Admin (or superuser) fills club fields on an auth user that already
 * exists (for example a code-only signup) so Manage Users can admit them
 * without creating a second record. The route name stays link-profile.
 */
routerAdd(
  'POST',
  '/api/ballots/link-profile',
  (e) => {
    if (!e.hasSuperuserAuth()) {
      const auth = e.auth;
      if (auth.collection().name !== 'users' || auth.getString('role') !== 'admin') {
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

    if (authUser.getString('role') || authUser.getBool('approved')) {
      return e.json(200, {
        status: 'exists',
        userId: authUser.id,
        email,
        name: authUser.getString('name') || name,
        role: authUser.getString('role') || role,
      });
    }

    authUser.set('name', name);
    authUser.set('role', role);
    authUser.set('category', role === 'student' ? 'speech' : '');
    authUser.set('archived', false);
    authUser.set('approved', true);
    authUser.set('verified', true);
    authUser.set('emailVisibility', true);
    e.app.save(authUser);

    return e.json(200, {
      status: 'created',
      userId: authUser.id,
      email,
      name,
      role,
    });
  },
  $apis.requireAuth(),
);
