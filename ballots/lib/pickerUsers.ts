export function isPickerEligible(
  user: { id: string; archived: boolean; approved?: boolean; emailVerified?: boolean },
  selectedIds: Iterable<string>,
): boolean {
  const fullyAdmitted = user.approved !== false && user.emailVerified !== false;
  if (!user.archived && fullyAdmitted) return true;
  for (const id of selectedIds) {
    if (id === user.id) return true;
  }
  return false;
}
