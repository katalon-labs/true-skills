# Katalon tools in ChatGPT

In ChatGPT the Katalon connection has read tools and card tools, and no tool the model can call to change the workspace. When a step in this skill names a write tool, use the card tool from the table below instead. The card shows the whole change, and the user's click inside the card performs it. Never report a change that the card has not confirmed.

## Rules

- Take `project_id` from `settings_read`, else from `list_projects`, and reuse it for the rest of the conversation.
- A `show_*`, `plan_*` or `review_*` tool called without `project_id` opens the user's only project. When the user has several, it returns their names and IDs instead of a card: ask which one, then call the tool again with that `project_id`.
- `show_*`, `plan_*` and `review_*` tools draw a card. Call at most one per answer, as the last call, with IDs you already read.
- Cards poll running sessions themselves. Do not poll `read_manual_ai_session` after a card has started a run.
- If a card tool is not listed in this session, answer in text from the read tools and give the True Platform link for the change.

## Write steps and their cards

| Step in this skill | Use in ChatGPT | Who performs the change |
| --- | --- | --- |
| `create_test_case`, then link the cases to a requirement | `review_test_case_drafts` with the drafted cases | The user clicks Save in the card |
| `create_test_run` plus `create_manual_ai_session` (Run with AI) | `plan_ai_run` with the suite or case IDs | The user clicks Run in the card |
| `create_defect` | `plan_defect` with the failed test result ID | The user clicks File in the card |
| Classify failures of a run | `cluster_failures`, classify each signature as product, automation or environment with a confidence and a one-line reason, then `show_failure_triage` with those classifications | Nothing changes |
| Release ship call | `get_release_readiness`, decide Ready, Ready with risk or Not ready, then `show_release_verdict` with the recommendation and rationale | Nothing changes |
| Requirement coverage | `show_requirement_coverage` for the release or requirement keys | Nothing changes |
| Show a run or its results | `show_run_report` with the execution ID | Nothing changes |
| Show specific test cases | `show_test_cases` with up to 50 test case IDs | Nothing changes |
| Delete, move, duplicate or update test cases, update test results, manage folders or suites, schedules, reruns | Not available in ChatGPT | The user makes the change in True Platform; give the link |
| API keys, tunnels, memory | Not available in ChatGPT | Point to the True Platform settings page |

A "file a bug" request with no failed test result in context gets one question asking which result, before any `plan_defect` call.
