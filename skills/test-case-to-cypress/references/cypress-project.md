# Cypress Project Reference

## Project Detection

Use these signals to detect an existing project:

- `cypress.config.ts`, `cypress.config.js`, or `cypress.config.mjs` (Cypress 10+)
- `cypress.json` plus `cypress/integration/` (pre-10, flag it, do not migrate silently)
- `cypress` in `package.json` dependencies or devDependencies
- spec files matching `*.cy.ts`, `*.cy.js`, or a custom `specPattern` in the config
- existing `cypress/support/commands.*`, `cypress/support/e2e.*`, `cypress/fixtures/`, `cypress/pages/`, or `cypress/actions/`
- an existing `reporter` or `reporterOptions` block, or a `reporter-config.json` at the repo root

When a project exists, read a few representative specs, the support files, and the config before editing. Match import style, file naming, command naming, fixture shape, and assertion style.

## New Project Shape

```text
cypress.config.ts
cypress/
  e2e/
    <area>/<feature>.cy.ts
  support/
    e2e.ts
    commands.ts
    index.d.ts
  fixtures/
    <feature>.json
reporter-config.json
```

Cypress has no `npm init` initializer. Install `cypress` as a devDependency and run `npx cypress open` once to scaffold `cypress/` and the config file, or write the files directly when running headless. Do not overwrite existing application files.

## Config

```ts
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL,
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    video: true,
    retries: { runMode: 1, openMode: 0 },
    setupNodeEvents(on, config) {
      return config;
    },
  },
});
```

Source `baseUrl` from the environment rather than hard-coding an AUT host. Keep `retries` low and visible; retries hide flake rather than fixing it, and `test-maintenance` owns the fix.

## Custom Commands (app actions)

Cypress's preferred structure is a command that performs a domain task, not a page object that wraps every element.

```ts
// cypress/support/commands.ts
Cypress.Commands.add('loginAsShopper', (username: string) => {
  cy.session([username], () => {
    cy.visit('/login');
    cy.get('[data-cy=username]').type(username);
    cy.get('[data-cy=password]').type(Cypress.env('SHOPPER_PASSWORD'), { log: false });
    cy.get('[data-cy=submit]').click();
    cy.get('[data-cy=header-user]').should('contain', username);
  }, { cacheAcrossSpecs: true });
});

Cypress.Commands.add('searchCatalog', (term: string) => {
  cy.get('[data-cy=search-input]').clear().type(`${term}{enter}`);
});
```

`{ log: false }` on a password keeps the secret out of the command log, the screenshots, and the video. Always use it.

In a TypeScript project, declare the types or the specs will not compile:

```ts
// cypress/support/index.d.ts
declare global {
  namespace Cypress {
    interface Chainable {
      loginAsShopper(username: string): Chainable<void>;
      searchCatalog(term: string): Chainable<void>;
    }
  }
}
export {};
```

`cy.session()` requires Cypress 12 or newer, and `cacheAcrossSpecs` requires 12.3 or newer. On an older project, cache login with a request-based command instead and say which approach was used.

## Page Objects

Add a page-object layer only when the project already has one, or when a single page carries enough distinct interactions that app actions would sprawl. If used, keep the Selenium rule: **a page object exposes actions and locators, it does not assert.** Assertions belong in the spec so the failure message names the business expectation.

## Fixtures

```json
// cypress/fixtures/cellphone-shop.json
{
  "shopper": { "username": "shopper@example.test" },
  "phone": { "name": "Nexus 6", "price": "650.00" }
}
```

```ts
beforeEach(() => {
  cy.fixture('cellphone-shop').as('data');
});
```

Fixtures hold **static, non-secret** data. Secrets come from `Cypress.env()`, backed by a `CYPRESS_`-prefixed environment variable. Never write a password, token, or API key into a fixture, a spec, or the config.

## Spec Mapping

Keep Katalon traceability visible, and keep the case ID first in the title:

```ts
describe('Storefront search and cart', () => {
  beforeEach(() => {
    cy.fixture('cellphone-shop').as('data');
  });

  it('TC-1042 Search an in-stock phone and add it to the cart', function () {
    cy.loginAsShopper(this.data.shopper.username);

    cy.visit('/');
    cy.searchCatalog(this.data.phone.name);
    cy.get('[data-cy=result-row]')
      .should('contain', this.data.phone.name)
      .and('contain', this.data.phone.price)
      .and('contain', 'In stock');

    cy.get(`[data-cy=product-link-${this.data.phone.name}]`).click();
    cy.get('[data-cy=add-to-cart]').should('be.enabled').click();
    cy.get('[data-cy=cart-badge]').should('have.text', '1');

    cy.visit('/cart');
    cy.get('[data-cy=cart-line]').should('contain', this.data.phone.name);
    cy.get('[data-cy=cart-total]').should('have.text', this.data.phone.price);
  });
});
```

Note `function ()` rather than an arrow function. `this.data` from a `cy.fixture().as()` alias is only available with a `function` callback.

Group each meaningful manual step into a contiguous block of commands plus its assertion, so a reader can line the spec up against the Katalon case side by side.

## Retry-ability Rules

These four mistakes account for most converted-spec flake:

- **Never assign a command to a variable.** `const el = cy.get('...')` does not hold an element. Use `.then()`.
- **Never `await` a `cy` command.** Mixing `async`/`await` with the command queue breaks ordering.
- **Assert with `.should()`, not with a bare `expect` outside `.then()`.** `.should()` retries; `expect` in the wrong place runs once against a stale subject.
- **Never `cy.wait(<number>)`.** Use `cy.intercept()` plus `cy.wait('@alias')`, or a retrying assertion.

## Human-As-Tool Questions

Ask the human when any of these are missing and cannot be discovered:

- target repository or directory
- permission to modify an existing project
- AUT base URL or environment
- credentials, roles, or setup data, and where the team keeps them
- unique product, order, or user records
- selector strategy when the UI cannot be inspected
- whether to scaffold a new project or use a provided repository
- whether a step that crosses tabs or origins should be flagged or dropped

Keep questions short and actionable. Ask only for the required values needed to continue.
