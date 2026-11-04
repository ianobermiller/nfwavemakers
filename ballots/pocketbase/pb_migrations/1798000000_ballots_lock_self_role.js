migrate(
  (app) => {
    const profiles = app.findCollectionByNameOrId("ballots_profiles");
    const admin = '@request.auth.ballots_profiles_via_user.role ?= "admin"';

    // Category migration replaced the update rule and let members change their
    // own role again. Admins manage other people's roles. Self-service may set
    // student or parent only while the profile still has none.
    profiles.updateRule = `(${admin} && (user != @request.auth.id || @request.body.role:changed = false)) || (user = @request.auth.id && @request.body.password_set:changed = false && @request.body.user:changed = false && @request.body.archived:changed = false && @request.body.partner:changed = false && @request.body.approved:changed = false && (@request.body.email_verified:changed = false || (@request.body.email_verified = true && @request.auth.verified = true)) && (@request.body.role:changed = false || (role = "" && (@request.body.role = "student" || @request.body.role = "parent"))) && (@request.body.category:changed = false || @request.body.category = "speech" || @request.body.category = "tp" || @request.body.category = "ld" || @request.body.category = ""))`;

    app.save(profiles);
  },
  (app) => {
    const profiles = app.findCollectionByNameOrId("ballots_profiles");
    const admin = '@request.auth.ballots_profiles_via_user.role ?= "admin"';

    profiles.updateRule = `${admin} || (user = @request.auth.id && @request.body.user:changed = false && @request.body.archived:changed = false && @request.body.partner:changed = false && @request.body.approved:changed = false && (@request.body.email_verified:changed = false || (@request.body.email_verified = true && @request.auth.verified = true)) && (@request.body.role:changed = false || @request.body.role = "student" || @request.body.role = "parent") && (@request.body.category:changed = false || @request.body.category = "speech" || @request.body.category = "tp" || @request.body.category = "ld" || @request.body.category = ""))`;

    app.save(profiles);
  },
);
