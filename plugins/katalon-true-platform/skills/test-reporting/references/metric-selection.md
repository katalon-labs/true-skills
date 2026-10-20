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
| **Pass rate** | `find_test_results` over a date range. Passed divided by total. | how the suite behaved in that window | that the product is good, or that a failure is a product regression and not an infra or environment blip. A narrow suite passes easily. |
| **Requirement coverage** | `get_requirement_insights` for the iteration. Covered divided by in-scope. Confirm a named gap with `find_test_cases_by_requirement`. | that a linked case exists | that the case is good or passed. A link is not evidence. |
| **Uncovered critical requirements** | the uncovered set from `get_requirement_insights`, filtered by the requirement's own priority | the keys nobody tests | completeness, if requirement priority is not kept in the ALM |
| **Open critical defects** | `get_defect_insights`, read for the period, filtered to critical and high | current standing risk | escape to production. No such field exists. |
| **Flaky cases** | `analyze_test_case_stability`, and `analyze_test_flakiness` with a minimum run count of about 10 | that the platform's own signal flags them | a flake rate you computed. Report the platform's signal. Do not recompute it. |
| **Erratic history** | `find_test_results` per case across periods. Alternating outcomes with no code change. | a case whose result is not information | a cause. Hand it to `test-maintenance`. |
| **Configuration coverage** | `get_test_configuration_insights` against a target matrix the user supplies | which combinations ran | which combinations matter. The target matrix is an input, not a platform fact. |
| **Triage share** | failures from `find_test_results` that have a linked defect | how much of the red is understood | that the untriaged remainder is harmless |
| **Concentration** | any metric above, grouped by suite with `read_test_suite` or by folder with `find_test_folders` | where the problem lives | a root cause |

Triage share needs a per-failure defect link. The docs do not show a tool that lists those links for a project. Ask the user for the defect list from the ALM, or read a sample of failures with `read_test_result` and check whether the record shows a linked defect. Verify this in your session before you report a share.

## Anti-patterns

Each of these has appeared in a real QA status report.

- **Total test count.** It grows with copy and paste. It correlates with nothing a stakeholder cares about. If someone asks, give it and say what it does not mean.
- **Automation percentage with no denominator.** 60 percent of what, and did the manual 40 percent run?
- **Pass rate with no scope.** A pass rate over "all results" mixes a smoke run with a full regression.
- **A coverage percentage with no uncovered list.** The names are the report. The percentage is the least useful part.
- **Defect counts with no severity split.** Twenty cosmetic defects and three criticals do not compare, and a sum hides the three.
- **Any metric with no date.** Insights are read at report time, not at period end. Say when.
- **A trend line with no named cause.** If you cannot name the cause, report the number as unexplained.
- **A single-run pass rate for an AI feature.** Outputs vary between runs. Report the pass proportion over repeated runs, and name the data set. If the team has no repeat runs, say the number is a single sample.

## The subtraction test

Before a metric goes in, ask: if this number were removed, would the reader decide differently? If no, cut it. Applied with care, this leaves two or three metrics. That is the right size for a slide someone reads out loud.
