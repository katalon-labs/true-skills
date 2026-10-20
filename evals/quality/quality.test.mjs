/**
 * quality.test.mjs - self-tests for the output-quality harness. No model, no network.
 *
 *   node --test evals/quality/quality.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHECK_TYPES, buildContext, parseCases, parseClusters, resolveParams, runChecks } from './lib/checks.mjs';
import { QUALITY_DIR, checkOutput, goldenPath, listScenarios, listSkills, loadDefects, loadRubric, readFixture } from './lib/load.mjs';
import { combine, parseJudgeReply, slotPreference, compare } from './judge.mjs';

const SKILLS = ['analyze-failures', 'create-test-cases', 'release-analyze', 'test-case-to-playwright', 'test-estimation', 'test-review'];
const HERE = dirname(fileURLToPath(import.meta.url));

const ctxOf = (text, extra = {}) => buildContext({ text, fixtureText: extra.fixture ?? '', scenario: { expect: extra.expect ?? {} } });
const run = (type, text, params, extra) => CHECK_TYPES[type](ctxOf(text, extra), params);

// ---------------------------------------------------------------- coverage of the plan

test('the six artifact skills each have a rubric and 3 scenarios', () => {
  assert.deepEqual(listSkills(), SKILLS);
  for (const s of SKILLS) {
    const sc = listScenarios(s);
    assert.deepEqual(sc.map((x) => x.id), ['s1', 's2', 's3'], `${s} scenarios`);
  }
});

test('every scenario has a prompt, an existing fixture file and grounded id lists', () => {
  for (const skill of SKILLS) {
    for (const sc of listScenarios(skill)) {
      assert.ok(sc.title && sc.prompt, `${skill}/${sc.id} needs a title and a prompt`);
      const fixture = readFixture(sc);
      assert.ok(fixture.length > 100, `${skill}/${sc.id} fixture is missing or empty`);
      for (const key of sc.idKeys ?? []) {
        for (const id of [].concat(sc.expect[key])) {
          assert.ok(fixture.includes(String(id)), `${skill}/${sc.id}: expect.${key} value "${id}" is not in the fixture`);
        }
      }
    }
  }
});

test('rubrics: unique ids, known check types, every scenario key is defined somewhere', () => {
  for (const skill of SKILLS) {
    const rubric = loadRubric(skill);
    const scenarios = listScenarios(skill);
    const ids = rubric.checks.map((c) => c.id);
    assert.equal(new Set(ids).size, ids.length, `${skill}: duplicate check id`);
    assert.ok(ids.includes('style-no-em-dash'), `${skill}: needs the style check`);
    assert.ok(rubric.checks.length >= 15, `${skill}: only ${rubric.checks.length} checks`);
    for (const c of rubric.checks) {
      assert.ok(CHECK_TYPES[c.type], `${skill}/${c.id}: unknown type ${c.type}`);
      assert.ok(c.desc, `${skill}/${c.id}: needs a desc`);
      const refs = JSON.stringify(c.params ?? {}).match(/\$expect\.(\w+)/g) ?? [];
      const keys = new Set(refs.map((r) => r.slice(8)));
      if (c.when) keys.add(c.when);
      for (const k of keys) {
        assert.ok(scenarios.some((s) => s.expect && k in s.expect), `${skill}/${c.id}: no scenario sets expect.${k}`);
      }
      // A check without `when` must be satisfiable in every scenario, so each $expect key it uses must be set everywhere.
      if (!c.when) {
        for (const k of keys) for (const s of scenarios) assert.ok(k in (s.expect ?? {}), `${skill}/${c.id}: scenario ${s.id} lacks expect.${k}`);
      }
    }
  }
});

// ------------------------------------------------------------------- golden samples

test('golden: the good sample of every scenario passes every applicable check', () => {
  for (const skill of SKILLS) {
    const goods = readdirSync(join(QUALITY_DIR, skill, 'golden')).filter((f) => /^good\.s\d+\.md$/.test(f));
    assert.equal(goods.length, 3, `${skill} needs a good sample for each scenario`);
    for (const f of goods) {
      const id = f.match(/^good\.(s\d+)\.md$/)[1];
      const { results } = checkOutput({ skill, scenarioId: id, text: readFileSync(goldenPath(skill, 'good', id), 'utf8') });
      const fails = results.filter((r) => r.status === 'FAIL');
      assert.deepEqual(fails.map((r) => `${r.id}: ${r.detail}`), [], `${skill} ${id}`);
      assert.ok(results.filter((r) => r.status === 'PASS').length >= 12, `${skill} ${id} ran too few checks`);
    }
  }
});

test('golden: the defective sample fails exactly the planted checks', () => {
  for (const skill of SKILLS) {
    const defects = loadDefects(skill);
    assert.ok(defects?.expectFail?.length >= 5, `${skill}: defects.json needs 5 or more planted checks`);
    const { results } = checkOutput({ skill, scenarioId: defects.scenario, text: readFileSync(goldenPath(skill, 'defective', defects.scenario), 'utf8') });
    const got = results.filter((r) => r.status === 'FAIL').map((r) => r.id).sort();
    assert.deepEqual(got, [...defects.expectFail].sort(), skill);
  }
});

test('golden: a defective sample never passes the whole rubric', () => {
  for (const skill of SKILLS) {
    const defects = loadDefects(skill);
    const text = readFileSync(goldenPath(skill, 'defective', defects.scenario), 'utf8');
    const { results } = checkOutput({ skill, scenarioId: defects.scenario, text });
    assert.ok(results.some((r) => r.status === 'FAIL'));
  }
});

test('house style: no em dash in any file under evals/quality', () => {
  const walk = (dir) =>
    readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? walk(p) : [p];
    });
  for (const file of walk(HERE)) {
    assert.ok(!readFileSync(file, 'utf8').includes(String.fromCharCode(0x2014)), `${file} has an em dash`);
  }
});

// ------------------------------------------------------------------- check types

test('resolveParams swaps $expect references and flattens lists', () => {
  const expect = { ids: ['a', 'b'], n: 4 };
  assert.deepEqual(resolveParams({ values: '$expect.ids', min: '$expect.n' }, expect), { values: ['a', 'b'], min: 4 });
  assert.deepEqual(resolveParams(['x', '$expect.ids'], expect), ['x', 'a', 'b']);
});

test('present and absent', () => {
  assert.equal(run('present', 'plan then confirm', { patterns: ['plan', 'confirm'] }).pass, true);
  assert.equal(run('present', 'plan only', { patterns: ['plan', 'confirm'] }).pass, false);
  assert.equal(run('absent', 'clean text', { pattern: 'secret' }).pass, true);
  assert.equal(run('absent', 'a secret', { pattern: 'secret' }).pass, false);
});

test('label-in takes the longest allowed word and rejects an unfilled template', () => {
  const allowed = ['Ready', 'Ready with risk', 'Not ready'];
  assert.equal(run('label-in', 'Release Readiness: Ready with risk', { label: 'Release Readiness', allowed }).pass, true);
  assert.equal(run('label-in', '**Release Readiness:** Not ready', { label: 'Release Readiness', allowed }).pass, true);
  assert.equal(run('label-in', 'Release Readiness: Ready | Ready with risk | Not ready', { label: 'Release Readiness', allowed }).pass, false);
  assert.equal(run('label-in', 'Release Readiness: Almost', { label: 'Release Readiness', allowed }).pass, false);
  assert.equal(run('label-in', 'no label here', { label: 'Release Readiness', allowed }).pass, false);
  assert.equal(run('label-not-in', 'Release Readiness: Ready', { label: 'Release Readiness', values: ['Ready'] }).pass, false);
  assert.equal(run('label-not-in', 'Release Readiness: Ready with risk', { label: 'Release Readiness', values: ['Ready'] }).pass, true);
});

test('label checks also read a JSON output', () => {
  assert.equal(run('label-in', '{"verdict": "Approve with fixes"}', { label: 'Verdict', allowed: ['Approve', 'Approve with fixes'] }).pass, true);
  assert.equal(run('sections-present', '{"verdict": "x", "coverage": "y"}', { labels: ['Verdict', 'Coverage'] }).pass, true);
});

test('sections-present accepts a label or a heading', () => {
  const text = 'Verdict: x\n## Fix list\n- a';
  assert.equal(run('sections-present', text, { labels: ['Verdict', 'Fix list'] }).pass, true);
  assert.equal(run('sections-present', text, { labels: ['Verdict', 'Coverage'] }).pass, false);
});

test('numbers-monotone', () => {
  const labels = ['Best case', 'Likely', 'Worst case'];
  assert.equal(run('numbers-monotone', 'Best case 10 h\nLikely 20 h\nWorst case 40 h', { labels }).pass, true);
  assert.equal(run('numbers-monotone', 'Best case 30 h\nLikely 20 h\nWorst case 40 h', { labels }).pass, false);
  assert.equal(run('numbers-monotone', 'Best case 10 h\nLikely 20 h', { labels }).pass, false);
});

test('buckets-sum', () => {
  const ok = 'Likely 47.9 h\nA Design 10.0 | B Manual execution 31.0 | C Triage 1.8 | D Authoring 0 (deferred) | E Overhead (12%) 5.1';
  const bad = 'Likely 47.9 h\nA Design 10.0 | B Manual execution 31.0 | C Triage 1.8 | D Authoring 0 | E Overhead (12%) 9.9';
  assert.equal(run('buckets-sum', ok, { tolerance: 0.6 }).pass, true);
  assert.equal(run('buckets-sum', bad, { tolerance: 0.6 }).pass, false);
  assert.equal(run('buckets-sum', 'Likely 47.9 h', {}).pass, false);
});

test('near-all and not-near-any', () => {
  const text = `TC-1 is unconfirmed because of 6 runs.${'\n'.repeat(300)}TC-2 is steady.`;
  assert.equal(run('near-all', text, { values: ['TC-1'], pattern: 'unconfirmed', window: 100 }).pass, true);
  assert.equal(run('near-all', text, { values: ['TC-2'], pattern: 'unconfirmed', window: 100 }).pass, false);
  assert.equal(run('near-all', text, { values: ['TC-9'], pattern: 'x' }).pass, false);
  assert.equal(run('not-near-any', 'TC-1 needs create_defect now', { values: ['TC-1'], pattern: 'create_defect', window: 50 }).pass, false);
  assert.equal(run('not-near-any', 'TC-1 needs a repair', { values: ['TC-1'], pattern: 'create_defect', window: 50 }).pass, true);
});

test('grounded-ids compares output ids with the fixture', () => {
  const fixture = 'TC-1 and DEF-7 exist';
  assert.equal(run('grounded-ids', 'see TC-1 and DEF-7', { pattern: '\\b(?:TC|DEF)-\\d+\\b' }, { fixture }).pass, true);
  const r = run('grounded-ids', 'see TC-1 and DEF-99', { pattern: '\\b(?:TC|DEF)-\\d+\\b' }, { fixture });
  assert.equal(r.pass, false);
  assert.match(r.detail, /def-99/);
});

test('code-balanced ignores brackets inside strings, comments and regex literals', () => {
  const good = '```ts\nconst a = "(";\n// )\nconst r = /\\(.*\\)/;\nconst t = `${x}(`;\nfn({ a: [1] });\n```';
  const bad = '```ts\nfn({ a: [1] );\n```';
  assert.equal(run('code-balanced', good, {}).pass, true);
  assert.equal(run('code-balanced', bad, {}).pass, false);
  assert.equal(run('code-balanced', 'no fence', {}).pass, false);
});

test('parseCases reads markdown blocks and JSON arrays', () => {
  const md = 'Name: Reject short password\nDescription: d\nPre-condition: p\n| Step | Test Step | Expected Result | Test Data |\n| --- | --- | --- | --- |\n| 1 | Open the page | Page opens | N/A |\n| 2 | Type 7 chars | Typed | abc |\nPriority: P1\n\nName: Second\nPre-condition: q\n| 1 | One | Two | N/A |';
  const cases = parseCases(md, null);
  assert.equal(cases.length, 2);
  assert.equal(cases[0].steps.length, 2);
  assert.equal(cases[0].precondition, 'p');
  assert.equal(cases[0].priority, 'P1');
  const json = [{ name: 'A b', precondition: 'x', steps: [{ action: 'do', expected: 'see' }] }];
  assert.equal(parseCases('[]', json)[0].steps[0].expected, 'see');
});

test('case checks', () => {
  const good = 'Name: Reject password with 7 characters\nPre-condition: page open\n| 1 | Open | Opens | N/A |\n| 2 | Type | Typed | x |\n| 3 | Click Create account | Error shown | N/A |';
  assert.equal(run('case-names-charset', good, {}).pass, true);
  assert.equal(run('case-shape', good, { minSteps: 3 }).pass, true);
  assert.equal(run('case-shape', good, { minSteps: 4 }).pass, false);
  assert.equal(run('case-names-charset', 'Name: Bad: name\nPre-condition: p', {}).pass, false);
  assert.equal(run('case-names-charset', 'Name: Bad/name\nPre-condition: p', {}).pass, false);
  assert.equal(run('case-names-charset', 'Name: Valid (ok), v1.2_x-y\nPre-condition: p', {}).pass, true);
  assert.equal(run('case-names-unique', 'Name: A\nName: a', {}).pass, false);
  assert.equal(run('case-names-not-in', 'Name: Reject expired promo code', { titles: ['reject expired promo code'] }).pass, false);
  assert.equal(run('case-steps-single-action', 'Name: A\n| 1 | Enter x and then click Send | ok | N/A |', {}).pass, false);
  assert.equal(run('case-no-vague-expected', 'Name: A\n| 1 | Open | works correctly | N/A |', {}).pass, false);
  assert.equal(run('case-name-coverage', good, { groups: [['7 character'], ['space']] }).pass, false);
  assert.equal(run('case-name-coverage', good, { groups: [['7 character']] }).pass, true);
});

test('cluster checks', () => {
  const text = [
    'Cluster 1: timeouts   (2 cases)',
    '  Classification: automation',
    '  Likely cause:   id changed',
    '  Evidence:       trace',
    '  Cases:          TC-1, TC-2',
    '  Action:         repair',
    '',
    'Cluster 2: 502   (1 case)',
    '  Classification: environment',
    '  Likely cause:   outage',
    '  Evidence:       time window',
    '  Cases:          TC-3',
    '  Action:         rerun after consent',
    '',
    'No verdict',
    '- TC-4 BLOCKED: data',
  ].join('\n');
  assert.equal(parseClusters(text).length, 2);
  assert.equal(run('cluster-count', text, { min: 2, max: 2 }).pass, true);
  assert.equal(run('cluster-fields', text, {}).pass, true);
  assert.equal(run('cluster-classification', text, { map: { 'TC-1': 'automation', 'TC-3': 'environment' } }).pass, true);
  assert.equal(run('cluster-classification', text, { map: { 'TC-3': 'product' } }).pass, false);
  assert.equal(run('cluster-classification', text, { map: { 'TC-9': 'product' } }).pass, false);
  assert.equal(run('block-contains', text, { heading: 'No verdict', ids: ['TC-4'] }).pass, true);
  assert.equal(run('block-contains', text, { heading: 'No verdict', ids: ['TC-1'] }).pass, false);
  assert.equal(run('block-excludes', text, { ids: ['TC-4'] }).pass, true);
  assert.equal(run('block-excludes', text, { ids: ['TC-1'] }).pass, false);
  assert.equal(run('label-in', text, { label: 'Classification', allowed: ['product', 'automation', 'environment'], all: true }).pass, true);
  assert.equal(run('label-in', text.replace('environment', 'flaky'), { label: 'Classification', allowed: ['product', 'automation', 'environment'], all: true }).pass, false);
});

test('runChecks skips a check whose when key is empty and reports an unknown type', () => {
  const rubric = {
    checks: [
      { id: 'a', type: 'present', desc: 'd', params: { pattern: 'x' } },
      { id: 'b', type: 'present', desc: 'd', when: 'never', params: { pattern: 'zzz' } },
      { id: 'c', type: 'nope', desc: 'd' },
      { id: 'd', type: 'contains-all', desc: 'd', when: 'ids', params: { values: '$expect.ids' } },
    ],
  };
  const out = runChecks(rubric, ctxOf('x TC-1', { expect: { ids: ['TC-1'] } }));
  assert.deepEqual(out.map((r) => r.status), ['PASS', 'SKIP', 'FAIL', 'PASS']);
});

test('style check catches an em dash built at runtime', () => {
  const rubric = loadRubric('release-analyze');
  const check = rubric.checks.find((c) => c.id === 'style-no-em-dash');
  const r = CHECK_TYPES[check.type](ctxOf(`good ${String.fromCharCode(0x2014)} bad`), check.params);
  assert.equal(r.pass, false);
});

// ---------------------------------------------------------------------------- CLI

test('check.mjs prints PASS and FAIL per check and sets the exit code', () => {
  const cli = join(HERE, 'check.mjs');
  const good = spawnSync('node', [cli, '--skill', 'test-review', '--scenario', 's1', '--output', goldenPath('test-review', 'good', 's1')], { encoding: 'utf8' });
  assert.equal(good.status, 0, good.stdout);
  assert.match(good.stdout, /^PASS {2}verdict-expected/m);
  assert.match(good.stdout, /RESULT: \d+ PASS, 0 FAIL/);
  const bad = spawnSync('node', [cli, '--skill', 'test-review', '--scenario', 's1', '--output', goldenPath('test-review', 'defective', 's1')], { encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /^FAIL {2}verdict-expected/m);
  const json = spawnSync('node', [cli, '--skill', 'test-review', '--scenario', 's1', '--output', goldenPath('test-review', 'good', 's1'), '--json'], { encoding: 'utf8' });
  assert.equal(JSON.parse(json.stdout).summary.FAIL, 0);
  const usage = spawnSync('node', [cli, '--skill', 'nope', '--scenario', 's1', '--output', 'x'], { encoding: 'utf8' });
  assert.equal(usage.status, 2);
  const self = spawnSync('node', [cli, '--self-test'], { encoding: 'utf8' });
  assert.equal(self.status, 0, self.stdout);
});

// -------------------------------------------------------------------------- judge

test('judge math: weighted expectation, both orders, slot bias', () => {
  assert.equal(slotPreference({ a_much_better: 1, a_better: 0, tie: 0, b_better: 0, b_much_better: 0 }), 1);
  assert.equal(slotPreference({ a_much_better: 0, a_better: 0, tie: 1, b_better: 0, b_much_better: 0 }), 0);
  const w = parseJudgeReply('noise {"weights": {"a_better": 2, "tie": 2, "b_better": 0}} trailing');
  assert.equal(Math.round(w.a_better * 100), 50);
  assert.throws(() => parseJudgeReply('no json'));
  assert.throws(() => parseJudgeReply('{"weights": {"a_better": -1}}'));
  assert.throws(() => parseJudgeReply('{"weights": {}}'));
  const clear = combine(0.8, -0.6);
  assert.equal(clear.verdict, 'first output preferred');
  assert.ok(clear.ordersAgree);
  const pure = combine(1, 1);
  assert.equal(pure.verdict, 'no clear preference');
  assert.equal(pure.slotBias, 1);
  assert.equal(pure.ordersAgree, false);
});

function fakeJudge(dir, name, body) {
  const file = join(dir, name);
  writeFileSync(file, body);
  chmodSync(file, 0o755);
  return `node ${file} {prompt_file}`;
}

test('judge: a position-biased judge shows no preference and a slot bias', () => {
  const dir = mkdtempSync(join(tmpdir(), 'judge-test-'));
  try {
    const cmd = fakeJudge(dir, 'biased.mjs', 'console.log(JSON.stringify({weights:{a_much_better:1}}));');
    const r = compare({ template: cmd, skill: 'test-review', scenarioId: 's1', textA: 'first answer', textB: 'second answer' });
    assert.equal(r.verdict, 'no clear preference');
    assert.equal(r.slotBias, 1);
    assert.equal(r.ordersAgree, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('judge: a content judge prefers the same output in both orders and runs both orders', () => {
  const dir = mkdtempSync(join(tmpdir(), 'judge-test-'));
  try {
    const body = `
import { readFileSync, appendFileSync } from 'node:fs';
const prompt = readFileSync(process.argv[2], 'utf8');
appendFileSync(${JSON.stringify(join(dir, 'calls.log'))}, 'call\\n');
const a = prompt.split('## Answer A\\n')[1].split('## Answer B')[0];
const b = prompt.split('## Answer B\\n')[1].split('## Your reply')[0];
const w = a.includes('GOOD') ? {a_much_better: 0.7, a_better: 0.3} : b.includes('GOOD') ? {b_much_better: 0.7, b_better: 0.3} : {tie: 1};
console.log(JSON.stringify({weights: w}));
`;
    const cmd = fakeJudge(dir, 'content.mjs', body);
    const r = compare({ template: cmd, skill: 'test-review', scenarioId: 's1', textA: 'GOOD answer', textB: 'plain answer' });
    assert.equal(r.verdict, 'first output preferred');
    assert.ok(r.preferenceForFirst > 0.8);
    assert.equal(r.slotBias, 0);
    assert.equal(r.ordersAgree, true);
    assert.equal(readFileSync(join(dir, 'calls.log'), 'utf8').trim().split('\n').length, 2);
    const swapped = compare({ template: cmd, skill: 'test-review', scenarioId: 's1', textA: 'plain answer', textB: 'GOOD answer' });
    assert.equal(swapped.verdict, 'second output preferred');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('judge.mjs exits 3 when QUALITY_JUDGE_CMD is unset and prints no absolute score', () => {
  const env = { ...process.env };
  delete env.QUALITY_JUDGE_CMD;
  const a = goldenPath('test-review', 'good', 's1');
  const b = goldenPath('test-review', 'defective', 's1');
  const r = spawnSync('node', [join(HERE, 'judge.mjs'), '--skill', 'test-review', '--scenario', 's1', '--a', a, '--b', b], { encoding: 'utf8', env });
  assert.equal(r.status, 3);
  const dir = mkdtempSync(join(tmpdir(), 'judge-test-'));
  try {
    const cmd = fakeJudge(dir, 'tie.mjs', 'console.log(JSON.stringify({weights:{tie:1}}));');
    const ok = spawnSync('node', [join(HERE, 'judge.mjs'), '--skill', 'test-review', '--scenario', 's1', '--a', a, '--b', b], { encoding: 'utf8', env: { ...env, QUALITY_JUDGE_CMD: cmd } });
    assert.equal(ok.status, 0, ok.stderr);
    assert.match(ok.stdout, /weighted preference for the first output/);
    assert.match(ok.stdout, /hard checks: first fails 0/);
    assert.doesNotMatch(ok.stdout, /score/i);
    const broken = spawnSync('node', [join(HERE, 'judge.mjs'), '--skill', 'test-review', '--scenario', 's1', '--a', a, '--b', b], { encoding: 'utf8', env: { ...env, QUALITY_JUDGE_CMD: 'echo not json' } });
    assert.equal(broken.status, 4);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
