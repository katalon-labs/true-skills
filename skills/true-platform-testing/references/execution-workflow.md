# Execution Workflow

## Manual Run And Optional AI Execution

Creating a manual run and executing it with AI are separate requests. Start AI only when the user explicitly requests AI execution. For creation-only requests, return the created run without starting or polling an AI session. For a generic "execute now" with no execution method selected, clarify the method before starting execution.

1. Resolve project and repository.
2. Search existing coverage first, then resolve existing test cases or create only missing cases.
3. Add cases to a manual test suite if grouping is needed.
4. Call `read_auts`.
5. Choose the matching AUT/environment automatically when one clearly matches the target AUT. If none exist and a URL is known, use it as `default_aut_environment_url` for AI execution.
6. Call `create_manual_test_run`.
7. If the request does not include AI execution, stop here and report the created run's link and current status.
8. If AI execution was requested, call `create_manual_ai_session` without asking for confirmation again.
9. For that AI session, poll with `read_manual_ai_session` until every test case leaves TODO/IN_TESTING.
10. Summarize the observed execution result in chat.

## Manual Run Rules

- Never call `create_manual_test_run` without a fresh `read_auts` first.
- Never reuse AUT environment choices from earlier turns.
- Start Run with AI only when the user explicitly requests AI execution; creating a run, selecting an AUT, or supplying test data does not imply this request.
- When AI execution is already requested, do not ask for confirmation again. Honor an explicit request not to use AI.
- If the manual run contains newly created test cases, they are manual by default.
- Render returned execution paths as markdown links.
- For a started AI session, wait for AI completion before final response. If the platform stays pending/running for an unusually long time, keep polling at practical intervals and only report in-progress status when the user asks or the platform returns a timeout/error.
- Ask for user input only when required data is missing, multiple AUTs are equally plausible, execution was requested but the method is unclear, or the next action is destructive. Do not ask to add AI to a creation-only request.

## Automated Run

1. Resolve repository.
2. Find automated test suites or suite collections.
3. Find execution profiles.
4. Select TestCloud environments.
5. Build run configuration.
6. Optionally build schedule.
7. Call `schedule_test_run`.
8. Read execution and results.

## Automated Run Rules

- Use `schedule_test_run` only for automated suites.
- Do not run manual test cases through automated scheduling.
- For mobile native, ensure app details are present.
- For mobile availability filters, clarify automation/manual vs live testing when needed.

## Result Reporting Template

```text
Run:
- Name:
- Link:
- Status:

Summary:
- Passed:
- Failed:
- Blocked/Incomplete:
- Not run:

Findings:
- ...

Next actions:
- ...
```
