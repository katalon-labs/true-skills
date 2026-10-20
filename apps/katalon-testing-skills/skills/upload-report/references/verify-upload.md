# Verify an upload

Read this after any upload. The upload command can print success while the platform holds no results. Check the platform itself. Source: Katalon docs "Katalon True Platform MCP Server" (October 2026). Parameters are mostly undocumented on that page, so check each tool schema.

## Local counts first

Before you upload, record from the local report files:

- Total, passed, failed, errored, skipped.
- The names of a few tests, including one failure if any.
- The time just before you started the upload.

For JUnit, read `tests`, `failures`, `errors`, and `skipped` on each test suite element. For Playwright, read the reporter output or the JSON report. For a Studio report, read the folder's execution summary.

## Find the execution

1. Call `list_executions` with a window that starts just before the upload. Narrow by `status` if needed. It returns numeric TestOps execution IDs.
2. Match by project, upload time, and test names. If several match, show them to the user and ask.
3. If nothing appears, the platform may still be importing. Wait and call again at practical intervals. After a few minutes, report the state as importing.

Do not use `list_execution_outputs` here. It uses TestCloud string IDs, which uploaded reports do not have.

## Read and compare

1. Call `read_execution` with the numeric `execution_id`.
2. Call `read_execution_test_results` for the same ID.
3. Compare the platform counts with the local counts.

| Result | Status to report |
|---|---|
| Counts match, names match | verified uploaded |
| Execution found, still importing | importing |
| Zero results, or counts differ | unverified (say which numbers differ) |
| No execution after a few minutes | failed or not verifiable |

For JUnit, compare failed plus errored together. A test can sit under a different failure class on the platform than in the XML.

## Link

Use the link the upload tool returned. If none came back, take the link from the read tools. Their `resource_url` host can fail for `.katalon.io` tenants. If so, build the link from the tenant host the user uses, and say it is a built link.

## When verification is blocked

If the MCP is not connected, say so. Report the CLI result and the local counts. Do not call the upload verified.
