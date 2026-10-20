# Coverage Guide

Use this guide before you write or import test cases. Start from risk. Rank what can fail by impact and likelihood, then spend design effort in that order. The ISTQB techniques below are one toolset for turning a risk into cases. They do not guarantee complete coverage. The output is platform test cases. Say what you left uncovered and why.

## Technique Selection

- Equivalence partitioning: valid and invalid classes such as product categories, stock states, payment methods, account roles, and form input classes.
- Boundary value analysis: numeric or ordered values such as price range, quantity, pagination, character limits, dates, and timeout thresholds.
- Decision table testing: outcomes that depend on combinations of conditions, such as variant plus stock plus quantity, checkout field validity, or shipping eligibility.
- State transition testing: behavior that depends on prior state, such as empty cart, item added, quantity updated, removed, or execution TODO, IN_TESTING, PASSED, FAILED.
- Use case and scenario testing: end-to-end journeys that carry a user goal, such as browse, select variant, add to cart, check out.
- Error guessing and checklist testing: likely failures from domain knowledge, such as broken images, stale totals, invalid email, unavailable product, duplicate submission, or lost navigation.
- Pairwise and combinatorial testing: many interacting variables, such as browser, device, category, filter, and sort. Keep the high-risk combinations you named.

## Minimum Coverage Expectations

For each requirement, identify:

- At least one happy-path scenario.
- At least one negative or validation scenario when user input or branching exists.
- Boundary cases for numeric, date, and range fields.
- State transitions for multi-step workflows.
- Role and permission coverage when roles exist.
- Data setup and cleanup assumptions.
- Requirement-to-test traceability.
- At least one case for each defect pattern that still applies to this feature area. Read the defect data with `get_defect_insights`.

## Coverage Output Format

Before you import tests, prepare a short coverage note:

```text
Risks ranked:
- ...

Techniques used:
- Use case testing: ...
- Equivalence partitions: ...
- Boundary values: ...
- Decision table or state transition: ...
- Error guessing risks: ...

Selected test cases:
- P0: ...
- P1: ...
- P2: ...

Deferred or not covered:
- ...
Reason:
- ...
```

## Case Granularity

- Keep each case atomic in scope. One validation condition or one acceptance-criteria line belongs in one case. A failure then points to one rule, and each requirement line maps to one result.
- Atomic describes scope. It does not limit steps or assertions. A case may need several observations to establish one behavior.
- Every case is a complete, runnable flow: precondition or navigation, surrounding valid data, the action under test, then the check. Avoid lone-step cases such as "count the columns". The case must run on its own, including under Run with AI.
- Cover the happy path and its edge cases for every feature. Add boundary and negative variants. Do not stop at the positive path.
- Quote expected error and UI strings from the requirement word for word, including source typos. Flag a suspected typo in a separate note. Do not correct it in the expected result.

## Practical Rules

- Do not create redundant tests that use the same partition and expect the same behavior.
- Prefer fewer strong tests over many shallow tests.
- Mark P0 for revenue, checkout, account, data-loss, or broken-entry-point risks.
- Mark P1 for important catalog, filter, sort, and traceability behaviors.
- Mark P2 for cosmetic, footer, secondary navigation, or low-risk edge cases.
- If a test is mostly exploratory or visual, say so and list the evidence it needs.
- Judge a generated case by whether it fails when the behavior breaks. A count of cases is no evidence of coverage.

## When an AI Drafts the Cases

- Check every expected result against the requirement text. Do not accept it because it reads well.
- Keep customer data out of prompts.
- Record that the case was AI-drafted, in the description or a tag, so reviewers know.

## Testing AI Features

Products such as Kai and Run with AI can return different output for the same input. Plan for that.

- Metamorphic relations: change the input in a way that should not change the answer, such as rewording a question, and compare the outputs.
- Statistical pass thresholds: run the same case several times. Set the pass rate you accept before the run. One green run proves little.
- Red-team prompts: add cases for prompt injection, unsafe requests, and requests outside scope.
- Drift checks: rerun a fixed set of cases after a model or prompt change and compare against the earlier results.
