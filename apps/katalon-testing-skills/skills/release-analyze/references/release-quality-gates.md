# Release Quality Gates

Use this reference to turn Katalon MCP quality data into a release readiness decision.

## Gate to tool map

| Gate | What to pull | Tool |
|---|---|---|
| Requirement coverage | Coverage for the iteration, plus the requirements and their linked cases | `get_requirement_insights`, `find_requirements`, `find_test_cases_by_requirement` |
| Test case quality | Execution stats, automation split, stale and incomplete cases | `get_test_case_insights`, `find_test_cases` |
| Defect risk | Defect priority and severity for the iteration or date range | `get_defect_insights` |
| Stability | Flaky, always failing, newly failing, and slow tests | `analyze_test_case_stability`, `analyze_test_flakiness` |
| Configuration coverage | OS and browser coverage against the target matrix | `get_test_configuration_insights` |
| Execution health | Latest executions and per-result outcomes | `list_executions`, `read_execution`, `read_execution_test_results`, `find_test_results` |

The insight tools take an iteration. Several also take a date range. `analyze_test_flakiness` takes a lookback window and a minimum run count. See the tool schema for the exact parameters. State the iteration, date range, or window in the report.

## Core metrics

- Requirement coverage: total in-scope requirements, linked requirements, unlinked requirements, requirements with no tests, and requirements with no recent passing result.
- Test coverage: total cases, automated and manual split when available, unexecuted tests, stale tests, and blocked tests.
- Execution health: latest execution status, pass, fail, blocked, skipped, and not-run counts, pass rate, failed critical tests, and rerun status. A P0 or P1 test that failed and then passed on an unmodified rerun counts as a stability risk pending investigation. It is never a cleared blocker on its own.
- Defect risk: open defects, critical and high defects, defects linked to failed tests, reopened defects, and unresolved release-blocking bugs.
- Stability: flaky tests, repeated failures, recent pass and fail trend, and unstable configurations.
- Configuration coverage: tested browsers, devices, environments, and OS combinations against the release target matrix.
- Data quality: missing execution data, missing requirement links, missing ownership, incomplete steps, and ambiguous release scope.

## Evidence freshness

Results are stale when they predate the latest build or the latest change to a linked requirement. If the team gave no rule, state this one as your assumption. `list_executions` defaults to a short recent window, so widen the window to cover the release before you conclude that no execution exists.

## Requirement-based impact check

Requirement links are the dependency map. For a release, run the cases linked to changed requirements first, then the rest of the regression set. After the cycle, record every case you would have skipped under that order that failed anyway. Report that count as the recall of the impact order. A recall below 100 percent means the links are incomplete, and the confidence drops.

## Suggested readiness decision

Use `Ready` only when all of these hold:

- No open critical or high release-blocking defects remain.
- Critical requirements have test coverage and recent passing execution evidence.
- The latest execution pass rate fits the release context.
- No P0 or P1 tests are failed, blocked, or not run without accepted risk.
- Target configurations have enough coverage for the supported release matrix.

Use `Ready with risk` when:

- No known hard blocker remains, but moderate risks exist.
- Some lower-priority requirements, configurations, or tests are unexecuted.
- Flaky tests exist, are understood, and do not touch critical paths.
- Risk owners and mitigations are clear.

Use `Not ready` when:

- Critical or high release-blocking defects are open.
- Critical requirements lack tests or passing execution evidence.
- P0 or P1 tests are failed, blocked, or not run.
- Execution results are too stale or incomplete to support a decision.
- Required environments or configurations are untested.

## Output template

```text
Release Readiness: Ready | Ready with risk | Not ready
Confidence: High | Medium | Low

Key Metrics:
- Requirement coverage:
- Test execution:
- Defect risk:
- Stability:
- Configuration coverage:

Blocking Issues:
- ...

Risks / Gaps:
- ...

Recommendation:
- ...

Evidence:
- ...
```

## Practical rules

- Prefer specific counts and links over general statements.
- Separate actual risk from missing data.
- Do not return `Ready` when MCP data is unavailable. Mark confidence Low and say what must be verified.
- If thresholds are absent, use risk-based judgment and state the assumptions.
- If the release, sprint, or version scope is unclear, ask for it before the final call.
- A pass rate at or near 100 percent needs a spot check before it counts as readiness evidence. Confirm that the test count and the configuration coverage reflect what changed in this release.
- A stability result of all zeros needs a cross-check against the results when failures exist.
- The two execution ID spaces differ. Numeric True Platform IDs go to `list_executions` and `read_execution`. Cloud string IDs go to `list_execution_outputs`.
