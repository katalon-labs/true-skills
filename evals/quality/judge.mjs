#!/usr/bin/env node
/**
 * judge.mjs - optional pairwise comparison of two saved outputs.
 *
 *   QUALITY_JUDGE_CMD='<command template>' node evals/quality/judge.mjs \
 *     --skill release-analyze --scenario s1 --a out-1.md --b out-2.md [--json]
 *
 * The command template runs through `sh -c`. `{prompt_file}` is replaced with the path of a
 * file that holds the judge prompt, and the same prompt arrives on stdin. The command prints
 * one JSON object with weights over five judgments (they should add to 1):
 *
 *   {"weights": {"a_much_better": 0.0, "a_better": 0.1, "tie": 0.2, "b_better": 0.6, "b_much_better": 0.1}}
 *
 * Why it is built this way:
 *  - Pairwise only. One output in isolation gets a grade that every decent output shares.
 *  - Both slot orders. A judge favours the output it reads first. Each output sits in slot A once.
 *  - Weighted, not a verdict. The judge spreads weight over five judgments and the script takes
 *    the expectation, so two close outputs still separate. Nothing here is an absolute score.
 *
 * Exit codes: 0 done, 2 usage error, 3 QUALITY_JUDGE_CMD not set (judge is optional, skip),
 * 4 the judge command failed or its answer did not parse.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildContext, runChecks, summarize } from './lib/checks.mjs';
import { loadRubric, loadScenario, readFixture } from './lib/load.mjs';

export const JUDGMENTS = {
  a_much_better: 1,
  a_better: 0.5,
  tie: 0,
  b_better: -0.5,
  b_much_better: -1,
};

export const TIE_BAND = 0.15;

export function buildPrompt({ rubric, scenario, fixtureText, slotA, slotB }) {
  const criteria = rubric.checks.filter((c) => !c.when || scenario.expect?.[c.when]).map((c) => `- ${c.desc}`).join('\n');
  return `You compare two answers from an assistant to the same task. Decide which one a careful practitioner would rather receive.

Judge only what is in the two answers and the task material. Do not reward length. Do not reward a confident tone. An answer that invents an ID, a number or a tool result is worse than one that says the data is missing.

## Task given to the assistant
${scenario.prompt}

## Task material (what the platform returned)
${fixtureText}

## What a good answer does
${criteria}

## Answer A
${slotA}

## Answer B
${slotB}

## Your reply
Reply with one JSON object and nothing else. Spread weight over the five judgments below, the way you would bet if you had to. Weights are non-negative and add to 1. Put all weight on one judgment only when you are certain.

{"weights": {"a_much_better": 0.0, "a_better": 0.0, "tie": 0.0, "b_better": 0.0, "b_much_better": 0.0}}
`;
}

export function parseJudgeReply(stdout) {
  const start = stdout.indexOf('{');
  const end = stdout.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('no JSON object in the judge reply');
  const obj = JSON.parse(stdout.slice(start, end + 1));
  const w = obj.weights ?? obj;
  const weights = {};
  let sum = 0;
  for (const k of Object.keys(JUDGMENTS)) {
    const v = Number(w[k] ?? 0);
    if (!Number.isFinite(v) || v < 0) throw new Error(`weight "${k}" is not a non-negative number`);
    weights[k] = v;
    sum += v;
  }
  if (sum <= 0) throw new Error('weights add to zero');
  for (const k of Object.keys(weights)) weights[k] /= sum;
  return weights;
}

/** Expectation of the five judgments, from slot A's point of view, in [-1, 1]. */
export function slotPreference(weights) {
  return Object.entries(JUDGMENTS).reduce((acc, [k, v]) => acc + weights[k] * v, 0);
}

/**
 * Combine the two orders. pref1: output 1 sat in slot A. pref2: output 2 sat in slot A.
 * Preference for output 1 is (pref1 - pref2) / 2. A positive slot bias favours slot A.
 */
export function combine(pref1, pref2) {
  const preferenceForFirst = (pref1 - pref2) / 2;
  const slotBias = (pref1 + pref2) / 2;
  const agree = Math.sign(pref1) === Math.sign(-pref2) || Math.abs(pref1) < 0.1 || Math.abs(pref2) < 0.1;
  let verdict = 'no clear preference';
  if (preferenceForFirst >= TIE_BAND) verdict = 'first output preferred';
  else if (preferenceForFirst <= -TIE_BAND) verdict = 'second output preferred';
  return { preferenceForFirst, slotBias, ordersAgree: agree, verdict };
}

function runJudge(template, prompt, dir, tag) {
  const file = join(dir, `prompt-${tag}.txt`);
  writeFileSync(file, prompt);
  const cmd = template.replaceAll('{prompt_file}', file);
  const r = spawnSync('sh', ['-c', cmd], { input: prompt, encoding: 'utf8', timeout: 600_000, maxBuffer: 16 * 1024 * 1024 });
  if (r.error) throw new Error(`judge command failed to start: ${r.error.message}`);
  if (r.status !== 0) throw new Error(`judge command exited ${r.status}: ${(r.stderr || '').slice(0, 300)}`);
  return parseJudgeReply(r.stdout);
}

export function compare({ template, skill, scenarioId, textA, textB }) {
  const rubric = loadRubric(skill);
  const scenario = loadScenario(skill, scenarioId);
  const fixtureText = readFixture(scenario);
  const dir = mkdtempSync(join(tmpdir(), 'quality-judge-'));
  try {
    const w1 = runJudge(template, buildPrompt({ rubric, scenario, fixtureText, slotA: textA, slotB: textB }), dir, 'order1');
    const w2 = runJudge(template, buildPrompt({ rubric, scenario, fixtureText, slotA: textB, slotB: textA }), dir, 'order2');
    const pref1 = slotPreference(w1);
    const pref2 = slotPreference(w2);
    return { order1: { weights: w1, slotPreference: pref1 }, order2: { weights: w2, slotPreference: pref2 }, ...combine(pref1, pref2) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function hardChecks(skill, scenarioId, text) {
  const scenario = loadScenario(skill, scenarioId);
  const ctx = buildContext({ text, fixtureText: readFixture(scenario), scenario });
  const results = runChecks(loadRubric(skill), ctx);
  return { summary: summarize(results), failed: results.filter((r) => r.status === 'FAIL').map((r) => r.id) };
}

const fmt = (n) => (n >= 0 ? '+' : '') + n.toFixed(2);

async function main() {
  const args = process.argv.slice(2);
  const opt = (n) => {
    const i = args.indexOf(n);
    return i === -1 ? undefined : args[i + 1];
  };
  const skill = opt('--skill');
  const scenarioId = opt('--scenario');
  const fa = opt('--a');
  const fb = opt('--b');
  if (!skill || !scenarioId || !fa || !fb) {
    console.error('usage: QUALITY_JUDGE_CMD=<template> judge.mjs --skill <name> --scenario <id> --a <file> --b <file> [--json]');
    process.exit(2);
  }
  for (const f of [fa, fb]) {
    if (!existsSync(f)) {
      console.error(`file not found: ${f}`);
      process.exit(2);
    }
  }
  const template = process.env.QUALITY_JUDGE_CMD;
  if (!template) {
    console.error('QUALITY_JUDGE_CMD is not set. The pairwise judge is optional, so nothing ran.');
    process.exit(3);
  }
  const textA = readFileSync(fa, 'utf8');
  const textB = readFileSync(fb, 'utf8');
  const checks = { first: hardChecks(skill, scenarioId, textA), second: hardChecks(skill, scenarioId, textB) };
  let out;
  try {
    out = compare({ template, skill, scenarioId, textA, textB });
  } catch (e) {
    console.error(`judge error: ${e.message}`);
    process.exit(4);
  }
  if (args.includes('--json')) {
    console.log(JSON.stringify({ skill, scenarioId, checks, ...out }, null, 2));
    return;
  }
  console.log(`pairwise: first = ${fa}, second = ${fb}`);
  console.log(`hard checks: first fails ${checks.first.failed.length} (${checks.first.failed.join(', ') || 'none'}), second fails ${checks.second.failed.length} (${checks.second.failed.join(', ') || 'none'})`);
  console.log(`order 1 (first in slot A): slot A preference ${fmt(out.order1.slotPreference)}`);
  console.log(`order 2 (second in slot A): slot A preference ${fmt(out.order2.slotPreference)}`);
  console.log(`weighted preference for the first output: ${fmt(out.preferenceForFirst)}  (-1 favours the second, +1 favours the first)`);
  console.log(`slot bias: ${fmt(out.slotBias)} toward slot A`);
  console.log(`orders agree: ${out.ordersAgree ? 'yes' : 'no, treat the result as unreliable'}`);
  console.log(`verdict: ${out.verdict}`);
  if (checks.first.failed.length || checks.second.failed.length) console.log('note: a preference does not outrank a failed hard check.');
}

import { fileURLToPath } from 'node:url';
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
