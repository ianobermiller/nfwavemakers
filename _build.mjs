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
await writeFile('_site/_redirects', '/ballots/*  /ballots/  200\n');

console.log('Build complete → _site/');
