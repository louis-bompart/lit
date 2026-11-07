/**
 * @license
 * Copyright The Lit Project
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */

interface LitDevEnvironment {
  siteVersion: string;
  mainPort: number;
  playgroundPort: number;
  fakeGithubPort: number | undefined;
  eleventyMode: 'prod' | 'dev';
  eleventyOutDir: string;
  googleAnalyticsId: string;
  reportCspViolations: boolean;
  playgroundSandboxUrl: string;
  playgroundCdnBaseUrl: string;
  mainUrl: string;
  githubMainUrl: string;
  githubApiUrl: string;
  githubAvatarUrl: string;
  githubAuthorizeRedirectUrl: string;
  githubClientId: string;
  /**
   * IMPORTANT: Do not hard code actual secrets.
   */
  githubClientSecret: string;
}

const TEST_GOOGLE_ANALYTICS_ID = 'G-PPMSZR9W18';
const FAKE_GITHUB_CLIENT_ID = 'FAKE_CLIENT_ID';
const FAKE_GITHUB_CLIENT_SECRET = 'FAKE_CLIENT_SECRET';

/**
 * Try to get the environment variable with the given name and throw if it's not
 * defined or is not an integer.
 */
const integerEnv = (name: string): number => {
  const val = process.env[name];
  if (!val || val.match(/^\d+$/) === null) {
    throw new Error(
      `Expected environment variable ${name} to be an integer` +
        ` but was ${JSON.stringify(val)}.`
    );
  }
  return Number(val);
};

/**
 * Try to get the environment variable with the given name and throw if it's not
 * defined or empty.
 */
const stringEnv = (name: string): string => {
  const val = process.env[name];
  if (!val) {
    throw new Error(
      `Expected environment variable ${name} to be set and non-empty` +
        ` but was ${JSON.stringify(val)}.`
    );
  }
  return val;
};

const environment = <T extends LitDevEnvironment>(env: T): T => env;

/**
 * lit.dev environment configuration for fast local dev mode with auto-reload.
 */
export const dev = environment({
  siteVersion: 'dev',
  mainPort: 5415,
  playgroundPort: 5416,
  fakeGithubPort: 5417,
  eleventyMode: 'dev',
  eleventyOutDir: '_dev',
  googleAnalyticsId: TEST_GOOGLE_ANALYTICS_ID,
  reportCspViolations: false,
  playgroundCdnBaseUrl: 'https://cdn.jsdelivr.net/npm',
  get mainUrl() {
    return `http://localhost:${this.mainPort}`;
  },
  get playgroundSandboxUrl() {
    return `http://localhost:${this.playgroundPort}/`;
  },
  get githubMainUrl() {
    return `http://localhost:${this.fakeGithubPort}/`;
  },
  get githubAvatarUrl() {
    return `http://localhost:${this.fakeGithubPort}/`;
  },
  get githubApiUrl() {
    // We fake both github.com and api.github.com with the same server, since
    // they don't have overlapping endpoint paths.
    return this.githubMainUrl;
  },
  get githubAuthorizeRedirectUrl() {
    return `http://localhost:${this.mainPort}/playground/signin/`;
  },
  githubClientId: FAKE_GITHUB_CLIENT_ID,
  githubClientSecret: FAKE_GITHUB_CLIENT_SECRET,
});

/**
 * lit.dev environment configuration for running a prod-ish environment locally.
 */
const local = environment({
  siteVersion: 'local',
  mainPort: 6415,
  playgroundPort: 6416,
  fakeGithubPort: 6417,
  eleventyMode: 'prod',
  eleventyOutDir: '_site',
  googleAnalyticsId: TEST_GOOGLE_ANALYTICS_ID,
  reportCspViolations: false,
  playgroundCdnBaseUrl: 'https://cdn.jsdelivr.net/npm',
  get mainUrl() {
    return `http://localhost:${this.mainPort}`;
  },
  get playgroundSandboxUrl() {
    return `http://localhost:${this.playgroundPort}/`;
  },
  get githubMainUrl() {
    return `http://localhost:${this.fakeGithubPort}/`;
  },
  get githubAvatarUrl() {
    return `http://localhost:${this.fakeGithubPort}/`;
  },
  get githubApiUrl() {
    // We fake both github.com and api.github.com with the same server, since
    // they don't have overlapping endpoint paths.
    return this.githubMainUrl;
  },
  get githubAuthorizeRedirectUrl() {
    return `http://localhost:${this.mainPort}/playground/signin/`;
  },
  githubClientId: FAKE_GITHUB_CLIENT_ID,
  githubClientSecret: FAKE_GITHUB_CLIENT_SECRET,
});

/**
 * lit.dev environment configuration for the live production site.
 */
const prod = environment({
  get siteVersion() {
    return `prod-${stringEnv('SHORT_SHA')}`;
  },
  get mainPort() {
    // Assigned automatically and passed as an environment variable.
    return integerEnv('PORT');
  },
  get playgroundPort() {
    // Assigned automatically and passed as an environment variable.
    return integerEnv('PORT');
  },
  fakeGithubPort: undefined, // Does not run
  eleventyMode: 'prod',
  eleventyOutDir: '_site',
  googleAnalyticsId: 'G-FTZ6CJP9F3',
  reportCspViolations: true,
  playgroundCdnBaseUrl: 'https://cdn.jsdelivr.net/npm',
  mainUrl: 'https://lit.dev',
  playgroundSandboxUrl: 'https://playground.lit.dev/',
  githubMainUrl: 'https://github.com/',
  githubApiUrl: 'https://api.github.com/',
  githubAvatarUrl: 'https://avatars.githubusercontent.com/',
  githubAuthorizeRedirectUrl: 'https://lit.dev/playground/signin/',
  githubClientId: 'd5c8e81abdf8867459c1',
  get githubClientSecret() {
    return stringEnv('GITHUB_CLIENT_SECRET');
  },
});

/**
 * lit.dev environment configuration for a static Cloudflare deployment.
 *
 * The main site and the Playground sandbox are deployed as two separate
 * Workers with static assets (they must be on different origins), by the
 * Website GitHub Actions workflow (.github/workflows/website.yml). For a pull
 * request Preview, the workflow deploys the Playground sandbox Preview first
 * and passes its URL as LITDEV_PLAYGROUND_URL.
 *
 * Note there is no server in this setup, so the ports and GitHub client secret
 * are unused.
 */
const cloudflare = environment({
  get siteVersion() {
    // GITHUB_SHA is set by GitHub Actions.
    const sha = process.env.GITHUB_SHA ?? process.env.SHORT_SHA ?? 'unknown';
    return `cloudflare-${sha.slice(0, 7)}`;
  },
  mainPort: 0, // Unused, static hosting.
  playgroundPort: 0, // Unused, static hosting.
  fakeGithubPort: undefined, // Does not run
  eleventyMode: 'prod',
  eleventyOutDir: '_site',
  googleAnalyticsId: TEST_GOOGLE_ANALYTICS_ID,
  reportCspViolations: false,
  playgroundCdnBaseUrl: 'https://cdn.jsdelivr.net/npm',
  get mainUrl() {
    return stringEnv('LITDEV_MAIN_URL').replace(/\/$/, '');
  },
  get playgroundSandboxUrl() {
    return stringEnv('LITDEV_PLAYGROUND_URL').replace(/\/?$/, '/');
  },
  githubMainUrl: 'https://github.com/',
  githubApiUrl: 'https://api.github.com/',
  githubAvatarUrl: 'https://avatars.githubusercontent.com/',
  get githubAuthorizeRedirectUrl() {
    return `${this.mainUrl}/playground/signin/`;
  },
  // GitHub sign-in (for sharing playground projects as gists) requires the
  // server-side token exchange, which is not available on static hosting.
  githubClientId: FAKE_GITHUB_CLIENT_ID,
  githubClientSecret: FAKE_GITHUB_CLIENT_SECRET,
});

const environments = {dev, local, prod, cloudflare};

/**
 * Return the environment configuration matching the LITDEV_ENV environment
 * variable.
 */
export const getEnvironment = (): LitDevEnvironment => {
  const name = process.env.LITDEV_ENV;
  const env = environments[(name ?? '') as keyof typeof environments];
  if (!env) {
    throw new Error(
      `Expected environment variable LITDEV_ENV to be` +
        ` one of ${Object.keys(environments).join(', ')},` +
        ` but was ${JSON.stringify(name)}.`
    );
  }
  return env;
};
