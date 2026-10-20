<!-- GENERATED from shared/references/capability-boundaries.md - edit the source -->
# Katalon MCP Capability Boundaries

Contract source: the live Katalon True Platform MCP server, 74 tools, captured 2026-10-20. Older docs pages list other names. If a tool named here is missing in your session, say so and use the closest tool your client discovered. Never call a tool name from memory. At session start, compare this list with the tools your client discovered. If they differ, trust the discovered set and say which names changed.

Name tools by bare name, as written here. Clients add a prefix. Claude Code uses `mcp__<server>__<tool>`.

## Available

Workspace and discovery
- `list_projects`, `list_repositories`, `find_iterations`, `find_execution_profiles`.
- `search` runs semantic search over test cases, suites, folders, requirements, and uploaded specification documents.
- No tool returns the signed-in user. Take the user from the client session. Ask the user for any assignee UUID.

Requirements and ALM
- `find_requirements`, `read_requirement`. Requirements are a read-only mirror of Jira or Azure DevOps.
- `find_test_cases_by_requirement`.
- `manage_requirement_test_case_linkages` links or unlinks, many requirements to many cases, in one call.
- `list_alm_integrations` returns the integration and connection IDs. `fetch_defects` shows the defects already linked to a result, a case, or an execution. `create_defect` files a new one.

Test cases, folders, suites
- `find_test_cases`, `read_test_cases` (many IDs per call), `create_test_case`, `update_test_cases` (batched actions), `move_test_case`, `duplicate_test_case`, `delete_test_case`.
- `find_test_folders`, `manage_test_folder`.
- `find_test_suites`, `read_test_suite`, `manage_test_suite`.
- `find_test_suite_collections` reads collections. No tool creates or edits a collection.

Execution
- `read_auts`, `create_test_run` (manual and automated), `update_test_run` (CONFIGURE, START, END), `read_manual_ai_session`.
- `create_manual_ai_session` is the legacy launcher for a subset of cases. Prefer `update_test_run` with START and `KATALON_AI`.
- `build_run_configuration`, `build_schedule`, `build_private_local_testing_config`.
- `rerun_execution` reruns an automated execution.
- `list_schedule`, `read_schedule_detail`, `update_schedule_configuration`.

Results and evidence
- `find_test_results` reads results by test result, by execution, or by a common or relative filter. `read_execution`.
- `list_executions` (numeric TestOps IDs) and `list_execution_outputs` (TestCloud string IDs and artifact URLs).
- `update_test_results` records a manual result or reviews an automated one.
- `prepare_artifact_upload` and `confirm_artifact_upload` attach evidence up to 10 MiB.

Quality metrics
- `fetch_requirement_metrics`, `fetch_defect_metrics`, `fetch_test_case_metrics`, `fetch_test_configuration_metrics`.
- `fetch_test_stability_metrics` returns flaky, always failing, newly failing, and slow tests. It takes a lookback window. It has no minimum run count.

Test Execution - Cloud assets and tunnels
- `list_test_cloud_environments`, `list_test_cloud_agents`, `list_test_cloud_apps`.
- `get_upload_test_cloud_app_url`, `create_test_cloud_app`, `manage_test_cloud_dynamic_app`, `delete_test_cloud_app`.
- `list_test_cloud_tunnels`, `prepare_test_cloud_tunnel_start`, `stop_test_cloud_tunnel`.

TrueTest
- `list_truetest_auts`, `list_truetest_tracking_environments`, `search_truetest_sessions`, `get_truetest_session`.
- `search_truetest_journey_maps`, `get_truetest_journey_map`, `create_truetest_journey_map`, `get_truetest_journey_map_request`.
- `create_truetest_test_case_from_session` takes 1 to 25 sessions. `create_truetest_test_case_from_flow` takes one journey-map flow. Both queue generation and need user approval. A flow that already has linked cases follows the backend regeneration behavior, so confirm before you run it there.

Team memory (Kai)
- `memory_list`, `memory_read`, `memory_read_page` read the conventions the team and the user taught Kai.
- `memory_write` and `memory_forget` change that memory. Call them only when the user asks to remember or forget something. Memory is optional context. Every skill works when it is empty or unavailable.

## Not available through the MCP

- Create requirements. Create them in Jira or Azure DevOps, then sync, find, and link.
- Create a formal Test Plan entity. A named folder or suite gives an execution scope. It is no plan of record.
- Guarantee that Run with AI finishes. The platform can block it or fail it.
- Stop a running automated execution (Studio, Katalon Test Execution - Local, or Test Execution - Cloud). `rerun_execution` starts a new one. To close a TestPak run, including a hosted Run with AI session, call `update_test_run` with END.
- Inspect the live AUT. Use a browser tool or Playwright.
- Look up another user to set an assignee.
- Look up a manual run by its order number. Find the numeric `execution_id` with `list_executions`, then call `read_execution`.
- Create or edit suite collections.
- Author release gates, custom fields, tags, Git repository settings, project governance, or project-wide agent rules. Use the True Platform UI.
- Self-healing and Time Capsule. These are product features outside the MCP.
- Create a defect without a failed test result ID and ALM integration details.

## Quirks every skill keeps

- `delete_test_case` removes a case. Ask for a yes that names the case. Read back after the delete.
- A test case name starts with a letter or digit. It accepts letters, digits, spaces, and `( ) . , _ -`. The characters `@ : /` are rejected. A `path` for a case starts with `Test Cases`. A folder path can contain `/`.
- `create_test_case` with type AUTOMATED creates nothing. It returns guidance only.
- `update_test_cases` with UPDATE_CONTENT replaces all steps. Send the complete step list and keep every Call Test Case step.
- `manage_test_suite` rejects a suite that mixes MANUAL and AUTOMATED cases.
- Two ID spaces both say "execution". TestOps uses a number. TestCloud uses a string. No tool converts one to the other. Never swap `list_executions` and `list_execution_outputs`. `update_test_run` takes the platform `execution_id`. It never takes `manualExecutionId` or the order number shown in the UI.
- `update_test_results` counts as success only when the outcome is `applied` or `unchanged`. A manual result needs an active run that the caller created. An automated review needs a completed run.
- Run with AI asks for `browser_profile_mode` (SHARED or SEPARATE). The legacy launcher also asks for `os` (windows or linux). Ask the user. Never infer either. Hosted AI runs Chrome on Windows or Linux only.
- `update_test_run` with START needs a choice between Run with AI and manual testing in TestPak. If the user did not choose, ask. A missing AI request does not select MANUAL.
- `create_defect` needs `alm_integration_id` and `alm_connection_id` from `list_alm_integrations`. It also needs a `summary`. Ask the user for it. Check `fetch_defects` first to avoid a duplicate.
- `search_truetest_sessions` covers at most 31 days. A `session_reference` is opaque. Never build one by hand.
- `search` tier (exact, strong, weak) decides whether something exists. A response with `incomplete=true`, `retrieval_mode="keyword_fallback"`, or a warning never proves absence. Assets created in the last few minutes may be missing.
- Resource links in tool results may point to a host that does not resolve for your tenant. Give the ID as well as the link.

## Terminology

Katalon True Platform was TestOps. Katalon Test Execution - Local was Katalon Runtime Engine (KRE). Katalon Test Execution - Cloud was TestCloud. On first mention, give both names. After that, use the current name.
