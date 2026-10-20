#!/usr/bin/env node
/**
 * analyzer-view.mjs - the only view of a round a description-proposing analyzer
 * may read: train-split rows, train traces, and train-only confusions. Test
 * cases never appear, so nothing held out can leak into a proposed change.
 *
 *   node evals/routing/analyzer-view.mjs --variant v2 --out /tmp/analyzer-v2
 *
 * Writes <out>/rows.jsonl, <out>/traces/*.json, <out>/summary.md (per-case
 * rep outcomes, confusions, per-skill recall on train), <out>/descriptions.json.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const FLOW = resolve(opt('--flow') ?? HERE);
const v = opt('--variant') ?? 'baseline';
const out = resolve(opt('--out') ?? `/tmp/analyzer-${v}`);
const readJsonl = (p) => readFileSync(p, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const st = JSON.parse(readFileSync(join(FLOW, '_state.json'), 'utf8'));
const train = new Set(st.train_ids ?? []);
if (!train.size) { console.error('no train_ids in _state.json'); process.exit(2); }
const labels = new Map(readJsonl(join(HERE, 'labels.jsonl')).map(l => [l.id, l]));

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'traces'), { recursive: true });
const rows = readJsonl(join(FLOW, v, 'results.jsonl')).filter(r => train.has(r.prompt_id));
writeFileSync(join(out, 'rows.jsonl'), rows.map(r => JSON.stringify({
  id: r.prompt_id, rep: r.rep, prompt: r.prompt, tags: r.tags, picked: r.meta.decision,
  accept: labels.get(r.prompt_id)?.accept, why: labels.get(r.prompt_id)?.why, grade: r.grade, said: r.meta.text,
})).join('\n') + '\n');
for (const r of rows) {
  const t = join(FLOW, v, 'traces', `${r.prompt_id}_rep${r.rep}.json`);
  if (existsSync(t)) cpSync(t, join(out, 'traces', `${r.prompt_id}_rep${r.rep}.json`));
}
cpSync(join(FLOW, v, 'descriptions.json'), join(out, 'descriptions.json'));

const byCase = new Map();
for (const r of rows) { if (!byCase.has(r.prompt_id)) byCase.set(r.prompt_id, []); byCase.get(r.prompt_id).push(r); }
const L = [`# Train-only view of ${v}`, '', `${byCase.size} train cases, ${rows.length} reps.`, ''];
const failing = [...byCase.entries()].map(([id, rs]) => ({ id, rs, acc: rs.reduce((a, r) => a + r.grade.correct, 0) / rs.length }))
  .filter(x => x.acc < 1).sort((a, b) => a.acc - b.acc);
L.push(`## Train cases with at least one wrong rep (${failing.length})`, '', '| id | reps correct | expected | picked (per rep) |', '|---|---|---|---|');
for (const f of failing) L.push(`| ${f.id} | ${f.rs.filter(r => r.grade.correct).length}/${f.rs.length} | ${labels.get(f.id)?.accept.join(' or ')} | ${f.rs.map(r => r.meta.decision).join(', ')} |`);
const conf = new Map(), rec = new Map();
for (const r of rows) {
  const want = labels.get(r.prompt_id)?.primary ?? 'none';
  if (!rec.has(want)) rec.set(want, [0, 0]);
  rec.get(want)[1]++; if (r.grade.correct) rec.get(want)[0]++;
  if (!r.grade.correct) { const k = `${want} -> ${r.meta.decision}`; conf.set(k, (conf.get(k) ?? 0) + 1); }
}
L.push('', '## Confusions on train (expected -> picked, reps)', '');
for (const [k, n] of [...conf.entries()].sort((a, b) => b[1] - a[1])) L.push(`- ${k}: ${n}`);
L.push('', '## Recall by expected owner on train', '', '| owner | correct reps |', '|---|---|');
for (const [k, [a, n]] of [...rec.entries()].sort()) L.push(`| ${k} | ${a}/${n} |`);
writeFileSync(join(out, 'summary.md'), L.join('\n') + '\n');
console.log(`train view -> ${out} (${byCase.size} cases, ${failing.length} with a wrong rep)`);
