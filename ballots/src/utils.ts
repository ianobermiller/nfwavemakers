import { SCORE_CATEGORIES, type SpeakerScores } from './types.ts';

export function scoringTotal(
  scores: Partial<Record<keyof SpeakerScores, number | null | undefined>>,
): number {
  return SCORE_CATEGORIES.reduce((sum, cat) => sum + (scores[cat.key] ?? 0), 0);
}

/** "Alice Smith" → "Smith, A" */
export function formatSpeakerName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const lastName = parts[parts.length - 1] ?? fullName;
  const initial = parts[0]?.[0] ?? '';
  return initial ? `${lastName}, ${initial}` : lastName;
}

/** [{name: "Alice Smith"}, {name: "Bob Jones"}] → "Smith, A / Jones, B" */
export function formatTeam(speakers: { name?: string | null }[]): string {
  const names = speakers.map((s) => (s.name ? formatSpeakerName(s.name) : null)).filter(Boolean);
  return names.length > 0 ? names.join(' / ') : '—';
}
