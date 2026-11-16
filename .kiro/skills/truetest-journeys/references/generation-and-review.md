# Generation and review

Read this when the user has approved a list of sessions or a flow and you queue case generation. The parameter lists come from the live tool schemas captured on 2026-10-20.

## The two tools

| Tool | Takes | Notes |
|---|---|---|
| `create_truetest_test_case_from_session` | `project_id`, `client_code`, `tracking_environment_id`, and 1 to 25 `session_references` | Search with the same `tracking_environment_id` first. Pass only the references the user selected, unchanged. The service queues TrueTest automated test generation. |
| `create_truetest_test_case_from_flow` | `project_id`, `client_code`, `map_id`, `flow_id`, optional `tags` (up to 20) and `include_test_case_id_prefix` (default true) | A flow with linked cases follows the backend regeneration behavior. |

Both tools queue work. Neither returns the cases.

## Approval gates

1. Present the exact sessions (table in `SKILL.md`) or the exact flow.
2. Get a yes that names them. Follow `references/write-policy.md`.
3. For a flow that already has linked cases, say that generation follows the backend regeneration behavior. Get a second yes.
4. Call the tool once. A yes covers one call. A larger set splits into batches of 25 or fewer, each with its own yes.

Without a yes, stop.

## Outcomes

| Result | Meaning | What you do |
|---|---|---|
| `STARTED` | The request was accepted or queued. | Report it as queued. Never report cases as created. |
| `TERMINATE` (flow tool) | No request was created. | Report it. Ask the user. Do not retry on your own. |
| An error | Nothing is known about the state. | Report it. Read back before any retry, so you never create a duplicate request. |

No tool cancels a queued generation. Tell the user that before they approve a large batch.

## Read back

- **Flow path.** Call `get_truetest_journey_map` with `map_id` and `flow_id`. It reports current flow status and linked cases. It is the current state, not a history of one request.
- **Session path.** No tool returns the new cases for a request. Search with `find_test_cases` and `search` (`types` `["test_case"]`) by the feature and keywords of the sessions. Do not assume a folder.
- Recent cases may need a few minutes to appear. Hedge any claim that a case is missing.

## Review every generated case as a draft

1. **Check the type.** The service uses automated test generation. Read each case with `read_test_cases` (`content_type` `FLOW`) and note whether it is MANUAL or AUTOMATED. A suite rejects a mix of the two. Keep the types apart.
2. **Check the name.** A name starts with a letter or digit. It accepts letters, digits, spaces, and `( ) . , _ -`.
3. **Check for duplicates.** Compare the titles with existing cases. Reuse an existing case before you keep a new one.
4. **Check atomicity.** Split a case that checks more than one condition. Hand off to `create-test-cases` for the split.
5. **Check expected results.** A generated result copies observed behavior. Replace it with a requirement-backed result when one exists. Otherwise mark it "observed, unconfirmed".
6. **Check privacy.** Remove real names, emails, account numbers, and free text.
7. **Link requirements** once IDs are known. `create-test-cases` and `test-management` own that step.

Prefer `update_test_cases` over delete and recreate. `delete_test_case` is unreliable.

## Failure and partial results

If a call fails part way, stop. Report what changed and what did not. Do not retry blindly. Do not queue a second generation to replace a failed one before you read back.
