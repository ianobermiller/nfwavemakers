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

export async function applyCollections({ url, email, password }) {
  const pb = new PocketBase(url);
  await pb.collection('_superusers').authWithPassword(email, password);

  const { definitions, referenced } = collectDefinitions();
  const idsByName = new Map();
  const created = [];

  for (const name of referenced) {
    const existing = await pb.collections.getOne(name);
    idsByName.set(name, existing.id);
  }

  for (const definition of definitions) {
    const existing = await pb.collections.getOne(definition.name).catch(() => null);
    idsByName.set(definition.name, existing?.id ?? generatedId(definition.name));
    if (!existing) created.push(definition.name);
  }

  if (created.length === 0) return created;

  // Imported as a set: rules reference back-relations on collections that come
  // later in the migration, so they only validate once all of them exist.
  const resolved = definitions.map((definition) => resolveReferences(definition, idsByName));
  await pb.collections.import(resolved, false).catch((error) => {
    const details = JSON.stringify(error.response?.data ?? error.response ?? {});
    throw new Error(`Could not import collections: ${details}`);
  });

  return created;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.env.POCKETBASE_TEST_URL;
  const email = process.env.PB_SUPERUSER_EMAIL ?? process.env.POCKETBASE_ADMIN_EMAIL;
  const password = process.env.PB_SUPERUSER_PASSWORD ?? process.env.POCKETBASE_ADMIN_PASSWORD;
  if (!url || !email || !password) {
    throw new Error('Set POCKETBASE_TEST_URL, PB_SUPERUSER_EMAIL and PB_SUPERUSER_PASSWORD.');
  }
  const created = await applyCollections({ url, email, password });
  console.log(created.length ? `Created: ${created.join(', ')}` : 'Collections already present.');
}
