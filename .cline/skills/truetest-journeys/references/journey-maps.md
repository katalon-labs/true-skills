# Journey maps

Read this when the user wants coverage of whole journeys. A journey map groups captured sessions into pages, flows, steps, and transitions. The parameter lists come from the live tool schemas captured on 2026-10-20.

## Choose a map

`search_truetest_journey_maps` needs `project_id` and `client_code`. Filters:

| Filter | Use it for |
|---|---|
| `status` | `active`, `archived`, `generating`, or `error`. Start with `active`. |
| `tracking_environment_id` | The environment the user chose. |
| `tracked_data_start_time`, `tracked_data_end_time` | The traffic window the map covers. |
| `created_from`, `created_to`, `creator_email` | Who built it and when. |

The result gives summaries and a `web_url`. Give the user the `web_url` when a visual review helps. Copy `map_id` unchanged into the next call. Pick the map whose tracked window matches the question. A map that is `generating` is not ready. A map in `error` needs a new build, after the user agrees.

## Read a map

`get_truetest_journey_map` needs `project_id`, `client_code`, and `map_id`. It never changes anything. Viewing a map does not approve a review, retry failures, archive data, alter flows, or generate cases.

The response holds four lists that each have a page limit and a page token:

| List | Limit argument | Token argument |
|---|---|---|
| Flows | `flow_limit` (1 to 25, default 10) | `flow_page_token` |
| Steps | `step_limit` (1 to 100, default 20) | `step_page_token` |
| Transitions | `transition_limit` (1 to 100, default 50) | `transition_page_token` |
| Pages | `page_limit` (1 to 100, default 50) | `page_page_token` |

Page each list on its own. A token from one list does not work for another. Pass `flow_id` to read one exact flow. Copy `flow_id` from an earlier response, never build it.

The response supports journey, traffic, coverage, and saved-assertion views. Read the field names it returns. Do not assume a field that the response lacks.

## Compare flows with existing cases

1. List the flows. Note traffic and any linked cases the map reports for each.
2. For a flow with no linked case, call `find_test_cases` by feature area and keyword, and `search` with `types` `["test_case"]` and `include_documents` false. A case may cover the flow without a link.
3. A `search` response with `incomplete=true`, `retrieval_mode="keyword_fallback"`, or a warning never proves absence. Recent cases may be missing for a few minutes.
4. Sort each flow into covered, partly covered, or uncovered. Rank the uncovered flows by traffic. Say how you judged each one.

## Build a map

Build a map only when no suitable one exists. `create_truetest_journey_map` writes. It starts an async job.

Required: `project_id`, `client_code`, `tracking_environment_id` (UUID from `list_truetest_tracking_environments`), `start_time_from`, `start_time_to`.

Optional: `session_attributes` (flat string filters), `url_keywords` (literal text, never regex), `carry_over_annotations` (default true), `compare_with_previous_map` (default true).

Preview all of it. Keep both flags at their default unless the user says otherwise. Get a yes. Call once.

## Poll the job

1. Report the build as queued. Keep the returned `request_id`.
2. Call `get_truetest_journey_map_request` with that exact `request_id`. It gives the request-to-map correlation.
3. Poll at a calm pace. If the job is still pending after several polls, give the user the `request_id` and stop. Offer to check later.
4. When it completes, copy the correlated `map_id` unchanged into `get_truetest_journey_map`.

## Never resubmit

After a validation error, conflict, timeout, or upstream error, report what happened. Do not call `create_truetest_journey_map` again on your own. A second call can start a duplicate job.

After a timeout with no `request_id`, call `search_truetest_journey_maps` with `status` `generating` and the same environment. That shows whether the job started. Then ask the user how to go on.
