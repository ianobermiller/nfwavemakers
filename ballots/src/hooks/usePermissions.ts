export function usePermissions(userId: string) {
  return {
    canViewBallot(judgeId: string | undefined, speakerIds: (string | undefined)[]): boolean {
      return judgeId === userId || speakerIds.some((id) => id === userId);
    },
  };
}
