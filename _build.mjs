import { cp, mkdir, copyFile, writeFile } from 'fs/promises';

await mkdir('_site', { recursive: true });

for (const f of ['index.html', 'style.css', 'main.js']) {
  await copyFile(f, `_site/${f}`);
}
await cp('images', '_site/images', { recursive: true });

await writeFile(
  '_site/_redirects',
  '/ballots/*  https://ballots.nfwavemakers.com/:splat  301\n/ballots  https://ballots.nfwavemakers.com/  301\n',
);

console.log('Build complete → _site/');
