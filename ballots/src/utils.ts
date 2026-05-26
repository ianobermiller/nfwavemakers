/** "Alice Smith" → "Smith, A" */
export function formatSpeakerName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  const lastName = parts[parts.length - 1] ?? fullName;
  const initial = parts[0]?.[0] ?? '';
  return initial ? `${lastName}, ${initial}` : lastName;
}

/** [{name: "Alice Smith"}, {name: "Bob Jones"}] → "Smith, A / Jones, B" */
export function formatTeam(speakers: Array<{ name?: string | null }>): string {
  const names = speakers.map((s) => (s.name ? formatSpeakerName(s.name) : null)).filter(Boolean);
  return names.length > 0 ? names.join(' / ') : '—';
}
