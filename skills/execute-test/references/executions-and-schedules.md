# Executions, schedules, rerun

Read this when you must find a run, read or edit a schedule, or rerun an execution. Source: Katalon docs "Katalon True Platform MCP Server" (October 2026). Parameters are mostly undocumented on that page, so check each tool schema.

## Two ID spaces

| Tool | ID it uses | What it returns |
|---|---|---|
| `list_executions` | numeric TestOps execution ID | Executions and scheduling data. The window defaults to the last 24 hours. Filter by `start_time`, `end_time` and `status`. |
| `read_execution` | numeric TestOps `execution_id` | One execution. Pass `start_time` only for a NOT_RUN execution. |
| `list_execution_outputs` | TestCloud string `execution_id` | Without an ID: the last 5 executions in 24 hours. With an ID: artifact URLs. Use `download_offset` to page. |

No tool converts one ID into the other. Do not pass a numeric ID to `list_execution_outputs`. Do not pass a string ID to `read_execution`.

## Find a run

1. To find a recent execution, call `list_executions` with a time window and status.
2. To read its outcome, call `read_execution`, then `read_execution_test_results`.
3. To get logs, screenshots or videos, call `list_execution_outputs`. Take the TestCloud ID from that tool's own listing.
4. To find a manual run by order number, call `read_manual_test_run_detail_by_order`.

## Schedules

| Tool | Use | Class |
|---|---|---|
| `list_schedule` | List saved schedules. Filter by name with a wildcard. | read |
| `read_schedule_detail` | Read one schedule by `schedule_id`. | read |
| `update_schedule_configuration` | Change one or more schedules. | write |

`update_schedule_configuration` merges the fields you send into each schedule. It takes a list of updates, so call it once with every target schedule. The Katalon Studio version field accepts latest, latest_major, or an exact version.

To create a schedule, build it with `build_schedule` and pass it in `schedule` of `create_test_run` with `mode: "automated"`.

Update steps:

1. Call `list_schedule`, then `read_schedule_detail` for each target.
2. Show a preview with the current value and the new value for each field.
3. After one yes, call `update_schedule_configuration` once.
4. Call `read_schedule_detail` again. Confirm each field changed.

## Rerun

`rerun_execution` reruns a completed execution. It takes `execution_id`. You can pass `job_targets` to rerun only chosen test cases in chosen jobs (jobId to test case IDs).

- Run it only on a completed execution. No tool stops a running one.
- A rerun uses Katalon Test Execution - Cloud minutes. Show a preview and get a yes first.
- Never rerun an unchanged failing test only to get a green result. A rerun that passes after a failure is a flaky result. Report it as flaky.
- After the call, find the new execution with `list_executions` and read its results.
