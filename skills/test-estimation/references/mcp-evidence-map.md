# MCP evidence map for estimation

Every figure in an estimate is a platform fact or a human input. This file draws the line. Tag every line of the output with its side.

## Platform side: what the MCP returns

| Estimation input | Tool | What it gives you | Trap |
|---|---|---|---|
| Cycle window | `find_iterations` | sprint or release name, start, and end (set `detail_level` to `FULL` for dates) | Calendar days, not working days. Subtract holidays yourself. |
| Uncovered requirements | `fetch_requirement_metrics` | requirement coverage for a sprint or release | "Covered" means linked, not passing. A linked case that never ran still costs execution time. It takes no date range. |
| Case counts | `find_test_cases`, `read_test_suite`, `find_test_cases_by_requirement` | the cases in a folder, a suite, or a requirement link | Check for pagination. A truncated page reported as a total shrinks the estimate. `find_test_cases_by_requirement` takes exactly one identifier. Folder-scoped search resolves at most 200 folders and fails rather than truncating. |
| Automated and manual split | `fetch_test_case_metrics`, or `find_test_cases` with a `testType` or `automationStatus` query | execution statistics, automation status, and case records | `automationStatus` is not `testType`. Do not substitute one for the other. If neither answers, ask and tag it team-supplied. |
| Failure and flake burden | `fetch_test_stability_metrics`, `find_test_results` | flaky, always failing, newly failing, and slow cases (set `return_tests`); flakiness over a `from_date` and `to_date` window; recent results | A flaky case raises the failing count without a defect. Use it to set the high value of the failure rate. The stability tool has no minimum-run parameter. Count runs with `find_test_results`. A signal from fewer than about 10 runs is unconfirmed. |
| Configuration matrix | `fetch_test_configuration_metrics` | which OS or browser combinations are covered against the target set (`configuration_type`, `coverage_threshold`, `pass_threshold`) | The multiplier applies per lane. Automated may cover three configurations while manual covers one. |
| Existing automated cadence | `list_schedule`, `read_schedule_detail` | saved schedules and their detail | A suite that already runs nightly adds triage every day. Count the days in the window. |
| Past executions in a window | `list_executions` | numeric TestOps execution IDs and scheduling data for a time range | The default range is the last 24 hours. Pass explicit start and end times from the real current date. Do not use it for TestCloud artifacts. |
| Past automated elapsed time | `read_execution`, `find_test_results` with filter_type `EXECUTION` | one finished execution, job-grouped results, and machine-recorded elapsed time | **Confirm the elapsed field is on the record before you model on it.** It depends on version and runner. If absent, ask. |
| Comparable cycle for calibration | `read_execution` on a named past execution | one sample | It is n=1. No tool aggregates across cycles. Write n=1 in the confidence basis. |

Two ID spaces both say "execution". TestOps uses a number. Test Execution - Cloud (formerly TestCloud) uses a string. `list_executions` and `read_execution` take the number. `list_execution_outputs` takes the string. Never swap them.

Always resolve scope first: `list_projects`, then `list_repositories`.

The metrics tools take an iteration, a date range, or both. `fetch_requirement_metrics` takes an iteration only. The others take a `filter` with a mandatory `filter_type` (`ITERATION`, `DATE_RANGE`, or `DEFAULT`, the last 28 days), except `fetch_test_stability_metrics`, which takes flat parameters. See the tool schema for exact fields. Metrics are read at the time of the call. They are not point-in-time history.

## Human side: the checklist

None of these exist in the platform. Ask for each one the chosen buckets need. Record who supplied it and when it was last measured.

- Manual execution minutes per case. Ask for the median. A few long cases skew the mean.
- Design minutes per new case.
- New cases per uncovered requirement.
- Triage minutes per failing result.
- Automation authoring hours per case, if bucket D is in scope.
- Productive hours per tester per day.
- Testers available, and any part-time fractions.
- Working days lost to holidays or PTO inside the window.
- Fixed-overhead percentage.
- Session concurrency for the automated lane.
- Repeat-pass factor, if a configuration runs a second time.
- A low and a high value for every rate above, and the risk behind the high value.
- Any cost rate, if the answer must be in money.

## Rate source ranking

1. **Measured in this project on a comparable cycle within 90 days.** The only source that supports High confidence.
2. **Team declaration.** Medium. Ask what it rests on. A tracked number beats a remembered one.
3. **Another project, or an older cycle.** Medium. Say which project.
4. **An industry default.** Low. Print it as a placeholder and ask for a real measurement.

## Things the platform cannot hold

- **No effort field.** Nothing books time against a case, run, or person.
- **No roster or capacity.** No team members, FTE fractions, PTO, or working calendar.
- **No cost model.** No rates, currency, license use, or Test Execution - Cloud minute pricing.
- **No place to store the estimate.** No estimated-effort field exists on a case, folder, suite, or requirement. No tool creates a Test Plan, Release, or Build. Record the estimate in the plan text or the linked Jira or Azure DevOps issue. Hand off to `test-plan`.
- **No cross-cycle aggregate.** Result and execution tools return records. For a trend across releases, hand off to `test-reporting`, which keeps its own snapshots.

## Things that look like MCP facts and are not

- **Session concurrency.** `list_test_cloud_environments` lists environments. `find_execution_profiles` lists profiles. `list_test_cloud_agents` lists agents. The docs do not show a parallel-session limit in any of them. Ask the team.
- **A manual run's duration.** Open and close times are calendar time. A run left open over a weekend is not a weekend of work.
- **Production traffic, change frequency, and defect rates.** No tool returns them. If the human supplies them from TrueTest, an analytics product, or Jira, use them and cite the source.
