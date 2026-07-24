# QA artifact writing reference

Adapted from lw-test-tower `QA_ARTIFACT_WRITING.md`. Write QA artifacts for a manual QA reader first, an agent second. Assume the reader may not be a native English speaker.

The reader should finish the artifact knowing: why we test this, what must be ready, what data to use, what steps to perform, what results to check, what evidence to collect, and what is assumed.

## Language style

- Use short sentences. Use sentence-case headings.
- Use familiar QA verbs: Open, Go to, Click, Enter, Select, Add, Remove, Save, Submit, Check, Confirm, Make sure.
- Put technical detail in a short notes section near the end, not in the main steps.

Prefer:
- Check that clicking Generate twice does not create duplicate test cases.
- Make sure the success message is shown.

Avoid in main steps:
- Validate generated artifact consistency.
- Exercise repeated invocation behavior.

## Manual test cases

Do not let cases read like raw recorder events. Convert low-level actions into clear user steps.

Prefer: `Add a todo item named "Write reference flow".` / `Switch to the Active filter.`
Avoid: `Enter New todo.` / `Press Enter.` / `Click Active.`

Use this TestOps-importable structure so an approved case publishes without rewriting:

1. Name (H1)
2. Description
3. Pre-condition
4. Test steps as a table: `Test Step` | `Expected Result` | `Test Data`

Keep each case atomic (one validation condition) but complete (precondition -> navigate -> surrounding valid data -> action under test -> verify). Quote expected UI/error strings verbatim, including source typos (flag them separately).

## Do not churn

Do not rewrite old sessions or artifacts only for style. Apply this to new artifacts, templates, and generators.
