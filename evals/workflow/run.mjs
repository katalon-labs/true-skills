#!/usr/bin/env node
/**
 * run.mjs - workflow eval runner.
 *
 * Question: against a Katalon True Platform MCP server, does the agent follow the
 * consent and ask-first rules of the skills? Scenarios live in
 * evals/workflow/scenarios/. The rules live in assert.mjs.
 *
 *   node evals/workflow/run.mjs --dry                         replay recordings, no model (default, runs in CI)
 *   node evals/workflow/run.mjs --list                        list scenarios
 *   node evals/workflow/run.mjs --live-model --model ID       drive `claude -p` against the mock, never the default
 *
 * --dry replays every recording under evals/workflow/recordings/<scenario>/. A
 * `pass*` recording must report no failed rule. A `fail*` recording must report
 * every rule named in its `violates` list. That proves the asserter catches the
 * violations it claims to catch, without a model.
 *
 * --live-model starts one headless Claude Code process per turn of each scenario
 * (one scenario at a time per worker, turns joined with --resume), loads only this
 * repo's generated plugin and only the mock MCP server, and sends no call to a
 * real tenant. It needs a logged-in `claude` and costs tokens. Nothing starts it
 * unless you pass --live-model and --model.
 */

import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createMock, startHttp } from '../../harness/mock-mcp/server.mjs';
import { ASSERTION_TYPES, ROOT, evaluate, loadContract, readJsonl, readTranscript, validateScenario } from './assert.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCENARIOS = join(HERE, 'scenarios');
const RECORDINGS = join(HERE, 'recordings');
const PLUGIN = 'katalon-true-platform';
const PLUGIN_DIR = join(ROOT, 'plugins', PLUGIN);
const ALLOWED_PLUGINS = new Set([PLUGIN, 'agents-md', 'telemetry']); // agents-md and telemetry are Claude Code built-ins
const MIN_FAIL_RECORDING_SCENARIOS = 4;

// --- scenarios ---------------------------------------------------------------

export function loadScenarios(contract = loadContract(), only) {
  const files = readdirSync(SCENARIOS).filter(f => f.endsWith('.json')).sort();
  const out = [];
  const problems = [];
  for (const f of files) {
    let s;
    try { s = JSON.parse(readFileSync(join(SCENARIOS, f), 'utf8')); } catch (e) { problems.push(`${f}: invalid JSON (${e.message})`); continue; }
    for (const p of validateScenario(s, { contract, file: f })) problems.push(`${f}: ${p}`);
    out.push(s);
  }
  const keep = only ? new Set(only.split(',')) : null;
  if (keep) for (const id of keep) if (!out.some(s => s.id === id)) problems.push(`--only names unknown scenario ${id}`);
  return { scenarios: keep ? out.filter(s => keep.has(s.id)) : out, problems };
}

// --- dry replay --------------------------------------------------------------

/** Replays the user turns of a recording with the scenario's confirms flags, so a recording cannot forge a confirmation. */
function withScenarioTurns(events, scenario) {
  return events.map(ev => (ev.type === 'user'
    ? { ...ev, confirms: scenario.turns[ev.turn]?.confirms === true }
    : ev));
}

export function replayRecordings(scenario, contract) {
  const dir = join(RECORDINGS, scenario.id);
  const rows = [];
  if (!existsSync(dir)) return rows;
  for (const f of readdirSync(dir).filter(x => x.endsWith('.transcript.json')).sort()) {
    const kind = f.replace(/\.transcript\.json$/, '');
    const t = readTranscript(join(dir, f));
    const calls = readJsonl(join(dir, `${kind}.calls.jsonl`));
    const verdict = evaluate({ scenario, events: withScenarioTurns(t.events, scenario), rows: calls, contract });
    const problems = [];
    if (t.scenario !== scenario.id) problems.push(`file says scenario ${t.scenario}`);
    if (t.expect === 'pass') { if (!verdict.ok) problems.push(`expected pass, failed: ${verdict.failed.join(', ')}`); }
    else if (t.expect === 'fail') {
      if (verdict.ok) problems.push('expected a violation, none reported');
      const missing = (t.violates ?? []).filter(v => !verdict.failed.includes(v));
      if (!(t.violates ?? []).length) problems.push('a fail recording must list `violates`');
      if (missing.length) problems.push(`violations not reported: ${missing.join(', ')}`);
      const known = new Set(['confirm-before-write', 'no-unknown-tools', 'valid-args', 'log-aligned', ...scenario.assertions.map(a => a.id)]);
      for (const v of t.violates ?? []) if (!known.has(v)) problems.push(`violates names unknown rule ${v}`);
    } else problems.push(`expect must be pass or fail, got ${t.expect}`);
    rows.push({ scenario: scenario.id, kind, expect: t.expect, failed: verdict.failed, caught: t.expect === 'fail' ? (t.violates ?? []).filter(v => verdict.failed.includes(v)) : [], problems });
  }
  return rows;
}

function dry(opts) {
  const contract = loadContract();
  const { scenarios, problems } = loadScenarios(contract, opts.only);
  const lines = [];
  let bad = problems.length;
  for (const p of problems) console.error(`SCENARIO ${p}`);
  const caughtTypes = new Set();
  let withFail = 0;
  let recordings = 0;
  let okRecordings = 0;
  for (const s of scenarios) {
    const rows = replayRecordings(s, contract);
    if (!rows.some(r => r.expect === 'pass')) { bad++; console.error(`SCENARIO ${s.id}: no pass recording under recordings/${s.id}/`); }
    if (rows.some(r => r.expect === 'fail')) withFail++;
    for (const r of rows) {
      recordings++;
      const good = r.problems.length === 0;
      if (good) okRecordings++; else bad++;
      for (const v of r.caught) caughtTypes.add(s.assertions.find(a => a.id === v)?.type ?? 'implicit:' + v);
      lines.push({ ...r, good });
      if (opts.verbose || !good) console.log(`${good ? 'ok  ' : 'FAIL'} ${s.id} / ${r.kind} (${r.expect}${r.expect === 'fail' ? `, caught ${r.caught.join(', ')}` : ''})${good ? '' : `: ${r.problems.join('; ')}`}`);
    }
  }
  if (!opts.only && withFail < MIN_FAIL_RECORDING_SCENARIOS) { bad++; console.error(`only ${withFail} scenario(s) have a fail recording, need ${MIN_FAIL_RECORDING_SCENARIOS}`); }
  const unproven = ASSERTION_TYPES.filter(t => scenarios.some(s => s.assertions.some(a => a.type === t)) && !caughtTypes.has(t));
  if (opts.json) console.log(JSON.stringify({ mode: 'dry', scenarios: scenarios.length, recordings, ok: bad === 0, lines }, null, 2));
  else {
    console.log(`dry: ${scenarios.length} scenarios, ${recordings} recordings (${okRecordings} as expected), ${withFail} scenarios with a fail recording, ${bad ? `${bad} problem(s)` : 'all pass'}`);
    if (unproven.length && opts.verbose) console.log(`assertion types no fail recording catches yet: ${unproven.join(', ')}`);
  }
  return bad === 0 ? 0 : 1;
}

// --- live model --------------------------------------------------------------

function claudeBin() {
  return (process.env.PATH || '').split(':').map(d => join(d, 'claude')).find(p => existsSync(p));
}

export function turnArgs({ prompt, sessionId, first, configPath, opts }) {
  const a = ['-p', prompt,
    first ? '--session-id' : '--resume', sessionId,
    '--mcp-config', configPath,
    '--strict-mcp-config',
    '--setting-sources', '',
    '--plugin-dir', PLUGIN_DIR,
    '--tools', 'Skill',
    '--allowedTools', 'mcp__katalon__*,Skill',
    '--max-turns', String(opts.maxTurns),
    '--output-format', 'stream-json', '--verbose'];
  if (opts.model) a.push('--model', opts.model);
  if (opts.effort) a.push('--effort', opts.effort);
  return a;
}

function runTurn(bin, args, cwd, timeoutMs) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(bin, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, DISABLE_AUTOUPDATER: '1' } });
    let buf = '';
    let err = '';
    const evs = [];
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.stdout.on('data', d => {
      buf += d;
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
        if (!line.trim()) continue;
        try { evs.push(JSON.parse(line)); } catch { /* non-JSON noise */ }
      }
    });
    child.stderr.on('data', d => { err += d; });
    child.on('close', code => { clearTimeout(timer); resolveRun({ evs, code, err }); });
    child.on('error', e => { clearTimeout(timer); reject(e); });
  });
}

/** Stops the run when the session could reach anything but the mock and this plugin. */
export function checkEnvironment(init, skills) {
  const servers = (init.mcp_servers || []).map(m => m.name);
  const tools = init.tools || [];
  const foreign = tools.filter(t => /^mcp__/.test(t) && !t.startsWith('mcp__katalon__'));
  const plugins = (init.plugins || []).map(p => p.name).filter(p => !ALLOWED_PLUGINS.has(p));
  const listed = new Set((init.skills || []).filter(x => x.startsWith(`${PLUGIN}:`)).map(x => x.slice(PLUGIN.length + 1)));
  const missing = skills.filter(x => !listed.has(x));
  const leaks = [];
  if (servers.length !== 1 || servers[0] !== 'katalon') leaks.push(`mcp servers [${servers}]`);
  else if ((init.mcp_servers[0].status ?? 'connected') !== 'connected') leaks.push(`the mock is ${init.mcp_servers[0].status}, not connected`);
  if (foreign.length) leaks.push(`foreign tools [${foreign.slice(0, 3)}]`);
  if (plugins.length) leaks.push(`extra plugins [${plugins}]`);
  if (missing.length) leaks.push(`missing skills [${missing}]`);
  if (leaks.length) { const e = new Error(`environment leak: ${leaks.join('; ')}`); e.failure_class = 'env_mismatch'; throw e; }
}

/** Turns stream-json events from one turn into transcript events. */
export function eventsFromStream(evs) {
  const out = [];
  for (const ev of evs) {
    if (ev.type === 'assistant') {
      for (const b of ev.message?.content || []) {
        if (b.type === 'text' && b.text?.trim()) out.push({ type: 'assistant', text: b.text });
        if (b.type === 'tool_use') out.push({ type: 'tool_call', id: b.id, name: b.name, args: b.input ?? {} });
      }
    } else if (ev.type === 'user') {
      const content = ev.message?.content;
      if (Array.isArray(content)) for (const b of content) {
        if (b.type === 'tool_result') {
          const text = Array.isArray(b.content) ? b.content.map(x => x.text ?? '').join('') : String(b.content ?? '');
          out.push({ type: 'tool_result', id: b.tool_use_id, isError: b.is_error === true, text: text.slice(0, 4000) });
        }
      }
    }
  }
  return out;
}

async function liveScenario(scenario, contract, opts, bin, skills) {
  const work = mkdtempSync(join(tmpdir(), 'wf-live-'));
  const cwd = join(work, 'cwd');
  mkdirSync(cwd);
  const logPath = join(work, 'calls.jsonl');
  const mock = createMock({ scenario: scenario.fixture, logPath, transport: 'http' });
  const http = await startHttp(mock, { port: 0 });
  const configPath = join(work, 'mcp.json');
  writeFileSync(configPath, JSON.stringify({ mcpServers: { katalon: { type: 'http', url: http.url } } }));
  const sessionId = randomUUID();
  const events = [];
  let model = null;
  let costUsd = 0;
  try {
    for (const [i, turn] of scenario.turns.entries()) {
      events.push({ type: 'user', turn: i, text: turn.text, confirms: turn.confirms === true });
      const { evs, code, err } = await runTurn(bin, turnArgs({ prompt: turn.text, sessionId, first: i === 0, configPath, opts }), cwd, opts.timeoutS * 1000);
      const init = evs.find(e => e.type === 'system' && e.subtype === 'init');
      const result = evs.find(e => e.type === 'result');
      if (!init) { const e = new Error(`claude produced no init event (exit ${code}): ${(err || '').slice(-300)}`); e.failure_class = /login|auth/i.test(err) ? 'auth' : 'harness'; throw e; }
      checkEnvironment(init, skills);
      model = model ?? evs.find(e => e.type === 'assistant')?.message?.model ?? null;
      costUsd += result?.total_cost_usd ?? 0;
      events.push(...eventsFromStream(evs));
      if (result?.is_error && result.terminal_reason === 'api_error') { const e = new Error(`api error: ${result.result}`); e.failure_class = 'api'; throw e; }
    }
  } finally {
    await http.close();
  }
  const rows = readJsonl(logPath);
  const verdict = evaluate({ scenario, events, rows, contract });
  rmSync(work, { recursive: true, force: true });
  return { scenario: scenario.id, model, costUsd, events, rows, verdict };
}

async function live(opts) {
  if (!opts.model) { console.error('--live-model needs --model <id>. It starts real model calls and costs tokens.'); return 2; }
  const bin = claudeBin();
  if (!bin) { console.error('claude is not on PATH'); return 2; }
  if (!existsSync(join(PLUGIN_DIR, 'skills'))) { console.error(`${relative(ROOT, PLUGIN_DIR)} is missing. Run: node scripts/build-adapters.mjs`); return 2; }
  const contract = loadContract();
  const { scenarios, problems } = loadScenarios(contract, opts.only);
  if (problems.length) { for (const p of problems) console.error(`SCENARIO ${p}`); return 2; }
  const skills = readdirSync(join(ROOT, 'skills'), { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort();
  const outDir = resolve(opts.out || join(tmpdir(), `katalon-workflow-eval-${new Date().toISOString().replace(/[:.]/g, '-')}`));
  mkdirSync(outDir, { recursive: true });
  console.error(`live: ${scenarios.length} scenario(s), model ${opts.model}, concurrency ${opts.concurrency}, output ${outDir}`);

  const queue = [...scenarios];
  const done = [];
  const errors = [];
  async function worker() {
    while (queue.length) {
      const s = queue.shift();
      try {
        const r = await liveScenario(s, contract, opts, bin, skills);
        done.push(r);
        mkdirSync(join(outDir, s.id), { recursive: true });
        writeFileSync(join(outDir, s.id, 'transcript.json'), JSON.stringify({ scenario: s.id, model: r.model, events: r.events }, null, 2) + '\n');
        writeFileSync(join(outDir, s.id, 'calls.jsonl'), r.rows.map(x => JSON.stringify(x)).join('\n') + (r.rows.length ? '\n' : ''));
        writeFileSync(join(outDir, s.id, 'verdict.json'), JSON.stringify(r.verdict, null, 2) + '\n');
        console.log(`${r.verdict.ok ? 'PASS' : 'FAIL'} ${s.id}${r.verdict.ok ? '' : `: ${r.verdict.failed.join(', ')}`}`);
      } catch (e) {
        errors.push({ scenario: s.id, failure_class: e.failure_class ?? 'error', error: String(e.message || e) });
        console.error(`ERROR ${s.id} (${e.failure_class ?? 'error'}): ${e.message || e}`);
        if (e.failure_class === 'auth' || e.failure_class === 'env_mismatch') queue.length = 0; // no point burning the queue
      }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, opts.concurrency) }, worker));
  const passed = done.filter(r => r.verdict.ok).length;
  const cost = done.reduce((n, r) => n + r.costUsd, 0);
  writeFileSync(join(outDir, 'report.json'), JSON.stringify({ model: opts.model, passed, total: scenarios.length, errors, costUsd: cost, scenarios: done.map(r => ({ id: r.scenario, ok: r.verdict.ok, failed: r.verdict.failed })) }, null, 2) + '\n');
  console.log(`live: ${passed} of ${scenarios.length} scenarios passed, ${errors.length} error(s), about $${cost.toFixed(2)} -> ${outDir}`);
  return passed === scenarios.length && !errors.length ? 0 : 1;
}

// --- cli ---------------------------------------------------------------------

function usage() {
  console.error([
    'usage: node evals/workflow/run.mjs [--dry | --live-model --model ID] [options]',
    '  --dry            replay recordings, no model (default)',
    '  --live-model     drive `claude -p` against the mock server (needs --model, costs tokens)',
    '  --list           list scenarios and exit',
    '  --only a,b       run only these scenario ids',
    '  --verbose        print every recording (dry)',
    '  --json           machine-readable result (dry)',
    'live options: --model ID, --effort L, --out DIR, --concurrency N (default 2), --max-turns N (default 12), --timeout-s N per turn (default 240)',
  ].join('\n'));
}

function parseArgs(argv) {
  const o = { mode: 'dry', concurrency: 2, maxTurns: 12, timeoutS: 240 };
  const val = i => { if (argv[i] === undefined) { console.error(`missing value for ${argv[i - 1]}`); usage(); process.exit(2); } return argv[i]; };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--dry') o.mode = 'dry';
    else if (k === '--live-model') o.mode = 'live';
    else if (k === '--list') o.mode = 'list';
    else if (k === '--only') o.only = val(++i);
    else if (k === '--model') o.model = val(++i);
    else if (k === '--effort') o.effort = val(++i);
    else if (k === '--out') o.out = val(++i);
    else if (k === '--concurrency') o.concurrency = Number(val(++i));
    else if (k === '--max-turns') o.maxTurns = Number(val(++i));
    else if (k === '--timeout-s') o.timeoutS = Number(val(++i));
    else if (k === '--verbose') o.verbose = true;
    else if (k === '--json') o.json = true;
    else if (k === '-h' || k === '--help') { usage(); process.exit(0); }
    else { console.error(`unknown argument ${k}`); usage(); process.exit(2); }
  }
  for (const n of ['concurrency', 'maxTurns', 'timeoutS']) if (!Number.isInteger(o[n]) || o[n] < 1) { console.error(`${n} must be a positive integer`); process.exit(2); }
  return o;
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o.mode === 'list') {
    const { scenarios, problems } = loadScenarios(loadContract(), o.only);
    for (const p of problems) console.error(`SCENARIO ${p}`);
    for (const s of scenarios) console.log(`${s.id.padEnd(40)} ${s.skill.padEnd(18)} ${s.turns.length} turns, ${s.assertions.length} assertions`);
    process.exit(problems.length ? 1 : 0);
  }
  process.exit(o.mode === 'live' ? await live(o) : dry(o));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
