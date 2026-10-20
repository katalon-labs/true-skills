#!/usr/bin/env node
/**
 * run.mjs - skill-routing eval runner.
 *
 * Measures one thing: given a user request, does the agent pick the right
 * Katalon skill (or no Katalon skill when none applies)? The only text an agent
 * sees when it picks is each skill's frontmatter `description`, so this is the
 * eval to run before and after any description change.
 *
 * Backend `claude` drives the real entry point: headless Claude Code with only
 * this repo's generated plugin loaded, no user/project settings, no MCP
 * servers, and the Skill tool as the only tool. The model cannot read files,
 * run commands, or reach the platform, so the labels in labels.jsonl are
 * structurally out of reach and a case can never touch a real account.
 * Backends `oracle`, `null` and `router` are zero-cost plumbing checks (the
 * grader must score them ~100%, ~share-of-negatives, and ~share-of-router).
 *
 *   node evals/routing/run.mjs --variant baseline --model claude-sonnet-5 --reps 3
 *   node evals/routing/run.mjs --variant baseline --backend oracle --flow /tmp/rt-oracle
 *
 * Built from the runner scaffold that ships with the /claude-api build-eval
 * guide: resume at (case, rep), rows appended as cases finish, jittered
 * backoff, per-case wall-clock ceiling, served-model assertion, failed
 * attempts in errors.jsonl (never scored), and a harness-integrity gate.
 * No dependencies - Node >= 18, ESM, like the rest of scripts/.
 */

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const PLUGIN = 'katalon-true-platform';
const PLUGIN_DIR = join(ROOT, 'plugins', PLUGIN);
const ALLOWED_PLUGINS = new Set([PLUGIN, 'agents-md', 'telemetry']); // telemetry and agents-md are Claude Code built-ins

const SKILLS = readdirSync(join(ROOT, 'skills'), { withFileTypes: true })
  .filter(d => d.isDirectory()).map(d => d.name).sort();
const KATALON = new Set(SKILLS);
// Resolve the claude binary once. A PATH lookup per call can fall through to
// another install while the first one is mid-update (seen 2026-09-29: two reps
// ran on an old /usr/local/bin/claude with no model reply).
const CLAUDE_BIN = (process.env.PATH || '').split(':').map(d => join(d, 'claude')).find(p => existsSync(p));
let CLAUDE_VERSION = null; // pinned from the first call's init event
const WORKDIR = join(tmpdir(), 'katalon-routing-eval-cwd');
mkdirSync(WORKDIR, { recursive: true });
if (readdirSync(WORKDIR).length) { console.error(`${WORKDIR} must be empty (the model runs there)`); process.exit(2); }

// --- cases and labels -------------------------------------------------------

function readJsonl(p) {
  return readFileSync(p, 'utf8').split('\n').filter(l => l.trim()).map((l, i) => {
    try { return JSON.parse(l); } catch (e) { throw new Error(`${p}:${i + 1} is not valid JSON: ${e.message}`); }
  });
}

async function loadCases(ctx) {
  const cases = readJsonl(join(HERE, 'cases.jsonl'));
  if (ctx.only) {
    const keep = new Set(ctx.only.split(','));
    return cases.filter(c => keep.has(c.id));
  }
  return cases;
}

let LABELS = null;
function labels() {
  if (!LABELS) {
    LABELS = new Map(readJsonl(join(HERE, 'labels.jsonl')).map(l => [l.id, l]));
    for (const [id, l] of LABELS) for (const s of l.accept)
      if (s !== 'none' && !KATALON.has(s)) throw new Error(`labels.jsonl ${id}: unknown skill '${s}'`);
  }
  return LABELS;
}

// --- the app ----------------------------------------------------------------

// Plain Claude Code headless run. Every flag here narrows the environment to
// "a user who installed only this plugin": no settings files, no MCP servers,
// only the Skill tool, one turn, a fresh empty cwd per case.
function claudeArgs(prompt, ctx) {
  const a = ['-p', prompt,
    '--setting-sources', '',
    '--strict-mcp-config',
    '--plugin-dir', PLUGIN_DIR,
    '--tools', 'Skill',
    '--max-turns', '1',
    '--no-session-persistence',
    '--output-format', 'stream-json', '--verbose'];
  if (ctx.model) a.push('--model', ctx.model);
  if (ctx.effort) a.push('--effort', ctx.effort);
  return a;
}

function runClaude(prompt, ctx, deadline) {
  return new Promise((resolveRun, reject) => {
    // One fixed, empty working directory for every call: Claude Code puts the
    // cwd in its system prompt, so a fresh temp dir per case would defeat
    // prompt caching and pay a full cache write on every call.
    const cwd = WORKDIR;
    if (!CLAUDE_BIN) { const e = new Error('claude not found on PATH'); e.failure_class = 'harness'; return reject(e); }
    const child = spawn(CLAUDE_BIN, claudeArgs(prompt, ctx), { cwd, stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, DISABLE_AUTOUPDATER: '1' } });
    let buf = '', err = '';
    const events = [];
    const kill = setTimeout(() => child.kill('SIGKILL'), Math.max(1000, deadline - Date.now()));
    child.stdout.on('data', d => {
      buf += d;
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
        if (!line.trim()) continue;
        try { events.push(JSON.parse(line)); } catch { /* non-JSON noise */ }
      }
    });
    child.stderr.on('data', d => { err += d; });
    child.on('close', code => {
      clearTimeout(kill);
      try { resolveRun(parseStream(prompt, events, code, err)); } catch (e) { reject(e); }
    });
    child.on('error', e => { clearTimeout(kill); reject(e); });
  });
}

function parseStream(prompt, events, code, stderr) {
  const init = events.find(e => e.type === 'system' && e.subtype === 'init');
  const result = events.find(e => e.type === 'result');
  const assistants = events.filter(e => e.type === 'assistant');
  const apiError = assistants.find(e => e.is_api_error_message || e.error);
  if (!init || apiError || (result && result.is_error && result.terminal_reason === 'api_error')) {
    const text = apiError?.message?.content?.map(b => b.text).join(' ') || result?.result || stderr.slice(-400) || `claude exited ${code}`;
    const e = new Error(`claude: ${text}`);
    if (/rate.?limit|overloaded|529|429/i.test(text)) e.status = 429;
    e.failure_class = /authenticat|oauth|login/i.test(text) ? 'auth' : 'harness';
    throw e;
  }
  // Environment assertions: one Claude Code version for the whole pass,
  // exactly our plugin, all of its skills listed.
  CLAUDE_VERSION = CLAUDE_VERSION ?? init.claude_code_version;
  if (init.claude_code_version !== CLAUDE_VERSION) {
    const e = new Error(`Claude Code version changed mid-pass: ${init.claude_code_version} != ${CLAUDE_VERSION}`);
    e.failure_class = 'env_mismatch'; throw e;
  }
  const plugins = (init.plugins || []).map(p => p.name);
  const extra = plugins.filter(p => !ALLOWED_PLUGINS.has(p));
  const listed = new Set((init.skills || []).filter(s => s.startsWith(PLUGIN + ':')).map(s => s.slice(PLUGIN.length + 1)));
  const missing = SKILLS.filter(s => !listed.has(s));
  if (extra.length || missing.length || (init.mcp_servers || []).length) {
    const e = new Error(`environment leak: extra plugins [${extra}] missing skills [${missing}] mcp [${(init.mcp_servers || []).map(m => m.name)}]`);
    e.failure_class = 'env_mismatch';
    throw e;
  }

  let decision = 'none', args = null, text = [];
  const transcript = [
    { role: 'system', content: `Claude Code ${init.claude_code_version} headless. Skills listed: ${init.skills.join(', ')}` },
    { role: 'user', content: prompt },
  ];
  let model = null, usage = {};
  for (const ev of assistants) {
    model = model || ev.message?.model;
    for (const [k, v] of Object.entries(ev.message?.usage || {}))
      if (typeof v === 'number') usage[k] = (usage[k] || 0) + v;
    for (const b of ev.message?.content || []) {
      if (b.type === 'text' && b.text?.trim()) { text.push(b.text); transcript.push({ role: 'assistant', content: b.text }); }
      if (b.type === 'thinking' && b.thinking) transcript.push({ role: 'assistant', content: '', thinking: b.thinking });
      if (b.type === 'tool_use') {
        transcript.push({ role: 'tool_call', name: b.name, content: JSON.stringify(b.input, null, 2) });
        if (b.name === 'Skill' && decision === 'none') {
          const s = String(b.input?.skill || b.input?.command || '').replace(/^\//, '');
          decision = s.startsWith(PLUGIN + ':') ? s.slice(PLUGIN.length + 1)
            : KATALON.has(s) ? s : `other:${s}`;
          args = b.input?.args ?? null;
        }
      }
    }
  }
  if (!model) {
    const e = new Error('no model reply in the stream (nothing to score)');
    e.failure_class = 'harness'; throw e;
  }
  return {
    output: decision, args, text: text.join('\n'), transcript, model,
    usage: { input_tokens: usage.input_tokens || 0, output_tokens: usage.output_tokens || 0,
             cache_read_input_tokens: usage.cache_read_input_tokens || 0,
             cache_creation_input_tokens: usage.cache_creation_input_tokens || 0 },
    stop_reason: result?.stop_reason ?? null,
    cost_usd: result?.total_cost_usd ?? null,
    env: { claude_code_version: init.claude_code_version, plugin_version: (init.plugins || []).find(p => p.name === PLUGIN)?.version },
  };
}

async function runCase(input, ctx, deadline) {
  const l = labels().get(input.id);
  if (!l) { const e = new Error(`no label for ${input.id}`); e.failure_class = 'harness'; throw e; }
  // Zero-cost plumbing backends: they never call a model.
  if (ctx.backend === 'oracle') return stub(input, l.accept[0]);
  if (ctx.backend === 'null') return stub(input, 'none');
  if (ctx.backend === 'router') return stub(input, 'true-platform-testing');
  return runClaude(input.prompt, ctx, deadline);
}
function stub(input, decision) {
  return { output: decision, transcript: [{ role: 'user', content: input.prompt }, { role: 'tool_call', name: 'Skill', content: decision }],
           model: null, usage: { input_tokens: 0, output_tokens: 0 }, stop_reason: 'stub', cost_usd: 0 };
}

// --- the grader -------------------------------------------------------------

// correct:      decision is in the case's accept set. For a negative (accept
//               = ["none"]) any non-Katalon outcome counts, including a built-in
//               skill or a clarifying question, because the property under test
//               is "did not grab a Katalon skill".
// fired:        a Katalon skill was picked at all (drives false-trigger rate).
// exact:        decision is the single preferred owner (stricter than correct).
async function gradeCase(input, run) {
  const l = labels().get(input.id);
  const d = run.output;
  const negative = l.accept.length === 1 && l.accept[0] === 'none';
  const fired = KATALON.has(d) ? 1 : 0;
  const correct = negative ? (fired ? 0 : 1) : (l.accept.includes(d) ? 1 : 0);
  const exact = negative ? correct : (d === (l.primary || l.accept[0]) ? 1 : 0);
  return {
    grade: { correct, exact, fired },
    explanation: { correct: `picked ${d}; accept ${l.accept.join(' | ')}` },
  };
}

function perfFrom(run) {
  return { cost_usd: run.cost_usd ?? undefined, decision: undefined };
}

// --- harness (scaffold) -----------------------------------------------------

function parseArgs(argv) {
  const a = { flow: HERE, variant: 'baseline', model: undefined, reps: 1, concurrency: 6,
              timeoutS: 180, approveHarness: false, backend: 'claude', effort: undefined, only: undefined };
  const val = (i) => { if (argv[i] === undefined) { console.error(`missing value for ${argv[i - 1]}`); usage(); process.exit(2); } return argv[i]; };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--flow') a.flow = resolve(val(++i));
    else if (k === '--variant') a.variant = val(++i);
    else if (k === '--model') a.model = val(++i);
    else if (k === '--effort') a.effort = val(++i);
    else if (k === '--reps') a.reps = +val(++i);
    else if (k === '--concurrency') a.concurrency = +val(++i);
    else if (k === '--timeout-s') a.timeoutS = +val(++i);
    else if (k === '--backend') a.backend = val(++i);
    else if (k === '--only') a.only = val(++i);
    else if (k === '--approve-harness') a.approveHarness = true;
    else if (k === '-h' || k === '--help') { usage(); process.exit(0); }
    else { console.error(`unknown argument: ${k}`); usage(); process.exit(2); }
  }
  if (!/^(baseline|v[1-9]\d*)$/.test(a.variant)) { console.error(`--variant must be 'baseline' or 'v<N>'`); process.exit(2); }
  if (!['claude', 'oracle', 'null', 'router'].includes(a.backend)) { console.error(`--backend must be claude|oracle|null|router`); process.exit(2); }
  if (a.backend === 'claude' && !a.model) { console.error('--model is required with the claude backend (it also arms the served-model check)'); process.exit(2); }
  if (!Number.isInteger(a.reps) || a.reps < 1 || !Number.isInteger(a.concurrency) || a.concurrency < 1
      || !Number.isFinite(a.timeoutS) || a.timeoutS < 0 || a.timeoutS * 1000 > 2147483647) { usage(); process.exit(2); }
  return a;
}
function usage() {
  console.error('usage: node evals/routing/run.mjs --variant ID [--model ID] [--effort L] [--reps N] [--backend claude|oracle|null|router] [--flow DIR] [--only id,id] [--concurrency N] [--timeout-s N] [--approve-harness]');
}

// Generated plugin must match skills/ byte for byte, or the eval measures a
// stale build. The same sha lands on every row as the environment fingerprint.
function pluginFingerprint() {
  const h = createHash('sha256');
  const stale = [];
  for (const s of SKILLS) {
    const src = readFileSync(join(ROOT, 'skills', s, 'SKILL.md'));
    const gen = join(PLUGIN_DIR, 'skills', s, 'SKILL.md');
    if (!existsSync(gen) || !readFileSync(gen).equals(src)) stale.push(s);
    h.update(s).update('\0').update(src).update('\0');
  }
  if (stale.length) {
    console.error(`plugin is stale for: ${stale.join(', ')}. Run: node scripts/build-adapters.mjs`);
    process.exit(2);
  }
  return h.digest('hex').slice(0, 12);
}

function descriptions() {
  const out = {};
  for (const s of SKILLS) {
    const md = readFileSync(join(ROOT, 'skills', s, 'SKILL.md'), 'utf8');
    const m = md.match(/^---\n([\s\S]*?)\n---/);
    const d = m && m[1].match(/^description:\s*(.*)$/m);
    out[s] = d ? d[1].trim() : '';
  }
  return out;
}

function checkHarness(statePath, st, approve) {
  const self = fileURLToPath(import.meta.url);
  const listed = Array.isArray(st.harness_paths) ? st.harness_paths.map(String) : [];
  const paths = [...new Set([self, ...listed.map(p => resolve(ROOT, p))])].sort();
  const h = createHash('sha256');
  const hashed = [];
  for (const p of paths) {
    let buf;
    try { buf = readFileSync(p); } catch (e) { if (p === self) throw e; console.error(`warning: harness path '${relative(ROOT, p)}' not readable - skipped`); continue; }
    h.update(relative(ROOT, p)).update('\0').update(buf).update('\0');
    hashed.push(relative(ROOT, p));
  }
  const sha = h.digest('hex');
  if (st.harness_sha === sha) return;
  if (approve) {
    st.harness_sha = sha;
    writeFileSync(statePath, JSON.stringify(st, null, 2) + '\n');
    console.error(`harness approved: sha256 ${sha.slice(0, 12)} over ${hashed.join(', ')}`);
    return;
  }
  console.error(st.harness_sha == null
    ? `no approved harness sha in ${statePath} (computed ${sha.slice(0, 12)} over: ${hashed.join(', ')}). Review, then run once with --approve-harness.`
    : `harness changed since last approved run (${hashed.join(', ')}): approved ${String(st.harness_sha).slice(0, 12)}, now ${sha.slice(0, 12)}. Re-run with --approve-harness after reviewing the diff.`);
  process.exit(2);
}

async function withBackoff(fn, retry, deadline = Infinity, tries = 5) {
  for (let attempt = 0; ; attempt++) {
    if (Date.now() >= deadline) { const e = new Error('wall-clock ceiling exceeded before attempt'); e.failure_class = 'timeout'; throw e; }
    try { return await fn(); } catch (e) {
      const status = e?.status;
      const transient = status === 429 || status === 529 || (status >= 500 && status < 600);
      if (!transient || attempt >= tries - 1) throw e;
      const delay = Math.min(60_000, 2000 * 2 ** attempt) * (0.5 + Math.random());
      if (Date.now() + delay >= deadline) throw e;
      retry.count++;
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

function withTimeout(promise, seconds, label) {
  if (!(seconds > 0)) return promise;
  let timer;
  const ceiling = new Promise((_, reject) => {
    timer = setTimeout(() => { const e = new Error(`${label}: exceeded ${seconds}s wall-clock ceiling`); e.failure_class = 'timeout'; reject(e); }, seconds * 1000);
  });
  return Promise.race([promise, ceiling]).finally(() => clearTimeout(timer));
}

function pathSafeId(id) {
  const raw = String(id);
  const cleaned = raw.replace(/[^\w.-]/g, '_');
  if (cleaned === raw && raw.length <= 129) return raw;
  return `${cleaned.slice(0, 120)}-${createHash('sha256').update(raw).digest('hex').slice(0, 8)}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const vdir = join(args.flow, args.variant);
  mkdirSync(join(vdir, 'traces'), { recursive: true });
  const statePath = join(args.flow, '_state.json');
  let st = {};
  if (existsSync(statePath)) {
    try { st = JSON.parse(readFileSync(statePath, 'utf8')) || {}; }
    catch (e) { console.error(`${statePath} is not valid JSON (${e.message})`); process.exit(2); }
  }
  if (args.backend === 'claude') checkHarness(statePath, st, args.approveHarness);
  const fingerprint = pluginFingerprint();
  const ctx = { ...args, state: st };

  // Snapshot what this variant measured: the descriptions the agent saw.
  const snap = join(vdir, 'descriptions.json');
  const desc = JSON.stringify(descriptions(), null, 2) + '\n';
  if (existsSync(snap) && readFileSync(snap, 'utf8') !== desc) {
    console.error(`${snap} differs from the current skills/ descriptions. A variant directory measures one set of descriptions; use a new --variant.`);
    process.exit(2);
  }
  writeFileSync(snap, desc);

  const resultsPath = join(vdir, 'results.jsonl');
  const done = new Set();
  if (existsSync(resultsPath))
    for (const ln of readFileSync(resultsPath, 'utf8').split('\n')) {
      if (!ln.trim()) continue;
      try { const r = JSON.parse(ln); done.add(`${r.prompt_id}\0${r.rep}`); } catch {}
    }

  const cases = await loadCases(ctx);
  labels();
  const seen = new Map();
  for (const c of cases) {
    const k = pathSafeId(c.id).toLowerCase();
    if (seen.has(k)) { console.error(`duplicate case id '${c.id}'`); process.exit(2); }
    if (!labels().has(c.id)) { console.error(`case '${c.id}' has no label`); process.exit(2); }
    seen.set(k, c.id);
  }
  const tasks = [];
  for (const c of cases) for (let rep = 0; rep < args.reps; rep++)
    if (!done.has(`${pathSafeId(c.id)}\0${rep}`)) tasks.push({ c, rep });
  console.error(`[${args.variant}] ${tasks.length} of ${cases.length * args.reps} (case,rep) to run | backend=${args.backend} model=${args.model ?? '-'} effort=${args.effort ?? 'default'} skills=${fingerprint}${args.backend === 'claude' ? ` bin=${CLAUDE_BIN}` : ''}`);

  let i = 0, ok = 0, fail = 0, authFail = 0;
  const errorsPath = join(vdir, 'errors.jsonl');
  for (const p of [resultsPath, errorsPath]) {
    if (!existsSync(p)) continue;
    const b = readFileSync(p);
    if (b.length && b[b.length - 1] !== 0x0a) appendFileSync(p, '\n');
  }
  async function worker() {
    while (i < tasks.length) {
      if (authFail >= 3) return; // no point burning the queue on a dead login
      const { c, rep } = tasks[i++];
      const safeId = pathSafeId(c.id);
      const t0 = Date.now();
      const deadline = args.timeoutS > 0 ? t0 + args.timeoutS * 1000 : Infinity;
      const retry = { count: 0 };
      let lastRun = null, rowWritten = false;
      try {
        const { run, g, latency_s } = await withTimeout((async () => {
          let tAttempt = t0;
          const run = await withBackoff(() => { tAttempt = Date.now(); return runCase(c, ctx, deadline); }, retry, deadline);
          lastRun = run;
          const latency_s = (Date.now() - tAttempt) / 1000;
          if (args.backend === 'claude' && run.model && run.model !== args.model) {
            const e = new Error(`served model ${run.model} != requested ${args.model}`);
            e.failure_class = 'serving_substitution'; throw e;
          }
          const g = await gradeCase(c, run);
          return { run, g, latency_s };
        })(), args.timeoutS, `${c.id} rep${rep}`);
        const row = {
          prompt_id: safeId, rep, prompt: c.prompt, tags: c.tags,
          meta: { decision: run.output, ...(run.args ? { skill_args: run.args } : {}), ...(run.text ? { text: run.text.slice(0, 500) } : {}),
                  skills_sha: fingerprint, ...(run.env || {}), ...(retry.count ? { retries: retry.count } : {}) },
          model: run.model, usage: run.usage, stop_reason: run.stop_reason, status: 'ok',
          latency_s, cost_usd: run.cost_usd ?? undefined,
          grade: g.grade, explanation: g.explanation,
        };
        appendFileSync(resultsPath, JSON.stringify(row) + '\n');
        rowWritten = true;
        writeFileSync(join(vdir, 'traces', `${safeId}_rep${rep}.json`), JSON.stringify(run.transcript, null, 2));
        ok++;
      } catch (e) {
        fail++;
        if (rowWritten) { console.error(`  ${c.id} rep${rep} scored, but trace write failed: ${e.message}`); continue; }
        if (e.failure_class === 'auth') authFail++;
        appendFileSync(errorsPath, JSON.stringify({
          prompt_id: safeId, rep, failure_class: e?.failure_class ?? 'error', error: String(e?.message || e),
          retries: retry.count, model: lastRun?.model, usage: lastRun?.usage, latency_s: (Date.now() - t0) / 1000,
        }) + '\n');
        console.error(`  [${args.variant}] ${c.id} rep${rep} FAILED (${e?.failure_class ?? 'error'}): ${e?.message || e}`);
      }
    }
  }
  const t0 = Date.now();
  const progress = () => {
    const n = ok + fail, total = tasks.length, el = (Date.now() - t0) / 1000;
    const line = `[${args.variant}] ${n}/${total} done (${ok} ok, ${fail} failed), ${Math.round(el)}s elapsed` + (n ? `, ~${Math.round(el / n * (total - n))}s left` : '');
    console.error(line);
    try { writeFileSync(join(vdir, 'progress.txt'), line + '\n'); } catch {}
  };
  const tick = setInterval(progress, 30_000);
  await Promise.all(Array.from({ length: Math.max(1, args.concurrency) }, worker));
  clearInterval(tick); progress();
  if (authFail >= 3) console.error('stopped: Claude Code is not logged in (run `claude` once and /login), then re-run the same command to resume.');
  console.error(`[${args.variant}] done - ${ok} ok, ${fail} failed -> ${relative(process.cwd(), resultsPath)}`);
  process.exit(fail ? 1 : 0);
}

main();
