# Harness

Two files let a model-free test, or a model run in isolation, exercise the skills against Katalon True Platform tools without a real tenant.

| Path | What it holds |
|---|---|
| `mcp/tools.snapshot.json` | The 74 live tool names, descriptions and full input schemas, read from the live connector on 2026-10-20. No tool was called. |
| `mock-mcp/server.mjs` | A zero-dependency MCP server (Node 18 or later) that serves the snapshot, validates every call, answers from fixtures and logs each call. |
| `mock-mcp/fixtures/<scenario>/<tool>.json` | Fixture answers. The `default` scenario covers all 74 tools. |
| `mock-mcp/server.test.mjs` | `node:test` suite: list, valid call, invalid arguments, unknown tool, logging, stdio framing, HTTP. |
| `mock-mcp/mcp.config.json` | Claude Code MCP config that points at the mock over HTTP on localhost. |

```bash
node --test harness/mock-mcp/server.test.mjs      # unit tests, no network
node harness/mock-mcp/server.mjs --check-fixtures  # every fixture file maps to a snapshot tool, default covers all
```

## Snapshot

`docs/mcp-tools.json` stays the classed contract (group, read or write class, notes). The snapshot holds the raw schemas. Both must list the same 74 names, and `server.test.mjs` checks that. Refresh the snapshot when the live `tools/list` changes: read each schema from a connected client, keep the text exactly as returned, set `captured`, then run `node scripts/check-mcp-live.mjs <tools-list.json>` and the mock tests.

## Run the mock

```bash
# Streamable HTTP, POST /mcp on 127.0.0.1 only
MOCK_MCP_LOG=/tmp/mock-calls.jsonl node harness/mock-mcp/server.mjs --http --port 7391

# stdio, newline-delimited JSON-RPC (stdout carries protocol only, notes go to stderr)
MOCK_MCP_LOG=/tmp/mock-calls.jsonl node harness/mock-mcp/server.mjs --stdio
```

| Setting | Flag | Environment | Default |
|---|---|---|---|
| Scenario folder under `fixtures/` | `--scenario` | `MOCK_MCP_SCENARIO` | `default` |
| JSONL call log | `--log` | `MOCK_MCP_LOG` | no log |
| HTTP port, `0` picks a free port | `--port` | `MOCK_MCP_PORT` | `7391` |
| Snapshot file, fixtures folder | `--snapshot`, `--fixtures` | none | the shipped ones |

`GET /health` returns the scenario and tool count. The server accepts `initialize` for old and new clients (it echoes a protocol version it knows) and answers `tools/list` and `tools/call` without it. It rejects requests whose `Origin` header is not localhost.

### What the mock returns

| Case | Response |
|---|---|
| Valid call | Result with `content[0].text` (JSON text) and `structuredContent`, `isError: false`. |
| Arguments fail the input schema | Result with `isError: true` and `structuredContent` `{ error: "INVALID_ARGUMENTS", violations: [{ path, message }] }`. The fixture is never read. |
| Unknown tool name (including retired names) | JSON-RPC error `-32602`, `Unknown tool: <name>`. |
| No fixture entry matches | Result with `isError: true` and `error: "NO_FIXTURE"`. |
| Fixture entry with `"error"` | Result with `isError: true` and `error: "TOOL_ERROR"`. |

The validator covers `type`, `required`, `properties`, `additionalProperties`, `enum`, `const`, `anyOf` (at least one branch must match), `oneOf` (exactly one branch must match), `allOf`, `$ref` to `#/$defs/...`, `items`, `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, `minItems`, `maxItems`, `minLength`, `maxLength`, `pattern` and `format` (`uuid`, `uuid4`, `date-time`, `date`). It does not apply defaults, so a call that omits a defaulted field is valid.

## Fixtures

`fixtures/<scenario>/<tool>.json` is an array of `{ "match": {...}, "result": {...} }`. The first entry whose `match` is a partial subset of the call arguments wins: objects match as subsets, arrays and values match exactly. An entry without `match` is the default for that file. If the scenario file has no matching entry and no default, the server falls back to the same tool file in `default`. To make one tool fail in a scenario, add `{ "match": {...}, "error": "message" }`.

An entry may also carry `"after": { "tool": "<name>", "match": {...} }` to model state after a write. The entry is eligible only when an earlier call to that tool, whose arguments match `after.match` as a partial subset, already succeeded in the same server process. The server keeps that call history in memory and starts empty on every process. Among eligible entries, those with `after` win over those without, then the first match wins. Example: `list_test_cloud_tunnels.json` holds a plain entry with `tun-5d2c` active and an `after` entry on `stop_test_cloud_tunnel` that returns an empty list. A failed call (invalid arguments, fixture error) does not count as history.

The default world is small and consistent across tools:

| Item | Data |
|---|---|
| Projects | 28459 Celestial Web App (key CEL), 28460 Orbit Mobile |
| Repositories | 500 Celestial Web Tests, 501 Celestial API Tests, 502 Orbit Mobile Tests |
| Requirements | CEL-6 to CEL-9. CEL-9 has no linked test case, so a coverage check finds one gap. |
| Test cases | 1001 to 1006, four manual and two automated |
| Suites, collection | 2001 to 2004, collection 3001 Nightly Regression |
| Executions | 9001 failed (result 55001 fails, 55002 passes), 9002 running TestPak, 9003 passed. TestCloud id `tc-exec-7f3a21`. |
| Environments | Desktop browsers, two phones, one local agent, two apps (one dynamic), one tunnel |
| TrueTest | One AUT `celestial-web`, two tracking environments, two sessions, one map with three flows and one uncovered flow (order history CSV export) |
| Memory | Two records, one project convention and one personal preference |

Write tools return success results. Specific matches model the documented quirks: `create_test_case` with `test_case_type: "AUTOMATED"` creates nothing, `update_test_run` END without `unfinished_cases: "SKIP"` is blocked, and a repeated `memory_write` headline returns `duplicate: true`. Fixture answers are shaped like the tool descriptions, not captured from a live tenant, so treat field names beyond the documented ones as mock-only.

## Call log

One JSON object per line:

```json
{"ts":"2026-10-20T09:00:00.000Z","seq":3,"scenario":"default","transport":"http","method":"tools/call","tool":"list_repositories","args":{},"outcome":"invalid_args","violations":[{"path":"/project_id","message":"is required"}],"isError":true}
```

`outcome` is `ok`, `invalid_args`, `unknown_tool`, `no_fixture`, `fixture_error` or `invalid_request`. Successful and fixture-error rows carry `fixture` (file and entry index). Other methods (`initialize`, `tools/list`) are logged with `method` and no `tool`. Assert over rows with `method === "tools/call"`.

## Point Claude Code at the mock

The server name `katalon` gives tool names such as `mcp__katalon__list_projects`. Skills name tools by bare name, so the prefix does not matter to them.

Start the mock, then run a headless session with only the mock as an MCP server:

```bash
MOCK_MCP_LOG=/tmp/mock-calls.jsonl node harness/mock-mcp/server.mjs --http --port 7391 &

claude -p "List the projects I can reach" \
  --mcp-config harness/mock-mcp/mcp.config.json \
  --strict-mcp-config \
  --setting-sources "" \
  --plugin-dir plugins/katalon-true-platform \
  --allowedTools "mcp__katalon__*" "Skill" \
  --max-turns 6 \
  --no-session-persistence
```

For stdio, use an inline config instead of the HTTP file:

```json
{ "mcpServers": { "katalon": { "command": "node", "args": ["harness/mock-mcp/server.mjs", "--stdio"], "env": { "MOCK_MCP_LOG": "/tmp/mock-calls.jsonl" } } } }
```

### Isolation flags

These are the flags `evals/routing/run.mjs` uses, plus the two that connect the mock.

| Flag | Why |
|---|---|
| `--strict-mcp-config` | Ignore every MCP server except the ones in `--mcp-config`. Without it the plugin's own `mcp.json` (the production Katalon URL) can load beside the mock. |
| `--mcp-config harness/mock-mcp/mcp.config.json` | Load only the mock. |
| `--setting-sources ""` | Load no user, project or local settings files, hooks or permissions. |
| `--plugin-dir plugins/katalon-true-platform` | Load only the generated plugin under test. Run `node scripts/build-adapters.mjs` first so it is current. |
| `--allowedTools "mcp__katalon__*" "Skill"` | Allow the mock tools and the Skill tool. For a stricter run, add `--tools Skill` so no file or shell tool exists. |
| `--max-turns N`, `--no-session-persistence` | Bound the run and leave no session on disk. |
| fresh empty working directory | Run from an empty temp folder so the model reads no project files. |

Never put a real tenant connector in the same run. The mock cannot protect a session that also holds live credentials: check the init event of the stream (`--output-format stream-json --verbose`) and confirm that the only MCP server is `katalon` pointing at `127.0.0.1`.
