# AI review checklists

Read this when the suite tests a feature that uses a model, or when a model drafted the cases. Both checklists add checks to the normal review. They do not replace it.

The checklists apply two ISTQB syllabi. This file is a working summary for review, not a copy of either syllabus.

- **CT-AI 2.0** (Certified Tester AI Testing, version 2.0, approved 2026-04-17). It is organized around data, models, and the system. It covers model testing (adversarial, metamorphic, drift, A/B, back-to-back), GenAI and LLM testing including exploratory testing and red teaming, and quality characteristics aligned with ISO/IEC 25059. Source: https://istqb.org/istqb-releases-certified-tester-ai-testing-ct-ai-syllabus-version-2-0/ (fetched 2026-10-20).
- **CT-GenAI 1.1** (Certified Tester Testing with Generative AI). It covers prompting, risks (hallucination, reasoning errors, bias, privacy, regulation), and LLM-powered solutions. Source: https://istqb.org/certifications/gen-ai/ (fetched 2026-10-20).

## Contents

- Checklist A: the suite tests an AI feature
- Checklist B: a model drafted the cases
- How findings change the verdict

## Checklist A: the suite tests an AI feature (CT-AI 2.0)

Data
- The cases name the data set they use. It is not "some prompts".
- The data covers the user groups and input kinds the feature serves. Look for slices that are missing.
- The data holds no real customer or personal records.

Model
- Outputs vary between runs. A suite that treats one pass as proof is a weak suite. Look for a repeat-run count and a pass proportion, not a single result.
- The expected result for free-form output is a property or a rubric (contains the order number, stays under a length, refuses a banned request). Exact text equality is a weak oracle for this output.
- Metamorphic cases exist: change the input in a way that must not change the answer (reword, reorder, change case) and check the answer holds.
- Adversarial and malformed inputs exist: prompt injection, empty input, very long input, mixed languages.
- The suite says which model version it ran against. A version change is a reason to rerun it. Drift over time is a reason to rerun it on a schedule.
- A back-to-back comparison with the previous version exists when the team swaps models.

System
- The cases cover what happens when the model is slow, unavailable, or unsure. That includes the fallback text and the way a user reaches a person.
- Guardrail cases exist for content the feature must refuse.
- The team named the quality characteristics it cares about, such as correctness, transparency, and controllability. Each one has at least one case.

Exploratory testing and red teaming
- An exploratory session is planned for the feature. Hand the charter to `exploratory-charter`.
- At least one red-team scenario is named: a user who tries to make the feature break its own rules.

## Checklist B: a model drafted the cases (CT-GenAI 1.1)

- Every expected result was checked against the requirement text by a person. A model can state an invented rule with confidence. Read the requirement with `read_requirement` and compare line by line.
- The cases are not near-duplicates. Models repeat the common path and skip rare paths. Look for missing negative and boundary cases.
- No customer or personal data went into the prompt, and none sits in the case data.
- The case records that a model drafted it. Look for a note in the description, or a tag where the project has tags. Reviewers need to know.
- The case names use only letters, digits, spaces, and `( ) . , _ -`. A model often adds `:` or `/`, which the platform rejects.
- The team's own rules for AI-generated work are met. Ask the user for them. Do not assume them.
- A person reviewed all drafted cases. Skimming a sample is not a review.

## How findings change the verdict

- An expected result in the critical path that nobody checked against the requirement counts as a weak oracle. Give Approve with fixes at best.
- A suite for an AI feature with single-run pass checks only is Approve with fixes at best. Name the repeat-run count you expect.
- Real personal data in cases or prompts is a Reject for pipeline until it is removed.
- Missing provenance on drafted cases is a fix item. It never blocks on its own.
