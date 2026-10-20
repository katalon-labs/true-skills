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
| Find recent or specific results | `find_test_results`, `list_executions` |
| Read one execution or one result | `read_execution`, `read_execution_test_results`, `read_test_result` |
| Run history for flaky and trend signals | `analyze_test_case_stability`, `analyze_test_flakiness` |
| Existing defect context | `get_defect_insights` |
| Artifacts of a cloud execution | `list_execution_outputs` |
| Run with AI session detail | `read_manual_ai_session` |
| Rerun a completed execution | `rerun_execution` |
| Attach evidence | `prepare_artifact_upload`, `confirm_artifact_upload` |
| File a defect | `find_alm_integration_projects`, `create_defect` |

Read each tool schema before the first call. This skill does not repeat parameters.

Limits to state up front:

- AI root-cause summaries and automation error-pattern analytics are product features in the web app. They are not MCP calls. Do not claim to call them.
- `create_defect` needs a failed test result ID and the ALM integration details. Defect creation without an ID does not exist.
- Two ID spaces both use the word "execution". `read_execution` and `list_executions` use the numeric True Platform ID. `list_execution_outputs` uses the Test Execution - Cloud string ID. No tool converts one to the other. Never swap the two list tools.
- `rerun_execution` works only on a completed execution.
- MCP is stateless. Ask in chat for any missing input and carry IDs from call to call.

## Workflow

```text
+----------------+   +----------------+   +----------------+   +----------------+
| Collect        |-->| Add history    |-->| Classify and   |-->| Report, then   |
| failures       |   | and evidence   |   | cluster        |   | act (asked)    |
+----------------+   +----------------+   +----------------+   +----------------+
```

1. **Collect the failures.** Use `find_test_results` for recent or targeted results, or `read_execution_test_results` for one run. Use `read_test_result` for detail on each failed case. If the user gives no scope, ask for an execution ID, a suite, or a date range.
2. **Set aside results with no verdict.** Blocked, not executed, and Run with AI sessions stuck in TODO or IN_TESTING are not failures. List them apart. Do not force them into a bucket.
3. **Read run history first.** Call `analyze_test_case_stability` for the cases in scope. Use `analyze_test_flakiness` for a lookback window with a minimum run count. A case is flaky when the same test on the same build gave different results. Never label a case flaky from one read of its code. A model may explain a root-cause category after history shows the pattern.
4. **Read the evidence.** Call `list_execution_outputs` with the cloud execution ID for artifact links. For Playwright results, open the trace and the error context (see the reference). For a Run with AI result, read the session with `read_manual_ai_session` and check whether the agent misread the step.
5. **Classify each failure** into one bucket:
   - **Product defect.** The application behaved wrong and the failure repeats.
   - **Automation defect.** The test is wrong: locator, wait, stale data, or a step that no longer matches the UI.
   - **Environment or data.** Infrastructure, account, network, fixture, or AUT state.
   A case that passed 8 or more of its last 10 runs needs a rerun or stability evidence before you call its failure a product defect.
6. **Cluster by signature.** Group failures with the same step, error message, and object. One cluster is one candidate root cause and at most one defect.
7. **Rerun only to learn something.** `rerun_execution` costs Test Execution - Cloud minutes and can change AUT data. Ask the user first. A pass on an unchanged rerun is flaky evidence. It does not clear the failure. Do not loop reruns until green.
8. **Check for existing defects.** Call `get_defect_insights` for the iteration or date range. If it cannot show a defect for the signature, ask the user to search the ALM tracker before you file.
9. **File defects only when asked, and only for product defects.** Follow `references/write-policy.md`: preview each defect (summary, description, failed result ID), get one confirmation, call `find_alm_integration_projects` if the integration is unknown, call `create_defect`, then report the key or link the call returns. If the call returns no key, say so.
10. **Attach evidence only when asked.** Use `prepare_artifact_upload` and then `confirm_artifact_upload`. Files up to 10 MiB. See the tool schema for what the artifact attaches to.
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
