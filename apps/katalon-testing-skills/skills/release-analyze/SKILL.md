---
name: release-analyze
description: Assesses whether a Katalon True Platform (formerly TestOps) release, sprint, iteration, or suite is ready, from requirement, case, defect, stability, configuration, and execution data. It returns Ready, Ready with risk, or Not ready with a confidence level, the blockers, and the evidence. Use when someone must make or defend the ship call. Not for single failures (analyze-failures) or multi-release trends (test-reporting). For the test manager and the test lead.
license: MIT
compatibility: Requires the Katalon True Platform MCP server and network access.
metadata:
  version: "0.5.0"
  mcp-contract: "katalon-docs-2026-10"
---

# Release Analyze

This skill assesses release readiness from Katalon MCP data. The output is a testing-quality decision. A metric dump does not meet that bar. The skill only reads. It never changes the workspace.

The reader is the test manager who owns the ship call and the test lead who has to defend it.

Katalon True Platform (formerly TestOps) holds the data. Katalon Test Execution - Cloud (formerly TestCloud) runs the cloud executions. Clients add a prefix to tool names (Claude Code uses `mcp__<server>__<tool>`). This skill uses bare names.

## Availability boundary

State the MCP boundary before you promise an assessment.

- Available through the Katalon MCP: project and repository discovery, iterations, requirements, test cases, suites, executions and results, metrics on requirements, test cases, defects, and configurations, stability metrics, and the defects linked to results, cases, and executions.
- Not available: creating a formal Test Plan entity, inspecting the live AUT UI, guaranteeing that a Run with AI session completes, a count of reopened defects or release-blocking flags (take them from the tracker), and judging product or business readiness beyond test evidence.
- If MCP tools are unavailable, give only a framework and mark confidence Low until data is verified.

Read `references/capability-boundaries.md` when capability scope is unclear.

## Required scope

Resolve or ask for the minimum missing scope:

- The Katalon project and repository (Test Project).
- A release identifier, sprint, iteration, version, suite, suite collection, execution ID, or date range.
- The target environment and configuration matrix, when readiness depends on browsers, devices, OS, or deployments.
- The quality gate thresholds, when the team has defined them.

If the user gives only a release name or an issue key, use MCP discovery first. Ask only when several equally likely scopes remain. MCP is stateless: ask in chat and carry IDs from call to call.

## Data collection

Resolve context first:

1. Call `list_projects`.
2. Call `list_repositories`.
3. Resolve the repository.
4. Call `find_iterations` to pin the iteration, sprint, or release window.

Then collect evidence. Read each tool schema before the first call. This skill does not repeat parameters.

| Gate | Tool |
|---|---|
| Requirement coverage | `fetch_requirement_metrics`, `find_requirements`, `find_test_cases_by_requirement` |
| Test case quality | `fetch_test_case_metrics`, `find_test_cases` |
| Defect risk | `fetch_defect_metrics`, `fetch_defects` |
| Stability | `fetch_test_stability_metrics` |
| Configuration coverage | `fetch_test_configuration_metrics` |
| Executions and results | `list_executions`, `read_execution`, `find_test_results` |
| Suites and executable scope | `find_test_suites`, `read_test_suite`, `find_test_suite_collections` |

Use these parameters, and read each tool schema before the first call.

- `fetch_requirement_metrics` takes `iteration_type` (`SPRINT` or `RELEASE`) and `iteration_name`. It takes no date range. Check that the iteration exists with `find_iterations` first.
- `fetch_defect_metrics`, `fetch_test_case_metrics`, and `fetch_test_configuration_metrics` take a `filter` object. `filter_type` is mandatory: `ITERATION`, `DATE_RANGE`, or `DEFAULT` (last 28 days). `fetch_defect_metrics` defaults `resolution_state` to `UNRESOLVED` and accepts `RESOLVED` or `UNRESOLVED`. A question about all defects needs two calls.
- `fetch_test_configuration_metrics` also takes `configuration_type` (`OS` or `BROWSER`), `coverage_threshold` (default 0.8), `pass_threshold` (default 0.95), and `max_tests_per_platform` (default 10, 0 for all). Say the thresholds you used.
- `fetch_test_stability_metrics` takes `filter_type` `EXECUTION` with `execution_id`, or `ITERATION` with `iteration_type` and `iteration_name`, plus optional `from_date` and `to_date`. Set `return_tests` (`FLAKY`, `ALWAYS_FAIL`, `NEW_FAILURE`, `SLOW`, or `ALL`) to get case names. Without it the call returns metrics only. It lists three cases per category unless you raise `limit_tests`. It has no minimum-run parameter, so report the window you used.
- `find_test_results` with filter_type `EXECUTION` and `status` `FAILED` lists the failures of one execution. Its pages walk the execution's jobs. Page until the list ends.
- `fetch_defects` takes filter_type `TEST_RESULT`, `TEST_CASE`, or `EXECUTION`. A result with an empty `defects` list has no linked defect. Use it for the failed P0 and P1 results.

Use the freshest data for the release. When you report a trend or a stability figure, state the date range or lookback window.

Two checks protect against bad data:

- `list_executions` and `read_execution` use the numeric True Platform execution ID. `list_execution_outputs` uses the cloud (string) ID. Never swap them. `list_executions` defaults to the last 24 hours, so set both `start_time` and `end_time` from the real current date to cover the release.
- A stability result with all zeros while results show failures was seen on one project in August 2026. Cross-check the counts against `find_test_results` before you call a suite stable.

## Key metrics

Report the metrics that are available and relevant:

- Requirement coverage: total, covered, uncovered, linked test cases, and requirements without passing evidence.
- Test coverage: total tests, automated and manual split, unexecuted, blocked, stale, and incomplete cases.
- Execution health: latest executions, pass, fail, blocked, skipped, and not-run counts, pass rate, and failed P0 and P1 tests.
- Defect risk: unresolved critical and high defects by priority and severity, failed tests with linked defects (`fetch_defects`), and untriaged failures (failed results with no linked defect). Take release blockers and reopened counts from the tracker when the metrics omit them.
- Stability: flaky tests, repeated failures, unstable suites or configurations, and the recent trend.
- Configuration coverage: environments, browsers, devices, OS, execution profiles, and missing target combinations.
- Data confidence: missing MCP data, stale executions, ambiguous scope, and incomplete links.

Read `references/release-quality-gates.md` before you make the final decision. It maps each gate to its tool and holds the decision rules.

## Readiness decision

Return one of:

- `Ready`: no testing blocker remains. Critical requirements have coverage and recent passing evidence. Target configurations have enough testing.
- `Ready with risk`: no hard blocker remains, but moderate gaps or accepted risks exist.
- `Not ready`: release-blocking defects, failed, blocked, or unrun critical tests, missing critical coverage, stale evidence, or untested required configurations remain.

If the team gave thresholds, apply them. If not, use risk-based judgment and state the assumptions.

Never return `Ready` when any of these holds:

- Critical or high release-blocking defects remain open.
- P0 or P1 tests are failed, blocked, or not run without accepted risk.
- A failed P0 or P1 test matches a known environment signature (timeout, service outage, account or data issue) and `analyze-failures` has not confirmed an accepted environment cause. It stays an untriaged blocker.
- A P0 or P1 test failed and then passed on an unmodified rerun. That is a stability risk under investigation.
- Critical requirements have no tests or no passing evidence.
- Required target configurations are untested.
- MCP data is unavailable or too incomplete to support confidence.

## Response format

```text
Release Readiness: Ready | Ready with risk | Not ready
Confidence: High | Medium | Low

Key Metrics:
- Requirement coverage:
- Test execution:
- Defect risk:
- Stability:
- Configuration coverage:

Blocking Issues:
- ...

Risks / Gaps:
- ...

Recommendation:
- ...

Evidence:
- ...
```

Evidence includes execution IDs, suite names, requirement keys, defect IDs, and links when the platform returns them.

## Follow-up actions

Recommend concrete next steps:

- Create or link tests for uncovered critical requirements (`create-test-cases`).
- Rerun failed, flaky, or stale suites. `rerun_execution` applies to automated executions only, needs a `read_execution` check first, consumes Test Execution - Cloud minutes, and can change AUT data, so the user must agree first. A manual TestPak restarts through `update_test_run`. `execute-test` owns both.
- Resolve or accept named defects. Triage red results with `analyze-failures`.
- Widen configuration coverage for missing release targets.
- Upload external automation results with `upload-report` before the assessment.
- For a multi-release trend, use `test-reporting`.
