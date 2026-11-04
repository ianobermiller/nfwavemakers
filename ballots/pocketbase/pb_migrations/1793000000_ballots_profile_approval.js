migrate(
  (app) => {
    const profiles = app.findCollectionByNameOrId("ballots_profiles");
    const debates = app.findCollectionByNameOrId("ballots_debates");
    const ballots = app.findCollectionByNameOrId("ballots_ballots");
    const speakerEvals = app.findCollectionByNameOrId("ballots_speaker_evals");

    const authenticated = '@request.auth.id != ""';
    const admin = '@request.auth.ballots_profiles_via_user.role ?= "admin"';
    const member =
      '@request.auth.ballots_profiles_via_user.approved = true && @request.auth.ballots_profiles_via_user.email_verified = true';

    profiles.fields.add(
      new BoolField({
        name: "approved",
        required: false,
      }),
    );
    profiles.fields.add(
      new BoolField({
        name: "email_verified",
        required: false,
      }),
    );

    // Self-signup may only attach a bare profile. Admins may set approval and
    // email_verified. Members may sync email_verified once PocketBase has
    // verified their auth email; they cannot grant themselves Approval.
    profiles.createRule = `${admin} || (user = @request.auth.id && @request.body.role:isset = false && @request.body.archived:isset = false && @request.body.partner:isset = false && @request.body.approved:isset = false && @request.body.email_verified:isset = false)`;
    profiles.updateRule = `${admin} || (user = @request.auth.id && @request.body.user:changed = false && @request.body.archived:changed = false && @request.body.partner:changed = false && @request.body.approved:changed = false && (@request.body.email_verified:changed = false || (@request.body.email_verified = true && @request.auth.verified = true)) && (@request.body.role:changed = false || @request.body.role = "student" || @request.body.role = "parent"))`;
    profiles.listRule = `${admin} || (${authenticated} && (${member} || user = @request.auth.id))`;
    profiles.viewRule = `${admin} || (${authenticated} && (${member} || user = @request.auth.id))`;

    debates.listRule = `${admin} || (${authenticated} && ${member})`;
    debates.viewRule = `${admin} || (${authenticated} && ${member})`;

    ballots.listRule = `${admin} || (${member} && (judge.user = @request.auth.id || ballots_speaker_evals_via_ballot.speaker.user ?= @request.auth.id))`;
    ballots.viewRule = `${admin} || (${member} && (judge.user = @request.auth.id || ballots_speaker_evals_via_ballot.speaker.user ?= @request.auth.id))`;
    ballots.createRule = `${member} && judge.user = @request.auth.id && @request.body.deleted_at:isset = false`;
    ballots.updateRule = `${admin} || (${member} && judge.user = @request.auth.id && @request.body.judge:changed = false && @request.body.deleted_at:changed = false)`;

    speakerEvals.listRule = `${admin} || (${member} && (ballot.judge.user = @request.auth.id || speaker.user = @request.auth.id))`;
    speakerEvals.viewRule = `${admin} || (${member} && (ballot.judge.user = @request.auth.id || speaker.user = @request.auth.id))`;
    speakerEvals.createRule = `${admin} || (${member} && ballot.judge.user = @request.auth.id)`;
    speakerEvals.updateRule = `${admin} || (${member} && ballot.judge.user = @request.auth.id && @request.body.ballot:changed = false)`;
    speakerEvals.deleteRule = `${admin} || (${member} && ballot.judge.user = @request.auth.id)`;

    app.save(profiles);
    app.save(debates);
    app.save(ballots);
    app.save(speakerEvals);

    // Existing club members stay admitted. New self-signups get false defaults.
    const existing = app.findAllRecords(profiles);
    for (const record of existing) {
      record.set("approved", true);
      record.set("email_verified", true);
      app.save(record);
    }
  },
  (app) => {
    const profiles = app.findCollectionByNameOrId("ballots_profiles");
    const debates = app.findCollectionByNameOrId("ballots_debates");
    const ballots = app.findCollectionByNameOrId("ballots_ballots");
    const speakerEvals = app.findCollectionByNameOrId("ballots_speaker_evals");

    const authenticated = '@request.auth.id != ""';
    const admin = '@request.auth.ballots_profiles_via_user.role ?= "admin"';

    profiles.fields.removeByName("approved");
    profiles.fields.removeByName("email_verified");
    profiles.createRule = `${admin} || (user = @request.auth.id && @request.body.role:isset = false && @request.body.archived:isset = false && @request.body.partner:isset = false)`;
    profiles.updateRule = `${admin} || (user = @request.auth.id && @request.body.user:changed = false && @request.body.archived:changed = false && @request.body.partner:changed = false && (@request.body.role:changed = false || @request.body.role = "student" || @request.body.role = "parent"))`;
    profiles.listRule = authenticated;
    profiles.viewRule = authenticated;

    debates.listRule = authenticated;
    debates.viewRule = authenticated;

    ballots.listRule = `${admin} || judge.user = @request.auth.id || ballots_speaker_evals_via_ballot.speaker.user ?= @request.auth.id`;
    ballots.viewRule = `${admin} || judge.user = @request.auth.id || ballots_speaker_evals_via_ballot.speaker.user ?= @request.auth.id`;
    ballots.createRule =
      '@request.auth.id != "" && judge.user = @request.auth.id && @request.body.deleted_at:isset = false';
    ballots.updateRule = `${admin} || (judge.user = @request.auth.id && @request.body.judge:changed = false && @request.body.deleted_at:changed = false)`;

    speakerEvals.listRule = `${admin} || ballot.judge.user = @request.auth.id || speaker.user = @request.auth.id`;
    speakerEvals.viewRule = `${admin} || ballot.judge.user = @request.auth.id || speaker.user = @request.auth.id`;
    speakerEvals.createRule = `${admin} || ballot.judge.user = @request.auth.id`;
    speakerEvals.updateRule = `${admin} || (ballot.judge.user = @request.auth.id && @request.body.ballot:changed = false)`;
    speakerEvals.deleteRule = `${admin} || ballot.judge.user = @request.auth.id`;

    app.save(profiles);
    app.save(debates);
    app.save(ballots);
    app.save(speakerEvals);
  },
);
