migrate(
  (app) => {
    const profiles = app.findCollectionByNameOrId("ballots_profiles");
    const admin = '@request.auth.ballots_profiles_via_user.role ?= "admin"';

    profiles.fields.add(
      new SelectField({
        name: "category",
        required: false,
        maxSelect: 1,
        values: ["speech", "tp", "ld"],
      }),
    );

    // Self-signup may only attach a bare profile. Category is set with name/role
    // on the first profile update, the same way role is today.
    profiles.createRule = `${admin} || (user = @request.auth.id && @request.body.role:isset = false && @request.body.archived:isset = false && @request.body.partner:isset = false && @request.body.approved:isset = false && @request.body.email_verified:isset = false && @request.body.category:isset = false)`;
    profiles.updateRule = `${admin} || (user = @request.auth.id && @request.body.user:changed = false && @request.body.archived:changed = false && @request.body.partner:changed = false && @request.body.approved:changed = false && (@request.body.email_verified:changed = false || (@request.body.email_verified = true && @request.auth.verified = true)) && (@request.body.role:changed = false || @request.body.role = "student" || @request.body.role = "parent") && (@request.body.category:changed = false || @request.body.category = "speech" || @request.body.category = "tp" || @request.body.category = "ld" || @request.body.category = ""))`;
    app.save(profiles);

    // Existing students were Team Policy before Speech/LD categories existed.
    const existing = app.findAllRecords(profiles);
    for (const record of existing) {
      if (record.get("role") !== "student") continue;
      if (record.get("category")) continue;
      record.set("category", "tp");
      app.save(record);
    }
  },
  (app) => {
    const profiles = app.findCollectionByNameOrId("ballots_profiles");
    const admin = '@request.auth.ballots_profiles_via_user.role ?= "admin"';

    profiles.fields.removeByName("category");
    profiles.createRule = `${admin} || (user = @request.auth.id && @request.body.role:isset = false && @request.body.archived:isset = false && @request.body.partner:isset = false && @request.body.approved:isset = false && @request.body.email_verified:isset = false)`;
    profiles.updateRule = `${admin} || (user = @request.auth.id && @request.body.user:changed = false && @request.body.archived:changed = false && @request.body.partner:changed = false && @request.body.approved:changed = false && (@request.body.email_verified:changed = false || (@request.body.email_verified = true && @request.auth.verified = true)) && (@request.body.role:changed = false || @request.body.role = "student" || @request.body.role = "parent"))`;
    app.save(profiles);
  },
);
