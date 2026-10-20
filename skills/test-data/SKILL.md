---
name: test-data
description: Designs the data a Katalon True Platform (formerly TestOps) test case runs on. Covers which values and records a case needs, keeping literals and credentials out of steps, and how to seed and reset state for manual and automated lanes. Use when the steps are settled and values, fixtures, or cleanup block the run. Not for writing steps (create-test-cases) or code (test-case-to-playwright). For the manual tester and the automation tester.
license: MIT
compatibility: Requires the Katalon True Platform MCP server and network access. Automation lane examples use TypeScript and Playwright.
metadata:
  version: "0.5.0"
  mcp-contract: "katalon-docs-2026-10"
---

# Katalon Test Data

This skill covers the data half of test design: which values a case runs on, which records must exist when it starts, and what must be true again when it ends. The steps belong to `create-test-cases`. The code belongs to `test-case-to-playwright`. The values, the state, and the cleanup belong here. Tool names below are bare. Clients add a prefix (Claude Code: `mcp__<server>__<tool>`).

One artifact serves both lanes. Call it the data contract: what must exist, which values, and who resets it. A manual case carries the contract in its Pre-condition and per-step Test Data column. An automated suite carries the same contract in a fixture plus a teardown. Design it once. Write it down twice.

## What the MCP can and cannot do

Three different things in the Katalon world are called "test data". The MCP reaches only one of them.

- **Can:** resolve scope (`list_projects`, `list_repositories`), read the requirement the data must satisfy (`find_requirements`, `read_requirement`), find the cases (`find_test_cases`, `find_test_cases_by_requirement`, `read_test_case`), write the Pre-condition and the per-step Test Data column (`create_test_case`, `update_test_case`), read the target environment (`read_auts`), and group data-dependent cases (`manage_test_folder`, `find_test_suites`, `read_test_suite`, `manage_test_suite`).
- **Cannot, at all:**
  - **Test-data entities.** A standalone Test Data object (CSV, Excel, internal, database) is a Katalon Studio desktop artifact. The MCP does not create, read, or bind it.
  - **Secrets and variables.** Project `SECRET` and `VAR` entries live in the platform UI under Settings, Configurations, Secrets & Variables. Steps reference them as `{KEY}`. They apply to cloud-hosted execution only and are scoped to the project. No tool reads or writes them.
  - **Seeding, teardown, database access, or API calls.** Nothing in the MCP creates or destroys application state.
  - **Requirement creation.** Requirements sync from Jira or Azure DevOps. Create them there, then find and link.
- **Do not invent tools.** No tool exists for test data, fixtures, secrets, seeding, environment reset, or database queries. When a workflow seems to need one, use the workaround below and state the boundary.
- **Run with AI reads the case body only.** Data that is missing from the Pre-condition and the Test Data column never reaches the AI runner. The placement rule below follows from this.
- **Workaround, the data contract that needs no missing tool:**
  - Manual lane: the Pre-condition plus the per-step Test Data column, written with `update_test_case`.
  - Automation lane: a checked-in fixture or factory, plus the seed command named in the case Pre-condition so both lanes start from the same state.

Read `references/write-policy.md` before you change cases.

## Workflow

```text
+------------------+ --> +---------------------+ --> +----------------------+
| Resolve scope    |     | Derive data classes |     | Choose data strategy |
+------------------+     +---------------------+     +----------------------+
                                                                |
                                                                v
+------------------+ <-- +---------------------+ <-- +----------------------+
| Verify, run twice|     | Plan seed + teardown|     | Place the data       |
+------------------+     +---------------------+     +----------------------+
```

## Steps and tool rules

1. **Resolve scope.** Call `list_projects`, then `list_repositories`. If exactly one matches the user's wording, use it. Call `read_auts` to learn which environment the data must exist in. Data built for the wrong environment is worse than none.
2. **Derive the data classes. Do not guess values.** Read the requirement with `read_requirement`. Read the cases with `find_test_cases_by_requirement`, then `read_test_case` on each. Turn each condition into a data class. Rank the conditions by risk first. Use equivalence partitioning and boundary values as tools to find the classes. One class maps to one case, matching the atomic-case rule. Read `references/data-design.md` before deriving classes for a non-trivial requirement.
3. **Choose the strategy per class.** Pick static, generated, or cloned from production for each class. Never use one strategy by default. The trade-offs are in `references/data-design.md`. Say which you chose and why.
4. **Place the data.** Apply the placement rule below.
5. **Plan seed and teardown together.** Use the seeding ladder in `references/seed-and-teardown.md`: application API first, CLI or SQL second, UI last. Record the seed command in the case Pre-condition.
6. **Write the changes.** List every case you will update and the fields that change. Show the list. Get one confirmation for the set. Then call `update_test_case` once per case with every edit in one call. Follow `references/write-policy.md`.
7. **Verify, then run twice.** Call `read_test_case` for each updated case and confirm the data landed. Then run the real check: the suite must pass twice in a row from the state the first run left behind, with no manual reset. A second-run failure is a data defect.

## The placement rule

Concrete values do not belong in step text or in a spec file. They belong in a named place, one per lane.

| Data | Manual lane | Automation lane |
|---|---|---|
| Values the step consumes | per-step Test Data column | typed fixture or factory module |
| State that must pre-exist | case Pre-condition, with the seed command named | `globalSetup` or a fixture that creates it |
| Environment or AUT URL | Pre-condition, or the AUT environment from `read_auts` | config or env var, never a literal in a spec |
| Credentials and tokens | `{KEY}` reference to Secrets & Variables | environment variable, never checked in |
| Cleanup | an explicit reset step in the Pre-condition or final step | teardown in the fixture that created the state |

Two rules follow from it.

- A step reads `Enter the loyalty email`. It never reads `Enter qa+cel9@example.com`. The value goes in the Test Data column, so the step survives a data change.
- A fixture owns creation and destruction of the same record. If one function creates it and a different one deletes it, they drift and the second run fails.

## Credentials are not test data

This rule is hard.

- Never write a password, token, API key, cookie, JWT, or MFA code into a step, a Test Data column, a fixture file, a Pre-condition, or the chat.
- Reference a platform secret as `{KEY}`. Tell the human to create it in Settings, Configurations, Secrets & Variables. That page is UI-only.
- In code, read from an environment variable. Commit only the variable name.
- If a user pastes a real credential, do not store it in a case or a file. Ask them to add it as a secret and use the `{KEY}` reference.
- Production clones carry real people's data. Mask or synthesize identifying fields before anything goes into a case, a fixture, or a report. Details are in `references/data-design.md`.

## Seed and teardown

The full ladder, idempotency rules, and per-lane patterns are in `references/seed-and-teardown.md`. The short version:

- Prefer the application's own API. It is fast, it uses the product's code path, and it fails loudly.
- Fall back to a CLI or SQL when no API exists. Say in the report that the seed bypasses application rules.
- Seed through the UI only as a last resort. Never seed inside the test that measures the behavior. A setup failure would read as a product failure.
- Make every seed idempotent. Running it twice leaves one record.
- Make every key unique per run. A run stamp such as `qa+cel9-20260810-1432@example.com` prevents collisions and lets teardown find what it created.
- Tear down what you created, in the place that created it. A nightly cleanup job does not count.
- Never seed or clean a production environment. Confirm the target with `read_auts` before any destructive step.

## Worked example

**Input.** Project `Cellphone Shop`, requirement `CEL-9` synced from Jira:

> A returning shopper whose loyalty tier is Silver or above receives 10% off when the cart subtotal reaches $500. The discount applies once per order and never applies to gift cards.

Call `find_test_cases_by_requirement` with the key `CEL-9`. It returns three existing cases with empty Test Data columns:

```text
TC-2101  Apply loyalty discount at the subtotal threshold
TC-2102  No loyalty discount below the subtotal threshold
TC-2103  Loyalty discount excludes gift cards
```

**Step 2 output, the data classes.** The requirement states four conditions, so there are four classes. The threshold adds boundary values.

| Class | Account | Cart | Expected |
|---|---|---|---|
| At threshold, eligible tier | Silver | subtotal exactly 500.00 | 10% applied, total 450.00 |
| Below threshold, eligible tier | Silver | subtotal 499.99 | no discount, total 499.99 |
| At threshold, ineligible tier | Bronze | subtotal 500.00 | no discount |
| Gift card in cart | Silver | 1 gift card 500.00 | no discount |

**Step 3 output, the strategy.** Generated per run. The test mutates loyalty tier and order history, so a shared static account goes stale after the first run. Cloned production accounts carry real customer PII for no benefit.

**Step 4 output, the manual lane.** After the user confirms the update set, make one `update_test_case` call per case. For `TC-2101`:

```text
Pre-condition:
  Storefront reachable at the Cellphone Shop AUT environment.
  Seed a Silver-tier account with zero orders this month, using:
    npm run seed -- --profile loyalty-silver --stamp <run-stamp>
  Cart is empty. Log in as the seeded account.

| Step | Test Step                          | Expected Result                         | Test Data                          |
| 1    | Navigate to the storefront         | Storefront home page is displayed       | {AUT_URL}                          |
| 2    | Log in as the loyalty shopper      | Account menu shows the Silver badge     | qa+cel9-<run-stamp>@example.com / {LOYALTY_PASSWORD} |
| 3    | Add the listed phone to the cart   | Cart subtotal shows 500.00              | Model A-500, quantity 1, 500.00    |
| 4    | Open the cart                      | Loyalty discount line shows -50.00 and the order total shows 450.00 | N/A |

Teardown: delete the seeded account with
  npm run seed -- --teardown --stamp <run-stamp>
```

**Expected output of the verification.** `read_test_case` on `TC-2101` returns a non-empty Test Data value on steps 1 to 3, the seed command inside the pre-condition, `{LOYALTY_PASSWORD}` as a reference with no literal, and the requirement link to `CEL-9` intact. If the Test Data column comes back empty, the update did not land. Re-issue the single update call. Never create a second case.

**Step 4 output, the automation lane.** The same contract as a typed factory, with creation and destruction in one place:

```ts
// fixtures/loyalty-data.ts
export type LoyaltyShopper = { email: string; tier: 'Bronze' | 'Silver'; teardown: () => Promise<void> };

export async function createLoyaltyShopper(tier: 'Bronze' | 'Silver'): Promise<LoyaltyShopper> {
  const stamp = `${Date.now()}`;
  const email = `qa+cel9-${stamp}@example.com`;
  await api.post('/test-support/accounts', { email, tier, password: process.env.LOYALTY_PASSWORD });
  return { email, tier, teardown: () => api.delete(`/test-support/accounts/${email}`) };
}

export const CART = {
  atThreshold:   { sku: 'A-500', quantity: 1, subtotal: 500.00, expectedTotal: 450.00 },
  belowThreshold:{ sku: 'A-499', quantity: 1, subtotal: 499.99, expectedTotal: 499.99 },
  giftCard:      { sku: 'GIFT-500', quantity: 1, subtotal: 500.00, expectedTotal: 500.00 },
};
```

**Expected report to the user.** Name each item. A report with no boundary line is incomplete.

```text
Data contract for CEL-9, 4 classes across 3 cases.
Strategy: generated per run. Reason: the test mutates tier and order history.
Manual lane: TC-2101, TC-2102, TC-2103 updated after your confirmation. Pre-condition carries the seed command, Test Data column carries the values.
Automation lane: fixtures/loyalty-data.ts creates and tears down the shopper in one factory.
Credentials: LOYALTY_PASSWORD referenced as {LOYALTY_PASSWORD} and as an env var. Not stored in any case or file.
Second-run check: pending. Run the suite twice with no reset between runs before trusting these cases.
Boundary: the Katalon MCP has no test-data, seeding, or secrets tool. {LOYALTY_PASSWORD} must be created by hand
  in Settings, Configurations, Secrets & Variables, which is UI-only and applies to cloud-hosted runs only.
```

## Prompt recipes

- `Design the test data for requirement CEL-9 and write it into the existing cases.`
- `These cases have values hard-coded in the step text. Move them into the Test Data column and give me the seed command.`
- `Seed and tear down the order data for tonight's run, manual lane and Playwright lane using the same records.`
- `Our suite passes once and fails on the second run. Find the missing teardown.`
- `What data does this requirement need before anyone writes a case for it?`

## Hand-offs

- No cases exist yet: `create-test-cases`, then come back for the data.
- Turning the case into code, where the fixture lives: `test-case-to-playwright`.
- Running the cases once the data exists: `execute-test`, or `playwright-execute` for the coded lane.
- A red run that may be a data problem: `analyze-failures`. It routes environment and data failures back here.
- Cases that keep breaking on stale data: `test-maintenance`.
- Scoping the cycle before any of this: `test-plan`.

Read `references/data-design.md` before deriving data classes or choosing a strategy. Read `references/seed-and-teardown.md` before writing any seed or teardown.
