// Lesson notes stay behind the same membership gate as ballots: verified email
// and club Approval. Signed-in pending accounts can no longer list or read them.
migrate(
  (app) => {
    const lessons = app.findCollectionByNameOrId("lessons");
    const admin = '@request.auth.role ?= "admin"';
    const member = "@request.auth.approved = true && @request.auth.verified = true";
    const rule = `${admin} || ${member}`;
    lessons.listRule = rule;
    lessons.viewRule = rule;
    app.save(lessons);
  },
  (app) => {
    const lessons = app.findCollectionByNameOrId("lessons");
    lessons.listRule = '@request.auth.id != ""';
    lessons.viewRule = '@request.auth.id != ""';
    app.save(lessons);
  },
);
