# Plan for CEL-6, Create account password rule

Project Cellphone Shop, repository Cellphone Shop Web. I wrote nothing to the platform. This is the plan. Reply "confirm" and I will create the cases in one pass and read them back.

## Existing coverage

find_test_cases_by_requirement returned 0 cases for CEL-6. The keyword search found 0 cases in Test Cases/Registration. The semantic search returned two weak hits ("Reset password email", "Change password in profile"). A weak hit is not coverage, and the memory service did not answer, so I do not know the team naming conventions. I used verb-led titles from the case format.

## Risk ranking

Registration is the entry point for every shopper, so a wrong rule lets weak passwords in. The 8-character boundary carries the highest risk. The space rule carries the lowest. That order sets the priorities below.

## Proposed cases (6 new, 0 reused)

Name: Create account with a valid password
Description: A shopper registers with a password that follows every rule.
Pre-condition: The registration page is open. The email is not registered yet.
| Step | Test Step | Expected Result | Test Data |
| 1 | Navigate to the registration page | The Create account form is displayed. | https://shop.example.test/register |
| 2 | Enter a new email in the Email field | The email is accepted. | new.shopper@example.test |
| 3 | Enter a valid password in the Password and Confirm password fields | No error message is displayed. | Phone2026x |
| 4 | Click Create account | The account is created and the shopper lands on the welcome page. | N/A |
Priority: P0
Requirement IDs: CEL-6

Name: Reject password with 7 characters
Description: The password is one character below the minimum.
Pre-condition: The registration page is open. The email is not registered yet.
| Step | Test Step | Expected Result | Test Data |
| 1 | Navigate to the registration page | The Create account form is displayed. | https://shop.example.test/register |
| 2 | Enter a new email in the Email field | The email is accepted. | new.shopper@example.test |
| 3 | Enter a 7 character password in the Password and Confirm password fields | The password is entered. | Phone26 |
| 4 | Click Create account | The message "Pasword must contain at least 8 characters" is displayed and no account is created. | N/A |
Priority: P0
Requirement IDs: CEL-6

Name: Accept password with exactly 8 characters
Description: The password sits on the lower boundary.
Pre-condition: The registration page is open. The email is not registered yet.
| Step | Test Step | Expected Result | Test Data |
| 1 | Navigate to the registration page | The Create account form is displayed. | https://shop.example.test/register |
| 2 | Enter a new email in the Email field | The email is accepted. | new.shopper@example.test |
| 3 | Enter an 8 character password in the Password and Confirm password fields | No error message is displayed. | Phone264 |
| 4 | Click Create account | The account is created. | N/A |
Priority: P1
Requirement IDs: CEL-6

Name: Reject password with letters only
Description: The password has no number.
Pre-condition: The registration page is open. The email is not registered yet.
| Step | Test Step | Expected Result | Test Data |
| 1 | Navigate to the registration page | The Create account form is displayed. | https://shop.example.test/register |
| 2 | Enter a new email in the Email field | The email is accepted. | new.shopper@example.test |
| 3 | Enter a password that has only letters in the Password and Confirm password fields | The password is entered. | PhoneShopper |
| 4 | Click Create account | The message "Password must contain a letter and a number" is displayed and no account is created. | N/A |
Priority: P1
Requirement IDs: CEL-6

Name: Reject password with numbers only
Description: The password has no letter.
Pre-condition: The registration page is open. The email is not registered yet.
| Step | Test Step | Expected Result | Test Data |
| 1 | Navigate to the registration page | The Create account form is displayed. | https://shop.example.test/register |
| 2 | Enter a new email in the Email field | The email is accepted. | new.shopper@example.test |
| 3 | Enter a password that has only numbers in the Password and Confirm password fields | The password is entered. | 20262026 |
| 4 | Click Create account | The message "Password must contain a letter and a number" is displayed and no account is created. | N/A |
Priority: P1
Requirement IDs: CEL-6

Name: Reject password that contains a space
Description: The password follows the length and character rules but holds a space.
Pre-condition: The registration page is open. The email is not registered yet.
| Step | Test Step | Expected Result | Test Data |
| 1 | Navigate to the registration page | The Create account form is displayed. | https://shop.example.test/register |
| 2 | Enter a new email in the Email field | The email is accepted. | new.shopper@example.test |
| 3 | Enter a password with a space inside in the Password and Confirm password fields | The password is entered. | Phone 2026x |
| 4 | Click Create account | The message "Password cannot contain spaces" is displayed and no account is created. | N/A |
Priority: P2
Requirement IDs: CEL-6

## Source text to check

The requirement spells the short-password message as "Pasword must contain at least 8 characters". That looks like a typo for "Password". I kept the text verbatim in the expected result. Please confirm the intended wording with the product owner before the cases run.

## Gaps

- Not covered: the Confirm password mismatch, the email rules, and a password longer than any maximum (the requirement states no maximum).
- Not covered: accessibility of the error messages. No criterion asks for it.

## Next step

After you confirm I will create the 6 cases in Test Cases/Registration, link them to CEL-6, and read them back with read_test_cases.
