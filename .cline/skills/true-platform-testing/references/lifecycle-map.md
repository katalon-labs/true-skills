# Lifecycle map

Seven stages, each with its skill and its MCP tools. Read this when you route a request or draw the lifecycle.

```text
1 PLAN ......... test-plan  (+ test-estimation)
                 list_projects, list_repositories, find_iterations,
                 fetch_requirement_metrics, find_test_cases_by_requirement, search,
                 manage_test_folder, manage_test_suite, find_test_suite_collections,
                 list_schedule, read_schedule_detail, update_schedule_configuration,
                 memory_list

2 DESIGN ....... create-test-cases  (+ truetest-journeys, test-data, exploratory-charter,
                 test-case-to-playwright, test-case-to-katalon-studio)
                 find_requirements, read_requirement, search, create_test_case,
                 read_test_cases, update_test_cases, find_test_cases
                 truetest-journeys: list_truetest_auts, list_truetest_tracking_environments,
                 search_truetest_sessions, get_truetest_session, search_truetest_journey_maps,
                 get_truetest_journey_map, create_truetest_journey_map,
                 get_truetest_journey_map_request, create_truetest_test_case_from_session,
                 create_truetest_test_case_from_flow

3 MANAGE ....... test-management
                 find_test_folders, manage_test_folder, find_test_suites,
                 manage_test_suite, find_test_suite_collections, move_test_case,
                 duplicate_test_case, manage_requirement_test_case_linkages,
                 find_test_cases_by_requirement, search

4 REVIEW ....... test-review
                 fetch_requirement_metrics, fetch_test_case_metrics,
                 fetch_test_stability_metrics, fetch_test_configuration_metrics,
                 find_test_cases_by_requirement, read_auts, memory_list

5 EXECUTE ...... test-environments, then execute-test  (+ upload-report, playwright-execute)
                 test-environments: read_auts, find_execution_profiles,
                 list_test_cloud_environments, list_test_cloud_agents, list_test_cloud_apps,
                 get_upload_test_cloud_app_url, create_test_cloud_app,
                 manage_test_cloud_dynamic_app, delete_test_cloud_app,
                 list_test_cloud_tunnels, prepare_test_cloud_tunnel_start,
                 stop_test_cloud_tunnel, build_private_local_testing_config,
                 build_run_configuration
                 execute-test: read_auts, create_test_run, update_test_run,
                 read_manual_ai_session, update_test_results, prepare_artifact_upload,
                 confirm_artifact_upload, build_schedule, list_executions, read_execution,
                 find_test_results

6 ANALYZE ...... analyze-failures + release-analyze  (+ test-reporting)
                 find_test_results, list_execution_outputs, fetch_defect_metrics,
                 fetch_test_case_metrics, fetch_test_stability_metrics,
                 fetch_test_configuration_metrics, fetch_requirement_metrics,
                 rerun_execution, fetch_defects, list_alm_integrations, create_defect

7 MAINTAIN ..... test-maintenance
                 fetch_test_stability_metrics, find_test_results, read_execution,
                 update_test_cases, move_test_case, duplicate_test_case,
                 rerun_execution
                 |
                 +--> feeds the gap list back to 1 PLAN (the loop closes)

CROSS-CUTTING .. get-started (first run) . platform-setup (connect) . true-platform-testing (router)
                 project-memory (session start, once): memory_list, memory_read,
                 memory_read_page, memory_write, memory_forget
```

## Stage boundaries (outside the MCP)

- Object and action capture, data design, resilience design (stage 2): Katalon Studio desktop.
- Custom fields, tags, Git settings, governance (stage 3): the True Platform UI.
- Code and object review, local debug (stage 4): Katalon Studio desktop.
- Stopping a running automated execution and Live Monitor (stage 5): the True Platform UI. The MCP can end a TestPak run, including hosted Run with AI, with `update_test_run`. It can rerun an automated execution and read results.
- Self-healing and Time Capsule (stages 6 and 7): product features outside the MCP.

Use a browser tool or Playwright to explore the AUT. Use Katalon Studio for object and script work. Use the MCP for everything in the tool lists above.

## Role map

Four roles. The synonyms are prose only. They help someone who uses the industry's noun instead of Katalon's find their row.

| Role | Also called | Comes here to | Starts at | Then |
|---|---|---|---|---|
| Manual tester | QA analyst, test analyst, QA engineer | turn a written requirement into cases and run them | `create-test-cases` | `execute-test`, `analyze-failures` |
| Automation tester | SDET, automation engineer, QA engineer | turn cases into code, run it, and send the results to the platform | `test-case-to-playwright` | `playwright-execute`, `upload-report`, `test-maintenance` |
| Test lead | QA lead, QE lead, test coordinator | scope the cycle, judge readiness, keep the suite healthy | `test-plan` | `test-review`, `test-management`, `release-analyze` |
| Test manager | QA manager, QE manager, head of quality | read coverage and risk, and call ship | `release-analyze` | `test-review`, `test-management`, `test-reporting` |

A skill sits in this table when a request in role terms, naming no skill, should land there first. Everything else comes by handoff. "QA engineer" maps to two roles on purpose. Resolve it with one question. Never guess.

`get-started` and `platform-setup` are role-neutral. They route on the words get started, connect, install, and MCP. Everyone runs them once.

## Intent to skill

When no skill owns a row, route to the fallback and state the boundary out loud. Never invent a capability to fill a row.

| Intent, in the tester's words | Route to | Boundary to state |
|---|---|---|
| Where do I start, I own quality here and do not know the tooling | `true-platform-testing` | none |
| I just connected, set me up | `get-started` | none |
| Connect the platform, nothing works | `platform-setup` | none |
| Analyze this requirement before I write anything | `create-test-cases` | none |
| I just got requirement CEL-6 and need cases | `create-test-cases` | none |
| Turn recorded user sessions into cases | `truetest-journeys` | session to case generation needs approval and takes 1 to 25 sessions |
| What do users do that we do not test | `truetest-journeys` | sessions reach back 31 days. A journey map is an async job: poll it, never resubmit |
| Build a journey map, or compare its flows with our cases | `truetest-journeys` | none |
| What test data do these cases need | `test-data` | none |
| Seed and tear down data for the run | `test-data` | the MCP has no seeding, fixture, or secrets tool |
| Run an exploratory session on checkout | `exploratory-charter` | none |
| What should we test first this sprint | `test-plan` | a folder or suite gives an execution scope and no plan of record |
| How many testers, how long, for this release | `test-estimation` | none |
| Which product areas carry the most risk this quarter | `test-plan` | per-cycle ranking only. No portfolio skill exists |
| Organize our test cases, they are a mess | `test-management` | none |
| Which requirements have no coverage | `test-management` | none |
| Is this suite good enough for the pipeline | `test-review` | none |
| Run these cases and tell me what broke | `execute-test` | none |
| Run it with AI, I do not have time to click through | `execute-test` | ending the run closes the whole TestPak, and unfinished cases need a skip decision |
| I ran it by hand and need to record the results | `execute-test` | needs an active run that you created |
| Schedule the automated suite on Test Execution - Cloud | `execute-test` | none |
| Run against an app on a private network | `test-environments`, then `execute-test` | needs a tunnel or an allowlist. `platform-setup` diagnoses a tunnel that will not connect |
| Upload my mobile app, or point a name at the latest build | `test-environments` | the app upload needs a terminal that can run the returned curl command |
| Which browsers and devices can I run on | `test-environments` | none |
| Delete an old app, or stop a tunnel | `test-environments` | destructive: needs a typed yes that names the target |
| Load our team's conventions before we start | `project-memory` | read once at session start. Empty or missing memory is not an error |
| Remember that we always do X | `project-memory` | stored as the person's own memory. A project-wide rule is set by a project admin on the Agent Rules screen |
| Turn TC-1042 into a Playwright spec | `test-case-to-playwright` | none |
| Turn TC-1042 into a Katalon Studio test | `test-case-to-katalon-studio` | none |
| Get my Playwright run into the platform | `playwright-execute` | none |
| I have a JUnit or Katalon report on disk | `upload-report` | none |
| Turn this manual case into a Cypress spec | `test-case-to-playwright` as the pattern, `upload-report` through a JUnit reporter | no Cypress skill exists |
| Turn this manual case into a Selenium test | `upload-report`, JUnit XML path only | no Selenium skill exists |
| Wire this into CI | `playwright-execute` and `upload-report` | both expose commands CI can run. No CI setup skill exists |
| This run failed, is it us or the app | `analyze-failures` | none |
| File the bugs for these failures | `analyze-failures` | needs a failed result ID and an ALM integration |
| Rerun the failed execution | `analyze-failures` | only an automated execution reruns. A TestPak restarts with `update_test_run` |
| Our suite is flaky | `test-maintenance` | none |
| Which tests went flaky this month | `test-maintenance` | none |
| Can we ship 3.2 | `release-analyze` | none |
| I need a status deck for the steering committee | `test-reporting` | none |
| Trend escaped defects across the last four releases | `test-reporting` | the MCP keeps no history. Trends need period snapshots |
| What should we change about how we test | `test-maintenance` | asset-level gap list only. No retrospective skill exists |
| Assert on an email, a PDF, a visual, a credential, or a database row inside a test | none | no skill owns this. State it |
