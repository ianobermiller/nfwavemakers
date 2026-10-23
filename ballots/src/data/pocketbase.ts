import PocketBase, { ClientResponseError } from 'pocketbase';

const url = import.meta.env['VITE_POCKETBASE_URL'] || 'https://pb.obermillers.com';

export const pb = new PocketBase(url);
pb.autoCancellation(false);

export const collections = {
  authUsers: 'users',
  profiles: 'ballots_profiles',
  debates: 'ballots_debates',
  ballots: 'ballots_ballots',
  speakerEvals: 'ballots_speaker_evals',
} as const;

function fieldErrorMessage(value: unknown): string | undefined {
  if (!value || typeof value !== 'object' || !('message' in value)) return undefined;
  const message = Reflect.get(value, 'message');
  return typeof message === 'string' && message ? message : undefined;
}

export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ClientResponseError) {
    const data = error.response['data'];
    if (data && typeof data === 'object') {
      for (const value of Object.values(data)) {
        const fieldMessage = fieldErrorMessage(value);
        if (fieldMessage) return fieldMessage;
      }
    }
    return error.response['message'] || error.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

export function createRecordId(): string {
  return crypto.randomUUID().replaceAll('-', '').slice(0, 15);
}
