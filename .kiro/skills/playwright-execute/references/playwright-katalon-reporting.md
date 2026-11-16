# Playwright and Katalon reporting

Read this before you edit Playwright config, write a run or upload command, or collect failure evidence.

## Version pin

Checked 2026-10-20 against the npm registry:

- `@playwright/test`: 1.64.0 released 2026-10-07. `latest` was 1.64.1.
- `@katalon/playwright-reporter`: 0.0.3, last modified 2026-03-27. Peer dependency `@playwright/test` `^1.0.0`.

This skill was written against Playwright 1.64. Features below name the release that added them. If the repo pins an older Playwright, skip the feature. Install a newer Playwright only when the user asks.

## Official references

- Playwright integration: https://docs.katalon.com/katalon-platform/integrations/testing-framework/playwright-integration
- Katalon API key: https://docs.katalon.com/katalon-platform/administer/profile/katalon-api-key-in-katalon-testops
- Katalon CLI integration: https://docs.katalon.com/katalon-platform/integrations/ci-cd/katalon-cli-integration
- Playwright release notes: https://playwright.dev/docs/release-notes

## Dependencies

- Node.js 18 or later.
- `@playwright/test`.
- `@katalon/playwright-reporter`.
- `KATALON_API_KEY` and `KATALON_PROJECT_ID` for upload.

Install with the package manager the repo already uses:

```bash
npm install --save-dev @katalon/playwright-reporter
pnpm add -D @katalon/playwright-reporter
yarn add -D @katalon/playwright-reporter
```

Do not install packages globally unless the repo already does.

## API key check

```bash
test -n "$KATALON_API_KEY" && echo "KATALON_API_KEY is set" || echo "KATALON_API_KEY is missing"
```

Never print the key. If it is missing, ask the user to set it through an environment variable or secret store. Stop before the upload.

## Config pattern

Add the reporter and keep the reporters already present:

```ts
import { defineConfig } from '@playwright/test';
import { getGlobalSetupPath } from '@katalon/playwright-reporter';

export default defineConfig({
  globalSetup: getGlobalSetupPath(),
  reporter: [
    ['list'],
    [
      '@katalon/playwright-reporter',
      {
        outputDir: './reports',
        ...(process.env.KATALON_API_KEY && {
          platform: {
            apiKey: process.env.KATALON_API_KEY,
            projectId: process.env.KATALON_PROJECT_ID,
            baseUrl: process.env.KATALON_BASE_URL,
            authUrl: process.env.KATALON_AUTH_URL,
          },
        }),
      },
    ],
  ],
});
```

If a `globalSetup` already exists, keep it. If combining them is hard, ask before you edit, and prefer a separate upload after the run.

Playwright 1.63 added `--add-reporter`. It may let the Katalon reporter attach without a config edit. This was not tested with the reporter. Try it on a throwaway run first. If the upload does not appear, edit the config instead.

## Run commands

Run the user's command. If none was given, use the narrowest one:

```bash
npx playwright test
npx playwright test tests/example.spec.ts
npx playwright test --grep "TC-07"
npx playwright test --project chromium
```

Upload during the run:

```bash
KATALON_API_KEY="$KATALON_API_KEY" \
KATALON_PROJECT_ID="<project_id>" \
KATALON_BASE_URL="<platform_url>" \
npx playwright test <target>
```

Leave out `KATALON_BASE_URL` when the default endpoint is right.

## Separate upload

```bash
npx playwright test <target>
playwright-reporter upload \
  --output ./reports \
  --api-key "$KATALON_API_KEY" \
  --project-id "<project_id>" \
  --base-url "<platform_url>"
```

Leave out `--base-url` when the default endpoint is right.

## Run before report

1. Run the real command. Read the exit code and the output.
2. Check how many tests ran. Zero tests is a result to report on its own line. Do not fold it into a pass.
3. A failure that passes on retry is flaky. Report it with the failure.
4. Playwright 1.62 added `retryStrategy: 'isolated'`. It helps tell a flaky test from a test that depends on state left by an earlier one. This was not tested with the reporter. Try it on a throwaway run first, and check the option in the pinned Playwright version.
5. Playwright 1.61 added `failOnFlakyTests` to the config. Suggest it for CI when the team wants flaky tests to fail the build. Do not set it without asking. This was not tested with the reporter. Try it on a throwaway run first.
6. Do not rerun an unchanged failing test to turn it green.

## Failure evidence

Collect these for each failed test and keep them beside the report:

- The trace file. Read it with `npx playwright trace` (Playwright 1.59).
- The `errorContext` of the failure. From Playwright 1.60 it includes an aria snapshot of the page.
- Console messages and page errors, from `page.consoleMessages()` and `page.pageErrors()` (Playwright 1.56). On an older pinned version, or if those methods are missing, collect them with the `page.on('console')` and `page.on('pageerror')` listeners instead.
- Screenshots and videos, when the config records them.

Mask personal data before you share any of these. Never upload secrets.

## Secret handling

- Never print `KATALON_API_KEY` or auth tokens.
- Never write keys into `playwright.config.*`, `package.json`, logs, reports, or skill files.
- Use environment variables or the platform's secret mechanism.
- Hide secret-like values in any output you quote.

## Result link

After the upload, give the user a link:

- Prefer the exact URL from the reporter or from `playwright-reporter upload`.
- Else use the link from the platform read tools. Their `resource_url` host can fail on `.katalon.io` tenants. Then build the link from the tenant host and say so.
- For a custom domain, build links from `KATALON_BASE_URL`.
- With only the project ID, give the project reports link and mark it as a fallback.

Never end with only "uploaded".

## Common failures

- Missing dependency: install the reporter only with permission to change dependencies.
- Missing API key: stop and ask for a secure source.
- Missing project ID: call `list_projects`. Ask only when several projects fit.
- Test failures: upload the report anyway when files exist.
- No reporter output: check the config and stdout. Do not run a separate upload without an output directory.
- Upload printed success but `list_executions` shows no run: report the upload output and say that platform verification failed.
- A JUnit file from Playwright 1.59 or later can hold `error` elements where older files held `failure` elements. If you upload JUnit instead of using the reporter, compare failed plus errored counts.
