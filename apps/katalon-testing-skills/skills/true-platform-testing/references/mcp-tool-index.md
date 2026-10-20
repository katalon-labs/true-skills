# MCP tool index

Every Katalon MCP tool in the October 2026 docs, grouped by area. Source: the Katalon docs page "Katalon True Platform MCP Server". Parameters are in each tool's own schema. This page lists only what the docs state.

Class: R reads or builds a payload. W writes. D is destructive and needs an explicit yes that names the target. Stage: 1 plan, 2 design, 3 manage, 4 review, 5 execute, 6 analyze, 7 maintain.

## Workspace and discovery

| Tool | Class | What it does | Stage |
|---|---|---|---|
| `list_projects` | R | Projects the user can reach. Start here. | all |
| `list_repositories` | R | Repositories (Test Projects) of a project. Takes `project_id`. | all |
| `find_iterations` | R | Sprints and releases, by relative scope or filter. | 1, 4 |
| `find_execution_profiles` | R | Execution profiles for automated runs. | 5 |
| `get_user_context` | R | The signed-in user. Use it to confirm who is connected. | setup |

## Requirements and ALM

| Tool | Class | What it does | Stage |
|---|---|---|---|
| `find_requirements` | R | Synced Jira or Azure DevOps requirements. | 1, 2 |
| `read_requirement` | R | One requirement as Markdown. | 2 |
| `find_test_cases_by_requirement` | R | Cases linked to one requirement. Pass exactly one identifier. | 1, 3, 4 |
| `link_requirements_to_test_case` | W | Link requirements to a case. | 3 |
| `unlink_requirements_from_test_case` | W | Remove a link. | 3 |
| `find_alm_integration_projects` | R | ALM integration projects. Gives `alm_integration_id`. | 6 |
| `create_defect` | W | File an ALM defect for one failed result. External side effect. | 6 |

## Test cases, folders, suites

| Tool | Class | What it does | Stage |
|---|---|---|---|
| `find_test_cases` | R | Filtered list of cases. | 2, 3 |
| `read_test_case` | R | One case with steps. | 2, 4 |
| `create_test_case` | W | Create a manual case. AUTOMATED creates nothing. | 2 |
| `update_test_case` | W | Edit metadata or content. | 2, 7 |
| `move_test_case` | W | Move a case to a folder. | 3, 7 |
| `duplicate_test_case` | W | Copy a case in place. | 7 |
| `delete_test_case` | D | Delete a case. Unreliable. Prefer update or move. | 3 |
| `find_test_folders` | R | List folders. | 3 |
| `manage_test_folder` | W, D | Create, rename, move, duplicate, or delete a folder. DELETE is destructive. | 1, 3 |
| `find_test_suites` | R | List suites. | 3, 5 |
| `read_test_suite` | R | A suite and its cases. | 3, 5 |
| `manage_test_suite` | W, D | Create, add cases, rename, move, duplicate, or delete a suite. No mixed MANUAL and AUTOMATED. | 1, 3 |
| `find_test_suite_collections` | R | List or read suite collections. No tool edits them. | 1, 3 |

## Execution

| Tool | Class | What it does | Stage |
|---|---|---|---|
| `read_auts` | R | AUTs and environments. Call right before a manual run. | 4, 5 |
| `create_test_run` | W | Create a manual or automated run. Needs consent. | 5 |
| `build_run_configuration` | R | Build the configuration payload for an automated run. | 5 |
| `build_schedule` | R | Build the schedule payload. | 5 |
| `build_private_local_testing_config` | R | Build the tunnel or allowlist payload for a private AUT. | 5 |
| `create_manual_ai_session` | W | Start Run with AI on a manual run. Needs consent. | 5 |
| `read_manual_ai_session` | R | Poll a Run with AI session. No cancel exists. | 5 |
| `read_manual_test_run_detail_by_order` | R | Find a manual run by its order number. | 5 |
| `rerun_execution` | W | Rerun a completed execution. Needs consent. | 6, 7 |
| `list_schedule` | R | Saved schedules. | 1, 5 |
| `read_schedule_detail` | R | One schedule. | 1, 5 |
| `update_schedule_configuration` | W | Edit schedules. Call once with every target. | 1, 5 |

## Results and evidence

| Tool | Class | What it does | Stage |
|---|---|---|---|
| `find_test_results` | R | Results at several granularities. | 6, 7 |
| `read_test_result` | R | One result. Needed for `create_defect`. | 6, 7 |
| `read_execution` | R | One execution, by numeric TestOps ID. | 5, 6, 7 |
| `read_execution_test_results` | R | Results of an execution, grouped by job. | 5, 6 |
| `list_executions` | R | Executions with numeric TestOps IDs. | 5, 6 |
| `list_execution_outputs` | R | Test Execution - Cloud artifacts, by string ID. | 6 |
| `update_test_results` | W | Record a manual result or review an automated one. | 5, 6 |
| `prepare_artifact_upload` | W | Get a signed URL for evidence up to 10 MiB. | 5, 6 |
| `confirm_artifact_upload` | W | Confirm the upload and get an artifact ID. | 5, 6 |

## Quality insights

| Tool | Class | What it does | Stage |
|---|---|---|---|
| `get_requirement_insights` | R | Requirement coverage for an iteration. | 1, 4, 6 |
| `get_defect_insights` | R | Defect distribution. | 4, 6 |
| `get_test_case_insights` | R | Case execution statistics and automation status. | 4, 6 |
| `get_test_configuration_insights` | R | OS and browser coverage. | 4, 6 |
| `analyze_test_case_stability` | R | Flaky, always failing, newly failing, and slow tests. | 4, 6, 7 |
| `analyze_test_flakiness` | R | Flakiness over a lookback window with a minimum run count. | 6, 7 |

## Test Execution - Cloud assets and tunnels

| Tool | Class | What it does | Stage |
|---|---|---|---|
| `list_test_cloud_environments` | R | Browser and device catalog. | 5 |
| `list_test_cloud_agents` | R | Execution agents. | 5 |
| `list_test_cloud_apps` | R | Uploaded apps. | 5 |
| `get_upload_test_cloud_app_url` | R | Signed upload URL for an app. | 5 |
| `create_test_cloud_app` | W | Register an uploaded app. | 5 |
| `manage_test_cloud_dynamic_app` | W, D | Create or update an app alias. UPDATE is destructive. | 5 |
| `delete_test_cloud_app` | D | Delete apps for good. | 5 |
| `list_test_cloud_tunnels` | R | Active tunnels. | 5 |
| `prepare_test_cloud_tunnel_start` | R | Commands that start a tunnel client. | 5 |
| `stop_test_cloud_tunnel` | D | Stop a tunnel. Others may share it. | 5 |

## TrueTest

| Tool | Class | What it does | Stage |
|---|---|---|---|
| `list_truetest_auts` | R | Linked AUTs. | 2 |
| `list_truetest_tracking_environments` | R | Tracking environments. | 2 |
| `search_truetest_sessions` | R | Captured sessions. Window up to 31 days. | 2 |
| `get_truetest_session` | R | One session with replay steps. | 2 |
| `search_truetest_journey_maps` | R | Journey maps. | 2 |
| `get_truetest_journey_map` | R | One journey map, in pages. | 2 |
| `create_truetest_journey_map` | W | Start a journey map job. | 2 |
| `get_truetest_journey_map_request` | R | Poll a journey map job. Do not resubmit on error. | 2 |
| `create_truetest_test_case_from_session` | W | Generate cases from 1 to 25 sessions. Needs user approval. | 2 |

## Not available through the MCP

Read `capability-boundaries.md`.
