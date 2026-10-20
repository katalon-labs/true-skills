# Combination recipes

Each recipe chains several skills into one play. A recipe gives the trigger, the skill order, the key tools, the stop condition, and the boundary. Each skill runs its own workflow and its own confirmation. The router passes the resolved context between them.

## R1 - Requirement to ship call (stages 1 to 6)
- **Trigger:** "test CEL-6 end to end and tell me if we can ship."
- **Skills:** `test-plan`, `create-test-cases`, `execute-test`, `analyze-failures`, `release-analyze`.
- **Tools:** `get_requirement_insights`, `find_test_cases_by_requirement`, `create_test_case`, `link_requirements_to_test_case`, `manage_test_suite`, `read_auts`, `create_test_run`, `create_manual_ai_session`, `read_manual_ai_session`, `read_test_result`, then the insights tools.
- **Stop when:** the release verdict is issued (Ready, Ready with risk, or Not ready).
- **Boundary:** the ship call reads gates. It does not set them. Each write and each run needs its own confirmation.

## R2 - Coverage rescue (stages 3, 4, 2)
- **Trigger:** "we have gaps, fix our coverage for project X."
- **Skills:** `test-management` (find orphan requirements and cases), `test-review` (verdict on what exists), `create-test-cases` (fill the gaps).
- **Tools:** `find_test_cases_by_requirement`, `get_requirement_insights`, `find_test_cases`, `get_test_case_insights`, then `create_test_case` and `link_requirements_to_test_case`.
- **Stop when:** every in-scope requirement has at least one linked case and the review verdict is Approve or Approve with fixes.

## R3 - Flaky-suite cleanup (stages 6, 7, 4)
- **Trigger:** "our regression is flaky, clean it up."
- **Skills:** `analyze-failures` (classify automation defects), `test-maintenance` (repair or regenerate), `test-review` (approve again).
- **Tools:** `find_test_results`, `read_test_result`, `analyze_test_case_stability`, `analyze_test_flakiness`, `update_test_case`, `move_test_case`, `rerun_execution`.
- **Stop when:** the flaky cases on the critical path are repaired or retired and the suite passes review again.
- **Boundary:** a stability gain inside the noise floor does not confirm a fix. For example, a gain under about 15 points on a suite of around 40 results proves nothing.

## R4 - Manual to automation (stages 2 to 5)
- **Trigger:** "turn these manual cases into automation and run them into the platform."
- **Skills:** `create-test-cases`, `test-case-to-playwright`, `playwright-execute`, `upload-report`.
- **Tools:** `read_test_case`, `find_test_cases`, then Playwright and `@katalon/playwright-reporter`, verified with `list_executions` and `read_execution`.
- **Stop when:** the Playwright run is uploaded and the platform run is verified.

## R5 - Cross-lane trust check (stages 5, 6)
- **Trigger:** "do not trust the AI pass, verify it against real automation."
- **Skills:** `execute-test` (Run with AI) and `playwright-execute` (code lane), then `analyze-failures`.
- **Tools:** `create_manual_ai_session`, `read_manual_ai_session`, a Playwright run with `@katalon/playwright-reporter`, then `read_test_result` on both.
- **Stop when:** every critical case's AI verdict is checked against the code lane and each disagreement is recorded.
- **Boundary:** an AI pass that the code lane contradicts is not a pass.

## R6 - Traceability audit (stage 3)
- **Trigger:** "show me requirement-to-test coverage."
- **Skills:** `test-management`.
- **Tools:** `find_requirements`, `find_test_cases_by_requirement`, `get_requirement_insights`, `find_test_cases`.
- **Stop when:** the requirement, case, and suite matrix, the orphan lists, and the coverage percentage are reported.

## R7 - Sessions to cases (stage 2)
- **Trigger:** "build cases from what real users did last week."
- **Skills:** `create-test-cases`, then `test-review`.
- **Tools:** `list_truetest_auts`, `search_truetest_sessions`, `get_truetest_session`, `create_truetest_test_case_from_session`.
- **Stop when:** the approved cases exist and the review verdict is issued.
- **Boundary:** generation needs the user's approval and takes 1 to 25 sessions. Mask personal data before you quote a session.

## Composition rule

Resolve the project and repository once at the start. Reuse that scope across the recipe. State the boundary before you promise a step. Ask only when a value cannot be resolved safely.
