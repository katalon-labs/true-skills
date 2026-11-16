# TC-2144 as a Playwright spec, with a new framework

I read TC-2144 "Filter products by brand and price" (P1, requirement CEL-22). The workspace holds only a package.json, so I set up a small framework. I wrote nothing to the platform.

## Files

- `playwright.config.ts`: base URL from `SHOP_URL`, one Chromium project.
- `pages/CatalogPage.ts`: a page object for the catalog and its filters.
- `fixtures/testData.ts`: the typed data for this case.
- `fixtures/index.ts`: the `test` fixture that hands the page object to specs.
- `tests/filter.spec.ts`: the spec for TC-2144.

## Config and data

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: { baseURL: process.env.SHOP_URL },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
```

```ts
// fixtures/testData.ts
export const testData = {
  brand: 'Orbit',
  minPrice: 100,
  maxPrice: 300,
  expectedCount: '3 results',
};
```

## Page object and fixture

```ts
// pages/CatalogPage.ts
import { expect, Page } from '@playwright/test';

export class CatalogPage {
  constructor(private readonly page: Page) {}

  async open() {
    await this.page.goto('/catalog');
  }

  async filterByBrand(brand: string) {
    await this.page.getByRole('checkbox', { name: brand }).check();
  }

  async filterByPrice(min: number, max: number) {
    await this.page.getByLabel('Min price').fill(String(min));
    await this.page.getByLabel('Max price').fill(String(max));
    await this.page.getByRole('button', { name: 'Apply filters' }).click();
  }

  async expectResultCount(text: string) {
    await expect(this.page.getByRole('status')).toHaveText(text);
  }
}
```

```ts
// fixtures/index.ts
import { test as base } from '@playwright/test';
import { CatalogPage } from '../pages/CatalogPage';

export const test = base.extend<{ catalogPage: CatalogPage }>({
  catalogPage: async ({ page }, use) => {
    await use(new CatalogPage(page));
  },
});

export { expect } from '@playwright/test';
```

## Spec

```ts
import { test, expect } from '../fixtures';
import { testData } from '../fixtures/testData';

test('[TC-2144] Filter products by brand and price', async ({ page, catalogPage }) => {
  test.info().annotations.push({ type: 'katalon-case', description: 'TC-2144' });
  test.info().annotations.push({ type: 'review', description: 'AI-drafted, read before merge' });

  await catalogPage.open();
  await expect(page.getByRole('article').first()).toBeVisible();

  await catalogPage.filterByBrand(testData.brand);
  await expect(page.getByRole('article').filter({ hasNotText: testData.brand })).toHaveCount(0);

  await catalogPage.filterByPrice(testData.minPrice, testData.maxPrice);
  await catalogPage.expectResultCount(testData.expectedCount);
});
```

## Notes for the reviewer

- This spec is AI-drafted. The string "3 results" and the values 100 and 300 come from the case.
- The roles `checkbox`, `article` and `status` are my reading of the page. I could not open the application, so confirm them.
- The step that checks "every price is between 100 and 300" has no assertion yet, because I do not know how a price renders. Add it once the markup is known.

## Verification

I could not run commands here, so none of these ran. Treat the spec as unverified until they do.

1. `npx tsc --noEmit`
2. `npx playwright test --list`
3. `npx playwright test tests/filter.spec.ts`
4. `npx playwright test tests/filter.spec.ts --repeat-each=5 --retries=0` as a repeat check. It lowers the odds of a flake and does not prove stability.

Inputs still needed: the live URL for `SHOP_URL` and the price markup.
