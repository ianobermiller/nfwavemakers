import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

/**
 * Batched lookup of avatar image URLs for a set of user IDs.
 * Users from Convex queries already include avatarUrl; this hook is for mixing IDs.
 */
export function useAvatarURLs(
  users: Array<
    { _id?: string; id?: string; avatarUrl?: string | null } | string | null | undefined
  >,
): Record<string, string> {
  const ids = [
    ...new Set(
      users
        .map((u) => {
          if (!u) return undefined;
          if (typeof u === 'string') return u;
          return u._id ?? u.id;
        })
        .filter((id): id is string => !!id),
    ),
  ];

  const listed = useQuery(api.users.list, ids.length > 0 ? {} : 'skip');
  const map: Record<string, string> = {};
  for (const user of listed ?? []) {
    if (user.avatarUrl && ids.includes(user._id)) {
      map[user._id] = user.avatarUrl;
    }
  }
  for (const u of users) {
    if (!u || typeof u === 'string') continue;
    const id = u._id ?? u.id;
    if (id && u.avatarUrl) {
      map[id] = u.avatarUrl;
    }
  }
  return map;
}
