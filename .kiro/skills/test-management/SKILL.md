---
name: test-management
description: Organizes and traces Katalon True Platform (formerly TestOps) test assets such as folders, suites, suite collections, case moves, and requirement links. Produces a requirement-to-test traceability report with coverage percentage, orphan requirements, and orphan cases. Use when a repository needs inventory hygiene or a coverage map. Not for authoring cases (create-test-cases) or quality verdicts (test-review). For the test lead.
license: MIT
compatibility: Requires the Katalon True Platform MCP server and network access.
metadata:
  version: "0.5.0"
  mcp-contract: "katalon-docs-2026-10"
---

# Katalon Test Management

This skill covers the management stage: keep the test inventory organized, findable, and traceable to requirements. The headline output is a requirement to test case to suite map. Folder tidying is secondary. Tool names below are bare. Clients add a prefix (Claude Code: `mcp__<server>__<tool>`).

## What the MCP can and cannot do

- **Can:** folders (`find_test_folders`, `manage_test_folder`), suites (`find_test_suites`, `read_test_suite`, `manage_test_suite`), suite collections (`find_test_suite_collections`, read-only), case organization (`move_test_case`, `duplicate_test_case`, `delete_test_case`), search (`find_test_cases`), requirement links (`link_requirements_to_test_case`, `unlink_requirements_from_test_case`, `find_test_cases_by_requirement`), and requirement coverage (`get_requirement_insights`).
- **Cannot:** author custom fields or tags, create dynamic test suites, configure Git repositories, upload scripts, or manage project governance and notifications. These are platform UI or Studio operations. Name them as boundaries. Never claim an MCP write for them.
- **Collections are read-only.** No tool creates or edits a suite collection.
- **Names:** test case names accept only letters, numbers, spaces, and `( ) . , _ -`. Folder paths allow `/`. A move target path must start with `Test Cases`.
- **Deletes:** prefer `update_test_case` and `move_test_case`. `delete_test_case` is unreliable.
- **Suites:** a suite rejects a mix of MANUAL and AUTOMATED cases.

## Traceability workflow

```text
+---------------------+     +-----------------------+     +----------------------+
| Read requirements   | --> | Map cases to reqs     | --> | Find orphans + gaps  |
+---------------------+     +-----------------------+     +----------------------+
        |                             |                              |
        v                             v                              v
+---------------------+     +-----------------------+     +----------------------+
| Plan fixes          | --> | Confirm, then execute | --> | Report traceability  |
+---------------------+     +-----------------------+     +----------------------+
```

## Steps and tool rules

1. **Establish scope.** Call `list_projects`, then `list_repositories`. Resolve one target from context. Ask when several are equally likely.
2. **Build the trace map.** For each in-scope requirement, call `find_test_cases_by_requirement`. Pass exactly one requirement identifier per call. Call `get_requirement_insights` for the platform coverage status of an iteration. Classify each requirement as covered, partially covered, or orphan.
3. **Find loose assets.** Use `find_test_cases` by feature, folder, and keyword. Look for cases with no requirement link (orphan cases) and for duplicates. Page through every result. A first page is not the inventory.
4. **Plan the changes.** Write one plan: links to add, links to remove, cases to move, folders to create, suite changes. Use the plan format in `references/traceability.md`. Never guess a link. Link only IDs you confirmed with `read_requirement` or `find_requirements`.
5. **Validate, confirm, execute.** Follow `references/write-policy.md`. Check the plan against the rules in "Safe mutation" in `references/traceability.md`. Show the plan. Get one confirmation. Then call `link_requirements_to_test_case`, `unlink_requirements_from_test_case`, `manage_test_folder`, `move_test_case`, and `manage_test_suite`. Reuse an existing folder or suite before creating one.
6. **Read back.** Re-run `find_test_cases_by_requirement` for each changed requirement and `read_test_suite` for each changed suite. Link calls can fail in part. Confirm every link you meant to change.
7. **Report the traceability matrix.** Show requirement, case, suite, coverage percentage, orphan requirements, orphan cases, and duplicate candidates. This is the deliverable.

Deletes and folder or suite DELETE actions need an explicit yes that names the target. A bulk plan never hides one.

## Prompt recipes

- `Audit requirement-to-test traceability for project X and list every requirement with no test case.`
- `Reorganize the smoke suite: move all P0 login cases into Test Cases/Auth/Smoke and report the new structure.`
- `Link test cases TC-1042 and TC-1043 to requirement CEL-6 and confirm the coverage.`
- `Find duplicate test cases in the Checkout folder and propose which to keep.`
- `Which suites sit in the Release 12 collection, and which requirements do they cover?`

## Hand-offs

- Coverage gaps found: `create-test-cases` to author, `test-plan` to schedule.
- Quality verdict on the organized suite: `test-review`.
- Cases that keep breaking: `test-maintenance`.

Read `references/traceability.md` before you run an audit.
