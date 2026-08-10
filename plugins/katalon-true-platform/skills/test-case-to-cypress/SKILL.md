---
name: test-case-to-cypress
description: Convert Katalon True Platform/TestOps manual test cases, test suites, or requirement-linked cases into Cypress end-to-end automation in JavaScript or TypeScript. Use when you need to fetch/read Katalon Platform test cases and write specs under cypress/e2e, scaffold or adapt the project and its config, apply custom commands in cypress/support, fixtures in cypress/fixtures, and an app-action or page-object layer, or translate manual steps into readable cy commands and Chai assertions. The runner underneath is Mocha, so this skill also wires a Mocha JUnit reporter so the finished run can be shipped to the platform. This skill writes specs that do not exist yet. An existing suite that has become unreliable belongs to test-maintenance, and a report already sitting on disk belongs to upload-report. Written for the automation tester converting a manual case into specs that fit an existing custom-command and fixture layer.
---

# Katalon Test Case To Cypress Spec

Use this skill to turn Katalon Platform/TestOps test cases into maintainable Cypress end-to-end specs. Prefer existing project patterns when a Cypress project already exists. Treat the human as a tool: ask concise questions whenever a required target, credential, repository, AUT detail, or test data value cannot be discovered safely.

## Workflow

```text
+-------------------+ --> +-------------------+ --> +---------------------+
| Resolve Katalon   |     | Read test cases   |     | Resolve project     |
+-------------------+     +-------------------+     +---------------------+
                                                           |
                                                           v
+-------------------+ <-- +-------------------+ <-- +---------------------+
| Verify specs      |     | Write specs       |     | Map manual steps    |
| + JUnit XML       |     | + custom commands |     | to cy commands      |
+-------------------+     +-------------------+     +---------------------+
```

## Availability Boundary

State the boundary before promising automation. It has three parts and none of them is optional.

**Available through Katalon MCP**

- Resolve context with `list_projects` and `list_repositories`.
- Read the source case with `find_test_cases` and `read_test_case`.
- Resolve a requirement key with `find_requirements`, `read_requirement`, and `find_test_cases_by_requirement`.
- Read platform-side suites with `find_test_suites` and `read_test_suite`.

**Not available through Katalon MCP**

- There is no Cypress tool in the MCP at all. It does not generate code, does not run `cypress run`, and does not read the live AUT DOM to supply a selector. Use Browser/Playwright for selector discovery.
- No MCP tool creates requirements. Requirements are synced from Jira or Azure and can only be found, read, and linked.
- No MCP tool executes this skill's output or uploads its report. Cypress results reach the platform through `upload-report` on the JUnit path.

**No tool binds a spec file to a test case, and the workaround is load-bearing**

Nothing in the MCP attaches a script file, a spec path, or an automation binding to a Katalon test case. Do not fake it with `update_test_case`. That tool edits the manual case's own content, and writing a repo-relative file path into a manual case's description creates a string that no build validates, no rename updates, and no reader can trust six weeks later. That is drift wearing traceability's clothes.

Design around it instead. Put the Katalon case ID at the **front of the Cypress test title**:

```text
it('TC-1042 Search an in-stock phone and add it to the cart', ...)
```

Mocha writes that title into the JUnit `<testcase>` element, and `upload-report --type=junit` carries the XML into the platform. The ID makes the whole trip with no binding tool, over surfaces that already exist. The consequence is a rule, not a style note: **the test title is the traceability contract, and renaming a test breaks the link the same way renaming a public function breaks a caller.**

Read `true-platform-testing/references/unavailable-capabilities.md` when the user asks what Katalon can do through MCP.

## Katalon Source

Resolve the Katalon context before writing code:

- Use Katalon MCP tools when available to list projects, list repositories/Test Projects, find test suites, find test cases, and read each selected test case.
- If the user gives a test suite, read the suite and every included test case before generating specs.
- If the user gives requirement keys, find requirement-linked cases first.
- If MCP tools are unavailable or authentication fails, ask the user for exported test cases, case URLs, case IDs, or the test case text.
- Preserve traceability by putting the Katalon case ID at the start of the `it()` title. Repeat it in a `cy.log()` or a leading comment only if the team wants it visible in the run output.

Extract for each case: title, priority, requirement links, folder/suite, preconditions, test data, manual steps, expected results, AUT URL, user roles and accounts, environment, browser and viewport assumptions, and cleanup requirements. Flag ambiguous selectors and business data that need human input.

## Project Resolution

Inspect the workspace before creating anything:

- Search with `rg --files` for `cypress.config.*`, `cypress.json`, `package.json`, `cypress/`, `cypress/e2e/`, `cypress/support/`, `cypress/fixtures/`, and existing `*.cy.js` or `*.cy.ts` files.
- If a Cypress project exists, summarize the detected path, its conventions, and the files you intend to add, then ask the user to confirm before modifying it.
- A bare `cypress.json` beside a `cypress/integration/` folder is a pre-10 project. Do not silently migrate it. Say what migration would involve and ask.
- If multiple candidate projects exist, ask the user which one to use.
- If no Cypress project exists, ask whether the user wants to provide a Git repository/path or wants the agent to create a project in a target directory.
- If the user does not provide a repository/path after that prompt and the current workspace is writable, initialize a Cypress project in the current workspace.

When initializing a new project, use Cypress 10 or newer and include:

- `cypress.config.ts` (or `.js` when the repo is not TypeScript) with `baseUrl` sourced from the environment
- `cypress/e2e/` for specs, grouped in subfolders that mirror the Katalon folder structure
- `cypress/support/commands.ts` for custom commands and `cypress/support/e2e.ts` for global hooks
- `cypress/fixtures/` for static test data
- an app-action or page-object layer only when the case volume justifies it

Version floors worth stating before you rely on them: `cypress.config.*` and `cypress/e2e` need Cypress 10 or newer, `cy.session()` needs 12 or newer, and `cacheAcrossSpecs` needs 12.3 or newer.

Read `references/cypress-project.md` before scaffolding a new project or making broad changes to an existing one.

## Automation Design

Translate manual Katalon steps into Cypress specs using these rules:

- Prefer **app actions**, custom commands that perform a domain task, over deep page-object hierarchies. Cypress's own guidance favors this. Add page objects only where an existing project already uses them.
- Put anything repeated across specs into `cypress/support/commands.ts`, and declare its types in `cypress/support/index.d.ts` in a TypeScript project or the specs will not compile.
- Use `cy.session()` to cache login instead of driving the login form in every test.
- Use `cypress/fixtures/*.json` for static data and `Cypress.env()` for anything environment-shaped or secret-shaped. Never put a credential in a fixture.
- Prefer stable, user-facing or dedicated selectors: `data-cy`, `data-test`, `data-testid`, then role, label, and text. Avoid brittle CSS or XPath chains unless the app gives nothing better.
- Convert manual expected results into Chai assertions next to the action that produces them, using `.should()` so Cypress retries them.
- Keep one `it()` aligned to one Katalon test case unless the existing project groups scenarios differently.
- Keep every test independent. Do not let test 2 depend on state left by test 1.
- Do not silently invent credentials, URLs, product IDs, account state, or selectors. Ask the human, or leave a narrow TODO naming the exact missing value.

Write commands that read like the manual step they came from:

```ts
cy.loginAsShopper(data.shopper.username);
cy.searchCatalog(data.phone.name);
cy.expectCatalogResult(data.phone.name, data.phone.price);
cy.addVisibleProductToCart(data.phone.name);
cy.expectCartTotal(data.phone.price);
```

## Cypress Constraints That Change The Conversion

Some manual steps do not survive a literal translation. Detect these while reading the case and say so before writing code, not after.

- **Retry-ability, not `await`.** Cypress commands are enqueued, not promises. Never assign `cy.get(...)` to a variable and never `await` a `cy` command. Use `.then()` when a value is genuinely needed.
- **No arbitrary waits.** A manual step that says "wait for the page to load" becomes `cy.intercept()` plus `cy.wait('@alias')`, or a retrying assertion. `cy.wait(3000)` is a defect, not a translation.
- **One tab.** Cypress cannot drive a second browser tab. A step that opens a new tab is converted by asserting the target `href` and visiting it directly, or it is flagged as not automatable here.
- **Cross-origin needs `cy.origin()`.** A step that crosses into a third-party identity provider or payment host must be wrapped in `cy.origin()`, and some providers block automation entirely. Flag it. Do not fake it.
- **No OS or file-system actions in the browser.** Reading a file, querying a database, or checking an inbox goes through `cy.task()` in `setupNodeEvents`, or it is out of scope.

When a step hits one of these, report it as a conversion gap with the case ID and the step number. Do not quietly drop the assertion.

## Reporting For Upload

Cypress runs on Mocha, so any Mocha reporter works and JUnit XML is a first-class output.

- Add `cypress-multi-reporters` plus `mocha-junit-reporter` so the human-readable `spec` output and the machine-readable JUnit XML are produced in the same run.
- Write one XML file per spec using the `[hash]` placeholder in `mochaFile`. Cypress invokes the reporter once per spec file, so without the placeholder every spec overwrites the same file and only the last one survives.
- Point `upload-report` at the results **folder**, not at a single file, and no merge step is needed.
- Confirm the Katalon case ID appears inside the generated XML before handing off. That check, not the green tick, is what proves traceability survived.

Read `references/mocha-junit-reporting.md` before editing reporter config or composing the upload handoff.

## Implementation Rules

- Follow the existing repository's naming, linting, folder, command, and assertion conventions when present.
- Keep generated code idiomatic. In a TypeScript project keep the custom command types in sync with the commands.
- Store test data in the existing fixture pattern. If none exists, create a typed fixture rather than scattering literals across specs.
- Avoid changing unrelated Cypress config, `setupNodeEvents`, retries, viewport, or CI behavior unless the requested tests require it.
- Keep `retries` low and visible. Retries hide flake rather than fixing it, and `test-maintenance` owns the fix.
- If the AUT must be inspected to identify selectors, use Browser/Playwright for discovery and keep the resulting selectors stable.
- If live AUT access is blocked, implement the structure and mark only the selector and test data gaps that need human input.

## Worked Example

`TC-1042 Search an in-stock phone and add it to the cart`, in the Cellphone Shop project, linked to requirement CEL-6.

Resolve and read the source case:

```text
list_projects()                                      -> Cellphone Shop, id 4821
list_repositories(projectId: 4821)                   -> Cellphone Shop Web, id 91
find_test_cases(projectId: 4821, query: "TC-1042")   -> id 30514
read_test_case(id: 30514)
```

`read_test_case` returns six steps, shopper `shopper@example.test`, phone `Nexus 6` at unit price `650.00`. Those six steps become one `it()` whose title leads with the case ID, plus two custom commands and one fixture:

```ts
// cypress/e2e/storefront/search-and-cart.cy.ts
it('TC-1042 Search an in-stock phone and add it to the cart', function () {
  cy.loginAsShopper(this.data.shopper.username);   // step 2, cached with cy.session
  cy.visit('/');                                   // step 1
  cy.get('[data-cy=search-input]').should('be.visible');
  cy.searchCatalog(this.data.phone.name);          // step 3
  cy.get('[data-cy=result-row]')
    .should('contain', this.data.phone.name)
    .and('contain', this.data.phone.price)
    .and('contain', 'In stock');
  // steps 4 to 6 continue in the same shape
});
```

Step 1 is asserted after the login command because `cy.session()` caches the login and returns to a blank page. Visiting the storefront after restoring the session is the correct order, not a reordering of the manual case. The callback is `function ()` rather than an arrow function because `this.data` from a `cy.fixture().as()` alias is only available with a `function` callback.

Run it, then confirm the ID reached the XML:

```text
npx cypress run --spec "cypress/e2e/storefront/search-and-cart.cy.ts"
  Storefront search and cart
    ok TC-1042 Search an in-stock phone and add it to the cart (12402ms)
  1 passing (12s)

grep -o 'TC-[0-9]*' cypress/results/*.xml | sort -u
  cypress/results/junit-a3f19c.xml:TC-1042
```

The generated XML carries the ID in both attributes, which is exactly why the rule is "ID first in the title" and not "ID somewhere in the test":

```xml
<testsuites name="Cypress" tests="1" failures="0" time="12.402">
  <testsuite name="Storefront search and cart" tests="1" failures="0" time="12.402">
    <testcase name="Storefront search and cart TC-1042 Search an in-stock phone and add it to the cart"
              classname="TC-1042 Search an in-stock phone and add it to the cart"
              time="12.402"/>
  </testsuite>
</testsuites>
```

Then hand off: `upload-report`, type `junit`, path `cypress/results`. Report that the spec is on disk and **not** yet in the platform.

`references/worked-example.md` carries the full run: every MCP return value, all six files verbatim, and a variant where an SSO step hits a Cypress boundary.

## Verification

After writing specs:

- Run the narrowest available check: TypeScript compile, lint, `npx cypress verify`, or a targeted `npx cypress run --spec <path>`.
- Open the generated JUnit XML and confirm the Katalon case ID is present in the `<testcase>` element. A green run with a missing ID is not done.
- If the spec cannot run because credentials, AUT access, or dependencies are missing, report the exact blocker and what remains unverified.
- Report created and updated files with full paths, the Katalon cases they map to, every conversion gap flagged under Cypress Constraints, the commands run, and any value still needed from a human.
- Never say the case is automated in the platform when only the file exists on disk.

## Prompt recipes

- `Turn TC-1042 into a Cypress spec in ~/work/shop-tests.`
- `Convert every case linked to requirement CEL-6 into Cypress specs with shared custom commands.`
- `Wire a Mocha JUnit reporter into this Cypress project so I can upload the run to Katalon.`
- `Check that my Cypress spec titles still carry the Katalon case IDs into the JUnit XML.`

## Hand-offs

- Ship the finished run into the platform -> `upload-report`, report type `junit`, path `cypress/results`.
- Triage a red Cypress run -> `analyze-failures`.
- An existing Cypress suite that has become unreliable -> `test-maintenance`.
- The Katalon cases do not exist yet -> `create-test-cases`.
- The same conversion in Playwright -> `test-case-to-playwright`, in Selenium -> `test-case-to-selenium`, in Katalon Studio -> `test-case-to-katalon-studio`.
