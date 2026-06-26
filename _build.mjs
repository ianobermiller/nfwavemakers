import { cp, mkdir, copyFile, writeFile } from 'fs/promises';

await mkdir('_site/ballots', { recursive: true });

// Copy root static site files
for (const f of ['index.html', 'style.css', 'main.js']) {
  await copyFile(f, `_site/${f}`);
}
await cp('images', '_site/images', { recursive: true });

// Copy built ballots app (Vite output with base: '/ballots/')
await cp('ballots/dist', '_site/ballots', { recursive: true });

// Root-level _redirects: SPA fallback for /ballots/* routes
// (Cloudflare Pages only reads _redirects from the output root)
// Static assets must be explicitly passed through before the SPA fallback,
// because Cloudflare Pages 200 rewrites override static file serving.
await writeFile(
  '_site/_redirects',
  '/ballots/assets/*  /ballots/assets/:splat  200\n/ballots/*  /ballots/index.html  200\n',
);

// Prevent index.html from being cached — stale HTML referencing old hashed
// asset filenames causes MIME type errors after a new deploy.
await writeFile(
  '_site/_headers',
  '/ballots/index.html\n  Cache-Control: no-cache, no-store, must-revalidate\n',
);

console.log('Build complete → _site/');
