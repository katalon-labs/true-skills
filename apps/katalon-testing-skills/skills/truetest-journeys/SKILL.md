---
name: truetest-journeys
description: Turns real user traffic captured by TrueTest into test coverage in Katalon True Platform (formerly TestOps). It finds sessions, reads or builds a journey map, compares flows with existing cases, and queues case generation for uncovered flows after approval. Use when coverage should follow what users actually do. Not for designing cases from a requirement (create-test-cases) or inventory cleanup (test-management). For the test lead.
license: MIT
compatibility: Requires the Katalon True Platform MCP server and network access.
metadata:
  version: "0.5.0"
  mcp-contract: "katalon-docs-2026-10"
---

# Katalon TrueTest Journeys

This skill covers coverage built from real traffic. TrueTest records user sessions on a linked application. It groups them into journey maps made of flows. You find the flows that users take, check which flows have cases, and queue generation for the ones that do not. Tool names below are bare. Clients add a prefix (Claude Code: `mcp__<server>__<tool>`).

The `true-platform-testing` skill routes end-to-end requests here. Katalon True Platform (formerly TestOps) holds the cases that this skill finds and checks.

## Availability boundary

- **Can:** list the linked TrueTest applications and their tracking environments. Search captured sessions and read one session. Search and read journey maps. Start a journey map build and poll it. Queue case generation from sessions or from one flow.
- **Cannot:** drive the live application or prove that a flow works today. Read sessions older than the 31-day search window. Edit, archive, approve, or retry a journey map. Cancel a queued job. Create requirements.
- **A session shows what users did, not what is right.** Generated cases copy observed behavior, bugs included. Take expected results from a requirement or from the user. Mark the rest "observed, unconfirmed".

Read `references/capability-boundaries.md` when the user asks whether the platform can do one specific operation.

## Resolve context first

1. Call `list_projects`. Use the project the user names. Ask when several fit.
2. Call `list_repositories` when generated cases need a home. Treat repository and Test Project as one target.
3. Call `memory_list` once. Read matching headlines with `memory_read` for naming and folder conventions. Quote a convention. Never present it as a platform fact. If `available` is false, say memory is unavailable. Never call `memory_write` or `memory_forget` here.
4. Call `list_truetest_auts` with `project_id`. The AUT identity is `platform_aut_id` together with `client_code`. If several match, ask the user to choose. If the list is empty, TrueTest is not linked to this project. Say so and stop. Linking happens in the platform UI.
5. Call `list_truetest_tracking_environments` with `client_code`. Ask which environment to use when several exist. Production traffic and test traffic give different maps.
6. Carry `project_id`, `client_code`, and `tracking_environment_id` into every later call. The MCP keeps no state.

Page through `list_` and `search_` results with `page_token` when the first page is not the whole list.

## Pick the starting point

| The user wants | Start here |
|---|---|
| Coverage of a whole journey, or "what do users do that we do not test" | Journey map path (`references/journey-maps.md`) |
| Cases for one behavior, page, or time window | Session path (`references/session-selection.md`) |
| To see what a journey map says | `get_truetest_journey_map`. It reads only. |

## Journey map path

1. Call `search_truetest_journey_maps` with `client_code` and the tracking environment. Filter by `status` `active` and by the tracked-data window the user cares about.
2. Pick the map whose window covers the question. If none fits, offer to build one (step 5).
3. Call `get_truetest_journey_map` with `map_id`. Add `flow_id` to read one flow with its linked cases. Each of the four lists (pages, flows, steps, transitions) has its own page token. Page each one on its own.
4. Compare. For each flow, read what the map reports about coverage and linked cases. Then check the project with `find_test_cases` and `search` (`types` `["test_case"]`) for cases that the map does not link. Sort the flows into covered, partly covered, and uncovered. Rank the uncovered ones by traffic.
5. Build a map only when no suitable map exists. `create_truetest_journey_map` starts an async job. Preview the tracking environment, the time range, any `session_attributes` and `url_keywords`, and the two flags `carry_over_annotations` and `compare_with_previous_map` (both default to true). Get a yes. Call it once. Report the result as queued.
6. Poll the exact `request_id` with `get_truetest_journey_map_request`. When it completes, copy the correlated `map_id` unchanged into `get_truetest_journey_map`. Never pick the map by list order.
7. On a validation error, conflict, timeout, or upstream error, report it. Do not resubmit. After a timeout with no `request_id`, call `search_truetest_journey_maps` with `status` `generating` to find the job before you ask the user what to do.

Read `references/journey-maps.md` for paging, window choice, and how to read coverage.

## Session path

1. Call `search_truetest_sessions` with `project_id`, `client_code`, `start_time`, and `end_time`. Use the narrowest range that answers the question. It spans at most 31 days. Pass `tracking_environment_id` to get attributes, flow metadata, and the replay link.
2. Narrow with `url_patterns`, `attributes`, `minimum_step_count`, and `maximum_step_count`. Use the `email` filter only when the user asks to locate that session, and prefer `session_id` when the user has one. The email value is personal data: never repeat it in the shortlist or the report.
3. Call `get_truetest_session` on each candidate. Drop duplicates of one path, bots, and one-off errors.
4. Build the shortlist table (see "Present before you generate").

Read `references/session-selection.md` for filters, paging, and triage rules.

## Present before you generate

Show the user what you plan to generate from. Use this table for sessions. Keep it to 25 sessions or fewer.

| UTC | Steps | Duration | Session ID | Custom attributes | Replay |
|---|---|---|---|---|---|

Show custom attributes as compact JSON. Show duration in a human form. Show the replay value as a link. Leave an unavailable value visibly empty. Add a one-line summary per session and the cases it would yield.

For a flow, name the flow. Say whether it already has linked cases.

## Generate

1. Get a yes that names the exact sessions or the exact flow. This yes is on top of the write policy in `references/write-policy.md`.
2. A flow that already has linked cases follows the backend regeneration behavior. Say so and confirm again.
3. Call `create_truetest_test_case_from_session` once with 1 to 25 `session_references`. Or call `create_truetest_test_case_from_flow` once with `map_id` and `flow_id`. Pass every reference and ID exactly as a tool returned it. Never build one.
4. `STARTED` means queued, not complete. For the flow tool, `TERMINATE` means no request was created. Report that and ask. Do not retry on your own.
5. Wait, then read back. Flow path: `get_truetest_journey_map` with `flow_id`. Session path: `find_test_cases` and `search` for the new cases. Recent cases may need a few minutes to appear. Do not assume a folder.
6. Treat every generated case as a draft. Check its type and name. Hand off for refinement.

Read `references/generation-and-review.md` for outcomes, read-back, and the draft checklist.

## Privacy

Sessions come from real users. Never copy names, emails, account numbers, or free text into a case, a report, or chat. Use reserved values such as `@example.com` addresses. `include_raw_events` returns up to 100 events with field values unredacted. Set it only for an explicit troubleshooting request. Check the output before you reuse any value.

## Report

State the AUT and environment, the map or session window, how many flows or sessions you reviewed, which flows were covered, which were queued for generation, and what you read back. Name what remains uncovered.

## Hand-offs

- Refine generated cases, split them, and link requirements: `create-test-cases`.
- Place cases in folders and suites, and audit traceability: `test-management`.
- Values, fixtures, and cleanup for the cases: `test-data`.
- Decide what to cover first across a release: `test-plan`.
- Run the cases: `execute-test`.
