#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const appId = process.env.VITE_INSTANT_APP_ID;
const adminToken = process.env.INSTANT_APP_ADMIN_TOKEN ?? process.env.INSTANT_ADMIN_TOKEN;

if (!appId) {
  console.error('Missing VITE_INSTANT_APP_ID in .env');
  process.exit(1);
}

if (!adminToken) {
  console.error('Missing INSTANT_APP_ADMIN_TOKEN (or INSTANT_ADMIN_TOKEN) in .env.local');
  process.exit(1);
}

const response = await fetch('https://api.instantdb.com/admin/query', {
  body: JSON.stringify({
    query: {
      $users: {},
      debates: { affTeam: {}, negTeam: {}, judges: {} },
      ballots: { debate: {}, judge: {}, speakerEvals: { speaker: {} } },
    },
  }),
  headers: {
    'App-Id': appId,
    Authorization: `Bearer ${adminToken}`,
    'Content-Type': 'application/json',
  },
  method: 'POST',
});

const data = await response.json();
if (!response.ok) {
  console.error('Instant export failed:', data);
  process.exit(1);
}

function ids(links) {
  if (!links) return [];
  const list = Array.isArray(links) ? links : [links];
  return list.map((item) => item.id).filter(Boolean);
}

function oneId(link) {
  if (!link) return undefined;
  if (Array.isArray(link)) return link[0]?.id;
  return link.id;
}

const POSITIONS = new Set(['aff1', 'aff2', 'neg1', 'neg2']);

const args = {
  users: (data.$users ?? []).map((user) => ({
    email: user.email,
    instantId: user.id,
    name: user.name,
    role: user.role === 'admin' || user.role === 'student' || user.role === 'parent' ? user.role : undefined,
  })),
  debates: (data.debates ?? []).map((debate) => ({
    affInstantIds: ids(debate.affTeam),
    date: debate.date,
    deletedAt: debate.deletedAt,
    instantId: debate.id,
    judgeInstantIds: ids(debate.judges),
    negInstantIds: ids(debate.negTeam),
    resolution: debate.resolution,
    room: debate.room,
  })),
  ballots: (data.ballots ?? []).map((ballot) => ({
    debateInstantId: oneId(ballot.debate),
    deletedAt: ballot.deletedAt,
    evals: (ballot.speakerEvals ?? [])
      .filter((ev) => POSITIONS.has(ev.position))
      .map((ev) => ({
        conduct: ev.conduct ?? undefined,
        crossExamination: ev.crossExamination ?? undefined,
        delivery: ev.delivery ?? undefined,
        evidenceAndSupport: ev.evidenceAndSupport ?? undefined,
        instantId: ev.id,
        notes: ev.notes ?? undefined,
        organization: ev.organization ?? undefined,
        position: ev.position,
        rank: ev.rank ?? undefined,
        refutation: ev.refutation ?? undefined,
        speakerInstantId: oneId(ev.speaker),
      })),
    instantId: ballot.id,
    judgeInstantId: oneId(ballot.judge),
    reasonForDecision: ballot.reasonForDecision,
    submittedAt: ballot.submittedAt,
    winner: ballot.winner === 'aff' || ballot.winner === 'neg' ? ballot.winner : undefined,
  })),
};

console.log(
  `Exported ${args.users.length} users, ${args.debates.length} debates, ${args.ballots.length} ballots`,
);

const result = spawnSync(
  'npx',
  ['convex', 'run', ...process.argv.slice(2), 'importInstant:importDump', JSON.stringify(args)],
  { stdio: 'inherit' },
);

process.exit(result.status ?? 1);
