export function isPickerEligible(
  user: { _id: string; archived: boolean },
  selectedIds: Iterable<string>,
): boolean {
  if (!user.archived) return true;
  for (const id of selectedIds) {
    if (id === user._id) return true;
  }
  return false;
}
