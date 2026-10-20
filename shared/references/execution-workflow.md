# Execution Workflow

Every run needs a confirmation before it starts. See the write policy and the execution consent rule. Resolve the project and repository first. Repeat `project_id` and `repository_id` on every call that takes them.

## Manual Run

1. Check the cases. Reuse existing cases. Create a missing case only after the write policy preview.
2. Add the cases to a manual suite when grouping helps.
3. Call `read_auts` right before the run. Never reuse an AUT choice from an earlier turn.
4. Pick the AUT environment that matches the target. Ask only when two or more fit equally well. If none exists and the user gave a URL, pass that URL as the AUT target. See the tool schema for the field.
5. Ask whether the run is for Run with AI, for human results, or both.
6. Confirm the run. Name the suite, the AUT environment, and the mode.
7. Call `create_test_run` with `mode` set to `manual`. Manual Run Now returns `manualExecutionId` and `testSuites`. Keep both. Show the run link as a markdown link.

### Run with AI

1. Ask which `browser_profile_mode` to use, SHARED or SEPARATE. Never infer it.
2. Confirm the AI session. It drives a real browser against the real AUT.
3. Call `read_test_suite` for every suite in the run. Pass only non-empty case lists.
4. Call `create_manual_ai_session`. Reuse any private network setup from `create_test_run` without change.
5. Poll `read_manual_ai_session` until no case is TODO or IN_TESTING. Back off between polls. Stop at a maximum wait you state to the user, then report the run as in progress with its IDs.
6. Run with AI has no cancel. Tell the user so before you start.
7. Before you report a pass, read the case result with `find_test_results`. A pass that needed a retry in the same session is a pass on retry. A pass after a recent failure says so.

### Human results

1. Check that the run is active and assigned to the user.
2. Call `update_test_results` for each result the user gives you. Count a result as saved only when the outcome is `applied` or `unchanged`.
3. For evidence, call `prepare_artifact_upload`, upload the file to the signed URL, then call `confirm_artifact_upload`. The limit is 10 MiB per file.
4. Read the run back with `read_manual_test_run_detail_by_order` or `read_execution`.

## Automated Run

1. Resolve the repository.
2. Find automated suites with `find_test_suites`. A suite never mixes MANUAL and AUTOMATED cases. Do not put manual cases in an automated run.
3. Call `find_execution_profiles` and `list_test_cloud_environments`.
4. Call `build_run_configuration`. For mobile, ask whether the target is a mobile browser or a mobile app. A mobile app needs an app from `list_test_cloud_apps`.
5. For a schedule, call `build_schedule`. It only builds the payload.
6. For a private AUT, call `build_private_local_testing_config`. Ask the user before you choose tunnel mode.
7. Confirm the run. Name the suites, the configuration, the schedule, and the network setup.
8. Call `create_test_run` with `mode` set to `automated`, the configuration, and the optional `schedule`.
9. Read the run with `list_executions` and `read_execution`. These use numeric TestOps IDs. Read artifacts with `list_execution_outputs`. That tool uses TestCloud string IDs. Never swap the two.

## Rerun

Call `rerun_execution` only for a completed execution. Confirm first. You can pass `job_targets` to rerun chosen cases. No tool stops a running execution.

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
