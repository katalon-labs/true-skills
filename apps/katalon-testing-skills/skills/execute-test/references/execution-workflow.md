<!-- GENERATED from shared/references/execution-workflow.md - edit the source -->
# Execution Workflow

Every run needs a confirmation before it starts. See the write policy and the execution consent rule. Resolve the project and repository first. Repeat `project_id` and `repository_id` on every call that takes them.

If the user did not say manual or automated, ask before you call `create_test_run`.

## Manual Run (TestPak)

1. Check the cases. Reuse existing cases. Create a missing case only after the write policy preview.
2. Add the cases to a manual suite when grouping helps. A suite alone does not create a run.
3. Call `read_auts` right before the run, so the AUT data is fresh. Reuse an explicit "skip AUT setup" or "no private access needed" answer from earlier in the conversation. Do not ask again.
4. Pick the AUT environment that matches the target. Ask only when the choice is missing or two or more fit equally well. If none exists and the user gave a URL, pass that URL as `default_aut_environment_url` on the later configure or start call.
5. Ask one question when the user did not choose: "Run With AI (recommended, fully autonomous), or manual testing in TestPak?" Wait for the answer. A request without the words "AI" does not select manual. Never pick AI because your client has no browser tools.
6. Confirm the run. Name the suite or cases, the AUT environment, the mode, and any private network setup.
7. Call `create_test_run` with `mode` set to `manual` and the `manual` object. Use `test_suite_ids` or `test_case_ids`, with `test_project_id` at the top level. Do not guess `browser_version` or `os_version`, and never pass `latest`. Omit `executor` for the signed-in user. Pass an `executor` only as a real user UUID. Keep `manualExecutionId`, `testSuites`, and the platform `execution_id`. Show the run link as a markdown link.
8. If the user wants a TestPak for later, stop after step 7. Return the link. Do not call `update_test_run` with START.

Private access has fixed answers. With active tunnels: "No private access needed", "Use Katalon Tunnel", "Use IP Whitelisting". With none: "No private access needed" or "Yes, I need private access". Never choose for the user. A tunnel choice needs a second question that lists each active tunnel. Never pick a tunnel, even when only one exists. With no active tunnel and private access needed, stop until `list_test_cloud_tunnels` shows one. Then call `build_private_local_testing_config`.

To set the AUT or private access on a run that exists, call `update_test_run` with CONFIGURE. It fails on an ended run and on a run with hosted AI. It cannot clear a saved AUT. Create a fresh run to switch between an AUT environment and a free URL.

### Run with AI

1. Ask which `browser_profile_mode` to use, SHARED or SEPARATE. Never infer it. Hosted AI runs Chrome on Windows or Linux only.
2. Confirm the AI session. It drives a real browser against the real AUT.
3. Call `update_test_run` with START and `execution_mode` set to `KATALON_AI`. Pass `browser_profile_mode`. Pass the AUT and private access in `configuration` when the run is not set up yet.
4. Call `read_manual_ai_session` with the returned `manual_execution_id` and `session_id`. Call it once before you report any AI progress. Then poll it until no case is TODO or IN_TESTING. Back off between polls. Stop at a maximum wait you state to the user, then report the run as in progress with its IDs. Polling never launches a session.
5. To close the run early, call `update_test_run` with END. It closes the whole run, including the AI session. Unfinished cases reject END by default. Ask whether to skip them. Use `unfinished_cases` set to `SKIP` only after an explicit yes. SKIP also stops hosted AI. Never retry a rejected END with SKIP on your own.
6. Before you report a pass, read the case result with `find_test_results`. A pass that needed a retry in the same session is a pass on retry. A pass after a recent failure says so.

`create_manual_ai_session` is the legacy launcher. Use it only for an explicit subset of cases. Never call it before or after a START on the same run. It also asks the user for `os`, windows or linux.

### Human results

1. Call `update_test_run` with START and `execution_mode` set to `MANUAL`. The result lists the pinned steps and the result selectors. It starts the timer of the first unfinished case.
2. Check that the run is active and that the user created it. Only the creator can record results and end the run.
3. Call `update_test_results` for each result the user gives you. Record only outcomes the user observed. Never copy a case status onto its steps. Use `all_steps_status` only when the user reports every step. Count a result as saved only when the outcome is `applied` or `unchanged`.
4. For evidence, preview the file (filename, exact byte size, mime type, and that project members can see it) and get one confirmation. Then measure the exact file size in bytes. Call `prepare_artifact_upload`, upload the raw bytes to the signed URL without Platform credentials, then call `confirm_artifact_upload`. Attach only the `artifact_id`. The limit is 10 MiB per file and 3 files per case or step.
5. Read the run back with `read_execution`. To find a run the user names by order number, call `list_executions` with a time window to find the numeric `execution_id`. No tool looks up a run by order number.
6. To finish, call `update_test_run` with END. Apply the same unfinished-case rule as in Run with AI step 5.

## Automated Run

1. Resolve the repository.
2. Find automated suites with `find_test_suites`. A suite never mixes MANUAL and AUTOMATED cases. An automated run takes suites or suite collections. It never takes single cases.
3. Call `find_execution_profiles`. Ask the user to choose one. Never assume a default profile. Call `list_test_cloud_environments` with every criterion the user gave. Page until `page_token` is null.
4. Call `build_run_configuration`. Copy `os`, `os_version`, and the browser fields from one row of `list_test_cloud_environments`. For mobile, ask whether the target is a mobile browser or a mobile app. A mobile app needs an uploaded READY app from `list_test_cloud_apps`.
5. For a schedule, call `build_schedule`. It only builds the payload. Ask the user for the IANA time zone. Do not call `read_auts` for an automated run.
6. For a private AUT, call `build_private_local_testing_config` only after the user chose tunnel or whitelist, and a tunnel when needed.
7. Confirm the run. Name the suites, the profile, the configuration, the schedule, and the network setup. Copy `additional_kre_arguments` exactly as the user wrote it. Set `parallelize_test_cases` only when the user asks for test-case-level parallelism.
8. Call `create_test_run` with `mode` set to `automated`, an `automated` object with `test_run_type`, the configuration, and the optional `schedule`. For a collection, first read it with `find_test_suite_collections` and pass its `testSuiteEntries` as `test_suite_entries`. A single-suite run needs `test_project_id`. If the call returns INVALID_ENVIRONMENT, retry with the compatible configurations it lists. Never drop a requested selector to recover from an error.
9. Read the run with `list_executions` and `read_execution`. These use numeric TestOps IDs. Read artifacts with `list_execution_outputs`. That tool uses TestCloud string IDs. Never swap the two.

## Rerun

Call `rerun_execution` only when the user asks to rerun an automated Studio, Katalon Test Execution - Local, or Test Execution - Cloud execution. Call `read_execution` first to confirm the type. An ID alone is no authorization. Confirm first. You can pass `job_targets` to rerun chosen cases. To start or resume a TestPak, use `update_test_run` with START.

## Result Reporting Template

```text
Run:
- Name:
- Link:
- Status:

Summary:
- Passed:
- Failed:
- Blocked or incomplete:
- Not run:

Findings:
- ...

Next actions:
- ...
```
