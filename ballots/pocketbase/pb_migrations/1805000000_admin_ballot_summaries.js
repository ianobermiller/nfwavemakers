migrate(
  (app) => {
    const admin = '@request.auth.role ?= "admin"';
    app.save(new Collection({
      name: 'admin_ballot_debates',
      type: 'view',
      listRule: admin,
      viewRule: admin,
      viewQuery: `
        SELECT d.id, d.id AS debate, d.date,
          (SELECT COUNT(*) FROM ballots b
            WHERE b.debate = d.id AND b.deleted_at = '' AND b.submitted_at != '') AS ballot_count
        FROM debates d WHERE d.deleted_at = ''
      `,
    }));
    app.save(new Collection({
      name: 'admin_ballot_students',
      type: 'view',
      listRule: admin,
      viewRule: admin,
      viewQuery: `
        SELECT u.id, u.id AS student, u.name,
          (SELECT COUNT(DISTINCT CASE WHEN b.debate = '' THEN b.id ELSE b.debate END)
            FROM speaker_evals e JOIN ballots b ON b.id = e.ballot
            WHERE e.speaker = u.id AND b.deleted_at = '' AND b.submitted_at != '') AS debate_count
        FROM users u WHERE u.role = 'student' AND EXISTS (
          SELECT 1 FROM speaker_evals e JOIN ballots b ON b.id = e.ballot
          WHERE e.speaker = u.id AND b.deleted_at = '' AND b.submitted_at != ''
        )
      `,
    }));
    const debates = app.findCollectionByNameOrId('debates');
    debates.indexes.push("CREATE INDEX idx_admin_debate_date ON debates (date DESC, id DESC) WHERE deleted_at = ''");
    app.save(debates);
    const ballots = app.findCollectionByNameOrId('ballots');
    ballots.indexes.push("CREATE INDEX idx_admin_submitted_ballots ON ballots (debate, submitted_at DESC, id DESC) WHERE deleted_at = '' AND submitted_at != ''");
    app.save(ballots);
    const users = app.findCollectionByNameOrId('users');
    users.indexes = [...(users.indexes || []), "CREATE INDEX idx_admin_ballot_student_name ON users (name, id) WHERE role = 'student'"];
    app.save(users);
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('admin_ballot_students'));
    app.delete(app.findCollectionByNameOrId('admin_ballot_debates'));
    for (const [name, index] of [['debates', 'idx_admin_debate_date'], ['ballots', 'idx_admin_submitted_ballots'], ['users', 'idx_admin_ballot_student_name']]) {
      const collection = app.findCollectionByNameOrId(name);
      collection.indexes = collection.indexes.filter((sql) => !sql.includes(index));
      app.save(collection);
    }
  },
);
