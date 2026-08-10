# Selenium bindings, runners, and where the JUnit XML lands

Selenium is one API with several language bindings. The binding is a **detected fact about the workspace**, never a preference and never a default. This file holds the detection signals, the project shape, the runner wiring, and the report path for each supported binding. Adding a binding is an edit to this file, not a new skill.

## Detection, in order

1. Glob the workspace for manifests: `pom.xml`, `build.gradle`, `build.gradle.kts`, `requirements.txt`, `pyproject.toml`, `setup.cfg`, `package.json`.
2. Read each manifest and look for the Selenium dependency, not just the manifest. A `package.json` with no `selenium-webdriver` is not a Selenium project.
3. Look for the test tree the binding implies: `src/test/java/`, `tests/`, `test/`, `e2e/`, plus any folder named `pages/` or `pageobjects/`.
4. Announce the decision and the signal that produced it before writing anything. "Found `pom.xml` declaring `selenium-java 4.25.0` and `junit-jupiter`, so Java with JUnit 5" is the shape.

If step 2 finds more than one Selenium manifest, stop and ask. Do not pick the largest project, the newest file, or the one nearest the working directory.

## Binding table

| Binding | Detection signal | Dependency | Usual runner | Test tree | Run command |
|---|---|---|---|---|---|
| Java, Maven | `pom.xml` | `org.seleniumhq.selenium:selenium-java` | `junit-jupiter` or `testng` | `src/test/java/` | `mvn test` |
| Java, Gradle | `build.gradle`, `build.gradle.kts` | `org.seleniumhq.selenium:selenium-java` | `junit-jupiter` or `testng` | `src/test/java/` | `gradle test` |
| Python | `requirements.txt`, `pyproject.toml`, `setup.cfg` | `selenium` | `pytest` | `tests/` | `pytest` |
| JavaScript / TypeScript | `package.json` | `selenium-webdriver` | `mocha`, or whatever `scripts.test` already runs | `test/`, `e2e/` | `npm test` |

Three bindings are written up here. Selenium officially ships more, including C#, Ruby, and Kotlin. They are reachable through the same skill and the same rules; they are simply not specified yet. Add a row plus a section here rather than proposing a new skill.

## Where each runner writes JUnit XML

This is the only report format that matters for the hand-off, because `upload-report --type=junit` consumes it. Confirm the file exists after the run rather than assuming the path.

| Runner and build | Default XML location | Notes |
|---|---|---|
| Maven Surefire | `target/surefire-reports/TEST-*.xml` | Written on every `mvn test`, no extra config |
| Gradle | `build/test-results/test/TEST-*.xml` | Written on every `gradle test`, no extra config |
| pytest | none by default | Requires `--junitxml=reports/junit.xml`. Add the flag to the command, not to a committed config, unless the project already has one |
| Mocha | none by default | Requires a JUnit reporter such as `mocha-junit-reporter`, invoked with `--reporter` and configured with an output file |

**The `name` attribute is version-dependent.** Whether Maven Surefire writes the method name or the `@DisplayName` value into `<testcase name="...">` has varied across provider versions. Do not assert one behaviour. Write the Katalon case ID into both the identifier and the display name, then grep the generated XML to see which one landed. That grep is the proof, not the annotation.

## Project shape per binding

**Java.** One public class per file. Page objects under a `pages` package next to the tests, test classes suffixed `Test` so the build tool picks them up by default. Driver lifecycle in `@BeforeEach`/`@AfterEach` (JUnit 5) or `@BeforeMethod`/`@AfterMethod` (TestNG), never in a static initialiser. Assertions come from the runner already in the manifest: `org.junit.jupiter.api.Assertions` for JUnit 5, `org.testng.Assert` for TestNG. Do not add AssertJ or Hamcrest to a project that has neither.

**Python.** Page objects as plain classes in a `pages` package. The driver and the test data come from `conftest.py` fixtures with `yield` teardown, so the quit happens even when the test fails. Test functions start with `test_`, assertions are bare `assert`. Do not add a page-object library.

**JavaScript / TypeScript.** Page objects as classes with `async` methods returning promises. Driver built in `beforeEach`, quit in `afterEach`. Assertions from the runner's own library or `assert`, invoked in the `it()` body. Every Selenium call is awaited; a missing `await` is the most common defect in this binding and it produces a green test that checked nothing.

## Selenium Manager owns the driver

Selenium 4.6 and later resolve the browser driver automatically. Selenium 4.11 and later can also download the browser itself when a `browserVersion` is requested that is not installed locally.

- Never write instructions to download ChromeDriver, GeckoDriver, or msedgedriver.
- Never add a driver-manager dependency to a new project.
- Never set a driver system property or a `PATH` entry for a driver binary.
- If an existing project already uses a driver manager, leave it in place. Say once that it is now redundant and let the user decide; do not remove it as a side effect of converting a test case.

## Ask the human when the answer cannot be discovered

Detection answers the binding question. It does not answer these, and guessing at any of them produces a test that passes for the wrong reason:

- Which environment and base URL the case is meant to run against, when `read_auts` returns several.
- Which account or role the precondition assumes, and where its credentials come from. Never ask for a secret to be pasted into chat; ask for the variable name.
- The concrete value behind a placeholder in the manual steps, such as a product name, an order number, or a search term.
- Whether test data is seeded, reused, or created by the test, and what cleanup is expected afterwards.
- Which browser the suite is meant to target when the project runs more than one.
- Whether an existing page object already covers the page, when two look like near duplicates.
