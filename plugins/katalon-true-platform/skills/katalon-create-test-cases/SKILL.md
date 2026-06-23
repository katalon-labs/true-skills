---
name: katalon-create-test-cases
description: Create, update, organize, and link Katalon True Platform/TestOps manual test cases from a synced requirement key such as CEL-6, a read requirement, or free-text product behavior. Use when you need to analyze requirements, design ISTQB-aligned manual test cases, check existing Katalon coverage, avoid duplicate test cases, import only missing cases, update or link existing cases, or create/reuse a test suite for newly designed cases. For full requirement-to-execution workflows, combine with or defer to katalon-trueplatform-testing.
---

# Katalon Create Test Cases

Use this skill for the test design and import portion of Katalon True Platform work. Keep the larger `katalon-trueplatform-testing` skill available as the end-to-end orchestrator; this skill is only the focused create/update/link workflow.

## Availability Boundary

State the Katalon MCP boundary before promising writes:

- Available: list projects/repositories, find/read requirements, create/read/update/move test cases, find/manage folders, find/read/manage test suites, and link requirements to test cases.
- Not directly available: create requirements, create a formal Test Plan entity, inspect the live AUT UI, or guarantee downstream AI execution.
- Workaround for a test plan: create or reuse a named test suite/folder as the executable planning structure.

Read `references/capability-boundaries.md` when the user asks whether Katalon can do a specific operation.

## Resolve Context First

Before mutating Katalon data:

1. Call `list_projects`.
2. Call `list_repositories`.
3. Resolve the repository/Test Project from the user's wording, requirement key, or unique available repository.

Rules:

- Treat repository and Test Project as the same resolution target.
- If exactly one repository exists, use it.
- If multiple equally plausible repositories remain, ask the user to choose.
- If the user says "Katalon Cloud" or "cloud repo", prefer a repository named `Katalon Cloud` when present.
- Do not scan every repository just to avoid asking.

## Analyze Requirement

If the user provides a requirement key, use `find_requirements` or `read_requirement`. If the user provides free text, analyze it locally and only link requirements when a real requirement ID is known.

Output or internally track:

- Requirement intent
- Personas
- Main flows
- Alternate and negative flows
- Data and environment assumptions
- Risk areas
- Coverage recommendations

Read `references/requirement-analysis.md` before analyzing non-trivial requirements.

## Design Coverage

Design manual cases with ISTQB-aligned coverage:

- Equivalence partitioning for input classes, statuses, roles, filters, and product states.
- Boundary value analysis for ranges, quantities, prices, dates, pagination, and text lengths.
- Decision tables for business rules with multiple conditions.
- State transitions for lifecycle flows such as cart, checkout, status, and execution.
- Use-case scenarios for realistic end-to-end user journeys.
- Error guessing for ecommerce, account, permissions, environment, and data risks.

Prefer one test case per user-observable behavior. Keep true end-to-end flows as dedicated scenario cases, not mixed with unrelated checks.

Read `references/istqb-coverage.md` before creating cases from requirements, and `references/manual-test-case-format.md` before importing several cases.

## Check Existing Cases

This step is mandatory before every create/import attempt, including retries after partial failure:

1. If requirement IDs are known, call `find_test_cases_by_requirement`.
2. Search by requirement key, title keywords, feature area, and target folder with `find_test_cases`.
3. Read likely matches with `read_test_case` when the title alone is not enough to judge coverage.
4. Reuse, update, move, or link existing cases when they already cover the behavior.
5. Create new cases only for uncovered behavior, missing coverage classes, or clearly obsolete/incorrect cases.

Never create a duplicate just because a previous create call failed.

## Create Or Update Cases

Use Katalon tools in this order:

1. `create_test_case` only for uncovered manual cases.
2. `update_test_case` for revisions, passing all intended updates in one call.
3. `link_requirements_to_test_case` only after requirement IDs are known.
4. `read_test_case` after creation or update when verification matters.
5. `manage_test_folder` or `move_test_case` only when organization is requested or clearly needed.

Use this manual case shape:

- Title
- Description
- Pre-condition
- Steps
- Expected results
- Test data
- Priority
- Requirement links

## Test Suite Handling

When the user asks to create a test suite/test plan from the cases:

1. Search existing suites with `find_test_suites` before creating anything.
2. Read likely matching suites with `read_test_suite`.
3. Reuse the matching suite and add missing cases instead of creating a duplicate.
4. Create a new suite with `manage_test_suite` only when no suitable suite exists.
5. Verify the final suite with `read_test_suite`.

Report what was reused, updated, newly created, linked, and left uncovered.
