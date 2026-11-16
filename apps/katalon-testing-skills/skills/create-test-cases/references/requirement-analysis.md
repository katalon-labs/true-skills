<!-- GENERATED from shared/references/requirement-analysis.md - edit the source -->
# Requirement Analysis Checklist

Use this checklist before you write tests from requirements.

## Inputs To Gather

- Requirement source: Jira key, Azure DevOps item, Katalon requirement ID, pasted text, or URL.
- Target AUT and environment.
- Persona or role.
- Business objective.
- Acceptance criteria. If they are missing, ask the user in chat. Do not invent them.
- Known constraints, data, permissions, and dependencies.
- Sprint or release scope, if test assets should follow an iteration. Use `find_iterations` to read it.

## Analysis Output

Produce:

- Requirement summary: what must be true for the feature to be accepted.
- Main flow: the happy path from user intent to expected outcome.
- Alternate flows: optional paths, branches, pagination, sorting, filtering, and retries.
- Negative flows: invalid data, missing data, permissions, empty states, and unavailable items.
- Data matrix: the values the manual tests need.
- Risk matrix: the areas that deserve P0 and P1 tests.
- Coverage map: requirement or story to proposed test cases.

## Katalon Requirement Handling

- Use `find_requirements` to search synced Jira or Azure DevOps requirements.
- Use `read_requirement` for one requirement by source key or internal ID. Read `customFields` before you call a requirement thin. Acceptance criteria and steps to reproduce often live there, not in the description.
- Use `find_test_cases_by_requirement` to see existing coverage. Pass exactly one of `requirement_id`, `key`, or `requirement_external_id`. Zero or several identifiers return a validation error.
- Use `search` for domain context. Set `types` to `["requirement"]` for requirements. Leave `include_documents` on to include uploaded specification documents. A requirement hit is context. It is no coverage link.
- Use `manage_requirement_test_case_linkages` with `action` set to `link` after the cases exist.
- Use `fetch_requirement_metrics` for coverage status of a sprint or release. Check that the iteration exists with `find_iterations` first.
- The MCP cannot create requirements. It can find, read, and link synced ones.
