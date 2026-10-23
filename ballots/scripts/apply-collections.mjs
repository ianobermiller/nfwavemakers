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

function collectDefinitions() {
  const definitions = [];
  const referenced = new Set();

  const app = {
    findCollectionByNameOrId(name) {
      referenced.add(name);
      return { id: placeholder(name), name };
    },
    save(collection) {
      collection.id = placeholder(collection.name);
      definitions.push(collection);
    },
    delete() {},
  };

  const context = createContext({
    Collection: function Collection(definition) {
      return { ...definition };
    },
    migrate: (up) => up(app),
    console,
  });

  for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith('.js')).sort()) {
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
  for (const desired of desiredFields) {
    if (byName.has(desired.name)) continue;
    merged.push(desired);
  }
  return merged;
}

async function syncExistingCollection(pb, existing, desired) {
  const next = {
    ...existing,
    listRule: desired.listRule ?? existing.listRule,
    viewRule: desired.viewRule ?? existing.viewRule,
    createRule: desired.createRule ?? existing.createRule,
    updateRule: desired.updateRule ?? existing.updateRule,
    deleteRule: desired.deleteRule ?? existing.deleteRule,
    indexes: desired.indexes ?? existing.indexes,
    fields: mergeFields(existing.fields ?? [], desired.fields ?? []),
  };
  await pb.collections.update(existing.id, next);
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
  for (const desired of resolved) {
    const existing = existingByName.get(desired.name);
    if (!existing) continue;
    await syncExistingCollection(pb, existing, desired).catch((error) => {
      const details = JSON.stringify(error.response?.data ?? error.response ?? {});
      throw new Error(`Could not update ${desired.name}: ${details}`);
    });
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
  console.log(created.length ? `Created: ${created.join(', ')}` : 'Collections already present; rules and fields synced.');
}
