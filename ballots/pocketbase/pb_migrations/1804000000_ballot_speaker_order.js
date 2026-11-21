migrate(
  (app) => {
    const ballots = app.findCollectionByNameOrId('ballots');
    ballots.fields.add(
      new SelectField({
        name: 'speaker_order_confirmed',
        maxSelect: 2,
        values: ['aff', 'neg'],
      }),
    );
    app.save(ballots);
  },
  (app) => {
    const ballots = app.findCollectionByNameOrId('ballots');
    ballots.fields.removeByName('speaker_order_confirmed');
    app.save(ballots);
  },
);
