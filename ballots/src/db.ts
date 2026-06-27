import { init } from '@instantdb/react';
import schema from '../instant.schema.ts';

const APP_ID =
  (typeof window !== 'undefined'
    ? ((window as unknown as Record<string, unknown>)['__INSTANT_APP_ID__'] as string | undefined)
    : undefined) ??
  (import.meta.env['VITE_INSTANT_APP_ID'] as string | undefined) ??
  'ce44861c-b584-47fc-ae12-63c526a44beb';

export const db = init({ appId: APP_ID, schema });

if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>)['__db'] = db;
}
