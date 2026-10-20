# Fixture: requirement CEL-14 and existing coverage (Cellphone Shop project)

Key: CEL-14
Title: Promo code at checkout, 10% off
Source: Jira (synced)

Acceptance criteria (customFields):
1. A valid promo code takes 10% off the cart subtotal. A valid code has 6 to 10 uppercase letters or digits.
2. The cart subtotal must be at least 20.00. Otherwise the page shows "Minimum order of 20.00 required for this promo code".
3. A code works until 23:59:59 on its end date. After that the page shows "This promo code has expired".
4. One promo code per order. A second code shows "Only one promo code can be used per order".

Checkout page: https://shop.example.test/checkout
Promo field label: Promo code. Button: Apply.
Test promo codes the team supplied: SPRING10 (valid, ends 2026-12-31), OLDCODE1 (expired 2026-01-31), SAVE10 (valid, ends 2026-12-31).

## Coverage lookup results

- find_test_cases_by_requirement(CEL-14): 2 cases.
  - TC-3101 "Apply valid promo code to cart" (covers criterion 1, valid code)
  - TC-3102 "Reject expired promo code" (covers criterion 3, expired code)
- search tier exact or strong: TC-3101 and TC-3102 only. Search response incomplete=false.
- memory_list: available true. One record, headline "Case names start with a verb", kind convention.

## Repository

Repository: Cellphone Shop Web (one repository).
