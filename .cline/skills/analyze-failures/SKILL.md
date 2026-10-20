---
name: analyze-failures
description: Diagnoses one red Katalon True Platform (formerly TestOps) run. It classifies each failed result as a product defect, an automation defect, or an environment issue, clusters failures by signature, and files ALM-linked defects for confirmed product bugs. Use when a run or suite has failures and the question is whether the application broke or the test did. Not for the ship call, which is release-analyze, and not for suite repair over time, which is test-maintenance. For the manual tester and the automation tester.
license: MIT
compatibility: Requires the Katalon True Platform MCP server and network access.
metadata:
  version: "0.5.0"
  mcp-contract: "katalon-docs-2026-10"
---

# Analyze Failures

This skill turns a set of failed results into a diagnosis. When the user asks, it also files defects. The core value is classification: it separates real product bugs from automation and environment noise.

The reader is the manual tester or the automation tester who looks at a red run and needs to know whether the application broke or the test did.

Katalon True Platform (formerly TestOps) holds the results. Katalon Test Execution - Cloud (formerly TestCloud) holds the artifacts of cloud runs. Clients add a prefix to tool names (Claude Code uses `mcp__<server>__<tool>`). This skill uses bare names.

## What the MCP gives you

| Need | Tool |
|---|---|
| Find recent or specific results | `find_test_results` (filter_type COMMON or RELATIVE), `list_executions` |
| Read one result with error detail | `find_test_results` with filter_type `TEST_RESULT` and `include_details: true` |
| Read the failed results of one execution | `read_execution`, then `find_test_results` with filter_type `EXECUTION` and `status` |
| Run history for flaky and trend signals | `fetch_test_stability_metrics` |
| Defects already linked to a result, case, or execution | `fetch_defects` |
| Defect distribution for an iteration or date range | `fetch_defect_metrics` |
| Artifacts of a cloud execution | `list_execution_outputs` |
| Run with AI session detail | `read_manual_ai_session` |
| Rerun a completed automated execution | `rerun_execution` |
| Attach evidence | `prepare_artifact_upload`, `confirm_artifact_upload` |
| File a defect | `list_alm_integrations`, `create_defect` |

Read each tool schema before the first call. This skill names only the parameters that change the answer.

Limits to state up front:

- AI root-cause summaries and automation error-pattern analytics are product features in the web app. They are not MCP calls. Do not claim to call them.
- `create_defect` needs a failed test result ID, an ALM integration ID, and an ALM connection ID. It files a real Jira or Azure DevOps bug. Defect creation without a result ID does not exist.
- Two ID spaces both use the word "execution". `read_execution` and `list_executions` use the numeric True Platform ID. `list_execution_outputs` uses the Test Execution - Cloud string ID. No tool converts one to the other. Never swap the two list tools.
- `rerun_execution` reruns an automated Studio, KRE, or Test Execution - Cloud execution only. A manual TestPak (a run with `MANUAL` as its executionType, used for human testing and for Run with AI) restarts through `update_test_run` in `execute-test`.
- `fetch_test_stability_metrics` has no minimum-run parameter. It takes a window (`from_date`, `to_date`) or an execution or iteration. Count the runs yourself with `find_test_results` before you trust a signal.
- `find_test_results` with `include_details` returns error detail and failed assertions. It returns no log content. Read logs from the artifacts or the web app.
- No tool returns the signed-in user. Take the user from the client session. `create_defect` needs no assignee.
- MCP is stateless. Ask in chat for any missing input and carry IDs from call to call.

## Workflow

```text
+----------------+   +----------------+   +----------------+   +----------------+
| Collect        |-->| Add history    |-->| Classify and   |-->| Report, then   |
| failures       |   | and evidence   |   | cluster        |   | act (asked)    |
+----------------+   +----------------+   +----------------+   +----------------+
```

1. **Collect the failures.** Use `find_test_results` with a COMMON or RELATIVE filter for recent or targeted results. For one run, call `read_execution`, then `find_test_results` with filter_type `EXECUTION` and `status` set to `FAILED` or `ERROR`. The page parameters walk the execution's jobs, not single results, so keep paging until nothing is left. An execution without jobs returns results directly (manual results carry `jobId: null`). Read each failed case with filter_type `TEST_RESULT` and `include_details: true`. If the user gives no scope, ask for an execution ID, a suite, or a date range.
2. **Set aside results with no verdict.** Blocked, not executed, `INCOMPLETE`, and Run with AI sessions stuck in TODO or IN_TESTING are not failures. List them apart. Do not force them into a bucket.
3. **Read run history first.** Call `fetch_test_stability_metrics` with `filter_type` `EXECUTION` and `execution_id`, or `ITERATION` with `iteration_type` and `iteration_name`. Add `from_date` and `to_date` for a lookback window. Set `return_tests` to name the cases you need (`FLAKY`, `ALWAYS_FAIL`, `NEW_FAILURE`, `SLOW`, or `ALL`). Omit it and the call returns metrics only. The call returns three cases per category unless you raise `limit_tests`. A case is flaky when the same test on the same build gave different results. Never label a case flaky from one read of its code. A model may explain a root-cause category after history shows the pattern.
4. **Read the evidence.** Call `list_execution_outputs` with the cloud execution ID for artifact links. Enumerate every output it returns and do not alter the presigned URLs. For Playwright results, open the trace and the error context (see the reference). For a Run with AI result, read the session with `read_manual_ai_session` and check whether the agent misread the step.
5. **Classify each failure** into one bucket:
   - **Product defect.** The application behaved wrong and the failure repeats.
   - **Automation defect.** The test is wrong: locator, wait, stale data, or a step that no longer matches the UI.
   - **Environment or data.** Infrastructure, account, network, fixture, or AUT state.
   A case that passed 8 or more of its last 10 runs needs a rerun or stability evidence before you call its failure a product defect.
6. **Cluster by signature.** Group failures with the same step, error message, and object. One cluster is one candidate root cause and at most one defect.
7. **Rerun only to learn something.** `rerun_execution` costs Test Execution - Cloud minutes and can change AUT data. Call `read_execution` first to confirm the execution type, and ask the user before you rerun. An execution ID alone is no authorization. A pass on an unchanged rerun is flaky evidence. It does not clear the failure. Do not loop reruns until green.
8. **Check for existing defects.** Call `fetch_defects` with `filter: {"filter_type": "TEST_RESULT", "test_result_ids": [<failed result IDs>]}`, or `filter: {"filter_type": "EXECUTION", "execution_id": <execution ID>}`. A result with an empty `defects` list has no linked defect. A linked defect on a sibling case of the same cluster means the cluster already has an owner. Call `fetch_defect_metrics` when the question is the standing defect load for an iteration or date range. Use `filter_type` `ITERATION`, `DATE_RANGE`, or `DEFAULT`. The default `resolution_state` is `UNRESOLVED`, so a question about all defects needs a second call with `RESOLVED`. The metrics call shows distributions, not keys. If a known defect for the signature lives in the tracker only and is not linked to the result, ask the user to search the tracker before you file.
9. **File defects only when asked, and only for product defects.** Follow `references/write-policy.md`: preview each defect (summary, description, failed result ID), get one confirmation, call `list_alm_integrations` if the integration is unknown, call `create_defect`, then report the key or link the call returns. If the summary is missing, ask the user for it. Suggest the failed case name, or "Defect for {test case name}". If the call returns no key, say so. Read the result back with `fetch_defects`.
10. **Attach evidence only when asked.** Follow `references/write-policy.md`: preview each file (filename, exact byte size, mime type, and that project members can see it) and get one confirmation before any upload call. Measure the exact byte size of the file (1 to 10,485,760). Call `prepare_artifact_upload`, upload the raw bytes without Platform credentials, then call `confirm_artifact_upload`. See the tool schema for what the artifact attaches to.
11. **Report** per cluster: classification, likely cause, affected cases, evidence, and action (file, repair, or rerun after a fix).

Never invent a stack trace, a defect key, or an ALM project. If an input is missing, report blocked and name the input.

## Prompt recipes

- `Triage the failures in execution 8842: which are product bugs, flaky tests, or environment?`
- `Cluster today's failed results by root cause and tell me what to file.`
- `File defects for the confirmed product bugs in the checkout suite and link them to the failed results.`

## Hand-offs

- Automation defects and flaky cases go to `test-maintenance`.
- A ship decision from the failure picture goes to `release-analyze`.
- A coverage gap exposed by a failure goes to `test-plan`.
- The full capability boundary lives in `true-platform-testing`.

Read `references/failure-triage.md` before you classify. It holds the signal table, the flaky rules, the evidence reading steps, and the report template.
