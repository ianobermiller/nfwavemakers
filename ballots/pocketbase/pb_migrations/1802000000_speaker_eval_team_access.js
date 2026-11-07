// A nested multi-relation only matches with `.id ?=`. Without `.id`, a debater
// can read their own speaker row and not a teammate's on the same submitted ballot.
migrate(
  (app) => {
    const evals = app.findCollectionByNameOrId("speaker_evals");
    const admin = '@request.auth.role ?= "admin"';
    const member = "@request.auth.approved = true && @request.auth.verified = true";
    const team =
      "ballot.debate.aff_team.id ?= @request.auth.id || ballot.debate.neg_team.id ?= @request.auth.id";
    const rule = `${admin} || (${member} && (ballot.judge = @request.auth.id || speaker = @request.auth.id || (ballot.submitted_at != "" && (${team}))))`;
    evals.listRule = rule;
    evals.viewRule = rule;
    app.save(evals);
  },
  () => {
    throw new Error("Speaker eval team access is not reversible");
  },
);
