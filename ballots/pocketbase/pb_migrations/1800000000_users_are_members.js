// Club membership lives on the auth `users` collection. Debate teams, judges,
// and speakers point at users. Fresh installs still create the old ballots_*
// collections in earlier migrations; this one folds them. The live instance
// was folded by the data copy, so this only repairs rules and avatar thumbs.

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    ensureMemberFields(users);
    users.listRule =
      '@request.auth.role ?= "admin" || (@request.auth.id != "" && (@request.auth.approved = true && @request.auth.verified = true || id = @request.auth.id))';
    users.viewRule = users.listRule;
    users.createRule =
      '@request.auth.role ?= "admin" || (@request.auth.id = "" && @request.body.role:isset = false && @request.body.archived:isset = false && @request.body.approved:isset = false && @request.body.category:isset = false && @request.body.partner:isset = false && @request.body.password_set:isset = false)';
    users.updateRule =
      '(@request.auth.role ?= "admin" && (id != @request.auth.id || @request.body.role:changed = false)) || (id = @request.auth.id && @request.body.password_set:changed = false && @request.body.archived:changed = false && @request.body.partner:changed = false && @request.body.approved:changed = false && (@request.body.role:changed = false || (role = "" && (@request.body.role = "student" || @request.body.role = "parent"))) && (@request.body.category:changed = false || @request.body.category = "speech" || @request.body.category = "tp" || @request.body.category = "ld" || @request.body.category = ""))';
    users.deleteRule = '@request.auth.role ?= "admin"';
    const avatar = users.fields.getByName("avatar");
    if (avatar && avatar.thumbs.length === 0) {
      avatar.thumbs = ["100x100"];
    }
    app.save(users);

    const profiles = findOptional(app, "ballots_profiles");
    if (!profiles) {
      // Already folded by the data copy. Install the canonical rules, including
      // the speaker relation fix (speaker, not speaker.user).
      applyFinalRules(app);
      return;
    }

    const renames = [
      ["ballots_debates", "debates"],
      ["ballots_ballots", "ballots"],
      ["ballots_speaker_evals", "speaker_evals"],
      ["ballots_lessons", "lessons"],
    ];
    for (const pair of renames) {
      const collection = app.findCollectionByNameOrId(pair[0]);
      // Drop profile relations in their own save. PocketBase treats a same-named
      // field as an update and rejects collectionId changes. Rules stay admin-only
      // and indexes are cleared for that save so they do not mention removed columns.
      const pending = dropProfileRelations(collection, profiles.id);
      const keptIndexes = [];
      for (const sql of collection.indexes) keptIndexes.push(sql);
      collection.indexes = [];
      lockToAdmin(collection);
      app.save(collection);
      collection.indexes = keptIndexes;
      for (const item of pending) {
        collection.fields.add(
          new RelationField({
            name: item.name,
            collectionId: users.id,
            maxSelect: item.maxSelect,
            required: item.required,
            cascadeDelete: false,
          }),
        );
      }
      renameCollection(app, collection, pair[1]);
    }
    applyFinalRules(app);

    app.delete(profiles);
    if (typeof app.forgetCollection === "function") app.forgetCollection("ballots_profiles");
  },
  () => {
    throw new Error("Folding club fields onto users is not reversible");
  },
);

function findOptional(app, name) {
  try {
    return app.findCollectionByNameOrId(name);
  } catch {
    return null;
  }
}

function ensureMemberFields(users) {
  if (!users.fields.getByName("role")) {
    users.fields.add(
      new SelectField({
        name: "role",
        required: false,
        maxSelect: 1,
        values: ["admin", "student", "parent"],
      }),
    );
  }
  if (!users.fields.getByName("approved")) {
    users.fields.add(new BoolField({ name: "approved" }));
  }
  if (!users.fields.getByName("archived")) {
    users.fields.add(new BoolField({ name: "archived" }));
  }
  if (!users.fields.getByName("category")) {
    users.fields.add(
      new SelectField({
        name: "category",
        required: false,
        maxSelect: 1,
        values: ["speech", "tp", "ld"],
      }),
    );
  }
  if (!users.fields.getByName("partner")) {
    users.fields.add(
      new RelationField({
        name: "partner",
        collectionId: users.id,
        maxSelect: 1,
        cascadeDelete: false,
      }),
    );
  }
  if (!users.fields.getByName("password_set")) {
    users.fields.add(new BoolField({ name: "password_set" }));
  }
}

function dropProfileRelations(collection, profilesId) {
  const names = ["aff_team", "neg_team", "judges", "judge", "speaker"];
  const pending = [];
  for (const name of names) {
    const field = collection.fields.getByName(name);
    if (!field || field.collectionId !== profilesId) continue;
    pending.push({
      name,
      maxSelect: field.maxSelect || 1,
      required: field.required === true,
    });
    collection.fields.removeByName(name);
  }
  return pending;
}

function lockToAdmin(collection) {
  const admin = '@request.auth.role ?= "admin"';
  collection.listRule = admin;
  collection.viewRule = admin;
  collection.createRule = admin;
  collection.updateRule = admin;
  collection.deleteRule = admin;
}

function applyFinalRules(app) {
  const admin = '@request.auth.role ?= "admin"';
  const member = "@request.auth.approved = true && @request.auth.verified = true";
  const rules = {
    debates: {
      listRule: `${admin} || (@request.auth.id != "" && ${member})`,
      viewRule: `${admin} || (@request.auth.id != "" && ${member})`,
      createRule: admin,
      updateRule: admin,
      deleteRule: admin,
    },
    ballots: {
      listRule: `${admin} || (${member} && (judge = @request.auth.id || speaker_evals_via_ballot.speaker ?= @request.auth.id))`,
      viewRule: `${admin} || (${member} && (judge = @request.auth.id || speaker_evals_via_ballot.speaker ?= @request.auth.id))`,
      createRule: `${member} && judge = @request.auth.id && @request.body.deleted_at:isset = false && @request.body.debate != ""`,
      updateRule: `${admin} || (${member} && judge = @request.auth.id && @request.body.judge:changed = false && @request.body.deleted_at:changed = false && (@request.body.debate:changed = false || @request.body.debate != ""))`,
      deleteRule: admin,
    },
    speaker_evals: {
      listRule: `${admin} || (${member} && (ballot.judge = @request.auth.id || speaker = @request.auth.id || (ballot.submitted_at != "" && (ballot.debate.aff_team.id ?= @request.auth.id || ballot.debate.neg_team.id ?= @request.auth.id))))`,
      viewRule: `${admin} || (${member} && (ballot.judge = @request.auth.id || speaker = @request.auth.id || (ballot.submitted_at != "" && (ballot.debate.aff_team.id ?= @request.auth.id || ballot.debate.neg_team.id ?= @request.auth.id))))`,
      createRule: `${admin} || (${member} && ballot.judge = @request.auth.id)`,
      updateRule: `${admin} || (${member} && ballot.judge = @request.auth.id && @request.body.ballot:changed = false)`,
      deleteRule: `${admin} || (${member} && ballot.judge = @request.auth.id)`,
    },
    lessons: {
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: admin,
      updateRule: admin,
      deleteRule: admin,
    },
  };
  for (const name of Object.keys(rules)) {
    const collection = findOptional(app, name);
    if (!collection) continue;
    const rule = rules[name];
    collection.listRule = rule.listRule;
    collection.viewRule = rule.viewRule;
    collection.createRule = rule.createRule;
    collection.updateRule = rule.updateRule;
    collection.deleteRule = rule.deleteRule;
    app.save(collection);
  }
}

function renameCollection(app, collection, newName) {
  const oldName = collection.name;
  if (oldName === newName) {
    app.save(collection);
    return;
  }
  const indexes = collection.indexes || [];
  const next = [];
  for (const sql of indexes) next.push(String(sql).split(oldName).join(newName));
  collection.indexes = next;
  collection.name = newName;
  app.save(collection);
  if (typeof app.forgetCollection === "function") app.forgetCollection(oldName);
}
