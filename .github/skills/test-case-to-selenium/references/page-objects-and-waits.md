# Page objects, locators, and waits

This file holds the opinion. It is what to read to check that the generated code is Selenium written properly rather than Playwright rewritten in Selenium syntax.

## Page objects never assert

Selenium's own documented guidance is blunt about it:

> Page objects themselves should never make verifications or assertions.

This is a **deliberate divergence from the Playwright sibling skill**, whose house reference puts expectations inside page objects because Playwright's `expect` is auto-retrying and doubles as a wait. Selenium has no such construct, so the split is the classic one. State the divergence when a reader asks why the two skills disagree; do not quietly "harmonise" them.

The mechanical form of the rule:

- A page object exposes **actions** that return `void` or the next page object.
- A page object exposes **state readers** that return plain values: `String`, `int`, `boolean`, `List<String>`, and the equivalents in Python and JavaScript.
- The **test method** performs every assertion, using the runner's own assertion library.
- **A page object imports no assertion library.** That import is the review trigger and it is grep-able.

```bash
# Java, from the project root
rg -n 'import (org\.junit|org\.testng|org\.assertj|org\.hamcrest)' src/test/java/**/pages/
# Python
rg -n '^\s*assert ' tests/pages/
# expect empty output in both cases
```

**Why it matters beyond style.** In Selenium the runner owns the verdict. An assertion that fires inside a page object produces a failure whose XML `name` attribute is the page object's method, not the test's, which destroys the exact traceability the Katalon case ID is riding on. Keeping assertions in the test keeps the case ID attached to the failure.

## Locator strategy, in order

1. `id`, when it is stable and not generated.
2. `name`.
3. A CSS selector on a purpose-built test attribute: `[data-testid='...']`, `[data-test='...']`, `[data-qa='...']`.
4. Accessible text or an ARIA label, when the copy is stable and not localised out from under the test.
5. A short relative XPath, only when the application offers nothing above.

Never use an absolute XPath, a generated class name, a framework hash such as `css-1x2y3z`, or an nth-child chain into a list. If the application genuinely has no stable hook, say so and propose adding a `data-testid` rather than shipping a locator that will rot.

Declare locators as fields on the page object (`By` in Java, module-level or class-level constants in Python and JavaScript). Never inline a raw selector string inside a test method.

## Waits

**Explicit only.** Use `WebDriverWait` with an expected condition at the point where the application is actually slow, which is usually right after a navigation, a search, or a form submit.

**Three things are banned outright:**

1. `Thread.sleep`, `time.sleep`, `driver.sleep`, and any bare timeout promise. A sleep is either too short and flaky or too long and slow, and it is always both across a suite.
2. Mixing implicit and explicit waits in the same project. The documented result is unpredictable wait times, because the two mechanisms compound rather than compose. Pick explicit, and if the project already sets an implicit wait, say that it has to go before the new waits behave predictably.
3. A wait with no condition, such as waiting for an element that is already present and then acting on a different one. Wait for the thing the next line touches.

Put the wait inside the page object, next to the interaction it protects. The wait is page structure, so it belongs with the locators; the assertion that follows it is a verdict, so it belongs in the test.

## One page object per binding

**Java.**

```java
public class ProductPage {
  private final WebDriver driver;
  private final WebDriverWait wait;
  private final By stockStatus = By.cssSelector("[data-testid='stock-status']");
  private final By addToCart = By.id("add-to-cart");

  public ProductPage(WebDriver driver) {
    this.driver = driver;
    this.wait = new WebDriverWait(driver, Duration.ofSeconds(10));
  }

  public String stockStatus() {                       // state reader, no assertion
    return wait.until(ExpectedConditions.visibilityOfElementLocated(stockStatus)).getText();
  }

  public CartPage addToCart() {                       // action, returns the next page
    wait.until(ExpectedConditions.elementToBeClickable(addToCart)).click();
    return new CartPage(driver);
  }
}
```

**Python.**

```python
class ProductPage:
    STOCK_STATUS = (By.CSS_SELECTOR, "[data-testid='stock-status']")
    ADD_TO_CART = (By.ID, "add-to-cart")

    def __init__(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(driver, 10)

    def stock_status(self) -> str:
        return self.wait.until(EC.visibility_of_element_located(self.STOCK_STATUS)).text

    def add_to_cart(self) -> "CartPage":
        self.wait.until(EC.element_to_be_clickable(self.ADD_TO_CART)).click()
        return CartPage(self.driver)
```

**JavaScript.**

```js
class ProductPage {
  constructor(driver) {
    this.driver = driver;
    this.stockStatus = By.css("[data-testid='stock-status']");
    this.addToCartButton = By.id("add-to-cart");
  }

  async stockStatusText() {
    const el = await this.driver.wait(until.elementLocated(this.stockStatus), 10000);
    return el.getText();
  }

  async addToCart() {
    const btn = await this.driver.wait(until.elementIsEnabled(
      await this.driver.findElement(this.addToCartButton)), 10000);
    await btn.click();
    return new CartPage(this.driver);
  }
}
```

Same contract three times: locators as fields, waits inside the page object, actions returning the next page object, readers returning plain values, and not one assertion anywhere.

## Review checklist

Run this before reporting the task done:

- No assertion import under the page-object folder.
- No sleep call of any kind in the generated files.
- No implicit wait added, and any pre-existing one called out.
- Every locator is a field, not an inline string in a test.
- Every action either returns `void` or returns the next page object.
- Every expected result from the manual case has exactly one assertion in the test, in the manual case's order.
- In JavaScript, every Selenium call is awaited.
