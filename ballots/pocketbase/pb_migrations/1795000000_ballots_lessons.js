migrate(
  (app) => {
    const authenticated = '@request.auth.id != ""';
    const admin = '@request.auth.ballots_profiles_via_user.role ?= "admin"';

    const lessons = new Collection({
      name: 'ballots_lessons',
      type: 'base',
      listRule: authenticated,
      viewRule: authenticated,
      createRule: admin,
      updateRule: admin,
      deleteRule: admin,
      fields: [
        {
          name: 'year',
          type: 'number',
          required: true,
          min: 2000,
          max: 2100,
        },
        {
          name: 'number',
          type: 'number',
          required: true,
          min: 1,
          max: 52,
        },
        { name: 'title', type: 'text', required: true, max: 200 },
        {
          name: 'date',
          type: 'text',
          required: true,
          pattern: '^\\d{4}-\\d{2}-\\d{2}$',
        },
        // Markdown body — rendered client-side for signed-in members only.
        { name: 'body', type: 'text', required: true, max: 200000 },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_ballots_lessons_year_number ON ballots_lessons (year, number)',
        'CREATE INDEX idx_ballots_lessons_date ON ballots_lessons (date)',
      ],
    });
    app.save(lessons);
  },
  (app) => {
    const lessons = app.findCollectionByNameOrId('ballots_lessons');
    app.delete(lessons);
  },
);
