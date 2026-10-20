---
name: test-reporting
description: Writes quality reports for stakeholders outside QA from Katalon True Platform (formerly TestOps) data. It picks at most five metrics that answer the question asked, trends them across sprints or releases, and ends with a named ask. Use when someone presents quality at a steering committee, exec review, or quality business review. Not for the ship call on one release (release-analyze) or a pre-pipeline verdict (test-review). For the test manager and the test lead.
license: MIT
compatibility: Requires the Katalon True Platform MCP server and network access. Snapshots need write access to a workspace folder.
metadata:
  version: "0.5.0"
  mcp-contract: "katalon-docs-2026-10"
---

# Katalon Test Reporting

Use this skill when someone outside QA asks about quality and the answer must survive the question "where does that come from". The test manager presents quality upward. The test lead assembles the numbers. This skill reads the analyze stage and feeds the plan stage. The output is an **answer with named specifics**, never a metric dump. `release-analyze` judges one release. This skill reports direction across several and writes what a manager says out loud.

## What the MCP can and cannot do

Tool names are bare. Your client may add a prefix (Claude Code: `mcp__<server>__<tool>`).

- **Available, with dates in the record.** `find_test_results`, `list_executions`, and `read_execution` return execution records. Use them for pass rate, failure counts, and run counts per period. `find_test_results` takes a COMMON filter whose `query.where` reaches `startTime`, `executionId`, `testSuiteId`, `testCaseId`, and `status`. Its EXECUTION filter walks one run's jobs. `find_iterations` gives the period spine. `list_executions` defaults to the last 24 hours, so set both `start_time` and `end_time` from the real current date for each period.
- **Available, as reads at call time.** `fetch_requirement_metrics` (an iteration only), `fetch_defect_metrics`, `fetch_test_case_metrics`, `fetch_test_configuration_metrics` (each takes a `filter` with a mandatory `filter_type` of `ITERATION`, `DATE_RANGE`, or `DEFAULT`), and `fetch_test_stability_metrics` (an execution or an iteration, plus optional `from_date` and `to_date`). See the tool schema for exact fields. The scope selects the data. It does not rewind the clock.
- **Available for linkage.** `fetch_defects` shows the defects linked to a result, a case, or an execution. A result with an empty `defects` list has no linked defect.
- **Available for scope.** `list_projects`, `list_repositories`, `find_test_suites`, `read_test_suite`, `find_test_cases`, and `find_test_folders` show what each number counts.
- **Not available.**
  - No tool returns a series, an average, or a delta. You build every trend by looping periods.
  - No tool reads requirement coverage or stability as it stood on a past date. A coverage figure for Sprint 12 read in October includes links added after Sprint 12.
  - No dashboard, chart, or report entity. Dashboards live in the Katalon True Platform UI.
  - No publishing tool. The MCP cannot post to Slack, Confluence, email, or a deck. Hand the brief back as text.
  - No Build entity, and no tool creates a release. Releases and sprints come from `find_iterations`. Bind periods to them or to date ranges.
  - No escaped-defect flag, and no reopened-defect count in the metrics. Ask which ALM field marks a defect that reached production. If none does, report "defects opened after the release run" and label it a proxy.
  - No record of actual effort, cost, or cycle time. For a forecast, hand off to `test-estimation`.
  - No grouping dimension in the metrics tools. A team dimension such as squad or component comes from folder or suite structure, from the `featureAreas` filter on `find_test_cases`, or from the user.
- **The workaround that keeps trends valid.** A snapshot file written on every run, plus the dated execution series. See `references/snapshot-and-trend.md`. The first run states a baseline and infers no direction.

## Reporting workflow

```text
Question and audience -> Choose <= 5 metrics -> Pull per period
                                                      |
Write the brief <- Name what moved it <- Compare to snapshot, write a new one
```

## Steps

1. **Get the question and the audience before any tool call.** Ask who is asking, what they will decide, and what changes with the answer. If the user says only "a status report", ask which of the four questions in `references/metric-selection.md` applies. A report without a question is a metric dump.
2. **Choose at most five metrics.** Pick them from `references/metric-selection.md` and justify each in one clause. Cut anything the question does not need. Five is a cap, not a target.
3. **Fix the period spine.** Use `find_iterations` for sprints with dates, or explicit date ranges. Use three to six periods. Fewer than three cannot show a direction. State the spine in the report.
4. **Pull per period.** Resolve scope with `list_projects` and `list_repositories`. Call the execution tools once per period. Call a metrics tool once per period with that period's iteration or date range. `fetch_test_stability_metrics` describes the window you pass, so trend it from snapshots only. Carry `project_id` and `repository_id` into every call that takes them. Label each scoped read "as of <read date>".
5. **Compare against the snapshot, then write a new one.** Read the prior snapshot for this project. If none exists, this run is the baseline. Write the new snapshot before the brief, so a crash still leaves the next run better off.
6. **Name what moved the number.** Every trend line gets a named cause: a requirement key, a suite, a defect key, a configuration. If the tool returns counts without keys, ask the user for the key list from the ALM. Never guess a key. If you cannot name a cause, report the number as unexplained.
7. **Write the brief in the format below.** Hand it back as text. Do not claim to have published it.

## Choosing the few metrics

The question decides the metrics. Definitions and anti-patterns are in `references/metric-selection.md`.

| The stakeholder asked | Report these, nothing else | From |
|---|---|---|
| Is quality getting better or worse | pass-rate trend, open critical defect trend, flaky-case count trend | `find_test_results`, `fetch_defect_metrics`, `fetch_test_stability_metrics` |
| Are we testing the right things | requirement coverage percent, uncovered critical requirements by key, configuration coverage against the target matrix | `fetch_requirement_metrics`, `find_test_cases_by_requirement`, `fetch_test_configuration_metrics` |
| Can we trust the results | flaky-case count and trend, cases with erratic history, share of failures tied to a defect | `fetch_test_stability_metrics`, `find_test_results`, `fetch_defects` |
| Where should the next investment go | coverage gap by area, flakiness concentration by suite, defect concentration by area | `fetch_requirement_metrics`, `fetch_test_stability_metrics`, `fetch_defect_metrics`, `read_test_suite` |

Three rules keep the report short:

- Five metrics at most. A metric that would not change the decision stays out. Offer it on request.
- Every number carries its denominator and its date. "82 percent" is not a metric. "50 of 61 in-scope requirements, as of the 2026-08-08 run" is one.
- A metric with no decision attached is deleted. An appendix is where a dump hides.

## Trending without a history tool

Three data classes, and they do not trend the same way.

| Class | Metrics | How to trend | Rule |
|---|---|---|---|
| **Dated records** | pass rate, failure counts, run counts, results per suite | per-period date ranges on `find_test_results` and `list_executions` | trendable on the first run |
| **Scoped reads** | requirement coverage, defect standing, case quality, configuration coverage | per-period metrics calls, each labeled "as of <read date>" | a cohort comparison, not history. A snapshot gives the "as it stood then" view. |
| **Read-time only** | stability and flakiness | snapshots only | first run states "baseline established". Lookback windows end at read time. Overlapping windows are not separate periods. |

Rules:

- A two-point difference is a change. Three or more points are a direction. Say which one you have.
- Never backfill a snapshot you did not take. Report the dated records across all periods and the other classes from the snapshot date forward. State the split.
- A metric that moved less than its noise floor did not move. See `references/snapshot-and-trend.md`.
- If a scoped read for an older period looks worse than a newer one, check whether the older period is just more mature. Newer requirements have had less time to gain cases.

## Report format

```text
Answer:        <one sentence that answers the question asked>
Direction:     Improving | Flat | Degrading | Baseline only
Period spine:  <what the periods are, how many, their dates>
Confidence:    High | Medium | Low  (<the one thing that limits it>)

What moved it:
- <metric, from X to Y across N periods> because <named requirement, suite, or defect>

Named specifics:
- <requirement key, suite name, or defect key> -> <what it does to the number>

Not in this report:
- <the boundary that matters to this audience, in their words>

The ask:
- <the one decision or resource this report requests>
```

Rules for the format:

- `Answer` comes first and takes one sentence. If it needs two, the question was two questions.
- `The ask` is mandatory. With no ask, write "no decision needed, informational".
- `Not in this report` states the boundary in the audience's words. "We do not track how long a fix takes" beats "no cycle-time tool".
- Every named specific is a real key returned by the platform or supplied by the user. Never invent one.

## Prompt recipes

- `Cellphone Shop, last four sprints. Is quality getting better or worse? I present to the steering committee Thursday.`
- `Trend requirement coverage and defect risk across the last three releases and tell me where the next tester should go.`
- `Write the quality section of the QBR for this project. One page, with an ask at the end.`
- `Can I trust the numbers in our last release report? Show me flakiness and how much is untriaged.`

## Hand-offs

- Ship or no-ship on one release -> `release-analyze`.
- Suite verdict before the pipeline -> `test-review`.
- Orphan requirements and traceability detail behind a coverage number -> `test-management`.
- Repair of the flaky cases this report named -> `test-maintenance`.
- Turning an ask into next cycle's scope -> `test-plan`.
- Effort, headcount, or duration forecasts -> `test-estimation`.

Read `references/metric-selection.md` before you choose metrics. Read `references/snapshot-and-trend.md` before you claim a trend. Read `references/worked-example.md` for one complete run.
