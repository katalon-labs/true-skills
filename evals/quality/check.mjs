#!/usr/bin/env node
/**
 * check.mjs - run the deterministic output-quality checks over a saved agent output.
 *
 *   node evals/quality/check.mjs --skill create-test-cases --scenario s1 --output out.md
 *   node evals/quality/check.mjs --skill test-review --scenario s2 --output out.json --json
 *   node evals/quality/check.mjs --list
 *   node evals/quality/check.mjs --self-test      # good goldens must pass, defective goldens must fail on the planted checks
 *
 * Exit codes: 0 every applicable check passed, 1 at least one FAIL, 2 usage error.
 * No model, no network, no Katalon call.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { QUALITY_DIR, goldenPath, listScenarios, listSkills, loadDefects, checkOutput, loadRubric } from './lib/load.mjs';
import { summarize } from './lib/checks.mjs';

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
const flag = (name) => args.includes(name);

function usage(msg) {
  if (msg) console.error(`error: ${msg}`);
  console.error('usage: check.mjs --skill <name> --scenario <id> --output <file> [--json]\n       check.mjs --list\n       check.mjs --self-test');
  process.exit(2);
}

function print(results, asJson) {
  if (asJson) {
    console.log(JSON.stringify({ summary: summarize(results), results }, null, 2));
    return;
  }
  const w = Math.max(...results.map((r) => r.id.length));
  for (const r of results) console.log(`${r.status.padEnd(4)}  ${r.id.padEnd(w)}  ${r.detail}`);
  const s = summarize(results);
  console.log(`\nRESULT: ${s.PASS} PASS, ${s.FAIL} FAIL, ${s.SKIP} SKIP`);
}

if (flag('--list')) {
  for (const skill of listSkills()) {
    const r = loadRubric(skill);
    console.log(`${skill}  (${r.checks.length} checks)`);
    for (const s of listScenarios(skill)) console.log(`  ${s.id}  ${s.title}`);
  }
  process.exit(0);
}

if (flag('--self-test')) {
  let failed = 0;
  const verbose = flag('--verbose');
  for (const skill of listSkills()) {
    const defects = loadDefects(skill);
    const goldenDir = join(QUALITY_DIR, skill, 'golden');
    const goods = readdirSync(goldenDir).map((f) => f.match(/^good\.(s\d+)\.md$/)).filter(Boolean).map((m) => m[1]).sort();
    for (const scenarioId of goods) {
      const good = checkOutput({ skill, scenarioId, text: readFileSync(goldenPath(skill, 'good', scenarioId), 'utf8') });
      const fails = good.results.filter((r) => r.status === 'FAIL');
      console.log(`${fails.length ? 'FAIL' : 'PASS'}  ${skill} ${scenarioId}  good sample: ${fails.length ? 'fails ' + fails.map((r) => `${r.id} (${r.detail})`).join(', ') : 'all checks pass'}`);
      if (fails.length) failed++;
    }
    const scenarioId = defects?.scenario ?? 's1';
    const defective = checkOutput({ skill, scenarioId, text: readFileSync(goldenPath(skill, 'defective', scenarioId), 'utf8') });
    const gotFails = defective.results.filter((r) => r.status === 'FAIL').map((r) => r.id).sort();
    const wantFails = [...(defects?.expectFail ?? [])].sort();
    const defOk = JSON.stringify(gotFails) === JSON.stringify(wantFails);
    console.log(`${defOk ? 'PASS' : 'FAIL'}  ${skill} ${scenarioId}  defective sample: ${defOk ? `fails exactly the ${wantFails.length} planted checks` : `fails ${gotFails.join(',')} but want ${wantFails.join(',')}`}`);
    if (verbose && defOk) for (const r of defective.results.filter((x) => x.status === 'FAIL')) console.log(`        ${r.id}: ${r.detail}`);
    if (!defOk) failed++;
  }
  process.exit(failed ? 1 : 0);
}

const skill = opt('--skill');
const scenarioId = opt('--scenario');
const out = opt('--output');
if (!skill || !scenarioId || !out) usage('--skill, --scenario and --output are required');
if (!listSkills().includes(skill)) usage(`unknown skill "${skill}". Known: ${listSkills().join(', ')}`);
if (!existsSync(out)) usage(`output file not found: ${out}`);

let res;
try {
  res = checkOutput({ skill, scenarioId, text: readFileSync(out, 'utf8') });
} catch (e) {
  usage(e.message);
}
print(res.results, flag('--json'));
process.exit(res.results.some((r) => r.status === 'FAIL') ? 1 : 0);
