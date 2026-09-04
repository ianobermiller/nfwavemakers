import type { Id } from '../../convex/_generated/dataModel';

export function usePermissions(userId: Id<'users'>) {
  return {
    canViewBallot(
      judgeId: Id<'users'> | undefined,
      speakerIds: (Id<'users'> | undefined)[],
    ): boolean {
      return judgeId === userId || speakerIds.some((id) => id === userId);
    },
  };
}
