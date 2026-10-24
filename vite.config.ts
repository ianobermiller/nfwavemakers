import { cpSync, createReadStream, existsSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { Connect, Plugin } from 'vite';
import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));
const imagesDir = resolve(root, 'images');

const imageTypes: Record<string, string> = {
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

const worker = `export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (
      url.hostname === "www.nfwavemakers.com" ||
      url.hostname === "ballots.nfwavemakers.com"
    ) {
      url.hostname = "nfwavemakers.com";
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
`;

function serveImages(): Connect.NextHandleFunction {
  return (req, res, next) => {
    const rel = decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/').replace(/^\/+/, '');
    const file = resolve(imagesDir, rel);
    if (!file.startsWith(imagesDir + sep) || !existsSync(file) || !statSync(file).isFile()) {
      next();
      return;
    }
    res.setHeader('Content-Type', imageTypes[extname(file)] ?? 'application/octet-stream');
    createReadStream(file).pipe(res);
  };
}

function clubSite(): Plugin {
  let outDir = resolve(root, '_site');
  return {
    name: 'club-site',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    configureServer(server) {
      server.middlewares.use('/images', serveImages());
    },
    configurePreviewServer(server) {
      server.middlewares.use('/images', serveImages());
    },
    closeBundle() {
      cpSync(imagesDir, join(outDir, 'images'), { recursive: true });
      writeFileSync(join(outDir, '_worker.js'), worker);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), clubSite()],
  resolve: {
    alias: [{ find: /^@\//, replacement: `${resolve(root, 'src')}/` }],
  },
  envDir: '.',
  build: {
    outDir: '_site',
  },
});
