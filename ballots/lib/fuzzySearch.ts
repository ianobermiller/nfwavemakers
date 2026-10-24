import { search } from 'fast-fuzzy';

/** fast-fuzzy's default cutoff. Scores are 0–1, higher is closer. */
const MATCH_THRESHOLD = 0.6;

interface Row<T> {
  fields: readonly string[];
  index: number;
  item: T;
}

/**
 * Rank items with fast-fuzzy (Damerau–Levenshtein, including single-character
 * typos). An empty query keeps the original order. Each query word must match
 * a name or email token; closer matches rank first.
 */
export function fuzzyRank<T>(
  items: readonly T[],
  query: string,
  fieldsOf: (item: T) => readonly string[],
): T[] {
  const words = query
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0);
  if (words.length === 0) return [...items];

  let rows: Row<T>[] = items.map((item, index) => ({
    fields: fieldsOf(item),
    index,
    item,
  }));
  const scoreByIndex = new Map<number, number>();

  for (const word of words) {
    const hits = search(word, rows, {
      keySelector: (row: Row<T>) => tokens(row.fields),
      returnMatchData: true,
      threshold: MATCH_THRESHOLD,
    });
    const matched = new Map(hits.map((hit) => [hit.item.index, hit.score]));
    rows = rows.filter((row) => matched.has(row.index));
    for (const row of rows) {
      scoreByIndex.set(
        row.index,
        (scoreByIndex.get(row.index) ?? 0) + (matched.get(row.index) ?? 0),
      );
    }
  }

  return rows
    .sort(
      (a, b) =>
        (scoreByIndex.get(b.index) ?? 0) - (scoreByIndex.get(a.index) ?? 0) || a.index - b.index,
    )
    .map((row) => row.item);
}

function tokens(fields: readonly string[]): string[] {
  return fields.flatMap((field) =>
    field.split(/[^A-Za-z0-9]+/).filter((token) => token.length > 0),
  );
}
