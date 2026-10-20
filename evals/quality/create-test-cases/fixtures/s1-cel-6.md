# Fixture: requirement CEL-6 (read_requirement result, Cellphone Shop project)

Key: CEL-6
Title: Create account password rule
Source: Jira (synced)
Priority: High

Description: As a new shopper I choose a password on the registration page so that my account is protected.

Acceptance criteria (customFields):
1. The password must have at least 8 characters.
2. The password must contain at least one letter and at least one number.
3. The password must not contain spaces.

Messages, verbatim from the requirement:
- Too short: "Pasword must contain at least 8 characters"
- Missing letter or number: "Password must contain a letter and a number"
- Space inside: "Password cannot contain spaces"

Registration page: https://shop.example.test/register
Fields: Email, Password, Confirm password. Button: Create account.

## Coverage lookup results

- find_test_cases_by_requirement(CEL-6): 0 cases.
- find_test_cases (keyword "password"): 0 cases in folder Test Cases/Registration.
- search (types test_case, include_documents false): 2 hits, both tier "weak", titles "Reset password email" and "Change password in profile". Neither covers registration.
- memory_list: available false (memory service did not answer).

## Repository

Repository: Cellphone Shop Web (one repository, id resolved).
