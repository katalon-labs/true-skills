# REST bulk import and search traps

Read this before you script a bulk import or an inventory sweep through the platform REST API. Captured live on 2026-11-03 and 2026-11-04 on a repository of about 1,200 cases. Prefer the MCP tools when they can do the job. Everything below applies to the REST fallback only.

## Secrets

- The import task echoes the caller's access token in its `input` field. Never log, print, store, or paste an import task response. Mask the token before any copy.

## Search

- The test case search caps a page at 100 rows. Asking for 200 returns 100 with no error. A loop that stops when a page is "shorter than requested" stops after the first page. Request `size=100` and stop on an empty page.
- The search has no folder filter. A folder condition in the query returns HTTP 500. Match by name prefix or path instead.
- The suite list returns a bare JSON list, not a page object.
- Deleted cases stay in the search for hours after a delete. A direct read of the case returns not found, but the search still returns the row, with a null project. Filter the search by the repository (`testProjectId==<repository id>`) to list only live cases. Without the filter, an importer that skips "existing" names skips every name you just deleted.

## Import

- Every write marks the cloud repository as changed and starts a refresh. An import that runs during the refresh reports success while every row fails with `RepositoryNotReadyException`. Suite writes return HTTP 409 in the same window. Poll the repository until it is no longer marked changed before each import or suite write.
- Upload the CSV straight to the pre-signed URL from the client. The pre-signed URL needs no auth. A large CSV pushed through a browser bridge can break the bridge.
- A suite created right after an import gets no members, because the new cases are not searchable yet. Create or update the suite in a second pass, after the search returns the cases.

## Delete

- A batch delete of 100 cases returns HTTP 400. A batch of 20 mostly works. A batch that holds one already-deleted ID fails as a whole.
- Deleting is permanent. Get a yes that names the cases before you delete.

## Check the result

After an import, read the cases back through `find_test_cases` and compare the count with the file. A success status on the task does not prove the rows landed.
