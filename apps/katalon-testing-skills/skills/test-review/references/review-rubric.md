# Review rubric reference

Read this before you issue a verdict.

## Contents

- Three review lenses
- Atomicity heuristic
- Run-count floor
- Verdict decision table
- Output template
- Boundaries

## Three review lenses

| Lens | Tools | What to flag |
|---|---|---|
| Coverage | `fetch_requirement_metrics`, `find_test_cases_by_requirement`, `fetch_test_configuration_metrics` | orphan requirements; under-covered browsers, platforms, and operating systems |
| Quality | `fetch_test_case_metrics`, `read_test_cases`, `search` | cases that fail the atomicity heuristic; missing negative or boundary variants; vague or non-observable expected results; duplicate coverage |
| Reliability | `fetch_test_stability_metrics`, `find_test_results` | flaky cases; cases with erratic recent history; long-broken cases; suites with zero failures across their whole history, which gives no proof they can fail |

## Atomicity heuristic

A case is atomic when it checks one behavior against one oracle. The number of assertions does not decide this. A checkout flow may need several observations to show that one rule holds.

Ask these questions of each case:

1. **One behavior.** Can the case fail for two unrelated business rules? If yes, split it. Example: one case that checks both the discount rule and the tax rule.
2. **Independent failure.** If the first step fails, does the case still tell you something about the later steps? A case whose later steps can never run is a chain, not a unit. Consider a precondition instead.
3. **Strong oracle.** Does the expected result name an observable outcome (a value, a state, a message)? "Works correctly" and "page loads" are weak.
4. **Clear test data.** Does the case name its data, or does it depend on a record that may not exist? Hand data gaps to `test-data`. Read the steps with `read_test_cases` and `content_type` `FLOW`. The default `NONE` returns metadata only.
5. **Needed observations only.** Extra assertions on unrelated page details make a case brittle. Several assertions on one outcome do not.

Do not flag a case for having many assertions alone. Flag it for failing one of the questions above, and say which.

Check for missing variants too: one negative case and one boundary case for each rule that has a limit.

## Run-count floor

Give a stability signal a floor before it drives a verdict. Label one or two failures over fewer than about 10 recent runs as **unconfirmed** and say so in the fix list. `fetch_test_stability_metrics` takes a lookback window (`from_date`, `to_date`) and has no minimum-run parameter. Count the runs per case with `find_test_results` and apply a floor of 10 unless the team states another floor.

If a stability tool returns zero flaky cases for a suite that has recorded failures, cross-check with `find_test_results` before you trust the zero. Raise `limit_tests` if you need more than three cases per category. An earlier version of this tool returned all zeros on one project (observed 2026-08-03).

## Verdict decision table

| Coverage | Flaky in critical path | Verdict |
|---|---|---|
| meets plan | none | Approve |
| meets plan | some non-critical | Approve with fixes |
| minor gaps | none | Approve with fixes |
| critical orphan requirements | any | Reject for pipeline |
| any | flaky in smoke or regression core | Reject for pipeline |

## Output template

```text
Verdict:        Approve | Approve with fixes | Reject for pipeline
Coverage:       requirements covered X/Y; configurations covered A/B; orphans: <list>
Quality flags:  <case: which heuristic question it fails>
Reliability:    flaky: <case: stability signal, window, run count, confirmed or unconfirmed>
Conventions:    <team memory records applied, or "memory unavailable">
Fix list:       <case -> action -> owner hint>
Risk if run as-is: <one line>
```

## Boundaries

- Case code, locators, and object maintainability are Studio-side. Say so. Do not claim to have reviewed script internals through the MCP.
- Flakiness is a platform signal read through `fetch_test_stability_metrics`. Report it. Do not recompute it.
- Accessibility has no MCP tool. If the suite covers a user interface, say whether any case asserts accessibility. If none does, flag the gap. An axe-core check through Playwright is one way to close it on a local run.
