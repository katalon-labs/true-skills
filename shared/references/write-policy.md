# Write Policy, Execution Consent, and Session Rules

These rules apply to every agent and every skill that changes data on Katalon True Platform (formerly TestOps).

## Write policy

1. Resolve the project and repository first.
2. Preview the full mutation set in chat. List each create, update, move, link, and delete with its target.
3. Ask for one confirmation for the whole set.
4. Run the writes.
5. Read back each changed item with a read tool and report what the platform now holds.

Reads need no confirmation. This covers every tool that finds, reads, lists, gets, fetches, searches, or lists metrics, every memory read tool, and every tool that only builds a payload.

A user who says "go ahead and do all of it" has confirmed the set you previewed. A new write outside that set needs a new preview.

Destructive tools need an explicit yes that names the target. These are:
- `delete_test_case`.
- `delete_test_cloud_app`. The user types YES. Confirm which app when several match.
- `manage_test_folder` or `manage_test_suite` with a DELETE action. Resolve the exact folder `id` with `find_test_folders` by its full `rawPath`.
- `stop_test_cloud_tunnel`. It stops a tunnel that other runs may share.
- `manage_test_cloud_dynamic_app` with an UPDATE action. UPDATE silently redirects every consumer of the app alias.
- `manage_requirement_test_case_linkages` with `action` set to `unlink`. Name the links.
- `update_test_run` with END and `unfinished_cases` set to `SKIP`. SKIP also stops hosted AI.
- `memory_forget`. It deletes for good. Call it only when the user asks to forget something. Name what you deleted.

`memory_write` stores a note in the user's own words. Call it only when the user asks you to remember something. A project-wide rule belongs on the Agent Rules screen, which needs a project admin.

Other writes need a preview and a yes of their own:
- `prepare_artifact_upload` and `confirm_artifact_upload` put a file where every project member can see it. Preview the filename, the exact byte size, the mime type, and the visibility (shared with project members). Confirm once, then prepare, upload, and confirm. Call them only when the user asked to attach evidence. Mask personal data first. Never upload secrets.
- `create_defect` files a real Jira or Azure DevOps bug. Ask for the summary when it is missing. Preview the summary and description. Check `fetch_defects` for a linked defect first.
- `create_truetest_test_case_from_session` and `create_truetest_test_case_from_flow` queue generation. `STARTED` means queued, not done.
- `update_schedule_configuration` runs once, after the user confirms, with every target in one `updates` list and only the settings the user asked for.

Two more rules for bulk work:
- Before a bulk write, run the plan and validation steps first. Check names, folder paths, and duplicates against what already exists. Then write.
- If a write fails part way, stop. Report which items changed and which did not. Do not retry blindly. Do not create a duplicate to replace a failed create. Search first.

## Execution consent

Confirm before you call `create_test_run`, `update_test_run` with START, `create_manual_ai_session`, or `rerun_execution`. These calls use Test Execution - Cloud minutes, launch a hosted browser, or can change data in the application under test (AUT). Creating a TestPak for later, with no START, still needs the preview. The confirmation names:
- the suite or cases,
- the AUT environment,
- the mode (manual, Run with AI, or automated),
- the schedule if one exists,
- and any private network setup.

A confirmation covers one run. Ask again for the next run.

## Stateless MCP

The MCP specification of 2026-07-28 removes protocol sessions. Clients differ in elicitation and sampling support.
- Never rely on a server prompt or on sampling. Ask the user in chat.
- Carry IDs between calls yourself. Repeat `project_id` and `repository_id` on every call that takes them.
- Prefer structured fields in a tool result. If they are missing, parse the text block.
- Treat a tool annotation such as "read-only" as a hint. It is no safety argument. Follow this policy.

## Terminology

Katalon True Platform (formerly TestOps). Katalon Test Execution - Local (formerly Katalon Runtime Engine, KRE). Katalon Test Execution - Cloud (formerly TestCloud). On first mention, give both names. Use one name for one thing after that.
