migrate(
  (app) => {
    const profiles = app.findCollectionByNameOrId("ballots_profiles");

    // Self-relation: the collection has to exist before this field can point at it.
    // No cascade — deleting one student must not delete their partner.
    profiles.fields.add(
      new RelationField({
        name: "partner",
        collectionId: profiles.id,
        maxSelect: 1,
        cascadeDelete: false,
      }),
    );

    profiles.createRule = restrictSelfService(
      profiles.createRule,
      "@request.body.partner:isset = false",
    );
    profiles.updateRule = restrictSelfService(
      profiles.updateRule,
      "@request.body.partner:changed = false",
    );

    app.save(profiles);
  },
  (app) => {
    const profiles = app.findCollectionByNameOrId("ballots_profiles");
    profiles.fields.removeByName("partner");
    profiles.createRule = String(profiles.createRule).replace(
      "@request.body.partner:isset = false && ",
      "",
    );
    profiles.updateRule = String(profiles.updateRule).replace(
      "@request.body.partner:changed = false && ",
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
