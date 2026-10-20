# Maintenance loop reference

Read this before you repair cases.

## Detect, diagnose, repair, validate, feed back

```text
stability and history -> per-case decision -> reviewed edit -> rerun -> gap list -> plan
```

## Per-case decision table

| Signal | Decision | MCP action |
|---|---|---|
| Mixed results on the same build (history) | Flaky. Stabilize. | `update_test_cases` with `UPDATE_CONTENT` for waits or data. Flag for a Studio object review if the case is a Studio test. |
| Consistent failure after an app behavior change | Regenerate | Hand to `create-test-cases`. It can draft from captured TrueTest sessions. |
| Step or element gone from the app | Repair or retire | `update_test_cases` to match the new flow. Retire with approval through `UPDATE_STATUS` set to `INACTIVE`. |
| Near-duplicate drift | Consolidate | `search` to find the near-duplicates, `duplicate_test_case` for a base, `move_test_case`, keep one canonical case. |
| Wrong folder or suite after a refactor | Reorganize | `move_test_case`, `manage_test_folder`, `manage_test_suite`. |
| Always passes across the whole stability history | Review for saturation | Confirm with `fetch_test_stability_metrics` that it still exercises the risk path. Strengthen it with `update_test_cases`, or consolidate. |
| Linked requirement changed | Check the case first | `find_test_cases_by_requirement`, then read each case (`read_test_cases`, `content_type` `FLOW`) against the new requirement text. |
| Link between a case and a requirement is wrong or missing | Re-link | `manage_requirement_test_case_linkages` with `link` or `unlink`. Unlink needs a yes that names the links. Read back with `find_test_cases_by_requirement`. |

## Flaky labels

- Source: run history for the same test on the same build (`fetch_test_stability_metrics` with `return_tests: ["FLAKY"]` and `from_date` and `to_date`). The tool has no minimum-run parameter. Count the runs with `find_test_results` and report the lookback window and the run count.
- A model may suggest a root-cause category (timing, shared state, data, environment). The label itself comes from history.
- A label that drives a quarantine needs two independent evidence sources that agree. Quarantine means `UPDATE_STATUS` set to `INACTIVE`, or a move to a quarantine folder, after approval. `UPDATE_AUTOMATION_STATUS` is a separate field. Do not use it as a lifecycle status, and do not use `testType` as a substitute for either.
- A quarantined case stays on the gap list until a person fixes or retires it.

## Healing levels

Autonomous repair has hard limits. One May 2026 study of 636 repair executions (arXiv 2605.01471, abstract checked 2026-10-20) reported about 10 percent first-attempt success, a mean of 3.4 repair iterations, and agents that sometimes reached "green" by weakening assertions or deleting tests. The guardrails in `SKILL.md` answer those failure modes.

- **Runtime only.** The fix applies to one run. A person reads the audit entry (original, healed value). This suits locator drift.
- **Reviewed change.** The fix is a diff or pull request. A person reviews and merges it. This is the default for anything that persists.
- **Auto-merge.** Only with a standing approval for a named scope.

For any healed locator, require three checks: the new locator is unique, the element is visible, and the action type still fits (click, type, select). Then require an outcome assertion that proves the page reached the right state.

The Playwright healer (Playwright 1.56 or later) replays a named failing test, proposes a patch for a locator, a wait, or data, and reruns. It may also decide the feature is broken and skip the test. Treat a skip as a result for a person to review. It is never a repair.

## Assertion-count diff

Before each repair, count the checks in the case. For a manual case that means the expected results. For a Playwright test it means the `expect` calls. After the repair, count again.

```text
Case:               <id>
Checks before:      <n>
Checks after:       <n>
Change:             same | added | dropped (stop, ask a person)
```

## Boundaries to state

- Self-healing locators, Time Capsule object repair, Studio Tracer, and object-repository refactoring are Katalon Studio desktop features.
- MCP maintenance edits test-case content (title, steps, expected results, data, links, location) and reorganizes assets.
- Case names accept letters, digits, spaces, and `( ) . , _ -`.

## Close the loop

Maintenance is not done at "green again". Emit this block:

```text
Repaired:     <cases and what changed>
Regenerate:   <cases handed to create-test-cases and why>
Retired:      <cases and approval note>
Quarantined:  <cases, evidence sources, approver>
New gaps:     <coverage now missing> -> test-plan
Stability:    <flaky count before and after, window used>
Guardrails:   <assertion-count diff result, healing level used>
```

## Safe-mutation rules

- Prefer `update_test_cases` and `move_test_case` over `delete_test_case`. Deleting a case is permanent and needs a yes that names the case.
- Put every intended edit for one case into a single `update_test_cases` call. Actions run in order, so separate calls for one case can race.
- `UPDATE_CONTENT` replaces every step. Send the complete step list, keep Call Test Case actions, and omit `context` or include `expectedResult` (never `context: {}`).
- `repository_id` is required. Resolve it with `list_repositories` and carry it into every call.
- Preview bulk changes, and get one confirmation for the set. Name every retire or delete target in that confirmation.
- Read the case back with `read_test_cases` after each write and compare it with the preview. Count only applied and unchanged outcomes as success. If a batch fails part way, stop and report which cases changed.
