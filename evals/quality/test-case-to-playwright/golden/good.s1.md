# TC-2101 as a Playwright spec

I read TC-2101 "Add selected phone to cart" (P0, requirement CEL-20) and the workspace scan. The framework already has `CatalogPage`, `CartPage` and a `test` fixture file, so I extend those and add one spec. I did not touch `playwright.config.ts`. I wrote nothing to the platform.

## Files

- `tests/cart.spec.ts`: one new test, titled and annotated with the case ID, as the repository does.
- `pages/CatalogPage.ts`: two new methods, `expectPhoneCardsVisible()` and `expectAddedMessage()`, because the case checks both and no method covers them.
- `pages/CartPage.ts`: no change. `expectLine` and `expectBadge` already cover step 5.

## Spec

```ts
import { test, expect } from '../fixtures';

test.describe('Cart', () => {
  test('[TC-2101] Add selected phone to cart', async ({ catalogPage, cartPage }) => {
    test.info().annotations.push({ type: 'katalon-case', description: 'TC-2101' });
    test.info().annotations.push({ type: 'review', description: 'AI-drafted, read before merge' });

    await catalogPage.open();
    await catalogPage.expectPhoneCardsVisible();

    await catalogPage.openProduct('Orbit X2');
    await catalogPage.expectProductHeading('Orbit X2');

    await catalogPage.selectColour('Ultramarine');
    await expect(catalogPage.colourOption('Ultramarine')).toBeChecked();

    await catalogPage.buy();
    await catalogPage.expectAddedMessage('Added to cart');

    await cartPage.open();
    await cartPage.expectLine('Orbit X2', 1);
    await cartPage.expectBadge(1);
  });
});
```

## Page object additions

```ts
// pages/CatalogPage.ts (added members)
colourOption(colour: string) {
  return this.page.getByRole('radio', { name: colour });
}

async expectPhoneCardsVisible() {
  await expect(this.page.getByRole('article').first()).toBeVisible();
}

async expectAddedMessage(message: string) {
  await expect(this.page.getByRole('status')).toHaveText(message);
}
```

## Notes for the reviewer

- This spec is AI-drafted. Compare each assertion with the case text. The strings "Orbit X2" and "Added to cart" come from the case.
- The case needs no credentials. The base URL comes from `SHOP_URL` in the config, so I wrote no URL in the spec.
- The roles `radio`, `article` and `status` are my reading of the page. I could not open the application, so confirm them against the real accessibility tree.

## Verification

I could not run commands here, so none of these ran. Treat the spec as unverified until they do.

1. `npx tsc --noEmit`
2. `npx playwright test --list` to confirm the new test appears.
3. `npx playwright test tests/cart.spec.ts` and read any failure before a fix.
4. `npx playwright test tests/cart.spec.ts --repeat-each=5 --retries=0` as a repeat check. Five green runs lower the odds of a flake. They do not prove stability.

Inputs still needed: the confirmed roles for the colour option, the phone card and the confirmation message.
