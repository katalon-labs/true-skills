# Manual results and evidence

Read this when the user, not Run with AI, executes manual cases and wants the outcome in Katalon True Platform. Source: Katalon docs "Katalon True Platform MCP Server" (October 2026). The docs do not list the fields of the update object, so check the `update_test_results` schema.

## Record a manual result

1. Create the manual run with `create_test_run` and `mode: "manual"` (after the consent preview). Note the run ID.
2. Confirm the run is active and assigned to the signed-in user. A manual result needs both. There is no assignee lookup tool.
3. For each case, ask the user for the outcome and a short note. Do not guess an outcome.
4. Call `update_test_results` with the test run ID and one update object.
5. Read the outcome field of the answer. Count the write as done only when it says `applied` or `unchanged`. Any other value is a failure. Report it with its reason.
6. Read the run back with `read_execution_test_results` and check the counts.

Preview all the results as one set. One yes covers them. See `references/write-policy.md`.

## Review an automated result

`update_test_results` also reviews a result from an automated run. The run must be completed. Use it to add a verdict or note to a failure that a person has triaged. Do not change a result to pass to hide a failure.

## Attach evidence

Evidence can be a screenshot, a log, or a trace file of up to 10 MiB.

1. Call `prepare_artifact_upload` for the file. It returns a signed URL.
2. Upload the file to that URL the way the tool result says.
3. Call `confirm_artifact_upload`. It returns an artifact ID.
4. Attach the artifact ID to the result in the way the `update_test_results` schema allows. If the schema has no field for it, give the artifact ID to the user.

Mask personal data in a screenshot or log before upload. Never upload secrets.
