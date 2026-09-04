import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react';
import { convexAuthClient } from './authClient.ts';
import { convex } from './db.ts';
import './ballots.css';
import { App } from './App.tsx';

if (import.meta.env.DEV) {
  Object.assign(window, { __authClient: convexAuthClient });
}

const root = document.getElementById('root');
if (!root) throw new Error('No root element');
createRoot(root).render(
  <StrictMode>
    <ConvexBetterAuthProvider authClient={convexAuthClient} client={convex}>
      <App />
    </ConvexBetterAuthProvider>
  </StrictMode>,
);
