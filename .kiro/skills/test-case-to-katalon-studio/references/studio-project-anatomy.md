# Studio Project Anatomy

Read this before you write any file in a Katalon Studio Test Project. It lists each folder, the file formats, the three silent pairings, and the files you must not touch.

Sources: the Katalon sample projects `katalon-studio-samples/data-driven-tests`, `test-project-sample`, and `katalon-web-automation`, and the Katalon Studio docs on test cases, test suites, test objects, global variables, and test data (docs.katalon.com/katalon-studio). Nothing here was run in Studio during this build. The first check on any generated project is to open it in Studio once. Items marked "verify" come from sample files or memory and need that check.

## Project folders

```text
<ProjectName>/
  <ProjectName>.prj        project metadata XML (project GUID, settings)
  Test Cases/              *.tc (XML) and *.meta folder entries
  Scripts/                 one folder per test case, holding Script<epochMillis>.groovy
  Object Repository/       *.rs test objects (XML), *.meta folder entries
  Test Suites/             *.ts suites, *.tsc suite collections, optional <suite>.groovy fixtures
  Test Listeners/          *.groovy hook classes
  Keywords/                *.groovy custom keyword classes, in package folders
  Profiles/                *.glbl execution profiles (global variables)
  Data Files/              *.dat entries for CSV, Excel, internal, and database data
  Checkpoints/             *.ckp snapshots (verify the extension)
  Include/scripts/groovy/  shared Groovy classes
  Drivers/                 external JARs and browser drivers
  Libs/                    generated and library code (do not write here)
  settings/                project and integration settings (do not write here)
  Reports/                 run output (never commit)
```

## Do not touch

| Path | Reason |
|---|---|
| `Libs/internal/GlobalVariable.groovy` | Studio generates it from `Profiles/*.glbl` and marks it do-not-modify. Edit the `.glbl`. |
| `Libs/TempTestCase*.groovy` | Studio creates these when it runs a case. |
| `Reports/` | Run output. Sample projects git-ignore it. |
| `settings/internal/*.properties` | These can hold integration settings, including the True Platform connection. Do not read values into chat. Do not commit changes. |
| `bin/`, `.classpath`, `.settings/` | IDE build output. |

The sample projects ship a `.gitignore` that excludes `Reports/`, `bin/`, and IDE files. Keep that, and check a new project has one.

## The three pairings

All three break silently.

1. `.tc` to script, by folder path. `Scripts/<relative path of the .tc>/<case name>/Script<epochMillis>.groovy`. One `.groovy` per folder. The stamp is unreferenced. Moving or renaming a `.tc` without moving its Scripts folder leaves a case with no steps. If a hand-written filename is ever rejected, create the case once in Studio and edit the file it generates.
2. `.ts` to `.tc`, by project-relative path in `<testCaseId>`, with no extension.
3. `.ts` `<variableLink><variableId>` to `.tc` `<variable><id>`, by GUID. A mismatch leaves the variable on its `<defaultValue>`. Also, `<variableLink><testDataLinkId>` must equal `<testDataLink><id>` in the same suite file.

## Test case: `.tc`

Path: `Test Cases/Authentication/TC-1042 Login with valid credentials.tc`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<TestCaseEntity>
   <description>Generated from Katalon Platform test case TC-1042. Requirement CEL-6.</description>
   <name>TC-1042 Login with valid credentials</name>
   <tag>TC-1042</tag>
   <comment></comment>
   <testCaseGuid>3f8b1c02-6d41-4a97-b0e5-9c2a7d15e830</testCaseGuid>
   <variable>
      <defaultValue>''</defaultValue>
      <description>Login username, bound from the suite data file</description>
      <id>a41d55e6-2b78-4c10-9f33-6e0b8c74d219</id>
      <masked>false</masked>
      <name>username</name>
   </variable>
   <variable>
      <defaultValue>''</defaultValue>
      <description>Login password, bound from the suite data file</description>
      <id>c07e93a4-1f65-48db-8a52-77b1e9f0d3cc</id>
      <masked>true</masked>
      <name>password</name>
   </variable>
</TestCaseEntity>
```

- The `.tc` does not hold the steps. The steps live in the Groovy script.
- `<testCaseGuid>` is the identity of the case. The script never uses it.
- `<defaultValue>` is a Groovy expression, so a string default is quoted: `'x'`, and an empty string is `''`.
- Generate new GUIDs for each case and each variable. Do not reuse GUIDs across files, except where a pairing requires equality.
- The exact runtime effect of `<masked>` is not verified (log masking versus value decryption). Pair it with `setEncryptedText` only when the source data is Katalon-encrypted.

## Script

Path: `Scripts/Authentication/TC-1042 Login with valid credentials/Script1754870400000.groovy`. See `SKILL.md` for the body of this script and `groovy-authoring.md` for the keyword rules.

## Folder entries: `.meta`

A new folder under `Test Cases/` or `Object Repository/` needs a `.meta` entry, or Studio may not show the folder. Katalon sample projects place a `<FolderName>.meta` file beside the folder (verify the placement by creating one folder in Studio and looking at the result).

```xml
<?xml version="1.0" encoding="UTF-8"?>
<FolderEntity>
   <description></description>
   <name>Login Page</name>
   <tag></tag>
   <folderType>WEBELEMENT</folderType>
</FolderEntity>
```

Use `<folderType>TESTCASE</folderType>` under `Test Cases/`, and `WEBELEMENT` under `Object Repository/`. Verify the values for `Test Suites/`, `Data Files/`, and `Keywords/` in a project before you rely on them.

## Test object: `.rs`

Path: `Object Repository/Login Page/input_Username.rs`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<WebElementEntity>
   <description></description>
   <name>input_Username</name>
   <tag></tag>
   <elementGuidId>b8d0f472-5e19-4c86-a1d7-2f9c63b04e55</elementGuidId>
   <selectorCollection>
      <entry>
         <key>BASIC</key>
         <value></value>
      </entry>
   </selectorCollection>
   <selectorMethod>BASIC</selectorMethod>
   <useRalativeImagePath>false</useRalativeImagePath>
   <webElementProperties>
      <isSelected>false</isSelected>
      <matchCondition>equals</matchCondition>
      <name>tag</name>
      <type>Main</type>
      <value>input</value>
   </webElementProperties>
   <webElementProperties>
      <isSelected>true</isSelected>
      <matchCondition>equals</matchCondition>
      <name>id</name>
      <type>Main</type>
      <value>username</value>
   </webElementProperties>
</WebElementEntity>
```

- `useRalativeImagePath` is spelled that way in the schema. Do not fix it.
- Each `<webElementProperties>` is one captured attribute. `<isSelected>true</isSelected>` puts it in the active locator. Unselected properties stay as fallbacks. Studio self-healing tries stored locators in priority order and a person approves any change in Studio.
- For an XPath locator, add a property named `xpath` with `<isSelected>true</isSelected>`, and set `<selectorMethod>XPATH</selectorMethod>` (verify against a sample object that uses XPath).
- Web service objects also use the `.rs` extension with a different schema. Do not mix them.

## Test suite: `.ts`

Path: `Test Suites/Regression/Login Regression.ts`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<TestSuiteEntity>
   <description></description>
   <name>Login Regression</name>
   <tag></tag>
   <isRerun>false</isRerun>
   <mailRecipient></mailRecipient>
   <numberOfRerun>0</numberOfRerun>
   <pageLoadTimeout>30</pageLoadTimeout>
   <pageLoadTimeoutDefault>true</pageLoadTimeoutDefault>
   <rerunFailedTestCasesOnly>false</rerunFailedTestCasesOnly>
   <testSuiteGuid>91a3c6f8-4d27-4b0e-9c85-3ad2f7e61b40</testSuiteGuid>
   <testCaseLink>
      <guid>5c2e8b31-9a04-4f7d-b6e2-18d95c0a7f63</guid>
      <isReuseDriver>false</isReuseDriver>
      <isRun>true</isRun>
      <testCaseId>Test Cases/Authentication/TC-1042 Login with valid credentials</testCaseId>
      <testDataLink>
         <combinationType>ONE</combinationType>
         <id>7e14a09c-3b52-4d68-8f01-c5b7e2493a1d</id>
         <iterationEntity>
            <iterationType>ALL</iterationType>
            <value></value>
         </iterationEntity>
         <testDataId>Data Files/valid-accounts</testDataId>
      </testDataLink>
      <variableLink>
         <testDataLinkId>7e14a09c-3b52-4d68-8f01-c5b7e2493a1d</testDataLinkId>
         <type>DATA_COLUMN</type>
         <value>Username</value>
         <variableId>a41d55e6-2b78-4c10-9f33-6e0b8c74d219</variableId>
      </variableLink>
      <variableLink>
         <testDataLinkId>7e14a09c-3b52-4d68-8f01-c5b7e2493a1d</testDataLinkId>
         <type>DATA_COLUMN</type>
         <value>Password</value>
         <variableId>c07e93a4-1f65-48db-8a52-77b1e9f0d3cc</variableId>
      </variableLink>
   </testCaseLink>
</TestSuiteEntity>
```

- `<testCaseId>` is the project-relative path with no extension.
- `<variableLink><value>` is the data file column name when `<type>` is `DATA_COLUMN`.
- Each data row is one iteration of the case.
- A suite with no data binding has an empty `<testDataLink/>` and `<useTestCaseVariables>false</useTestCaseVariables>` in sample files. Copy the shape from an existing suite in the project when one exists.

### Suite fixture: `<suite>.groovy`

An optional Groovy file beside the `.ts` holds suite-level hooks. The annotations are `@SetUp`, `@TearDown`, `@SetupTestCase`, and `@TearDownTestCase`, from `com.kms.katalon.core.annotation`. Create it only when the manual case has suite-level setup or cleanup. A step that belongs to one case stays in that case.

### Suite collection: `.tsc`

`Test Suites/<folder>/<name>.tsc` lists suites with a profile, a run target, and a sequential or parallel mode. Do not create one unless the user asks. When a collection is scheduled in True Platform, its Studio configuration syncs one way, from Studio to the platform, until someone overrides it on the platform.

## Test listeners

`Test Listeners/<Name>.groovy` holds `@BeforeTestCase`, `@AfterTestCase`, `@BeforeTestSuite`, and `@AfterTestSuite` methods. They apply to every case in the project. Do not add a listener to serve one case. The status of listener steps does not change a case result.

## Execution profile: `.glbl`

Path: `Profiles/default.glbl`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<GlobalVariableEntities>
   <GlobalVariableEntity>
      <description></description>
      <initValue>'https://app.example.test'</initValue>
      <name>URL</name>
      <protected>false</protected>
      <valueType>STRING</valueType>
   </GlobalVariableEntity>
</GlobalVariableEntities>
```

- `default.glbl` exists in every project and cannot be renamed. Named profiles add or override values.
- `<initValue>` is a Groovy expression, so a string value is quoted.
- `<protected>true</protected>` masks the value in logs.
- Read a variable as `GlobalVariable.URL`. Studio regenerates `Libs/internal/GlobalVariable.groovy` from the profiles, so do not edit it.
- Choose a profile at run time with `-executionProfile="<name>"`.
- The URL above uses the placeholder `app.example.test`. Use the tenant URL the user gives you. Never invent one.

## Test data: `.dat`

Path: `Data Files/valid-accounts.dat`. The `.dat` file describes a data source. For CSV and Excel, the data itself lives in a separate file, often under `Data Files/` or `Include/`, and the `.dat` points to it.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<TestDataEntity>
   <description></description>
   <name>valid-accounts</name>
   <tag></tag>
   <comment></comment>
   <dataSourceUrl>Data Files/valid-accounts.csv</dataSourceUrl>
   <driver>CSV</driver>
   <isInternalPath>true</isInternalPath>
   <containsHeaders>true</containsHeaders>
   <csvSeperator>,</csvSeperator>
</TestDataEntity>
```

- The field set above comes from sample projects and memory. Verify it against a `.dat` that Studio created, before you rely on it. Other drivers (Excel, internal, database) add fields such as a sheet name, a connection string, and a query.
- `csvSeperator` is spelled that way in the schema.
- Internal data tables store rows inside the `.dat`. Use them for small fixed sets.
- Keep real credentials out of data files. Use a test account the user names, and put the secret in a protected profile variable or an encrypted value.
- By default Studio binds values as strings. A column that must stay a number needs the "bind as string" option off in the suite binding. Ask the user when types matter.

## Questions for the human

Ask only for values you cannot find:

- the path to the Studio Test Project
- the Studio version, if the project does not say (it decides the report flag)
- the AUT URL and the execution profile to use
- the account the case logs in with, and where its secret lives
- whether the user has a licence for command-line runs
- the selector, when the live AUT is not reachable
