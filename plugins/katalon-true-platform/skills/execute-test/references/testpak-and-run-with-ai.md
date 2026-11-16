# TestPak and Run with AI details

Read this when you start, record, end or poll a manual run. `SKILL.md` has the order of steps. This file has the tables and the edge cases. Facts follow the web UI and the tool schemas as reviewed 2026-11-16. Check the schema in your session when a field is unclear.

## Choose who executes

| The user says | Path |
|---|---|
| "Run it by hand", "I will test it", "start the TestPak for me" | `MANUAL`. Show the pinned steps and wait for the user's real observations. |
| "Run it locally" and your client has browser or computer tools | `MANUAL`. You run the steps with your tools and capture real evidence. |
| "Run with AI", "execute using AI", "use Katalon's hosted runner" | `KATALON_AI`. |
| "Do not use AI" | `MANUAL`. This wins over every default. |
| "Create a run", "set up a TestPak", "execute now" with no method | Create only, or ask the one question in `SKILL.md`. |

Being an AI agent does not select `KATALON_AI`. When "run with AI" could mean your own browser tools or Katalon's hosted runner, ask once. Do not ask again after the user has answered. A missing browser tool or uploader is a capability gap. It is not a failed or blocked test.

For a local run, read your own OS and browser and pass them when you create the run. A remote server cannot see them. Omit a version you do not know. Never pass `latest`. Omit `executor`: an agent name or email is not a user UUID, and the signed-in user is the default.

## Four IDs

| ID | Where it comes from | Used by |
|---|---|---|
| `execution_id` | `create_test_run`, `list_executions` | `update_test_run`, `update_test_results`, `read_execution`, `find_test_results` |
| `manual_execution_id` | `update_test_run` `START` with `KATALON_AI` | `read_manual_ai_session`, together with `session_id` |
| UI order number | The run page | Nothing. No tool takes it. |
| `execution_test_case_id` | Returned in `current_case` | `update_test_run` to select one pinned case. It is not the repository test case ID. |

Do not substitute one for another. If a call rejects an ID, correct that field only and keep the cases, AUT and environment you already chose.

## Carry `current_case`

`update_test_run` `START` with `MANUAL` returns `current_case`. Keep it and use it.

- `test_case_id`, `test_suite_id`, `test_case_order` and `environment_id` select the result in `update_test_results`.
- `steps` hold the step IDs, positions, instructions, expected results and test data. Follow these pinned steps. Do not re-read the case from the repository, because it can have changed since the run was created.
- `result_id`, `status` and `timer_status` describe the observed state. They are not a new verdict.
- For several environments, pass the chosen `environment_id` to `START`. Omit `execution_test_case_id` to continue with the running or first unfinished case. START does not retest finished cases.

After you record a case, call `START` again for the next unfinished case.

## Lifecycle responses

When a lifecycle result carries an outcome, act on it like this.

| Outcome | What it means | What you do |
|---|---|---|
| `applied` | The change was written and read back. | Continue with the next action the result names. |
| `unchanged` | Nothing new was written. | Continue the case or session, or report that the run already ended. |
| `blocked` | The platform refused the change and says why. | Report the blocker. Do not reset results. Do not skip work without the user's yes. |
| `unknown` | The write may have landed. | Read the run with `read_execution` or the session with `read_manual_ai_session` before any retry. |

END with the default policy checks every pinned case in every environment. If work remains it returns `blocked` and writes nothing. That check is the answer to "end it only if everything is finished". Do not infer completeness from a summary status or an empty result page. Status-only requests use the read tools.

## Observed stage and status

The stage says where the run is in its lifecycle. The status says what the results add up to. START and END set the stage. Neither sets a pass. A run that has just ended can still be synchronizing. Read it again before you report the final counts. A header that still shows RUNNING after the last case finished is usually a short lag.

## Run with AI details

- START needs one browser environment on the run that the organization allows. See "Run with AI environment" in `SKILL.md`.
- START launches the whole pinned run, or returns the existing AI session without resetting results. Use the returned `manual_execution_id` and `session_id` with `read_manual_ai_session`.
- A pending state, an empty result list and TODO all mean unfinished. A running session does not prove a pass. Back off between polls and stop at a wait time you state.
- Do not promise background monitoring unless a scheduler exists. If the turn cannot stay open, report the last observed state and how to check the same run again.
- The hosted runner captures its own results and evidence. Read them. Do not upload files for it or overwrite its results.
- A run with only AI cases can end by itself when every result is final. Read the state before you call END.
- For an explicit "stop now and skip the rest", send `END` with `unfinished_cases: "SKIP"`. It closes the whole run and stops the hosted session. Results that are already final stay.
- Never start a second session on a run, and never switch a run with results to hosted AI. That can reset them.

## Data-bound runs

See "Data-bound cases" in `SKILL.md`. Two more facts help when you read the result:

- Rows run one at a time, and the AI SESSIONS list shows each row as running, queued or done, for example "1/3 done".
- Each row has its own result. The case result follows this order: failed, then blocked, then skipped, then passed.

Per-row calls (`find_run_iterations`, `update_run_iteration`) and the dataset tools are not in every tool list yet. Use one only if your tool list shows it. Otherwise point the user to the Datasets page and the run page.

## Parallel runs through the MCP

Create one suite per parallel run. After each `create_test_run`, read the run and check that it holds its own case, not a case from the run before. Confirm in the run page how many cases ran at once. The count is capped by the organization and the license.

## Windows client certificates

A case that needs a client certificate carries `[cert: <profile>]` in its precondition. The platform then selects that certificate for the browser. It works on Windows Chrome 145 only, on accounts set up for Windows self-hosted browsers. A missing certificate script gives no clear message. If a Windows run fails at sign-in, check the precondition tag and the account setup first.

## Evidence and results

`manual-results-and-evidence.md` has the recording steps. Two rules matter here:

- Record only what was observed or what the user reported. Missing client automation is not a test outcome.
- Run creation is not evidence of execution. Read the results before you report counts.
