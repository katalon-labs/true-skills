# Groovy Authoring For Katalon Studio

Read this before you write a script or a custom keyword. It covers imports, keyword families, calling other cases, failure handling, custom keywords, profiles, data files, and secrets.

Sources: Katalon Studio docs on keywords, custom keywords, global variables, and test data (docs.katalon.com/katalon-studio), and the Katalon sample projects. Studio's compiler is the only check on this code. Keyword names and arities below come from those sources and were not compiled in this build. Open the Keywords Browser in Studio for the authoritative list, and report the code as uncompiled.

## Imports

A script starts with the imports the project already uses. Copy them from an existing script. The usual block:

```groovy
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject
import static com.kms.katalon.core.testdata.TestDataFactory.findTestData
import static com.kms.katalon.core.testcase.TestCaseFactory.findTestCase
import com.kms.katalon.core.model.FailureHandling as FailureHandling
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import com.kms.katalon.core.mobile.keyword.MobileBuiltInKeywords as Mobile
import com.kms.katalon.core.webservice.keyword.WSBuiltInKeywords as WS
import internal.GlobalVariable as GlobalVariable
```

Import only the families a script uses. The `as WebUI`, `as Mobile`, and `as WS` aliases are the form Studio's own generated scripts use.

## Test case variables

A variable declared in the `.tc` is available in the script by its bare name. Do not declare it again in Groovy. The GUID never appears in a script.

## Keywords for common manual steps

| Manual step | Keyword call |
|---|---|
| Open the page | `WebUI.openBrowser('')` then `WebUI.navigateToUrl(GlobalVariable.URL + '/login')`, or `WebUI.openBrowser(url)` |
| Enter text | `WebUI.setText(findTestObject('Page/input_Name'), value)` |
| Enter a Katalon-encrypted value | `WebUI.setEncryptedText(findTestObject('Page/input_Password'), encryptedValue)` |
| Click | `WebUI.click(findTestObject('Page/button_Save'))` |
| Choose from a list | `WebUI.selectOptionByLabel(findTestObject('Page/select_Country'), 'Vietnam', false)` |
| Wait for an element | `WebUI.waitForElementVisible(findTestObject('Page/header_Title'), 30)` |
| Check an element is there | `WebUI.verifyElementPresent(findTestObject('Page/header_Title'), 10)` |
| Check text on an element | `WebUI.verifyElementText(findTestObject('Page/header_Title'), 'System dashboard')` |
| Check text on the page | `WebUI.verifyTextPresent('System dashboard', false)` |
| Capture a screenshot | `WebUI.takeScreenshot()` |
| Close | `WebUI.closeBrowser()` |

Mobile and API steps follow the same shape:

```groovy
Mobile.startApplication(appPath, true)
Mobile.tap(findTestObject('Mobile/button_Login'), 10)
Mobile.setText(findTestObject('Mobile/input_User'), username, 10)
Mobile.verifyElementVisible(findTestObject('Mobile/label_Welcome'), 10)

def response = WS.sendRequest(findTestObject('API/Create order'))
WS.verifyResponseStatusCode(response, 201)
WS.verifyElementPropertyValue(response, 'status', 'created')
```

A web service object is a `.rs` with a different schema from a web element. Create it in Studio when you can, and let the user check the request.

Rules for steps:

- One manual step maps to one keyword call, in the order of the manual case.
- Wait for an element before you act on it. Avoid `WebUI.delay` except as a last resort, and name the reason.
- Put each `verify*` call next to the action that produces the result.
- Never write a raw locator string in a step. Use `findTestObject`.

## Calling another case

```groovy
WebUI.callTestCase(findTestCase('Test Cases/Common/Login'), [('username') : username, ('password') : password], FailureHandling.STOP_ON_FAILURE)
```

Use it for a shared precondition, such as a login. The called case must exist at that path, and its variables must exist by name. A misspelled variable name is a silent default.

## Failure handling

`FailureHandling` is an optional last argument on most keywords.

| Value | Effect |
|---|---|
| `STOP_ON_FAILURE` | Stops the case at the failure. This is the default for most keywords. |
| `CONTINUE_ON_FAILURE` | Marks the case failed and continues. Use it for a group of independent checks. |
| `OPTIONAL` | Logs a warning and continues. Do not use it on a check the case exists to make. |

Do not use `OPTIONAL` to make a flaky step pass. That hides a defect. Use `KeywordUtil.markFailed('message')` (from `com.kms.katalon.core.util.KeywordUtil`) to fail a case with a clear message, and `KeywordUtil.logInfo` for a log line.

## Custom keywords

Shared logic goes in `Keywords/<package>/<Class>.groovy`:

```groovy
package shop.utils

import com.kms.katalon.core.annotation.Keyword
import com.kms.katalon.core.testobject.TestObject
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI

class CartKeywords {

    @Keyword
    def addProductToCart(TestObject searchBox, TestObject addButton, String productName) {
        WebUI.setText(searchBox, productName)
        WebUI.click(addButton)
    }
}
```

Call it from a script as:

```groovy
CustomKeywords.'shop.utils.CartKeywords.addProductToCart'(findTestObject('Shop/input_Search'), findTestObject('Shop/button_Add'), 'Phone')
```

- The package folder under `Keywords/` must match the `package` line.
- A keyword name should read like a manual step (`addProductToCart`), not like a mechanic (`clickButton`).
- Keep locators in the Object Repository and pass test objects in. Do not build locators inside a keyword.
- Write a keyword only when two or more cases need the same logic. A one-off stays in the script.
- Groovy is Java-compatible. A Java library on the project classpath can be imported directly. Put external JARs in `Drivers/`, and shared Groovy classes in `Include/scripts/groovy/`. Ask the user before you add a dependency.

## Profiles and GlobalVariable

- Environment values live in `Profiles/*.glbl` and are read as `GlobalVariable.<name>`. See `studio-project-anatomy.md` for the file format.
- Add a variable to the `.glbl`, not to `Libs/internal/GlobalVariable.groovy`.
- Use a profile per environment (for example `default` and `staging`). The run chooses one with `-executionProfile`.
- Do not put a real password in a profile that is committed. Use a protected variable the user fills in locally, or ask where secrets live.

## Data files

- A suite binds data columns to test case variables. The script reads the variable by name.
- To read a data file inside a script instead, use `findTestData('Data Files/valid-accounts')`, then `getRowNumbers()` and `getValue('Username', row)`. Loop in the script only when the case needs the whole table at once. Otherwise let the suite iterate.
- Choose the driver by source: CSV, Excel, internal table, or database. See `studio-project-anatomy.md` for the `.dat` fields.

## Encryption and masking

- `setEncryptedText` takes a value that Studio has encrypted. A literal value fails. Use `setText` for literals.
- `<masked>true</masked>` on a test case variable and `<protected>true</protected>` on a global variable control display and logs. Neither makes a secret safe to commit.
- Never write a real secret into a script, a `.tc`, a data file, or a chat message.

## Self-check list

Before you report a script as done:

1. Every locator is a `findTestObject` call that resolves to a file.
2. Every expected result has a `verify*` call, near its action.
3. Variable names in the script match the `.tc` variable names exactly.
4. No `Libs/` edits, no `OPTIONAL` on a core check, no fixed delay without a reason.
5. You said that the code is uncompiled and that Studio is the final check.
