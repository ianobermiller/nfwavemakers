import { SCORE_CATEGORIES, type SpeakerScores } from '../types.ts';

export function scoringTotal(
  scores: Partial<Record<keyof SpeakerScores, number | null | undefined>>,
): number {
  return SCORE_CATEGORIES.reduce((sum, cat) => sum + (scores[cat.key] ?? 0), 0);
}

/** "Alice Smith" → "Smith" */
function lastNameOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] ?? fullName;
}

/** Sort people by last name, then full name. */
export function compareByLastName(
  a: { name?: string | undefined },
  b: { name?: string | undefined },
): number {
  const byLast = lastNameOf(a.name ?? '').localeCompare(lastNameOf(b.name ?? ''), undefined, {
    sensitivity: 'base',
  });
  if (byLast !== 0) return byLast;
  return (a.name ?? '').localeCompare(b.name ?? '', undefined, { sensitivity: 'base' });
}

/** "Alice Smith" → "Smith, A" */
export function formatSpeakerName(fullName: string): string {
  const lastName = lastNameOf(fullName);
  const initial = fullName.trim().split(/\s+/)[0]?.[0] ?? '';
  return initial ? `${lastName}, ${initial}` : lastName;
}

/** [{name: "Alice Smith"}, {name: "Bob Jones"}] → "Smith, A / Jones, B" */
export function formatTeam(speakers: { name?: string | null | undefined }[]): string {
  const names = speakers.map((s) => (s.name ? formatSpeakerName(s.name) : null)).filter(Boolean);
  return names.length > 0 ? names.join(' / ') : '—';
}
