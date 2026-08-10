# Worked Example: TC-1042 to a Cypress spec

Real inputs, real MCP call sequence, and the exact files and output produced. Placeholders are marked with angle brackets; substitute your own and nothing else changes.

## Input

The user says:

> Turn TC-1042 into a Cypress spec. It's in the Cellphone Shop project.

## Step 1: Resolve the Katalon context

```text
list_projects()
-> [{ id: 4821, name: "Cellphone Shop" }, { id: 4822, name: "Cellphone Shop API" }]

list_repositories(projectId: 4821)
-> [{ id: 91, name: "Cellphone Shop Web" }]

find_test_cases(projectId: 4821, repositoryId: 91, query: "TC-1042")
-> [{ id: 30514, name: "TC-1042 Search an in-stock phone and add it to the cart" }]

read_test_case(id: 30514)
```

Two projects matched the user's wording, but only one has a web repository holding TC-1042, so no question is needed. If both had matched, ask which one. Do not guess.

`read_test_case` returns:

```text
Title:        TC-1042 Search an in-stock phone and add it to the cart
Priority:     High
Requirements: CEL-6 Storefront search and cart
Folder:       Cellphone Shop Web / Storefront
Precondition: A registered shopper account exists.
              The catalog contains at least one in-stock phone.
Test data:    username shopper@example.test
              password from the team secret store
              phone Nexus 6, unit price 650.00

Steps:
 1. Open the storefront home page      -> Home page loads, search box visible
 2. Log in as the shopper              -> Shopper name appears in the header
 3. Search for "Nexus 6"               -> Result shows Nexus 6, price 650.00, In stock
 4. Open the Nexus 6 product page      -> Add to cart is enabled
 5. Add to cart                        -> Cart badge shows 1
 6. Open the cart                      -> Cart line shows Nexus 6, total 650.00
```

## Step 2: Resolve the project

```text
rg --files -g 'cypress.config.*' -g 'cypress.json' -g 'package.json'
-> package.json
```

No Cypress project exists. The workspace is writable, so the agent asks once:

> No Cypress project found. Scaffold one here, or point me at an existing repo?

The user says scaffold. The agent then asks for the two values it cannot discover:

> I need the storefront base URL and where the shopper password lives. I will read the password from `CYPRESS_SHOPPER_PASSWORD` and never write it to a file.

## Step 3: Files written

`cypress.config.ts`

```ts
import { defineConfig } from 'cypress';

export default defineConfig({
  reporter: 'cypress-multi-reporters',
  reporterOptions: { configFile: 'reporter-config.json' },
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL,
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    retries: { runMode: 1, openMode: 0 },
  },
});
```

`reporter-config.json`

```json
{
  "reporterEnabled": "spec, mocha-junit-reporter",
  "mochaJunitReporterReporterOptions": {
    "mochaFile": "cypress/results/junit-[hash].xml",
    "testsuitesTitle": "Cypress",
    "toConsole": false
  }
}
```

`cypress/fixtures/cellphone-shop.json`

```json
{
  "shopper": { "username": "shopper@example.test" },
  "phone": { "name": "Nexus 6", "price": "650.00" }
}
```

`cypress/support/commands.ts`

```ts
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

`cypress/support/index.d.ts`

```ts
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

`cypress/e2e/storefront/search-and-cart.cy.ts`

```ts
// Katalon CEL-6 / Cellphone Shop Web / Storefront
describe('Storefront search and cart', () => {
  beforeEach(() => {
    cy.fixture('cellphone-shop').as('data');
  });

  it('TC-1042 Search an in-stock phone and add it to the cart', function () {
    // Step 2: log in as the shopper
    cy.loginAsShopper(this.data.shopper.username);

    // Step 1: open the storefront
    cy.visit('/');
    cy.get('[data-cy=search-input]').should('be.visible');

    // Step 3: search, and assert price and stock
    cy.searchCatalog(this.data.phone.name);
    cy.get('[data-cy=result-row]')
      .should('contain', this.data.phone.name)
      .and('contain', this.data.phone.price)
      .and('contain', 'In stock');

    // Step 4: open the product page
    cy.get('[data-cy=result-row]').contains(this.data.phone.name).click();
    cy.get('[data-cy=add-to-cart]').should('be.enabled');

    // Step 5: add to cart
    cy.get('[data-cy=add-to-cart]').click();
    cy.get('[data-cy=cart-badge]').should('have.text', '1');

    // Step 6: open the cart
    cy.visit('/cart');
    cy.get('[data-cy=cart-line]').should('contain', this.data.phone.name);
    cy.get('[data-cy=cart-total]').should('have.text', this.data.phone.price);
  });
});
```

Step 1 is asserted after the login command because `cy.session()` caches the login and returns to a blank page. Visiting the storefront after restoring the session is the correct order, not a reordering of the manual case.

## Step 4: Run

```text
export CYPRESS_BASE_URL="<storefront-base-url>"
export CYPRESS_SHOPPER_PASSWORD="<from the team secret store>"
npx cypress run --spec "cypress/e2e/storefront/search-and-cart.cy.ts"
```

Expected console output:

```text
  Storefront search and cart
    ok TC-1042 Search an in-stock phone and add it to the cart (12402ms)

  1 passing (12s)
```

## Step 5: Confirm traceability survived

```text
grep -o 'TC-[0-9]*' cypress/results/*.xml | sort -u
-> cypress/results/junit-a3f19c.xml:TC-1042
```

The generated XML:

```xml
<testsuites name="Cypress" tests="1" failures="0" time="12.402">
  <testsuite name="Storefront search and cart" tests="1" failures="0" time="12.402">
    <testcase name="Storefront search and cart TC-1042 Search an in-stock phone and add it to the cart"
              classname="TC-1042 Search an in-stock phone and add it to the cart"
              time="12.402"/>
  </testsuite>
</testsuites>
```

`TC-1042` is present in both `name` and `classname` because it leads the `it()` title. That is the entire traceability mechanism, and it is the reason the title rule is stated as an interface in the skill body.

## Step 6: Hand off

> Wrote 6 files and mapped 1 Katalon case (TC-1042 -> `cypress/e2e/storefront/search-and-cart.cy.ts`).
> `npx cypress run` passed in 12.4s; `cypress/results/junit-a3f19c.xml` contains TC-1042.
> No conversion gaps: every step maps 1:1, no tab or origin crossing.
> Not done here: the report is on disk and not yet in the platform. Use `upload-report` with type `junit` and path `cypress/results` to ship it.

Report the boundary as part of the result. Do not say the case is automated in the platform when only the file exists on disk.

## A variant that hits a boundary

If step 2 of the case had read *"Log in with the corporate SSO provider"*, the correct output is not a spec that pretends to work:

> Step 2 crosses into a third-party identity origin. Cypress needs `cy.origin()` for that, and many providers block automated login outright. Options: (a) seed the session via an API request in `loginAsShopper` and skip the SSO UI, (b) wrap the provider in `cy.origin()` and expect it to be brittle, (c) leave step 2 manual and start the spec from an authenticated session. Which do you want?

Flagging the gap with the case ID and the step number is the deliverable. Silently dropping the assertion is the failure mode this rule exists to prevent.
