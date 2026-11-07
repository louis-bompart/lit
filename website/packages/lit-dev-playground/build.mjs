/**
 * @license
 * Copyright The Lit Project
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Stages the Playground sandbox for Cloudflare Workers static assets (see
 * ./wrangler.jsonc).
 *
 * On Cloud Run, the sandbox is served by lit-dev-server in MODE=playground,
 * straight from node_modules/playground-elements. Here the package is copied
 * to ./dist, with a _headers file for the header that server sets.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {createRequire} from 'module';
import {fileURLToPath} from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const srcDir = path.dirname(
  require.resolve('playground-elements/package.json')
);
const outDir = path.join(__dirname, 'dist');

await fs.rm(outDir, {recursive: true, force: true});
await fs.cp(srcDir, outDir, {
  recursive: true,
  dereference: true,
  filter: (src) =>
    path.relative(srcDir, src).split(path.sep)[0] !== 'node_modules',
});

// See https://github.com/PolymerLabs/playground-elements#process-isolation
await fs.writeFile(
  path.join(outDir, '_headers'),
  '/*\n  Origin-Agent-Cluster: ?1\n'
);

console.log(`Wrote playground sandbox to ${outDir}`);
