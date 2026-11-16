# Datasets

Read this when one manual case must run on many rows of values. A dataset is a named table of rows and columns in a project. A manual case binds to one dataset. The platform runs the case once per row.

## What is available where

| Surface | Status |
|---|---|
| Web UI | Live in production since 2026-11-05. |
| Katalon AI chat (Kai) | Works on datasets. Some bound-case bugs were still open in mid November 2026. |
| MCP | Eight tools are announced and are not in every tool list yet. Use one only if your tool list shows it. Otherwise use the web UI. |

The eight names are `find_datasets`, `manage_dataset`, `read_test_case_data`, `manage_test_case_data`, `find_vault_params`, `manage_vault_params`, `find_run_iterations`, and `update_run_iteration`. These names are not in every tool list yet. When they appear, read each schema before the first call. Vault parameter values are never returned by any of them.

Datasets bind to manual cases only. An automated case keeps its data in the fixture (see `seed-and-teardown.md`).

## Create a dataset in the web UI

1. Open Tests, then Datasets in the project. The list shows name, description, rows, columns, and linked test cases. It has a search box.
2. Choose New dataset. Give it a name and an optional description. A name takes Unicode letters, digits, and underscores, up to 64 characters, with no leading digit.
3. Open the dataset. Add columns and rows by hand, or choose Import CSV.
4. Import CSV has three steps: upload, field mapping, preview. The preview offers merge or replace. Import saves at once.
5. Export CSV downloads the rows.

Import limits:

- 1000 rows and 50 columns at most.
- There is no partial column import. A file with more than 50 columns does not import its first 50. Cut the columns first.
- The upload does not reject a file that is not CSV. Check the file before you upload.
- The mapping step maps each CSV column to a dataset column name. Check the names there before you import.

## Bind a case to a dataset

1. Write the step text with `<<column_name>>` placeholders where a value goes. Put them in the step, the test data, or the expected result.
2. Open the case, then the DATA tab. The Variables table lists each placeholder with where it resolves from. An unlinked placeholder reads Unresolved.
3. Choose the dataset in the Select a dataset field and choose Link. The tab then shows the iteration count and the rows. Unlink removes the binding.
4. A placeholder that matches no dataset column and no vault parameter shows a warning on the DATA tab.

Rules and gotchas:

- Secrets stay in vault parameters (Secrets & Variables), not in dataset columns. A placeholder that names a vault parameter resolves at run time and its value is never returned. Without a linked dataset it shows as a raw chip on the DATA tab.
- Dataset values display as plain text. A value such as `<b>x</b>` shows literally.
- Link on a case that other cases call showed only a warning and did not link when captured on 2026-11-06. Check the DATA tab after you link.
- An unresolved placeholder fails its row with `Parameter not found: <name>`. The DATA tab and the Run with AI dialog show no warning for it. The dataset page does. Check the placeholders before you run.

## Runs on a bound case

- Run with AI starts one AI session per data row. The AI SESSIONS tab shows the rows. The single-case Run with AI dialog does not show the row count, so state the row count to the user before you ask for consent. Each row uses Test Execution - Cloud minutes.
- A manual run in the run player steps through the rows. Each row takes its own verdict. A row with no verdict becomes Skipped when the run ends.
- The run Tests tab has Iterations and Dataset columns. The end-of-run summary counts cases, not rows. Re-run options work at case level.
- A 403 or "access denied" on a data call is not proof of a permission problem. It can mean that a requested value or environment is unavailable. Check the values first.

## Design rules for the data

- One dataset row is one data class from the design step in `SKILL.md`. Name the class in a column such as `scenario`.
- Put the expected value in a column too (`expected_each`). The step compares against `<<expected_each>>`, so the oracle travels with the row.
- Keep a dataset small enough to read. A row that nobody can explain is a row nobody can debug.
- Never put a real person's data in a dataset. Mask or synthesize it.
