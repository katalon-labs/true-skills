# Plan for the funds transfer spec

You gave me pasted text, so no requirement exists to link. Every case shows Requirement IDs as N/A. I wrote nothing to the platform. Reply "confirm" and I will create the cases.

## Existing coverage

find_test_cases (keyword "transfer") returned 0 cases and the search returned no exact or strong hit. Memory has no records.

## Risk ranking

Money moves, so limits and balance checks carry the most risk. The same-account rule carries the least. Priorities follow that order.

## Proposed cases (8 new)

Name: Complete a valid transfer between own accounts
Description: A customer moves money from Checking 4410 to Savings 4420.
Pre-condition: The Transfers screen is open. The customer is signed in with Checking 4410 and Savings 4420.
| Step | Test Step | Expected Result | Test Data |
| 1 | Navigate to the Transfers screen | The Transfers screen shows From account, To account and Amount. | N/A |
| 2 | Select Checking 4410 in From account and Savings 4420 in To account | Both accounts are selected. | Checking 4410 to Savings 4420 |
| 3 | Enter 100.00 in Amount | The amount is entered. | 100.00 |
| 4 | Click Send | The transfer is confirmed and both balances change by 100.00. | N/A |
Priority: P0
Requirement IDs: N/A

Name: Accept transfer of the minimum amount 1.00
Description: The amount sits on the lower boundary.
Pre-condition: The Transfers screen is open. The customer is signed in with Checking 4410 and Savings 4420.
| Step | Test Step | Expected Result | Test Data |
| 1 | Navigate to the Transfers screen | The Transfers screen shows From account, To account and Amount. | N/A |
| 2 | Select Checking 4410 in From account and Savings 4420 in To account | Both accounts are selected. | Checking 4410 to Savings 4420 |
| 3 | Enter 1.00 in Amount | The amount is entered. | 1.00 |
| 4 | Click Send | The transfer is confirmed. | N/A |
Priority: P1
Requirement IDs: N/A

Name: Reject transfer below the minimum amount 0.99
Description: The amount is one cent under the minimum.
Pre-condition: The Transfers screen is open. The customer is signed in with Checking 4410 and Savings 4420.
| Step | Test Step | Expected Result | Test Data |
| 1 | Navigate to the Transfers screen | The Transfers screen shows From account, To account and Amount. | N/A |
| 2 | Select Checking 4410 in From account and Savings 4420 in To account | Both accounts are selected. | Checking 4410 to Savings 4420 |
| 3 | Enter 0.99 in Amount | The amount is entered. | 0.99 |
| 4 | Click Send | The app rejects the amount and moves no money. The spec gives no message text. | N/A |
Priority: P1
Requirement IDs: N/A

Name: Accept transfer of the maximum amount 5,000.00
Description: The amount sits on the upper boundary.
Pre-condition: The Transfers screen is open. The customer is signed in with Checking 4410 and Savings 4420.
| Step | Test Step | Expected Result | Test Data |
| 1 | Navigate to the Transfers screen | The Transfers screen shows From account, To account and Amount. | N/A |
| 2 | Select Checking 4410 in From account and Savings 4420 in To account | Both accounts are selected. | Checking 4410 to Savings 4420 |
| 3 | Enter 5,000.00 in Amount | The amount is entered. | 5,000.00 |
| 4 | Click Send | The transfer is confirmed. | N/A |
Priority: P1
Requirement IDs: N/A

Name: Reject transfer above the maximum amount 5,000.01
Description: The amount is one cent over the maximum.
Pre-condition: The Transfers screen is open. The customer is signed in with Checking 4410 and Savings 4420.
| Step | Test Step | Expected Result | Test Data |
| 1 | Navigate to the Transfers screen | The Transfers screen shows From account, To account and Amount. | N/A |
| 2 | Select Checking 4410 in From account and Savings 4420 in To account | Both accounts are selected. | Checking 4410 to Savings 4420 |
| 3 | Enter 5,000.01 in Amount | The amount is entered. | 5,000.01 |
| 4 | Click Send | The app rejects the amount and moves no money. The spec gives no message text. | N/A |
Priority: P1
Requirement IDs: N/A

Name: Reject transfer that passes the daily limit of 10,000.00
Description: Two transfers of 5,000.00 already went out today.
Pre-condition: The Transfers screen is open. The customer is signed in with Checking 4410 and Savings 4420.
| Step | Test Step | Expected Result | Test Data |
| 1 | Navigate to the Transfers screen | The Transfers screen shows From account, To account and Amount. | N/A |
| 2 | Select Checking 4410 in From account and Savings 4420 in To account | Both accounts are selected. | Checking 4410 to Savings 4420 |
| 3 | Enter 1.00 in Amount | The amount is entered. | 1.00 |
| 4 | Click Send | The app shows "Transfer limit exceeded" and moves no money. | N/A |
Priority: P0
Requirement IDs: N/A

Name: Reject transfer with insufficient balance
Description: Savings 4420 holds 300.00.
Pre-condition: The Transfers screen is open. The customer is signed in with Checking 4410 and Savings 4420.
| Step | Test Step | Expected Result | Test Data |
| 1 | Navigate to the Transfers screen | The Transfers screen shows From account, To account and Amount. | N/A |
| 2 | Select Savings 4420 in From account and Checking 4410 in To account | Both accounts are selected. | Savings 4420 to Checking 4410 |
| 3 | Enter 300.01 in Amount | The amount is entered. | 300.01 |
| 4 | Click Send | The app shows "Insufficient funds" and moves no money. | N/A |
Priority: P0
Requirement IDs: N/A

Name: Reject transfer when source and target account are the same
Description: The customer picks Checking 4410 twice.
Pre-condition: The Transfers screen is open. The customer is signed in with Checking 4410 and Savings 4420.
| Step | Test Step | Expected Result | Test Data |
| 1 | Navigate to the Transfers screen | The Transfers screen shows From account, To account and Amount. | N/A |
| 2 | Select Checking 4410 in From account and Checking 4410 in To account | Both accounts are selected. | Checking 4410 to Checking 4410 |
| 3 | Enter 10.00 in Amount | The amount is entered. | 10.00 |
| 4 | Click Send | The app rejects the transfer and moves no money. The spec gives no message text. | N/A |
Priority: P2
Requirement IDs: N/A

## Gaps

- Open question: the spec gives no message text for an amount below the minimum or above the maximum, or for the same-account rule. The expected results do not invent one.
- Not covered: currency rounding and transfers between accounts of other customers, which the spec excludes.

## Next step

After you confirm I create the 8 cases and read them back with read_test_cases. No requirement link is possible until a ticket exists.
