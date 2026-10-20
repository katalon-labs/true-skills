# Lifecycle map

Seven stages, each with its skill and its MCP tools. Read this when you route a request or draw the lifecycle.

```text
1 PLAN ......... test-plan  (+ test-estimation)
                 list_projects, list_repositories, find_iterations,
                 get_requirement_insights, find_test_cases_by_requirement,
                 manage_test_folder, manage_test_suite, find_test_suite_collections,
                 list_schedule, read_schedule_detail, update_schedule_configuration

2 DESIGN ....... create-test-cases  (+ test-data, exploratory-charter, test-case-to-playwright,
                 test-case-to-katalon-studio)
                 find_requirements, read_requirement, create_test_case,
                 read_test_case, update_test_case, find_test_cases,
                 list_truetest_auts, search_truetest_sessions, create_truetest_test_case_from_session

3 MANAGE ....... test-management
                 find_test_folders, manage_test_folder, find_test_suites,
                 manage_test_suite, find_test_suite_collections, move_test_case,
                 duplicate_test_case, link_requirements_to_test_case,
                 unlink_requirements_from_test_case, find_test_cases_by_requirement

4 REVIEW ....... test-review
                 get_requirement_insights, get_test_case_insights,
                 analyze_test_case_stability, get_test_configuration_insights,
                 find_test_cases_by_requirement, read_auts

5 EXECUTE ...... execute-test  (+ upload-report, playwright-execute)
                 read_auts, create_test_run, create_manual_ai_session,
                 read_manual_ai_session, update_test_results, prepare_artifact_upload,
                 confirm_artifact_upload, find_execution_profiles,
                 list_test_cloud_environments, build_run_configuration, build_schedule,
                 build_private_local_testing_config, list_executions, read_execution,
                 read_execution_test_results

6 ANALYZE ...... analyze-failures + release-analyze  (+ test-reporting)
                 read_test_result, read_execution_test_results, find_test_results,
                 list_execution_outputs, get_defect_insights, get_test_case_insights,
                 analyze_test_case_stability, get_test_configuration_insights,
                 get_requirement_insights, rerun_execution,
                 find_alm_integration_projects, create_defect

7 MAINTAIN ..... test-maintenance
                 analyze_test_case_stability, analyze_test_flakiness, find_test_results,
                 read_execution, update_test_case, move_test_case, duplicate_test_case,
                 rerun_execution
                 |
                 +--> feeds the gap list back to 1 PLAN (the loop closes)

CROSS-CUTTING .. get-started (first run) . platform-setup (connect) . true-platform-testing (router)
```

## Stage boundaries (outside the MCP)

- Object and action capture, data design, resilience design (stage 2): Katalon Studio desktop.
- Custom fields, tags, Git settings, governance (stage 3): the True Platform UI.
- Code and object review, local debug (stage 4): Katalon Studio desktop.
- Stopping a running execution and Live Monitor (stage 5): the True Platform UI. The MCP can rerun a completed execution and read results.
- Self-healing, Time Capsule, TrueTest regeneration (stages 6 and 7): product features outside the MCP.

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
| Turn recorded user sessions into cases | `create-test-cases` | session to case generation needs approval and takes 1 to 25 sessions |
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
| Run it with AI, I do not have time to click through | `execute-test` | Run with AI has no cancel |
| I ran it by hand and need to record the results | `execute-test` | needs an active run assigned to you |
| Schedule the automated suite on Test Execution - Cloud | `execute-test` | none |
| Run against an app on a private network | `execute-test` | needs a tunnel or an allowlist. `platform-setup` diagnoses tunnels |
| Turn TC-1042 into a Playwright spec | `test-case-to-playwright` | none |
| Turn TC-1042 into a Katalon Studio test | `test-case-to-katalon-studio` | none |
| Get my Playwright run into the platform | `playwright-execute` | none |
| I have a JUnit or Katalon report on disk | `upload-report` | none |
| Turn this manual case into a Cypress spec | `test-case-to-playwright` as the pattern, `upload-report` through a JUnit reporter | no Cypress skill exists |
| Turn this manual case into a Selenium test | `upload-report`, JUnit XML path only | no Selenium skill exists |
| Wire this into CI | `playwright-execute` and `upload-report` | both expose commands CI can run. No CI setup skill exists |
| This run failed, is it us or the app | `analyze-failures` | none |
| File the bugs for these failures | `analyze-failures` | needs a failed result ID and an ALM integration |
| Rerun the failed execution | `analyze-failures` | only a completed execution reruns |
| Our suite is flaky | `test-maintenance` | none |
| Which tests went flaky this month | `test-maintenance` | none |
| Can we ship 3.2 | `release-analyze` | none |
| I need a status deck for the steering committee | `test-reporting` | none |
| Trend escaped defects across the last four releases | `test-reporting` | the MCP keeps no history. Trends need period snapshots |
| What should we change about how we test | `test-maintenance` | asset-level gap list only. No retrospective skill exists |
| Assert on an email, a PDF, a visual, a credential, or a database row inside a test | none | no skill owns this. State it |
