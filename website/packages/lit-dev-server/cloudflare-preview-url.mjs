/**
 * @license
 * Copyright The Lit Project
 * SPDX-License-Identifier: BSD-3-Clause
 */

/**
 * Prints the Preview URL of the last `wrangler preview` run recorded in a
 * Wrangler output file (the NDJSON file named by WRANGLER_OUTPUT_FILE_PATH).
 *
 * Used by .github/workflows/website.yml to build the main site against the
 * Playground sandbox Preview that was just deployed.
 *
 * Usage: node cloudflare-preview-url.mjs <wrangler-output-file>
 */

import * as fs from 'fs';

const [file] = process.argv.slice(2);
if (!file) {
  console.error(
    'Usage: node cloudflare-preview-url.mjs <wrangler-output-file>'
  );
  process.exit(1);
}

const previews = fs
  .readFileSync(file, 'utf8')
  .split('\n')
  .filter((line) => line.trim() !== '')
  .map((line) => JSON.parse(line))
  .filter((entry) => entry.type === 'preview');

// The stable URL of the named Preview comes first; the unique deployment URLs
// change on every run.
const preview = previews.at(-1);
const url = preview?.preview_urls?.[0] ?? preview?.deployment_urls?.[0];
if (!url) {
  console.error(`No Preview URL found in ${file}`);
  process.exit(1);
}
console.log(url.startsWith('http') ? url : `https://${url}`);
