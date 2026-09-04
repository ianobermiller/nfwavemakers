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

// Pages _redirects cannot match on hostname, so www → apex lives in a Worker.
await writeFile(
  '_site/_worker.js',
  `export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === "www.nfwavemakers.com") {
      url.hostname = "nfwavemakers.com";
      return Response.redirect(url.toString(), 301);
    }
    if (url.pathname === "/ballots" || url.pathname.startsWith("/ballots/")) {
      const dest = new URL("https://ballots.nfwavemakers.com");
      dest.pathname = url.pathname === "/ballots" ? "/" : url.pathname.slice("/ballots".length);
      dest.search = url.search;
      return Response.redirect(dest.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
`,
);

console.log('Build complete → _site/');
