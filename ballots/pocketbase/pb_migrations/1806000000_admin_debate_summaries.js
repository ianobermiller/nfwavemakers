migrate(
  (app) => {
    const admin = '@request.auth.role ?= "admin"';
    app.save(new Collection({
      name: 'admin_debate_summaries',
      type: 'view',
      listRule: admin,
      viewRule: admin,
      viewQuery: `
        SELECT d.id, d.id AS debate, d.date,
          (SELECT COUNT(*) FROM ballots b
            WHERE b.debate = d.id AND b.deleted_at = '') AS ballot_count
        FROM debates d WHERE d.deleted_at = ''
      `,
    }));
    const ballots = app.findCollectionByNameOrId('ballots');
    ballots.indexes.push("CREATE INDEX idx_active_ballots_debate ON ballots (debate) WHERE deleted_at = ''");
    app.save(ballots);
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('admin_debate_summaries'));
    const ballots = app.findCollectionByNameOrId('ballots');
    ballots.indexes = ballots.indexes.filter((sql) => !sql.includes('idx_active_ballots_debate'));
    app.save(ballots);
  },
);
