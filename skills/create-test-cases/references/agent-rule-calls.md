# Agent rules and Call Test Case steps

Read this when a project agent rule names a shared flow, or when a generated draft carries a call step you did not ask for.

## What happens

An agent rule is a project rule that an admin sets on the Agent Rules screen. Read the rules with `memory_list` and `memory_read`. A rule can say "start every case with the login case".

Since the 2026-11-05 release, a Katalon AI draft gets one Call Test Case step at step 1 when such a rule applies. The step is a call action that points at the shared case, not a plain step. If the prompt names a call itself, the prompt wins over the rule.

## Known gaps

These were open on 2026-11-13. Check for them in every draft.

- A rule that points at a case that does not exist still produces calls to it. The draft can say the rule was applied when the target returns not found.
- A rule that names a case by title only can match the wrong search hit. One draft called the wrong case twice.
- A requirement prompt with a very large attachment (about 2.5 MB) returned a backend timeout twice. Shrink the attachment or paste the text that matters.

## Rules for the agent

1. Before you write a call step, read the target case with `read_test_cases`. If it is missing, stop and tell the user. Do not write a call to a case you could not read.
2. Match a case by its ID, not its title.
3. Count the call steps in the draft. One shared flow gets one call step.
4. When you edit steps later, keep every call step. `UPDATE_CONTENT` replaces all steps and a replacement that drops a call is rejected.
5. To remove a call step on purpose, use `REMOVE_STEPS` with the step number if your tool schema lists it. It needs one approval. If the schema does not list it, send the full remaining step list with `UPDATE_CONTENT` and name the removed call in the preview.
6. A rule is a team convention. Quote it. Do not present it as a platform fact.
