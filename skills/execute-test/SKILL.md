---
name: execute-test
description: Runs existing Katalon True Platform (formerly TestOps) manual cases and suites as a TestPak, by hand or with Run with AI, starts automated suites on Katalon Test Execution - Cloud (formerly TestCloud), edits schedules, records manual results, and reports pass, fail and blocked counts. Use when the cases exist and the job is to run them. Not for coded Playwright runs (playwright-execute) or report files on disk (upload-report). For the manual tester.
license: MIT
compatibility: Requires the Katalon True Platform MCP server and network access.
metadata:
  version: "0.6.0"
  mcp-contract: "katalon-docs-2026-10"
---

# Katalon Execute Test

This skill runs test cases or suites that already exist and reports the outcome. The `true-platform-testing` skill is the router for work that spans several stages. This skill is the focused execution step.

MCP clients can add a prefix to tool names (Claude Code uses `mcp__<server>__<tool>`). This skill uses bare names.

## Boundary

Available:

- Read AUT environments with `read_auts`. Create manual and automated runs with `create_test_run`.
- Drive a manual run (a TestPak) with `update_test_run`: `CONFIGURE`, `START` and `END`. `START` runs it by hand (`MANUAL`) or with Run with AI (`KATALON_AI`).
- Poll a Run with AI session with `read_manual_ai_session`.
- Record manual results with `update_test_results` and attach evidence.
- Read, list, and edit schedules. Rerun a completed automated execution.
- Read executions, results, and Test Execution - Cloud assets (apps, agents, tunnels).

Not available through the MCP (use the web UI):

- Bulk Configure of suites and collections, and the collection Run mode. See `references/executions-and-schedules.md`.
- Datasets and per-row control of a data-bound run. The dataset, vault and run iteration tools are not in every tool list yet. Use one only if your tool list shows it.
- The AI Test Runner desktop app. It is a separate app, not an MCP surface.

Also not available:

- Inspect the live AUT UI through the MCP. Use a browser tool for that.
- Stop a running automated execution. `update_test_run` `END` closes a manual run, including a Run with AI session on it.
- Guarantee that Run with AI finishes. The platform can block or fail a run.
- Run manual cases through the automated lane.
- Look up a run by its UI order number. Use `list_executions` and `read_execution`.
- Return the signed-in user. No whoami tool exists. Omit `executor` in `create_test_run` to use the signed-in user.

Read `references/capability-boundaries.md` when the scope is unclear. Read `references/write-policy.md` before any write. Read `references/execution-workflow.md` for the step order of a manual run and a Run with AI session. Read `references/testpak-and-run-with-ai.md` for the execution-mode table, the four ID spaces, lifecycle responses, environments, parallel runs and data-bound runs.

## Resolve context

1. Call `list_projects`.
2. Call `list_repositories`.
3. Pick the repository (Test Project) from the user's words or the single available one.

Ask only when several repositories fit equally, a required value is missing, or the next action is destructive.

## Choose the lane

Use the manual lane for manual cases, a manual suite, cases just created in Katalon, or any "Run with AI" request. Use the automated lane only for an automated suite or suite collection. A suite never mixes both types. If the user did not say manual or automated, ask before you call `create_test_run`.

A TestPak request is a manual run. Creating a suite alone does not create a TestPak. If the user only asks to create a run, call `create_test_run`, return the run link and its current status, and stop. Do not call `update_test_run` `START` and do not poll an AI session. A created run is not evidence that any test executed.

## Consent before any run

`create_test_run`, `update_test_run` with `START` and `execution_mode: "KATALON_AI"`, and `rerun_execution` use Katalon Test Execution - Cloud minutes or a hosted browser, and can change data in the AUT. Before the first of them, show a preview and wait for one yes. An explicit Run with AI request ("run with AI", "execute using AI") selects the executor. It is not consent. Ask only for values still missing, such as `browser_profile_mode` or the AUT choice. The preview names:

- Lane, run name, and the cases or suites in scope (count and names).
- AUT environment and URL, or the app for mobile native.
- For Run with AI: the `browser_profile_mode` choice and the private-access choice.
- For a dataset-bound case: the row count, and that each row opens its own AI session.
- The calls you will make, in order.

One yes covers every call in the preview. A `rerun_execution` needs its own preview and its own yes.

## Choose the executor

For a bare "run this test" or a generic "execute now", ask one question and wait: "Run With AI (recommended, fully autonomous), or manual testing in TestPak?" No AI request does not select manual. Never pick AI because your client has no browser tools, and being an AI agent does not select Run with AI. An explicit "run this TestPak" selects manual. An explicit "Run With AI" selects Run with AI. An explicit "do not use AI" wins over every default. A request to create a run, pick an AUT or supply test data does not request AI. `references/testpak-and-run-with-ai.md` has the table that maps the user's words to `MANUAL` or `KATALON_AI`.

## TestPak lifecycle

A TestPak is the manual run container. `update_test_run` drives it with one `update.action` per call.

- `CONFIGURE` sets the AUT or private access before the run starts. It fails on an ended run and on a run with hosted AI. It cannot clear a saved AUT id or URL. Make a fresh run for that.
- `START` needs the execution path first (see "Choose the executor"). `MANUAL` is the default and `KATALON_AI` launches the hosted browser. The choice is the user's. A missing AI request does not select `MANUAL`. START on a run that already has an AI session returns that session. It does not reset results.
- `END` closes the whole run. `unfinished_cases` defaults to `REJECT`, so unfinished cases block the END. Ask whether to skip them and wait. Send `SKIP` only after the user says yes. Never retry a blocked END with `SKIP` on your own. `SKIP` also stops hosted AI.
- Only the person who created the run can start, record, and end it. Assigning an `executor` does not change that.
- On an `unknown` outcome, read the run with `read_execution` before you retry. The other lifecycle outcomes are in `references/testpak-and-run-with-ai.md`.
- A lifecycle stage is not a verdict. START and END never set a run to passed. An ended run can hold failed, blocked or skipped results, and its report can still be synchronizing.

## Manual lane with Run with AI

1. Resolve the cases or suites. For a suite, call `read_test_suite`. For single cases, call `read_test_cases` with `test_case_ids` when the input is unclear or risky. Pass `content_type: "FLOW"` only when you need the steps.
2. Call `read_auts` in the same turn, right before the run. Never reuse an AUT choice from an earlier turn. Reuse an explicit "skip AUT setup" or "no private access needed" answer from this conversation. An explicit skip wins over matching: omit both `aut_environment_id` and `default_aut_environment_url`, even when one environment matches. Reading `read_auts` does not authorize choosing an AUT. Do not configure one at `START`. The target must still be clear from the case steps or the user's words. Ask when it is not.
3. Pick the AUT environment whose name or URL matches the target. If none exists and the user gave a URL, use it as `default_aut_environment_url`. Ask only when several AUTs fit equally.
4. Ask the user for `browser_profile_mode` (`SHARED` or `SEPARATE`). Never infer it. The web UI opens with `SEPARATE` selected since 2026-10-29, and the tool still needs the user's answer. `SHARED` carries login state from case to case and can write to a live AUT. Separate runs in isolated browsers and can run in parallel. Shared runs the cases one after another. The environment is set by the organization, see "Run with AI environment".
5. If the AUT is not public, read `references/testcloud-and-private-aut.md` and settle the private-access choice before the run.
6. After the consent preview, call `create_test_run` with `mode: "manual"` and a run name. See the tool schema for the `manual` fields. Do not pass `browser_version` or `os_version` unless the user gave them, and never pass `latest` there. Do not guess a version from memory. Beta builds are replaced at run time, see "Run with AI environment". Omit `executor`.
7. Call `update_test_run` with `update.action: "START"`, `execution_mode: "KATALON_AI"` and the user's `browser_profile_mode`. Use the platform `execution_id` of the run, never `manualExecutionId` or the UI order number. The preview already named this call.
8. Call `read_manual_ai_session` once with the `manual_execution_id` and `session_id` that START returned, before you report any progress. Poll it until every case leaves TODO and IN_TESTING, or the platform returns a timeout or error. There is no push. Polling never launches a new session. Reuse a session you already know. Never call `create_manual_ai_session` as a retry over existing results.
9. Read the results (see "Read results") before you answer.

`create_manual_ai_session` is the legacy launcher for a subset of cases. Use it only when the user asks for that subset and you did not call `START` on the run. Never call it before or after a `START` on the same run. It asks the user for `browser_profile_mode` and for `os` (`windows` or `linux`). Never default either. The organization's environment list still applies, so an `os` it does not allow can be refused.

### Run with AI environment

The organization sets which environments Run with AI may use. An admin can set a list, so what a user sees differs by organization. The rule covers the web UI and the MCP `START` call alike.

- No list set: Linux Chrome only, on the newest stable version, with no OS or browser picker.
- List allows everything: the full picker.
- List names pairs: only those pairs, and the first is the default. `latest` is rejected. A restricted run always pins a concrete stable version.
- Windows and macOS rows need an organization with a Test Execution - Cloud desktop license. Native mobile without a license is refused with `TESTCLOUD_LICENSE_REQUIRED`. Read the error and tell the user.
- A beta browser build is replaced by the newest stable build of the same browser at run time. Do not promise a beta build.
- A missing picker can mean "Linux Chrome only", not a bug. Do not offer an OS or browser the organization does not list. A 403 or "access denied" after a request for one version can mean that version is unavailable, not that the user lacks rights. Check the requested values first.

Do not invent an environment field for `START`. Read the tool schema in your session.

### Parallel Run with AI

- Only `SEPARATE` runs in parallel. `SHARED` runs the cases in order. Shared with a parallel limit can fail while the run prepares.
- The web UI opens the parallel count at the number of selected cases and shows the effective maximum under it. The maximum is an organization and license setting. Do not state a fixed number.
- The count never exceeds the Test Execution - Cloud licensed sessions for the environment type.
- For several runs started in parallel, create one suite per run. Reusing one suite for several runs can mix cases. After each `create_test_run`, read the run and check it holds its own case.

### Data-bound cases

A manual case can be linked to a dataset. Only manual cases take datasets.

- Run with AI on a bound case opens one AI session per data row. The run page lists the rows under AI SESSIONS, and each row has its own steps, video and a test data block.
- A placeholder with no value shows `(unresolved)` in the row. Report it as a data problem, not a product failure.
- Ending the run early marks unfinished rows as skipped.
- Dataset and per-row tools are not in every tool list yet. If your tool list has no dataset or run iteration tool, link datasets and read rows in the web UI. Do not invent a call.

### Stopping a session

To stop a Run with AI session, call `update_test_run` with `END`. It closes the whole run. If unfinished cases block the END, ask whether to skip them. Use `unfinished_cases: "SKIP"` only after an explicit yes.

## Manual lane by hand

1. Create the run with `create_test_run` and `mode: "manual"` after the consent preview. Keep the run's `execution_id`.
2. Call `update_test_run` with `START` and `execution_mode: "MANUAL"`. It starts the timer of the first unfinished case and returns the pinned steps.
3. Run the steps with your own browser tools, or guide the human and wait for the real outcomes.
4. Record each outcome as described in `references/manual-results-and-evidence.md`.
5. Call `update_test_run` with `END` when every case has an outcome.

To change the AUT or private access on a run that has not started, call `update_test_run` with `CONFIGURE`. It fails on ended runs and on runs with hosted AI.

## Automated lane

1. Find the suites with `find_test_suites`, or collections with `find_test_suite_collections`. For a collection, fetch it by `collection_id` and pass the returned `testSuiteEntries` as `automated.test_suite_entries`. There is no tool to create or edit a collection.
2. Find profiles with `find_execution_profiles`. Never assume a default profile.
3. Find browsers and devices with `list_test_cloud_environments`. For mobile native, find the app with `list_test_cloud_apps`.
4. Build the configuration with `build_run_configuration`. Copy `os`, `os_version` and the browser fields from one row of `list_test_cloud_environments`.
5. For a schedule, build it with `build_schedule`.
6. After the consent preview, call `create_test_run` with `mode: "automated"`. Pass the schedule in `schedule`. See the tool schema for the `automated` fields. A single suite needs `test_project_id`.
7. Read results with `read_execution` and `find_test_results` (see "Read results").

Pass `additional_kre_arguments` exactly as the user typed them. Retries go there as `-retry=<n>` with `-retryStrategy=immediately`, `failedExecutions` or `allExecutions`. In True Parallel mode a user `-retryStrategy` is ignored. Do not add a second `-retry` when the suite already sets one. Set `parallelize_test_cases` to true only when the user asks for test-case-level parallelism. Never drop a selector the user asked for to recover from an error.

A Windows case that needs a client certificate carries a `[cert: <profile>]` tag in its precondition. It needs a Windows environment and an account set up for it, and was verified on Windows Chrome 145 only. A missing certificate script gives no clear error. Name the precondition when a Windows run fails at sign-in.

Never use the automated lane for individual manual cases.

## Schedules, run discovery, rerun

Read `references/executions-and-schedules.md` for:

- `list_schedule`, `read_schedule_detail`, and `update_schedule_configuration`.
- `list_executions` and `list_execution_outputs`. Their IDs are two different kinds. Never swap them.
- `rerun_execution`.

## Read results

1. `read_execution` for the status of one run. It takes the numeric TestOps `execution_id`.
2. `find_test_results` with `filter: {filter_type: "EXECUTION", execution_id}` for the results of one run. Add `status` (`PASSED`, `FAILED`, `ERROR` or `INCOMPLETE`) to narrow. Pages walk the execution's jobs. A run without jobs returns results directly, and manual results carry `jobId: null`.
3. `find_test_results` with `filter: {filter_type: "TEST_RESULT", test_result_id, include_details: true}` for one result. It returns error detail and failed assertions, and no log content. The result ID feeds `create_defect`.
4. `find_test_results` with `filter_type` `COMMON` or `RELATIVE` for history across runs.

## Report results

Report these items:

- Run name and link. Links from read tools can use a host that does not resolve for `.katalon.io` tenants. Build the link from the tenant host you know when the returned one fails. Show `execution_path` from `update_test_run` as a link.
- Final status.
- Counts for passed, failed, blocked or incomplete, and not run.
- Failures with a short reason each. When the result detail shows an environment error (AUT unreachable, session timeout), count it as blocked and keep it out of the failed count.
- For each passed case, check its prior result with `find_test_results`. Flag a pass that follows a recent failure, so a fix and a flake do not read the same.
- Defects created or recommended.
- Skipped cases and manual follow-up.
- If every case passed, call `fetch_test_stability_metrics` with `filter_type: "EXECUTION"`, the `execution_id`, and `return_tests` set to `["FLAKY", "ALWAYS_FAIL", "NEW_FAILURE", "SLOW"]`. Without `return_tests` it returns metrics only. A suite with no failure history is an always-green risk to review. Treat an all-zero answer as unconfirmed, and cross-check with `find_test_results`.

For a failed run, hand off to `analyze-failures`.

Before you file a defect, call `fetch_defects` with `filter: {"filter_type": "TEST_RESULT", "test_result_ids": [<result ID>]}`. A result with an empty `defects` list has no linked defect. Ask before you call `create_defect`, unless the user asked for defects. It files a real Jira or Azure DevOps bug, so show a preview and confirm. It needs a failed result ID and the integration and connection IDs from `list_alm_integrations`. Ask the user for the summary when it is missing. Suggest the failed case name, or "Defect for {test case name}".

## Quirks

- Two kinds of "execution" ID exist: numeric TestOps IDs and Test Execution - Cloud strings. No tool converts one to the other.
- `update_test_run` takes the platform `execution_id`. It rejects the UI order number and `manualExecutionId`.
- `rerun_execution` is for an explicitly requested automated execution. Call `read_execution` first. An ID alone is no authorization. To start or resume a TestPak, use `update_test_run` `START`.
- Four IDs name a manual run: `execution_id`, `manual_execution_id`, the UI order number and `execution_test_case_id`. Never swap them. `references/testpak-and-run-with-ai.md` says which call takes which.
- `list_test_cloud_tunnels` needs `project_id`. Without it the call can fail with a project access error.
- `update_test_results` succeeds only when the outcome is `applied` or `unchanged`.
- Run with AI runs in a hosted browser that the organization's environment list allows. Linux Chrome is the default when no list is set. `browser_profile_mode` must come from the user.
- `create_test_case` with AUTOMATED creates nothing. Suites reject a mix of manual and automated cases.
- `delete_test_case` needs an explicit yes that names the case. Prefer `update_test_cases` or `move_test_case`.
- The MCP is stateless. Carry IDs from call to call. Never rely on a prompt from the server.
