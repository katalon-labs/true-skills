# Lifecycle map — 7 stages -> skills -> MCP tools

Single source for the README diagram and the orchestrator's routing. The Katalon testing lifecycle has 7 stages; each maps to one or more skills and a set of MCP tools.

```text
1 PLAN ......... katalon-test-plan
                 list_projects, list_repositories, find_iterations,
                 fetch_requirement_data, find_test_cases_by_requirement,
                 manage_test_folder, manage_test_suite

2 DESIGN ....... katalon-create-test-cases  (+ katalon-test-case-to-playwright-script)
                 find_requirements, read_requirement, create_test_case,
                 read_test_case, update_test_case, find_test_cases

3 MANAGE ....... katalon-test-management
                 find_test_folders, manage_test_folder, find_test_suites,
                 manage_test_suite, move_test_case, duplicate_test_case,
                 link_requirements_to_test_case, unlink_requirements_from_test_case,
                 find_test_cases_by_requirement, fetch_requirement_data

4 REVIEW ....... katalon-test-review
                 fetch_requirement_data, fetch_test_case_data,
                 fetch_test_stability_data, fetch_test_configuration_data,
                 find_test_cases_by_requirement, read_auts

5 EXECUTE ...... katalon-execute-test  (+ upload-report, playwright-execute)
                 read_auts, create_manual_test_run, create_manual_ai_session,
                 read_manual_ai_session, find_execution_profiles,
                 list_test_cloud_environments, build_run_configuration,
                 build_schedule, schedule_test_run, read_execution,
                 read_execution_test_results

6 ANALYZE ...... katalon-analyze-failures + katalon-release-analyze
                 read_test_result, read_execution_test_results, find_test_results,
                 fetch_defect_data, fetch_test_case_data, fetch_test_stability_data,
                 fetch_test_configuration_data, fetch_requirement_data,
                 find_alm_integration_projects, create_defect

7 MAINTAIN ..... katalon-test-maintenance
                 fetch_test_stability_data, find_test_results, read_execution,
                 update_test_case, move_test_case, duplicate_test_case
                 |
                 +--> feeds the gap list back to 1 PLAN (the loop closes)

CROSS-CUTTING .. katalon-platform-setup (connect) · katalon-dogfood-session (test-of)
                 · katalon-trueplatform-testing (router)
```

## Stage boundaries (no MCP)

- Object/action capture, data design, resilience design (stage 2): Studio desktop.
- Custom fields/tags, Git config, governance (stage 3): TestOps UI.
- Code/object review, local debug (stage 4): Studio desktop.
- Rerun / terminate / Live Monitor (stage 5): TestOps UI (MCP reads results only).
- AI root-cause, self-healing, Time Capsule, TrueTest regeneration (stages 6-7): product surfaces, not MCP.

Use Browser/Playwright for AUT exploration; use Studio for object/script work; use the MCP for everything in the tool lists above.
