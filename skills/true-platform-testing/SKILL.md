---
name: true-platform-testing
description: End-to-end Katalon True Platform testing workflow and lifecycle router. Use when one request spans several stages and no single skill owns all of it, for example analyze a requirement, design and import the cases, build a suite, run it with AI, and report the outcome. Also use to route any testing request across the full 7-stage lifecycle (plan, design, manage, review, execute, analyze, maintain) to the right focused skill, and for deciding what is and is not available through the Katalon MCP tools. Start here when a request names a job rather than one task, such as drive the whole chain from requirement to ship call. Also start here when the asker wants orienting before acting, for example where do I start, which skill do I need, or I own quality here and do not know where to begin. Routes the asker to the skill that owns their next step, whether they say manual tester, QA analyst, test analyst, automation tester, SDET, automation engineer, QA engineer, test lead, QA lead, test manager, or QA manager.
---

# Katalon True Platform Testing

Use this skill for requirement-to-execution workflows in Katalon True Platform/TestOps, and as the **router across the full 7-stage testing lifecycle**. Prefer Katalon MCP tools for platform operations and the client's browser/computer tools for external AUT exploration or local execution of pinned TestPak steps.

## Role Routing

Ask who is in front of you before asking which stage they are in. A skill is listed here when a request phrased in role terms, naming no skill, should land there first. Everything else is reached by handoff.

| Role | Comes here to | Starts at | Then |
|---|---|---|---|
| Manual tester | turn a written requirement into cases and run them | `create-test-cases` | `execute-test`, `analyze-failures` |
| Automation tester | turn cases into code, run it, ship the results | `test-case-to-playwright` | `playwright-execute`, `upload-report`, `test-maintenance` |
| Test lead | scope the cycle, judge readiness, keep the suite healthy | `test-plan` | `test-review`, `test-management`, `release-analyze` |
| Test manager | read coverage and risk, and call ship | `release-analyze` | `test-review`, `test-management` |

`platform-setup` is role-neutral and comes first for everyone who has not connected the MCP yet. Synonyms (SDET, automation engineer, QA engineer, QA analyst, test analyst, QA lead, QA manager), the full intent-to-skill map, and what to fall back to for the parts not built yet are in `references/lifecycle-map.md`.

## Lifecycle Routing

The Katalon testing lifecycle has 7 stages. For a focused request, route to the matching skill; for a full-flow request, run the stages in order and stop when the user's goal is met. Full map + tool lists: `references/lifecycle-map.md`.

| Stage | Route to skill | When |
|---|---|---|
| 1 Plan | `test-plan` | scope, risk-prioritized plan, executable folder+suite for a sprint/release |
| 2 Design | `create-test-cases` (+ `test-case-to-playwright`) | author/import cases from requirements |
| 3 Manage | `test-management` | organize inventory, classify, requirement traceability audit |
| 4 Review | `test-review` | pre-pipeline coverage/quality/flakiness verdict |
| 5 Execute | `execute-test` (+ `upload-report`, `playwright-execute`) | manual, Run with AI, automated, cloud |
| 6 Analyze | `analyze-failures` + `release-analyze` | failure triage/defects; ship/no-ship call |
| 7 Maintain | `test-maintenance` | repair flaky/broken cases, regenerate, feed gaps back to plan |
| pre / cross | `platform-setup` | connect and verify the MCP |

For multi-skill plays (requirement-to-ship, coverage rescue, flaky cleanup, manual-to-automation, cross-lane trust check, traceability audit) read `references/combination-recipes.md`. For copy-paste prompts and cross-model/cross-agent execution notes read `references/prompt-recipes.md`. For the full MCP tool list read `references/mcp-tool-index.md`.

This skill can run any stage inline itself (the workflows below cover requirement->execution->report); route to a focused skill when the user wants only that stage or a deeper treatment (traceability, review verdict, failure triage, maintenance).

## Autonomy Policy

When the user asks for an end-to-end Katalon flow, try to complete the full available workflow without pausing for optional decisions:

Resolve requirements → create/reuse cases and suite → create/reuse TestPak → execute through the user's chosen path → record observations/evidence → End → report observed results. Read `execute-test` for the detailed TestPak loop.

Default assumptions:

- If exactly one Katalon project or repository matches the user's wording or current context, use it.
- If exactly one repository exists, use it.
- If no AUT environments exist and the user supplied or requirement contains a URL, use that URL as `default_aut_environment_url` for AI execution.
- If AUT environments exist, choose the environment whose URL/name best matches the target AUT. Ask only if no match is clear.
- Creating a run does not authorize hosted AI. Use the chosen execution path: human or local browser/computer harness with MANUAL, or explicit Katalon Run With AI with KATALON_AI. Ask only when that choice is genuinely ambiguous; creation-only requests stop after creation.
- If a matching test case already exists, reuse and update/link it instead of creating a duplicate.
- If a matching test suite already exists, reuse it and add missing cases instead of creating a duplicate.

Ask the user only when a required value cannot be resolved safely, multiple equally valid choices remain, credentials/accounts are missing, the next action is destructive, or the user explicitly asks for approval gates.

## Availability First

Before promising a workflow, state the automation boundary:

- Available through Katalon MCP: list projects/repositories, find/read requirements, create/read/update test cases, link requirements, find/manage test suites and folders, create TestPaks, start/end them with `update_test_run`, record manual outcomes/evidence, explicitly start hosted Run With AI, poll AI sessions, read execution/test results, fetch quality metrics, and create ALM-linked defects.
- Not directly available through Katalon MCP: create requirements, create a formal Test Plan entity, guarantee AI execution completion, or supply local browser/computer/upload capabilities. If those client tools are absent, guide the human through pinned steps and collect actual observations.
- Workaround for test plans: use a named test suite or folder plus release/sprint association as the executable test plan structure.

For details, read `references/unavailable-capabilities.md` when the user asks "can Katalon do X?" or when planning scope.

## Required Context Workflow

Resolve missing project/repository context before mutating Katalon data. Reuse already-established scope and existing Platform run IDs; do not create a replacement run just to resolve its context:

```text
+---------------+ --> +---------------------+ --> +-----------------------+
| list_projects |     | list_repositories   |     | resolve repository    |
+---------------+     +---------------------+     +-----------------------+
```

Rules:

- Treat repository and Test Project as the same resolution target.
- If the user says "Katalon Cloud" or "cloud repo", prefer a repository named `Katalon Cloud` when present.
- Do not scan all repositories to avoid choosing. Resolve from context or ask when ambiguous.
- For full-flow requests, perform non-destructive writes without asking again once project/repository/requirement scope is resolved.
- Before destructive writes or bulk changes outside the requested flow, summarize the intended changes and get approval.

## Requirement Analysis

Use `find_requirements` or `read_requirement` when requirements exist in Jira/Azure integration. If requirements are provided in chat, analyze them locally and only use Katalon to create/link test assets.

Output requirement analysis as:

- Requirement intent
- User roles/personas
- Main flows
- Alternate and negative flows
- Data and environment assumptions
- Risk areas
- Coverage recommendations

Read `references/requirement-analysis.md` for the checklist.

## Manual Test Case Design

Write manual test cases in a platform-importable style:

- Title: concise and action-oriented.
- Description: what behavior is verified.
- Pre-condition: environment, data, account, AUT state.
- Steps: manual tester phrasing, each starting with a concrete action.
- Expected results: observable UI/API/platform result per step.
- Test data: values, URLs, accounts, or `N/A`.
- Priority: P0/P1/P2 when useful.
- Requirement links: source keys or internal requirement IDs when available.

Mirror the style of related existing test cases before drafting new or updated cases:

- Read representative existing cases for the same requirement, feature area, folder, suite, product flow, or repository.
- Use their naming convention, field structure, step granularity, vocabulary, pre-condition style, test data style, and expected-result detail level.
- Keep new coverage consistent with the local suite unless the existing style is clearly incomplete or obsolete.
- If existing cases are weak, preserve platform compatibility while improving only what is needed for correctness and coverage.
- When no related cases exist, use the default manual test case format below.

Design enough coverage using ISTQB test design techniques as a reference before importing cases (the techniques guide the design; the output is plain platform test cases, not an ISTQB certification):

- Use equivalence partitioning for input classes, filters, statuses, user roles, and product states.
- Use boundary value analysis for numeric ranges, quantities, prices, dates, pagination, and length limits.
- Use decision table testing for business rules with combinations of conditions.
- Use state transition testing for workflows such as cart, checkout, execution status, and lifecycle changes.
- Use use-case/scenario testing for end-to-end user journeys.
- Use error guessing/checklist-based testing for common ecommerce/platform risks.
- Use pairwise or combinatorial reduction when variants explode, while preserving high-risk combinations.

Keep each case **atomic in scope** (one validation condition per case) so a failure pinpoints the exact rule and each requirement line maps 1:1 to a result. Atomic is about scope, not step count: every case is still a complete, runnable flow (precondition/navigation -> enter surrounding valid data -> action under test -> verify), never a lone bare assertion. Cover the happy-path flow and its edge cases (boundary + negative variants), not just the positive path. Reserve combined cases for true end-to-end scenarios. Quote expected error/UI strings verbatim from the requirement, including source typos (flag them separately). If coverage is intentionally reduced, state the risk-based rationale.

Read `references/istqb-coverage.md` before designing cases from requirements. Read `references/manual-test-case-format.md` before creating many cases or when the user asks for a specific format.

## Existing Test Case Check

Before creating or importing any test case, check whether suitable coverage already exists:

- If requirement IDs are known, call `find_test_cases_by_requirement` first.
- Search by requirement key, title keywords, feature area, and target folder with `find_test_cases`.
- Read likely matches with `read_test_case` when title alone is not enough to judge coverage.
- Read enough related cases to infer the local writing style before drafting new cases, even when the related cases do not fully cover the requested behavior.
- Reuse, update, move, or link existing cases when they already cover the behavior.
- Create new cases only for uncovered behavior, missing coverage classes, or clearly obsolete/incorrect existing coverage.
- Report what was reused, what was updated, and what was newly created.

This check is mandatory for write/import/full-flow requests, including retries after partial failure. Do not create duplicate cases simply because a previous create attempt failed. If no related cases can be found, say that the new cases follow the default skill format.

## Import And Traceability Workflow

Use this flow for "write test cases and import to platform":

```text
+----------------------+     +-----------------------+     +----------------------+
| Analyze requirements | --> | Draft coverage design | --> | Find existing cases  |
+----------------------+     +-----------------------+     +----------------------+
          |                             |                              |
          v                             v                              v
+----------------------+     +-----------------------+     +----------------------+
| create/update needed | --> | link_requirements     | --> | read_test_case verify|
+----------------------+     +-----------------------+     +----------------------+
```

Tool rules:

- Search for existing matching test cases before every create/import action.
- Use `create_test_case` only for manual test cases that do not already have suitable coverage.
- Use `link_requirements_to_test_case` only after requirement IDs are known.
- Use `read_test_case` after creation when verification matters.
- Use `update_test_case` for revisions; pass all intended updates in one call.
- Use `manage_test_folder` or `move_test_case` for organization when requested.

## Test Suite And "Test Plan" Workflow

When the user says "search and design test plan":

1. Use `find_test_cases`, `find_requirements`, and `find_iterations` as needed to understand scope.
2. Propose a test plan structure in chat: objectives, in-scope/out-of-scope, coverage matrix, risks, environments, suites.
3. Implement the executable structure with `manage_test_suite` and optional folders.
4. Add selected test cases to suites.
5. Verify with `read_test_suite`.

For formal Test Plan entity creation, state that the current MCP does not expose a direct create-test-plan tool.

## TestPak execution

Route to `execute-test` for human testing, local agent execution, and hosted Katalon AI. A TestPak holds the run's pinned cases, timers, outcomes, and evidence. It does not execute tests simply because it was created.

- Existing run: reuse its Platform `execution_id`; preserve pinned cases and AUT configuration.
- New manual run: resolve cases/suite and fresh `read_auts`, then `create_test_run(mode="manual")` (or the connected older creation tool).
- Human or local harness: `update_test_run` START MANUAL → follow returned `current_case` steps → upload actual evidence if available → `update_test_results` → START the next unfinished case → END when all case/environment results are terminal.
- No browser/computer tools: present steps and wait for the user's observations. No uploader: save valid text observations and guide a TestPak UI upload. Do not fabricate execution, artifacts, or a FAILED/BLOCKED outcome from missing client capabilities.
- Hosted Katalon AI: only when explicitly selected, START KATALON_AI using the user's SHARED/SEPARATE browser-profile choice and a compatible existing run. Poll the returned manual/session IDs. Reuse a known session; never launch twice or reset existing results.
- END applies to the whole run, including hosted AI. Default END rejects unfinished cases. Use `unfinished_cases="SKIP"` only for an explicit stop/skip-remaining request. Preserve FAILED/BLOCKED/SKIPPED results; closure does not imply passing.
- Respect handoff, start-only, and single-progress-check requests. For full execution, continue within the requested scope until completion or an actionable external blocker. On `outcome="unknown"`, inspect state before retrying a write.

Read [references/execution-workflow.md](references/execution-workflow.md) for the complete lifecycle, selector, evidence, and response contract. Discover actual tool availability; if lifecycle tools are missing, explain the boundary and use the TestPak UI handoff.

## Automated Execution

Use automated execution only for automated test suites:

```text
+------------------+ --> +--------------------+ --> +----------------------+
| find_test_suites |     | build run config   |     | schedule_test_run    |
+------------------+     +--------------------+     +----------------------+
```

Rules:

- Use `schedule_test_run`, never `create_manual_test_run`, for automated suites.
- Do not run individual manual test cases through `schedule_test_run`.
- Use `find_execution_profiles`, `list_test_cloud_environments`, `build_run_configuration`, and optionally `build_schedule`.
- For mobile runs, ask whether the target is mobile browser or mobile app when app details are missing.

## Result Review And Response

After execution, read results before responding:

- Manual AI run: `read_manual_ai_session`, then relevant execution/result tools if IDs are available.
- TestOps execution: `read_execution`, `read_execution_test_results`, `read_test_result`.
- Recent or specific results: `find_test_results`.
- Quality summaries: `fetch_requirement_data`, `fetch_test_case_data`, `fetch_defect_data`, `fetch_test_configuration_data`, `fetch_test_stability_data`.

Report in chat with:

- Execution/run link when returned by the platform.
- Pass/fail/blocked counts.
- Failed cases and concise failure reason.
- Defects created or recommended.
- Gaps, skipped items, and what needs manual follow-up.

## Defects

Use `create_defect` only when a failed test result ID is known. First call `find_alm_integration_projects` if ALM integration IDs are unknown. Ask the user before creating defects unless they explicitly requested defect creation for failures.
