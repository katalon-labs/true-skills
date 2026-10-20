---
name: create-test-cases
description: Designs manual test cases from a synced requirement key such as CEL-6, a pasted requirement, or captured TrueTest sessions. Then creates, updates, and links them in Katalon True Platform (formerly TestOps) after a coverage and duplicate check. Use when a written requirement or real user behavior exists and cases do not. Not for unscripted exploration (exploratory-charter) or inventory cleanup (test-management). For the manual tester.
license: MIT
compatibility: Requires the Katalon True Platform MCP server and network access.
metadata:
  version: "0.5.0"
  mcp-contract: "katalon-docs-2026-10"
---

# Katalon Create Test Cases

This skill covers test design and import: read a requirement, design cases, check what exists, then create, update, and link. The `true-platform-testing` skill routes end-to-end requests here. Tool names below are bare. Clients add a prefix (Claude Code: `mcp__<server>__<tool>`).

## What the MCP can and cannot do

- **Can:** list projects and repositories, find and read requirements, find/read/create/update/move/duplicate test cases, manage folders and suites, read suite collections, link and unlink requirements, and generate cases from TrueTest sessions.
- **Cannot:** create requirements (they sync from Jira or Azure DevOps), create a formal Test Plan entity, or inspect the live application.
- **Test plan workaround:** create or reuse a named folder and suite as the executable planning structure.

Read `references/capability-boundaries.md` when the user asks whether the platform can do one specific operation.

## Resolve context first

Before any write:

1. Call `list_projects`, then `list_repositories`.
2. Treat repository and Test Project as one target.
3. If exactly one repository exists, use it. If several are equally likely, ask the user to choose.
4. If the user says "Katalon Cloud" or "cloud repo", prefer a repository named `Katalon Cloud`.
5. Do not scan every repository to avoid asking.

## Pick the source

| The user has | Start here |
|---|---|
| A requirement key | `find_requirements` or `read_requirement`, then "Analyze the requirement" below |
| Free text or a pasted spec | Analyze it locally. Link only when a real requirement ID is known. |
| Captured user sessions or a journey map | `references/from-truetest-sessions.md` |

## Analyze the requirement

Track these points: intent, personas, main flow, alternate and negative flows, data and environment assumptions, risk areas, and the coverage you recommend. Read `references/requirement-analysis.md` before analyzing a non-trivial requirement.

## Design coverage

Rank first, then apply techniques.

1. **Rank by risk.** Score each requirement line by impact and likelihood of failure. Use defect history when it helps (`get_defect_insights`). Put the most cases where the risk is highest.
2. **Apply techniques as tools.** ISTQB techniques (equivalence partitioning, boundary values, decision tables, state transitions, use-case scenarios, error guessing, pairwise) help you find cases. They do not prove coverage is complete. Model-based views such as a state diagram or a journey map are equal tools.
3. **State the gap.** Report what the design leaves uncovered and why. Never imply full coverage.

The deliverable is plain platform test cases. Read `references/istqb-coverage.md` before creating cases from requirements, and `references/manual-test-case-format.md` before importing several cases.

### Make each case atomic

Each case targets one validation condition (one acceptance line). It must still be a complete flow that runs on its own.

- Atomic limits the scope under test. It does not limit the step count. Every case walks the real path: precondition and navigation, valid surrounding data, the action under test, the expected result. A lone step such as "count the columns" is too thin. Run with AI cannot execute it.
- Split each input class, required field, boundary value, and error message into its own case. A password rule of "minimum 8 characters, one letter, one number, no spaces" becomes separate cases for 7 characters, exactly 8 characters, letters only, numbers only, and a space. Each case fills the whole form and submits. Only the field under test differs.
- Cover the main success flow and the boundary and negative variants around it.
- Combine features only in true end-to-end scenarios, such as register, log in, and land on the dashboard.
- Reason: a case that mixes conditions fails as a whole. The result cannot say which rule broke, and the requirement-line to test-result trace is lost.
- Quote expected error and UI strings verbatim from the requirement, including source typos. Flag a suspected typo separately. Never correct it silently in the expected result.

## Platform constraints

- Test case names accept only letters, numbers, spaces, and `( ) . , _ -`. Keep `@`, `:`, and `/` out of titles. Put them in descriptions or steps. Folder paths may use `/`.
- Prefer `update_test_case` over delete and recreate. `delete_test_case` is unreliable. Updating keeps IDs, links, and history.
- `create_test_case` with the AUTOMATED type creates nothing. It returns guidance. Create manual cases only.
- Suites reject a mix of MANUAL and AUTOMATED cases.
- No tool looks up assignees. Leave the assignee empty unless the user supplies a valid ID.
- When an update replaces the step list, send the full list. Check the tool schema.

## Check existing cases

This step is mandatory before every create, including retries after a partial failure.

1. If requirement IDs are known, call `find_test_cases_by_requirement`. Pass exactly one of the requirement identifiers it accepts.
2. Search with `find_test_cases` by requirement key, title keywords, feature area, and target folder.
3. Read likely matches with `read_test_case` when the title alone cannot settle coverage.
4. Reuse, update, move, or link existing cases that already cover the behavior.
5. Create new cases only for uncovered behavior, missing coverage classes, or clearly obsolete cases.

Never create a duplicate because an earlier create call failed. Search again first.

## Write in three phases: plan, validate, execute

Follow `references/write-policy.md`. One write set gets one confirmation. For more than a handful of cases, use the bulk plan in `references/bulk-write-plan.md`.

1. **Plan.** List every proposed create, update, link, move, and suite change. Mark each as reuse, update, or new.
2. **Validate.** Check the plan before any write: name charset, duplicate titles inside the plan and against existing cases, folder exists or is in the plan, requirement IDs are real, suite members share one type. Fix the plan before you touch the platform.
3. **Execute.** Show the plan summary. Get one confirmation. Then write in this order.
   1. `create_test_case` for uncovered manual cases only.
   2. `update_test_case` for revisions, one call per case with every intended change.
   3. `link_requirements_to_test_case` only after the requirement IDs are known.
   4. `manage_test_folder` or `move_test_case` when organization was requested or is clearly needed.
4. **Read back.** Call `read_test_case` for created and updated cases. Compare the result with the plan. Report any mismatch.

Case shape: title, description, pre-condition, steps, expected results, test data, priority, requirement links.

## Suites

When the user asks for a suite or test plan from the cases:

1. Search with `find_test_suites` before creating anything. Check `find_test_suite_collections` when the user names a collection.
2. Read likely matches with `read_test_suite`.
3. Reuse a matching suite and add the missing cases.
4. Call `manage_test_suite` to create a suite only when none fits.
5. Verify the final suite with `read_test_suite`.

Suite collections are read-only here. No tool creates or edits them.

## Report

State what was reused, updated, created, linked, and left uncovered. Name the risk ranking you used and the gaps that remain.

## Hand-offs

- Unscripted discovery first: `exploratory-charter`.
- Values, fixtures, and cleanup for the cases: `test-data`.
- Inventory hygiene and traceability audits: `test-management`.
- Running the cases: `execute-test`.
