# MCP tool index

Every tool on the live Katalon True Platform MCP server, grouped by area. The server exposes 74 tools, captured 2026-10-20. Parameters are in each tool's own schema. This page lists the job of each tool and the rule that most often goes wrong.

Class: R reads or builds a payload. W writes. C needs confirmation because it uses Test Execution - Cloud minutes, launches a hosted browser, queues generation, or reaches Jira or Azure DevOps. D is destructive and needs an explicit yes that names the target. Stage: 1 plan, 2 design, 3 manage, 4 review, 5 execute, 6 analyze, 7 maintain.

## Workspace and discovery

| Tool | Class | What it does | Stage |
|---|---|---|---|
| `list_projects` | R | Projects the user can reach. Start here. Also the connection check, because no tool returns the signed-in user. | all |
| `list_repositories` | R | Repositories (Test Projects) of a project. Takes `project_id`. | all |
| `find_iterations` | R | Sprints and releases, by scope or query. | 1, 4 |
| `find_execution_profiles` | R | Execution profiles for automated runs. Never assume a default. | 5 |
| `search` | R | Semantic search over cases, suites, folders, requirements, and uploaded documents. A hit has a tier. No hit does not prove absence. | 1, 2, 3 |

## Requirements and ALM

| Tool | Class | What it does | Stage |
|---|---|---|---|
| `find_requirements` | R | Synced Jira or Azure DevOps requirements. | 1, 2 |
| `read_requirement` | R | One requirement as Markdown. Read `customFields` for acceptance criteria. | 2 |
| `find_test_cases_by_requirement` | R | Cases linked to one requirement. Pass exactly one identifier. | 1, 3, 4 |
| `manage_requirement_test_case_linkages` | W, D | Link or unlink many requirements and many cases in one call. Unlink needs a yes that names the links. | 3 |
| `list_alm_integrations` | R | ALM integration and connection IDs, and Jira defect field mappings. | 6 |
| `fetch_defects` | R | Defects already linked to a result, a case, or an execution. Check it before `create_defect`. | 6 |
| `create_defect` | W, C | File a Jira or Azure DevOps bug for one failed result. Ask for the summary. | 6 |

## Test cases, folders, suites

| Tool | Class | What it does | Stage |
|---|---|---|---|
| `find_test_cases` | R | Filtered list of cases. Pages start at 0. | 2, 3 |
| `read_test_cases` | R | Many cases by ID. `content_type` FLOW returns steps. | 2, 4 |
| `create_test_case` | W | Create a manual case. AUTOMATED creates nothing. | 2 |
| `update_test_cases` | W | Batched edits, one `action` per field. Batch every change to one case in one call. | 2, 7 |
| `move_test_case` | W | Move a case to a folder. | 3, 7 |
| `duplicate_test_case` | W | Copy a case in place. | 7 |
| `delete_test_case` | D | Delete a case. | 3 |
| `find_test_folders` | R | List folders. Compare `rawPath` values. | 3 |
| `manage_test_folder` | W, D | Create, rename, move, duplicate, or delete a folder. DELETE is destructive. | 1, 3 |
| `find_test_suites` | R | List suites. | 3, 5 |
| `read_test_suite` | R | A suite and its cases. | 3, 5 |
| `manage_test_suite` | W, D | Create, add cases, rename, move, duplicate, or delete a suite. No mixed MANUAL and AUTOMATED. | 1, 3 |
| `find_test_suite_collections` | R | List or read suite collections. No tool edits them. | 1, 3 |

## Execution

| Tool | Class | What it does | Stage |
|---|---|---|---|
| `read_auts` | R | AUTs and environments. Call right before a manual run. | 4, 5 |
| `create_test_run` | W, C | Create a manual or automated run. Ask manual or automated first when the user did not say. | 5 |
| `update_test_run` | W, C, D | CONFIGURE the AUT and private access, START (MANUAL or KATALON_AI), or END the run. END with SKIP is destructive. | 5 |
| `build_run_configuration` | R | Build the configuration payload for an automated run. | 5 |
| `build_schedule` | R | Build the schedule payload. | 5 |
| `build_private_local_testing_config` | R | Build the tunnel or allowlist payload for a private AUT. Only after the user chose. | 5 |
| `create_manual_ai_session` | W, C | Legacy launcher for Run with AI on a subset of cases. Never use it on a run that `update_test_run` started. | 5 |
| `read_manual_ai_session` | R | Poll a Run with AI session. | 5 |
| `rerun_execution` | W, C | Rerun an automated execution the user named. Not for a TestPak. | 6, 7 |
| `list_schedule` | R | Saved schedules. | 1, 5 |
| `read_schedule_detail` | R | One schedule. | 1, 5 |
| `update_schedule_configuration` | W | Edit schedules. Call once, after a yes, with every target. | 1, 5 |

## Results and evidence

| Tool | Class | What it does | Stage |
|---|---|---|---|
| `find_test_results` | R | Results by test result, by execution, or by a common or relative filter. | 6, 7 |
| `read_execution` | R | One execution, by numeric TestOps ID. | 5, 6, 7 |
| `list_executions` | R | Executions with numeric TestOps IDs, in a time window. | 5, 6 |
| `list_execution_outputs` | R | Test Execution - Cloud artifacts, by string ID. | 6 |
| `update_test_results` | W | Record a manual result or review an automated one. | 5, 6 |
| `prepare_artifact_upload` | W | Get a signed URL for evidence up to 10 MiB. | 5, 6 |
| `confirm_artifact_upload` | W | Confirm the upload and get an artifact ID. | 5, 6 |

## Quality metrics

| Tool | Class | What it does | Stage |
|---|---|---|---|
| `fetch_requirement_metrics` | R | Requirement coverage for a sprint or release. | 1, 4, 6 |
| `fetch_defect_metrics` | R | Defect distribution. One resolution state per call. | 4, 6 |
| `fetch_test_case_metrics` | R | Case execution statistics and automation status. | 4, 6 |
| `fetch_test_configuration_metrics` | R | OS or browser coverage and pass rate. | 4, 6 |
| `fetch_test_stability_metrics` | R | Flaky, always failing, newly failing, and slow tests. | 4, 6, 7 |

## Test Execution - Cloud assets and tunnels

| Tool | Class | What it does | Stage |
|---|---|---|---|
| `list_test_cloud_environments` | R | Browser and device catalog. | 5 |
| `list_test_cloud_agents` | R | Execution agents. | 5 |
| `list_test_cloud_apps` | R | Uploaded apps. | 5 |
| `get_upload_test_cloud_app_url` | R | Signed upload URL for an app. | 5 |
| `create_test_cloud_app` | W | Register an uploaded app. | 5 |
| `manage_test_cloud_dynamic_app` | W, D | Create or update an app alias. UPDATE is destructive. | 5 |
| `delete_test_cloud_app` | D | Delete apps for good. The user types YES. | 5 |
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
| `get_truetest_journey_map` | R | One journey map, in pages. Also shows the cases linked to a flow. | 2 |
| `create_truetest_journey_map` | W | Start a journey map job. | 2 |
| `get_truetest_journey_map_request` | R | Poll a journey map job. Do not resubmit on error. | 2 |
| `create_truetest_test_case_from_session` | W, C | Queue case generation from 1 to 25 sessions. Needs user approval. | 2 |
| `create_truetest_test_case_from_flow` | W, C | Queue case generation for one journey-map flow. Confirm before you run it on a flow that has cases. | 2 |

## Team memory (Kai)

| Tool | Class | What it does | Stage |
|---|---|---|---|
| `memory_list` | R | Headlines of the team and user memory, plus the project policy page. Call once at the start of authoring. | 1, 2, 3, 4 |
| `memory_read` | R | Full bodies for up to 20 record IDs. Quote them. Do not restate them as platform facts. | 1, 2, 3, 4 |
| `memory_read_page` | R | One distilled guidance page by slug. | 1, 2, 3, 4 |
| `memory_write` | W | Store one note in the user's own words. Only when the user asks. | none |
| `memory_forget` | D | Delete memory records for good. Only when the user asks. | none |

## Not available through the MCP

Read `capability-boundaries.md`.
