migrate(
  (app) => {
    const ballots = app.findCollectionByNameOrId('ballots');
    // PocketBase emits IS NOT for nonempty dates. Adding deleted_at = '' to
    // this predicate prevents use with its null-aware active-record filter.
    ballots.indexes.push("CREATE INDEX idx_ballots_judge_submitted ON ballots (judge, submitted_at DESC, id DESC) WHERE submitted_at IS NOT ''");
    app.save(ballots);
  },
  (app) => {
    const ballots = app.findCollectionByNameOrId('ballots');
    ballots.indexes = ballots.indexes.filter((sql) => !sql.includes('idx_ballots_judge_submitted'));
    app.save(ballots);
  },
);
