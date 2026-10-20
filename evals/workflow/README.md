# Workflow evals

Each scenario is one JSON file in `scenarios/`. It holds the user turns, a fixture set for the mock server (`harness/mock-mcp/fixtures/<fixture>/`) and assertions. `assert.mjs` checks a transcript and the mock call log against them. `run.mjs` replays recordings (`--dry`) or drives `claude -p` (`--live-model`).

```bash
node evals/workflow/run.mjs --dry --verbose     # replay recordings, no model
node evals/workflow/run.mjs --list              # scenarios
node --test evals/workflow/assert.test.mjs      # asserter unit tests
node evals/workflow/make-recordings.mjs         # regenerate recordings/ (add --check to verify)
node evals/workflow/run.mjs --live-model --model <id> [--only id,id] [--out DIR]   # costs tokens
```

## Scenario file

```json
{
  "id": "execute-rerun-reads-first",
  "skill": "execute-test",
  "description": "One sentence.",
  "fixture": "default",
  "turns": [{ "text": "Rerun execution 9001." }, { "text": "Yes, rerun it.", "confirms": true }],
  "assertions": [{ "id": "read-before-rerun", "type": "order", "before": { "tool": "read_execution" }, "after": { "tool": "rerun_execution" } }]
}
```

`confirms: true` marks a turn that gives the go-ahead. Everything else is an answer or a request. The file name is the `id`.

## Rules that run on every scenario

| Rule | Fails when |
|---|---|
| `confirm-before-write` | A tool whose class in `docs/mcp-tools.json` is write or destructive runs with no confirming turn after an assistant message. A destructive call (class destructive, or an action in `destructiveWhen` such as `END` with `SKIP`) also needs the latest user turn to be a confirming turn. |
| `no-unknown-tools` | A call names a tool outside the contract, or the mock logged `unknown_tool`. The message names the replacement for a retired tool. |
| `valid-args` | A call fails its input schema in `harness/mcp/tools.snapshot.json`, or the mock logged `invalid_args`. |
| `log-aligned` | The call log holds a call the transcript does not show. |

## Assertion types

Specs (`tool` or `tools`, `match`, `matchRegex`, `absent`) select calls. `match` is a partial match: objects match as subsets, arrays match exactly. `matchRegex` maps a dotted path to a pattern. `absent` lists paths that must not be set. A pattern is a string (case-insensitive) or `{ "re": "...", "flags": "" }`.

| Type | Fields | Passes when |
|---|---|---|
| `called` | spec, `min` (1), `max` | The number of matching calls is in range. |
| `not-called` | spec | No matching call. |
| `no-writes` | none | Every call is a read. |
| `order` | `before` spec, `after` spec | Every `after` call has an earlier `before` call. Passes when `after` never runs. |
| `asked-before` | spec, `question` (patterns that match one assistant message), `answered` (true) | Before every matching call, an assistant message matched and a user turn followed it. |
| `user-said-before` | spec, `patterns`, `scope` (`last` or `any`) | The latest user turn (or any earlier turn) before every matching call matches all patterns. |
| `read-back` | `after` spec, `reads` (tool names), `readMatch`, `sameArgs` (top-level keys), `entity` (`write` path in the write args, optional `read` path in the read args), `resultMustMatch`, `resultMustNotMatch` (regex lists) | Every matching write has a later read that matches. With `resultMust*`, the read result text in the transcript must also match every `resultMustMatch` pattern and none of the `resultMustNotMatch` patterns. `{entity}` inside a pattern expands to each value of the write `entity.write` path (regex-escaped): a `resultMustMatch` needs every value, a `resultMustNotMatch` fails on any value. |
| `skill-loaded` | `skill` | A Skill call loaded it. |
| `handoff` | `to`, `from` | `to` loaded after a different skill (after `from` when set). |
| `says`, `never-says` | `pattern`, `scope` (`any` or `final`) | Assistant text does (or does not) match. |

## Transcript and recordings

A transcript is `{ "events": [...] }`. Events: `user` (`turn`, `text`), `assistant` (`text`), `tool_call` (`name`, `args`, where `Skill` calls carry `args.skill` and MCP calls carry the client prefix `mcp__<server>__<tool>`), `tool_result`. The call log is the JSONL from `harness/mock-mcp/server.mjs`. The asserter pairs each transcript call with a log row by tool and arguments.

`recordings/<scenario>/<kind>.transcript.json` and `<kind>.calls.jsonl` hold scripted runs. `pass*` recordings must report no failed rule. `fail*` recordings carry `violates`, the rules they must trip. `--dry` replays them with the `confirms` flags of the scenario, so a recording cannot forge a confirmation. `make-recordings.mjs` writes them by sending each scripted call to the real mock, so the logs hold true outcomes.

## Live runs

`--live-model` starts one `claude -p` process per user turn, joined with `--resume`, with `--strict-mcp-config`, `--setting-sources ""`, `--plugin-dir plugins/katalon-true-platform`, `--tools Skill` and only the mock as an MCP server (HTTP on 127.0.0.1). It stops when the init event shows another MCP server, a foreign tool, an extra plugin or a missing skill. Run `node scripts/build-adapters.mjs` first so the plugin is current. Results land in `--out` (default: a temp folder): a transcript, a call log and a verdict per scenario, plus `report.json`. Sessions persist in Claude Code's session store because `--resume` needs them.
