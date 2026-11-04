migrate(
  (app) => {
    const speakerEvals = app.findCollectionByNameOrId("ballots_speaker_evals");

    const admin = '@request.auth.ballots_profiles_via_user.role ?= "admin"';
    const member =
      '@request.auth.ballots_profiles_via_user.approved = true && @request.auth.ballots_profiles_via_user.email_verified = true';
    // Debaters on a submitted ballot need every seat's name, scores, and notes.
    // Draft evaluations stay limited to the writing judge (and that one speaker).
    const onSubmittedDebate =
      'ballot.submitted_at != "" && (ballot.debate.aff_team.user ?= @request.auth.id || ballot.debate.neg_team.user ?= @request.auth.id)';

    speakerEvals.listRule = `${admin} || (${member} && (ballot.judge.user = @request.auth.id || speaker.user = @request.auth.id || (${onSubmittedDebate})))`;
    speakerEvals.viewRule = `${admin} || (${member} && (ballot.judge.user = @request.auth.id || speaker.user = @request.auth.id || (${onSubmittedDebate})))`;

    app.save(speakerEvals);
  },
  (app) => {
    const speakerEvals = app.findCollectionByNameOrId("ballots_speaker_evals");

    const admin = '@request.auth.ballots_profiles_via_user.role ?= "admin"';
    const member =
      '@request.auth.ballots_profiles_via_user.approved = true && @request.auth.ballots_profiles_via_user.email_verified = true';

    speakerEvals.listRule = `${admin} || (${member} && (ballot.judge.user = @request.auth.id || speaker.user = @request.auth.id))`;
    speakerEvals.viewRule = `${admin} || (${member} && (ballot.judge.user = @request.auth.id || speaker.user = @request.auth.id))`;

    app.save(speakerEvals);
  },
);
