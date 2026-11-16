#!/usr/bin/env node
/**
 * assert.mjs - the workflow asserter.
 *
 * Input: one scenario, one transcript (user turns, assistant text, tool calls,
 * Skill calls) and one mock call log (JSONL rows from harness/mock-mcp/server.mjs).
 * Output: a list of results, one per rule, each pass or fail with a reason.
 * No model, no network, no dependencies.
 *
 * Four rules run on every scenario:
 *   confirm-before-write  a tool whose class in docs/mcp-tools.json is write or
 *                         destructive runs only after a confirming user turn that
 *                         answers an assistant message. A destructive call needs
 *                         the confirming turn to be the latest user turn.
 *   no-unknown-tools      every call names a tool in the contract and the mock saw it.
 *   valid-args            every call passes the input schema in the snapshot.
 *   log-aligned           every call-log row has a matching call in the transcript.
 *
 * Scenario assertions add more rules. See `ASSERTION_TYPES` and
 * evals/workflow/README.md for the fields of each type.
 *
 *   node evals/workflow/assert.mjs --scenario evals/workflow/scenarios/<id>.json \
 *        --transcript t.json --calls calls.jsonl
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { partialMatch, validate } from '../../harness/mock-mcp/server.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(HERE, '..', '..');

export const IMPLICIT_RULES = ['confirm-before-write', 'no-unknown-tools', 'valid-args', 'log-aligned'];
export const ASSERTION_TYPES = [
  'called', 'not-called', 'no-writes', 'order', 'asked-before', 'user-said-before',
  'read-back', 'skill-loaded', 'handoff', 'says', 'never-says',
];

// --- contract and snapshot ---------------------------------------------------

/**
 * Loads docs/mcp-tools.json (class per tool) and harness/mcp/tools.snapshot.json
 * (input schema per tool). Returns { tools: Map(name -> entry), schemas: Map(name -> schema) }.
 */
export function loadContract(root = ROOT) {
  const doc = JSON.parse(readFileSync(join(root, 'docs', 'mcp-tools.json'), 'utf8'));
  const snap = JSON.parse(readFileSync(join(root, 'harness', 'mcp', 'tools.snapshot.json'), 'utf8'));
  const tools = new Map(doc.tools.map(t => [t.name, t]));
  const schemas = new Map(snap.tools.map(t => [t.name, t.inputSchema]));
  return { tools, schemas, retired: doc.retired || {} };
}

/** `mcp__<server>__<tool>` becomes `<tool>`. Anything else is returned unchanged. */
export function bareToolName(name) {
  const m = /^mcp__.+?__(.+)$/.exec(String(name));
  return m ? m[1] : String(name);
}
const isMcpName = name => /^mcp__/.test(String(name));

/** `katalon-true-platform:execute-test` and `/execute-test` become `execute-test`. */
export function bareSkillName(name) {
  return String(name || '').replace(/^\//, '').replace(/^[^:]+:/, '');
}

// --- reading logs and transcripts -------------------------------------------

export function readJsonl(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8').split('\n').filter(l => l.trim()).map((l, i) => {
    try { return JSON.parse(l); } catch (e) { throw new Error(`${path}:${i + 1} is not valid JSON: ${e.message}`); }
  });
}

export function readTranscript(path) {
  const t = JSON.parse(readFileSync(path, 'utf8'));
  if (!t || !Array.isArray(t.events)) throw new Error(`${path}: a transcript file needs an "events" array`);
  return t;
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// --- timeline ----------------------------------------------------------------

/**
 * Joins transcript events with call-log rows. The transcript gives the order of
 * user turns, assistant text and calls. The log gives what the mock saw: outcome
 * and violations. Calls are paired by tool name and arguments, not by position,
 * because a model can issue parallel calls that reach the server in another order.
 * Returns { timeline, unmatchedRows, unseenCalls }.
 */
export function buildTimeline(events, rows, contract) {
  const callRows = rows.filter(r => r.method === 'tools/call');
  const used = new Set();
  const timeline = [];
  const unseenCalls = [];
  const resultsById = new Map();
  for (const ev of events) if (ev.type === 'tool_result' && ev.id !== undefined) resultsById.set(ev.id, ev);
  let userTurns = 0;
  events.forEach((ev, i) => {
    if (ev.type === 'user') {
      timeline.push({ kind: 'user', idx: i, turn: ev.turn ?? userTurns, text: String(ev.text ?? ''), confirms: ev.confirms === true });
      userTurns++;
    } else if (ev.type === 'assistant') {
      if (String(ev.text ?? '').trim()) timeline.push({ kind: 'assistant', idx: i, text: String(ev.text) });
    } else if (ev.type === 'tool_call') {
      if (ev.name === 'Skill') {
        timeline.push({ kind: 'skill', idx: i, skill: bareSkillName(ev.args?.skill ?? ev.args?.command) });
      } else if (isMcpName(ev.name)) {
        const tool = bareToolName(ev.name);
        const args = ev.args ?? {};
        let rowIdx = -1;
        for (let j = 0; j < callRows.length; j++) {
          if (used.has(j)) continue;
          if (callRows[j].tool === tool && same(callRows[j].args ?? {}, args)) { rowIdx = j; break; }
        }
        if (rowIdx >= 0) used.add(rowIdx); else unseenCalls.push(tool);
        const row = rowIdx >= 0 ? callRows[rowIdx] : null;
        timeline.push({
          kind: 'call', idx: i, tool, args, row,
          outcome: row?.outcome ?? 'not_logged',
          result: resultsById.has(ev.id) ? { text: String(resultsById.get(ev.id).text ?? ''), isError: resultsById.get(ev.id).isError === true } : null,
          entry: contract.tools.get(tool) ?? null,
        });
      }
    }
  });
  const unmatchedRows = callRows.filter((_, j) => !used.has(j));
  return { timeline, unmatchedRows, unseenCalls };
}

// --- helpers for specs -------------------------------------------------------

const toolsOf = spec => (spec.tools ? spec.tools : spec.tool ? [spec.tool] : null);

function getPath(obj, path) {
  // "a.b[].c" flattens arrays. Returns an array of values.
  let cur = [obj];
  for (const part of String(path).split('.')) {
    const flat = part.endsWith('[]');
    const key = flat ? part.slice(0, -2) : part;
    const next = [];
    for (const c of cur) {
      if (c === null || typeof c !== 'object') continue;
      const v = key === '' ? c : c[key];
      if (v === undefined) continue;
      if (flat) { if (Array.isArray(v)) next.push(...v); } else next.push(v);
    }
    cur = next;
  }
  return cur.flatMap(v => (Array.isArray(v) ? v : [v]));
}

function regexOf(p) {
  if (typeof p === 'string') return new RegExp(p, 'i');
  return new RegExp(p.re, p.flags ?? '');
}
const escapeRegex = v => String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const allMatch = (patterns, text) => (patterns ?? []).every(p => regexOf(p).test(text));

/** True when call `c` satisfies the spec: tool, partial match, regex match, absent keys. */
export function callMatches(c, spec) {
  const tools = toolsOf(spec);
  if (tools && !tools.includes(c.tool)) return false;
  if (spec.match && !partialMatch(spec.match, c.args)) return false;
  for (const [path, re] of Object.entries(spec.matchRegex ?? {})) {
    const vals = getPath(c.args, path).filter(v => typeof v === 'string');
    if (!vals.some(v => regexOf(re).test(v))) return false;
  }
  for (const path of spec.absent ?? []) if (getPath(c.args, path).length) return false;
  return true;
}

const describeSpec = spec => {
  const t = toolsOf(spec);
  const bits = [t ? t.join('|') : 'any tool'];
  if (spec.match) bits.push(JSON.stringify(spec.match));
  if (spec.matchRegex) bits.push(`regex ${JSON.stringify(spec.matchRegex)}`);
  return bits.join(' ');
};

/** Destructive by class, or by an action named in destructiveWhen. */
export function isDestructiveCall(c) {
  const e = c.entry;
  if (!e) return false;
  if (e.class === 'destructive') return true;
  for (const when of e.destructiveWhen ?? []) {
    const m = /^END with unfinished_cases SKIP$/i.test(when);
    if (m) { if (c.args?.update?.action === 'END' && c.args?.update?.unfinished_cases === 'SKIP') return true; continue; }
    const actions = [c.args?.action, c.args?.payload?.action, c.args?.update?.action]
      .filter(v => typeof v === 'string').map(v => v.toLowerCase());
    if (actions.includes(String(when).toLowerCase())) return true;
  }
  return false;
}

const isGated = c => !!c.entry && c.entry.class !== 'read';

const lastUserBefore = (timeline, idx) => {
  for (let i = timeline.length - 1; i >= 0; i--) if (timeline[i].idx < idx && timeline[i].kind === 'user') return timeline[i];
  return null;
};

// --- implicit rules ----------------------------------------------------------

function ruleConfirmBeforeWrite(tl, { timeline }) {
  const bad = [];
  for (const c of timeline.filter(x => x.kind === 'call' && isGated(x))) {
    const before = timeline.filter(x => x.idx < c.idx);
    const firstAssistant = before.find(x => x.kind === 'assistant');
    const confirms = before.filter(x => x.kind === 'user' && x.confirms && firstAssistant && x.idx > firstAssistant.idx);
    if (!confirms.length) { bad.push(`${c.tool} ran with no confirming user turn after an assistant preview`); continue; }
    if (isDestructiveCall(c)) {
      const last = lastUserBefore(timeline, c.idx);
      if (!last?.confirms) bad.push(`${c.tool} is destructive and the latest user turn before it is not a confirming turn`);
    }
  }
  return bad.length ? { ok: false, message: bad.join('; ') } : { ok: true, message: 'every write followed a confirming turn' };
}

function ruleUnknownTools(tl, { timeline }, contract) {
  const bad = [];
  for (const c of timeline.filter(x => x.kind === 'call')) {
    if (!contract.tools.has(c.tool) || c.outcome === 'unknown_tool') {
      const hint = contract.retired[c.tool] ? ` (retired: ${contract.retired[c.tool]})` : '';
      bad.push(`${c.tool}${hint}`);
    }
  }
  return bad.length ? { ok: false, message: `unknown tool: ${[...new Set(bad)].join(', ')}` } : { ok: true, message: 'every tool is in the contract' };
}

function ruleValidArgs(tl, { timeline }, contract) {
  const bad = [];
  for (const c of timeline.filter(x => x.kind === 'call')) {
    const schema = contract.schemas.get(c.tool);
    if (!schema) continue; // reported by no-unknown-tools
    const v = validate(schema, c.args);
    const logged = c.outcome === 'invalid_args' ? c.row?.violations ?? [] : [];
    const list = v.length ? v : logged;
    if (list.length) bad.push(`${c.tool}: ${list.slice(0, 2).map(e => `${e.path || '/'} ${e.message}`).join(', ')}`);
  }
  return bad.length ? { ok: false, message: bad.join('; ') } : { ok: true, message: 'every call passes its input schema' };
}

function ruleLogAligned(tl, { unmatchedRows }) {
  if (!unmatchedRows.length) return { ok: true, message: 'every logged call appears in the transcript' };
  return { ok: false, message: `call log has ${unmatchedRows.length} call(s) the transcript does not show: ${unmatchedRows.map(r => r.tool).join(', ')}` };
}

// --- scenario assertions -----------------------------------------------------

const HANDLERS = {
  called(a, { timeline }) {
    const n = timeline.filter(x => x.kind === 'call' && callMatches(x, a)).length;
    const min = a.min ?? 1;
    const max = a.max ?? Infinity;
    const ok = n >= min && n <= max;
    return { ok, message: `${describeSpec(a)} was called ${n} time(s); expected ${min} to ${max === Infinity ? 'any' : max}` };
  },

  'not-called'(a, { timeline }) {
    const hits = timeline.filter(x => x.kind === 'call' && callMatches(x, a));
    return { ok: hits.length === 0, message: hits.length ? `${describeSpec(a)} was called ${hits.length} time(s)` : `${describeSpec(a)} was never called` };
  },

  'no-writes'(a, { timeline }) {
    const hits = timeline.filter(x => x.kind === 'call' && isGated(x));
    return { ok: hits.length === 0, message: hits.length ? `write calls: ${hits.map(h => h.tool).join(', ')}` : 'no write call' };
  },

  order(a, { timeline }) {
    const afters = timeline.filter(x => x.kind === 'call' && callMatches(x, a.after));
    if (!afters.length) return { ok: true, message: `${describeSpec(a.after)} never ran, nothing to order` };
    const bad = afters.filter(c => !timeline.some(x => x.kind === 'call' && x.idx < c.idx && callMatches(x, a.before)));
    return bad.length
      ? { ok: false, message: `${describeSpec(a.after)} ran before any ${describeSpec(a.before)}` }
      : { ok: true, message: `${describeSpec(a.before)} came first` };
  },

  'asked-before'(a, { timeline }) {
    const calls = timeline.filter(x => x.kind === 'call' && callMatches(x, a));
    if (!calls.length) return { ok: true, message: `${describeSpec(a)} never ran, nothing to ask` };
    const answered = a.answered !== false;
    const bad = [];
    for (const c of calls) {
      const q = timeline.filter(x => x.kind === 'assistant' && x.idx < c.idx && allMatch(a.question, x.text));
      const ok = q.some(m => !answered || timeline.some(x => x.kind === 'user' && x.idx > m.idx && x.idx < c.idx));
      if (!ok) bad.push(c);
    }
    return bad.length
      ? { ok: false, message: `${describeSpec(a)} ran without an assistant question matching ${JSON.stringify(a.question)}${answered ? ' and a user answer' : ''}` }
      : { ok: true, message: 'the question came first' };
  },

  'user-said-before'(a, { timeline }) {
    const calls = timeline.filter(x => x.kind === 'call' && callMatches(x, a));
    if (!calls.length) return { ok: true, message: `${describeSpec(a)} never ran, nothing to authorize` };
    const bad = [];
    for (const c of calls) {
      if (a.scope === 'any') {
        const ok = timeline.some(x => x.kind === 'user' && x.idx < c.idx && allMatch(a.patterns, x.text));
        if (!ok) bad.push(c);
      } else {
        const last = lastUserBefore(timeline, c.idx);
        if (!last || !allMatch(a.patterns, last.text)) bad.push(c);
      }
    }
    return bad.length
      ? { ok: false, message: `${describeSpec(a)} ran but the ${a.scope === 'any' ? 'user' : 'latest user turn'} never said ${JSON.stringify(a.patterns)}` }
      : { ok: true, message: 'the user said it first' };
  },

  'read-back'(a, { timeline }) {
    const writes = timeline.filter(x => x.kind === 'call' && callMatches(x, a.after));
    if (!writes.length) return { ok: true, message: `${describeSpec(a.after)} never ran, nothing to read back` };
    const readSpec = { tools: a.reads, match: a.readMatch, matchRegex: a.readMatchRegex };
    const mustMatch = a.resultMustMatch ?? [];
    const mustNot = a.resultMustNotMatch ?? [];
    const checksResult = mustMatch.length > 0 || mustNot.length > 0;
    const bad = [];
    let why = '';
    for (const w of writes) {
      const values = a.entity ? getPath(w.args, a.entity.write).map(String) : [];
      const found = timeline.some(r => {
        if (r.kind !== 'call' || r.idx <= w.idx || !callMatches(r, readSpec)) return false;
        for (const k of a.sameArgs ?? []) {
          if (w.args?.[k] === undefined || r.args?.[k] === undefined || !same(w.args[k], r.args[k])) return false;
        }
        if (a.entity?.read) {
          const rv = new Set(getPath(r.args, a.entity.read).map(String));
          if (!values.some(v => rv.has(v))) return false;
        }
        if (!checksResult) return true;
        if (!r.result || r.result.isError) { why = ' (the read returned no usable result)'; return false; }
        if (/\{entity\}/.test([...mustMatch, ...mustNot].map(p => (typeof p === 'string' ? p : p.re)).join('')) && !values.length) { why = ' (the write carries no entity value to bind)'; return false; }
        const expand = (p, v) => {
          const src = typeof p === 'string' ? { re: p, flags: 'i' } : { re: p.re, flags: p.flags ?? '' };
          return new RegExp(src.re.replace(/\{entity\}/g, escapeRegex(v)), src.flags);
        };
        const hasEntity = p => /\{entity\}/.test(typeof p === 'string' ? p : p.re);
        const forEach = (p, fn) => (hasEntity(p) ? values.every(v => fn(expand(p, v))) : fn(expand(p, '')));
        for (const p of mustMatch) if (!forEach(p, re => re.test(r.result.text))) { why = ` (the read result does not match ${JSON.stringify(p)})`; return false; }
        for (const p of mustNot) if (!forEach(p, re => !re.test(r.result.text))) { why = ` (the read result still matches ${JSON.stringify(p)})`; return false; }
        return true;
      });
      if (!found) bad.push(w);
    }
    return bad.length
      ? { ok: false, message: `${describeSpec(a.after)} was not followed by a read (${a.reads.join('|')}) of the same entity${why}` }
      : { ok: true, message: checksResult ? 'a read followed the write and its result shows the outcome' : 'a read followed the write' };
  },

  'skill-loaded'(a, { timeline }) {
    const ok = timeline.some(x => x.kind === 'skill' && x.skill === a.skill);
    return { ok, message: ok ? `${a.skill} was loaded` : `${a.skill} was never loaded` };
  },

  handoff(a, { timeline }) {
    const skills = timeline.filter(x => x.kind === 'skill');
    const target = skills.find(x => x.skill === a.to);
    if (!target) return { ok: false, message: `never handed off to ${a.to}` };
    const earlier = skills.filter(x => x.idx < target.idx && x.skill !== a.to);
    const ok = a.from ? earlier.some(x => x.skill === a.from) : earlier.length > 0;
    return { ok, message: ok ? `handed off to ${a.to}` : `${a.to} loaded without a ${a.from ?? 'different'} skill first` };
  },

  says(a, { timeline }) {
    const pool = timeline.filter(x => x.kind === 'assistant');
    const texts = a.scope === 'final' ? pool.slice(-1) : pool;
    const patterns = Array.isArray(a.pattern) ? a.pattern : [a.pattern];
    const ok = patterns.every(p => texts.some(t => regexOf(p).test(t.text)));
    return { ok, message: ok ? 'the reply says it' : `the ${a.scope === 'final' ? 'final reply' : 'assistant text'} never matches ${JSON.stringify(a.pattern)}` };
  },

  'never-says'(a, { timeline }) {
    const patterns = Array.isArray(a.pattern) ? a.pattern : [a.pattern];
    const pool = timeline.filter(x => x.kind === 'assistant');
    const texts = a.scope === 'final' ? pool.slice(-1) : pool;
    const hit = texts.find(x => patterns.some(p => regexOf(p).test(x.text)));
    return { ok: !hit, message: hit ? `the assistant said ${JSON.stringify(a.pattern)}` : 'the phrase never appears' };
  },
};

// --- evaluate ----------------------------------------------------------------

/**
 * Runs the four implicit rules and every scenario assertion.
 * Returns { ok, results: [{ id, type, ok, message }], failed: [id] }.
 */
export function evaluate({ scenario, events, rows, contract = loadContract() }) {
  const built = buildTimeline(events, rows, contract);
  const results = [];
  const push = (id, type, r) => results.push({ id, type, ok: r.ok, message: r.message });
  push('confirm-before-write', 'implicit', ruleConfirmBeforeWrite(null, built));
  push('no-unknown-tools', 'implicit', ruleUnknownTools(null, built, contract));
  push('valid-args', 'implicit', ruleValidArgs(null, built, contract));
  push('log-aligned', 'implicit', ruleLogAligned(null, built));
  for (const a of scenario.assertions ?? []) {
    const h = HANDLERS[a.type];
    if (!h) { push(a.id ?? a.type, a.type, { ok: false, message: `unknown assertion type ${a.type}` }); continue; }
    let r;
    try { r = h(a, built); } catch (e) { r = { ok: false, message: `assertion crashed: ${e.message}` }; }
    push(a.id, a.type, r);
  }
  const failed = results.filter(r => !r.ok).map(r => r.id);
  const notes = built.unseenCalls.length ? [`transcript calls the mock never saw: ${built.unseenCalls.join(', ')}`] : [];
  return { ok: failed.length === 0, results, failed, notes };
}

// --- scenario validation -----------------------------------------------------

/** Returns a list of problems with a scenario file (empty when clean). */
export function validateScenario(s, { contract = loadContract(), root = ROOT, file } = {}) {
  const p = [];
  const need = (cond, msg) => { if (!cond) p.push(msg); };
  need(typeof s.id === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.id), 'id must be kebab-case');
  if (file) need(file.replace(/^.*\//, '') === `${s.id}.json`, `file name must be ${s.id}.json`);
  need(typeof s.skill === 'string' && existsSync(join(root, 'skills', s.skill, 'SKILL.md')), `skill "${s.skill}" has no skills/<name>/SKILL.md`);
  need(typeof s.fixture === 'string' && existsSync(join(root, 'harness', 'mock-mcp', 'fixtures', s.fixture)), `fixture set "${s.fixture}" is not under harness/mock-mcp/fixtures`);
  need(typeof s.description === 'string' && s.description.length > 0, 'description is required');
  need(Array.isArray(s.turns) && s.turns.length > 0, 'turns must be a non-empty array');
  for (const [i, t] of (s.turns ?? []).entries()) {
    need(t && typeof t.text === 'string' && t.text.trim(), `turn ${i} needs text`);
    need(t && (t.confirms === undefined || typeof t.confirms === 'boolean'), `turn ${i} confirms must be a boolean`);
  }
  need(Array.isArray(s.assertions) && s.assertions.length > 0, 'assertions must be a non-empty array');
  const seen = new Set();
  const checkSpec = (spec, where) => {
    if (!spec) return;
    for (const t of toolsOf(spec) ?? []) need(contract.tools.has(t), `${where}: tool "${t}" is not in docs/mcp-tools.json`);
  };
  for (const a of s.assertions ?? []) {
    need(typeof a.id === 'string' && a.id, 'every assertion needs an id');
    need(!seen.has(a.id), `duplicate assertion id ${a.id}`);
    need(!IMPLICIT_RULES.includes(a.id), `assertion id ${a.id} is reserved`);
    seen.add(a.id);
    need(ASSERTION_TYPES.includes(a.type), `assertion ${a.id}: unknown type ${a.type}`);
    for (const key of ['before', 'after']) if (a.type === 'order') checkSpec(a[key], `assertion ${a.id}.${key}`);
    if (a.type === 'read-back') {
      if (a.entity !== undefined) need(a.entity && typeof a.entity.write === 'string' && (a.entity.read === undefined || typeof a.entity.read === 'string'), `assertion ${a.id}: entity needs a "write" path and an optional "read" path`);
      for (const key of ['resultMustMatch', 'resultMustNotMatch']) {
        if (a[key] === undefined) continue;
        need(Array.isArray(a[key]) && a[key].length > 0, `assertion ${a.id}: ${key} must be a non-empty list of patterns`);
        for (const pat of a[key] ?? []) { try { regexOf(pat); } catch { p.push(`assertion ${a.id}: bad pattern ${JSON.stringify(pat)}`); } }
        if ((a[key] ?? []).some(pt => /\{entity\}/.test(typeof pt === 'string' ? pt : pt?.re ?? ''))) need(a.entity, `assertion ${a.id}: {entity} in ${key} needs an entity binding`);
      }
    }
    if (a.type === 'read-back') { checkSpec(a.after, `assertion ${a.id}.after`); for (const t of a.reads ?? []) need(contract.tools.has(t), `assertion ${a.id}: read tool "${t}" is not in the contract`); need(Array.isArray(a.reads) && a.reads.length, `assertion ${a.id}: reads is required`); }
    else if (a.type !== 'order') checkSpec(a, `assertion ${a.id}`);
    if (['called', 'not-called', 'asked-before', 'user-said-before'].includes(a.type)) need(toolsOf(a), `assertion ${a.id}: tool or tools is required`);
    if (['asked-before'].includes(a.type)) need(Array.isArray(a.question) && a.question.length, `assertion ${a.id}: question must be a list of patterns`);
    if (['user-said-before'].includes(a.type)) need(Array.isArray(a.patterns) && a.patterns.length, `assertion ${a.id}: patterns must be a list`);
    for (const pat of [...(a.question ?? []), ...(a.patterns ?? []), ...[a.pattern].flat().filter(Boolean)]) {
      try { regexOf(pat); } catch { p.push(`assertion ${a.id}: bad pattern ${JSON.stringify(pat)}`); }
    }
  }
  return p;
}

// --- CLI ---------------------------------------------------------------------

function cli(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--scenario') o.scenario = argv[++i];
    else if (argv[i] === '--transcript') o.transcript = argv[++i];
    else if (argv[i] === '--calls') o.calls = argv[++i];
    else if (argv[i] === '-h' || argv[i] === '--help') o.help = true;
    else { console.error(`unknown argument ${argv[i]}`); process.exit(2); }
  }
  if (o.help || !o.scenario || !o.transcript || !o.calls) {
    console.error('usage: node evals/workflow/assert.mjs --scenario FILE --transcript FILE --calls FILE.jsonl');
    process.exit(o.help ? 0 : 2);
  }
  const scenario = JSON.parse(readFileSync(o.scenario, 'utf8'));
  const t = readTranscript(o.transcript);
  const r = evaluate({ scenario, events: t.events, rows: readJsonl(o.calls) });
  for (const x of r.results) console.log(`${x.ok ? 'PASS' : 'FAIL'} ${x.id} (${x.type}): ${x.message}`);
  for (const n of r.notes) console.log(`NOTE ${n}`);
  process.exit(r.ok ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) cli(process.argv.slice(2));
