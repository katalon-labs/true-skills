# Evals

This folder holds three eval families: routing (does the agent pick the right skill), workflow (does it follow the consent and ask-first rules against a mock Katalon MCP server), and quality (do the artifacts it writes meet a rubric). `node scripts/harness.mjs` runs the model-free part of all three. See [Harness runner](#harness-runner).

## Routing eval

An agent picks one of these skills by reading its frontmatter `description` and nothing else. `evals/routing/` measures that choice: for each realistic request, did the agent pick the skill that owns the job, or stay out of the way when no Katalon skill applies? Run it before and after any change to a description, and put the before/after numbers in the pull request.

| file | what it holds |
|---|---|
| `routing/cases.jsonl` | one request per line: `id`, `prompt`, `tags` |
| `routing/labels.jsonl` | the ground truth per case: `accept`, `primary`, `why`. Read by the grader only |
| `routing/POLICY.md` | the rules a label follows, and what each tag means |
| `routing/run.mjs` | the runner: one headless Claude Code call per (case, rep) |
| `routing/score.mjs` | recomputes every number from the raw rows and writes `<variant>/score.md` |
| `routing/_state.json` | split ids, metric declarations, approved harness hash, loop state |

The runner drives the real entry point: `claude -p` with only this repo's generated plugin loaded (`--plugin-dir plugins/katalon-true-platform`), no settings files, no MCP servers, and the Skill tool as the only tool, from one fixed, empty temp directory. The model cannot read files, run commands, or reach a Katalon workspace, so the labels are out of its reach and a case can never touch a real account. It checks on every call that exactly this plugin and all of its skills were loaded, and that the model that answered is the one requested.

### Run it

Requires Node >= 18 and a logged-in Claude Code (`claude` then `/login`).

```bash
node scripts/build-adapters.mjs                  # the runner refuses to measure a stale plugin
node evals/routing/run.mjs --variant baseline --model claude-sonnet-5 --reps 3
node evals/routing/score.mjs
```

The first run stops with exit 2 until a person reviews `run.mjs` and runs it once with `--approve-harness`, which records a hash of the harness in `_state.json`. Any later edit to the harness stops the next run the same way. Rows are appended as cases finish and a re-run resumes at the missing (case, rep) pairs. Failed attempts (auth, timeout, rate limit, a leaked environment) go to `<variant>/errors.jsonl` with a failure class and are never scored.

Zero-cost plumbing checks, useful after editing the grader:

```bash
node evals/routing/run.mjs --flow /tmp/rt-oracle --backend oracle   # must score 100%
node evals/routing/run.mjs --flow /tmp/rt-null --backend null       # must score the share of negatives
```

### Metrics

- `correct` (headline): the picked skill is in the case's `accept` set; for a negative, no Katalon skill fired.
- `exact`: the picked skill is the single `primary` owner.
- `fired`: some Katalon skill was picked; its rate on negatives is the false-trigger rate.
- `score.md` adds miss rate (a positive case got no Katalon skill), wrong-skill rate, rep agreement, per-skill precision and recall, and the most frequent confusions.

Every accuracy carries a 95% interval over cases. A change counts only when its **paired** per-case delta against baseline has an interval that excludes zero.

### Changing a description

The loop follows the `/claude-api hillclimb` method:

1. The case set is split once, at random, stratified by expected owner (`score.mjs --split`). Only train-split transcripts are read when proposing a change. The test split is scored every round and is the number that gets reported.
2. One change per round, described as a behavior ("requests that name a failed run and ask why go to analyze-failures"), never as phrases copied from a failing case.
3. Keep a change only when train and test both improve. Revert it when only train improves (overfit) or anything regresses outside noise.
4. After two or three flat rounds, sort the remaining failures by cause before writing more text: a wrong label, an ambiguous case, a structural overlap between two descriptions, or run-to-run variance.
5. Put the round table and the final test delta with its interval in the pull request. A delta inside the noise band is reported as no change.

Adding cases: follow `POLICY.md`, give every new case a label, and re-draw the split only when the set changes by more than a few cases (old rounds stop being comparable).

## Workflow evals

`evals/workflow/` holds one JSON scenario per file: the user turns, a fixture set for the mock server, and assertions over the call log. Assertions cover these rules:

- No write or run tool runs before a user confirmation turn.
- The agent asks the required questions: `browser_profile_mode`, Run With AI versus TestPak, and a typed yes for a destructive call.
- A write is followed by a read-back.
- Every call names a known tool and passes valid arguments.
- The agent hands off to the right skill.

The runner is `evals/workflow/run.mjs`. It uses the mock server in `harness/mock-mcp/`, which answers from `harness/mock-mcp/fixtures/<scenario>/` and checks every call against the schemas in `harness/mcp/tools.snapshot.json`.

```bash
node scripts/harness.mjs workflow                  # --dry: replay recorded transcripts, no model
node scripts/harness.mjs workflow --live-model     # drive `claude -p` against the mock server
```

`--dry` is the default. It tests the asserter and the scenarios without a model, so CI runs it. `--live-model` starts headless Claude Code calls and needs a logged-in `claude`.

## Quality evals

`evals/quality/` holds, for each artifact skill (`create-test-cases`, `test-review`, `release-analyze`, `test-estimation`, `test-case-to-playwright`, `analyze-failures`), scenarios with fixtures and a rubric of binary checks. Deterministic checks run first: format, atomic case shape, name charset, verdict vocabulary. An optional pairwise judge runs after them, with both slot orders.

```bash
node scripts/harness.mjs quality                   # deterministic self-tests, no model
```

## Harness runner

`scripts/harness.mjs` is the one entry point. A model runs only when you pass `--live-model`.

| command | what it does | model |
|---|---|---|
| `check` | validator, `sync-shared.mjs --check`, `build-adapters.mjs --check`, and a check that `harness/mcp/tools.snapshot.json` and `docs/mcp-tools.json` list the same tool names | no |
| `mock [args]` | starts the mock Katalon MCP server | no |
| `workflow [args]` | workflow evals, `--dry` by default | only with `--live-model` |
| `quality [args]` | output-quality self-tests | no |
| `routing [args]` | checks cases against labels and prints the command for `evals/routing/run.mjs` | only with `--live-model` |
| `test` | `node --test` over every `*.test.mjs` under `harness/` and `evals/` | no |
| `all` | `check`, `workflow` (dry), `quality`, the routing file check, and `test` | no |

A missing harness file stops that command with exit 2 and a message that names the file. `all` treats a missing file as a failure. Pass `--allow-missing` to skip it with a warning while you build a harness piece by piece.

CI runs `node scripts/harness.mjs all` in the `harness` job of `.github/workflows/build-check.yml`.
