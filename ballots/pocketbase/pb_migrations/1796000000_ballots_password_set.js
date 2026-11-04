migrate(
  (app) => {
    const profiles = app.findCollectionByNameOrId("ballots_profiles");

    profiles.fields.add(
      new BoolField({
        name: "password_set",
        required: false,
      }),
    );

    // Members cannot claim a chosen password themselves. Hooks set this when
    // the auth password hash changes or when they sign in with a password.
    profiles.createRule = restrictSelfService(
      profiles.createRule,
      "@request.body.password_set:isset = false",
    );
    profiles.updateRule = restrictSelfService(
      profiles.updateRule,
      "@request.body.password_set:changed = false",
    );

    app.save(profiles);
  },
  (app) => {
    const profiles = app.findCollectionByNameOrId("ballots_profiles");
    profiles.fields.removeByName("password_set");
    profiles.createRule = String(profiles.createRule).replace(
      "@request.body.password_set:isset = false && ",
      "",
    );
    profiles.updateRule = String(profiles.updateRule).replace(
      "@request.body.password_set:changed = false && ",
      "",
    );
    app.save(profiles);
  },
);

function restrictSelfService(rule, clause) {
  const text = String(rule ?? "");
  if (text.includes(clause)) return text;
  const next = text.replace(
    "user = @request.auth.id && ",
    `user = @request.auth.id && ${clause} && `,
  );
  if (next === text) {
    throw new Error(`Could not restrict self-service profile writes (${clause})`);
  }
  return next;
}
