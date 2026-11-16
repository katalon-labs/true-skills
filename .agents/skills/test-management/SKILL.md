---
name: test-management
description: Organizes and traces Katalon True Platform (formerly TestOps) test assets such as folders, suites, suite collections, case moves, and requirement links. Produces a requirement-to-test traceability report with coverage percentage, orphan requirements, and orphan cases. Use when a repository needs inventory hygiene or a coverage map. Not for authoring cases (create-test-cases) or quality verdicts (test-review). For the test lead.
license: MIT
compatibility: Requires the Katalon True Platform MCP server and network access.
metadata:
  version: "0.6.0"
  mcp-contract: "katalon-docs-2026-10"
---

# Katalon Test Management

This skill covers the management stage: keep the test inventory organized, findable, and traceable to requirements. The headline output is a requirement to test case to suite map. Folder tidying is secondary. Tool names below are bare. Clients add a prefix (Claude Code: `mcp__<server>__<tool>`).

## What the MCP can and cannot do

- **Can:** folders (`find_test_folders`, `manage_test_folder`), suites (`find_test_suites`, `read_test_suite`, `manage_test_suite`), suite collections (`find_test_suite_collections`, read-only), case organization (`move_test_case`, `duplicate_test_case`, `delete_test_case`), search (`find_test_cases`, and `search` for semantic lookups across cases, suites, folders, and requirements), requirement links (`manage_requirement_test_case_linkages` with `action` `link` or `unlink`, `find_test_cases_by_requirement`), iterations (`find_iterations`), requirement coverage (`fetch_requirement_metrics`), and the team's saved conventions (`memory_list`, `memory_read`).
- **Cannot:** define custom fields, custom test types, or tag definitions as admin objects, create dynamic test suites, configure Git repositories, upload scripts, or manage project governance and notifications. These are platform UI or Studio operations. Name them as boundaries. Never claim an MCP write for them.
- **Tags and custom test types on a case are writable** through `create_test_case` and `update_test_cases` since 2026-11-05. A new tag name is created on the fly. `origin` is read-only. Read each tool schema for the action names.
- **Git-backed repositories are read-only for folders.** In a repository that comes from Git, such as a Playwright repository, the web UI offers no create, move, or rename for folders. Plan no folder write there. No tool run has confirmed what `manage_test_folder` does on such a repository, so tell the user to change the folder in the repository. Katalon Cloud repositories take folder writes.
- **Collections are read-only.** No tool creates or edits a suite collection.
- **Names:** test case names start with a letter or digit and accept only letters, numbers, spaces, and `( ) . , _ -`. Folder paths allow `/`. A move target path must start with `Test Cases` or `Test Cases/`. Suite folder paths start with `Test Suites`.
- **Deletes:** prefer `update_test_cases` and `move_test_case`. `delete_test_case` is unreliable.
- **Conventions:** call `memory_list` once at the start. Read matching headlines with `memory_read` and follow them for folder and suite naming, quoting the record. Never restate a memory as a platform fact. If `available` is false, say memory is unavailable. Never call `memory_write` or `memory_forget` unless the user asks you to remember or forget something.
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
2. **Build the trace map.** For each in-scope requirement, call `find_test_cases_by_requirement`. Pass exactly one requirement identifier per call. Call `find_iterations` to confirm the sprint or release exists, then `fetch_requirement_metrics` (`iteration_type` `SPRINT` or `RELEASE`, `iteration_name`) for the platform coverage status of that iteration. Classify each requirement as covered, partially covered, or orphan.
3. **Find loose assets.** Use `find_test_cases` by feature, folder, keyword, tags, and custom test type. The `tags` and `customTestTypes` filters take name lists that combine with AND. An unknown name returns an error that lists the valid names and runs no search, so use that error to learn the valid names. The name filter takes an array (`name =in= ["logout","log out"]`). A comma-joined string matches nothing. The status values are DRAFT, READY_TO_REVIEW, IN_REVIEW, PUBLISHED, and INACTIVE. Add `include_attributes` on `read_test_cases` to read tags, feature areas, custom test types, author, and assignee. Look for cases with no requirement link (orphan cases) and for duplicates. Page through every result and stop on an empty page, not on `has_more`. A first page is not the inventory.
4. **Plan the changes.** Write one plan: links to add, links to remove, cases to move, folders to create, suite changes. Use the plan format in `references/traceability.md`. Never guess a link. Link only IDs you confirmed with `read_requirement` or `find_requirements`.
5. **Validate, confirm, execute.** Follow `references/write-policy.md`. Check the plan against the rules in "Safe mutation" in `references/traceability.md`. Show the plan. Get one confirmation. Then call `manage_requirement_test_case_linkages` (`link` or `unlink`; many-to-many, so batch the plan into as few calls as the plan allows), `manage_test_folder`, `move_test_case`, and `manage_test_suite`. An `unlink` removes traceability: ask for a yes that names the links. Reuse an existing folder or suite before creating one. Check with `find_test_folders` and `find_test_suites`, and with `search` (`types` `test_folder` and `test_suite`) when names differ. A `search` response with `incomplete=true`, `retrieval_mode="keyword_fallback"`, or a warning never proves that something is missing.
6. **Read back.** Re-run `find_test_cases_by_requirement` for each changed requirement and `read_test_suite` for each changed suite. Link calls run per requirement in parallel and can fail in part. Confirm every link you meant to change.
7. **Report the traceability matrix.** Show requirement, case, suite, coverage percentage, orphan requirements, orphan cases, and duplicate candidates. This is the deliverable.

Deletes and folder or suite DELETE actions need an explicit yes that names the target. A bulk plan never hides one.

## New Test Cases table

Some tenants show a new Test Cases table. It adds a repository filter, a Create menu, a tree actions menu, a column picker, a View menu with a sub-folder switch, a `+ All` choice in Create Test Suite, and multi-select add to a suite. It is web UI only and it was seen on one tenant only (2026-11). The Create menu shows no Create button on a Git repository. Use these controls for hand work and the tools above for scripted work.

## REST fallback

When the MCP cannot do a bulk job, a REST import is the fallback. It has traps that cost a retry. Read `references/rest-bulk-import.md` first. The one rule that always applies: the import task echoes the caller's token in its input, so never log, print, or paste a task response.

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
