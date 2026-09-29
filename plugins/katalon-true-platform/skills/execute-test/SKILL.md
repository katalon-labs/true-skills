---
name: execute-test
description: Execute existing Katalon True Platform/TestOps test cases, suites, or TestPak runs. Use to start or end a TestPak, guide human testing, run pinned steps with the agent's own browser/computer tools, upload evidence and record results, or explicitly launch and monitor Katalon Run With AI. Also covers scheduling automated suites and reading execution outcomes. Written for the manual tester who needs observed results from existing cases. A coded Playwright suite starts at playwright-execute; a completed framework report starts at upload-report.
---

# Katalon Execute Test

A **TestPak** is the workspace for a manual test run's pinned cases, environments, timers, results, and evidence. Creating a run does not execute its tests or give the calling agent browser/computer tools. Lifecycle stage and test verdict are different; an ended run may be FAILED, BLOCKED, or incomplete.

## Discover and preserve scope

Use the connected MCP tool catalog and schemas as the authority. Discover `update_test_run` and `update_test_results` before promising a TestPak lifecycle. Some deployments still expose older creation names. If lifecycle tools are absent, explain the gap and guide the user through TestPak UI; do not invent a status setter or use AI session creation to start a human timer.

Reuse an existing Platform execution ID when the user supplies one. Do not create another run, reselect its AUT, or replace its pinned cases. Resolve project and repository through `list_projects` / `list_repositories` when context is missing or ambiguous. For a new manual run, resolve the selected cases/suite, read the matching AUT with `read_auts`, honor the creation tool's AUT-choice requirements, and use `create_test_run(mode="manual")` (or the older `create_manual_test_run` if that is what the connected server exposes). Creation-only requests stop after creation and return the run link.

Read [references/execution-workflow.md](references/execution-workflow.md) for selectors, recording, evidence, and uncertain responses. Read [references/capability-boundaries.md](references/capability-boundaries.md) if availability is unclear.

## Choose who executes

| User intent and actual client capabilities | Execution path |
| --- | --- |
| User wants to test manually | MANUAL; show pinned steps and wait for the user's actual observations |
| User asks the agent to run tests, but its harness has no browser/computer tools | Explain hosted Run With AI and guided human testing; resolve the execution choice before START |
| User asks the agent to execute locally and its harness has suitable browser/computer tools | MANUAL; the agent executes and captures real evidence with those tools |
| User explicitly chooses Katalon's hosted Run With AI | KATALON_AI; the server launches a hosted session |
| User provides a coded/automated suite | Automated execution, below |

Being an AI agent does not select KATALON_AI. Preserve the user's chosen execution path. If "run with AI" could mean either a local harness or the hosted runner, resolve that ambiguity before launching; do not ask again when the choice is already clear. A missing browser or uploader does not establish a FAILED/BLOCKED test outcome.

For a chat-only agent such as Kai, explain that hosted Run With AI uses a Katalon browser and records its own results and available evidence. Collect the execution choice, required browser profile, AUT/private-access and environment choices together where possible, before launching. Do not promise local browser control or ask the user to supply screenshots when they already chose hosted execution.

## Human or local-agent TestPak loop

1. Call `update_test_run` with the Platform `execution_id` and `update={"action":"START","execution_mode":"MANUAL"}`. This starts/resumes a case timer and returns `current_case` with pinned instructions, expected results, preconditions, test data, and selectors.
2. Execute those steps with available client tools, or present them to the human and wait for observations. If the request is only to start or hand off, return this context and stop there.
3. Save/capture actual evidence and measure the saved file's byte size before `prepare_artifact_upload` → upload file bytes → `confirm_artifact_upload`; never guess `content_length` or send 0. Record only observed or user-reported case/step outcomes with `update_test_results`. If upload is unavailable, keep valid text observations and guide the user to attach evidence in TestPak.
4. After the case result is recorded, call MANUAL START again for the next unfinished case. Repeat for the run's required environments. Do not rewrite completed outcomes to force a pass.
5. When all case/environment results are terminal, call `update_test_run` with `update={"action":"END"}`. FAILED, BLOCKED, and SKIPPED are also terminal; End does not imply PASSED.

## Hosted Katalon Run With AI

Use `update_test_run` with `update={"action":"START","execution_mode":"KATALON_AI","browser_profile_mode":"SEPARATE"}` or SHARED, according to the user's choice. SEPARATE isolates browser state by case; SHARED carries it between cases. Reuse an already supplied choice. The existing run must have one Linux/Windows Chrome environment and the required AUT settings. This command does not reconfigure them.

START launches the full pinned run, or returns its existing AI session without resetting results. Use the returned `manual_execution_id` and `session_id` with `read_manual_ai_session`. Session creation or a running status does not prove tests passed. Observe the requested monitoring scope: one progress check or a handoff request can return while running; a full-execution request continues monitoring until terminal results or an actionable external limit/error. Do not loop indefinitely without progress.

PENDING provisioning, empty results and TODO are unfinished. Use the runtime's wait capability if available; if the turn cannot remain active or progress stalls, report the last observed state and how to check the same run again. Do not promise background monitoring without a scheduler. The hosted runner owns result/evidence capture; read what it produced rather than fabricating uploads or overwriting AI-owned results.

AI-only runs can auto-end after all results become terminal. Read the state before reporting completion; use END if closure is still needed and authorized. For an explicit stop-now/skip-remaining request, use `update={"action":"END","unfinished_cases":"SKIP"}`. It closes the entire run and stops hosted AI, preserving existing terminal results. Default END rejects unfinished work; do not silently escalate it to SKIP.

Do not start a second session or switch an existing manual run to hosted AI when that would reset results. The older `create_manual_ai_session` is a launch capability on older servers, not a replacement for lifecycle retry/End handling; never call both launch paths for one request.

## Automated execution

Use the connected automated run/configuration tools only for automated suites or suite collections. Resolve profiles and TestCloud environments, build the configuration/schedule, then use `create_test_run(mode="automated")` or the connected server's older `schedule_test_run`. Read the returned execution and results. `update_test_run` covers manual TestPaks, including hosted AI; it is not a Studio/TestCloud automated-run status editor.

## Report observed results

Return the run link, observed lifecycle stage and verdict, available counts, concise failure reasons, and any unfinished work. Distinguish launch, test execution, closure, and report synchronization. For a human handoff, show the current steps and what observation to send back. For an agent harness, preserve the returned IDs and next recording/upload actions. Do not create defects unless the user requested them or separately authorizes them.
