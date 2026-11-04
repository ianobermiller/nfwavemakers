migrate(
  (app) => {
    const ballots = app.findCollectionByNameOrId("ballots_ballots");

    const admin = '@request.auth.ballots_profiles_via_user.role ?= "admin"';
    const member =
      '@request.auth.ballots_profiles_via_user.approved = true && @request.auth.ballots_profiles_via_user.email_verified = true';

    // Ballots belong to a debate an admin already created. Do not allow a blank
    // create, and do not let a judge clear the debate on update.
    ballots.createRule = `${member} && judge.user = @request.auth.id && @request.body.deleted_at:isset = false && @request.body.debate != ""`;
    ballots.updateRule = `${admin} || (${member} && judge.user = @request.auth.id && @request.body.judge:changed = false && @request.body.deleted_at:changed = false && (@request.body.debate:changed = false || @request.body.debate != ""))`;

    app.save(ballots);
  },
  (app) => {
    const ballots = app.findCollectionByNameOrId("ballots_ballots");

    const admin = '@request.auth.ballots_profiles_via_user.role ?= "admin"';
    const member =
      '@request.auth.ballots_profiles_via_user.approved = true && @request.auth.ballots_profiles_via_user.email_verified = true';

    ballots.createRule = `${member} && judge.user = @request.auth.id && @request.body.deleted_at:isset = false`;
    ballots.updateRule = `${admin} || (${member} && judge.user = @request.auth.id && @request.body.judge:changed = false && @request.body.deleted_at:changed = false)`;

    app.save(ballots);
  },
);
