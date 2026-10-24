export type SpeakerSlot = 'aff1' | 'aff2' | 'neg1' | 'neg2';

const TEAMMATE: Record<SpeakerSlot, SpeakerSlot> = {
  aff1: 'aff2',
  aff2: 'aff1',
  neg1: 'neg2',
  neg2: 'neg1',
};

export interface PartnerStudent {
  id: string;
  partnerId: string;
}

/** Active student partner for debate setup. Archived profiles and non-students are ignored. */
export function debatePartnerId(
  users: readonly {
    id: string;
    archived: boolean;
    partnerId?: string | undefined;
    role?: string | undefined;
  }[],
  studentId: string,
): string | undefined {
  const partnerId = users.find((user) => user.id === studentId)?.partnerId;
  if (!partnerId || partnerId === studentId) return undefined;
  const partner = users.find((user) => user.id === partnerId);
  if (!partner || partner.role !== 'student' || partner.archived) return undefined;
  return partnerId;
}

/** Profile writes that make `studentId`'s debate partner `partnerId`, keeping the link mutual. */
export function debatePartnerUpdates(
  students: readonly PartnerStudent[],
  studentId: string,
  partnerId: string,
): { id: string; partnerId: string }[] {
  if (partnerId === studentId) {
    throw new Error('A student cannot be their own debate partner');
  }

  const byId = new Map(students.map((student) => [student.id, student.partnerId]));
  if (!byId.has(studentId)) throw new Error('Student not found');
  if (partnerId && !byId.has(partnerId)) {
    throw new Error('Choose a student as the debate partner');
  }

  const current = byId.get(studentId) ?? '';
  const reverse = partnerId ? (byId.get(partnerId) ?? '') : '';
  if (current === partnerId && (!partnerId || reverse === studentId)) return [];

  const updates = new Map<string, string>();
  if (current && current !== partnerId) updates.set(current, '');
  if (reverse && reverse !== studentId) updates.set(reverse, '');
  updates.set(studentId, partnerId);
  if (partnerId) updates.set(partnerId, studentId);

  return [...updates].map(([id, nextPartnerId]) => ({ id, partnerId: nextPartnerId }));
}

/**
 * Put `studentId` in `slot`. When the other seat on that team is empty and the
 * student's partner is not already in the debate (or blocked, e.g. as a judge),
 * fill the partner into that seat. An occupied seat is left alone, so replacing
 * that partner with another student keeps the rest of the team.
 */
export function assignSpeaker<T extends Record<SpeakerSlot, string>>(
  form: T,
  slot: SpeakerSlot,
  studentId: string,
  partnerOf: (id: string) => string | undefined,
  blockedIds: Iterable<string> = [],
): T {
  const next = { ...form, [slot]: studentId };
  if (!studentId) return next;

  const partnerId = partnerOf(studentId);
  if (!partnerId || partnerId === studentId) return next;

  const other = TEAMMATE[slot];
  if (next[other]) return next;

  const taken = new Set(
    [next.aff1, next.aff2, next.neg1, next.neg2, ...blockedIds].filter(Boolean),
  );
  if (taken.has(partnerId)) return next;

  return { ...next, [other]: partnerId };
}
