import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'vite';

// Directory indexes live at /lessons/2026/1/index.html. Serve them at
// /lessons/2026/1 as well, instead of falling through to the site homepage.
export default defineConfig({
  appType: 'mpa',
  plugins: [
    {
      name: 'directory-index-without-slash',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const raw = req.url ?? '';
          const query = raw.indexOf('?');
          const pathname = query === -1 ? raw : raw.slice(0, query);
          const search = query === -1 ? '' : raw.slice(query);
          if (!pathname.endsWith('/') && !pathname.includes('.')) {
            const index = join(server.config.root, pathname.slice(1), 'index.html');
            if (existsSync(index)) req.url = `${pathname}/${search}`;
          }
          next();
        });
      },
    },
  ],
});
