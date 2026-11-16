# Playwright TypeScript Reference

Read this before you scaffold a framework or make broad changes to an existing one.

## Version Pin

Checked against Playwright 1.64 on 2026-10-20 (npm: 1.64.0 released 2026-10-07, `latest` 1.64.1). Read the `@playwright/test` version in `package.json` first. If the repository pins an older version, follow the repository and avoid APIs newer than that version. The Katalon reporter (`@katalon/playwright-reporter`) peer range was not checked in this build. Confirm it with the package before you upgrade Playwright.

Changes between 1.56 and 1.64 that matter for generated code:

| Version | Change | Effect on generated code |
|---|---|---|
| 1.56 | Test Agents (planner, generator, healer). | See `test-agents.md`. |
| 1.57 | Chrome for Testing replaces Chromium. `page.accessibility` removed. | Do not call `page.accessibility`. Use aria snapshots. Browser install output differs from older notes. |
| 1.58 | `_react` and `_vue` selectors removed. | Do not generate `_react=` or `_vue=` selectors. |
| 1.60 | `errorContext` carries aria snapshots. Aria snapshot matchers expanded. | Prefer role and aria assertions over CSS. Use `errorContext` as repair evidence. |
| 1.61 | `fullConfig.failOnFlakyTests`. Storage APIs on the page. | Set `failOnFlakyTests` in CI config so a flaky pass is not silent. Seed state through storage, not through the UI login. |
| 1.64 | `--shuffle`. `--update-snapshots=missing` no longer fails a run. | Run `--shuffle` once to find order dependence. Do not treat a missing snapshot as a failure signal. |

## Framework Detection

Use these signals to detect an existing framework:

- `playwright.config.ts`, `playwright.config.js`, or `playwright.config.mts`
- `@playwright/test` in `package.json`
- spec files under `tests/`, `e2e/`, `specs/`, or feature folders
- existing `pages/`, `page-objects/`, `fixtures/`, `test-data/`, or `utils/`
- custom test exports such as `fixtures/base.ts`, `test.extend`, or `export const test`

Find these with your own file-search tool. Do not depend on one command-line binary.

When a framework exists, read a few representative specs, page objects, and fixtures before you edit. Match imports, file naming, tag style, fixture names, and assertion style.

## New Framework Shape

For a new TypeScript framework, use a small structure:

```text
playwright.config.ts
tests/
  <feature>.spec.ts
pages/
  <page-name>.page.ts
fixtures/
  test.ts
  test-data.ts
```

Use `npm init playwright` or the repository's package manager equivalent. Choose TypeScript. Install browser dependencies only when needed. Do not overwrite existing application files.

## Locators

Order of preference:

1. Role with an accessible name: `page.getByRole('button', { name: 'Sign in' })`
2. Label or placeholder: `getByLabel`, `getByPlaceholder`
3. Test id: `getByTestId`
4. Visible text: `getByText`
5. CSS
6. XPath, only when the application offers nothing better. Say so in the page object.

Role and label locators track what a user sees. They also give the healer and a human reviewer the same words to read.

## Page Object Model

Page objects expose business actions and assertions:

```ts
import { expect, type Locator, type Page } from '@playwright/test';

export class ProductCatalogPage {
  readonly page: Page;
  readonly searchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByRole('searchbox', { name: /search/i });
  }

  async goto(baseURL: string) {
    await this.page.goto(baseURL);
  }

  async searchForPhone(phoneName: string) {
    await this.searchInput.fill(phoneName);
    await this.page.getByRole('button', { name: /search/i }).click();
  }

  async expectPhoneVisible(phoneName: string) {
    await expect(this.page.getByText(phoneName, { exact: false })).toBeVisible();
  }
}
```

Avoid method names that only describe mechanics, such as `clickButton` or `fillInput`, unless they are private helpers. Use names that carry the intent of the Katalon manual step.

## Assertions

Put each expected result in an assertion near the action that produces it. For structure, use an aria snapshot of the region that matters:

```ts
await expect(page.getByRole('main')).toMatchAriaSnapshot(`
  - heading "System dashboard" [level=1]
`);
```

Use web-first assertions (`await expect(locator).toBeVisible()`). They retry until the timeout. Do not assert on a value you read once with `textContent()` unless the case requires it.

## Fixtures

Use fixtures to centralize reusable pages, users, and test data:

```ts
import { test as base } from '@playwright/test';
import { ProductCatalogPage } from '../pages/product-catalog.page';
import { testData } from './test-data';

type Fixtures = {
  productCatalog: ProductCatalogPage;
  data: typeof testData;
};

export const test = base.extend<Fixtures>({
  productCatalog: async ({ page }, use) => {
    await use(new ProductCatalogPage(page));
  },
  data: async ({}, use) => {
    await use(testData);
  },
});

export { expect } from '@playwright/test';
```

For logged-in state, set it up once (a setup project that saves `storageState`) and reuse it. Do not repeat the UI login in every spec, unless the case under test is the login.

## Spec Mapping

Keep Katalon traceability visible:

```ts
import { test, expect } from '../fixtures/test';

test.describe('Search and filter', () => {
  test('TC-123 Verify phone price and stock search', async ({ productCatalog, data }, testInfo) => {
    testInfo.annotations.push({ type: 'katalonCaseId', description: 'TC-123' });

    await test.step('Open cellphone storefront', async () => {
      await productCatalog.goto(data.baseURL);
    });

    await test.step('Search for an in-stock phone', async () => {
      await productCatalog.searchForPhone(data.phones.inStock.name);
      await productCatalog.expectPhoneVisible(data.phones.inStock.name);
    });
  });
});
```

Each `test.step` matches a meaningful manual action or assertion group, not every small Playwright call.

## Flake Checks

- `npx playwright test <file> --repeat-each=5 --retries=0` runs the spec five times with retries off. Retries hide the failures you want to see.
- Five green runs lower the odds of an obvious flake. They do not prove stability. A flake rate of 5 to 10 percent can pass five runs.
- `npx playwright test --shuffle` (1.64) runs tests in random order once, to expose order dependence.
- Set `failOnFlakyTests: true` in the CI config so a test that passes only on retry fails the run.

## Questions For The Human

Ask when any of these are missing and cannot be found:

- target repository or directory
- permission to modify an existing framework
- AUT URL or environment
- credentials, roles, or setup data
- unique product, order, or user records
- selector strategy when the UI cannot be inspected
- whether to scaffold a new framework or use a provided repository

Keep each question short. Ask only for values the next step needs.
