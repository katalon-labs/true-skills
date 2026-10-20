<!-- GENERATED from shared/references/capability-boundaries.md - edit the source -->
# Katalon MCP Capability Boundaries

Contract source: the Katalon docs page "Katalon True Platform MCP Server" (last updated October 2026). The live tool list needs sign-in, so this page is the contract. If a tool named here is missing in your session, say so and use the closest documented tool. Never call a tool name from memory. At session start, compare this list with the tools your client discovered. If they differ, trust the discovered set and say which names changed.

Name tools by bare name, as written here. Clients add a prefix. Claude Code uses `mcp__<server>__<tool>`.

## Available

Workspace and discovery
- `list_projects`, `list_repositories`, `find_iterations`, `find_execution_profiles`.
- `get_user_context` returns the signed-in user. It does not look up other users.

Requirements and ALM
- `find_requirements`, `read_requirement`. Requirements are a read-only mirror of Jira or Azure DevOps.
- `find_test_cases_by_requirement`, `link_requirements_to_test_case`, `unlink_requirements_from_test_case`.
- `find_alm_integration_projects`, `create_defect`.

Test cases, folders, suites
- `find_test_cases`, `read_test_case`, `create_test_case`, `update_test_case`, `move_test_case`, `duplicate_test_case`, `delete_test_case`.
- `find_test_folders`, `manage_test_folder`.
- `find_test_suites`, `read_test_suite`, `manage_test_suite`.
- `find_test_suite_collections` reads collections. No tool creates or edits a collection.

Execution
- `read_auts`, `create_test_run` (manual and automated), `create_manual_ai_session`, `read_manual_ai_session`.
- `read_manual_test_run_detail_by_order` finds a manual run by its order number.
- `build_run_configuration`, `build_schedule`, `build_private_local_testing_config`.
- `rerun_execution` reruns a completed execution.
- `list_schedule`, `read_schedule_detail`, `update_schedule_configuration`.

Results and evidence
- `find_test_results`, `read_test_result`, `read_execution`, `read_execution_test_results`.
- `list_executions` (numeric TestOps IDs) and `list_execution_outputs` (TestCloud string IDs and artifact URLs).
- `update_test_results` records a manual result or reviews an automated one.
- `prepare_artifact_upload` and `confirm_artifact_upload` attach evidence up to 10 MiB.

Quality insights
- `get_requirement_insights`, `get_defect_insights`, `get_test_case_insights`, `get_test_configuration_insights`.
- `analyze_test_case_stability` (flaky, always failing, newly failing, slow) and `analyze_test_flakiness` (lookback window, minimum runs).

Test Execution - Cloud assets and tunnels
- `list_test_cloud_environments`, `list_test_cloud_agents`, `list_test_cloud_apps`.
- `get_upload_test_cloud_app_url`, `create_test_cloud_app`, `manage_test_cloud_dynamic_app`, `delete_test_cloud_app`.
- `list_test_cloud_tunnels`, `prepare_test_cloud_tunnel_start`, `stop_test_cloud_tunnel`.

TrueTest
- `list_truetest_auts`, `list_truetest_tracking_environments`, `search_truetest_sessions`, `get_truetest_session`.
- `search_truetest_journey_maps`, `get_truetest_journey_map`, `create_truetest_journey_map`, `get_truetest_journey_map_request`.
- `create_truetest_test_case_from_session` needs user approval and takes 1 to 25 sessions.

## Not available through the MCP

- Create requirements. Create them in Jira or Azure DevOps, then sync, find, and link.
- Create a formal Test Plan entity. A named folder or suite gives an execution scope. It is no plan of record.
- Guarantee that Run with AI finishes. The platform can block it or fail it.
- Cancel Run with AI. You can only poll it.
- Stop or terminate a running execution. `rerun_execution` works only on completed executions.
- Inspect the live AUT. Use a browser tool or Playwright.
- Look up another user to set an assignee.
- Create or edit suite collections.
- Author release gates, custom fields, tags, Git repository settings, or project governance. Use the True Platform UI.
- Self-healing, Time Capsule, and TrueTest regeneration. These are product features outside the MCP.
- Create a defect without a failed test result ID and ALM integration details.

## Quirks every skill keeps

- `delete_test_case` is unreliable. Prefer `update_test_case` or `move_test_case`.
- A test case name accepts letters, digits, spaces, and `( ) . , _ -`. The characters `@ : /` are rejected. A folder path can contain `/`.
- `create_test_case` with type AUTOMATED creates nothing. It returns guidance only.
- `manage_test_suite` rejects a suite that mixes MANUAL and AUTOMATED cases.
- Two ID spaces both say "execution". TestOps uses a number. TestCloud uses a string. No tool converts one to the other. Never swap `list_executions` and `list_execution_outputs`.
- `update_test_results` counts as success only when the outcome is `applied` or `unchanged`. A manual result needs an active run assigned to you. An automated review needs a completed run.
- Run with AI asks for `browser_profile_mode`. Ask the user. Never infer it.
- `create_defect` needs the `alm_integration_id` from `find_alm_integration_projects`. It is not the Jira connection ID.
- `search_truetest_sessions` covers at most 31 days. A `session_reference` is opaque. Never build one by hand.
- Resource links in tool results may point to a host that does not resolve for your tenant. Give the ID as well as the link.

## Terminology

Katalon True Platform was TestOps. Katalon Test Execution - Local was Katalon Runtime Engine (KRE). Katalon Test Execution - Cloud was TestCloud. On first mention, give both names. After that, use the current name.
