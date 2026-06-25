export function usePermissions(userId: string) {
  return {
    canViewBallot(judgeId: string | undefined, speakerIds: Array<string | undefined>): boolean {
      return judgeId === userId || speakerIds.some((id) => id === userId);
    },
  };
}
