# Output-quality evals

Routing evals ask whether an agent picks the right skill. These evals ask whether the answer is good once it has. They cover the six skills that produce an artifact: `create-test-cases`, `test-review`, `release-analyze`, `test-estimation`, `test-case-to-playwright` and `analyze-failures`.

Every check is binary. A check passes or fails. No check gives a score, and the optional judge never gives one either.

## What is in a skill folder

| Path | Content |
|---|---|
| `<skill>/rubric.json` | The binary checks. Each has an `id`, a `type`, `params`, a `desc`, and an optional `when` key |
| `<skill>/scenarios/s1.json` to `s3.json` | One scenario each: `prompt`, `fixture`, and an `expect` object the rubric reads |
| `<skill>/fixtures/` | The context file for each scenario: what the platform returned, plus the user's answers. All data is fictional |
| `<skill>/golden/good.sN.md` | An output that passes every applicable check |
| `<skill>/golden/defective.s1.md` | An output with planted defects |
| `<skill>/golden/defects.json` | The check ids the defective output must fail, and no others |

## Check one output

Give the agent the scenario `prompt` and the fixture as context. Do not give it a live Katalon tool. Save its final message to a file, then run:

```bash
node evals/quality/check.mjs --skill release-analyze --scenario s1 --output out.md
```

Each line shows `PASS`, `FAIL` or `SKIP` with the reason. A `SKIP` means the scenario does not set the key the check needs. The exit code is 1 when any check fails and 2 on a usage error. A JSON output works too: `Verdict` and similar labels read the top-level keys. Add `--json` for machine output.

```bash
node evals/quality/check.mjs --list          # skills, check counts, scenarios
node evals/quality/check.mjs --self-test     # the golden samples, no model
node --test evals/quality/quality.test.mjs   # the full self-test suite
```

## What the deterministic checks cover

- Format: the template labels are present, and the verdict and confidence words come from the allowed list.
- Case shape: name charset, unique names, a pre-condition, a full flow of three or more steps, one action per step, no vague expected result, one case per input class.
- Grounding: every case key, defect key, execution ID and stack frame in the output exists in the fixture. Expected strings match the requirement character for character.
- Rules of the skill: no write before confirmation, no `Ready` with an open blocker, a signal from fewer than 10 runs labelled unconfirmed, an all-zero stability result cross-checked, no defect for an automation failure, retries off in a repeat check, no secret in code.
- Arithmetic: the five estimation buckets add up to the Likely total, and Best, Likely and Worst do not decrease.
- House style: no em dash.

Deterministic checks catch what a person could check with a regex and a calculator. They do not tell you the answer is wise. Use the judge for that.

## Compare two outputs with the judge

The judge is optional. It needs a command that calls a model. Set `QUALITY_JUDGE_CMD` to a template. The script replaces `{prompt_file}` with the path of the judge prompt, and also sends the prompt on stdin. The command prints one JSON object:

```json
{"weights": {"a_much_better": 0.0, "a_better": 0.1, "tie": 0.2, "b_better": 0.6, "b_much_better": 0.1}}
```

```bash
QUALITY_JUDGE_CMD='my-model-cli --json < {prompt_file}' \
  node evals/quality/judge.mjs --skill release-analyze --scenario s1 --a before.md --b after.md
```

The judge follows three rules.

1. It compares two outputs. It never grades one in isolation.
2. It runs both slot orders. Each output sits in slot A once, so a habit of favouring the first answer cancels.
3. It asks for weights over five judgments and takes the expectation. Two near-equal outputs still separate.

The report shows the weighted preference for the first output from -1 to +1, the slot bias, and whether the two orders agree. A result inside plus or minus 0.15 reads as no clear preference. A preference never outranks a failed hard check: the report prints the hard check failures of both outputs first.

Exit codes: 0 done, 2 usage error, 3 `QUALITY_JUDGE_CMD` not set (nothing ran), 4 the judge command failed or its reply did not parse. Run the judge with a model from a different vendor than the one that wrote the outputs.

## Add a scenario

1. Write the fixture in `<skill>/fixtures/` and the scenario in `<skill>/scenarios/`. Put every key the rubric reads in `expect`.
2. List in `idKeys` the `expect` keys that hold IDs, so the self-test confirms each ID exists in the fixture.
3. Write a `good.sN.md` that passes. The self-test runs it.
4. Run `node --test evals/quality/quality.test.mjs`.

To add a check, add an entry to `rubric.json`. Reuse a type from `lib/checks.mjs` when one fits. A new type needs a unit test in `quality.test.mjs`. Plant a defect for it in the defective sample and list the id in `defects.json`.
