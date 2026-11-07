import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import PocketBase from 'pocketbase';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const lessonsDir = join(root, 'ballots/content/lessons');

const url = process.env.POCKETBASE_TEST_URL ?? process.env.VITE_POCKETBASE_URL;
const superuserEmail = process.env.PB_SUPERUSER_EMAIL ?? process.env.POCKETBASE_ADMIN_EMAIL;
const superuserPassword = process.env.PB_SUPERUSER_PASSWORD ?? process.env.POCKETBASE_ADMIN_PASSWORD;

if (!url) throw new Error('Set POCKETBASE_TEST_URL or VITE_POCKETBASE_URL.');
if (!superuserEmail || !superuserPassword) {
  throw new Error('Set PB_SUPERUSER_EMAIL and PB_SUPERUSER_PASSWORD (or POCKETBASE_ADMIN_*).');
}
if (
  !url.includes('127.0.0.1') &&
  !url.includes('localhost') &&
  process.env.ALLOW_REMOTE_LESSON_SEED !== '1'
) {
  throw new Error('Refusing to seed a remote PocketBase without ALLOW_REMOTE_LESSON_SEED=1.');
}

function parseFrontmatter(raw) {
  if (!raw.startsWith('---\n')) throw new Error('Lesson markdown is missing frontmatter');
  const end = raw.indexOf('\n---\n', 4);
  if (end < 0) throw new Error('Lesson markdown frontmatter is not closed');
  const header = raw.slice(4, end);
  const body = raw.slice(end + 5).trim();
  const fields = Object.fromEntries(
    header
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const colon = line.indexOf(':');
        const key = line.slice(0, colon).trim();
        let value = line.slice(colon + 1).trim();
        if (value.startsWith('"') && value.endsWith('"')) value = JSON.parse(value);
        return [key, value];
      }),
  );
  return {
    year: Number(fields.year),
    number: Number(fields.number),
    title: String(fields.title),
    date: String(fields.date),
    body,
  };
}

const files = readdirSync(lessonsDir)
  .filter((name) => name.endsWith('.md'))
  .sort();
if (files.length === 0) throw new Error(`No lesson markdown in ${lessonsDir}`);

const lessons = files.map((name) => parseFrontmatter(readFileSync(join(lessonsDir, name), 'utf8')));

const pb = new PocketBase(url);
await pb.collection('_superusers').authWithPassword(superuserEmail, superuserPassword);

let created = 0;
let skipped = 0;

for (const lesson of lessons) {
  const filter = pb.filter('year = {:year} && number = {:number}', {
    year: lesson.year,
    number: lesson.number,
  });
  const existing = await pb
    .collection('lessons')
    .getFirstListItem(filter)
    .catch((error) => {
      if (error?.status === 404) return null;
      throw error;
    });

  if (existing) {
    skipped += 1;
    continue;
  }

  await pb.collection('lessons').create(lesson);
  created += 1;
}

console.log(
  JSON.stringify({
    created,
    skipped,
    total: lessons.length,
  }),
);
