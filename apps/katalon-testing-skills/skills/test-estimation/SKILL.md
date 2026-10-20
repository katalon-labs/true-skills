---
name: test-estimation
description: Estimates the effort, duration, and headcount for a Katalon True Platform (formerly TestOps) test cycle as scenario ranges with a confidence label. It counts cases and failures from platform data and takes per-unit rates from the team. Use when someone asks how long testing will take, how many testers it needs, or what a scope change costs. Not for what to test (test-plan) or a finished cycle (release-analyze). For the test lead and the test manager.
license: MIT
compatibility: Requires the Katalon True Platform MCP server and network access. The optional simulation needs Python 3.
metadata:
  version: "0.5.0"
  mcp-contract: "katalon-docs-2026-10"
---

# Katalon Test Estimation

This skill turns a scoped cycle into person-hours, a date, and a headcount. The test lead sizes the cycle before it starts. The test manager funds it. The output is a **range with a confidence label**, never one number. `test-plan` decides what gets tested. This skill prices that scope.

## What the MCP can and cannot do

The Katalon MCP can count the work. It cannot measure the effort. Tool names are bare. Your client may add a prefix (Claude Code: `mcp__<server>__<tool>`).

- **Available.** Case and suite counts: `find_test_cases` (its COMMON filter queries `testType` and `automationStatus`), `read_test_suite`, `find_test_cases_by_requirement`. Uncovered requirements: `fetch_requirement_metrics`. Automated and manual split, and execution statistics: `fetch_test_case_metrics`. Failure and flake burden: `fetch_test_stability_metrics`, `find_test_results`. Configuration matrix: `fetch_test_configuration_metrics`. Cycle window: `find_iterations`. Existing automated cadence: `list_schedule`, `read_schedule_detail`. A past execution: `list_executions`, `read_execution`, and `find_test_results` with filter_type `EXECUTION`.
- **Not available.** How long a person takes. No tool books effort against a case, a run, or a person. A manual run's open and close times are calendar time, not work. The platform also holds no roster, capacity, PTO, calendar, rate, cost model, or field for the estimate, and no cross-cycle average.
- **Looks like data and is not.** Session concurrency. `list_test_cloud_environments`, `find_execution_profiles`, and `list_test_cloud_agents` list environments, profiles, and agents. The docs do not show a parallel-session limit in them. Tag concurrency as team-supplied.
- **Field check.** Read one execution with `read_execution` and confirm that an elapsed-time field exists before you model on it. If it is absent, ask for the figure and tag it team-supplied. A missing field is never zero.

Every per-unit rate is team-supplied. Tag each one in the output. See `references/mcp-evidence-map.md` for the signal map and the checklist of questions for the human.

## Estimation workflow

```text
Fix scope -> Count from platform -> Get rates (human) -> Size five buckets
                                                              |
Resource both lanes <- Range: scenarios, then simulation <----+
        |
        v
Answer the question asked -> State the uncertainty
```

## Steps

1. **Fix the scope, or force Low confidence.** Call `list_projects`, then `list_repositories`. Bind the window with `find_iterations`. Get the release, sprint, folder, or suite in writing. If scope still moves, build the model with the scope as a stated assumption and set confidence to Low.
2. **Count what the platform can count.** Use `fetch_requirement_metrics` (`iteration_type` and `iteration_name`, with the iteration checked through `find_iterations`) for uncovered requirements. Use `find_test_cases` and `read_test_suite` for case counts. Pages start at 0, so copy `next_page_token` into `page_number` until it is null. Use `fetch_test_case_metrics` for the automated and manual split, or count it with `find_test_cases` and a `testType` query. Use `fetch_test_configuration_metrics` for the matrix multiplier. Use `fetch_test_stability_metrics` with `return_tests` for the flake burden. Without `return_tests` it returns metrics only, and it lists three cases per category unless you raise `limit_tests`. Say so when a result is paginated or truncated. Do not report a partial page as a total.
3. **Read one comparable execution.** Agree on the closest finished cycle with the human. Call `list_executions` with both `start_time` and `end_time` from the real current date (the default window is the last 24 hours). Then call `read_execution` and `find_test_results` with filter_type `EXECUTION`. Its pages walk the execution's jobs, so page until the list ends. Take the pass rate and, if present, the automated elapsed time. This is your only platform calibration. It is one sample. Say "n=1".
4. **Get the rates from the human.** Ask for manual minutes per case, design minutes per new case, new cases per uncovered requirement, triage minutes per failing result, automation authoring hours per case, productive hours per tester per day, overhead percentage, and session concurrency. Rank the sources: measured in this project within 90 days, then team declaration, then another project or an older cycle, then an industry default. Tag each rate with its source and date.
5. **Size five buckets.** Design, manual execution, automated execution and triage, automation authoring, fixed overhead. Record an out-of-scope bucket as zero with the reason.
6. **Give each driver a low, a likely, and a high value.** A driver is a rate or a count that can miss, such as new cases per requirement or the failure rate. Set the high value from a named risk. If you cannot name the risk, use 1.5 times the likely value and cap confidence at Medium.
7. **Build the range from scenarios.** Compute the best case (every driver at its low), the likely case, and the worst case (every driver at its high). The drivers move together in practice. A weak requirement set raises design, execution, and triage at once. For that reason, do not add standard deviations in quadrature. See `references/estimation-model.md`.
8. **Simulate when you can run code.** Use the script in `references/simulation.md`. Report P50, P80, and P90 with the correlation you assumed. Report the spread across three correlation values. If you cannot run code, say the range is scenario-based and give no percentile.
9. **Resource both lanes in their own units.** Manual work is person-hours. Automated execution is wall clock, bounded by session concurrency. Its human cost is triage. Run with AI is wall clock plus review time. Never add wall clock to person-hours.
10. **Answer the question asked.** A fixed date gives a headcount. A fixed team gives a date. Show both. Name the serialized part that no extra person shortens, usually triage and reporting.
11. **State the uncertainty.** Give the confidence label, the two or three drivers that move the total most (with the change in hours for a stated miss), what the estimate excludes, and the one measurement that would raise confidence.

## The five buckets

- **A. Design** new coverage. Person-hours. Driven by uncovered requirements times new cases per requirement.
- **B. Manual execution.** Person-hours. Driven by manual case count times configurations in the manual matrix. Retest of failures sits here.
- **C. Automated execution and triage.** Wall clock for the run. Person-hours for the triage of what fails.
- **D. Automation authoring.** Person-hours. Driven by the cases selected for automation.
- **E. Fixed overhead.** A percentage of A to D. Teams often use 10 to 20 percent.

Rework is not a sixth bucket. Counting it separately counts it twice. Exploratory sessions are timeboxed. Add the timebox as a stated line.

## Output format

```text
Estimate: <scope name>
Confidence: High | Medium | Low     Basis: <rate source, date measured, sample size>

Planning range, person-hours:
  Best case    <h>   every driver at its low
  Likely       <h>   every driver at its likely value
  Worst case   <h>   every driver at its high
  Simulated    P50 <h>  P80 <h>  P90 <h>   correlation <r>  (omit if not run)

Buckets at the likely value:
  A Design <h> | B Manual execution <h> | C Triage <h> | D Authoring <h> or 0 (<reason>) | E Overhead (<n>%) <h>

Wall clock (not effort):
  <h> for one automated pass at <k> parallel sessions x <c> configurations

Resourcing:
  Fixed window <d> working days -> <n> testers at P50, <n> at P80
  Fixed team <n> testers -> <d> working days at P50, <d> at P80
  Serialized: <what no extra person can shorten, and how much window it needs>

Drivers that move the total most:
  1. <driver>: a <n>% miss moves the total by <h> h
Excluded: <bucket or scope and the reason>
Evidence:
  MCP   <tool> -> <figure>
  Team  <figure> -> <who supplied it, date last measured>
```

## Never do

- Never give one number. Give the range and the confidence label.
- Never quote more precision than the inputs carry. "About 20 minutes" gives "about 80 hours", not 81.1.
- Never turn person-hours into a date without productive hours per day and the serialized part.
- Never treat automated elapsed time as person-effort, or a manual run's open time as work.
- Never turn missing platform data into zero.
- Never re-estimate to hit a date. Cut scope or add people, rerun the model, and name the lever.
- Never invent traffic, change rate, defect rate, or velocity. Use numbers the human supplies and cite them.
- Never call a scenario range a confidence interval.

## Prompt recipes

- `How long will it take us to test release 3.2, and how many people do I need?`
- `If we add the Safari and Android configurations, what does that cost us in tester days?`
- `We have 2 testers and the sprint ends on the 28th. Does the scope fit, and what would I cut?`
- `Size the testing effort for the 8 uncovered requirements and tell me which assumption you trust least.`

## Hand-offs

- Scope not fixed or not ranked -> `test-plan`. Record the estimate in the plan text or the linked Jira or Azure DevOps issue, because the platform has no field for it.
- Uncovered requirements this estimate sized -> `create-test-cases`.
- Automation authoring effort -> `test-case-to-playwright` for the per-case shape.
- Flake burden behind the triage bucket -> `test-maintenance`. A specific red run -> `analyze-failures`.
- Verdict after the cycle has run -> `release-analyze`.

Read `references/estimation-model.md` before you size a bucket. Read `references/mcp-evidence-map.md` before you claim a figure came from the platform. Read `references/worked-example.md` for one complete run with arithmetic. Read `references/simulation.md` before you simulate.
