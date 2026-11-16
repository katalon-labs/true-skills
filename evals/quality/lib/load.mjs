/**
 * load.mjs - find skills, rubrics, scenarios, fixtures and golden outputs.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildContext, runChecks } from './checks.mjs';

export const QUALITY_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function listSkills() {
  return readdirSync(QUALITY_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(QUALITY_DIR, d.name, 'rubric.json')))
    .map((d) => d.name)
    .sort();
}

export function loadRubric(skill) {
  return JSON.parse(readFileSync(join(QUALITY_DIR, skill, 'rubric.json'), 'utf8'));
}

export function listScenarios(skill) {
  const dir = join(QUALITY_DIR, skill, 'scenarios');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => loadScenario(skill, f.replace(/\.json$/, '')));
}

export function loadScenario(skill, id) {
  const file = join(QUALITY_DIR, skill, 'scenarios', `${id}.json`);
  if (!existsSync(file)) throw new Error(`no scenario ${skill}/${id} (looked for ${file})`);
  const s = JSON.parse(readFileSync(file, 'utf8'));
  s.file = file;
  s.fixturePath = resolve(dirname(file), s.fixture);
  return s;
}

export function readFixture(scenario) {
  return existsSync(scenario.fixturePath) ? readFileSync(scenario.fixturePath, 'utf8') : '';
}

/** Run one saved output against a skill's rubric and one scenario. */
export function checkOutput({ skill, scenarioId, text }) {
  const rubric = loadRubric(skill);
  const scenario = loadScenario(skill, scenarioId);
  const ctx = buildContext({ text, fixtureText: readFixture(scenario), scenario });
  return { rubric, scenario, results: runChecks(rubric, ctx) };
}

export function goldenPath(skill, kind, scenarioId = 's1') {
  return join(QUALITY_DIR, skill, 'golden', `${kind}.${scenarioId}.md`);
}

export function loadDefects(skill) {
  const file = join(QUALITY_DIR, skill, 'golden', 'defects.json');
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
}
