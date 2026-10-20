---
name: execute-test
description: Runs existing Katalon True Platform (formerly TestOps) manual cases and suites with Run with AI, starts automated suites on Katalon Test Execution - Cloud (formerly TestCloud), edits schedules, records manual results, and reports pass, fail and blocked counts. Use when the cases already exist and the job is to run them and read the outcome. Not for coded Playwright runs (use playwright-execute) or report files already on disk (use upload-report). For the manual tester.
license: MIT
compatibility: Requires the Katalon True Platform MCP server and network access.
metadata:
  version: "0.5.0"
  mcp-contract: "katalon-docs-2026-10"
---

# Katalon Execute Test

This skill runs test cases or suites that already exist and reports the outcome. The `true-platform-testing` skill is the router for work that spans several stages. This skill is the focused execution step.

MCP clients can add a prefix to tool names (Claude Code uses `mcp__<server>__<tool>`). This skill uses bare names.

## Boundary

Available:

- Read AUT environments, create manual and automated runs with `create_test_run`, start Run with AI, poll AI sessions.
- Record manual results with `update_test_results` and attach evidence.
- Read, list, and edit schedules. Rerun a completed execution.
- Read executions, results, and TestCloud assets (apps, agents, tunnels).

Not available:

- Inspect the live AUT UI through the MCP. Use a browser tool for that.
- Cancel or stop a Run with AI session. There is no cancel tool.
- Guarantee that Run with AI finishes. The platform can block or fail a run.
- Run manual cases through the automated lane.

Read `references/capability-boundaries.md` when the scope is unclear. Read `references/write-policy.md` before any write. Read `references/execution-workflow.md` for the step order of a manual run and a Run with AI session.

## Resolve context

1. Call `list_projects`.
2. Call `list_repositories`.
3. Pick the repository (Test Project) from the user's words or the single available one.

Ask only when several repositories fit equally, a required value is missing, or the next action is destructive.

## Choose the lane

Use the manual lane for manual cases, a manual suite, cases just created in Katalon, or any "Run with AI" request. Use the automated lane only for an automated suite or suite collection. A suite never mixes both types. If the user says only "run tests" and the lane is unclear, ask which one.

## Consent before any run

`create_test_run`, `create_manual_ai_session`, and `rerun_execution` use Katalon Test Execution - Cloud minutes and can change data in the AUT. Before the first of them, show a preview and get one yes:

- Lane, run name, and the cases or suites in scope (count and names).
- AUT environment and URL, or the app for mobile native.
- For Run with AI: the `browser_profile_mode` choice and the private-access choice.
- The calls you will make, in order.

One yes covers every call in the preview. A `rerun_execution` needs its own preview.

## Manual lane with Run with AI

1. Resolve the cases or suites. For a suite, call `read_test_suite`. For single cases, call `read_test_case` when the input is unclear or risky.
2. Call `read_auts` in the same turn, right before the run. Never reuse an AUT choice from an earlier turn.
3. Pick the AUT environment whose name or URL matches the target. If none exists and the user gave a URL, use it as `default_aut_environment_url`. Ask only when several AUTs fit equally.
4. Ask the user for `browser_profile_mode` (SHARED or SEPARATE). Never infer it.
5. If the AUT is not public, read `references/testcloud-and-private-aut.md` and settle the private-access choice before the run.
6. After the consent preview, call `create_test_run` with `mode: "manual"` and a run name. See the tool schema for the `manual` fields. It returns `manualExecutionId` and the suites to run.
7. Call `create_manual_ai_session` with that run, unless the user said no AI. The preview already named this call.
8. Poll `read_manual_ai_session` until every case leaves TODO and IN_TESTING, or the platform returns a timeout or error. There is no push and no cancel.
9. Read the results (see "Read results") before you answer.

To look up a manual run by its order number, call `read_manual_test_run_detail_by_order`.

If the user wants to run the cases by hand, create the run with `create_test_run` and record each outcome as described in `references/manual-results-and-evidence.md`.

## Automated lane

1. Find the suites with `find_test_suites`, or collections with `find_test_suite_collections`. There is no tool to create or edit a collection.
2. Find profiles with `find_execution_profiles`.
3. Find browsers and devices with `list_test_cloud_environments`. For mobile native, find the app with `list_test_cloud_apps`.
4. Build the configuration with `build_run_configuration`.
5. For a schedule, build it with `build_schedule`.
6. After the consent preview, call `create_test_run` with `mode: "automated"`. Pass the schedule in `schedule`. See the tool schema for the `automated` fields.
7. Read results with `read_execution`, `read_execution_test_results`, and `read_test_result`.

Never use the automated lane for individual manual cases.

## Schedules, run discovery, rerun

Read `references/executions-and-schedules.md` for:

- `list_schedule`, `read_schedule_detail`, and `update_schedule_configuration`.
- `list_executions` and `list_execution_outputs`. Their IDs are two different kinds. Never swap them.
- `rerun_execution`.

## Read results

1. `read_execution` for the status of one run. It takes the numeric TestOps `execution_id`.
2. `read_execution_test_results` for results grouped by job.
3. `read_test_result` for one result, including the ID that `create_defect` needs.
4. `find_test_results` for history across runs.

## Report results

Report these items:

- Run name and link. Links from read tools can use a host that does not resolve for `.katalon.io` tenants. Build the link from the tenant host you know when the returned one fails.
- Final status.
- Counts for passed, failed, blocked or incomplete, and not run.
- Failures with a short reason each. When `read_test_result` shows an environment error (AUT unreachable, session timeout), count it as blocked and keep it out of the failed count.
- For each passed case, check its prior result with `find_test_results`. Flag a pass that follows a recent failure, so a fix and a flake do not read the same.
- Defects created or recommended.
- Skipped cases and manual follow-up.
- If every case passed, call `analyze_test_case_stability`. A suite with no failure history is an always-green risk to review. Treat an all-zero answer as unconfirmed, and cross-check with `find_test_results`.

For a failed run, hand off to `analyze-failures`.

Ask before you call `create_defect`, unless the user asked for defects. It needs a failed result ID and an ALM project from `find_alm_integration_projects`.

## Quirks

- Two kinds of "execution" ID exist: numeric TestOps IDs and TestCloud strings. No tool converts one to the other.
- `rerun_execution` works only on a completed execution.
- `update_test_results` succeeds only when the outcome is `applied` or `unchanged`.
- Run with AI has no cancel. `browser_profile_mode` must come from the user.
- `create_test_case` with AUTOMATED creates nothing. Suites reject a mix of manual and automated cases.
- `delete_test_case` is unreliable. Prefer `update_test_case` or `move_test_case`.
- The MCP is stateless. Carry IDs from call to call. Never rely on a prompt from the server.
