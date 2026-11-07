import PocketBase, { ClientResponseError, type SendOptions } from 'pocketbase';
import { requestAuthToken, shouldEndSession } from '../lib/sessionRefresh.ts';

const url = import.meta.env['VITE_POCKETBASE_URL'] || 'https://pb.nfwavemakers.com';

export const pb = new PocketBase(url);
pb.autoCancellation(false);

// A rejected token on any request should end the session the same way refresh does.
function endSessionOnUnauthorized(
  response: Response,
  data: unknown,
  options?: SendOptions,
): unknown {
  if (response.status === 401) {
    const sent = requestAuthToken(options?.headers);
    if (shouldEndSession({ status: 401 }, sent, pb.authStore.token)) {
      pb.authStore.clear();
    }
  }
  return data;
}
pb.afterSend = endSessionOnUnauthorized;

export const collections = {
  users: 'users',
  debates: 'debates',
  ballots: 'ballots',
  speakerEvals: 'speaker_evals',
  lessons: 'lessons',
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
