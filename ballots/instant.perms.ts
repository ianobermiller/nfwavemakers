// Docs: https://www.instantdb.com/docs/permissions

import type { InstantRules } from '@instantdb/react';

const rules = {
  // Trusted club app — any authenticated user can read all data.
  // Writes are open so judges can create ballots and students can update their own profile.
  $files: {
    bind: ['isOwner', "data.path.startsWith(auth.id + '/')"],
    allow: {
      view: 'auth.id != null',
      create: 'isOwner',
      update: 'isOwner',
      delete: 'isOwner',
    },
  },
  $users: {
    allow: {
      view: 'auth.id != null',
      create: 'false',
      update: 'auth.id == data.id',
      delete: 'false',
    },
  },
  debates: {
    allow: {
      view: 'auth.id != null && data.deletedAt == null',
      create: 'auth.id != null',
      update: 'auth.id != null',
      delete: 'auth.id != null',
    },
  },
  ballots: {
    allow: {
      view: 'auth.id != null && data.deletedAt == null',
      create: 'auth.id != null',
      update: 'auth.id != null',
      delete: 'auth.id != null',
    },
  },
  speakerEvals: {
    allow: {
      view: 'auth.id != null',
      create: 'auth.id != null',
      update: 'auth.id != null',
      delete: 'auth.id != null',
    },
  },
} satisfies InstantRules;

export default rules;
