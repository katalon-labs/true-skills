#!/usr/bin/env node
/**
 * harness.mjs - one command for every harness in this repo.
 *
 *   node scripts/harness.mjs check                 validator, sync-shared --check, build --check, snapshot consistency
 *   node scripts/harness.mjs mock [args]           start the mock Katalon MCP server (harness/mock-mcp/server.mjs)
 *   node scripts/harness.mjs workflow [args]       workflow evals; replays recorded transcripts (--dry) by default
 *   node scripts/harness.mjs quality [args]        output-quality evals; deterministic self-tests
 *   node scripts/harness.mjs routing [args]        prints the routing eval command; checks cases against labels
 *   node scripts/harness.mjs test                  node --test over every *.test.mjs under harness/ and evals/
 *   node scripts/harness.mjs all                   every model-free part: check, workflow (dry), quality, routing, test
 *
 * A model runs only when you pass --live-model:
 *   workflow --live-model   drives `claude -p` against the mock server (evals/workflow/run.mjs)
 *   routing  --live-model   runs evals/routing/run.mjs (one headless call per case and rep)
 *
 * A missing harness file stops that subcommand with exit 2 and a message that names the file.
 * `all` treats a missing file as a failure; pass --allow-missing to skip it with a warning.
 *
 * No external dependencies - Node >= 18, ESM.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { snapshotToolNames } from "./validate-skills.mjs";

const ROOT = process.env.TRUE_SKILLS_ROOT
  ? resolve(process.env.TRUE_SKILLS_ROOT)
  : join(dirname(fileURLToPath(import.meta.url)), "..");

const PATHS = {
  validator: "scripts/validate-skills.mjs",
  syncShared: "scripts/sync-shared.mjs",
  build: "scripts/build-adapters.mjs",
  contract: "docs/mcp-tools.json",
  snapshot: "harness/mcp/tools.snapshot.json",
  mock: "harness/mock-mcp/server.mjs",
  workflow: "evals/workflow/run.mjs",
  quality: "evals/quality/check.mjs",
  routingRun: "evals/routing/run.mjs",
  routingCases: "evals/routing/cases.jsonl",
  routingLabels: "evals/routing/labels.jsonl",
};

const abs = (rel) => join(ROOT, rel);

/** Thrown when a harness file does not exist yet. */
class MissingFile extends Error {
  constructor(rel, hint) {
    super(`${rel} is missing. ${hint}`);
    this.rel = rel;
  }
}

function need(rel, hint) {
  if (!existsSync(abs(rel))) throw new MissingFile(rel, hint);
  return abs(rel);
}

/** Run `node <script> ...args` in the repo root; return the exit status. */
function runNode(script, args = []) {
  const r = spawnSync(process.execPath, [script, ...args], { cwd: ROOT, stdio: "inherit" });
  if (r.error) {
    console.error(`  could not start ${relative(ROOT, script)}: ${r.error.message}`);
    return 1;
  }
  return r.status ?? 1;
}

// ---------------------------------------------------------------------------------------------
// Parts. Each returns { ok: boolean } or throws MissingFile.
// ---------------------------------------------------------------------------------------------

/** Compare tool names in docs/mcp-tools.json with harness/mcp/tools.snapshot.json. */
export function checkSnapshotConsistency(root = ROOT) {
  const contractPath = join(root, PATHS.contract);
  const snapPath = join(root, PATHS.snapshot);
  if (!existsSync(contractPath)) return { ok: false, notes: [`${PATHS.contract} is missing`] };
  if (!existsSync(snapPath)) {
    return { ok: true, skipped: true, notes: [`${PATHS.snapshot} is absent; snapshot consistency skipped`] };
  }
  let contract;
  let snapshot;
  try {
    contract = JSON.parse(readFileSync(contractPath, "utf8"));
    snapshot = JSON.parse(readFileSync(snapPath, "utf8"));
  } catch (e) {
    return { ok: false, notes: [`invalid JSON: ${e.message}`] };
  }
  const contractNames = (contract.tools || []).map((t) => t.name);
  const snapNames = snapshotToolNames(snapshot);
  if (snapNames === null) return { ok: false, notes: [`${PATHS.snapshot} holds no tool list`] };
  const a = new Set(contractNames);
  const b = new Set(snapNames);
  const notes = [];
  for (const n of [...a].filter((x) => !b.has(x)).sort()) notes.push(`in ${PATHS.contract} only: ${n}`);
  for (const n of [...b].filter((x) => !a.has(x)).sort()) notes.push(`in ${PATHS.snapshot} only: ${n}`);
  if (b.size !== snapNames.length) notes.push(`${PATHS.snapshot} repeats a tool name`);
  return notes.length ? { ok: false, notes } : { ok: true, notes: [`${a.size} tool names match`] };
}

function partCheck() {
  const steps = [
    ["validate-skills", () => runNode(need(PATHS.validator, "Restore scripts/validate-skills.mjs."))],
    ["sync-shared --check", () => runNode(need(PATHS.syncShared, "Restore scripts/sync-shared.mjs."), ["--check"])],
    ["build-adapters --check", () => runNode(need(PATHS.build, "Restore scripts/build-adapters.mjs."), ["--check"])],
    [
      "snapshot consistency",
      () => {
        const r = checkSnapshotConsistency();
        for (const n of r.notes || []) console.log(`  ${n}`);
        return r.ok ? 0 : 1;
      },
    ],
  ];
  let ok = true;
  for (const [label, fn] of steps) {
    console.log(`\n-- check: ${label}`);
    const status = fn();
    console.log(`   ${status === 0 ? "PASS" : "FAIL"} ${label}`);
    if (status !== 0) ok = false;
  }
  return { ok };
}

function partMock(args) {
  const file = need(PATHS.mock, "H1 builds harness/mock-mcp/server.mjs (mock Katalon MCP server).");
  return { ok: runNode(file, args) === 0 };
}

function partWorkflow(args) {
  const file = need(PATHS.workflow, "H2 builds evals/workflow/run.mjs (workflow eval runner).");
  const live = args.includes("--live-model");
  const rest = args.filter((a) => a !== "--live-model" && a !== "--dry");
  // --dry replays recorded transcripts and never starts a model. It stays the default.
  const flags = live ? ["--live-model"] : ["--dry"];
  return { ok: runNode(file, [...flags, ...rest]) === 0 };
}

function partQuality(args) {
  const file = need(PATHS.quality, "H3 builds evals/quality/check.mjs (deterministic output-quality checks).");
  return { ok: runNode(file, args.length ? args : ["--self-test"]) === 0 };
}

/** Model-free routing checks: JSONL parses, ids are unique, every case has one label. */
export function checkRoutingFiles(root = ROOT) {
  const notes = [];
  const read = (rel) => {
    const p = join(root, rel);
    if (!existsSync(p)) throw new MissingFile(rel, "H3 owns evals/routing/cases.jsonl and labels.jsonl.");
    const rows = [];
    readFileSync(p, "utf8")
      .split("\n")
      .forEach((line, i) => {
        if (!line.trim()) return;
        try {
          rows.push(JSON.parse(line));
        } catch (e) {
          notes.push(`${rel}:${i + 1}: invalid JSON (${e.message})`);
        }
      });
    return rows;
  };
  const cases = read(PATHS.routingCases);
  const labels = read(PATHS.routingLabels);
  const caseIds = new Set();
  for (const c of cases) {
    if (!c.id) notes.push(`${PATHS.routingCases}: a row has no id`);
    else if (caseIds.has(c.id)) notes.push(`${PATHS.routingCases}: duplicate id ${c.id}`);
    else caseIds.add(c.id);
    if (!c.prompt) notes.push(`${PATHS.routingCases}: ${c.id} has no prompt`);
  }
  const labelIds = new Set();
  for (const l of labels) {
    if (!l.id) notes.push(`${PATHS.routingLabels}: a row has no id`);
    else if (labelIds.has(l.id)) notes.push(`${PATHS.routingLabels}: duplicate id ${l.id}`);
    else labelIds.add(l.id);
  }
  for (const id of caseIds) if (!labelIds.has(id)) notes.push(`case ${id} has no label`);
  for (const id of labelIds) if (!caseIds.has(id)) notes.push(`label ${id} has no case`);
  return { ok: notes.length === 0, notes, cases: cases.length, labels: labels.length };
}

function partRouting(args) {
  const live = args.includes("--live-model");
  const rest = args.filter((a) => a !== "--live-model");
  const runner = need(PATHS.routingRun, "evals/routing/run.mjs is the routing eval runner.");
  const runArgs = rest.length ? rest : ["--variant", "baseline", "--model", "claude-sonnet-5", "--reps", "3"];
  const files = checkRoutingFiles();
  for (const n of files.notes) console.error(`  ${n}`);
  console.log(`  ${files.cases} cases, ${files.labels} labels, ${files.ok ? "consistent" : "INCONSISTENT"}`);
  if (!files.ok) return { ok: false };
  if (!live) {
    console.log("  Routing needs a model. Run it with:");
    console.log(`    node scripts/build-adapters.mjs && node ${PATHS.routingRun} ${runArgs.join(" ")}`);
    console.log("  or: node scripts/harness.mjs routing --live-model [run.mjs args]");
    return { ok: true };
  }
  return { ok: runNode(runner, runArgs) === 0 };
}

/** Every *.test.mjs or *.test.js under the given folders, sorted. */
export function findTestFiles(root = ROOT, dirs = ["harness", "evals"]) {
  const out = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.test\.(mjs|js)$/.test(e.name)) out.push(p);
    }
  };
  for (const d of dirs) walk(join(root, d));
  return out.sort();
}

function partTest(args) {
  const files = findTestFiles();
  if (!files.length) {
    throw new MissingFile("harness/**/*.test.mjs and evals/**/*.test.mjs", "No test files found. H1 to H3 write them.");
  }
  const r = spawnSync(process.execPath, ["--test", ...args, ...files.map((f) => relative(ROOT, f))], {
    cwd: ROOT,
    stdio: "inherit",
  });
  return { ok: (r.status ?? 1) === 0 };
}

// ---------------------------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------------------------

const PARTS = {
  check: partCheck,
  mock: partMock,
  workflow: partWorkflow,
  quality: partQuality,
  routing: partRouting,
  test: partTest,
};

function runAll(args) {
  const allowMissing = args.includes("--allow-missing");
  if (args.includes("--live-model")) {
    console.error("harness all runs model-free parts only; run workflow or routing with --live-model on its own.");
    return 2;
  }
  const plan = [
    ["check", () => partCheck()],
    ["workflow (dry)", () => partWorkflow([])],
    ["quality", () => partQuality([])],
    ["routing (files)", () => partRouting([])],
    ["test (node --test)", () => partTest([])],
  ];
  const rows = [];
  for (const [label, fn] of plan) {
    console.log(`\n== ${label}`);
    try {
      const r = fn();
      rows.push([label, r.ok ? "PASS" : "FAIL"]);
    } catch (e) {
      if (!(e instanceof MissingFile)) throw e;
      console.error(`  ${e.message}`);
      rows.push([label, allowMissing ? "SKIP (missing file)" : "FAIL (missing file)"]);
    }
  }
  console.log("\nharness all");
  for (const [label, status] of rows) console.log(`  ${status.padEnd(20)} ${label}`);
  return rows.some(([, s]) => s.startsWith("FAIL")) ? 1 : 0;
}

function main() {
  const [sub, ...args] = process.argv.slice(2);
  if (!sub || sub === "--help" || sub === "-h" || sub === "help") {
    const header = readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0];
    console.log(header.replace(/^#!.*\n/, "").replace(/^\/\*\*\n/, "").replace(/^ \* ?/gm, "").trim());
    process.exit(sub ? 0 : 2);
  }
  if (sub === "all") process.exit(runAll(args));
  const part = PARTS[sub];
  if (!part) {
    console.error(`unknown subcommand '${sub}'. Use: ${[...Object.keys(PARTS), "all"].join(", ")}`);
    process.exit(2);
  }
  try {
    const r = part(args);
    process.exit(r.ok ? 0 : 1);
  } catch (e) {
    if (e instanceof MissingFile) {
      console.error(`harness ${sub}: ${e.message}`);
      process.exit(2);
    }
    throw e;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
