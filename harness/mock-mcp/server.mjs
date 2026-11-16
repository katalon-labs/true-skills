#!/usr/bin/env node
/**
 * Mock Katalon True Platform MCP server.
 *
 * Zero dependencies, Node >= 18. Serves the tools in harness/mcp/tools.snapshot.json
 * over stdio (newline-delimited JSON-RPC) or Streamable HTTP (POST /mcp). Every
 * tools/call is validated against the tool's inputSchema, answered from a fixture
 * file, and appended to a JSONL call log. No call reaches a real tenant.
 *
 *   node harness/mock-mcp/server.mjs --http --port 7391
 *   node harness/mock-mcp/server.mjs --stdio
 *   node harness/mock-mcp/server.mjs --check-fixtures
 *
 * Environment (flags win over environment):
 *   MOCK_MCP_SCENARIO  fixture scenario folder under fixtures/ (default "default")
 *   MOCK_MCP_LOG       path of the JSONL call log (no log when unset)
 *   MOCK_MCP_PORT      HTTP port (default 7391, 0 picks a free port)
 *
 * Fixture lookup: fixtures/<scenario>/<tool>.json is an array of
 * { "match": { ...partial arguments }, "result": { ... } }. The first entry whose
 * match is a partial deep subset of the call arguments wins. An entry without
 * "match" is the default for that file. A scenario file with no matching entry
 * and no default falls back to the same tool file in the "default" scenario.
 * An entry may carry "error": "message" instead of "result" to answer with a
 * tool error.
 *
 * State after a write: an entry may carry "after": { "tool": "<name>", "match":
 * { ...partial arguments } }. It is eligible only when an earlier call to that
 * tool, whose arguments match, already succeeded in this server process. The
 * server keeps that call history in memory and starts empty on every process.
 * Among eligible entries, those with "after" win over those without, then the
 * first match wins as before. Use it for the read that follows a write, so a
 * list no longer shows a deleted app.
 */

import { createServer } from 'node:http';
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_SNAPSHOT = resolve(HERE, '..', 'mcp', 'tools.snapshot.json');
const DEFAULT_FIXTURES = join(HERE, 'fixtures');
const SERVER_INFO = { name: 'mock-katalon-mcp', version: '0.1.0' };
const KNOWN_PROTOCOLS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
const MAX_BODY = 2 * 1024 * 1024;

// --- JSON Schema subset validator --------------------------------------------
// Supported: $ref (#/...), anyOf (at least one branch must match), oneOf (exactly
// one branch must match), allOf,
// const, enum, type (string or list), required, properties, additionalProperties
// (false or a schema), items, minItems, maxItems, minLength, maxLength, pattern,
// minimum, maximum, exclusiveMinimum, exclusiveMaximum, format (uuid, uuid4,
// date-time, date). Unknown keywords are ignored.

const FORMATS = {
  uuid: v => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
  uuid4: v => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v),
  'date-time': v => /^\d{4}-\d{2}-\d{2}[Tt]\d{2}:\d{2}:\d{2}(\.\d+)?([Zz]|[+-]\d{2}:\d{2})$/.test(v) && !Number.isNaN(Date.parse(v)),
  date: v => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)),
};

function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v === 'number' ? (Number.isInteger(v) ? 'integer' : 'number') : typeof v;
}

function typeMatches(want, v) {
  const got = typeOf(v);
  if (want === got) return true;
  return want === 'number' && got === 'integer';
}

function resolveRef(ref, root) {
  if (!ref.startsWith('#')) throw new Error(`unsupported $ref ${ref}`);
  let node = root;
  for (const part of ref.slice(1).split('/').filter(Boolean)) {
    node = node?.[part.replace(/~1/g, '/').replace(/~0/g, '~')];
  }
  if (node === undefined) throw new Error(`unresolved $ref ${ref}`);
  return node;
}

const show = v => { const s = JSON.stringify(v); return s === undefined ? 'undefined' : s.length > 60 ? `${s.slice(0, 57)}...` : s; };

/** Returns an array of { path, message }. Empty array means valid. */
export function validate(schema, value, root = schema, path = '') {
  const errors = [];
  check(schema, value, root, path, errors);
  return errors;
}

function branches(list, value, root, path) {
  const results = list.map(s => { const e = []; check(s, value, root, path, e); return e; });
  return results;
}

function check(schema, value, root, path, errors) {
  if (schema === true || schema === undefined || schema === null) return;
  if (schema === false) { errors.push({ path, message: 'no value is allowed here' }); return; }
  if (schema.$ref) check(resolveRef(schema.$ref, root), value, root, path, errors);

  for (const key of ['anyOf', 'oneOf']) {
    if (!Array.isArray(schema[key])) continue;
    const results = branches(schema[key], value, root, path);
    const passing = results.filter(e => e.length === 0).length;
    if (passing === 0) {
      const best = [...results].sort((a, b) => a.length - b.length).find(e => e.length) || [];
      const detail = best.slice(0, 3).map(e => `${e.path || '/'}: ${e.message}`).join('; ');
      errors.push({ path, message: `matches none of the ${schema[key].length} allowed shapes (closest: ${detail || 'n/a'})` });
    } else if (key === 'oneOf' && passing > 1) {
      errors.push({ path, message: `matches ${passing} of the ${schema[key].length} oneOf shapes, exactly one is allowed` });
    }
  }
  if (Array.isArray(schema.allOf)) for (const s of schema.allOf) check(s, value, root, path, errors);

  if ('const' in schema && JSON.stringify(schema.const) !== JSON.stringify(value)) {
    errors.push({ path, message: `must equal ${show(schema.const)}` });
  }
  if (Array.isArray(schema.enum) && !schema.enum.some(e => JSON.stringify(e) === JSON.stringify(value))) {
    errors.push({ path, message: `must be one of ${show(schema.enum)}, got ${show(value)}` });
  }
  if (schema.type !== undefined) {
    const want = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!want.some(t => typeMatches(t, value))) {
      errors.push({ path, message: `expected ${want.join(' or ')}, got ${typeOf(value)}` });
      return; // type-specific keywords below would only add noise
    }
  }

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push({ path, message: `must have at least ${schema.minLength} characters` });
    if (schema.maxLength !== undefined && value.length > schema.maxLength) errors.push({ path, message: `must have at most ${schema.maxLength} characters` });
    if (schema.pattern !== undefined) {
      let ok = true;
      try { ok = new RegExp(schema.pattern).test(value); } catch { ok = true; }
      if (!ok) errors.push({ path, message: `must match pattern ${schema.pattern}` });
    }
    if (schema.format && FORMATS[schema.format] && !FORMATS[schema.format](value)) errors.push({ path, message: `must be a valid ${schema.format}` });
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push({ path, message: `must be >= ${schema.minimum}` });
    if (schema.maximum !== undefined && value > schema.maximum) errors.push({ path, message: `must be <= ${schema.maximum}` });
    if (typeof schema.exclusiveMinimum === 'number' && value <= schema.exclusiveMinimum) errors.push({ path, message: `must be > ${schema.exclusiveMinimum}` });
    if (typeof schema.exclusiveMaximum === 'number' && value >= schema.exclusiveMaximum) errors.push({ path, message: `must be < ${schema.exclusiveMaximum}` });
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push({ path, message: `must have at least ${schema.minItems} items` });
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push({ path, message: `must have at most ${schema.maxItems} items` });
    if (schema.items && typeof schema.items === 'object') value.forEach((item, i) => check(schema.items, item, root, `${path}/${i}`, errors));
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const name of schema.required || []) {
      if (!(name in value) || value[name] === undefined) errors.push({ path: `${path}/${name}`, message: 'is required' });
    }
    const props = schema.properties || {};
    for (const [name, sub] of Object.entries(props)) {
      if (name in value && value[name] !== undefined) check(sub, value[name], root, `${path}/${name}`, errors);
    }
    if (schema.additionalProperties === false) {
      for (const name of Object.keys(value)) if (!(name in props)) errors.push({ path: `${path}/${name}`, message: 'is not an allowed property' });
    } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      for (const name of Object.keys(value)) if (!(name in props)) check(schema.additionalProperties, value[name], root, `${path}/${name}`, errors);
    }
  }
}

// --- fixtures ----------------------------------------------------------------

/** True when every key in `match` is present in `actual` with a matching value. Objects match as subsets; arrays and primitives match exactly. */
export function partialMatch(match, actual) {
  if (match === null || typeof match !== 'object' || Array.isArray(match)) return JSON.stringify(match) === JSON.stringify(actual);
  if (actual === null || typeof actual !== 'object' || Array.isArray(actual)) return false;
  return Object.entries(match).every(([k, v]) => k in actual && partialMatch(v, actual[k]));
}

function readFixtureFile(file) {
  const entries = JSON.parse(readFileSync(file, 'utf8'));
  if (!Array.isArray(entries)) throw new Error(`${file}: a fixture file must be a JSON array`);
  return entries;
}

/** True when `after` ({ tool, match }) is satisfied by an earlier successful call in `history` ([{ tool, args }]). */
export function afterSatisfied(after, history) {
  return history.some(h => h.tool === after.tool && partialMatch(after.match ?? {}, h.args));
}

function pickEntry(entries, args, history = []) {
  // Entries with "after" and a satisfied history win over every plain entry.
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (!e.after || !afterSatisfied(e.after, history)) continue;
    if (e.match === undefined || partialMatch(e.match, args)) return i;
  }
  let fallback = -1;
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].after) continue;
    const m = entries[i].match;
    if (m === undefined || (m && typeof m === 'object' && Object.keys(m).length === 0)) { if (fallback < 0) fallback = i; continue; }
    if (partialMatch(m, args)) return i;
  }
  return fallback;
}

export function lookupFixture({ fixturesDir, scenario, tool, args, history = [] }) {
  const tried = [];
  const scenarios = scenario === 'default' ? ['default'] : [scenario, 'default'];
  for (const s of scenarios) {
    const file = join(fixturesDir, s, `${tool}.json`);
    if (!existsSync(file)) continue;
    const entries = readFixtureFile(file);
    const i = pickEntry(entries, args, history);
    tried.push(`${s}/${tool}.json`);
    if (i >= 0) return { entry: entries[i], source: `${s}/${tool}.json#${i}` };
  }
  return { entry: null, source: tried.join(',') || null };
}

/** Checks fixture files against the snapshot. Returns a list of problems (empty when clean). */
export function checkFixtures({ snapshotPath = DEFAULT_SNAPSHOT, fixturesDir = DEFAULT_FIXTURES } = {}) {
  const problems = [];
  const snap = JSON.parse(readFileSync(snapshotPath, 'utf8'));
  const names = new Set(snap.tools.map(t => t.name));
  if (!existsSync(fixturesDir)) return [`fixtures folder missing: ${fixturesDir}`];
  for (const scenario of readdirSync(fixturesDir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name)) {
    const dir = join(fixturesDir, scenario);
    const have = new Set();
    for (const f of readdirSync(dir).filter(f => f.endsWith('.json'))) {
      const tool = f.slice(0, -5);
      have.add(tool);
      if (!names.has(tool)) problems.push(`${scenario}/${f}: no tool named ${tool} in the snapshot`);
      let entries;
      try { entries = readFixtureFile(join(dir, f)); } catch (e) { problems.push(e.message); continue; }
      entries.forEach((e, i) => {
        if (!e || typeof e !== 'object') problems.push(`${scenario}/${f}[${i}]: entry must be an object`);
        else if (!('result' in e) && !('error' in e)) problems.push(`${scenario}/${f}[${i}]: needs "result" or "error"`);
        else if ('after' in e) {
          const a = e.after;
          if (!a || typeof a !== 'object' || typeof a.tool !== 'string') problems.push(`${scenario}/${f}[${i}]: "after" needs a "tool" name`);
          else if (!names.has(a.tool)) problems.push(`${scenario}/${f}[${i}]: "after" names unknown tool ${a.tool}`);
          else if (a.match !== undefined && (a.match === null || typeof a.match !== 'object' || Array.isArray(a.match))) problems.push(`${scenario}/${f}[${i}]: "after.match" must be an object`);
        }
      });
    }
    if (scenario === 'default') for (const n of names) if (!have.has(n)) problems.push(`default/${n}.json missing: the default scenario must cover every snapshot tool`);
  }
  return problems;
}

// --- the mock ----------------------------------------------------------------

const rpcError = (id, code, message, data) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message, ...(data === undefined ? {} : { data }) } });

function toolResult(payload, isError = false) {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
  const out = { content: [{ type: 'text', text }], isError };
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) out.structuredContent = payload;
  return out;
}

export function createMock(opts = {}) {
  const snapshotPath = opts.snapshotPath || DEFAULT_SNAPSHOT;
  const fixturesDir = opts.fixturesDir || DEFAULT_FIXTURES;
  const scenario = opts.scenario || process.env.MOCK_MCP_SCENARIO || 'default';
  const logPath = opts.logPath === undefined ? process.env.MOCK_MCP_LOG : opts.logPath;
  const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'));
  const tools = new Map(snapshot.tools.map(t => [t.name, t]));
  let seq = 0;
  const history = []; // successful calls in this process: [{ tool, args }]

  function log(entry) {
    if (!logPath) return;
    mkdirSync(dirname(resolve(logPath)), { recursive: true });
    appendFileSync(logPath, `${JSON.stringify({ ts: new Date().toISOString(), seq: ++seq, scenario, transport: opts.transport || 'direct', ...entry })}\n`);
  }

  function callTool(id, params) {
    const name = params?.name;
    const args = params?.arguments === undefined ? {} : params.arguments;
    const tool = typeof name === 'string' ? tools.get(name) : undefined;
    if (!tool) {
      log({ method: 'tools/call', tool: name ?? null, args, outcome: 'unknown_tool', isError: true });
      return rpcError(id, -32602, `Unknown tool: ${name}`);
    }
    const violations = args !== null && typeof args === 'object' && !Array.isArray(args)
      ? validate(tool.inputSchema, args)
      : [{ path: '', message: `arguments must be an object, got ${typeOf(args)}` }];
    if (violations.length) {
      log({ method: 'tools/call', tool: name, args, outcome: 'invalid_args', violations, isError: true });
      return { jsonrpc: '2.0', id, result: toolResult({ error: 'INVALID_ARGUMENTS', tool: name, violations }, true) };
    }
    const { entry, source } = lookupFixture({ fixturesDir, scenario, tool: name, args, history });
    if (!entry) {
      log({ method: 'tools/call', tool: name, args, outcome: 'no_fixture', fixture: source, isError: true });
      return { jsonrpc: '2.0', id, result: toolResult({ error: 'NO_FIXTURE', tool: name, scenario, message: `No fixture entry matches these arguments in scenario ${scenario}.` }, true) };
    }
    if ('error' in entry) {
      log({ method: 'tools/call', tool: name, args, outcome: 'fixture_error', fixture: source, isError: true });
      return { jsonrpc: '2.0', id, result: toolResult({ error: 'TOOL_ERROR', message: String(entry.error) }, true) };
    }
    log({ method: 'tools/call', tool: name, args, outcome: 'ok', fixture: source, isError: false });
    history.push({ tool: name, args });
    const r = entry.result;
    const MCP_TYPES = ['text', 'image', 'audio', 'resource', 'resource_link'];
    const raw = r && typeof r === 'object' && Array.isArray(r.content) && r.content.length > 0 && r.content.every(c => c && MCP_TYPES.includes(c.type)); // fixture already in MCP result shape
    return { jsonrpc: '2.0', id, result: raw ? r : toolResult(r) };
  }

  /** Handles one JSON-RPC message. Returns a response object, or null for notifications. */
  function handle(msg) {
    if (!msg || typeof msg !== 'object' || Array.isArray(msg) || typeof msg.method !== 'string') {
      log({ method: null, outcome: 'invalid_request' });
      return rpcError(msg && typeof msg === 'object' ? msg.id : null, -32600, 'Invalid Request');
    }
    const isNotification = msg.id === undefined || msg.id === null;
    const { method, id, params } = msg;
    if (method === 'tools/call') return isNotification ? null : callTool(id, params);
    log({ method, outcome: 'ok' });
    if (isNotification) return null;
    switch (method) {
      case 'initialize': {
        const asked = params?.protocolVersion;
        return { jsonrpc: '2.0', id, result: {
          protocolVersion: KNOWN_PROTOCOLS.includes(asked) ? asked : KNOWN_PROTOCOLS[1],
          capabilities: { tools: { listChanged: false } },
          serverInfo: SERVER_INFO,
          instructions: 'Mock Katalon True Platform MCP server. Fixture data only. No call reaches a real tenant.',
        } };
      }
      case 'ping': return { jsonrpc: '2.0', id, result: {} };
      case 'tools/list':
        return { jsonrpc: '2.0', id, result: { tools: snapshot.tools.map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })) } };
      case 'resources/list': return { jsonrpc: '2.0', id, result: { resources: [] } };
      case 'prompts/list': return { jsonrpc: '2.0', id, result: { prompts: [] } };
      default: return rpcError(id, -32601, `Method not found: ${method}`);
    }
  }

  /** Handles a parsed JSON body that may be a single message or a batch. */
  function handleBody(body) {
    if (Array.isArray(body)) {
      if (body.length === 0) return rpcError(null, -32600, 'Invalid Request');
      const out = body.map(handle).filter(r => r !== null);
      return out.length ? out : null;
    }
    return handle(body);
  }

  return { handle, handleBody, tools, scenario, snapshot };
}

// --- transports --------------------------------------------------------------

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

function originAllowed(origin) {
  if (!origin) return true;
  try { return LOCAL_HOSTS.has(new URL(origin).hostname); } catch { return false; }
}

export function startHttp(mock, { port = 7391, host = '127.0.0.1' } = {}) {
  const server = createServer((req, res) => {
    const send = (status, body, type = 'application/json', extra = {}) => {
      res.writeHead(status, { 'Content-Type': type, ...extra });
      res.end(body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body));
    };
    const url = new URL(req.url, 'http://localhost');
    if (!originAllowed(req.headers.origin)) return send(403, { error: 'Origin not allowed' });
    if (url.pathname === '/health') return send(200, { ok: true, scenario: mock.scenario, tools: mock.tools.size });
    if (url.pathname !== '/mcp') return send(404, { error: 'Not found. The MCP endpoint is POST /mcp.' });
    if (req.method !== 'POST') return send(405, { error: 'Use POST /mcp' }, 'application/json', { Allow: 'POST' });
    const chunks = [];
    let size = 0;
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BODY) { send(413, { error: 'Body too large' }); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (res.writableEnded) return;
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return send(400, rpcError(null, -32700, 'Parse error')); }
      const out = mock.handleBody(body);
      if (out === null) return send(202, undefined, 'text/plain');
      const accept = String(req.headers.accept || '*/*');
      const wantsJson = /application\/json|\*\/\*/.test(accept);
      if (!wantsJson && /text\/event-stream/.test(accept)) {
        return send(200, `event: message\ndata: ${JSON.stringify(out)}\n\n`, 'text/event-stream', { 'Cache-Control': 'no-cache' });
      }
      return send(200, out);
    });
  });
  return new Promise((resolveStart, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      const addr = server.address();
      resolveStart({ server, port: addr.port, url: `http://${host}:${addr.port}/mcp`, close: () => new Promise(r => server.close(r)) });
    });
  });
}

/** Newline-delimited JSON-RPC over stdin and stdout. stdout carries protocol messages only. */
export function startStdio(mock, { input = process.stdin, output = process.stdout } = {}) {
  let buf = '';
  const write = obj => output.write(`${JSON.stringify(obj)}\n`);
  const onLine = line => {
    if (!line.trim()) return;
    let msg;
    try { msg = JSON.parse(line); } catch { write(rpcError(null, -32700, 'Parse error')); return; }
    const out = mock.handleBody(msg);
    if (out !== null) write(out);
  };
  input.setEncoding('utf8');
  input.on('data', chunk => {
    buf += chunk;
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, nl).replace(/\r$/, ''); buf = buf.slice(nl + 1); onLine(line); }
  });
  input.on('end', () => { if (buf.trim()) onLine(buf); });
}

// --- cli ---------------------------------------------------------------------

function parseArgs(argv) {
  const o = { mode: 'http' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--stdio') o.mode = 'stdio';
    else if (a === '--http') o.mode = 'http';
    else if (a === '--check-fixtures') o.mode = 'check';
    else if (a === '--port') o.port = Number(next());
    else if (a === '--scenario') o.scenario = next();
    else if (a === '--log') o.logPath = next();
    else if (a === '--snapshot') o.snapshotPath = resolve(next());
    else if (a === '--fixtures') o.fixturesDir = resolve(next());
    else if (a === '--help' || a === '-h') o.mode = 'help';
    else { console.error(`unknown argument ${a}`); process.exit(2); }
  }
  return o;
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o.mode === 'help') {
    console.error(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace(/^\/\*\*|^ \* ?/gm, ''));
    return;
  }
  if (o.mode === 'check') {
    const problems = checkFixtures({ snapshotPath: o.snapshotPath, fixturesDir: o.fixturesDir });
    if (problems.length) { for (const p of problems) console.error(`FAIL ${p}`); process.exit(1); }
    console.error('fixtures ok');
    return;
  }
  const mock = createMock({ ...o, transport: o.mode });
  if (o.mode === 'stdio') {
    startStdio(mock);
    console.error(`mock-mcp: stdio, scenario ${mock.scenario}, ${mock.tools.size} tools`);
    return;
  }
  const port = Number.isFinite(o.port) ? o.port : Number(process.env.MOCK_MCP_PORT ?? 7391);
  try {
    const s = await startHttp(mock, { port });
    console.error(`mock-mcp: listening on ${s.url}, scenario ${mock.scenario}, ${mock.tools.size} tools`);
  } catch (e) {
    console.error(`mock-mcp: cannot listen on port ${port}: ${e.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
