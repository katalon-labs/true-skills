# TC-2160 as a Playwright spec

I read TC-2160 "Sign in with a valid account" (P0, requirement CEL-25) and used the existing `LoginPage`. I wrote nothing to the platform.

## Spec

```ts
import { test, expect } from '../fixtures';

test('[TC-2160] Sign in with a valid account', async ({ page, loginPage }) => {
  test.info().annotations.push({ type: 'katalon-case', description: 'TC-2160' });
  test.info().annotations.push({ type: 'review', description: 'AI-drafted, read before merge' });

  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  test.skip(!email || !password, 'TEST_USER_EMAIL and TEST_USER_PASSWORD are not set');

  await loginPage.open();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();

  await loginPage.signIn(email!, password!);
  await loginPage.expectWelcome('Welcome back');
});
```

## Inputs still needed

- `TEST_USER_PASSWORD` and `TEST_USER_EMAIL`: no test account exists in the case or in the workspace. I wrote no credential, and the spec skips when they are empty.
- `APP_URL`: the config reads it with no default, and no URL was given.
- Whether the account uses multi-factor sign-in. The case does not say. If it does, the spec needs a step for it, and I did not invent one.

## Notes for the reviewer

- This spec is AI-drafted. The string "Welcome back" comes from the case.
- The button role and name "Sign in" come from the case text. I could not open the application, so confirm them.

## Verification

I could not run commands here, so none of these ran. The spec is unverified.

1. `npx tsc --noEmit`
2. `npx playwright test --list`
3. `npx playwright test tests/auth.spec.ts` once the inputs above exist.
4. `npx playwright test tests/auth.spec.ts --repeat-each=5 --retries=0` as a repeat check.
