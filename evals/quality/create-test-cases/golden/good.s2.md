# Plan for CEL-14, Promo code at checkout

I wrote nothing to the platform. Reply "confirm" and I will create the new cases in one pass and read them back.

## Existing coverage

find_test_cases_by_requirement returned 2 cases. The semantic search agrees (exact or strong tier, incomplete=false).

| Case | Covers | Decision |
|---|---|---|
| TC-3101 | criterion 1, valid code | reuse as is |
| TC-3102 | criterion 3, expired code | reuse as is |

I create no copy of these two. The saved convention "Case names start with a verb" applies to the new names.

## Risk ranking

The minimum order rule and the one-code rule change what the shopper pays, so they carry the most risk. The code format rule carries less. Priorities follow that order.

## Proposed new cases (5 new, 2 reused)

Name: Reject promo code below the minimum subtotal
Description: The cart subtotal is 19.99, one cent below the minimum.
Pre-condition: The checkout page is open with a cart. The shopper is signed in.
| Step | Test Step | Expected Result | Test Data |
| 1 | Navigate to the checkout page | The checkout page shows the Promo code field. | https://shop.example.test/checkout |
| 2 | Enter SPRING10 in the Promo code field | The code is entered. | SPRING10 |
| 3 | Click Apply | The page shows "Minimum order of 20.00 required for this promo code" and no discount is applied. | Cart subtotal 19.99 |
Priority: P0
Requirement IDs: CEL-14

Name: Accept promo code at exactly the minimum subtotal
Description: The cart subtotal is 20.00, on the boundary.
Pre-condition: The checkout page is open with a cart. The shopper is signed in.
| Step | Test Step | Expected Result | Test Data |
| 1 | Navigate to the checkout page | The checkout page shows the Promo code field. | https://shop.example.test/checkout |
| 2 | Enter SPRING10 in the Promo code field | The code is entered. | SPRING10 |
| 3 | Click Apply | The subtotal shows 10 percent off, which is 18.00. | Cart subtotal 20.00 |
Priority: P1
Requirement IDs: CEL-14

Name: Reject a second promo code on the same order
Description: One valid code is already applied.
Pre-condition: The checkout page is open with a cart. The shopper is signed in.
| Step | Test Step | Expected Result | Test Data |
| 1 | Navigate to the checkout page | The checkout page shows the Promo code field. | https://shop.example.test/checkout |
| 2 | Apply the promo code SPRING10 | The discount is applied. | SPRING10 |
| 3 | Enter SAVE10 in the Promo code field and click Apply | The page shows "Only one promo code can be used per order" and the discount stays at the first code. | SAVE10 |
Priority: P0
Requirement IDs: CEL-14

Name: Reject promo code with 5 characters
Description: The code is shorter than the 6 character minimum.
Pre-condition: The checkout page is open with a cart. The shopper is signed in.
| Step | Test Step | Expected Result | Test Data |
| 1 | Navigate to the checkout page | The checkout page shows the Promo code field. | https://shop.example.test/checkout |
| 2 | Enter a 5 character code in the Promo code field | The code is entered. | SAVE1 |
| 3 | Click Apply | The page rejects the code and no discount is applied. | Cart subtotal 50.00 |
Priority: P2
Requirement IDs: CEL-14

Name: Reject promo code with 11 characters
Description: The code is longer than the 10 character maximum.
Pre-condition: The checkout page is open with a cart. The shopper is signed in.
| Step | Test Step | Expected Result | Test Data |
| 1 | Navigate to the checkout page | The checkout page shows the Promo code field. | https://shop.example.test/checkout |
| 2 | Enter an 11 character code in the Promo code field | The code is entered. | SPRINGSALE1 |
| 3 | Click Apply | The page rejects the code and no discount is applied. | Cart subtotal 50.00 |
Priority: P2
Requirement IDs: CEL-14

## Gaps

- Not covered: the exact error text for a code with the wrong format. The requirement gives none, so the expected result says only that the page rejects the code. Please supply the text.
- Not covered: lowercase codes, because the requirement does not say whether input is case-sensitive.

## Next step

After you confirm I create the 5 cases, link them to CEL-14, and read them back with read_test_cases.
