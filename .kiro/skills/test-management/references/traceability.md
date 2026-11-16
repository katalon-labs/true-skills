# Traceability reference

## The trace map (the deliverable)

```text
Requirement  ->  Test case(s)       ->  Suite(s)       Coverage
CEL-6            TC-1042, TC-1043       Auth/Smoke      covered
CEL-7            TC-1050                (none)          covered but in no suite
CEL-8            (none)                 (none)          ORPHAN requirement
-                TC-1099                (none)          ORPHAN case (no requirement link)
```

Coverage percentage = requirements with at least one linked case, divided by in-scope requirements. State the denominator and the iteration or filter that defines "in scope".

## Tool sequence for an audit

1. `find_requirements`, or the keys the user supplied. This is the in-scope requirement set. Page through every result.
2. `find_test_cases_by_requirement` per requirement. Pass exactly one identifier per call. Zero or several identifiers is a validation error.
3. `find_iterations` to confirm the sprint or release exists, then `fetch_requirement_metrics` (`iteration_type` `SPRINT` or `RELEASE`, `iteration_name`) for the platform coverage status of the iteration. The tool takes no date range. Reconcile it against your link map. Report any disagreement. Do not pick one silently.
4. `find_test_cases` by folder or feature. Surface cases that never appeared in step 2. These are the orphan cases.
5. `find_test_suites`, then `read_test_suite` for suites that matter. Map each linked case to its suites.
6. `find_test_suite_collections` when the user cares about release or cycle groupings. A collection groups suites. It is read-only.
7. Diff. Requirements with no case are orphan requirements. Cases with no requirement are orphan cases. Cases in no suite are unscheduled.

## Classification rules

- **Covered:** the requirement has at least one linked, current test case.
- **Partially covered:** linked cases exist but leave known behavior untested. Defer the judgment to `test-review`.
- **Orphan requirement:** no linked case. This is the top gap. Route it to `create-test-cases` or `test-plan`.
- **Orphan case:** no requirement link. Link it if a requirement is known. Otherwise flag it for review. Never delete it without approval.
- **Duplicate candidate:** two cases with the same intent in one folder. Propose which to keep. Do not merge or delete in the same pass.

## Plan format for changes

Use one row per change. Every row has a basis.

| # | Change | Target | Detail | Basis |
|---|---|---|---|---|
| 1 | link | TC-1099 to CEL-6 | Requirement key | Key read with `read_requirement`; applied with `manage_requirement_test_case_linkages` |
| 2 | unlink | TC-1042 from CEL-9 | Requirement key | Case steps cover login only, with no discount step |
| 3 | move | TC-1050 to `Test Cases/Auth/Smoke` | Folder path | Folder found with `find_test_folders` |
| 4 | folder create | `Test Cases/Auth/Smoke` | Path | No match in `find_test_folders` |
| 5 | suite add | Suite `Auth Smoke` | Case list | Suite found with `find_test_suites` |

Keep a plan to about 40 rows. Split a larger set into batches. Confirm and execute one batch at a time.

## Safe mutation

Check these before you ask for confirmation.

- Every case name starts with a letter or digit and contains only letters, numbers, spaces, and `( ) . , _ -`. A rename must keep to the same charset.
- Every move target path starts with `Test Cases` or `Test Cases/`. Every folder in a path exists or has an earlier create row.
- Every requirement ID in a link row was confirmed in this session.
- Every suite keeps one type. A suite rejects a mix of MANUAL and AUTOMATED cases.
- No row deletes a case, folder, or suite unless the user named that exact target and said yes.
- Prefer `update_test_cases` and `move_test_case` over `delete_test_case`. Delete has returned server errors. A folder DELETE needs the exact folder `id` from `find_test_folders` by full `rawPath`, never an ancestor from `treePath`.
- `manage_requirement_test_case_linkages` takes `requirement_ids` and `test_case_ids` and runs per requirement in parallel, so it can succeed in part. After execution, re-read the links with `find_test_cases_by_requirement` for each changed requirement and report any gap.
- `unlink` is destructive for traceability. Ask for a yes that names the links.
- Never fabricate a requirement to case link. Link confirmed IDs only.

## Read back

For each changed requirement, call `find_test_cases_by_requirement` and compare with the plan. For each changed suite, call `read_test_suite`. For each moved case, call `read_test_cases` and check the folder path when the result shows it. Report each row as done, skipped, or failed.
