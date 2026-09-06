export function isPickerEligible(
  user: { id: string; archived: boolean },
  selectedIds: Iterable<string>,
): boolean {
  if (!user.archived) return true;
  for (const id of selectedIds) {
    if (id === user.id) return true;
  }
  return false;
}
