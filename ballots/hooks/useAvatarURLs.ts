import { useUsers } from './data.ts';

/**
 * Batched lookup of avatar image URLs for a set of user IDs.
 * PocketBase expands often include avatarUrl; this hook fills URLs for bare IDs.
 */
export function useAvatarURLs(
  users: ({ id?: string; avatarUrl?: string | null } | string | null | undefined)[],
): Record<string, string> {
  const ids = [
    ...new Set(
      users
        .map((u) => {
          if (!u) return undefined;
          if (typeof u === 'string') return u;
          return u.id;
        })
        .filter((id): id is string => !!id),
    ),
  ];

  const listed = useUsers(true);
  const map: Record<string, string> = {};
  for (const user of listed ?? []) {
    if (user.avatarUrl && ids.includes(user.id)) {
      map[user.id] = user.avatarUrl;
    }
  }
  for (const u of users) {
    if (!u || typeof u === 'string') continue;
    const id = u.id;
    if (id && u.avatarUrl) {
      map[id] = u.avatarUrl;
    }
  }
  return map;
}
