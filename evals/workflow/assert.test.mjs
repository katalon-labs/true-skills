import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  IMPLICIT_RULES, bareSkillName, bareToolName, buildTimeline, callMatches, evaluate, isDestructiveCall, loadContract, validateScenario,
} from './assert.mjs';
import { checkEnvironment, eventsFromStream, loadScenarios, replayRecordings, turnArgs } from './run.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const contract = loadContract();

// --- tiny transcript builders ------------------------------------------------

const user = (text, confirms = false) => ({ type: 'user', text, confirms });
const say = text => ({ type: 'assistant', text });
const skill = name => ({ type: 'tool_call', name: 'Skill', args: { skill: `katalon-true-platform:${name}` } });
const call = (tool, args = {}) => ({ type: 'tool_call', name: `mcp__katalon__${tool}`, args });
const row = (tool, args = {}, outcome = 'ok', extra = {}) => ({ method: 'tools/call', tool, args, outcome, ...extra });
const rowsFor = events => events.filter(e => e.type === 'tool_call' && e.name.startsWith('mcp__')).map(e => row(e.name.replace(/^mcp__.+?__/, ''), e.args));
const run = (events, assertions = [], rows = rowsFor(events)) => evaluate({ scenario: { assertions }, events, rows, contract });
const failed = r => r.failed;

// --- helpers -----------------------------------------------------------------

test('contract: 74 live tools with classes, snapshot schemas for each', () => {
  assert.equal(contract.tools.size, 74);
  assert.equal(contract.schemas.size, 74);
  assert.equal(contract.tools.get('create_test_run').class, 'write');
  assert.equal(contract.tools.get('delete_test_case').class, 'destructive');
  assert.equal(contract.tools.get('list_projects').class, 'read');
});

test('names: strips the client prefix and the plugin prefix', () => {
  assert.equal(bareToolName('mcp__katalon__create_test_run'), 'create_test_run');
  assert.equal(bareToolName('mcp__af6f168c-3d13__list_projects'), 'list_projects');
  assert.equal(bareToolName('create_test_run'), 'create_test_run');
  assert.equal(bareSkillName('katalon-true-platform:execute-test'), 'execute-test');
  assert.equal(bareSkillName('/execute-test'), 'execute-test');
});

test('isDestructiveCall: class, action tokens and END with SKIP', () => {
  const mk = (tool, args) => ({ tool, args, entry: contract.tools.get(tool) });
  assert.equal(isDestructiveCall(mk('delete_test_case', {})), true);
  assert.equal(isDestructiveCall(mk('manage_test_suite', { payload: { action: 'DELETE' } })), true);
  assert.equal(isDestructiveCall(mk('manage_test_suite', { payload: { action: 'RENAME' } })), false);
  assert.equal(isDestructiveCall(mk('manage_requirement_test_case_linkages', { action: 'unlink' })), true);
  assert.equal(isDestructiveCall(mk('manage_requirement_test_case_linkages', { action: 'link' })), false);
  assert.equal(isDestructiveCall(mk('update_test_run', { update: { action: 'END', unfinished_cases: 'SKIP' } })), true);
  assert.equal(isDestructiveCall(mk('update_test_run', { update: { action: 'END' } })), false);
  assert.equal(isDestructiveCall(mk('manage_test_cloud_dynamic_app', { payload: { action: 'UPDATE' } })), true);
});

test('callMatches: tool list, partial match, regex and absent keys', () => {
  const c = { tool: 'memory_write', args: { body: 'Always add the key', kind: 'convention' } };
  assert.equal(callMatches(c, { tool: 'memory_write' }), true);
  assert.equal(callMatches(c, { tools: ['memory_list', 'memory_write'] }), true);
  assert.equal(callMatches(c, { tool: 'memory_write', match: { kind: 'convention' } }), true);
  assert.equal(callMatches(c, { tool: 'memory_write', match: { kind: 'verdict' } }), false);
  assert.equal(callMatches(c, { tool: 'memory_write', matchRegex: { body: 'always add' } }), true);
  assert.equal(callMatches(c, { tool: 'memory_write', matchRegex: { body: { re: 'always add', flags: '' } } }), false);
  assert.equal(callMatches(c, { tool: 'memory_write', absent: ['project_id'] }), true);
  assert.equal(callMatches({ ...c, args: { ...c.args, project_id: 1 } }, { tool: 'memory_write', absent: ['project_id'] }), false);
});

// --- implicit rules ----------------------------------------------------------

test('confirm-before-write: a write with no confirming turn fails', () => {
  const r = run([user('Create a run'), say('Creating it.'), call('create_test_run', { mode: 'manual', name: 'x' })]);
  assert.ok(failed(r).includes('confirm-before-write'));
});

test('confirm-before-write: a confirming turn after a preview passes', () => {
  const r = run([user('Create a run'), say('Preview. Proceed?'), user('Yes', true), call('create_test_run', { mode: 'manual', name: 'x' })]);
  assert.ok(!failed(r).includes('confirm-before-write'));
});

test('confirm-before-write: a confirming turn that no assistant message preceded does not count', () => {
  const r = run([user('Yes, do it', true), call('create_test_run', { mode: 'manual', name: 'x' })]);
  assert.ok(failed(r).includes('confirm-before-write'));
});

test('confirm-before-write: reads never need a confirmation', () => {
  const r = run([user('List my projects'), call('list_projects'), call('find_test_suites', { project_id: 1, repository_id: 2 })]);
  assert.ok(!failed(r).includes('confirm-before-write'));
});

test('confirm-before-write: a destructive call needs the latest user turn to confirm', () => {
  const stale = run([user('Close the run'), say('Close it?'), user('Yes', true), say('Blocked. Skip the unfinished case?'), user('What happens to it?'), call('update_test_run', { execution_id: 1, update: { action: 'END', unfinished_cases: 'SKIP' } })]);
  assert.ok(failed(stale).includes('confirm-before-write'));
  const fresh = run([user('Close the run'), say('Close it?'), user('Yes', true), say('Blocked. Skip the unfinished case?'), user('Yes, skip it', true), call('update_test_run', { execution_id: 1, update: { action: 'END', unfinished_cases: 'SKIP' } })]);
  assert.ok(!failed(fresh).includes('confirm-before-write'));
});

test('no-unknown-tools: a retired tool name fails with the replacement hint', () => {
  const events = [user('x'), say('y'), user('ok', true), call('create_manual_test_run', { name: 'x' })];
  const r = run(events, [], [row('create_manual_test_run', { name: 'x' }, 'unknown_tool')]);
  assert.ok(failed(r).includes('no-unknown-tools'));
  assert.match(r.results.find(x => x.id === 'no-unknown-tools').message, /create_test_run/);
});

test('valid-args: schema violations fail even when the log row says ok', () => {
  const events = [user('x'), say('y'), user('ok', true), call('create_test_case', { project_id: 1, repository_id: 2, test_case: { name: 'x' } })];
  assert.ok(failed(run(events)).includes('valid-args'));
});

test('valid-args: a clean call passes', () => {
  assert.ok(!failed(run([user('x'), call('list_repositories', { project_id: 1 })])).includes('valid-args'));
});

test('log-aligned: a logged call the transcript never shows fails', () => {
  const r = run([user('x'), call('list_projects')], [], [row('list_projects'), row('delete_test_case', { project_id: 1, repository_id: 2, test_case_id: 3 })]);
  assert.ok(failed(r).includes('log-aligned'));
});

test('log-aligned: parallel calls that reach the server in another order still pair up', () => {
  const events = [user('x'), call('list_projects'), call('list_repositories', { project_id: 1 })];
  const rows = [row('list_repositories', { project_id: 1 }), row('list_projects')];
  assert.equal(failed(run(events, [], rows)).length, 0);
  const { timeline } = buildTimeline(events, rows, contract);
  assert.equal(timeline.filter(x => x.kind === 'call').every(x => x.outcome === 'ok'), true);
});

test('a transcript call the mock never saw is a note, not a failure', () => {
  const r = run([user('x'), call('list_projects')], [], []);
  assert.equal(r.ok, true);
  assert.equal(r.notes.length, 1);
});

// --- scenario assertions -----------------------------------------------------

test('called and not-called: counts, args, regex and absent keys', () => {
  const events = [user('x'), call('memory_list'), call('memory_list')];
  assert.equal(failed(run(events, [{ id: 'once', type: 'called', tool: 'memory_list', max: 1 }])).includes('once'), true);
  assert.equal(failed(run(events, [{ id: 'twice', type: 'called', tool: 'memory_list', min: 2 }])).includes('twice'), false);
  assert.equal(failed(run(events, [{ id: 'none', type: 'not-called', tool: 'memory_write' }])).includes('none'), false);
  assert.equal(failed(run(events, [{ id: 'none', type: 'not-called', tool: 'memory_list' }])).includes('none'), true);
});

test('no-writes: any write call fails', () => {
  assert.equal(failed(run([user('x'), call('list_projects')], [{ id: 'ro', type: 'no-writes' }])).includes('ro'), false);
  const w = run([user('x'), say('y'), user('ok', true), call('memory_write', { kind: 'convention', headline: 'h', body: 'b' })], [{ id: 'ro', type: 'no-writes' }]);
  assert.ok(failed(w).includes('ro'));
});

test('order: the before call must come first', () => {
  const a = { id: 'o', type: 'order', before: { tool: 'read_auts' }, after: { tool: 'create_test_run' } };
  const good = run([user('x'), call('read_auts', { project_id: 1 }), say('p'), user('y', true), call('create_test_run', { mode: 'manual', name: 'n' })], [a]);
  assert.ok(!failed(good).includes('o'));
  const bad = run([user('x'), say('p'), user('y', true), call('create_test_run', { mode: 'manual', name: 'n' }), call('read_auts', { project_id: 1 })], [a]);
  assert.ok(failed(bad).includes('o'));
});

test('asked-before: needs a matching assistant message and a user answer before the call', () => {
  const a = { id: 'q', type: 'asked-before', tool: 'update_test_run', question: ['profile', 'shared|separate'] };
  const start = call('update_test_run', { execution_id: 1, update: { action: 'START', execution_mode: 'KATALON_AI', browser_profile_mode: 'SHARED' } });
  const good = run([user('go'), say('Which browser profile: shared or separate?'), user('shared'), say('Preview. Proceed?'), user('yes', true), start], [a]);
  assert.ok(!failed(good).includes('q'));
  const unanswered = run([user('go'), say('Which browser profile: shared or separate?'), start], [a]);
  assert.ok(failed(unanswered).includes('q'));
  const answeredOff = run([user('go'), say('Which browser profile: shared or separate?'), start], [{ ...a, answered: false }]);
  assert.ok(!failed(answeredOff).includes('q'));
  const never = run([user('go'), say('Starting.'), user('ok', true), start], [a]);
  assert.ok(failed(never).includes('q'));
});

test('asked-before: every pattern must match one message, case rules follow the pattern', () => {
  const a = { id: 'q', type: 'asked-before', tool: 'delete_test_cloud_app', question: ['app-7c1e90', { re: '\\bYES\\b', flags: '' }] };
  const del = call('delete_test_cloud_app', { project_id: 1, app_ids: ['app-7c1e90'] });
  const split = run([user('x'), say('App app-7c1e90 will go.'), say('Type yes to continue.'), user('YES', true), del], [a]);
  assert.ok(failed(split).includes('q'));
  const whole = run([user('x'), say('App app-7c1e90 will go. Type YES to continue.'), user('YES', true), del], [a]);
  assert.ok(!failed(whole).includes('q'));
});

test('user-said-before: the latest user turn by default, any turn on request, case follows the pattern', () => {
  const del = call('delete_test_cloud_app', { project_id: 1, app_ids: ['a'] });
  const yes = { id: 's', type: 'user-said-before', tool: 'delete_test_cloud_app', patterns: [{ re: '\\bYES\\b', flags: '' }] };
  assert.ok(!failed(run([user('x'), say('Type YES'), user('YES', true), del], [yes])).includes('s'));
  assert.ok(failed(run([user('x'), say('Type YES'), user('yes', true), del], [yes])).includes('s'));
  assert.ok(failed(run([user('YES'), say('sure?'), user('hmm', true), del], [yes])).includes('s'));
  assert.ok(!failed(run([user('YES'), say('sure?'), user('hmm', true), del], [{ ...yes, scope: 'any' }])).includes('s'));
});

test('read-back: needs a later read, honors sameArgs, readMatch and entity', () => {
  const create = call('create_truetest_test_case_from_flow', { project_id: 1, client_code: 'c', map_id: 'm', flow_id: 'f' });
  const pre = [user('x'), say('p'), user('y', true), create];
  const rb = { id: 'rb', type: 'read-back', after: { tool: 'create_truetest_test_case_from_flow' }, reads: ['get_truetest_journey_map'], readMatch: { flow_id: 'f' }, sameArgs: ['project_id', 'map_id'] };
  assert.ok(!failed(run([...pre, call('get_truetest_journey_map', { project_id: 1, client_code: 'c', map_id: 'm', flow_id: 'f' })], [rb])).includes('rb'));
  assert.ok(failed(run([...pre, call('get_truetest_journey_map', { project_id: 1, client_code: 'c', map_id: 'm' })], [rb])).includes('rb'));
  assert.ok(failed(run([...pre, call('get_truetest_journey_map', { project_id: 2, client_code: 'c', map_id: 'm', flow_id: 'f' })], [rb])).includes('rb'));
  assert.ok(failed(run([call('get_truetest_journey_map', { project_id: 1, client_code: 'c', map_id: 'm', flow_id: 'f' }), ...pre], [rb])).includes('rb'));
  const entity = { id: 'e', type: 'read-back', after: { tool: 'update_test_cases' }, reads: ['read_test_cases'], entity: { write: 'updates[].test_case_data.id', read: 'test_case_ids' } };
  const upd = call('update_test_cases', { project_id: 1, repository_id: 2, updates: [{ action: 'RENAME', test_case_data: { id: 7, name: 'n' } }] });
  assert.ok(!failed(run([user('x'), say('p'), user('y', true), upd, call('read_test_cases', { project_id: 1, test_case_ids: [7, 8] })], [entity])).includes('e'));
  assert.ok(failed(run([user('x'), say('p'), user('y', true), upd, call('read_test_cases', { project_id: 1, test_case_ids: [9] })], [entity])).includes('e'));
});

test('read-back: resultMustMatch and resultMustNotMatch read the result text, {entity} binds the write value', () => {
  const del = call('delete_test_cloud_app', { project_id: 1, app_ids: ['app-7c1e90'] });
  const pre = [user('x'), say('Type YES'), user('YES', true), { ...del, id: 'w' }];
  const read = text => [{ ...call('list_test_cloud_apps', { project_id: 1 }), id: 'r' }, { type: 'tool_result', id: 'r', isError: false, text }];
  const rb = { id: 'rb', type: 'read-back', after: { tool: 'delete_test_cloud_app' }, reads: ['list_test_cloud_apps'], sameArgs: ['project_id'],
    entity: { write: 'app_ids[]' }, resultMustMatch: ['"items"'], resultMustNotMatch: ['"id":"{entity}"'] };
  const still = '{"items":[{"id":"app-7c1e90"},{"id":"app-dyn-01"}]}';
  const gone = '{"items":[{"id":"app-dyn-01"}]}';
  assert.ok(failed(run([...pre, ...read(still)], [rb])).includes('rb'));
  assert.ok(!failed(run([...pre, ...read(gone)], [rb])).includes('rb'));
  assert.ok(failed(run([...pre, ...read('{"error":"x"}')], [rb])).includes('rb')); // resultMustMatch missing
  assert.ok(failed(run([...pre, { ...call('list_test_cloud_apps', { project_id: 1 }), id: 'r' }], [rb])).includes('rb')); // no result recorded
  const bare = { ...rb, resultMustMatch: undefined, resultMustNotMatch: ['\\bapp-7c1e90\\b'] };
  assert.ok(failed(run([...pre, ...read(still)], [bare])).includes('rb'));
  assert.ok(!failed(run([...pre, ...read(gone)], [bare])).includes('rb'));
  assert.ok(validateScenario({ id: 'a-b', skill: 'execute-test', fixture: 'default', description: 'd', turns: [{ text: 't' }], assertions: [{ ...rb, resultMustNotMatch: ['{entity}'], entity: undefined }] }, { contract }).some(m => /entity/.test(m)));
});

test('skill-loaded and handoff', () => {
  const ev = [user('x'), skill('analyze-failures'), say('a'), user('y'), skill('test-maintenance')];
  assert.equal(failed(run(ev, [{ id: 'l', type: 'skill-loaded', skill: 'analyze-failures' }])).length, 0);
  assert.ok(failed(run(ev, [{ id: 'l', type: 'skill-loaded', skill: 'execute-test' }])).includes('l'));
  assert.equal(failed(run(ev, [{ id: 'h', type: 'handoff', from: 'analyze-failures', to: 'test-maintenance' }])).length, 0);
  assert.ok(failed(run(ev, [{ id: 'h', type: 'handoff', from: 'execute-test', to: 'test-maintenance' }])).includes('h'));
  assert.ok(failed(run([user('x'), skill('test-maintenance')], [{ id: 'h', type: 'handoff', to: 'test-maintenance' }])).includes('h'));
  assert.ok(failed(run([user('x'), skill('analyze-failures')], [{ id: 'h', type: 'handoff', to: 'test-maintenance' }])).includes('h'));
});

test('says and never-says', () => {
  const ev = [user('x'), say('Generation is queued, not complete.'), say('Done.')];
  assert.equal(failed(run(ev, [{ id: 's', type: 'says', pattern: ['queued'] }])).length, 0);
  assert.ok(failed(run(ev, [{ id: 's', type: 'says', pattern: ['queued'], scope: 'final' }])).includes('s'));
  assert.ok(failed(run(ev, [{ id: 'n', type: 'never-says', pattern: ['done'] }])).includes('n'));
  assert.equal(failed(run(ev, [{ id: 'n', type: 'never-says', pattern: ['deleted'] }])).length, 0);
  // scope final looks at the last assistant message only
  assert.equal(failed(run(ev, [{ id: 'n', type: 'never-says', pattern: ['queued'], scope: 'final' }])).length, 0);
  assert.ok(failed(run(ev, [{ id: 'n', type: 'never-says', pattern: ['done'], scope: 'final' }])).includes('n'));
});

test('an unknown assertion type fails the run instead of passing silently', () => {
  assert.ok(failed(run([user('x')], [{ id: 'z', type: 'telepathy' }])).includes('z'));
});

// --- scenario validation -----------------------------------------------------

const goodScenario = () => ({
  id: 'x-y', skill: 'execute-test', fixture: 'default', description: 'd',
  turns: [{ text: 'hi' }], assertions: [{ id: 'a', type: 'called', tool: 'list_projects' }],
});

test('validateScenario: accepts a clean scenario', () => {
  assert.deepEqual(validateScenario(goodScenario(), { contract }), []);
});

test('validateScenario: catches typos in tool names, skills, fixtures, ids and types', () => {
  const s = goodScenario();
  s.skill = 'no-such-skill';
  s.fixture = 'no-such-fixture';
  s.assertions = [
    { id: 'a', type: 'called', tool: 'list_projcts' },
    { id: 'a', type: 'called', tool: 'list_projects' },
    { id: 'confirm-before-write', type: 'no-writes' },
    { id: 'b', type: 'telepathy' },
    { id: 'c', type: 'asked-before', tool: 'create_test_run', question: ['('] },
  ];
  const p = validateScenario(s, { contract }).join('\n');
  for (const frag of ['no-such-skill', 'no-such-fixture', 'list_projcts', 'duplicate assertion id a', 'reserved', 'telepathy', 'bad pattern']) assert.match(p, new RegExp(frag));
});

// --- the shipped scenarios and recordings ------------------------------------

test('shipped scenarios: valid, at least 12, covering every area the plan lists', () => {
  const { scenarios, problems } = loadScenarios(contract);
  assert.deepEqual(problems, []);
  assert.ok(scenarios.length >= 12, `only ${scenarios.length} scenarios`);
  const skills = new Set(scenarios.map(s => s.skill));
  for (const k of ['execute-test', 'create-test-cases', 'test-management', 'analyze-failures', 'test-environments', 'truetest-journeys', 'project-memory']) assert.ok(skills.has(k), `no scenario for ${k}`);
  const all = JSON.stringify(scenarios);
  for (const needle of ['browser_profile_mode', 'TestPak', 'Run With AI', 'delete_test_cloud_app', 'stop_test_cloud_tunnel', 'create_defect', 'memory_write', 'unfinished_cases']) assert.ok(all.includes(needle), `no scenario mentions ${needle}`);
  assert.equal(new Set(scenarios.map(s => s.id)).size, scenarios.length);
  for (const s of scenarios) assert.ok(s.turns.some(t => t.confirms) || s.assertions.some(a => a.type === 'no-writes'), `${s.id} has no confirming turn and allows writes`);
});

test('recordings: every scenario has a pass recording and the asserter agrees with every file', () => {
  const { scenarios } = loadScenarios(contract);
  let fails = 0;
  for (const s of scenarios) {
    const rows = replayRecordings(s, contract);
    assert.ok(rows.some(r => r.expect === 'pass'), `${s.id} has no pass recording`);
    for (const r of rows) assert.deepEqual(r.problems, [], `${s.id}/${r.kind}: ${r.problems.join('; ')}`);
    if (rows.some(r => r.expect === 'fail')) fails++;
  }
  assert.ok(fails >= 4, `only ${fails} scenarios have a fail recording`);
});

test('recordings: the asserter catches the rule each fail recording names', () => {
  const { scenarios } = loadScenarios(contract);
  const caught = new Set();
  for (const s of scenarios) for (const r of replayRecordings(s, contract)) for (const v of r.caught) caught.add(v);
  for (const rule of IMPLICIT_RULES) if (rule !== 'log-aligned') assert.ok(caught.has(rule), `no fail recording catches ${rule}`);
  for (const type of ['asked-before', 'user-said-before', 'read-back', 'order', 'handoff', 'called', 'not-called', 'no-writes', 'says']) {
    const ids = scenarios.flatMap(s => s.assertions.filter(a => a.type === type).map(a => a.id));
    assert.ok(ids.some(id => caught.has(id)), `no fail recording catches an assertion of type ${type}`);
  }
});

test('dry replay flags a recording that no longer matches its scenario', () => {
  const { scenarios } = loadScenarios(contract);
  const s = structuredClone(scenarios.find(x => x.id === 'execute-testpak-manual-start'));
  s.assertions.push({ id: 'extra', type: 'not-called', tool: 'list_projects' });
  const rows = replayRecordings(s, contract);
  const pass = rows.find(r => r.kind === 'pass');
  assert.ok(pass.problems.some(p => p.includes('extra')), 'the pass recording should fail the stricter scenario');
});

test('dry replay cannot be fooled by a forged confirmation in a recording', () => {
  const { scenarios } = loadScenarios(contract);
  const s = scenarios.find(x => x.id === 'execute-testpak-manual-start');
  const dir = join(HERE, 'recordings', s.id);
  const forged = JSON.parse(readFileSync(join(dir, 'fail-no-confirmation.transcript.json'), 'utf8'));
  for (const ev of forged.events) if (ev.type === 'user') ev.confirms = true;
  const verdict = evaluate({
    scenario: s,
    events: forged.events.map(ev => (ev.type === 'user' ? { ...ev, confirms: s.turns[ev.turn]?.confirms === true } : ev)),
    rows: readFileSync(join(dir, 'fail-no-confirmation.calls.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)),
    contract,
  });
  assert.ok(verdict.failed.includes('confirm-before-write'));
});

test('recordings carry only files that belong together', () => {
  const root = join(HERE, 'recordings');
  for (const id of readdirSync(root)) {
    const files = readdirSync(join(root, id));
    const kinds = new Set(files.map(f => f.replace(/\.(transcript\.json|calls\.jsonl)$/, '')));
    for (const k of kinds) {
      assert.ok(files.includes(`${k}.transcript.json`), `${id}/${k} has no transcript`);
      assert.ok(files.includes(`${k}.calls.jsonl`), `${id}/${k} has no call log`);
    }
  }
});

// --- command line ------------------------------------------------------------

const node = (...args) => spawnSync(process.execPath, args, { cwd: join(HERE, '..', '..'), encoding: 'utf8' });

test('run.mjs --dry exits 0 and prints a summary', () => {
  const r = node('evals/workflow/run.mjs', '--dry');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /dry: \d+ scenarios, \d+ recordings \(\d+ as expected\)/);
});

test('run.mjs --live-model refuses to start without --model', () => {
  const r = node('evals/workflow/run.mjs', '--live-model');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /--model/);
});

test('run.mjs rejects an unknown flag and an unknown scenario id', () => {
  assert.equal(node('evals/workflow/run.mjs', '--nope').status, 2);
  assert.equal(node('evals/workflow/run.mjs', '--dry', '--only', 'no-such-scenario').status, 1);
});

test('make-recordings.mjs --check agrees with the committed recordings', () => {
  const r = node('evals/workflow/make-recordings.mjs', '--check');
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('assert.mjs command line prints PASS and FAIL rows', () => {
  const dir = join(HERE, 'recordings', 'execute-rerun-reads-first');
  const sc = join(HERE, 'scenarios', 'execute-rerun-reads-first.json');
  const pass = node('evals/workflow/assert.mjs', '--scenario', sc, '--transcript', join(dir, 'pass.transcript.json'), '--calls', join(dir, 'pass.calls.jsonl'));
  assert.equal(pass.status, 0, pass.stdout);
  assert.match(pass.stdout, /PASS confirm-before-write/);
  const bad = node('evals/workflow/assert.mjs', '--scenario', sc, '--transcript', join(dir, 'fail-rerun-by-id.transcript.json'), '--calls', join(dir, 'fail-rerun-by-id.calls.jsonl'));
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /FAIL read-before-rerun/);
});

// --- live runner parts that need no model ------------------------------------

test('turnArgs: isolation flags, session handling and no persistence opt-out', () => {
  const opts = { maxTurns: 12, model: 'claude-sonnet-5', effort: undefined };
  const first = turnArgs({ prompt: 'hi', sessionId: 'sid', first: true, configPath: '/tmp/mcp.json', opts });
  const later = turnArgs({ prompt: 'again', sessionId: 'sid', first: false, configPath: '/tmp/mcp.json', opts });
  for (const a of [first, later]) {
    assert.ok(a.includes('--strict-mcp-config'));
    assert.equal(a[a.indexOf('--setting-sources') + 1], '');
    assert.equal(a[a.indexOf('--mcp-config') + 1], '/tmp/mcp.json');
    assert.ok(a[a.indexOf('--plugin-dir') + 1].endsWith('plugins/katalon-true-platform'));
    assert.equal(a[a.indexOf('--tools') + 1], 'Skill');
    assert.equal(a[a.indexOf('--allowedTools') + 1], 'mcp__katalon__*,Skill');
    assert.ok(!a.includes('--no-session-persistence'), 'multi-turn needs the session on disk');
    assert.equal(a[a.indexOf('--model') + 1], 'claude-sonnet-5');
  }
  assert.equal(first[first.indexOf('--session-id') + 1], 'sid');
  assert.ok(!first.includes('--resume'));
  assert.equal(later[later.indexOf('--resume') + 1], 'sid');
  assert.ok(!later.includes('--session-id'));
});

test('eventsFromStream: text, tool calls and tool results become transcript events', () => {
  const evs = [
    { type: 'system', subtype: 'init' },
    { type: 'assistant', message: { content: [{ type: 'text', text: 'Which profile?' }, { type: 'tool_use', id: 'tu1', name: 'mcp__katalon__list_projects', input: {} }] } },
    { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'tu1', is_error: false, content: [{ type: 'text', text: '{"projects":[]}' }] }] } },
    { type: 'result' },
  ];
  assert.deepEqual(eventsFromStream(evs), [
    { type: 'assistant', text: 'Which profile?' },
    { type: 'tool_call', id: 'tu1', name: 'mcp__katalon__list_projects', args: {} },
    { type: 'tool_result', id: 'tu1', isError: false, text: '{"projects":[]}' },
  ]);
});

test('checkEnvironment: refuses a session that can reach anything but the mock and this plugin', () => {
  const skills = ['execute-test'];
  const good = { mcp_servers: [{ name: 'katalon', status: 'connected' }], tools: ['Skill', 'mcp__katalon__list_projects'], plugins: [{ name: 'katalon-true-platform' }], skills: ['katalon-true-platform:execute-test'] };
  assert.doesNotThrow(() => checkEnvironment(good, skills));
  assert.throws(() => checkEnvironment({ ...good, mcp_servers: [...good.mcp_servers, { name: 'af6f168c-live' }] }, skills), /environment leak/);
  assert.throws(() => checkEnvironment({ ...good, tools: [...good.tools, 'mcp__af6f168c-live__create_test_run'] }, skills), /foreign tools/);
  assert.throws(() => checkEnvironment({ ...good, mcp_servers: [{ name: 'katalon', status: 'failed' }] }, skills), /not connected/);
  assert.throws(() => checkEnvironment({ ...good, plugins: [{ name: 'other-plugin' }] }, skills), /extra plugins/);
  assert.throws(() => checkEnvironment({ ...good, skills: [] }, skills), /missing skills/);
});
