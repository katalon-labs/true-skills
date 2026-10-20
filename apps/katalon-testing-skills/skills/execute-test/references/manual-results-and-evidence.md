# Manual results and evidence

Read this when the user, not Run with AI, executes manual cases and wants the outcome in Katalon True Platform. Fields follow the live `update_test_results` schema captured 2026-10-20.

## Record a manual result

1. Create the manual run with `create_test_run` and `mode: "manual"` (after the consent preview). Note the platform `execution_id`. Start it with `update_test_run` `START` and `execution_mode: "MANUAL"`.
2. Confirm the run is active and that the signed-in user created it. Only the creator can start, record and end the run, and an `executor` does not transfer write access. There is no user lookup tool. Omit `executor` to use the signed-in user. Pass `executor` only as a real user UUID from the user, never a name or email.
3. For each case, ask the user for the outcome and a short note. Do not guess an outcome. Record observed outcomes only.
4. Call `update_test_results` with `execution_id` and an `update` object: `test_type: "MANUAL"`, `operation: "RECORD"`, `test_case_id`, and `status` (`PASSED`, `FAILED`, `BLOCKED` or `SKIPPED`). Add `test_suite_id` when the case sits in several suites.
5. Case status never implies step statuses. `steps` is a partial update, each with `step_number` or `step_id`, a `status` and an `actual_result` of at most 255 characters. Use `all_steps_status` only when the user reports the outcome of every step.
6. Read the outcome field of the answer. Count the write as done only when it says `applied` or `unchanged`. Any other value, including partial or unknown, is a failure. Report it with its reason. The call does not end the run.
7. Read the run back with `find_test_results` and `filter: {filter_type: "EXECUTION", execution_id}`. Check the counts.
8. When every case has an outcome, call `update_test_run` with `END`. Unfinished cases reject the END. Ask whether to skip them and use `unfinished_cases: "SKIP"` only after an explicit yes.

Preview all the results as one set. One yes covers them. See `references/write-policy.md`.

## Review an automated result

`update_test_results` also reviews a result from an automated run. Send `test_type: "AUTOMATED"`, `operation: "REVIEW"`, `execution_test_result_id`, `expected_status`, `desired_status` (`PASSED` or `FAILED`) and a `reason` of 1 to 2000 characters. The run must be completed. This is a human or AI review override, not an execution or a report import. The legacy API toggles the status, so never retry an unknown outcome automatically. Do not change a result to pass to hide a failure.

## Attach evidence

Evidence can be a screenshot, a log, or a trace file of up to 10 MiB.

1. Preview the file (filename, exact byte size, mime type, and that project members can see it) and get one confirmation per `references/write-policy.md`. Measure the exact byte size of the file (1 to 10,485,760). Never use 0 or a guess.
2. Call `prepare_artifact_upload` with `upload: {filename, mime_type, content_length}`. It returns a signed PUT URL. Do not call it again for the same file while the allocation is usable.
3. Upload the raw bytes to that URL without Platform credentials. Never send base64 or a local path.
4. Call `confirm_artifact_upload` with the `artifact_id` it returned. Repeat confirmation is safe.
5. Attach only `{"artifact_id": "<id>"}` in the `evidence` list of the case or step in `update_test_results`. A case or step takes at most 3 evidence items.
6. If your client cannot upload files over HTTP, report that limit and give the file to the user.

Project artifacts are shared with project members. Mask personal data in a screenshot or log before upload. Never upload secrets.
