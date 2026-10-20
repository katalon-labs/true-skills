# Katalon CLI and report upload

Read this before you write a command to run tests, upload a report, or confirm an upload. Captured 2026-10-20 from the Katalon docs listed at the end.

## Katalon Studio reports

- Katalon Test Execution - Local (formerly KRE) uploads results by itself when the API key, organization ID, and Platform project ID are set.
- The arguments are `-apiKey`, `-orgID`, `-testOpsProjectId`, and `-report.folderPath`.
- `-report.folderPath` is the current flag from Katalon Studio 11.1.2. `-reportFolder` is deprecated from that version and can lose folder names for suites and collections.
- Keep the report folder fixed so you can find the output after the run.
- Confirm the import with the steps in `references/verify-upload.md`.

## JUnit reports

Use Report Uploader for existing JUnit XML, or for a folder that holds it.

| Parameter | Meaning |
|---|---|
| `projectId` | Platform project ID. |
| `path` | Local report file or folder. |
| `password` | An API key. Never a plain account password. |
| `type` | `katalon`, `junit`, or `katalon_recorder`. |
| `server` | Optional. Omit it to use the uploader's built-in default. Set it only for another environment. The default host is unverified here and differs from the MCP host `platform.katalon.io`, so read the uploader's `--help` or README for your version before you set or assume one. |
| `email` | Not needed when `password` is an API key. |

Use `katalon` and `junit`. Use `katalon_recorder` only when the user asks for it.

```text
java -jar katalon-report-uploader-<resolved_version>.jar \
  --projectId="<project_id>" \
  --path="<report_path>" \
  --password="$KATALON_API_KEY" \
  --type=junit
```

Add `--server="<platform_url>"` only for a non-default environment.

## Resolve the Report Uploader jar

The file name contains the version. Do not invent one. The docs page shows `0.0.8` only as an example.

1. Look in the working directory and in the repo's tooling folders for an existing `katalon-report-uploader-*.jar`. If one exists, tell the user its path and version, and use it.
2. If none exists, the source is the GitHub releases page of `katalon-studio/report-uploader` (https://github.com/katalon-studio/report-uploader/releases).
3. Read the latest release tag and the asset name. If the `gh` CLI exists, `gh release list --repo katalon-studio/report-uploader` shows them. Otherwise read the releases page.
4. Downloading a program file needs the user's yes. Ask once. Name the file, the source URL, and the size when the release shows it.
5. Save the jar in a folder that belongs to this run. If the release publishes a checksum, compare it.
6. Check that `java -version` works. The docs ask for a Java JRE and JDK.
7. Say the resolved version in your answer.

Never pipe a download into a shell. Never run a jar from any source other than that releases page.

## Playwright reports

Use `@katalon/playwright-reporter` when you can edit the Playwright config. Use the JUnit uploader only when JUnit is all the user has.

- Package: `@katalon/playwright-reporter`. Registry check 2026-10-20: latest version 0.0.3, peer dependency `@playwright/test` `^1.0.0`.
- Environment variables: `KATALON_API_KEY`, `KATALON_PROJECT_ID`, optional `KATALON_BASE_URL`, optional `KATALON_AUTH_URL`.
- Upload during the run, or later with `playwright-reporter upload --output <dir> --api-key <key> --project-id <id>`.

Playwright 1.59 changed the `junit` reporter. It writes an `error` element for some failures that used to be a `failure` element. A JUnit upload can then classify those tests differently. Compare failed plus errored counts between the local file and the platform. See `references/verify-upload.md`.

## Secret handling

- Never print API keys, passwords, cookies, or auth callback URLs.
- Use an existing environment variable or a secret store.
- Hide secret values in any output you quote.
- Never write a secret into a skill file, repo file, report, or log.

## Sources

- Katalon Runtime Engine command-line syntax: https://docs.katalon.com/katalon-studio/execute-tests/katalon-runtime-engine/command-line-syntax-in-katalon-runtime-engine
- Upload Studio results manually: https://docs.katalon.com/katalon-studio/test-reports/upload-test-results-from-katalon-studio-to-katalon-testops-manually
- View test reports in Katalon True Platform: https://docs.katalon.com/katalon-platform/analyze/view-test-results
- Report Uploader: https://docs.katalon.com/katalon-platform/integrations/ci-cd/report-uploader-integration
- Playwright integration: https://docs.katalon.com/katalon-platform/integrations/testing-framework/playwright-integration
