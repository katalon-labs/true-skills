---
name: upload-report
description: Uploads finished Katalon Studio, JUnit XML, or Playwright reports to Katalon True Platform (formerly TestOps) and verifies that the run landed with matching counts. Use when a report folder or XML file already sits on disk, an auto-upload failed, or Katalon Test Execution - Local (formerly KRE) must run first. Not for a Playwright suite that has not run (playwright-execute) or Run with AI (execute-test). For the automation tester.
license: MIT
compatibility: Requires the Katalon True Platform MCP server and network access. Uploads also need Java (Report Uploader), the Katalon CLI (Studio reports), or Node.js 18 or later (Playwright reporter), by report type.
metadata:
  version: "0.5.0"
  mcp-contract: "katalon-docs-2026-10"
---

# Katalon Upload Report

This skill gets a local test report into Katalon True Platform and proves it arrived. The MCP discovers projects and reads the result. A local tool does the upload: the Katalon CLI, Report Uploader, or the Playwright reporter.

MCP clients can add a prefix to tool names (Claude Code uses `mcp__<server>__<tool>`). This skill uses bare names.

## Boundary

- The MCP can list projects and repositories, list and read executions, and read results with `find_test_results`. It cannot upload a report file.
- It cannot inspect the live AUT UI, create requirements, or run Katalon CLI for you.
- Katalon Test Execution - Local (formerly KRE) runs Studio suites. With an API key, organization ID, and project ID set, it uploads results by itself.
- Report Uploader sends Studio and JUnit reports. Its `type` values are `katalon`, `junit`, and `katalon_recorder`.
- `@katalon/playwright-reporter` uploads Playwright data during `npx playwright test`, or later with `playwright-reporter upload`.

Read `references/capability-boundaries.md` when tool availability is unclear. Read `references/cli-report-upload.md` before you write any command. Read `references/write-policy.md` before an install, a download, or an upload.

## Inputs

Resolve each value from the repo or the environment first. Ask only for what is still missing.

- Report type: `katalon`, `junit`, or `playwright`.
- Mode: run now, upload an existing report, or verify a report that should already be there.
- Report path: Studio report folder, JUnit file or folder, or Playwright reporter output directory.
- Test target, only when you run tests.
- Katalon API key, from an environment variable or secret store.
- Platform project ID. Organization ID for Studio runs. A server URL only for a non-default environment.

Never ask the user to paste a secret into chat.

## Platform context

1. Call `list_projects`.
2. Call `list_repositories`.
3. Match the project to the project ID in use.

If the MCP is not connected, continue only when every CLI input is present. Say that platform verification is not possible in this session.

## Choose the flow

1. The repo has `@playwright/test`, or the user says Playwright: Playwright flow.
2. The user has JUnit XML, or says JUnit: JUnit flow.
3. The user has a Studio report folder or a `.prj` target: Katalon flow.
4. If unclear, look for `.prj`, `playwright.config.*`, or XML files before you ask.

Do not turn Playwright output into JUnit unless JUnit is all the user has. JUnit loses some Playwright attachments and metadata.

## Preflight

1. Check the tool exists: Katalon CLI, Java, or Node and the package manager.
2. Check the source paths exist.
3. Use a report folder that belongs to this run. Do not delete `Reports/`, `test-results/`, or `playwright-report/`.
4. Show every command with secrets hidden.

## Katalon flow

Studio runs from the command line need Katalon Test Execution - Local (formerly KRE), a separately licensed runtime. Command shape:

```text
katalonc -noSplash -runMode=console \
  -projectPath="<project.prj>" \
  -testSuitePath="Test Suites/<suite>" \
  -executionProfile="<profile>" \
  -browserType="<browser>" \
  -apiKey="$KATALON_API_KEY" \
  -orgID="<org_id>" \
  -testOpsProjectId="<project_id>" \
  --config \
  -webui.autoUpdateDrivers=true \
  -report.folderPath="<run_report_folder>"
```

`-report.folderPath` is the current flag from Katalon Studio 11.1.2. `-reportFolder` is deprecated from that version. Use `-report.folderPath` unless the project is pinned below 11.1.2, and say which one you used.

For an existing report folder where auto-upload did not run, use Report Uploader with `--type=katalon`. See `references/cli-report-upload.md`.

## JUnit flow

1. Check the files are JUnit XML, not Playwright HTML or traces.
2. Resolve the Report Uploader jar. Do not guess a version. Follow "Resolve the Report Uploader jar" in `references/cli-report-upload.md`.
3. Run the uploader with `--type=junit`. Use the API key as the password value.
4. Verify the run (see below).

## Playwright flow

1. Check Node, `@playwright/test`, and the Playwright config.
2. Check `@katalon/playwright-reporter` is installed. Install it only when the user allows dependency changes.
3. Use a fixed `outputDir`, usually `./reports`.
4. Upload during the run (`KATALON_API_KEY` and `KATALON_PROJECT_ID` set), or later with `playwright-reporter upload`.
5. Keep screenshots, videos, and traces as attachments.
6. Verify the run.

If the Playwright run has not happened yet, use `playwright-execute`.

## Run and collect

1. Run the command.
2. Keep stdout and stderr. Hide secrets before you quote them.
3. Find the report folder. Note logs, XML, HTML, screenshots, videos, and traces.
4. Record local counts from the report files: total, passed, failed, errors, skipped.

If the run fails before any report exists, report that and skip verification.

## Verify the upload

Read `references/verify-upload.md`. In short:

1. Wait for import, then find the new execution with `list_executions`.
2. Read it with `read_execution` and `find_test_results` (`filter_type: "EXECUTION"`).
3. Compare the platform counts with the local counts.

A count of zero, or a count that differs from the local report, is unverified. This holds even when the CLI printed success.

If upload failed and local files exist, state the manual upload path. Do not say the upload worked.

## Report back

- Report type, command status (secrets hidden), and local report folder.
- Upload status: verified, importing, failed, or not verifiable.
- Platform run link, when returned.
- Counts for passed, failed, skipped, blocked, and errors, local and platform side by side.
- Failed tests with a short reason.
- Artifacts made.
- Follow-up: missing key, import failure, manual upload.

Local automation finishing is not completion. The task ends with a verified upload or a clear reason it could not be verified.

For failures, hand off to `analyze-failures`.
