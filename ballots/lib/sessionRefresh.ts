/**
 * Whether a failed session refresh should delete the saved login.
 * A newer token (from a refresh that already succeeded) must survive, and
 * network or aborted requests are not proof the login is gone.
 */
export function shouldEndSession(error: unknown, tokenAtStart: string, tokenNow: string): boolean {
  if (!tokenAtStart || tokenNow !== tokenAtStart) return false;
  if (isAbort(error)) return false;
  return errorStatus(error) === 401;
}

/** Authorization bearer from a PocketBase send options object. */
export function requestAuthToken(headers: HeadersInit | undefined): string {
  if (!headers) return '';
  if (headers instanceof Headers) return headers.get('Authorization') ?? '';
  if (Array.isArray(headers)) {
    const match = headers.find(([name]) => name.toLowerCase() === 'authorization');
    return match?.[1] ?? '';
  }
  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() === 'authorization' && typeof value === 'string') return value;
  }
  return '';
}

function errorStatus(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('status' in error)) return undefined;
  const status = error.status;
  return typeof status === 'number' ? status : undefined;
}

function isAbort(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && 'isAbort' in error && error.isAbort === true
  );
}
