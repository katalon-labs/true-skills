# TestPak execution details

## Existing run versus creation

For an existing run, use its Platform execution ID directly. `execution_id`, G5 `manual_execution_id`, the UI order number, and `execution_test_case_id` are different identifiers; never substitute one for another.

For a new manual run, resolve the requested cases/suites and read `read_auts` immediately before creation. Resolve the AUT matching the target URL/name and honor the creation tool's selection requirements; reuse an explicit choice already supplied for this flow. If none exists and a URL is known, use the creation tool's supported default AUT field. Ask only for genuinely missing or ambiguous settings. A missing manual execution or unmaterialized snapshot is a reason to retry discovery later, not to create duplicate runs or guess IDs.

Use the live tool schema: modern creation is `create_test_run(mode="manual")`; older servers may expose `create_manual_test_run`. Creating a run alone is never execution evidence. Do not automatically launch hosted AI after creating it.

## Start and carry the pinned context

Call `update_test_run(execution_id, update={"action":"START","execution_mode":"MANUAL"})` for a human or a local agent harness. For multiple run environments, supply the selected `environment_id`. An optional `execution_test_case_id` selects a pinned case; omission selects the running or first unfinished case. START does not retest completed cases.

Carry `current_case` forward:

- `test_case_id`, `test_suite_id`, `test_case_order`, and `environment_id` identify the result for `update_test_results`.
- `execution_test_case_id` selects that pinned case for lifecycle commands; it is not the repository test-case ID.
- `steps` contain the exact step IDs, numbered positions, instructions, expected results, and test data. Follow these pinned steps instead of rereading mutable latest repository content.
- `result_id`, `status`, and `timer_status` describe observed state, not a new test verdict.

An agent with browser/computer tools can perform the steps and capture evidence. Otherwise, show the instructions and expected results to the human and wait for actual observations. Do not claim a screenshot, browser action, or outcome that has not happened. Stop after context handoff when that is the user's requested scope.

## Record outcomes and real evidence

`update_test_results` takes the Platform execution ID and a manual update with `test_type="MANUAL"`, `operation="RECORD"`, returned case/suite/order/environment selectors, and the observed final case `status`. Include only observed or user-reported step outcomes. Each entry in `steps` uses exactly one returned `step_id` or 1-based `step_number`, plus its status, concise `actual_result`, and optional evidence. A case PASSED verdict alone does not establish that every step passed; use `all_steps_status` only when the user explicitly reports all steps.

For each actual screenshot/file:

1. Call `prepare_artifact_upload` with its real metadata.
2. Upload the actual bytes to the returned URL using the returned method/headers. Do not forward Platform credentials to the upload host.
3. Call `confirm_artifact_upload` and use the confirmed `artifact_id` in `evidence` for the relevant step or case. Do not invent an ID or treat a local path as an uploaded artifact.
4. Inspect the recording response, including partial/conflict/unknown outcomes; do not assume everything was saved.

Evidence is optional for this lifecycle. If no upload tool/HTTP capability exists, record valid text observations and explain how the human can attach their evidence in TestPak. Missing client automation/upload is a capability gap, not a FAILED/BLOCKED test. If the AUT itself prevents a test, record BLOCKED only from the actual observation.

After a case is recorded, call START for the next unfinished case and continue within the authorized scope.

## End, retry, and hosted AI

`update={"action":"END"}` closes the whole run only when every case/environment has a terminal PASSED, FAILED, BLOCKED, or SKIPPED result. Preserve these verdicts. If unfinished cases remain, leave the run open unless the user explicitly asks to stop early and skip them; then use `unfinished_cases="SKIP"`. This also stops hosted AI. Already-ended runs cannot be reopened by START; repeated END reads their state without repeating the write.

For hosted AI, START uses `execution_mode="KATALON_AI"` with the user's `browser_profile_mode` choice. The run needs one Windows/Linux Chrome environment. It returns `manual_execution_id`, `session_id`, and optionally `conversation_id`; poll `read_manual_ai_session` with the first two. A known session is reused. Do not invoke the legacy session-creation tool as a retry or start a new session over existing results. AI-only runs may auto-end, but closure and synchronization still need observed state before reporting them as complete.

Lifecycle responses use:

| outcome | Agent response |
| --- | --- |
| applied | Requested state was read back; continue the returned next actions |
| unchanged | No new write; continue the existing case/session or report already-ended state |
| blocked | Explain the specific blocker; do not reset results or skip work without the user's intent |
| unknown | The write may have committed; inspect TestPak/session state before deciding on a retry |

`observed_stage` is the lifecycle; `observed_status` is the calculated verdict. Neither START nor END sets a run to PASSED. A closed run can still be synchronizing its report.

## Automated suites

Resolve automated suites/collections, execution profiles, TestCloud environments, and supported run configuration. Use the connected automated creation/scheduling tool and read execution/results. Never route manual test cases through an automated scheduler or use `update_test_run` to edit a Studio/TestCloud automated verdict.
