# Cases from TrueTest sessions

Read this when the user wants test cases built from real user behavior that TrueTest captured. TrueTest records user sessions on a linked application and groups them into journey maps. The tools below read that data and can generate cases from it. Parameter lists come from the live tool schemas captured on 2026-10-20. Check the tool schema before you rely on a parameter.

## What a session proves

A session shows what users did. It does not show what is correct. A generated case copies observed behavior, including bugs. Take expected results from a requirement or from the user. If neither exists, mark the expected result "observed, unconfirmed" in the case description.

## Tools

| Step | Tool | Notes |
|---|---|---|
| Find the linked application | `list_truetest_auts` | Use `platform_aut_id` together with `client_code` as the AUT identity. Accepts a name filter. |
| Find the tracking environment | `list_truetest_tracking_environments` | Needs `client_code`. |
| Find sessions | `search_truetest_sessions` | `project_id`, `client_code`, `start_time`, and `end_time` are required. The window spans at most 31 days. `limit` is at most 25. Pass `tracking_environment_id` to get attributes, flow metadata, and the replay URL. Returns an opaque `session_reference`. |
| Inspect one session | `get_truetest_session` | Metadata and replay steps. Raw events (`include_raw_events`) are off by default, capped at 100, and not redacted. |
| List journey maps | `search_truetest_journey_maps` | Filter by `status` (`active`, `archived`, `generating`, `error`), dates, or creator. |
| Read one journey map | `get_truetest_journey_map` | Pass `flow_id` to read one flow and its linked test cases. Flows, steps, transitions, and pages each have their own page token. Page each one separately. This call never changes state. |
| Build a journey map | `create_truetest_journey_map` | Starts an async job and returns a `request_id`. Needs `tracking_environment_id` and a start-time range. |
| Poll that job | `get_truetest_journey_map_request` | Poll the exact `request_id`. When it completes, copy the correlated `map_id` unchanged into `get_truetest_journey_map`. On an error, report it. Do not resubmit on your own. |
| Generate cases from sessions | `create_truetest_test_case_from_session` | Takes 1 to 25 `session_references` and a `tracking_environment_id`. Needs the user's approval first. |
| Generate cases from one flow | `create_truetest_test_case_from_flow` | Takes `map_id` and `flow_id`, with optional `tags` (up to 20) and `include_test_case_id_prefix`. Needs the user's approval first. |

Both generation tools queue work. `STARTED` means queued, not complete. For the flow tool, `TERMINATE` means no request was created.

## Workflow

1. Resolve project and repository as usual (`list_projects`, `list_repositories`).
2. Call `list_truetest_auts`. If several AUTs match, ask the user to choose. Carry `client_code` and the tracking environment ID into every later call.
3. Pick sessions.
   - Start from a journey map when the user wants coverage of a whole journey. Call `search_truetest_journey_maps` and `get_truetest_journey_map`. Call `create_truetest_journey_map` only when no suitable map exists. It starts a job, so report it as queued, poll with the returned `request_id`, and tell the user first. Then generate from one flow with `create_truetest_test_case_from_flow`, using the `flow_id` values exactly as the map returned them.
   - Start from `search_truetest_sessions` when the user names a behavior, a page, or a time window. Pass `tracking_environment_id` so the result carries attributes and replay URLs.
   - Never build a `session_reference` or a `flow_id`. Use only values the tools returned.
4. Read each candidate session with `get_truetest_session`. Drop sessions that are duplicates of one path, bots, or one-off errors. Use `email` filters on the search only when the user asks to locate that session.
5. Present the shortlist as a table with the columns UTC, Steps, Duration, Session ID, Custom attributes, and Replay. Use an em dash for an unavailable value. Give each session a one-line summary and say what cases it would yield. Keep the count at 25 or fewer. For a flow, name the flow and say whether it already has linked cases.
6. Get an explicit yes on the exact session list or flow. A flow that already has linked cases follows the backend's regeneration behavior, so say so and confirm again. Without a yes, stop.
7. Call the generation tool once.
8. Generation is queued. Read `get_truetest_journey_map` with `flow_id` (flow path) or search the project for the new cases (session path) to learn where the generated cases landed. Do not assume a folder. Recent cases may need a few minutes to appear. Then treat every generated case as a draft and run the normal pipeline.
   - Run "Check existing cases" in `SKILL.md` against the generated titles.
   - Check names against the charset rule.
   - Split any case that checks more than one condition.
   - Replace observed-only expected results with requirement-backed ones where possible.
   - Link requirements with `manage_requirement_test_case_linkages` once IDs are known.
   - Read back with `read_test_cases` (`content_type` `FLOW`).

## Privacy

Sessions come from real users. Do not copy names, emails, account numbers, or free-text input into a case, a report, or chat. Replace them with reserved values such as `@example.com` addresses. Raw events (`include_raw_events`) are not redacted. Request them only for an explicit troubleshooting need, and check the output before you reuse any value.

## Limits

- The generation tool writes cases. It falls under the write policy in `references/write-policy.md`, and the approval gate above is a second confirmation on top of it.
- The tools see captured traffic only. They cannot drive the application or confirm that a flow still works today.
- One session list per generation call. Split a larger set into batches of 25 or fewer and confirm each batch.
- `STARTED` does not mean the cases are complete. Do not report them as created until you read them back.
