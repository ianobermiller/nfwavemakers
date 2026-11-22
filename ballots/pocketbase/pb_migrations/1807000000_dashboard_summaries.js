migrate(
  (app) => {
    const member = '@request.auth.approved = true && @request.auth.verified = true';
    const mine = `${member} && speaker = @request.auth.id`;
    const group = "CASE WHEN d.id IS NULL OR d.deleted_at != '' THEN b.id ELSE d.id END";
    app.save(new Collection({
      name: 'student_feedback_summaries',
      type: 'view',
      listRule: mine,
      viewRule: mine,
      viewQuery: `
        SELECT (e.speaker || ':' || (${group})) AS id, e.speaker AS speaker,
          (CASE WHEN d.deleted_at = '' THEN d.id ELSE '' END) AS debate,
          MIN(b.id) AS ballot, MAX(b.submitted_at) AS submitted_at,
          (CASE WHEN d.deleted_at = '' THEN d.date ELSE '' END) AS date,
          (CASE WHEN d.deleted_at = '' THEN d.room ELSE '' END) AS room,
          json_group_array(DISTINCT j.name) AS judge_names
        FROM speaker_evals e JOIN ballots b ON b.id = e.ballot
          LEFT JOIN debates d ON d.id = b.debate LEFT JOIN users j ON j.id = b.judge
        WHERE b.deleted_at = '' AND b.submitted_at != ''
        GROUP BY e.speaker, ${group}
      `,
    }));
    const judge = `${member} && judge = @request.auth.id`;
    app.save(new Collection({
      name: 'judge_open_debates',
      type: 'view',
      listRule: judge,
      viewRule: judge,
      viewQuery: `
        SELECT (d.id || ':' || j.id) AS id, d.id AS debate, j.id AS judge, d.date
        FROM debates d JOIN json_each(d.judges) assignment
          JOIN users j ON j.id = assignment.value
        WHERE d.deleted_at = '' AND NOT EXISTS (
          SELECT 1 FROM ballots b WHERE b.debate = d.id AND b.judge = j.id
            AND b.deleted_at = '' AND b.submitted_at != ''
        )
      `,
    }));
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId('judge_open_debates'));
    app.delete(app.findCollectionByNameOrId('student_feedback_summaries'));
  },
);
