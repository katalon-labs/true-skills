# Metric selection reference

This file is about subtraction. Every metric below is available. Almost none belong in any single report.

## Contents

- The four questions
- Metric definitions and what each can claim
- Anti-patterns
- The subtraction test

## The four questions

Almost every request is one of four questions in different clothes. Identify the question before you choose anything.

| Question | What the asker will do with the answer | Metrics that answer it | Metrics that do not |
|---|---|---|---|
| **Is quality getting better or worse** | decide whether the current approach continues | pass-rate trend, open critical defect trend, flaky-case trend | requirement coverage (it measures effort, not outcome), case counts |
| **Are we testing the right things** | decide where testers go next | requirement coverage percent, uncovered critical requirements by key, configuration coverage against the target matrix | pass rate (a suite that tests the wrong things passes easily) |
| **Can we trust the results** | decide whether to believe the last report | flaky-case count and trend, cases with erratic history, share of failures tied to a defect | total test count, pass rate |
| **Where should the next investment go** | allocate people or budget | gap, flakiness, and defect concentration, each by area or suite | any aggregate. Concentration is the point. |

If the request is two questions, write two reports or ask which one matters on the day. A report that answers two questions answers neither.

## Metric definitions and what each can claim

| Metric | Derived from | Claims | Does **not** claim |
|---|---|---|---|
| **Pass rate** | `find_test_results` over a date range (COMMON filter, `query.where` on `startTime`). Passed divided by total. | how the suite behaved in that window | that the product is good, or that a failure is a product regression and not an infra or environment blip. A narrow suite passes easily. |
| **Requirement coverage** | `fetch_requirement_metrics` for the iteration. Covered divided by in-scope. Confirm a named gap with `find_test_cases_by_requirement`. | that a linked case exists | that the case is good or passed. A link is not evidence. |
| **Uncovered critical requirements** | the uncovered set from `fetch_requirement_metrics`, filtered by the requirement's own priority | the keys nobody tests | completeness, if requirement priority is not kept in the ALM |
| **Open critical defects** | `fetch_defect_metrics`, read for the period with the default `UNRESOLVED` state, filtered to critical and high | current standing risk | escape to production. No such field exists. A question about all defects needs a second call with `RESOLVED`. |
| **Flaky cases** | `fetch_test_stability_metrics` with `return_tests: ["FLAKY"]` and a `from_date` and `to_date` window | that the platform's own signal flags them | a flake rate you computed. Report the platform's signal. Do not recompute it. The tool has no minimum-run parameter. Count runs per case with `find_test_results` and use a floor of about 10. |
| **Erratic history** | `find_test_results` per case across periods. Alternating outcomes with no code change. | a case whose result is not information | a cause. Hand it to `test-maintenance`. |
| **Configuration coverage** | `fetch_test_configuration_metrics` against a target matrix the user supplies | which combinations ran | which combinations matter. The target matrix is an input, not a platform fact. |
| **Triage share** | failed results from `find_test_results` (filter_type `EXECUTION`, `status` `FAILED`), then `fetch_defects` for the same execution. A result with an empty `defects` list has no linked defect. | how much of the red is understood | that the untriaged remainder is harmless, or that a linked defect is still open |
| **Concentration** | any metric above, grouped by suite with `read_test_suite` or by folder with `find_test_folders` | where the problem lives | a root cause |

Triage share needs a per-failure defect link, and `fetch_defects` gives it per result, case, or execution. Page the failed results to the end before you report a share, and report the denominator.

## Anti-patterns

Each of these has appeared in a real QA status report.

- **Total test count.** It grows with copy and paste. It correlates with nothing a stakeholder cares about. If someone asks, give it and say what it does not mean.
- **Automation percentage with no denominator.** 60 percent of what, and did the manual 40 percent run?
- **Pass rate with no scope.** A pass rate over "all results" mixes a smoke run with a full regression.
- **A coverage percentage with no uncovered list.** The names are the report. The percentage is the least useful part.
- **Defect counts with no severity split.** Twenty cosmetic defects and three criticals do not compare, and a sum hides the three.
- **Any metric with no date.** Metrics are read at report time, not at period end. Say when.
- **A trend line with no named cause.** If you cannot name the cause, report the number as unexplained.
- **A single-run pass rate for an AI feature.** Outputs vary between runs. Report the pass proportion over repeated runs, and name the data set. If the team has no repeat runs, say the number is a single sample.

## The subtraction test

Before a metric goes in, ask: if this number were removed, would the reader decide differently? If no, cut it. Applied with care, this leaves two or three metrics. That is the right size for a slide someone reads out loud.
