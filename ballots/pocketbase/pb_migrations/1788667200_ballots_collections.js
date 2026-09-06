migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    const authenticated = '@request.auth.id != ""';
    const admin =
      '@request.auth.ballots_profiles_via_user.role ?= "admin"';

    const profiles = new Collection({
      name: "ballots_profiles",
      type: "base",
      listRule: authenticated,
      viewRule: authenticated,
      createRule:
        'user = @request.auth.id && @request.body.role:isset = false && @request.body.archived:isset = false',
      updateRule: `${admin} || (user = @request.auth.id && @request.body.user:changed = false && @request.body.archived:changed = false && (@request.body.role:changed = false || @request.body.role = "student" || @request.body.role = "parent"))`,
      deleteRule: admin,
      fields: [
        {
          name: "user",
          type: "relation",
          collectionId: users.id,
          maxSelect: 1,
          required: true,
          cascadeDelete: true,
        },
        { name: "name", type: "text", max: 200 },
        {
          name: "role",
          type: "select",
          maxSelect: 1,
          values: ["admin", "student", "parent"],
        },
        { name: "archived", type: "bool" },
        {
          name: "avatar",
          type: "file",
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ["image/jpeg", "image/png", "image/webp"],
          thumbs: ["100x100"],
        },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_ballots_profiles_user ON ballots_profiles (user)",
        "CREATE INDEX idx_ballots_profiles_name ON ballots_profiles (name)",
      ],
    });
    app.save(profiles);

    const debates = new Collection({
      name: "ballots_debates",
      type: "base",
      listRule: authenticated,
      viewRule: authenticated,
      createRule: admin,
      updateRule: admin,
      deleteRule: admin,
      fields: [
        {
          name: "date",
          type: "text",
          required: true,
          pattern: "^\\d{4}-\\d{2}-\\d{2}$",
        },
        { name: "room", type: "text", required: true, max: 100 },
        { name: "resolution", type: "text", max: 1000 },
        { name: "deleted_at", type: "date" },
        {
          name: "aff_team",
          type: "relation",
          collectionId: profiles.id,
          maxSelect: 2,
        },
        {
          name: "neg_team",
          type: "relation",
          collectionId: profiles.id,
          maxSelect: 2,
        },
        {
          name: "judges",
          type: "relation",
          collectionId: profiles.id,
          maxSelect: 20,
        },
      ],
      indexes: [
        "CREATE INDEX idx_ballots_debates_date ON ballots_debates (date)",
      ],
    });
    app.save(debates);

    const ballots = new Collection({
      name: "ballots_ballots",
      type: "base",
      listRule: `${admin} || judge.user = @request.auth.id || ballots_speaker_evals_via_ballot.speaker.user ?= @request.auth.id`,
      viewRule: `${admin} || judge.user = @request.auth.id || ballots_speaker_evals_via_ballot.speaker.user ?= @request.auth.id`,
      createRule:
        '@request.auth.id != "" && judge.user = @request.auth.id && @request.body.deleted_at:isset = false',
      updateRule: `${admin} || (judge.user = @request.auth.id && @request.body.judge:changed = false && @request.body.deleted_at:changed = false)`,
      deleteRule: admin,
      fields: [
        {
          name: "debate",
          type: "relation",
          collectionId: debates.id,
          maxSelect: 1,
        },
        {
          name: "judge",
          type: "relation",
          collectionId: profiles.id,
          maxSelect: 1,
          required: true,
        },
        { name: "reason_for_decision", type: "text", max: 10000 },
        {
          name: "winner",
          type: "select",
          maxSelect: 1,
          values: ["aff", "neg"],
        },
        { name: "submitted_at", type: "date" },
        { name: "deleted_at", type: "date" },
      ],
      indexes: [
        "CREATE INDEX idx_ballots_ballots_debate ON ballots_ballots (debate)",
        "CREATE INDEX idx_ballots_ballots_judge ON ballots_ballots (judge)",
        "CREATE UNIQUE INDEX idx_ballots_ballots_judge_debate ON ballots_ballots (judge, debate) WHERE debate != '' AND deleted_at = ''",
      ],
    });
    app.save(ballots);

    const speakerEvals = new Collection({
      name: "ballots_speaker_evals",
      type: "base",
      listRule: `${admin} || ballot.judge.user = @request.auth.id || speaker.user = @request.auth.id`,
      viewRule: `${admin} || ballot.judge.user = @request.auth.id || speaker.user = @request.auth.id`,
      createRule: `${admin} || ballot.judge.user = @request.auth.id`,
      updateRule: `${admin} || (ballot.judge.user = @request.auth.id && @request.body.ballot:changed = false)`,
      deleteRule: `${admin} || ballot.judge.user = @request.auth.id`,
      fields: [
        {
          name: "ballot",
          type: "relation",
          collectionId: ballots.id,
          maxSelect: 1,
          required: true,
          cascadeDelete: true,
        },
        {
          name: "speaker",
          type: "relation",
          collectionId: profiles.id,
          maxSelect: 1,
        },
        {
          name: "position",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["aff1", "aff2", "neg1", "neg2"],
        },
        { name: "rank", type: "number", min: 1, max: 4 },
        { name: "delivery", type: "number", min: 1, max: 5 },
        { name: "organization", type: "number", min: 1, max: 5 },
        { name: "evidence_and_support", type: "number", min: 1, max: 5 },
        { name: "refutation", type: "number", min: 1, max: 5 },
        { name: "cross_examination", type: "number", min: 1, max: 5 },
        { name: "conduct", type: "number", min: 1, max: 5 },
        { name: "notes", type: "text", max: 10000 },
      ],
      indexes: [
        "CREATE INDEX idx_ballots_speaker_evals_ballot ON ballots_speaker_evals (ballot)",
        "CREATE INDEX idx_ballots_speaker_evals_speaker ON ballots_speaker_evals (speaker)",
        "CREATE UNIQUE INDEX idx_ballots_speaker_evals_ballot_position ON ballots_speaker_evals (ballot, position)",
      ],
    });
    app.save(speakerEvals);
  },
  (app) => {
    for (const name of [
      "ballots_speaker_evals",
      "ballots_ballots",
      "ballots_debates",
      "ballots_profiles",
    ]) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch {
        // The migration may have stopped before creating every collection.
      }
    }
  },
);
