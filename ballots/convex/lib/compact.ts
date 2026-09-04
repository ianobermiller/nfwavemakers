type Compact<T> = {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K];
} & {
  [K in keyof T as undefined extends T[K]
    ? Exclude<T[K], undefined> extends never
      ? never
      : K
    : never]?: Exclude<T[K], undefined>;
};

export function compact<T extends object>(obj: T): Compact<T> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- strips undefined keys for Convex inserts
  return result as Compact<T>;
}
