# lit.dev

The [lit.dev](https://lit.dev) website. It lives in the lit/lit monorepo so that
it is built from the same commit as the libraries it documents.

## How it fits in the monorepo

The packages in `website/packages/*` are npm workspaces of the monorepo, like
`packages/*`. Run every command below from the **repository root**.

- `lit-dev-content`: Main content of lit.dev (Eleventy site, components,
  samples, tutorials).
- `lit-dev-api`: Generated API docs data.
- `lit-dev-server`: Koa server for local production mode, and the Cloudflare
  build step (`cloudflare-prepare.mjs`).
- `lit-dev-playground`: The Playground sandbox, deployed as its own Worker.
- `lit-dev-tools-cjs`, `lit-dev-tools-esm`: Eleventy plugins and other internal
  tools.
- `lit-dev-tests`: Playwright integration and link tests.

What comes from this repo rather than npm:

- **Lit itself.** `lit`, `@lit/context`, `@lit/task`, `@lit/react`,
  `@lit/localize`, `@lit-labs/motion`, `@lit-labs/task`,
  `@lit-labs/ssr-client` and `@lit-labs/eleventy-plugin-lit` (and so
  `@lit-labs/ssr`) resolve to the workspace packages. The site's Wireit graph
  builds them first (`lit-dev-content:build:monorepo-deps`).
- **`@lit/ts-transformers`**, used to generate the JavaScript versions of the
  samples.
- **Lit 3 API docs**, generated from `packages/*/src` (see below).

The website is not part of the root `npm run build`, so library changes don't
pay for an Eleventy build. CI builds it in the `Website` workflow.

## Developing

### Install dependencies

```sh
npm ci
```

### Develop site content

```sh
npm run dev:website
```

Serves at [`http://localhost:5415`](http://localhost:5415).

Dev mode is different to production in these ways:

- Browser auto-reload.
- CSS is not inlined or minified. CSS changes are reflected immediately.
- JS is not inlined, bundled, bare-module transformed, or minified. JS changes
  are reflected immediately after `tsc` compile.
- HTML is not minified.

If needed, you can check for dev mode from an Eleventy template using the
`env.DEV` global:

```
{% if env.DEV %}
  <p>Dev mode</p>
{% else %}
  <p>Prod mode</p>
{% endif %}
```

### Update generated API docs

The generated data in `website/packages/lit-dev-api/api-data` is checked in.

- **Lit 3** is generated from this repository's `packages/lit`, `lit-element`,
  `lit-html` and `reactive-element` sources. If you change a public API or its
  doc comments, regenerate it in the same PR (CI checks it's in sync):

  ```sh
  npm run build -w lit-dev-api
  ```

- **Lit 2** is still generated from a clone of lit/lit at the commit pinned in
  [`configs/lit-2.ts`](./packages/lit-dev-tools-cjs/src/api-docs/configs/lit-2.ts).
  The clone lives outside the repository (in the OS temp directory, or
  `$LIT_DEV_API_CLONE_DIR`), so that its build doesn't resolve this
  monorepo's `node_modules`.

### Serve production mode

```sh
npm run build:website
npm run start:website
```

Serves at [`http://localhost:6415`](http://localhost:6415), with the Playground
sandbox at [`http://localhost:6416`](http://localhost:6416).

### Deploy to Cloudflare

The site and the Playground sandbox are two Cloudflare Workers with static
assets, deployed by Workers Builds with the repository root as root directory.
The exact build and deploy commands and variables are in
[`lit-dev-content/wrangler.jsonc`](./packages/lit-dev-content/wrangler.jsonc)
and
[`lit-dev-playground/wrangler.jsonc`](./packages/lit-dev-playground/wrangler.jsonc).
To build both locally:

```sh
LITDEV_MAIN_URL=https://lit-dev.<subdomain>.workers.dev \
LITDEV_PLAYGROUND_URL=https://lit-dev-playground.<subdomain>.workers.dev/ \
npm run build:website:cloudflare
```

### Tests

```sh
npm run test:website              # Unit tests and generated API checks
npm run test:website:integration  # Playwright screenshot tests
npm run test:website:links        # Broken link checks
```

Unless you are using Linux, screenshot test goldens need to be created by
running the integration tests on a Linux machine, e.g. in CI. Extract new
goldens into `website/packages/lit-dev-tests/src/playwright` and commit them.

### Contributing Tutorials

See the Tutorial Contributing guide at [packages/lit-dev-content/samples/tutorials/CONTRIBUTING.md](./packages/lit-dev-content/samples/tutorials/CONTRIBUTING.md)
