#!/usr/bin/env node
/**
 * score.mjs - recompute every routing number from raw results.jsonl rows.
 *
 *   node evals/routing/score.mjs                  # all variants, split-aware
 *   node evals/routing/score.mjs --variant v2     # one variant vs baseline
 *   node evals/routing/score.mjs --split          # (re)draw the train/test split into _state.json
 *   node evals/routing/score.mjs --flow DIR       # score another flow directory
 *
 * Per variant and split: accuracy over cases (each case = mean over its reps)
 * with a 95% interval; the paired per-case delta against baseline with its
 * interval (between-case variance cancels, so this is the number that decides
 * keep or revert); miss / wrong-skill / false-trigger rates; rep agreement;
 * per-skill precision and recall; and the most frequent confusions.
 * Writes <variant>/score.md. No dependencies.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const FLOW = resolve(opt('--flow') ?? HERE);
const statePath = join(FLOW, '_state.json');
const readJsonl = (p) => existsSync(p) ? readFileSync(p, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
const cases = readJsonl(join(HERE, 'cases.jsonl'));
const labels = new Map(readJsonl(join(HERE, 'labels.jsonl')).map(l => [l.id, l]));
const st = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : {};

// --- split ------------------------------------------------------------------
// Random but reproducible: order ids inside each tags[0] stratum by a seeded
// hash, send the first ~60% to train. Never selected by score.
if (args.includes('--split')) {
  const seed = opt('--seed') ?? 'routing-v1';
  const frac = +(opt('--train') ?? 0.6);
  const strata = new Map();
  for (const c of cases) {
    const k = (c.tags && c.tags[0]) || 'untagged';
    if (!strata.has(k)) strata.set(k, []);
    strata.get(k).push(c.id);
  }
  const train = [], test = [];
  for (const ids of strata.values()) {
    ids.sort((a, b) => hash(seed + a).localeCompare(hash(seed + b)));
    const nTrain = ids.length === 1 ? (hash(seed + ids[0]) < '8' ? 1 : 0) : Math.round(ids.length * frac);
    train.push(...ids.slice(0, nTrain)); test.push(...ids.slice(nTrain));
  }
  st.train_ids = train.sort(); st.test_ids = test.sort(); st.split_seed = seed;
  writeFileSync(statePath, JSON.stringify(st, null, 2) + '\n');
  console.log(`split written: ${train.length} train / ${test.length} test (seed ${seed})`);
  process.exit(0);
}
function hash(s) { return createHash('sha256').update(s).digest('hex'); }

// --- scoring ----------------------------------------------------------------
const variants = readdirSync(FLOW, { withFileTypes: true })
  .filter(d => d.isDirectory() && /^(baseline|v\d+)$/.test(d.name)).map(d => d.name)
  .sort((a, b) => a === 'baseline' ? -1 : b === 'baseline' ? 1 : +a.slice(1) - +b.slice(1));
const only = opt('--variant');
const trainSet = new Set(st.train_ids ?? []), testSet = new Set(st.test_ids ?? []);
const splitOf = (id) => testSet.has(id) ? 'test' : trainSet.has(id) ? 'train' : 'unsplit';

function load(v) {
  const rows = readJsonl(join(FLOW, v, 'results.jsonl')).filter(r => (r.status ?? 'ok') === 'ok');
  const errors = readJsonl(join(FLOW, v, 'errors.jsonl'));
  const byCase = new Map();
  for (const r of rows) {
    if (!byCase.has(r.prompt_id)) byCase.set(r.prompt_id, []);
    byCase.get(r.prompt_id).push(r);
  }
  return { rows, errors, byCase };
}
const mean = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
function ci(xs) {
  const n = xs.length, m = mean(xs);
  if (n < 2) return { m, lo: NaN, hi: NaN, n };
  const sd = Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (n - 1));
  const h = 1.96 * sd / Math.sqrt(n);
  return { m, lo: clamp(m - h), hi: clamp(m + h), n, h };
}
const pct = (x) => Number.isFinite(x) ? (100 * x).toFixed(1) : "-";
const clamp = (x) => Math.max(0, Math.min(1, x));
const caseMean = (rs, k = 'correct') => mean(rs.map(r => r.grade[k]));

function summarize(v, base) {
  const { rows, errors, byCase } = load(v);
  const out = { v, n_rows: rows.length, n_errors: errors.length, err_by_class: {}, splits: {} };
  for (const e of errors) out.err_by_class[e.failure_class] = (out.err_by_class[e.failure_class] ?? 0) + 1;
  for (const split of ['train', 'test', 'all']) {
    const ids = [...byCase.keys()].filter(id => split === 'all' || splitOf(id) === split);
    if (!ids.length) continue;
    const acc = ci(ids.map(id => caseMean(byCase.get(id))));
    const s = { acc, n_cases: ids.length };
    const pos = ids.filter(id => !isNegative(id)), neg = ids.filter(isNegative);
    const repsOf = (list) => list.flatMap(id => byCase.get(id));
    s.miss = mean(repsOf(pos).map(r => r.meta.decision === 'none' || String(r.meta.decision).startsWith('other:') ? 1 : 0));
    s.wrong = mean(repsOf(pos).map(r => r.grade.fired && !r.grade.correct ? 1 : 0));
    s.false_trigger = mean(repsOf(neg).map(r => r.grade.fired));
    s.agree = mean(ids.map(id => new Set(byCase.get(id).map(r => r.meta.decision)).size === 1 ? 1 : 0));
    s.cost = rows.reduce((a, r) => a + (ids.includes(r.prompt_id) ? (r.cost_usd ?? 0) : 0), 0);
    if (base && v !== 'baseline') {
      const b = load(base).byCase;
      const both = ids.filter(id => b.has(id));
      const d = ci(both.map(id => caseMean(byCase.get(id)) - caseMean(b.get(id))));
      s.paired = { ...d, significant: Number.isFinite(d.lo) && (d.lo > 0 || d.hi < 0) };
      s.flips = both.map(id => ({ id, from: caseMean(b.get(id)), to: caseMean(byCase.get(id)) }))
        .filter(f => Math.abs(f.to - f.from) >= 0.5);
    }
    out.splits[split] = s;
  }
  // Per-skill precision / recall at the rep level (all splits).
  const skills = new Map();
  const bump = (k, f) => { if (!skills.has(k)) skills.set(k, { tp: 0, fp: 0, fn: 0 }); skills.get(k)[f]++; };
  const conf = new Map();
  for (const r of rows) {
    const l = labels.get(r.prompt_id) ?? labels.get(r.meta?.original_id);
    if (!l) continue;
    const d = r.meta.decision, want = l.primary || l.accept[0];
    if (r.grade.correct) { if (d !== 'none' && !String(d).startsWith('other:')) bump(d, 'tp'); }
    else {
      if (r.grade.fired) bump(d, 'fp');
      if (want !== 'none') bump(want, 'fn');
      const key = `${want} -> ${d}`;
      conf.set(key, (conf.get(key) ?? 0) + 1);
    }
  }
  out.versions = [...new Set(rows.map(r => r.meta?.claude_code_version).filter(Boolean))];
  out.skills = [...skills.entries()].sort().map(([k, c]) => ({ skill: k, ...c,
    precision: c.tp + c.fp ? c.tp / (c.tp + c.fp) : NaN, recall: c.tp + c.fn ? c.tp / (c.tp + c.fn) : NaN }));
  out.confusions = [...conf.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  return out;
}
function isNegative(id) {
  const l = labels.get(id);
  return l && l.accept.length === 1 && l.accept[0] === 'none';
}

function render(s) {
  const L = [`# Routing score: ${s.v}`, '', `Claude Code ${s.versions.join(', ') || '-'}.${s.versions.length > 1 ? ' WARNING: mixed versions inside one variant.' : ''}`, '', `${s.n_rows} scored rows, ${s.n_errors} failed attempts${s.n_errors ? ' ' + JSON.stringify(s.err_by_class) : ''} (failed attempts are never scored).`, ''];
  L.push('| split | cases | accuracy (95% CI) | paired delta vs baseline | miss | wrong skill | false trigger | reps agree | cost |');
  L.push('|---|---|---|---|---|---|---|---|---|');
  for (const [k, x] of Object.entries(s.splits)) {
    const p = x.paired ? `${x.paired.m >= 0 ? '+' : ''}${pct(x.paired.m)} [${pct(x.paired.lo)}, ${pct(x.paired.hi)}]${x.paired.significant ? '' : ' (noise)'}` : '-';
    L.push(`| ${k} | ${x.n_cases} | ${pct(x.acc.m)} [${pct(x.acc.lo)}, ${pct(x.acc.hi)}] | ${p} | ${pct(x.miss)} | ${pct(x.wrong)} | ${pct(x.false_trigger)} | ${pct(x.agree)} | $${x.cost.toFixed(2)} |`);
  }
  L.push('', 'Miss = a positive case got no Katalon skill. Wrong skill = a different Katalon skill. False trigger = a negative case grabbed a Katalon skill. Rates are over reps.', '');
  L.push('## Per skill (rep level)', '', '| skill | tp | fp | fn | precision | recall |', '|---|---|---|---|---|---|');
  for (const k of s.skills) L.push(`| ${k.skill} | ${k.tp} | ${k.fp} | ${k.fn} | ${pct(k.precision)} | ${pct(k.recall)} |`);
  L.push('', '## Top confusions (expected -> picked, rep count)', '');
  for (const [k, n] of s.confusions) L.push(`- ${k}: ${n}`);
  if (s.splits.train?.flips?.length) {
    L.push('', '## Train cases that moved vs baseline', '');
    for (const f of s.splits.train.flips) L.push(`- ${f.id}: ${pct(f.from)} -> ${pct(f.to)}`);
  }
  if (s.splits.test?.flips) L.push('', `Test cases that moved: ${s.splits.test.flips.filter(f => f.to > f.from).length} up, ${s.splits.test.flips.filter(f => f.to < f.from).length} down (ids withheld from the analyzer).`);
  return L.join('\n') + '\n';
}

const base = variants.includes('baseline') ? 'baseline' : null;
{
  const vs = new Set(variants.flatMap(v => load(v).rows.map(r => r.meta?.claude_code_version)).filter(Boolean));
  if (vs.size > 1) console.log(`WARNING: variants ran on different Claude Code versions (${[...vs].join(', ')}); re-run a no-change control before trusting a delta.`);
}
const targets = only ? [only] : variants;
for (const v of targets) {
  const s = summarize(v, base);
  writeFileSync(join(FLOW, v, 'score.md'), render(s));
  const t = s.splits.test ?? s.splits.all, tr = s.splits.train;
  const line = [`${v.padEnd(9)}`,
    tr ? `train ${pct(tr.acc.m)}` : '',
    t ? `${s.splits.test ? 'test' : 'all'} ${pct(t.acc.m)} [${pct(t.acc.lo)}, ${pct(t.acc.hi)}]` : '',
    t?.paired ? `paired ${t.paired.m >= 0 ? '+' : ''}${pct(t.paired.m)}${t.paired.significant ? '' : ' (noise)'}` : '',
    t ? `FT ${pct(t.false_trigger)} miss ${pct(t.miss)} wrong ${pct(t.wrong)}` : '',
    `errors ${s.n_errors}`, `cc ${s.versions.join('+') || '-'}`].filter(Boolean).join(' | ');
  console.log(line);
}
