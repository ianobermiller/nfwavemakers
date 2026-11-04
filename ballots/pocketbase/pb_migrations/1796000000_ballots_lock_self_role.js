migrate(
  (app) => {
    const profiles = app.findCollectionByNameOrId("ballots_profiles");
    const admin = '@request.auth.ballots_profiles_via_user.role ?= "admin"';

    // Admins manage other people's roles. An admin cannot change their own role.
    // Self-service may set student or parent only while the profile still has none.
    profiles.updateRule = `(${admin} && (user != @request.auth.id || @request.body.role:changed = false)) || (user = @request.auth.id && @request.body.user:changed = false && @request.body.archived:changed = false && @request.body.partner:changed = false && @request.body.approved:changed = false && (@request.body.email_verified:changed = false || (@request.body.email_verified = true && @request.auth.verified = true)) && (@request.body.role:changed = false || (role = "" && (@request.body.role = "student" || @request.body.role = "parent"))))`;

    app.save(profiles);
  },
  (app) => {
    const profiles = app.findCollectionByNameOrId("ballots_profiles");
    const admin = '@request.auth.ballots_profiles_via_user.role ?= "admin"';

    profiles.updateRule = `${admin} || (user = @request.auth.id && @request.body.user:changed = false && @request.body.archived:changed = false && @request.body.partner:changed = false && @request.body.approved:changed = false && (@request.body.email_verified:changed = false || (@request.body.email_verified = true && @request.auth.verified = true)) && (@request.body.role:changed = false || @request.body.role = "student" || @request.body.role = "parent"))`;

    app.save(profiles);
  },
);
