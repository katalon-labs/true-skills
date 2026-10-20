# Manual Test Case Format

Use this format when you generate cases for Katalon True Platform.

## Fields

- Name: short, verb-led title. Use letters, digits, spaces, and `( ) . , _ -` only. The platform rejects `@ : /` in a name.
- Description: one or two sentences about the behavior under test.
- Pre-condition: environment, account, seed data, cart state, login state, AUT URL, and browser or device assumptions.
- Test Steps: manual-style actions. Start with navigation when page context matters.
- Expected Results: the observable outcome for each step.
- Test Data: the concrete values used by the step, or `N/A`.
- Priority: P0 critical path, P1 important functional path, P2 secondary or edge path. The tool field `priority` takes LOW, MEDIUM, HIGH, or CRITICAL. Map P0 to CRITICAL, P1 to HIGH, and P2 to MEDIUM or LOW.
- Requirement IDs: internal requirement IDs or source keys, when linking is requested.

## Step Quality Rules

- Write one user action per step.
- Use visible labels and URLs. Do not use implementation selectors.
- Put checks in Expected Results. Keep the action free of checks.
- Avoid "verify everything looks correct". Say what must be visible or changed.
- Split a long end-to-end flow when its setup makes a single failure hard to diagnose.

## Katalon Import Notes

- Before you create cases, search existing coverage. Use `find_test_cases_by_requirement` when requirement IDs are known. Use `search` with `types` set to `["test_case"]` and `include_documents` set to `false` to find similar cases by meaning. An exact or strong tier hit means the case exists. No hit does not prove it is missing, and a response with `incomplete=true` or a warning proves nothing. Use `find_test_cases` by title, requirement key, feature area, and folder.
- Read house style from one or two similar published cases with `read_test_cases` and `content_type` set to `FLOW`. Check `memory_list` once for team naming and step conventions. If memory is unavailable, say so and go on.
- Reuse or update a matching case. Do not create a duplicate.
- Create manual cases with `create_test_case`. The name starts with a letter or digit. The `path` starts with `Test Cases`. A case of type AUTOMATED creates nothing. To call a shared flow, use a step `action` object of type `call` with the target `test_case_id`. Never write a plain step named "Call test case 12".
- Link requirements after creation with `manage_requirement_test_case_linkages` and `action` set to `link`. One call links many requirements to many cases. Requests run in parallel, so a partial failure leaves some requirements linked. Read back with `find_test_cases_by_requirement`.
- Read back each important case with `read_test_cases` and `content_type` set to `FLOW`.
- Revise an existing case with `update_test_cases`. It needs `repository_id` and an `updates` list. Each item has one `action`, such as `RENAME`, `UPDATE_DESCRIPTION`, `UPDATE_PRECONDITION`, `UPDATE_PRIORITY`, `UPDATE_STATUS`, or `UPDATE_CONTENT`, and a `test_case_data` object with the case `id`. Put every change to one case in one call, because actions run in order. `UPDATE_CONTENT` replaces all steps, so send the full step list and keep every Call Test Case step. Omit `context` on a step, or include `expectedResult`. Never send an empty `context`.
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
