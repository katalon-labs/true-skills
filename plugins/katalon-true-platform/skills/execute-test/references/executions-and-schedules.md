# Executions, schedules, rerun

Read this when you must find a run, read or edit a schedule, or rerun an execution. Parameters follow the live tool schemas captured 2026-10-20.

## Two ID spaces

| Tool | ID it uses | What it returns |
|---|---|---|
| `list_executions` | numeric TestOps execution ID | Executions and scheduling data. The window defaults to the last 24 hours. Filter by `start_time`, `end_time` (ISO 8601) and `status` (`NOT_RUN`, `RUNNING`, `PASSED`, `FAILED`, `ERROR`). Compute the timestamps from the real current date and time. |
| `read_execution` | numeric TestOps `execution_id` | One execution. Pass `start_time` only for a NOT_RUN execution. |
| `list_execution_outputs` | TestCloud string `execution_id` | Without an ID: the last 5 executions in 24 hours. With an ID: artifact URLs. Use `download_offset` to page. |

No tool converts one ID into the other. Do not pass a numeric ID to `list_execution_outputs`. Do not pass a string ID to `read_execution`.

## Find a run

1. To find a recent execution, call `list_executions` with a time window and status.
2. To read its outcome, call `read_execution`, then `find_test_results` with `filter: {filter_type: "EXECUTION", execution_id}`.
3. To get logs, screenshots or videos, call `list_execution_outputs`. Take the TestCloud ID from that tool's own listing.
   Start in discovery mode (no ID). Then enumerate every output the call returns, across all `sessions`. Never invent an artifact and never omit one. Never alter a presigned URL. The call presigns one artifact each time, videos first. Use `download_offset` only when the user asks for another item. Do not replace it with `list_executions`, which returns scheduling data only.
4. No tool finds a run by its UI order number. Call `list_executions` with a window and status, match by name and time, and take the numeric `execution_id`. Never pass the UI order number as `execution_id`.

## Schedules

| Tool | Use | Class |
|---|---|---|
| `list_schedule` | List saved schedules. Filter by name with a wildcard. | read |
| `read_schedule_detail` | Read one schedule by `schedule_id`. | read |
| `update_schedule_configuration` | Change one or more schedules. | write |

`update_schedule_configuration` takes `project_id` and an `updates` list of 1 to 50 items, each with a `schedule_id` and a `changes` object. Call it once, after the user confirms, with every target in the list. Send only the settings the user asked for. The `ksVersion` field takes a `selection` of `latest`, `latest_major` (with `major`) or `exact` (with `version`). Never infer `timeZone` from `startTime` or a `Z` suffix. If `read_schedule_detail` omits it and the user gave none, ask for the IANA time zone and do not call the update. `startTime` must be in the future. A status-only change sends only `activeStatus`. When a lookup matches several schedules, ask the user to choose. Each result is `updated`, `updated_unverified`, `not_applied` or `unknown`. Never change `configType`, `testType` or `repositoryId` alone. Send a complete `runConfigurationEntries` replacement with them.

To create a schedule, build it with `build_schedule` and pass it in `schedule` of `create_test_run` with `mode: "automated"`.

Update steps:

1. Call `list_schedule`, then `read_schedule_detail` for each target.
2. Show a preview with the current value and the new value for each field.
3. After one yes, call `update_schedule_configuration` once.
4. Call `read_schedule_detail` again. Confirm each field changed.

## Rerun

`rerun_execution` reruns an automated Studio, Katalon Test Execution - Local or Test Execution - Cloud execution. It takes `execution_id`. You can pass `job_targets` to rerun only chosen test cases in chosen jobs (`jobId` to a list of `"<test path>/<test case name>"`).

- Run it only when the user explicitly asks for a rerun. Call `read_execution` first to confirm the execution type. An ID alone is no authorization. No tool stops a running automated execution.
- For a TestPak or manual run, use `update_test_run` `START` instead.
- A rerun uses Katalon Test Execution - Cloud minutes. Show a preview and get a yes first.
- Never rerun an unchanged failing test only to get a green result. A rerun that passes after a failure is a flaky result. Report it as flaky.
- After the call, find the new execution with `list_executions` and read its results.
