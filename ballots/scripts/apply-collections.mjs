import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createContext, runInContext } from 'node:vm';
import PocketBase from 'pocketbase';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = join(root, 'pocketbase/pb_migrations');

// The migration is the single source of truth for the schema, but it is written
// for PocketBase's synchronous JS runtime. Run it against a recording stand-in
// that hands out placeholder ids, then create the collections over the API and
// swap those placeholders for the real ids.
const placeholder = (name) => `__ref_${name}`;

function withFieldApi(fields) {
  const list = Array.isArray(fields) ? fields : [];
  if (typeof list.add !== 'function') {
    Object.defineProperty(list, 'add', {
      enumerable: false,
      value(field) {
        list.push(field);
      },
    });
  }
  if (typeof list.removeByName !== 'function') {
    Object.defineProperty(list, 'removeByName', {
      enumerable: false,
      value(name) {
        const index = list.findIndex((field) => field.name === name);
        if (index >= 0) list.splice(index, 1);
      },
    });
  }
  if (typeof list.getByName !== 'function') {
    Object.defineProperty(list, 'getByName', {
      enumerable: false,
      value(name) {
        return list.find((field) => field.name === name) ?? null;
      },
    });
  }
  return list;
}

function collectDefinitions() {
  const definitions = [];
  const referenced = new Set();
  const saved = new Map();

  const settings = {
    meta: {},
    trustedProxy: { headers: [] },
    batch: {},
  };

  const app = {
    findCollectionByNameOrId(name) {
      const existing = saved.get(name);
      if (existing) return existing;
      referenced.add(name);
      return { id: placeholder(name), name, fields: withFieldApi([]) };
    },
    // Schema replay only — record backfills run against the live API below.
    findAllRecords() {
      return [];
    },
    settings() {
      return settings;
    },
    save(model) {
      // Instance settings migrations call save(settings); only collections
      // become API imports for the e2e / apply-collections path.
      if (!model || typeof model !== 'object' || !('name' in model) || !model.name) {
        return;
      }
      model.id = placeholder(model.name);
      model.fields = withFieldApi(model.fields);
      saved.set(model.name, model);
      const index = definitions.findIndex((item) => item.name === model.name);
      if (index >= 0) definitions[index] = model;
      else definitions.push(model);
    },
    delete(model) {
      forget(model?.name);
    },
    // Real PocketBase renames in save(). The replay also has to drop the old name
    // so apply-collections does not try to recreate ballots_* collections.
    forgetCollection(name) {
      forget(name);
    },
  };

  function forget(name) {
    if (!name) return;
    referenced.delete(name);
    saved.delete(name);
    const index = definitions.findIndex((item) => item.name === name);
    if (index >= 0) definitions.splice(index, 1);
  }

  const context = createContext({
    Collection: function Collection(definition) {
      return { ...definition };
    },
    RelationField: function RelationField(definition) {
      return { type: 'relation', maxSelect: 1, ...definition };
    },
    BoolField: function BoolField(definition) {
      return { type: 'bool', ...definition };
    },
    SelectField: function SelectField(definition) {
      return { type: 'select', maxSelect: 1, ...definition };
    },
    migrate: (up) => up(app),
    console,
  });

  for (const file of readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.js'))
    .sort()) {
    runInContext(readFileSync(join(migrationsDir, file), 'utf8'), context, { filename: file });
  }

  return { definitions, referenced };
}

function resolveReferences(definition, idsByName) {
  const fields = definition.fields?.map((field) => {
    if (typeof field.collectionId !== 'string' || !field.collectionId.startsWith('__ref_')) {
      return field;
    }
    const name = field.collectionId.slice('__ref_'.length);
    const id = idsByName.get(name);
    if (!id) throw new Error(`Cannot resolve collection reference "${name}"`);
    return { ...field, collectionId: id };
  });

  return {
    ...definition,
    id: idsByName.get(definition.name),
    ...(fields ? { fields } : {}),
  };
}

// Stable so re-running updates the same collections instead of colliding.
function generatedId(name) {
  let hash = 0;
  for (const character of name) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return `pbc_${String(hash).padStart(10, '0')}`;
}

function mergeFields(existingFields, desiredFields) {
  const byName = new Map(existingFields.map((field) => [field.name, field]));
  const merged = [...existingFields];
  const added = [];
  for (const desired of desiredFields) {
    if (byName.has(desired.name)) continue;
    merged.push(desired);
    added.push(desired.name);
  }
  return { fields: merged, added };
}

async function syncExistingCollection(pb, existing, desired) {
  const { fields, added } = mergeFields(existing.fields ?? [], desired.fields ?? []);
  const next = {
    ...existing,
    listRule: desired.listRule ?? existing.listRule,
    viewRule: desired.viewRule ?? existing.viewRule,
    createRule: desired.createRule ?? existing.createRule,
    updateRule: desired.updateRule ?? existing.updateRule,
    deleteRule: desired.deleteRule ?? existing.deleteRule,
    indexes: desired.indexes ?? existing.indexes,
    fields,
  };
  await pb.collections.update(existing.id, next);
  return added;
}

/** New bool columns default to false; mark every existing member as already admitted. */
async function backfillProfileApproval(pb) {
  const users = await pb.collection('users').getFullList({ fields: 'id' });
  for (const user of users) {
    await pb.collection('users').update(user.id, {
      approved: true,
      verified: true,
    });
  }
  return users.length;
}

/** Debates created before Lincoln-Douglas support are Team Policy. */
async function backfillDebateEvent(pb) {
  const debates = await pb.collection('debates').getFullList({ fields: 'id,event' });
  let updated = 0;
  for (const debate of debates) {
    if (debate.event === 'tp' || debate.event === 'ld') continue;
    await pb.collection('debates').update(debate.id, { event: 'tp' });
    updated += 1;
  }
  return updated;
}

/** Students created before categories existed are Team Policy. */
async function backfillStudentCategory(pb) {
  const profiles = await pb.collection('users').getFullList({ fields: 'id,role,category' });
  let updated = 0;
  for (const profile of profiles) {
    if (profile.role !== 'student') continue;
    if (profile.category === 'speech' || profile.category === 'tp' || profile.category === 'ld') {
      continue;
    }
    await pb.collection('users').update(profile.id, { category: 'tp' });
    updated += 1;
  }
  return updated;
}

export async function applyCollections({ url, email, password }) {
  const pb = new PocketBase(url);
  await pb.collection('_superusers').authWithPassword(email, password);

  const { definitions, referenced } = collectDefinitions();
  const idsByName = new Map();
  const created = [];
  const existingByName = new Map();

  for (const name of referenced) {
    const existing = await pb.collections.getOne(name);
    idsByName.set(name, existing.id);
  }

  for (const definition of definitions) {
    const existing = await pb.collections.getOne(definition.name).catch(() => null);
    idsByName.set(definition.name, existing?.id ?? generatedId(definition.name));
    if (existing) existingByName.set(definition.name, existing);
    else created.push(definition.name);
  }

  const resolved = definitions.map((definition) => resolveReferences(definition, idsByName));

  if (created.length > 0) {
    // Imported as a set: rules reference back-relations on collections that come
    // later in the migration, so they only validate once all of them exist.
    await pb.collections.import(resolved, false).catch((error) => {
      const details = JSON.stringify(error.response?.data ?? error.response ?? {});
      throw new Error(`Could not import collections: ${details}`);
    });
  }

  // Existing collections keep their field ids; merge missing fields and refresh rules.
  let approvalFieldsAdded = false;
  let debateEventAdded = false;
  let studentCategoryAdded = false;
  for (const desired of resolved) {
    const existing = existingByName.get(desired.name);
    if (!existing) continue;
    const added = await syncExistingCollection(pb, existing, desired).catch((error) => {
      const details = JSON.stringify(error.response?.data ?? error.response ?? {});
      throw new Error(`Could not update ${desired.name}: ${details}`);
    });
    if (desired.name === 'users' && (added.includes('approved') || added.includes('verified'))) {
      approvalFieldsAdded = true;
    }
    if (desired.name === 'users' && added.includes('category')) {
      studentCategoryAdded = true;
    }
    if (desired.name === 'debates' && added.includes('event')) {
      debateEventAdded = true;
    }
  }

  if (approvalFieldsAdded) {
    const count = await backfillProfileApproval(pb);
    console.log(`Marked ${count} existing ballots profile(s) approved and email-verified.`);
  }
  if (debateEventAdded) {
    const count = await backfillDebateEvent(pb);
    console.log(`Marked ${count} existing debate(s) as Team Policy.`);
  }
  if (studentCategoryAdded) {
    const count = await backfillStudentCategory(pb);
    console.log(`Marked ${count} existing student profile(s) as Team Policy.`);
  }

  return created;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.env.POCKETBASE_TEST_URL ?? process.env.VITE_POCKETBASE_URL;
  const email = process.env.PB_SUPERUSER_EMAIL ?? process.env.POCKETBASE_ADMIN_EMAIL;
  const password = process.env.PB_SUPERUSER_PASSWORD ?? process.env.POCKETBASE_ADMIN_PASSWORD;
  if (!url || !email || !password) {
    throw new Error('Set POCKETBASE_TEST_URL, PB_SUPERUSER_EMAIL and PB_SUPERUSER_PASSWORD.');
  }
  const created = await applyCollections({ url, email, password });
  console.log(
    created.length
      ? `Created: ${created.join(', ')}`
      : 'Collections already present; rules and fields synced.',
  );
}
