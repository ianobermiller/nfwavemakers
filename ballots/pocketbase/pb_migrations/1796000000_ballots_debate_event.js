migrate(
  (app) => {
    const debates = app.findCollectionByNameOrId("ballots_debates");

    debates.fields.add(
      new SelectField({
        name: "event",
        required: true,
        maxSelect: 1,
        values: ["tp", "ld"],
      }),
    );
    app.save(debates);

    // Existing club rounds were Team Policy before Lincoln-Douglas was added.
    const existing = app.findAllRecords(debates);
    for (const record of existing) {
      if (record.get("event")) continue;
      record.set("event", "tp");
      app.save(record);
    }
  },
  (app) => {
    const debates = app.findCollectionByNameOrId("ballots_debates");
    debates.fields.removeByName("event");
    app.save(debates);
  },
);
