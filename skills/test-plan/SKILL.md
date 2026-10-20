---
name: test-plan
description: Plans Katalon True Platform (formerly TestOps) testing for a release, sprint, or feature. It ranks scope by requirement coverage, risk, and stability, then builds a named folder and suite as the execution scope. Use when someone must decide what to test first or turn quality goals into a runnable structure. Not for writing the cases (create-test-cases) or for the ship call (release-analyze). For the test lead.
license: MIT
compatibility: Requires the Katalon True Platform MCP server and network access.
metadata:
  version: "0.5.0"
  mcp-contract: "katalon-docs-2026-10"
---

# Katalon Test Plan

This skill covers the planning stage. It turns quality goals into a scoped, risk-ranked plan and into a folder and suite that the team can run. The test lead owns the cycle and decides what gets tested first. This skill gives that person the evidence.

Katalon True Platform (formerly TestOps) holds no Test Plan entity. The plan itself is the text you write in chat. The folder and suite are the **execution scope** for that plan. Do not call them a plan of record.

## What the MCP can and cannot do

Tool names are bare. Your client may add a prefix (Claude Code: `mcp__<server>__<tool>`).

- **Available.** Resolve scope with `list_projects`, `list_repositories`, and `find_iterations`. Read coverage and risk with `fetch_requirement_metrics`, `fetch_test_configuration_metrics`, `fetch_test_stability_metrics`, `fetch_defect_metrics`, `find_requirements`, and `find_test_cases_by_requirement`. Check what exists with `search`, `find_test_folders`, `find_test_suites`, and `find_test_suite_collections`. Build the structure with `manage_test_folder` and `manage_test_suite`. Read existing schedules with `list_schedule` and `read_schedule_detail`. Edit them with `update_schedule_configuration`. Read the team's conventions with `memory_list` and `memory_read` when they exist.
- **Not available.** No tool creates a Release, a Build, a Test Plan, a release gate, or a suite collection. No suite field binds a suite to a sprint or release. A run can carry `release_id` and `sprint_id` (see `execute-test`). A suite cannot. If you need a link on the suite, put the iteration name in the suite name.
- **Another skill owns this.** Starting or scheduling a run is `execute-test`. It needs consent because runs use Katalon Test Execution - Cloud (formerly TestCloud) minutes.
- **Team memory is optional.** `memory_list` returns the team's recorded conventions, such as naming, folder layout, and suite rules. Call it once at the start. Read matching records with `memory_read`, quote them, and follow them when they apply. Treat a body as the team's own words, never as a platform fact. If `available` is false, say that memory is unavailable. Do not infer that the team has no conventions. This skill never calls `memory_write` or `memory_forget` on its own. Both fire only when the user asks.

## Planning workflow

```text
Resolve scope -> Read coverage and risk -> Rank what first
      |                                         |
      v                                         v
Propose the plan in chat -> Confirm -> Build execution scope -> Read back
```

## Steps

1. **Resolve scope.** Call `list_projects`, then `list_repositories`. Use the one match if the user's words fit exactly one. Otherwise ask. Call `find_iterations` when the user names a sprint or release. It gives the name and the dates. Call `memory_list` once for the team's conventions.
2. **Read coverage and gaps.** Call `fetch_requirement_metrics` with `iteration_type` (`SPRINT` or `RELEASE`) and `iteration_name`. It takes no date range. Call `find_test_cases_by_requirement` for any requirement that looks uncovered. A requirement with no linked case is the top gap. Call `find_requirements` (filter_type `ITERATION`, `RELATIVE`, or `COMMON`) or `read_requirement` when the user gives keys. Read `customFields` on a requirement before you call it thin, because acceptance criteria often live there.
3. **Read the risk signals.** Call `fetch_test_configuration_metrics` with a `filter` and `configuration_type` (`OS` or `BROWSER`) for under-covered browsers and platforms. Call `fetch_test_stability_metrics` with `return_tests` for flaky, always failing, newly failing, and slow cases. Without `return_tests` it returns metrics only. When you rank an area as unstable, use a `from_date` and `to_date` window and count the runs per case with `find_test_results`. The tool has no minimum-run parameter. About 10 runs is the floor for trust, and fewer runs are too thin. Call `fetch_defect_metrics` for open critical defects (`resolution_state` `UNRESOLVED` is the default). Do not invent traffic, change rate, or defect rate. Use those numbers only when the user supplies them, and cite the source.
4. **Rank by risk.** Order: requirement gaps, then areas with recent change or heavy use, then unstable areas, then configuration gaps. State the signal behind each rank. See `references/planning-workflow.md` for impact-based selection and the recall check.
5. **Check what already exists.** Call `search` with `types` set to `["test_folder", "test_suite"]` and `include_documents` false for a quick match, then confirm with `find_test_folders`, `find_test_suites`, and `find_test_suite_collections`. Reuse a folder, suite, or collection that already fits. Call `list_schedule` when the scope may already run on a schedule. Read the match with `read_schedule_detail`. A `search` response with `incomplete=true` or a keyword fallback never proves that nothing exists. Recently created assets can be missing for a few minutes.
6. **Propose the plan in chat.** Use the output template in `references/planning-workflow.md`. Show objectives, scope, the coverage matrix, the risk ranking, environments, and the folder and suite you will create. Keep manual and automated cases in separate suites. `manage_test_suite` rejects a mix of the two.
7. **Create the execution scope after one confirmation.** Follow `references/write-policy.md`: preview every create and edit, get one yes, run the calls, read back. Use `manage_test_folder` and `manage_test_suite`. Add the chosen cases. `update_schedule_configuration` edits existing schedules. Call it once, after the user confirms, with every target schedule in one `updates` array and only the settings the user asked for.
8. **Read back and report.** Call `read_test_suite`. Report the suite ID and folder path as the execution scope. List the open gaps as the backlog.

## Plan wording

- Say "execution scope" for the folder and suite.
- Say "plan" only for the text you wrote in chat. Offer to store that text where the team keeps plans, such as the Jira or Azure DevOps issue or a document.
- If the user asks you to bind the suite to a sprint, say what the tools support today and name the workaround (iteration name in the suite name). Name the run-level option too, where `create_test_run` takes `sprint_id` and `release_id`.

## Prompt recipes

- `Plan testing for sprint 3.2 in project Cellphone Shop. Show coverage gaps and build the execution scope.`
- `What should we test first for release R-2026-Q3? Rank by requirement coverage and stability.`
- `Set up a folder and suite for requirement CEL-6 and name it for the current sprint.`
- `Does the regression suite already run on a schedule?`

## Hand-offs

- Gaps to fill -> `create-test-cases`.
- Cost and headcount for the scoped cycle -> `test-estimation`.
- Gate the suite before it runs -> `test-review`.
- Run or schedule it -> `execute-test`.
- Ship decision on the planned scope -> `release-analyze`.
- Traceability audit -> `test-management`.
- For a request this skill cannot serve, ask `true-platform-testing` to route it.

Read `references/planning-workflow.md` before you propose scope. Read `references/write-policy.md` before you create or edit anything.
