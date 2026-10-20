<!-- GENERATED from shared/references/write-policy.md - edit the source -->
# Write Policy, Execution Consent, and Session Rules

These rules apply to every agent and every skill that changes data on Katalon True Platform (formerly TestOps).

## Write policy

1. Resolve the project and repository first.
2. Preview the full mutation set in chat. List each create, update, move, link, and delete with its target.
3. Ask for one confirmation for the whole set.
4. Run the writes.
5. Read back each changed item with a read tool and report what the platform now holds.

Reads need no confirmation. This covers every tool that finds, reads, lists, gets, or analyzes, and every tool that only builds a payload.

A user who says "go ahead and do all of it" has confirmed the set you previewed. A new write outside that set needs a new preview.

Destructive tools need an explicit yes that names the target. These are `delete_test_case`, `delete_test_cloud_app`, `manage_test_folder` or `manage_test_suite` with a DELETE action, `stop_test_cloud_tunnel`, and `manage_test_cloud_dynamic_app` with an UPDATE action. UPDATE silently redirects every consumer of the app alias. `stop_test_cloud_tunnel` stops a tunnel that other runs may share.

Two more rules for bulk work:
- Before a bulk write, run the plan and validation steps first. Check names, folder paths, and duplicates against what already exists. Then write.
- If a write fails part way, stop. Report which items changed and which did not. Do not retry blindly. Do not create a duplicate to replace a failed create. Search first.

## Execution consent

Confirm before you call `create_test_run`, `create_manual_ai_session`, or `rerun_execution`. These calls use Test Execution - Cloud minutes and can change data in the application under test (AUT). The confirmation names:
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
