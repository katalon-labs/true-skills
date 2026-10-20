# Cases from TrueTest sessions

Read this when the user wants test cases built from real user behavior that TrueTest captured. TrueTest records user sessions on a linked application and groups them into journey maps. The tools below read that data and can generate cases from it. Parameter lists come from the October 2026 Katalon MCP docs and a September 2026 schema capture. Check the tool schema before you rely on a parameter.

## What a session proves

A session shows what users did. It does not show what is correct. A generated case copies observed behavior, including bugs. Take expected results from a requirement or from the user. If neither exists, mark the expected result "observed, unconfirmed" in the case description.

## Tools

| Step | Tool | Notes |
|---|---|---|
| Find the linked application | `list_truetest_auts` | Returns the `client_code` the other tools need. Accepts a name filter. |
| Find the tracking environment | `list_truetest_tracking_environments` | Needs `client_code`. |
| Find sessions | `search_truetest_sessions` | Time window up to 31 days. Optional attribute filters. Returns an opaque `session_reference`. |
| Inspect one session | `get_truetest_session` | Metadata and replay steps. Raw events are optional, capped at 100, and PII-redacted. |
| List journey maps | `search_truetest_journey_maps` | Filter by status, dates, or creator. |
| Read one journey map | `get_truetest_journey_map` | Pages, flows, steps, sessions, and linked tests each have their own cursor. Page each one separately. |
| Build a journey map | `create_truetest_journey_map` | Starts an async job and returns a `request_id`. |
| Poll that job | `get_truetest_journey_map_request` | Poll until it finishes. On an error, report it. Do not resubmit on your own. |
| Generate cases | `create_truetest_test_case_from_session` | Takes 1 to 25 sessions. Needs the user's approval first. |

The server may expose the generation tool under a close variant of this name. Check the tool list. Use the tool that takes sessions and returns test cases.

## Workflow

1. Resolve project and repository as usual (`list_projects`, `list_repositories`).
2. Call `list_truetest_auts`. If several AUTs match, ask the user to choose. Carry `client_code` and the tracking environment ID into every later call.
3. Pick sessions.
   - Start from a journey map when the user wants coverage of a whole journey. Call `search_truetest_journey_maps` and `get_truetest_journey_map`. Call `create_truetest_journey_map` only when no suitable map exists. It starts a job, so tell the user first.
   - Start from `search_truetest_sessions` when the user names a behavior, a page, or a time window.
   - Never build a `session_reference`. Use only values the search tool returned.
4. Read each candidate with `get_truetest_session`. Drop sessions that are duplicates of one path, bots, or one-off errors.
5. Present the shortlist. Give each session a one-line summary and say what cases it would yield. Keep the count at 25 or fewer.
6. Get an explicit yes on the exact session list. Without it, stop.
7. Call the generation tool.
8. Read the result to learn where the generated cases landed. Do not assume a folder. Then treat every generated case as a draft and run the normal pipeline.
   - Run "Check existing cases" in `SKILL.md` against the generated titles.
   - Check names against the charset rule.
   - Split any case that checks more than one condition.
   - Replace observed-only expected results with requirement-backed ones where possible.
   - Link requirements with `link_requirements_to_test_case` once IDs are known.
   - Read back with `read_test_case`.

## Privacy

Sessions come from real users. Do not copy names, emails, account numbers, or free-text input into a case, a report, or chat. Replace them with reserved values such as `@example.com` addresses. The raw-event view redacts PII, but check the output before you reuse any value.

## Limits

- The generation tool writes cases. It falls under the write policy in `references/write-policy.md`, and the approval gate above is a second confirmation on top of it.
- The tools see captured traffic only. They cannot drive the application or confirm that a flow still works today.
- One session list per generation call. Split a larger set into batches of 25 or fewer and confirm each batch.
