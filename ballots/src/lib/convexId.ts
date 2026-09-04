import type { Id, TableNames } from '../../convex/_generated/dataModel';

/** Route params are Convex IDs issued by this app; invalid IDs fail at query time. */
export function convexId<T extends TableNames>(value: string): Id<T> {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- opaque Convex ID from our routes
  return value as Id<T>;
}

/** Storage IDs from Convex upload responses. */
export function convexStorageId(value: string): Id<'_storage'> {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- opaque Convex storage ID
  return value as Id<'_storage'>;
}
