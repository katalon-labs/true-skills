---
name: test-maintenance
description: Keeps a Katalon True Platform (formerly TestOps) regression suite trustworthy as the application changes. It reads stability and result history, decides per case whether to repair, regenerate, or retire, applies reviewed repairs under healing guardrails, and feeds gaps back to planning. Use when a suite has drifted, tests turned flaky or stale, or a UI change broke many cases. Not for one red run (analyze-failures) or new cases (create-test-cases). For the automation tester and the test lead.
license: MIT
compatibility: Requires the Katalon True Platform MCP server and network access.
metadata:
  version: "0.5.0"
  mcp-contract: "katalon-docs-2026-10"
---

# Test Maintenance

This skill covers the maintenance stage. It keeps the regression suite healthy over time and feeds what it learns back to the plan. It consumes stability and result history and produces repairs plus a refreshed coverage gap list.

The reader is the automation tester who repairs a suite that has started to lie, and the test lead who has to keep it trustworthy.

Katalon True Platform (formerly TestOps) holds the cases and the results. Clients add a prefix to tool names (Claude Code uses `mcp__<server>__<tool>`). This skill uses bare names.

## What the MCP gives you

| Need | Tool |
|---|---|
| Stability and flaky history | `fetch_test_stability_metrics` |
| Results and executions | `find_test_results`, `read_execution`, `list_executions` |
| Impact of a requirement change | `find_requirements`, `find_test_cases_by_requirement` |
| Coverage after the change | `fetch_requirement_metrics`, `fetch_test_case_metrics` |
| Find a similar or duplicate case | `search` |
| Read and repair cases | `find_test_cases`, `read_test_cases`, `update_test_cases`, `move_test_case`, `duplicate_test_case` |
| Re-link requirements | `manage_requirement_test_case_linkages` |
| Reorganize | `manage_test_folder`, `manage_test_suite` |
| Confirm a repair | `rerun_execution` (automated only, consent needed), or a new run through `execute-test` |

Read each tool schema before the first call. This skill names only the parameters that change the answer.

Limits to state up front:

- MCP repairs are case-level content edits (title, steps, expected results, data, links, location, status). They are not object or script healing.
- Self-healing tests, Time Capsule, Studio Tracer, object refactoring, and StudioAssist Agent-mode edits are Katalon Studio desktop features. Code healing for Playwright happens in the user's repository, not through MCP.
- `update_test_cases` takes `repository_id` and an ordered `updates` list. Each item holds one action (`RENAME`, `UPDATE_STATUS`, `UPDATE_DESCRIPTION`, `UPDATE_PRECONDITION`, `UPDATE_PRIORITY`, `UPDATE_AUTOMATION_STATUS`, `UPDATE_CUSTOM_FIELD`, `UPDATE_ASSIGNEE`, `UPDATE_LINKED_TEST_CASES`, `REMOVE_LINKED_TEST_CASE`, or `UPDATE_CONTENT`) and a `test_case_data` object with the case `id`. Actions run in order. Put every change to one case in one call.
- `UPDATE_CONTENT` replaces all steps. Send the complete step list. Keep every Call Test Case step. A replacement that would silently drop a call is rejected.
- A case name starts with a letter or a digit and accepts letters, digits, spaces, and `( ) . , _ -`. Other characters fail.
- `delete_test_case` is destructive and permanent. Prefer `UPDATE_STATUS` with `INACTIVE`, or `move_test_case`. Delete only with a yes that names the case.
- `fetch_test_stability_metrics` has no minimum-run parameter. Count the runs per case with `find_test_results` before you trust a flaky signal.
- `rerun_execution` works only on an automated execution, and only after `read_execution` confirms the type. The platform docs do not say whether a rerun picks up edits to case content. Check the new result against the repaired case. If unsure, start a fresh run through `execute-test`. A manual TestPak never reruns this way.
- `search` finds cases by meaning. A hit carries a title and a reference only, so read the case with `read_test_cases` before you act on it. Cases created in the last few minutes can be missing, and a search with `incomplete=true`, `retrieval_mode="keyword_fallback"`, or a warning never proves that a case does not exist.
- MCP is stateless. Ask in chat for missing input and carry IDs from call to call.

## Workflow

```text
+---------------+   +---------------+   +---------------+   +---------------+
| Detect change |-->| Diagnose:     |-->| Repair under  |-->| Validate and  |
| impact        |   | repair, regen,|   | guardrails    |   | feed back     |
|               |   | or retire     |   |               |   | the gap list  |
+---------------+   +---------------+   +---------------+   +---------------+
```

1. **Detect impact.** Call `fetch_test_stability_metrics` with `filter_type` `ITERATION` (and `iteration_type`, `iteration_name`) or `EXECUTION` (and `execution_id`). Add `from_date` and `to_date` for the lookback window. Set `return_tests` to `["FLAKY", "ALWAYS_FAIL", "NEW_FAILURE", "SLOW"]` to get case lists. The default is three per category, so raise `limit_tests` for a long list. State the window and the run count per case. Use `find_test_results` and `read_execution` to see what changed across recent runs. After a requirement change, call `find_requirements` for the changed items and `find_test_cases_by_requirement` for the cases they link to. Check those cases first. Build one list of broken, flaky, and degraded cases.
2. **Label flaky from history.** A flaky case gave different results for the same test on the same build. Never label a case flaky from one read of its code. A flaky label that drives a quarantine needs two independent evidence sources that agree, for example run history and failure artifacts.
3. **Diagnose each case.** Read the case first with `read_test_cases` and `content_type` `FLOW` for the steps. Pick one:
   - **Repair.** The case is salvageable. Fix data, steps, or expected results with `update_test_cases`. Reorganize with `move_test_case`. Branch a variant with `duplicate_test_case`.
   - **Regenerate.** The behavior changed enough that the case needs re-derivation. Hand it to `create-test-cases`, which can also draft cases from captured TrueTest sessions.
   - **Retire.** The behavior is gone. Name the cases and get an explicit yes. Prefer `UPDATE_STATUS` with `INACTIVE`, or a move to a retired folder, over `delete_test_case`.
4. **Repair under the healing guardrails** (next section). Follow `references/write-policy.md` for every write: preview the set, get one confirmation, execute, read back with `read_test_cases`.
5. **Validate.** Confirm the repair through a new run (`execute-test`) or, for an automated execution, `rerun_execution`. A green result alone is not confirmation. Compare the new result with the `find_test_results` record (filter_type `TEST_RESULT`, `include_details: true`) that triggered the repair and check that the case still exercises the original failure path.
6. **Feed back.** Send the refreshed gap list to `test-plan`. Call `fetch_requirement_metrics` (give `iteration_type` and `iteration_name`, and check the iteration exists with `find_iterations`) and `fetch_test_case_metrics` (give a `filter` with `filter_type` `ITERATION`, `DATE_RANGE`, or `DEFAULT`) to measure the gaps. When a requirement link broke, repair it with `manage_requirement_test_case_linkages`, which links or unlinks many cases and requirements in one call. Read the links back with `find_test_cases_by_requirement`. Maintenance that stops at green has not closed the loop.

## Healing guardrails

These rules hold for every repair, whether a person, an agent, or the Playwright healer makes it.

1. **Never weaken an assertion.** Do not remove it, loosen it, or swap a specific expected value for a generic one to get a pass.
2. **Never delete a test or a case to reach green.** Retire only with a named approval.
3. **Never add `test.fixme()`, `test.skip()`, or a disabled status without a person's approval.**
4. **Diff the assertion count before and after every repair.** For a manual case, count the expected results. Report any drop and stop until a person accepts it.
5. **Assert the outcome after a healed step.** A healed click that runs does not prove the page reached the right state. The case must still check the result of the interaction.
6. **Cap the attempts.** Stop after three repair attempts on one case and hand it to a person with the evidence.
7. **Keep an audit trail.** Record the original value, the new value, and the reason for each change in the report.

Choose a healing level and state it:

| Level | What happens | Default |
|---|---|---|
| Runtime only | The fix applies to one run. Nothing persists. A person sees the audit entry. | Yes, for locator drift |
| Reviewed change | The fix is a diff or pull request that a person reviews and merges. | Yes, for anything that persists |
| Auto-merge | The fix lands with no review. | Never, unless the user gives a standing approval for a named scope |

For a Playwright suite, run the Playwright healer only on a named failing test. The same guardrails apply. Use `test-case-to-playwright` for the code side.

## Prompt recipes

- `Which regression cases became flaky this month, and which should we repair vs regenerate?`
- `Repair the login suite after the new auth flow: update the affected cases and tell me what still needs re-authoring.`
- `After this release's UI change, refresh coverage and give me the gap list for next sprint.`

## Hand-offs

- Classify one failed run first: `analyze-failures`.
- Re-author changed behavior: `create-test-cases`.
- Confirm repairs: `execute-test`, then `test-review`.
- Refreshed gaps: `test-plan`.
- Code-side healing for Playwright: `test-case-to-playwright`.

Read `references/maintenance-loop.md` before you repair. It holds the per-case decision table, the healing detail, and the closing report.
