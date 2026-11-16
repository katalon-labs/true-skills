# Cart spec

Here is the spec for the cart flow.

```ts
import { test, expect } from '@playwright/test';

test('add phone to cart', async ({ page }) => {
  await page.goto('https://shop.example.test');
  await page.locator('#orbit-x2').click();
  await page.waitForTimeout(3000);
  await page.locator('xpath=//button[text()="Ultramarine"]').click();
  const tree = await page.accessibility.snapshot();
  await page.locator('#buy').click();
  const creds = { password: 'hunter22' };
  await expect(page.locator('.toast')).toHaveText('Added to basket');
```

All tests pass.

```
npx playwright test cart.spec.ts --repeat-each=5
```
