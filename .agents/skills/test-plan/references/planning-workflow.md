# Planning workflow reference

Read this before you propose scope. It holds the scope order, the risk signals, the impact-based selection rule, the structure you build, and the plan template.

## Contents

- Scope resolution order
- Risk signals
- Impact-based selection and the recall check
- Execution scope structure
- Schedules and collections
- AI features in scope
- Plan output template

## Scope resolution order

1. Project: `list_projects`. Use one match from context, otherwise ask.
2. Repository (Test Project): `list_repositories`. Treat repository and Test Project as the same target. Prefer the `Katalon Cloud` repository when the user says "cloud repo".
3. Iteration (sprint or release): `find_iterations`. Use it when the user names one. It returns a name and dates. It does not bind anything.

Carry `project_id` and `repository_id` into every later call. The MCP keeps no session state.

## Risk signals

Use only what the MCP returns, plus numbers the user supplies.

| Signal | Tool | Use |
|---|---|---|
| Requirement coverage for the iteration | `get_requirement_insights` | Uncovered and partly covered requirements rank first. |
| Requirement to case links | `find_test_cases_by_requirement` | A requirement with no case is the top gap. Pass exactly one identifier. |
| Configuration coverage | `get_test_configuration_insights` | Browsers and platforms with no coverage are plan risk. |
| Flaky, always failing, newly failing, slow cases | `analyze_test_case_stability` | Unstable areas need repair before they join the scope. |
| Flakiness over a lookback window | `analyze_test_flakiness` | Set a minimum run count of about 10. Fewer runs give an unconfirmed signal. |
| Defect standing | `get_defect_insights` | Areas with open critical defects need retest cases in scope. |

Each insights tool accepts an iteration or a date range. See the tool schema for exact fields. If a stability tool returns zero for an area that has recorded failures, cross-check with `find_test_results` before you trust it. An earlier version of this tool returned all zeros on one project (observed 2026-08-03).

Do not invent production traffic, change frequency, or defect rates. If the user supplies them from TrueTest, an analytics product, or Jira, use them and name the source.

## Impact-based selection and the recall check

Requirement links are the dependency map. Select by requirement-based impact analysis:

1. Take the requirements that changed in the iteration, or that the user names.
2. Run the cases linked to those requirements first.
3. Run the remaining cases next, as capacity allows.

This is a rule over links. It is not machine-learned test selection. Do not promise that.

Add a recall check. After the cycle, list the cases that the plan would have skipped but that failed. If that list is not empty, the links are incomplete or the ranking is wrong. Report the cases and hand the missing links to `test-management`.

## Execution scope structure

The platform holds folders and suites. Use them as the runnable scope:

```text
Folder:  Test Cases/<Release or Feature>/
Suite:   <Feature> - <Sprint or Release name> - Manual        (manage_test_suite)
Suite:   <Feature> - <Sprint or Release name> - Automated     (manage_test_suite)
         + the selected cases added to the matching suite
```

Rules:

- Put the iteration name in the suite name. No documented suite field binds a suite to an iteration. If the tool schema in your session shows one, use it and say so.
- Keep MANUAL and AUTOMATED cases in separate suites. A suite that mixes them is rejected.
- Reuse a folder or suite that already matches. Search with `find_test_folders` and `find_test_suites` first. Do not create a duplicate.
- Report the suite ID and folder path as the execution scope. List the requirement to case matrix and the open gaps next to it.

## Schedules and collections

- `list_schedule` finds saved schedules by name. `read_schedule_detail` reads one. Use them to learn whether the scope already runs on a timer.
- `update_schedule_configuration` edits existing schedules. It is a write. Preview the change, get one confirmation, and pass every target schedule in a single call.
- A new schedule is created with `create_test_run` in automated mode plus a schedule from `build_schedule`. That belongs to `execute-test` and needs execution consent.
- `find_test_suite_collections` reads collections. No tool creates or edits one. If the plan needs a new collection, tell the user to create it in the True Platform UI.

## AI features in scope

When the scope includes a feature that uses a model, plan for outputs that vary between runs. A single pass proves little. Add a repeat-run count to the plan, name the data set the cases use, and add an exploratory session for the feature. Ask the user which quality risks the team accepts for it. `test-review` holds the review checklist for suites that test AI features.

## Plan output template

```text
Objective:         <the quality outcome this plan targets>
In scope:          <features and requirements>
Out of scope:      <excluded items and the reason>
Coverage matrix:   requirement -> planned or existing cases (mark gaps)
Risk ranking:      1..n, each with the signal that drove the rank
Environments:      <AUT and configuration targets>
Execution scope:   folder and suite(s), IDs, named for <sprint or release>
Schedule:          <existing schedule found, or none>
Next:              gaps to fill (create-test-cases), cost (test-estimation), run (execute-test)
```
