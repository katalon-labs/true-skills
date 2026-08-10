# Lifecycle map — 7 stages -> skills -> MCP tools

Single source for the README diagram and the orchestrator's routing. The Katalon testing lifecycle has 7 stages; each maps to one or more skills and a set of MCP tools.

```text
1 PLAN ......... test-plan
                 list_projects, list_repositories, find_iterations,
                 fetch_requirement_data, find_test_cases_by_requirement,
                 manage_test_folder, manage_test_suite

2 DESIGN ....... create-test-cases  (+ test-case-to-playwright)
                 find_requirements, read_requirement, create_test_case,
                 read_test_case, update_test_case, find_test_cases

3 MANAGE ....... test-management
                 find_test_folders, manage_test_folder, find_test_suites,
                 manage_test_suite, move_test_case, duplicate_test_case,
                 link_requirements_to_test_case, unlink_requirements_from_test_case,
                 find_test_cases_by_requirement, fetch_requirement_data

4 REVIEW ....... test-review
                 fetch_requirement_data, fetch_test_case_data,
                 fetch_test_stability_data, fetch_test_configuration_data,
                 find_test_cases_by_requirement, read_auts

5 EXECUTE ...... execute-test  (+ upload-report, playwright-execute)
                 read_auts, create_manual_test_run, create_manual_ai_session,
                 read_manual_ai_session, find_execution_profiles,
                 list_test_cloud_environments, build_run_configuration,
                 build_schedule, schedule_test_run, read_execution,
                 read_execution_test_results

6 ANALYZE ...... analyze-failures + release-analyze
                 read_test_result, read_execution_test_results, find_test_results,
                 fetch_defect_data, fetch_test_case_data, fetch_test_stability_data,
                 fetch_test_configuration_data, fetch_requirement_data,
                 find_alm_integration_projects, create_defect

7 MAINTAIN ..... test-maintenance
                 fetch_test_stability_data, find_test_results, read_execution,
                 update_test_case, move_test_case, duplicate_test_case
                 |
                 +--> feeds the gap list back to 1 PLAN (the loop closes)

CROSS-CUTTING .. platform-setup (connect) · true-platform-testing (router)
```

## Stage boundaries (no MCP)

- Object/action capture, data design, resilience design (stage 2): Studio desktop.
- Custom fields/tags, Git config, governance (stage 3): TestOps UI.
- Code/object review, local debug (stage 4): Studio desktop.
- Rerun / terminate / Live Monitor (stage 5): TestOps UI (MCP reads results only).
- AI root-cause, self-healing, Time Capsule, TrueTest regeneration (stages 6-7): product surfaces, not MCP.

Use Browser/Playwright for AUT exploration; use Studio for object/script work; use the MCP for everything in the tool lists above.

## Role map

Four canonical roles. The synonyms are prose only, so someone who uses the industry's noun instead of Katalon's still finds their row.

| Role | Also called | Comes here to | Starts at | Then |
|---|---|---|---|---|
| Manual tester | QA analyst, test analyst, QA engineer | turn a written requirement into cases and run them | `create-test-cases` | `execute-test`, `analyze-failures` |
| Automation tester | SDET, automation engineer, QA engineer | turn cases into code, run it, ship the results | `test-case-to-playwright` | `playwright-execute`, `upload-report`, `test-maintenance` |
| Test lead | QA lead, QE lead, test coordinator | scope the cycle, judge readiness, keep the suite healthy | `test-plan` | `test-review`, `test-management`, `release-analyze` |
| Test manager | QA manager, QE manager, head of quality | read coverage and risk, and call ship | `release-analyze` | `test-review`, `test-management` |

A skill is named here when a request phrased in role terms, naming no skill, should land there first. Everything else is reached by handoff. `QA engineer` maps to two roles on purpose: resolve it by asking one question, never by guessing.

`platform-setup` is role-neutral. It routes on the words connect, install, and MCP rather than on a role, and everyone runs it once.

## Intent to skill

**When a row's owning skill does not exist yet, route to the fallback and say the boundary out loud. Never invent a capability to fill a row.**

| Intent, in the tester's words | Route to today | When the gap closes |
|---|---|---|
| Where do I start, I own quality for this and do not know the tooling | `true-platform-testing` | covered |
| Connect the platform, nothing works | `platform-setup` | covered |
| Analyze this requirement before I write anything | `create-test-cases` | covered |
| I just got requirement CEL-6 and need cases | `create-test-cases` | covered |
| What test data do these cases need | `create-test-cases`, per-case test data field only | `test-data` |
| Seed and tear down data for the run | **boundary only.** No skill owns this. State it | `test-data` |
| Run an exploratory session on checkout | `exploratory-charter` | covered |
| What should we test first this sprint | `test-plan` | covered |
| How many testers, how long, for this release | `test-plan`, scope only. State the boundary | `test-estimation` |
| Which product areas carry the most risk this quarter | `test-plan`, per-cycle risk ranking only. State the boundary | `risk-portfolio` |
| Organize our test cases, they are a mess | `test-management` | covered |
| Which requirements have no coverage | `test-management` | covered |
| Is this suite good enough for the pipeline | `test-review` | covered |
| Run these cases and tell me what broke | `execute-test` | covered |
| Run it with AI, I do not have time to click through | `execute-test` | covered |
| Schedule the automated suite on TestCloud | `execute-test` | covered |
| Turn TC-1042 into a Playwright spec | `test-case-to-playwright` | covered |
| Get my Playwright run into the platform | `playwright-execute` | covered |
| I have a JUnit or Katalon report on disk | `upload-report` | covered |
| Turn this manual case into a Cypress spec | `test-case-to-playwright` as the pattern, `upload-report` via a Mocha JUnit reporter. State the boundary | Cypress pair |
| Turn this manual case into a Selenium test | `upload-report`, JUnit XML path only. State the boundary | Selenium pair |
| Turn this manual case into a Katalon Studio test | `upload-report` runs `katalonc`, execution only, no authoring. State the boundary | Katalon Studio pair |
| Wire this into CI | `playwright-execute` + `upload-report`, both expose CI-invocable commands | `ci-setup` |
| This run failed, is it us or the app | `analyze-failures` | covered |
| File the bugs for these failures | `analyze-failures` | covered |
| Our Cypress suite is flaky | `test-maintenance` | Cypress pair, for the framework-specific rerun path |
| Which tests went flaky this month | `test-maintenance` | covered |
| Can we ship 3.2 | `release-analyze` | covered |
| I need a status deck for the steering committee | `release-analyze`, single-release verdict only. State the boundary | `test-reporting` |
| Trend escaped defects across the last four releases | `release-analyze`, single release only. State the boundary | `test-reporting` |
| What should we change about how we test | `test-maintenance`, asset-level gap list only. State the boundary | `test-retro` |
| Assert on an email, a PDF, a visual, a credential, or a database row inside a test | **boundary only.** No skill owns this. State it | not yet named, script distribution still blocks it |
