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

export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ClientResponseError) {
    return error.response['message'] || error.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

export function createRecordId(): string {
  return crypto.randomUUID().replaceAll('-', '').slice(0, 15);
}
