<!-- GENERATED from shared/references/manual-test-case-format.md - edit the source -->
# Manual Test Case Format

Use this format when you generate cases for Katalon True Platform.

## Fields

- Name: short, verb-led title. Use letters, digits, spaces, and `( ) . , _ -` only. The platform rejects `@ : /` in a name.
- Description: one or two sentences about the behavior under test.
- Pre-condition: environment, account, seed data, cart state, login state, AUT URL, and browser or device assumptions.
- Test Steps: manual-style actions. Start with navigation when page context matters.
- Expected Results: the observable outcome for each step.
- Test Data: the concrete values used by the step, or `N/A`.
- Priority: P0 critical path, P1 important functional path, P2 secondary or edge path.
- Requirement IDs: internal requirement IDs or source keys, when linking is requested.

## Step Quality Rules

- Write one user action per step.
- Use visible labels and URLs. Do not use implementation selectors.
- Put checks in Expected Results. Keep the action free of checks.
- Avoid "verify everything looks correct". Say what must be visible or changed.
- Split a long end-to-end flow when its setup makes a single failure hard to diagnose.

## Katalon Import Notes

- Before you create cases, search existing coverage. Use `find_test_cases_by_requirement` when requirement IDs are known. Use `find_test_cases` by title, requirement key, feature area, and folder.
- Reuse or update a matching case. Do not create a duplicate.
- Create manual cases with `create_test_case`. A case of type AUTOMATED creates nothing.
- Link requirements after creation with `link_requirements_to_test_case`.
- Read back each important case with `read_test_case`.
- Revise an existing case with `update_test_case`. See the tool schema for how it batches changes. When you update the steps, send the full list of steps.
- For many cases, plan the set, validate names and paths, get one confirmation, then write. Read back after the writes.

## Example Shape

```text
Name: Add selected product variant to cart
Description: Verify that a shopper can select a product variant and add the selected quantity to cart.
Pre-condition: Storefront is available. Cart is empty.

| Step | Test Step | Expected Result | Test Data |
| 1 | Navigate to product detail page | Product page is displayed with product heading. | https://... |
| 2 | Select color Ultramarine | Ultramarine option is selected. | Ultramarine |
| 3 | Select storage 128 GB | 128 GB option is selected and SKU/stock are displayed. | 128 GB |
| 4 | Click Buy | Product added confirmation is displayed and cart badge updates. | N/A |
```
