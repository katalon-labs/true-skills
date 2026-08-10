# Cypress Reporting For Katalon Upload

Cypress runs on Mocha, so any Mocha reporter works. JUnit XML is the format `upload-report` ingests with `--type=junit`, which makes this the shortest supported path from a Cypress run to a Katalon True Platform test run.

## Install

```text
npm install --save-dev cypress-multi-reporters mocha-junit-reporter
```

`mocha-junit-reporter` alone would replace the console output. `cypress-multi-reporters` keeps `spec` on stdout and writes the XML at the same time.

## Configure

```ts
// cypress.config.ts
export default defineConfig({
  reporter: 'cypress-multi-reporters',
  reporterOptions: {
    configFile: 'reporter-config.json',
  },
  e2e: { /* ... */ },
});
```

```json
// reporter-config.json
{
  "reporterEnabled": "spec, mocha-junit-reporter",
  "mochaJunitReporterReporterOptions": {
    "mochaFile": "cypress/results/junit-[hash].xml",
    "testsuitesTitle": "Cypress",
    "testCaseSwitchClassnameAndName": false,
    "toConsole": false
  }
}
```

Three details that are easy to get wrong:

- **The option key is `mochaJunitReporterReporterOptions`.** `cypress-multi-reporters` builds it by camel-casing the reporter name and appending `ReporterOptions`. A near-miss key is silently ignored and you get an empty `cypress/results`.
- **`[hash]` is required.** Cypress invokes the reporter once per spec file. Without the placeholder every spec overwrites the same file and only the last one survives. Point `upload-report` at the **folder**, not at one file, and no merge step is needed.
- **Add `cypress/results/` to `.gitignore`.**

## Verify the case ID survived

This is the check that proves traceability, and it is not optional.

```text
npx cypress run --spec "cypress/e2e/storefront/search-and-cart.cy.ts"
grep -o 'TC-[0-9]*' cypress/results/*.xml | sort -u
```

Expected shape of the generated XML:

```xml
<testsuites name="Cypress" tests="1" failures="0" time="12.402">
  <testsuite name="Storefront search and cart" tests="1" failures="0" time="12.402">
    <testcase name="Storefront search and cart TC-1042 Search an in-stock phone and add it to the cart"
              classname="TC-1042 Search an in-stock phone and add it to the cart"
              time="12.402"/>
  </testsuite>
</testsuites>
```

`mocha-junit-reporter` splits the title across `name` and `classname`, and `testCaseSwitchClassnameAndName` swaps which gets which. **Because the case ID sits at the front of the `it()` title, it appears in both attributes regardless of that flag.** That is exactly why the rule is "ID first in the title" and not "ID somewhere in the test". Do not rely on remembering which attribute the uploader reads. Open the XML and confirm.

## Hand off to upload-report

```text
java -jar katalon-report-uploader-<version>.jar \
  --projectId="<project_id>" \
  --path="cypress/results" \
  --password="$KATALON_API_KEY" \
  --type=junit
```

Read `upload-report/references/cli-report-upload.md` for the current uploader version, the `--server` flag, and the verification steps. Do not compose the upload command from this file alone; `upload-report` owns that surface.

## CI shape

```text
npx cypress run || true
java -jar katalon-report-uploader-<version>.jar \
  --projectId="$KATALON_PROJECT_ID" \
  --path="cypress/results" \
  --password="$KATALON_API_KEY" \
  --type=junit
```

`|| true` is deliberate: **test failures are valid report data.** Upload before letting the job fail, then fail the job on the Cypress exit code once the report is safely in the platform.

Never echo `KATALON_API_KEY`. Read it from the CI secret store into the environment and reference it as a variable.
