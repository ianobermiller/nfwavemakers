import { db } from '../db.ts';
import { avatarPath } from '../utils/imageUtils.ts';

/**
 * Batched lookup of avatar image URLs for a set of user IDs.
 * Returns a map from user ID → image URL (only present for users who uploaded one).
 */
export function useAvatarURLs(userIds: Array<string | null | undefined>): Record<string, string> {
  const ids = [...new Set(userIds.filter((id): id is string => !!id))];
  const paths = ids.map(avatarPath);

  const { data } = db.useQuery(
    paths.length > 0 ? { $files: { $: { where: { path: { $in: paths } } } } } : null,
  );

  const map: Record<string, string> = {};
  for (const file of data?.$files ?? []) {
    const path = file.path as string;
    const url = file.url as string | undefined;
    if (url) map[path.replace(/\/avatar\.webp$/, '')] = url;
  }
  return map;
}
