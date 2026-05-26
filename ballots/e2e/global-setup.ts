import { PlatformApi } from '@instantdb/platform';
import { schema } from '../src/schema.ts';

export default async function globalSetup(): Promise<void> {
  const api = new PlatformApi({});
  const { app } = await api.createTemporaryApp({ title: 'nfwm-e2e-test', schema });
  process.env['VITE_INSTANT_APP_ID'] = app.id;
  process.env['INSTANT_ADMIN_TOKEN'] = app.adminToken;
  console.log(`[e2e] Using temporary InstantDB app: ${app.id}`);
}
