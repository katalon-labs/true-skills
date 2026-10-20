// node --test harness/mock-mcp/server.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkFixtures, createMock, lookupFixture, partialMatch, startHttp, validate } from './server.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SERVER = join(HERE, 'server.mjs');
const SNAPSHOT = JSON.parse(readFileSync(join(HERE, '..', 'mcp', 'tools.snapshot.json'), 'utf8'));
const tmp = () => mkdtempSync(join(tmpdir(), 'mock-mcp-'));
const call = (mock, name, args, id = 1) => mock.handle({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } });
const readLog = p => readFileSync(p, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));

test('snapshot has 74 tools with schemas and the contract names', () => {
  assert.equal(SNAPSHOT.captured, '2026-10-20');
  assert.equal(SNAPSHOT.tools.length, 74);
  for (const t of SNAPSHOT.tools) {
    assert.ok(t.description.length > 0, t.name);
    assert.equal(t.inputSchema.type, 'object', t.name);
  }
  const contract = JSON.parse(readFileSync(join(HERE, '..', '..', 'docs', 'mcp-tools.json'), 'utf8'));
  assert.deepEqual(SNAPSHOT.tools.map(t => t.name).sort(), contract.tools.map(t => t.name).sort());
});

test('tools/list returns every snapshot tool', () => {
  const mock = createMock({ logPath: null });
  const res = mock.handle({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
  assert.equal(res.id, 1);
  assert.deepEqual(res.result.tools.map(t => t.name), SNAPSHOT.tools.map(t => t.name));
  assert.ok(res.result.tools.every(t => t.inputSchema && t.description));
});

test('initialize answers old and new clients, and calls work without it', () => {
  const mock = createMock({ logPath: null });
  const modern = mock.handle({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 't', version: '1' } } });
  assert.equal(modern.result.protocolVersion, '2025-11-25');
  assert.ok(modern.result.capabilities.tools);
  const old = mock.handle({ jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: '2024-11-05' } });
  assert.equal(old.result.protocolVersion, '2024-11-05');
  const unknown = mock.handle({ jsonrpc: '2.0', id: 3, method: 'initialize', params: { protocolVersion: '1999-01-01' } });
  assert.ok(unknown.result.protocolVersion);
  assert.equal(mock.handle({ jsonrpc: '2.0', method: 'notifications/initialized' }), null);
  const fresh = createMock({ logPath: null });
  assert.equal(call(fresh, 'list_projects', {}).result.isError, false); // no initialize first
  assert.deepEqual(fresh.handle({ jsonrpc: '2.0', id: 9, method: 'ping' }).result, {});
  assert.equal(fresh.handle({ jsonrpc: '2.0', id: 10, method: 'nope' }).error.code, -32601);
});

test('valid call returns fixture data as text and structuredContent', () => {
  const mock = createMock({ logPath: null });
  const res = call(mock, 'find_requirements', { project_id: 28459 });
  assert.equal(res.result.isError, false);
  assert.ok(res.result.structuredContent.items.some(r => r.key === 'CEL-6'));
  assert.deepEqual(JSON.parse(res.result.content[0].text), res.result.structuredContent);
});

test('fixture match picks the specific entry, then the default', () => {
  const mock = createMock({ logPath: null });
  const covered = call(mock, 'find_test_cases_by_requirement', { project_id: 28459, key: 'CEL-6' }).result.structuredContent;
  const uncovered = call(mock, 'find_test_cases_by_requirement', { project_id: 28459, key: 'CEL-9' }).result.structuredContent;
  assert.equal(covered.items.length, 2);
  assert.equal(uncovered.items.length, 0);
  const manual = call(mock, 'create_test_run', { mode: 'manual', name: 'r' }).result.structuredContent;
  const auto = call(mock, 'create_test_run', { mode: 'automated', name: 'r' }).result.structuredContent;
  assert.ok(manual.manualExecutionId);
  assert.equal(auto.status, 'QUEUED');
  assert.equal(call(mock, 'create_test_case', { project_id: 1, repository_id: 2, test_case_type: 'AUTOMATED', test_case: validCase() }).result.structuredContent.created, false);
});

test('a scenario overrides one tool and falls back to default for the rest', () => {
  const dir = tmp();
  mkdirSync(join(dir, 'default'));
  mkdirSync(join(dir, 'scn'));
  writeFileSync(join(dir, 'default', 'list_projects.json'), JSON.stringify([{ result: { projects: ['default'] } }]));
  writeFileSync(join(dir, 'default', 'list_repositories.json'), JSON.stringify([{ result: { repositories: ['default'] } }]));
  writeFileSync(join(dir, 'scn', 'list_projects.json'), JSON.stringify([{ result: { projects: [] } }]));
  const mock = createMock({ logPath: null, scenario: 'scn', fixturesDir: dir });
  assert.deepEqual(call(mock, 'list_projects', {}).result.structuredContent.projects, []);
  assert.deepEqual(call(mock, 'list_repositories', { project_id: 1 }).result.structuredContent.repositories, ['default']);
  assert.equal(lookupFixture({ fixturesDir: join(HERE, 'fixtures'), scenario: 'absent', tool: 'list_projects', args: {} }).source, 'default/list_projects.json#0');
});

test('scenario file with no matching entry falls back to the default scenario file', () => {
  const dir = tmp();
  mkdirSync(join(dir, 'default'));
  mkdirSync(join(dir, 'scn'));
  writeFileSync(join(dir, 'default', 'list_repositories.json'), JSON.stringify([{ result: { from: 'default' } }]));
  writeFileSync(join(dir, 'scn', 'list_repositories.json'), JSON.stringify([{ match: { project_id: 7 }, result: { from: 'scn' } }]));
  const hit = lookupFixture({ fixturesDir: dir, scenario: 'scn', tool: 'list_repositories', args: { project_id: 7 } });
  const miss = lookupFixture({ fixturesDir: dir, scenario: 'scn', tool: 'list_repositories', args: { project_id: 8 } });
  assert.equal(hit.entry.result.from, 'scn');
  assert.equal(miss.entry.result.from, 'default');
});

test('fixture error entries and missing fixtures become tool errors', () => {
  const dir = tmp();
  mkdirSync(join(dir, 'default'));
  writeFileSync(join(dir, 'default', 'list_projects.json'), JSON.stringify([{ error: 'tenant is read-only' }]));
  writeFileSync(join(dir, 'default', 'list_repositories.json'), JSON.stringify([{ match: { project_id: 1 }, result: {} }]));
  const mock = createMock({ logPath: null, fixturesDir: dir });
  const err = call(mock, 'list_projects', {}).result;
  assert.equal(err.isError, true);
  assert.match(err.content[0].text, /tenant is read-only/);
  const none = call(mock, 'list_repositories', { project_id: 2 }).result;
  assert.equal(none.isError, true);
  assert.equal(none.structuredContent.error, 'NO_FIXTURE');
  assert.equal(call(mock, 'list_test_cloud_tunnels', { project_id: 2 }).result.structuredContent.error, 'NO_FIXTURE');
});

test('invalid arguments return a tool error with violations and never reach a fixture', () => {
  const mock = createMock({ logPath: null });
  const missing = call(mock, 'list_repositories', {}).result;
  assert.equal(missing.isError, true);
  assert.equal(missing.structuredContent.error, 'INVALID_ARGUMENTS');
  assert.deepEqual(missing.structuredContent.violations, [{ path: '/project_id', message: 'is required' }]);

  const extra = call(mock, 'list_repositories', { project_id: 1, color: 'red' }).result.structuredContent.violations;
  assert.deepEqual(extra, [{ path: '/color', message: 'is not an allowed property' }]);

  const wrongType = call(mock, 'list_repositories', { project_id: '28459' }).result.structuredContent.violations;
  assert.match(wrongType[0].message, /expected integer, got string/);

  const badEnum = call(mock, 'memory_write', { headline: 'h', body: 'b', kind: 'bogus' }).result.structuredContent.violations;
  assert.equal(badEnum[0].path, '/kind');
  assert.match(badEnum[0].message, /must be one of/);

  const badUuid = call(mock, 'confirm_artifact_upload', { artifact_id: 'not-a-uuid' }).result.structuredContent.violations;
  assert.deepEqual(badUuid, [{ path: '/artifact_id', message: 'must be a valid uuid' }]);

  const badTime = call(mock, 'build_schedule', { start_time: 'tomorrow', time_zone: 'UTC' });
  assert.equal(badTime.result.isError, false); // build_schedule takes plain strings
  const badDateTime = call(mock, 'search_truetest_sessions', { project_id: 1, client_code: 'c', start_time: 'yesterday', end_time: '2026-10-02T00:00:00Z' }).result.structuredContent.violations;
  assert.equal(badDateTime[0].path, '/start_time');

  const tooMany = call(mock, 'create_truetest_test_case_from_session', { project_id: 1, client_code: 'c', tracking_environment_id: '0ec3c0b5-3a27-4c94-997b-dc89aa82f3cc', session_references: [] }).result.structuredContent.violations;
  assert.match(tooMany[0].message, /at least 1 items/);
  const nonObject = call(mock, 'list_projects', 'oops').result.structuredContent.violations;
  assert.match(nonObject[0].message, /arguments must be an object/);
});

test('invalid arguments in nested unions and refs are reported', () => {
  const mock = createMock({ logPath: null });
  const badAction = call(mock, 'manage_test_suite', { project_id: 1, repository_id: 2, payload: { action: 'EXPLODE', id: 3 } }).result.structuredContent.violations;
  assert.equal(badAction[0].path, '/payload');
  assert.match(badAction[0].message, /none of the/);
  const wrongTunnel = call(mock, 'build_private_local_testing_config', { mode: 'tunnel', selected_tunnel: 5 }).result.structuredContent.violations;
  assert.equal(wrongTunnel[0].path, '/selected_tunnel');
  const refBad = call(mock, 'update_schedule_configuration', { project_id: 1, updates: [{ schedule_id: 4001, changes: { ksVersion: 'latest' } }] }).result;
  assert.equal(refBad.isError, true); // bare string is not one of the three shapes
  const refOk = call(mock, 'update_schedule_configuration', { project_id: 1, updates: [{ schedule_id: 4001, changes: { ksVersion: { selection: 'exact', version: '10.4.3' } } }] }).result;
  assert.equal(refOk.isError, false);
  const minItems = call(mock, 'update_schedule_configuration', { project_id: 1, updates: [] }).result.structuredContent.violations;
  assert.match(minItems[0].message, /at least 1 items/);
  const refEnum = call(mock, 'update_schedule_configuration', { project_id: 1, updates: [{ schedule_id: 4001, changes: { testType: 'MANUAL' } }] }).result;
  assert.equal(refEnum.isError, true);
});

test('unknown tool is a JSON-RPC error', () => {
  const mock = createMock({ logPath: null });
  const res = call(mock, 'delete_everything', {});
  assert.equal(res.id, 1);
  assert.equal(res.error.code, -32602);
  assert.match(res.error.message, /Unknown tool: delete_everything/);
  assert.equal(res.result, undefined);
  const retired = call(mock, 'create_manual_test_run', {});
  assert.equal(retired.error.code, -32602);
});

test('every call is logged as JSONL with outcome and arguments', () => {
  const log = join(tmp(), 'nested', 'calls.jsonl');
  const mock = createMock({ logPath: log, scenario: 'default' });
  call(mock, 'list_projects', {}, 1);
  call(mock, 'list_repositories', {}, 2);
  call(mock, 'nope', { a: 1 }, 3);
  mock.handle({ jsonrpc: '2.0', id: 4, method: 'tools/list' });
  const rows = readLog(log);
  assert.equal(rows.length, 4);
  assert.deepEqual(rows.map(r => r.seq), [1, 2, 3, 4]);
  assert.deepEqual(rows.map(r => r.outcome), ['ok', 'invalid_args', 'unknown_tool', 'ok']);
  assert.equal(rows[0].tool, 'list_projects');
  assert.equal(rows[0].fixture, 'default/list_projects.json#0');
  assert.equal(rows[0].scenario, 'default');
  assert.deepEqual(rows[1].violations, [{ path: '/project_id', message: 'is required' }]);
  assert.deepEqual(rows[2].args, { a: 1 });
  assert.equal(rows[3].method, 'tools/list');
  assert.ok(rows.every(r => typeof r.ts === 'string'));
});

test('MOCK_MCP_LOG and MOCK_MCP_SCENARIO are read from the environment', async () => {
  const log = join(tmp(), 'env.jsonl');
  const child = spawn(process.execPath, [SERVER, '--stdio'], { env: { ...process.env, MOCK_MCP_LOG: log, MOCK_MCP_SCENARIO: 'default' }, stdio: ['pipe', 'pipe', 'pipe'] });
  const out = await exchange(child, [{ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'list_projects', arguments: {} } }]);
  assert.equal(out[0].result.isError, false);
  assert.equal(readLog(log)[0].tool, 'list_projects');
});

function exchange(child, messages, { expect = messages.filter(m => m.id !== undefined).length, split = false } = {}) {
  return new Promise((resolveEx, reject) => {
    let buf = '';
    const lines = [];
    const timer = setTimeout(() => { child.kill(); reject(new Error(`timeout, got ${lines.length}/${expect}`)); }, 8000);
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', d => {
      buf += d;
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        lines.push(buf.slice(0, nl)); buf = buf.slice(nl + 1);
        if (lines.length >= expect) { clearTimeout(timer); child.kill(); resolveEx(lines.map(l => JSON.parse(l))); return; }
      }
    });
    child.on('error', reject);
    const payload = messages.map(m => `${JSON.stringify(m)}\n`).join('');
    if (split) { const mid = Math.floor(payload.length / 2); child.stdin.write(payload.slice(0, mid)); setTimeout(() => child.stdin.write(payload.slice(mid)), 30); }
    else child.stdin.write(payload);
  });
}

test('stdio: newline-delimited framing, batched writes, split writes, notifications', async () => {
  const msgs = [
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } },
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    { jsonrpc: '2.0', id: 2, method: 'tools/list' },
    { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'list_projects', arguments: {} } },
  ];
  const all = await exchange(spawn(process.execPath, [SERVER, '--stdio'], { stdio: ['pipe', 'pipe', 'pipe'] }), msgs);
  assert.deepEqual(all.map(r => r.id), [1, 2, 3]); // the notification produced no line
  assert.equal(all[1].result.tools.length, 74);
  const split = await exchange(spawn(process.execPath, [SERVER, '--stdio'], { stdio: ['pipe', 'pipe', 'pipe'] }), msgs, { split: true });
  assert.deepEqual(split.map(r => r.id), [1, 2, 3]);
});

test('stdio: stdout holds protocol only, CRLF is tolerated, bad JSON gets -32700', async () => {
  const child = spawn(process.execPath, [SERVER, '--stdio'], { stdio: ['pipe', 'pipe', 'pipe'] });
  const p = new Promise(r => {
    let buf = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', d => { buf += d; if (buf.split('\n').filter(Boolean).length >= 2) { child.kill(); r(buf); } });
  });
  child.stdin.write('{not json}\r\n');
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 7, method: 'ping' })}\r\n`);
  const raw = await p;
  const rows = raw.split('\n').filter(Boolean).map(l => JSON.parse(l)); // every stdout line is JSON
  assert.equal(rows[0].error.code, -32700);
  assert.equal(rows[0].id, null);
  assert.equal(rows[1].id, 7);
  assert.ok(!raw.includes('\n\n'));
});

test('stdio: one response per line even when text contains newlines', async () => {
  const [res] = await exchange(spawn(process.execPath, [SERVER, '--stdio'], { stdio: ['pipe', 'pipe', 'pipe'] }),
    [{ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'list_projects', arguments: {} } }]);
  assert.ok(res.result.content[0].text.includes('\n')); // pretty-printed text survives inside the JSON string
});

test('http: POST /mcp serves initialize, tools/list and tools/call', async () => {
  const log = join(tmp(), 'http.jsonl');
  const mock = createMock({ logPath: log, transport: 'http' });
  const s = await startHttp(mock, { port: 0 });
  try {
    const post = (body, headers = {}) => fetch(s.url, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...headers }, body: JSON.stringify(body) });
    const init = await (await post({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } })).json();
    assert.equal(init.result.serverInfo.name, 'mock-katalon-mcp');
    const list = await (await post({ jsonrpc: '2.0', id: 2, method: 'tools/list' })).json();
    assert.equal(list.result.tools.length, 74);
    const ok = await (await post({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'list_projects', arguments: {} } })).json();
    assert.equal(ok.result.structuredContent.projects.length, 2);
    const bad = await (await post({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'list_repositories', arguments: {} } })).json();
    assert.equal(bad.result.isError, true);
    const unknown = await (await post({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'zzz', arguments: {} } })).json();
    assert.equal(unknown.error.code, -32602);
    const note = await post({ jsonrpc: '2.0', method: 'notifications/initialized' });
    assert.equal(note.status, 202);
    const batch = await (await post([{ jsonrpc: '2.0', id: 6, method: 'ping' }, { jsonrpc: '2.0', method: 'notifications/initialized' }, { jsonrpc: '2.0', id: 7, method: 'ping' }])).json();
    assert.deepEqual(batch.map(r => r.id), [6, 7]);
    const sse = await post({ jsonrpc: '2.0', id: 8, method: 'ping' }, { accept: 'text/event-stream' });
    assert.match(sse.headers.get('content-type'), /text\/event-stream/);
    assert.match(await sse.text(), /^event: message\ndata: \{.*"id":8.*\}\n\n$/s);
    const parse = await fetch(s.url, { method: 'POST', body: '{nope' });
    assert.equal(parse.status, 400);
    assert.equal((await parse.json()).error.code, -32700);
    assert.equal((await fetch(s.url)).status, 405);
    assert.equal((await fetch(`http://127.0.0.1:${s.port}/other`)).status, 404);
    assert.equal((await (await fetch(`http://127.0.0.1:${s.port}/health`)).json()).tools, 74);
    const evil = await post({ jsonrpc: '2.0', id: 9, method: 'ping' }, { origin: 'https://evil.example' });
    assert.equal(evil.status, 403);
    const local = await post({ jsonrpc: '2.0', id: 10, method: 'ping' }, { origin: 'http://localhost:3000' });
    assert.equal(local.status, 200);
    assert.ok(readLog(log).some(r => r.tool === 'list_projects' && r.transport === 'http' && r.outcome === 'ok'));
  } finally { await s.close(); }
});

test('validator: unions, nullable, bounds, patterns, formats', () => {
  const nullable = { anyOf: [{ type: 'integer' }, { type: 'null' }] };
  assert.deepEqual(validate(nullable, null), []);
  assert.equal(validate(nullable, 'x').length, 1);
  assert.deepEqual(validate({ type: 'object', required: ['a'], properties: { a: { type: 'array', maxItems: 2, items: { type: 'string', minLength: 2, maxLength: 3 } } } }, { a: ['ab', 'abc'] }), []);
  assert.equal(validate({ type: 'array', maxItems: 1 }, [1, 2]).length, 1);
  assert.equal(validate({ type: 'string', minLength: 2 }, 'a').length, 1);
  assert.equal(validate({ type: 'string', maxLength: 2 }, 'abc').length, 1);
  assert.equal(validate({ type: 'integer', exclusiveMinimum: 0 }, 0).length, 1);
  assert.deepEqual(validate({ type: 'integer', exclusiveMinimum: 0 }, 1), []);
  assert.equal(validate({ type: 'integer', minimum: 1, maximum: 5 }, 6).length, 1);
  assert.equal(validate({ type: 'integer' }, 1.5).length, 1);
  assert.deepEqual(validate({ type: 'number' }, 2), []);
  assert.equal(validate({ const: 'x' }, 'y').length, 1);
  assert.equal(validate({ type: 'string', pattern: '^[\\w .-]+$' }, 'bad/name').length, 1);
  assert.deepEqual(validate({ type: 'string', pattern: '^[\\w .-]+$' }, 'good name.png'), []);
  assert.deepEqual(validate({ type: 'string', format: 'uuid' }, '0ec3c0b5-3a27-4c94-997b-dc89aa82f3cc'), []);
  assert.equal(validate({ type: 'string', format: 'uuid4' }, '0ec3c0b5-3a27-1c94-997b-dc89aa82f3cc').length, 1);
  assert.deepEqual(validate({ type: 'string', format: 'date-time' }, '2026-10-21T18:00:00+07:00'), []);
  assert.equal(validate({ type: 'string', format: 'date-time' }, '2026-10-21 18:00').length, 1);
  assert.equal(validate({ type: 'string', format: 'date' }, '2026-13-40').length, 1);
  const one = { oneOf: [{ properties: { k: { const: 'a' } }, required: ['k'] }, { properties: { k: { const: 'b' } }, required: ['k'] }] };
  assert.deepEqual(validate(one, { k: 'b' }), []);
  assert.equal(validate(one, { k: 'c' }).length, 1);
  const overlap = { oneOf: [{ type: 'string' }, { type: 'string', minLength: 1 }] };
  assert.equal(validate(overlap, 'x').length, 1);
  assert.deepEqual(validate({ oneOf: [{ type: 'string' }, { type: 'integer' }] }, 'x'), []);
  assert.deepEqual(validate({ anyOf: [{ type: 'string' }, { type: 'string', minLength: 1 }] }, 'x'), []);
  assert.deepEqual(validate({ type: 'object', additionalProperties: { type: 'integer' } }, { a: 1 }), []);
  assert.equal(validate({ type: 'object', additionalProperties: { type: 'integer' } }, { a: 'x' }).length, 1);
  assert.deepEqual(validate({ $ref: '#/$defs/A', $defs: { A: { type: 'string' } } }, 'ok'), []);
});

test('validator accepts realistic calls to the write and run tools', () => {
  const schema = name => SNAPSHOT.tools.find(t => t.name === name).inputSchema;
  const valid = {
    create_test_case: { project_id: 28459, repository_id: 500, test_case: validCase() },
    create_test_run: { mode: 'manual', name: 'Auth TestPak', project_id: 28459, manual: { test_suite_ids: [2001], aut_environment_id: 411, os: 'linux' } },
    create_test_run_auto: { __tool: 'create_test_run', mode: 'automated', name: 'Nightly', project_id: 28459, test_project_id: 500, automated: { test_run_type: 'DESKTOP_AND_MOBILE_BROWSER', test_suite_id: 2003, profile_id: 201, configurations: { agentType: 'TEST_CLOUD_AGENT', browser: 'chrome', browserType: 'CHROME', browserVersion: 'latest', os: 'windows', osVersion: '11', metadata: { browserVersionType: 'stable' } } }, schedule: { repeatEnable: false, startTime: '2026-10-21T18:00:00+07:00', timeZone: 'Asia/Ho_Chi_Minh', active: true } },
    update_test_run: { execution_id: 9101, update: { action: 'START', execution_mode: 'KATALON_AI', browser_profile_mode: 'SHARED', configuration: { default_aut_environment_url: 'https://example.com' } } },
    update_test_results: { project_id: 28459, execution_id: 9101, update: { test_type: 'MANUAL', operation: 'RECORD', test_case_id: 1001, status: 'FAILED', steps: [{ step_number: 2, status: 'FAILED', actual_result: 'No email arrived' }], evidence: [{ artifact_id: '07b8c9d0-e1f2-4a3b-8c5d-6e7f8091a2b3' }] } },
    update_test_cases: { project_id: 28459, repository_id: 500, updates: [{ action: 'UPDATE_STATUS', test_case_data: { id: 1004, status: 'IN_REVIEW' } }, { action: 'UPDATE_CONTENT', test_case_data: { id: 1004, content: { steps: [{ name: 'Open', context: { expectedResult: 'Opened' } }] } } }] },
    manage_test_suite: { project_id: 28459, repository_id: 500, payload: { action: 'CREATE', name: 'Smoke Tests', path: 'Test Suites/Regression', testSuiteTestType: 'MANUAL', testCaseIds: [1, 2] } },
    manage_test_folder: { project_id: 28459, repository_id: 500, payload: { action: 'MOVE', id: 456, path: 'Test Cases/Moved' } },
    find_test_cases: { project_id: 28459, repository_id: 500, filter: { filter_type: 'COMMON', folder: { folder_id: 304, include_subfolders: true }, query: { where: { kind: 'comparison', field: 'status', op: '==', value: 'DRAFT' } } } },
    find_iterations: { project_id: 28459, filter: { type: 'Sprint', scope: 'LAST_N', n: 3 } },
    find_test_results: { filter: { filter_type: 'EXECUTION', execution_id: 9001, status: 'FAILED' }, project_id: 28459 },
    fetch_test_stability_metrics: { project_id: 28459, filter_type: 'ITERATION', iteration_type: 'SPRINT', iteration_name: 'Sprint 42', return_tests: ['FLAKY', 'SLOW'] },
    fetch_defect_metrics: { project_id: 28459, filter: { filter_type: 'DATE_RANGE', from_date: '2026-10-01', to_date: '2026-10-20' } },
    manage_test_cloud_dynamic_app: { project_id: 28459, payload: { action: 'UPDATE', app_id: 'a', pointer_app_id: 'b', app_name: 'c' } },
    prepare_artifact_upload: { upload: { filename: 'failure.png', mime_type: 'image/png', content_length: 90112 } },
    create_defect: { project_id: 28459, alm_integration_id: 11, alm_connection_id: 12, test_result_id: 55001, payload: { summary: 'Defect for Login lockout' } },
    search_truetest_sessions: { project_id: 28459, client_code: 'celestial-web', start_time: '2026-10-01T00:00:00Z', end_time: '2026-10-02T00:00:00Z', url_patterns: ['/checkout'], attributes: [{ name: 'serviceGroup', value: 'Checkout' }] },
    create_truetest_test_case_from_flow: { project_id: 28459, client_code: 'celestial-web', map_id: '6f1c2d3e-4a5b-4c6d-8e7f-0a1b2c3d4e5f', flow_id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e' },
    update_schedule_configuration: { project_id: 28459, updates: [{ schedule_id: 4001, changes: { schedule: { repeatEnable: true, startTime: '2026-10-22T18:00:00+07:00', interval: 1, intervalUnit: 'DAY', timeZone: 'Asia/Ho_Chi_Minh' }, runConfigurationEntries: [{ entityType: 'TEST_SUITE', entityId: 2003, profileId: 201, testProjectId: 500, configurations: [{ agentType: 'TEST_CLOUD_AGENT', browser: 'chrome', os: 'windows', osVersion: '11', metadata: { browserVersionType: 'stable' } }] }] } }] },
  };
  for (const [key, args] of Object.entries(valid)) {
    const { __tool, ...rest } = args;
    const tool = __tool || key;
    assert.deepEqual(validate(schema(tool), rest), [], tool);
  }
});

test('partialMatch matches objects as subsets and arrays exactly', () => {
  assert.ok(partialMatch({ a: 1 }, { a: 1, b: 2 }));
  assert.ok(!partialMatch({ a: 2 }, { a: 1 }));
  assert.ok(partialMatch({ p: { q: 'x' } }, { p: { q: 'x', r: 1 } }));
  assert.ok(partialMatch({ ids: [1, 2] }, { ids: [1, 2] }));
  assert.ok(!partialMatch({ ids: [1] }, { ids: [1, 2] }));
  assert.ok(!partialMatch({ a: 1 }, null));
});

function afterFixtures() {
  const dir = tmp();
  mkdirSync(join(dir, 'default'), { recursive: true });
  const put = (tool, entries) => writeFileSync(join(dir, 'default', `${tool}.json`), JSON.stringify(entries));
  put('list_test_cloud_tunnels', [
    { result: { tunnels: [{ id: 'tun-1', status: 'ACTIVE' }, { id: 'tun-2', status: 'ACTIVE' }] } },
    { after: { tool: 'stop_test_cloud_tunnel', match: { tunnel_id: 'tun-1' } }, result: { tunnels: [{ id: 'tun-2', status: 'ACTIVE' }] } },
  ]);
  put('stop_test_cloud_tunnel', [{ result: { stopped: true } }]);
  return dir;
}
const tunnelIds = res => res.result.structuredContent.tunnels.map(t => t.id);

test('after: an entry is ineligible until a matching earlier call succeeded, then it wins over plain entries', () => {
  const mock = createMock({ logPath: null, fixturesDir: afterFixtures() });
  assert.deepEqual(tunnelIds(call(mock, 'list_test_cloud_tunnels', { project_id: 1 })), ['tun-1', 'tun-2']);
  call(mock, 'stop_test_cloud_tunnel', { project_id: 1, tunnel_id: 'tun-9' }); // other args: not the trigger
  assert.deepEqual(tunnelIds(call(mock, 'list_test_cloud_tunnels', { project_id: 1 })), ['tun-1', 'tun-2']);
  call(mock, 'stop_test_cloud_tunnel', { project_id: 1, tunnel_id: 'tun-1' });
  assert.deepEqual(tunnelIds(call(mock, 'list_test_cloud_tunnels', { project_id: 1 })), ['tun-2']);
});

test('after: history is per process and a failed call does not count', () => {
  const dir = afterFixtures();
  const a = createMock({ logPath: null, fixturesDir: dir });
  call(a, 'stop_test_cloud_tunnel', { project_id: 1 }); // missing tunnel_id: invalid_args, no state change
  assert.deepEqual(tunnelIds(call(a, 'list_test_cloud_tunnels', { project_id: 1 })), ['tun-1', 'tun-2']);
  call(a, 'stop_test_cloud_tunnel', { project_id: 1, tunnel_id: 'tun-1' });
  const b = createMock({ logPath: null, fixturesDir: dir }); // a new process starts empty
  assert.deepEqual(tunnelIds(call(b, 'list_test_cloud_tunnels', { project_id: 1 })), ['tun-1', 'tun-2']);
  assert.deepEqual(tunnelIds(call(a, 'list_test_cloud_tunnels', { project_id: 1 })), ['tun-2']);
});

test('after: lookupFixture takes the history, an "after" entry may carry its own match, checkFixtures validates the shape', () => {
  const dir = tmp();
  mkdirSync(join(dir, 'default'), { recursive: true });
  writeFileSync(join(dir, 'default', 'list_projects.json'), JSON.stringify([
    { match: { a: 1 }, result: { n: 'plain' } },
    { after: { tool: 'create_test_case' }, match: { a: 1 }, result: { n: 'after' } },
  ]));
  const look = history => lookupFixture({ fixturesDir: dir, scenario: 'default', tool: 'list_projects', args: { a: 1 }, history }).entry.result.n;
  assert.equal(look([]), 'plain');
  assert.equal(look([{ tool: 'create_test_case', args: { x: 1 } }]), 'after');
  assert.equal(look([{ tool: 'delete_test_case', args: {} }]), 'plain');
  const bad = tmp();
  mkdirSync(join(bad, 'default'), { recursive: true });
  writeFileSync(join(bad, 'default', 'list_projects.json'), JSON.stringify([
    { after: { tool: 'no_such_tool' }, result: {} },
    { after: {}, result: {} },
    { after: { tool: 'create_test_case', match: [1] }, result: {} },
  ]));
  const problems = checkFixtures({ fixturesDir: bad }).filter(p => p.startsWith('default/list_projects.json'));
  assert.equal(problems.length, 3);
  assert.ok(problems.some(p => /unknown tool no_such_tool/.test(p)));
});

test('shipped fixtures: default scenario covers every tool and every file is well formed', () => {
  assert.deepEqual(checkFixtures(), []);
  for (const t of SNAPSHOT.tools) assert.ok(existsSync(join(HERE, 'fixtures', 'default', `${t.name}.json`)), t.name);
});

test('every default fixture answers a minimal valid call without NO_FIXTURE', () => {
  const mock = createMock({ logPath: null });
  const minimal = {
    build_private_local_testing_config: { mode: 'tunnel' },
    build_run_configuration: { config_type: 'DESKTOP_AND_MOBILE_BROWSER', os: 'windows' },
    build_schedule: { start_time: '2026-10-21T18:00:00+07:00', time_zone: 'Asia/Ho_Chi_Minh' },
  };
  const required = name => SNAPSHOT.tools.find(t => t.name === name).inputSchema.required || [];
  const sampleFor = (schema, name) => {
    const t = schema.properties[name];
    const first = (t.anyOf || [t]).find(s => s.type !== 'null') || t;
    if (first.enum) return first.enum[0];
    if (first.format === 'uuid') return '0ec3c0b5-3a27-4c94-997b-dc89aa82f3cc';
    if (first.format === 'date-time') return '2026-10-01T00:00:00Z';
    return { integer: 28459, string: 'x', array: [], object: {}, boolean: true }[first.type];
  };
  const skip = new Set(['create_test_case', 'create_test_run', 'update_test_run', 'update_test_results', 'update_test_cases', 'manage_test_suite', 'manage_test_folder', 'manage_test_cloud_dynamic_app', 'create_defect', 'update_schedule_configuration', 'prepare_artifact_upload', 'find_test_cases', 'find_test_results', 'create_truetest_test_case_from_session', 'fetch_defects', 'manage_requirement_test_case_linkages', 'create_manual_ai_session', 'memory_forget', 'memory_read', 'memory_read_page', 'memory_write', 'read_manual_ai_session', 'search', 'fetch_defect_metrics', 'fetch_test_case_metrics', 'fetch_test_configuration_metrics']);
  for (const t of SNAPSHOT.tools) {
    if (skip.has(t.name)) continue; // covered by their own tests or need nested payloads
    const args = minimal[t.name] || Object.fromEntries(required(t.name).map(n => [n, sampleFor(t.inputSchema, n)]));
    const res = call(mock, t.name, args).result;
    assert.ok(res, t.name);
    assert.notEqual(res.structuredContent?.error, 'NO_FIXTURE', t.name);
    assert.notEqual(res.structuredContent?.error, 'INVALID_ARGUMENTS', `${t.name}: ${JSON.stringify(res.structuredContent)}`);
  }
});

function validCase() {
  return { name: 'Checkout - applies valid discount code', description: 'Discount applies', preCondition: 'Cart has one item', priority: 'HIGH', assigneeUUID: null, content: { steps: [{ name: 'Apply code SAVE10', context: { expectedResult: 'Total drops by 10 percent', data: 'SAVE10' } }] }, linkedRequirementIds: [88602], featureAreas: ['Checkout'], customTestTypes: null, path: 'Test Cases/Checkout' };
}
