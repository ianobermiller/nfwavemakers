import { passkeyClient } from '@better-auth/passkey/client';
import { convexClient, crossDomainClient } from '@convex-dev/better-auth/client/plugins';
import type { AuthClient } from '@convex-dev/better-auth/react';
import { createAuthClient } from 'better-auth/react';
import { emailOTPClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_CONVEX_SITE_URL,
  plugins: [convexClient(), crossDomainClient(), passkeyClient(), emailOTPClient()],
});

// Better Auth's plugin inference is more specific than the provider's public client type.
export const convexAuthClient = authClient as unknown as AuthClient;
