/**
 * @license
 * Copyright The Lit Project
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Prepares the main site build for deployment as Cloudflare Workers static
 * assets (see packages/lit-dev-content/wrangler.jsonc). The Playground
 * sandbox is a separate Worker in packages/lit-dev-playground.
 *
 * On Cloud Run, lit.dev is served by the Koa server in ./src/server.ts. On
 * Cloudflare there is no server, so this script translates what the server
 * does into Cloudflare static asset conventions:
 *
 * Main site (packages/lit-dev-content/_site):
 *   - Page redirects (./src/redirects.ts)  -> _redirects
 *   - /tutorials/* rewrite                 -> _redirects (200 rewrite)
 *   - 404 page                             -> 404.html
 *   - Pre-compressed .br/.gz files are removed (Cloudflare compresses on the
 *     fly, and they would otherwise count against the asset file limit).
 *
 * Usage: run as part of `npm run build:cloudflare -w lit-dev-content`.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {fileURLToPath} from 'url';
import {pageRedirects} from './lib/redirects.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const siteDir = path.join(repoRoot, 'packages', 'lit-dev-content', '_site');

const walk = async function* (dir) {
  for (const entry of await fs.readdir(dir, {withFileTypes: true})) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(p);
    } else {
      yield p;
    }
  }
};

const prepareMainSite = async () => {
  // Remove pre-compressed files and server-only files.
  let removed = 0;
  for await (const file of walk(siteDir)) {
    if (file.endsWith('.br') || file.endsWith('.gz')) {
      await fs.rm(file);
      removed++;
    }
  }
  await fs.rm(path.join(siteDir, 'csp-inline-script-hashes.txt'), {
    force: true,
  });
  console.log(`Removed ${removed} pre-compressed files`);

  // Served for unmatched paths (not_found_handling: "404-page" in wrangler.jsonc).
  await fs.copyFile(
    path.join(siteDir, '404', 'index.html'),
    path.join(siteDir, '404.html')
  );

  // Redirects. The server canonicalizes paths to have a trailing slash before
  // consulting pageRedirects, so also emit the variant without the slash.
  // Cloudflare rejects duplicate paths, and some pageRedirects entries already
  // list both variants (e.g. /docs/releases/release-notes/1.3.0), so the
  // first rule for a path wins.
  const lines = [];
  const seen = new Set();
  const addRedirect = (from, to) => {
    if (!seen.has(from)) {
      seen.add(from);
      lines.push(`${from} ${to} 301`);
    }
  };
  for (const [from, to] of pageRedirects) {
    addRedirect(from, to);
    if (from.endsWith('/') && from !== '/') {
      addRedirect(from.slice(0, -1), to);
    }
  }
  // Serve the tutorial viewer for /tutorials/<name>/ (see
  // ./src/middleware/tutorials-middleware.ts). /tutorials/content/* is deeper
  // than one path segment, so it is not matched.
  lines.push(`/tutorials/:name/ /tutorials/view/ 200`);
  lines.push(`/tutorials/:name /tutorials/view/ 200`);
  await fs.writeFile(path.join(siteDir, '_redirects'), lines.join('\n') + '\n');
  console.log(`Wrote ${lines.length} redirect rules`);

  // Long cache for fonts and the TypeScript worker (see ./src/server.ts).
  await fs.writeFile(
    path.join(siteDir, '_headers'),
    [
      '/fonts/*',
      '  Cache-Control: max-age=31536000',
      '/js/playground-typescript-worker.js',
      '  Cache-Control: max-age=120, stale-while-revalidate=86400',
      '',
    ].join('\n')
  );
};

await prepareMainSite();
