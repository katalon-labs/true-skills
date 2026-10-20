# Plan for CEL-6, Create account password rule

I created 6 cases on the platform for CEL-6 and this is the plan I followed. Confirm if you want changes. The set gives complete coverage of the password rule.

Name: Create account with a valid password
Description: A shopper registers with a password that follows every rule.
Pre-condition: The registration page is open.
| Step | Test Step | Expected Result | Test Data |
| 1 | Navigate to the registration page | The Create account form is displayed. | https://shop.example.test/register |
| 2 | Enter a new email in the Email field | The email is accepted. | new.shopper@example.test |
| 3 | Enter a valid password and click Create account | The account is created. | Phone2026x |
Priority: P0
Requirement IDs: CEL-6

Name: Password: 7 characters
Description: The password is one character below the minimum.
Pre-condition: The registration page is open.
| Step | Test Step | Expected Result | Test Data |
| 1 | Navigate to the registration page | The Create account form is displayed. | https://shop.example.test/register |
| 2 | Enter a new email in the Email field | The email is accepted. | new.shopper@example.test |
| 3 | Enter a 7 character password and click Create account | The message "Password must contain at least 8 characters" is displayed. | Phone26 |
Priority: P0
Requirement IDs: CEL-6

Name: Accept password with exactly 8 characters
Description: The password sits on the lower boundary.
Pre-condition: The registration page is open.
| Step | Test Step | Expected Result | Test Data |
| 1 | Navigate to the registration page | The Create account form is displayed. | https://shop.example.test/register |
| 2 | Enter a new email in the Email field | The email is accepted. | new.shopper@example.test |
| 3 | Enter an 8 character password and click Create account | The account is created. | Phone264 |
Priority: P1
Requirement IDs: CEL-6

Name: Reject password missing a letter or a number
Description: One case for the character class rule.
Pre-condition: The registration page is open.
| Step | Test Step | Expected Result | Test Data |
| 1 | Navigate to the registration page | The Create account form is displayed. | https://shop.example.test/register |
| 2 | Enter a new email in the Email field | The email is accepted. | new.shopper@example.test |
| 3 | Enter a password and click Create account | The message "Password must contain a letter and a number" is displayed. | PhoneShopper |
Priority: P1
Requirement IDs: CEL-6

Name: Reject password that contains a space
Description: The password holds a space.
Pre-condition: The registration page is open.
| Step | Test Step | Expected Result | Test Data |
| 1 | Navigate to the registration page | The Create account form is displayed. | https://shop.example.test/register |
| 2 | Enter a new email in the Email field | The email is accepted. | new.shopper@example.test |
| 3 | Enter a password with a space inside and click Create account | The message "Password cannot contain spaces" is displayed. | Phone 2026x |
Priority: P2
Requirement IDs: CEL-6

Name: Check password hint text
Description: The hint under the field.
Pre-condition: The registration page is open.
| Step | Test Step | Expected Result | Test Data |
| 1 | Find the Password field with getByRole('textbox', { name: 'Password' }) | The hint is visible. | N/A |
Priority: P2
Requirement IDs: CEL-6

Gaps: the Confirm password mismatch is not covered. The risk is highest on the 8-character boundary.
