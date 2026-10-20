# Failure triage reference

Read this before you classify failures.

## Classification signals

| Bucket | Typical signals | Action |
|---|---|---|
| Product defect | An assertion on real app behavior failed. The app shows an unexpected error or state. The failure repeats across runs and environments. | File a defect with the failed result ID. |
| Automation defect | Element not found or a locator error. A timing or wait failure. Stale test data. A step no longer matches the UI. The case passes on a rerun with no app change. | Route to `test-maintenance`. |
| Environment or data | Infrastructure or network error. Account or permission error. A missing fixture. Wrong AUT state. A Test Execution - Cloud agent or tunnel problem. | Fix the environment, then rerun. |

Reproducibility is the strongest signal. A failure that repeats across environments and runs leans product. A failure that vanishes on a rerun leans automation or environment.

## Flaky: history first

A flaky case gives different results for the same test on the same build. Decide this from run history. A read of the code cannot decide it.

1. Call `analyze_test_case_stability` for the cases in scope. It reports flaky, consistently failing, newly failing, and slow tests.
2. Call `analyze_test_flakiness` for a lookback window and a minimum number of runs. Say the window and the minimum in the report.
3. Treat a case as flaky only when history shows mixed results on the same build. A case that began failing after a build change is newly failing. Report it under that name.
4. Ask a model to explain the likely cause (timing, shared state, data, environment) only after history shows the pattern. Studies of general-purpose models that read test code once found inconsistent flaky labels.
5. A flaky label that will drive a quarantine needs two independent reads that agree. Use two evidence sources, for example run history and the failure artifacts. Hand the quarantine itself to `test-maintenance`.

One check on the data: a stability result with all zeros while results show failures was seen on one project in August 2026. Cross-check the counts against `find_test_results` before you report a case as stable.

## Read the evidence

| Source | How to read it |
|---|---|
| Test Execution - Cloud artifacts | Call `list_execution_outputs` with the cloud (string) execution ID. The numeric True Platform ID does not work here. |
| Playwright trace | Run `npx playwright trace` on the trace file (Playwright 1.59 or later, checked October 2026). Read the failing step, the network calls, and the page state before it. |
| Playwright error context | Playwright 1.60 added aria snapshots of the receiving element to `errorContext`. Read it to see what the page showed at the failing assertion. |
| Uploaded JUnit from Playwright | From Playwright 1.59 the JUnit reporter writes an error element for some failures that used to be failure elements. Compare the failed count in True Platform with the source report before you triage. |
| Run with AI result | Call `read_manual_ai_session`. Check whether the agent misread the step or clicked the wrong control. A misread step is a test-side defect. |

If an artifact link does not open, report the link as unreadable. Do not guess its content.

## Clustering

Group by the tuple (failing step, error message, object or locator). One cluster is one candidate root cause and at most one defect. Report the cluster size so one bug is not filed N times.

## Rerun rules

- `rerun_execution` works only on a completed execution.
- It consumes Test Execution - Cloud minutes and can change AUT data. Ask for consent before each call.
- Use a rerun to test a hypothesis (flaky or environment). State the hypothesis first.
- A pass on an unchanged rerun marks the case a flaky candidate. The failure stays on the record and the run does not turn green.
- Rerun one representative per cluster. Do not rerun in a loop.

## Defect filing rules

- File only for product defects, and only when the user asked or pre-approved filing.
- A failed test result ID is required. Get it from `read_test_result` or `read_execution_test_results`.
- Call `find_alm_integration_projects` first when the ALM integration is unknown.
- Call `get_defect_insights` to look for an existing defect. If it cannot answer for this signature, ask the user to check the ALM tracker.
- Preview the defect text, get one confirmation, then call `create_defect`, as the write policy in the skill body requires.
- Never invent a stack trace, a defect key, or an ALM project. If the ID or the integration is missing, report blocked and name the missing input.

## Report template

```text
Cluster 1: <signature>   (N cases)
  Classification: product | automation | environment
  Likely cause:   <one line from result data>
  Evidence:       <history window, artifact link, trace step>
  Cases:          <ids>
  Action:         file defect | repair (test-maintenance) | rerun after <fix>
```

List results with no verdict in a separate block named "No verdict".
