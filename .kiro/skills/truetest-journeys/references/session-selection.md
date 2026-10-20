# Session selection

Read this when you search TrueTest sessions for coverage work. The parameter list comes from the live tool schemas captured on 2026-10-20. Check the tool schema before you rely on a parameter.

## Identity rules

- The AUT identity is `platform_aut_id` together with `client_code`, both from `list_truetest_auts`.
- `project_id` is the Katalon True Platform (formerly TestOps) project. `test_project_id` is the repository. `aut_project_id` is only the link record. Do not mix them.
- The server rejects an AUT that is not linked to the project.

## Search arguments

`search_truetest_sessions` needs `project_id`, `client_code`, `start_time`, and `end_time`. Times are UTC with an offset, such as `2026-07-01T00:00:00Z`.

| Argument | Use it for | Rule |
|---|---|---|
| `start_time`, `end_time` | The window | At most 31 days. Use the narrowest range that answers the question. |
| `tracking_environment_id` | Attributes, flow metadata, replay link | Pass it whenever you plan to generate from the result. Without it the search covers all permitted environments and adds none of these fields. |
| `url_patterns` | A page or path | Literal text, not regex. At most 10 values. |
| `attributes` | A known custom attribute | A list of `{name, value, match}`. Prefer `EQUALS`. Use only attribute names you know. |
| `minimum_step_count`, `maximum_step_count` | Long journeys or short ones | Inclusive. Use a minimum to skip bounces. |
| `domain` | One site | Exact value, no protocol or path. |
| `session_id` | One known session | The user-visible ID. It is never the internal replay key. |
| `email` | Locating one person's session | Use only when the user explicitly asks. |
| `limit` | Page size | 1 to 25. Default 20. |
| `poll_timeout_seconds` | Wait for the async search | 1 to 60. Default 30. |

## Paging

The search is async on the server. A result may carry `next_page_token`. Pass that value as `page_token` and repeat every other argument unchanged. A changed argument breaks the page chain. Start a new search instead.

## Reading one session

Call `get_truetest_session` with `project_id`, `client_code`, and one `session_reference`. The default response holds metadata and ordered replay steps. Leave `include_raw_events` false. Set it to true only for an explicit troubleshooting request. It returns at most 100 events and does not redact field values.

## Never build a reference

A `session_reference` is opaque. Pass it exactly as `search_truetest_sessions` returned it. Never build one from a session ID, a replay URL, or a timestamp. The same rule holds for `flow_id` and `map_id`.

## Triage

Keep a session when it shows a distinct path that real users take. Drop it when it is:

- a duplicate of a path you already kept,
- a bot or a health check,
- a one-off error with no pattern behind it,
- too short to hold a meaningful check, such as a bounce.

Prefer sessions with a mix of common and rare paths over 25 copies of the same flow. Give each kept session one line that says what the user did and what case it would yield.

## Privacy

Mask names, emails, account numbers, and free text before you quote anything. Use reserved values such as `@example.com`. Never paste replay content into a case without a check.
