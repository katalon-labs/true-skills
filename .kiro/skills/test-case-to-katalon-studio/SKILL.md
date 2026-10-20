---
name: test-case-to-katalon-studio
description: Converts Katalon True Platform manual test cases into Katalon Studio automation in a local Studio Test Project, covering the .tc file, its Groovy script, Object Repository test objects, and data-driven suite bindings. Use when a manual case must become a Studio case, or when the question is whether a headless katalonc run is possible. Not for uploading a finished report (upload-report) or Playwright code (test-case-to-playwright). For the automation tester.
license: MIT
compatibility: Requires the Katalon True Platform MCP server, network access, and a local Katalon Studio Test Project checkout. Running from the command line also needs a Katalon Test Execution - Local licence and a Java runtime.
metadata:
  version: "0.5.0"
  mcp-contract: "katalon-docs-2026-10"
---

# Katalon Test Case To Katalon Studio

This skill turns Katalon True Platform (formerly TestOps) manual test cases into Katalon Studio automation. The output is `.tc` metadata, the paired Groovy script, Object Repository test objects, and the test suite that binds data to them. Follow the conventions the target project already uses. Ask short questions in chat when a project path, credential, selector, or data value cannot be found safely. MCP clients may add a prefix to tool names (Claude Code uses `mcp__<server>__<tool>`). This skill uses the bare names.

## Availability Boundary

State the boundary before you promise automation. It has three parts.

**Available through Katalon MCP**

- Resolve context with `list_projects` and `list_repositories`.
- Read the source case with `find_test_cases` and `read_test_cases` (`content_type` `FLOW` for the steps). Resolve a requirement key with `find_requirements`, `read_requirement`, and `find_test_cases_by_requirement`.
- Read platform-side suites with `find_test_suites` and `read_test_suite`.
- Write the generated Studio path onto the platform case with `update_test_cases`, for traceability. Use the `UPDATE_DESCRIPTION` action with the existing description kept and the path appended. Add `UPDATE_AUTOMATION_STATUS` only when the user asks and the Studio case is complete. Batch both actions in one call. This is a write. Show the proposed change, get one confirmation, run it, then read the case back with `read_test_cases`.

**Not available through Katalon MCP**

- No MCP tool reads or writes a Studio project file. `.prj`, `.tc`, `.rs`, `.ts`, `.glbl`, `.dat`, and everything under `Scripts/` exist on disk only. Work on a local checkout and ask for the path.
- No MCP tool captures web objects. Web Spy and Record are Studio desktop features. Write `.rs` files by hand.
- No MCP tool inspects the live application. Explore it with a browser tool to find selectors, then encode them as test objects.
- No MCP tool runs a Studio suite. `katalonc` is a local command.
- No MCP tool uploads a Studio report. That is `upload-report`.
- No MCP tool parses or validates a generated `.tc`, `.ts`, or `.rs`. Studio is the only parser. This skill checks XML well-formedness and GUID consistency, and it names what stays unverified.
- `create_test_case` with `test_case_type` `AUTOMATED` creates nothing and returns the next action for script generation. Do not use it to register the Studio case.

**Command-line execution needs a separate licence**

Katalon Studio's desktop IDE authors and runs a case interactively. Running the same suite from a terminal or a pipeline needs Katalon Test Execution - Local (formerly Katalon Runtime Engine, KRE), which is licensed separately. `katalonc -runMode=console` lists `-apiKey` among its required arguments and does not run without an activated licence. A floating licence allows one active session at a time.

So everything this skill generates works for a reader on the free Studio tier, but none of it runs headless for that reader. Say this before you promise a CI story. Never imply the generated files are pipeline-ready without the licence.

The report flag depends on the Studio version. `-report.folderPath` is available from Katalon Studio 11.1.2 and is the current flag. `-reportFolder` is deprecated from 11.1.2, still accepted, and can produce reports with missing test-suite-collection and test-suite folder names. Use `-report.folderPath` unless the project is pinned below 11.1.2, and say which one you chose.

## Workflow

```text
+-------------------+ --> +-------------------+ --> +---------------------+
| Resolve Katalon   |     | Read test cases   |     | Resolve project     |
+-------------------+     +-------------------+     +---------------------+
                                                           |
                                                           v
+-------------------+ <-- +-------------------+ <-- +---------------------+
| Verify pairings   |     | Write .tc + .rs   |     | Map manual steps    |
|                   |     | + script + suite  |     | to keywords         |
+-------------------+     +-------------------+     +---------------------+
```

## Katalon Source

Resolve the Katalon context before you write files.

- Call `list_projects` and `list_repositories`, then `find_test_suites`, `find_test_cases`, and one `read_test_cases` call with `content_type` `FLOW` for the selected cases. `find_test_cases` needs `repository_id` and a `filter` with `filter_type` `COMMON`, `RELATIVE`, or `ITERATION`. Pages start at 0: copy `next_page_token` into `page_number`. `search` with `types: ["test_case"]` and `include_documents: false` finds cases by meaning.
- For a suite, call `read_test_suite` and read every included case before you generate anything.
- For requirement keys, find the linked cases first with `find_test_cases_by_requirement`.
- If MCP is unavailable or authentication fails, ask for exported cases, case URLs, case keys, or the case text.
- Keep traceability in both directions. Put the platform case key in the `.tc` `<description>` and `<tag>`. Write the generated `Test Cases/...` path back with `update_test_cases` (`UPDATE_DESCRIPTION`). Keep the case name within the characters the platform accepts (a letter or digit first, then letters, digits, spaces, and `( ) . , _ -`), and read the case back to confirm.

Extract for each case: title, priority, requirement links, folder, preconditions, test data, manual steps, expected results, AUT URL, roles and accounts, environment, browser or device assumptions, and cleanup. Flag selectors and business data that need human input.

## Project Resolution

Inspect the workspace before you create anything.

- Look for a `*.prj` at a directory root, with the sibling folders `Test Cases/`, `Scripts/`, `Object Repository/`, `Test Suites/`, `Keywords/`, `Profiles/`, `Data Files/`, `Include/`, `Libs/`, and `settings/`. A `.prj` with those siblings is a Studio Test Project.
- If a project exists, summarize the path, its folder conventions, its existing test objects, and the files you plan to add. Ask the user to confirm before you write.
- If several projects exist, ask which one.
- If none exists, ask for a repository or path. Creating a Studio project outside the IDE is brittle. Prefer an existing project, or one the user creates once in Studio.
- Never write into `Libs/`. Studio generates `Libs/internal/GlobalVariable.groovy` from `Profiles/*.glbl` and marks it do-not-modify. Edit the `.glbl` instead.
- `Reports/` is build output. Do not commit it.

Read `references/studio-project-anatomy.md` before you write any file. Read `references/groovy-authoring.md` before you write script or custom keyword code.

## The Three Pairings

A Studio test case is two files, and a data-driven suite adds a third link. All three break silently. Nothing raises an error, and the run continues on defaults.

**1. `.tc` to its script, paired by folder path.**

```text
Test Cases/Authentication/TC-1042 Login.tc
Scripts/Authentication/TC-1042 Login/Script1754870400000.groovy
```

`Scripts/` mirrors the `Test Cases/` relative path, then adds a folder named exactly after the case. That folder holds exactly one `Script*.groovy`. The number is an epoch-millisecond stamp and nothing references it. If you rename or move the `.tc` without moving the folder, Studio shows a case with no steps.

**2. `.ts` to the `.tc`, paired by project-relative path.** The suite's `<testCaseId>` is the path with no extension, for example `Test Cases/Authentication/TC-1042 Login`.

**3. `.ts` variable bindings to `.tc` variables, paired by GUID.** Each `<variable>` in the `.tc` has an `<id>`. Each `<variableLink>` in the suite has a `<variableId>` that must equal it. It also has a `<testDataLinkId>` that must equal the `<testDataLink><id>` in the same file.

When a `variableId` does not match, nothing errors. The variable keeps its `<defaultValue>` and every iteration runs on that default. With a strict assertion, this shows up as a late timeout that looks like an application bug. With a tolerant assertion, the suite goes green over meaningless data. Cross-check the GUIDs after every write, using the check in Verification.

## Object Repository

Studio has no page-object classes. `Object Repository/` is the equivalent layer, and the same discipline applies.

- Use one `.rs` file per element, named for what it is (`input_Username`, `button_SignIn`), grouped in one folder per page.
- A new Object Repository folder needs a `.meta` entry with `<folderType>WEBELEMENT</folderType>`. A new Test Cases folder needs one with `<folderType>TESTCASE</folderType>`. See `references/studio-project-anatomy.md`.
- Reference objects from a script only as `findTestObject('Login Page/input_Username')`. Never write a raw XPath or CSS string in a script step.
- Reuse an existing test object when one matches. Search `Object Repository/**/*.rs` and read `<name>` plus the selected `webElementProperties` before you create a duplicate.
- Prefer stable properties: `id`, `name`, `aria-label`, visible text. Set `<isSelected>true</isSelected>` only on the properties you want matched. Use XPath only when the application offers nothing better, and say so.
- Test objects hold locators. They do not hold assertions.
- Do not change `<isSelected>` on an existing object to make a run pass. Studio self-healing also edits those flags, and a person approves its changes in Studio.

## Authoring Rules

- Translate one manual step into one keyword call, in step order, so a manual tester can still read the script.
- Use `WebUI` for web, `Mobile` for mobile, `WS` for API. Use the import alias the project already uses.
- Turn each expected result into a `WebUI.verify*` call next to the action that produces it.
- Use test case variables for anything the manual case parameterizes, with a safe `<defaultValue>`. Use `GlobalVariable` for environment values that come from a profile.
- Use `setEncryptedText` only when the source value is Katalon-encrypted. Use `setText` otherwise. Mark a credential variable `<masked>true</masked>`.
- Put shared logic in `Keywords/` as a Groovy class with `@Keyword` methods, and call it through `CustomKeywords`. See `references/groovy-authoring.md`.
- Keep one Studio case aligned to one platform case unless the project groups scenarios differently.
- Do not invent credentials, URLs, record IDs, account state, or selectors. Ask, or leave one narrow TODO that names the missing value.

## Worked Example

Input, read with `read_test_cases` (`content_type` `FLOW`):

```text
Key:         TC-1042
Name:        Login with valid credentials
Folder:      Authentication
Requirement: CEL-6
Test data:   username, password
Steps:       1 Open the login page  2 Enter <username>  3 Enter <password>  4 Click Sign in
Expected:    The dashboard header "System dashboard" is visible
```

Output: a `.tc` with two variables, the paired script, three test objects, a data file, and a suite. `references/studio-project-anatomy.md` holds the full XML for every file. The script is:

```groovy
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import internal.GlobalVariable as GlobalVariable

WebUI.openBrowser(GlobalVariable.URL + '/login')

WebUI.waitForElementVisible(findTestObject('Login Page/input_Username'), 30)

WebUI.setText(findTestObject('Login Page/input_Username'), username)

WebUI.setText(findTestObject('Login Page/input_Password'), password)

WebUI.click(findTestObject('Login Page/button_SignIn'))

WebUI.waitForElementVisible(findTestObject('Dashboard Page/header_Dashboard'), 30)

WebUI.verifyTextPresent('System dashboard', false)

WebUI.closeBrowser()
```

`username` and `password` are unqualified. Studio injects test case variables into the script binding by name, and the GUID never appears in Groovy. The password step uses `setText` because the data file holds literal values. `<masked>true</masked>` on the variable is a separate choice.

The failure this example shows: change one character of the first `<variableId>` in the suite to `...d21f`. There is no XML error, no Studio dialog, and no CLI warning. `username` is unbound, keeps `''`, and every data row logs in with an empty username. Here it surfaces as a `waitForElementVisible` timeout on the dashboard header, which reads like an application bug.

## Review Of Generated Files

A model drafted these files, so check them before you call them done.

- Compare every expected result with the requirement text and the case. Do not trust a value the model supplied.
- Keep customer data and real credentials out of data files and committed files.
- Record that the case is AI-drafted, in the `.tc` `<description>` or a tag, so a reviewer reads it closely.
- Judge the case by whether it fails when the behavior breaks. A well-formed file is not evidence of a working test.

## Verification

Studio is the only parser for these files. Verify what you can, and name what you cannot.

1. XML well-formedness on every file written: `xmllint --noout <file>`, or any equivalent parser.
2. Path pairing. For each generated `.tc`, confirm that `Scripts/<same relative path>/<case name>/` exists and holds exactly one `Script*.groovy`.
3. Suite-to-case pairing. Each `<testCaseId>` in the suite must resolve to an existing `.tc` at that path plus `.tc`.
4. Variable GUID cross-check. Every `<variableId>` in the suite must appear as a `<variable><id>` in the linked case. In bash:

   ```bash
   comm -23 \
     <(grep -ho '<variableId>[^<]*' "Test Suites/Regression/Login Regression.ts" | sed 's/<variableId>//' | sort -u) \
     <(grep -ho '<id>[^<]*' "Test Cases/Authentication/TC-1042 Login with valid credentials.tc" | sed 's/<id>//' | sort -u)
   ```

   Empty output means the bindings hold. Each printed line is a variable that will run on its default.
5. Object references. Every `findTestObject('<path>')` in a script must resolve to an existing `.rs` under `Object Repository/`.
6. Report what stays unverified: Groovy compilation, keyword arity, selector correctness against the live application, and whether Studio opens the project.

If the user has a Katalon Test Execution - Local licence and asks for a run, print the command and hand off:

```text
katalonc -noSplash -runMode=console \
  -projectPath="<project.prj>" \
  -testSuitePath="Test Suites/<suite>" \
  -executionProfile="<profile>" \
  -browserType="<browser>" \
  -apiKey="$KATALON_API_KEY" \
  -report.folderPath="<run_report_folder>"
```

Never ask the user to paste an API key into chat. Read it from a secure variable.

## Report Back

Report the created and updated files with full paths, the platform cases they map to, every test object created or reused, the GUID cross-check result, what stays unverified, and any value still needed from a human. If the user has no licence for command-line runs, say that the generated suite runs from the Studio IDE and not from a terminal or a pipeline.

## Prompt recipes

- `Turn TC-1042 into a Katalon Studio test case in ~/work/shop-tests.`
- `Convert every case linked to requirement CEL-6 into Studio cases and one data-driven suite.`
- `Add username and password variables to this Studio case and bind them to Data Files/valid-accounts.`
- `Check that my Login Regression suite's variable bindings actually resolve.`

## Hand-offs

- A Studio run has finished and a report exists: `upload-report`.
- The target framework is Playwright: `test-case-to-playwright`.
- The manual case does not exist yet: `create-test-cases`.
- The generated suite fails intermittently: `test-maintenance`. For one red run, use `analyze-failures`.
- The user asks what Katalon can do through MCP in general: `true-platform-testing`.

Read `references/studio-project-anatomy.md` for folder rules, file formats, and the do-not-touch list. Read `references/groovy-authoring.md` for keywords, custom keywords, profiles, and data files.
