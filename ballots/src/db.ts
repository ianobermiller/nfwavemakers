import { init } from '@instantdb/react';
import { schema } from './schema.ts';

const APP_ID = import.meta.env['VITE_INSTANT_APP_ID'] as string;

export const db = init({ appId: APP_ID, schema });
export type { InstaQLEntity } from '@instantdb/react';
