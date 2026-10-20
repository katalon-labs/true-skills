# Bulk write plan

Read this when a request creates or changes more than a handful of cases. The plan is the single object the user confirms.

## Plan format

Write the plan as a table in the reply, or as a local JSON file if the user wants to keep it. Use one row per operation.

| # | Operation | Target | Detail | Basis |
|---|---|---|---|---|
| 1 | create | `Checkout / Guest` | Title, priority, requirement key | No match from `find_test_cases` or `search` |
| 2 | update | TC-2101 | Fields that change, as `update_test_cases` actions in one call | Existing case covers the line but lacks test data |
| 3 | link | TC-2101 to CEL-9 | Requirement key | Key confirmed with `read_requirement`; one `manage_requirement_test_case_linkages` call |
| 4 | move | TC-2102 to `Test Cases/Checkout` | New folder path | Folder exists |
| 5 | suite add | Suite `CEL-9 Regression` | Case list | Suite found with `find_test_suites` |

Rules for the table:

- Every row has a basis. A row with no basis is a guess. Drop it.
- Mark each case as reuse, update, or new. Reuse needs no write and appears so the user sees the coverage.
- Give new cases their final titles. Titles are checked below.
- Keep the plan under about 40 rows. Split a larger set into batches. Confirm and execute one batch at a time.

## Validation checks

Run every check before you ask for confirmation. Fix the plan, then re-run.

1. Every name starts with a letter or digit and contains only letters, numbers, spaces, and `( ) . , _ -`.
2. No two new titles in the plan match. No new title matches an existing case in the target folder.
3. Every folder path exists or has a create row earlier in the plan. Check with `find_test_folders` on the full `rawPath`. A move target path starts with `Test Cases`.
4. Every requirement key was read with `read_requirement` or found with `find_requirements` in this session.
5. Every suite member has the same type. Do not mix MANUAL and AUTOMATED.
6. Every create is a manual case. An AUTOMATED create produces nothing.
7. No row deletes a case. If the user asked for a delete, name the target and get an explicit yes for it alone.
8. Each case is atomic: one validation condition, a complete flow.

## Execute and read back

1. Show the validated plan with a one-line count per operation type.
2. Get one confirmation.
3. Run the rows in this order: folders, creates, updates, links, moves, suite changes.
4. Carry IDs from each result into the next call. Do not re-search.
5. On a failed row, stop that row. Do not retry a create until you search again for the title.
6. Read back every created or updated case with `read_test_cases` (`content_type` `FLOW`). Read each changed suite with `read_test_suite`.
7. Report per row: done, skipped, or failed, with the reason.
