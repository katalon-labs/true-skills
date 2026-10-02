# Katalon MCP Capability Boundaries

## Available

- Project discovery: `list_projects`.
- Repository/Test Project discovery: `list_repositories`.
- Requirement discovery: `find_requirements`, `read_requirement`.
- Requirement coverage: `fetch_requirement_data`.
- Test case operations: `create_test_case`, `read_test_case`, `update_test_case`, `duplicate_test_case`, `delete_test_case`, `move_test_case`, `find_test_cases`.
- Test folder operations: `find_test_folders`, `manage_test_folder`.
- Test suite operations: `find_test_suites`, `read_test_suite`, `manage_test_suite`.
- Requirement links: `link_requirements_to_test_case`, `unlink_requirements_from_test_case`, `find_test_cases_by_requirement`.
- Manual/TestPak execution: `read_auts`, `create_test_run(mode="manual")`, `update_test_run` START/END, `update_test_results`, and `read_manual_ai_session`. START MANUAL covers humans and local agent harnesses; START KATALON_AI explicitly launches the hosted runner. Older servers may expose `create_manual_test_run` / `create_manual_ai_session`; discover the live catalog before using them.
- Evidence: `prepare_artifact_upload`, actual client-side byte upload, then `confirm_artifact_upload`; attach the confirmed artifact through `update_test_results`. No uploader means a human TestPak upload handoff, not fabricated evidence.
- Automated execution: `find_execution_profiles`, `list_test_cloud_environments`, `build_run_configuration`, `build_schedule`, `schedule_test_run`.
- Execution results: `read_execution`, `read_execution_test_results`, `read_test_result`, `find_test_results`.
- Quality data: requirement, defect, test case, test stability, and configuration coverage fetch tools.
- ALM defects: `find_alm_integration_projects`, `create_defect`.

## Not Directly Available

- Create requirements in Katalon True Platform. Requirements are synced from Jira/Azure and can be found/read/linked.
- Create a formal Test Plan entity. Use test suites/folders/executions as the executable planning structure.
- Guarantee Run with AI completion. The platform may block, fail, or require AUT/account state.
- Inspect AUT pages through Katalon MCP. Use the client's browser/computer tools for local execution or guide a human if they are absent.
- Arbitrary lifecycle/status assignments or reopening an ended TestPak. END preserves calculated test outcomes; skipping unfinished work requires explicit user intent.
- Create defects without a failed test result ID and ALM integration details.

## Recommended Workarounds

- Requirement creation: create in Jira/Azure first, then sync/find/link in Katalon.
- Test plan: create a named folder and/or test suite, link to sprint/release, and create execution from that suite.
- AUT exploration: use Browser/Playwright to understand the product, then import manual cases into Katalon.
- AI execution blocked: report blocked state with required fixture, AUT, account, or environment action.
