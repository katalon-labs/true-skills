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
3. Iteration (sprint or release): `find_iterations`. Use it when the user names one. It returns a name and dates. It does not bind anything. Its `filter` takes a type (Sprint, Release, or All) with a `scope` (`CURRENT`, `PREVIOUS`, `NEXT`, `ACTIVE`, `LAST_N`, or `RECENT`) or a structured query. Set `detail_level` to `FULL` for dates and state.
4. Team conventions: `memory_list` once. Read matching records with `memory_read`. Use them for naming, folder layout, and suite rules. If `available` is false, say memory is unavailable and plan without it.

Carry `project_id` and `repository_id` into every later call. The MCP keeps no session state. `find_test_cases`, `find_test_folders`, and `find_test_suites` start at page 0. Copy `next_page_token` into `page_number` for the next page. A null `next_page_token` means the list ended. `page_size` is at most 100 on `find_test_cases` and `find_test_folders`.

## Risk signals

Use only what the MCP returns, plus numbers the user supplies.

| Signal | Tool | Use |
|---|---|---|
| Requirement coverage for the iteration | `fetch_requirement_metrics` | Uncovered and partly covered requirements rank first. Give `iteration_type` and `iteration_name`. |
| Requirement to case links | `find_test_cases_by_requirement` | A requirement with no case is the top gap. Pass exactly one identifier (`requirement_id`, `key`, or `requirement_external_id`). |
| Configuration coverage | `fetch_test_configuration_metrics` | Browsers and platforms with no coverage are plan risk. Set `configuration_type` to `OS` or `BROWSER`. |
| Flaky, always failing, newly failing, slow cases | `fetch_test_stability_metrics` | Unstable areas need repair before they join the scope. Set `return_tests` to get case names. |
| Flakiness over a lookback window | `fetch_test_stability_metrics` with `return_tests: ["FLAKY"]` | Set `from_date` and `to_date`. The tool has no minimum-run parameter, so count runs per case with `find_test_results`. About 10 runs is the floor. |
| Defect standing | `fetch_defect_metrics` | Areas with open critical defects need retest cases in scope. `UNRESOLVED` is the default `resolution_state`. |

Each metrics tool except `fetch_requirement_metrics` takes a `filter` with a mandatory `filter_type` (`ITERATION`, `DATE_RANGE`, or `DEFAULT`, which is the last 28 days). See the tool schema for exact fields. If a stability tool returns zero for an area that has recorded failures, cross-check with `find_test_results` before you trust it. An earlier version of this tool returned all zeros on one project (observed 2026-08-03).

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
Suite:   <Feature> - <Sprint or Release name> - Manual        (manage_test_suite, testSuiteTestType MANUAL)
Suite:   <Feature> - <Sprint or Release name> - Automated     (manage_test_suite, testSuiteTestType AUTOMATED)
         + the selected cases added to the matching suite
```

Rules:

- Put the iteration name in the suite name. No suite field binds a suite to an iteration. If the tool schema in your session shows one, use it and say so. A run, not a suite, carries `sprint_id` and `release_id` on `create_test_run`.
- Keep MANUAL and AUTOMATED cases in separate suites. A suite that mixes them is rejected, and the first cases you add must match the suite type.
- Reuse a folder or suite that already matches. Search with `search` (`types` `["test_folder", "test_suite"]`, `include_documents` false), then confirm with `find_test_folders` and `find_test_suites`. Do not create a duplicate. A `search` hit carries a title and a reference only. Read the asset before you rely on it. Case folder paths start with `Test Cases`. Suite folder paths start with `Test Suites`. A suite `path` defaults to `Test Suites`.
- Resolve a folder ID with `find_test_folders` by its full `rawPath`. Same-named folders under different parents are different folders.
- Report the suite ID and folder path as the execution scope. List the requirement to case matrix and the open gaps next to it.

## Schedules and collections

- `list_schedule` finds saved schedules by name. `read_schedule_detail` reads one. Use them to learn whether the scope already runs on a timer.
- `update_schedule_configuration` edits existing schedules. It is a write. Preview the change, get one confirmation, and call it once with every target schedule in one `updates` array and only the settings the user asked for. Never infer `timeZone`. Ask for the IANA zone. `startTime` must be in the future.
- A new schedule is created with `create_test_run` in automated mode plus a schedule from `build_schedule`. That belongs to `execute-test` and needs execution consent.
- `find_test_suite_collections` reads collections. Fetch the details with the chosen `collection_id` before a collection run, because `execute-test` passes the returned `testSuiteEntries` to `create_test_run`. No tool creates or edits one. If the plan needs a new collection, tell the user to create it in the True Platform UI.

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
Conventions:       <team memory records followed, or "memory unavailable">
Execution scope:   folder and suite(s), IDs, named for <sprint or release>
Schedule:          <existing schedule found, or none>
Next:              gaps to fill (create-test-cases), cost (test-estimation), run (execute-test)
```
