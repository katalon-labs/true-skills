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

- **Available.** Resolve scope with `list_projects`, `list_repositories`, and `find_iterations`. Read coverage and risk with `get_requirement_insights`, `get_test_configuration_insights`, `analyze_test_case_stability`, `analyze_test_flakiness`, `find_requirements`, and `find_test_cases_by_requirement`. Build the structure with `manage_test_folder` and `manage_test_suite`. Read existing schedules with `list_schedule` and `read_schedule_detail`. Edit them with `update_schedule_configuration`. Read suite collections with `find_test_suite_collections`.
- **Not available.** No tool creates a Release, a Build, a Test Plan, a release gate, or a suite collection. No documented suite field binds a suite to a sprint or release. Check the tool schema before you claim one. If none exists, put the iteration name in the suite name.
- **Another skill owns this.** Starting or scheduling a run is `execute-test`. It needs consent because runs use Katalon Test Execution - Cloud (formerly TestCloud) minutes.

## Planning workflow

```text
Resolve scope -> Read coverage and risk -> Rank what first
      |                                         |
      v                                         v
Propose the plan in chat -> Confirm -> Build execution scope -> Read back
```

## Steps

1. **Resolve scope.** Call `list_projects`, then `list_repositories`. Use the one match if the user's words fit exactly one. Otherwise ask. Call `find_iterations` when the user names a sprint or release. It gives the name and the dates.
2. **Read coverage and gaps.** Call `get_requirement_insights` for the iteration. Call `find_test_cases_by_requirement` for any requirement that looks uncovered. A requirement with no linked case is the top gap. Call `find_requirements` or `read_requirement` when the user gives keys.
3. **Read the risk signals.** Call `get_test_configuration_insights` for under-covered browsers and platforms. Call `analyze_test_case_stability` for flaky, always failing, newly failing, and slow cases. When you rank an area as unstable, call `analyze_test_flakiness` with a minimum run count of about 10. Fewer runs are too thin to trust. Do not invent traffic, change rate, or defect rate. Use those numbers only when the user supplies them, and cite the source.
4. **Rank by risk.** Order: requirement gaps, then areas with recent change or heavy use, then unstable areas, then configuration gaps. State the signal behind each rank. See `references/planning-workflow.md` for impact-based selection and the recall check.
5. **Check what already exists.** Call `find_test_folders`, `find_test_suites`, and `find_test_suite_collections`. Reuse a folder, suite, or collection that already fits. Call `list_schedule` when the scope may already run on a schedule. Read the match with `read_schedule_detail`.
6. **Propose the plan in chat.** Use the output template in `references/planning-workflow.md`. Show objectives, scope, the coverage matrix, the risk ranking, environments, and the folder and suite you will create. Keep manual and automated cases in separate suites. `manage_test_suite` rejects a suite that mixes the two.
7. **Create the execution scope after one confirmation.** Follow `references/write-policy.md`: preview every create and edit, get one yes, run the calls, read back. Use `manage_test_folder` and `manage_test_suite`. Add the chosen cases. `update_schedule_configuration` edits existing schedules. Pass every target schedule in one call.
8. **Read back and report.** Call `read_test_suite`. Report the suite ID and folder path as the execution scope. List the open gaps as the backlog.

## Plan wording

- Say "execution scope" for the folder and suite.
- Say "plan" only for the text you wrote in chat. Offer to store that text where the team keeps plans, such as the Jira or Azure DevOps issue or a document.
- If the user asks you to bind the suite to a sprint, say what the tools support today and name the workaround (iteration name in the suite name).

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
