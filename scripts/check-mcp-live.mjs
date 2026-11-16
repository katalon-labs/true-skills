#!/usr/bin/env node
/**
 * check-mcp-live.mjs - diff a live MCP tools/list dump against docs/mcp-tools.json.
 *
 * The live Katalon True Platform MCP server needs OAuth, so CI cannot call it. A person with an
 * authenticated session dumps tools/list to a file, then runs:
 *
 *   node scripts/check-mcp-live.mjs <tools-list.json> [--strict] [--json]
 *
 * Accepted dump shapes: the raw JSON-RPC response ({"result":{"tools":[...]}}), {"tools":[...]},
 * an array of tool objects, or an array of tool names.
 *
 * Report sections:
 *   missing   contract tools the live server does not list. Skills that name them will break.
 *   new       live tools the contract does not know. Review them, then add them to docs/mcp-tools.json.
 *   retired   retired names the live server still lists (the rename has not shipped there yet).
 *   conflicts live annotations that disagree with the contract class (a write tool marked read-only).
 *   stats     how many live tools carry annotations and an outputSchema.
 *
 * Exit code 1 when any contract tool is missing or a retired name is still live. `--strict` also
 * fails on new tools and annotation conflicts. No external dependencies - Node >= 18, ESM.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Pull a list of { name, annotations?, outputSchema? } out of any accepted dump shape. */
export function extractTools(data) {
  let list = data;
  if (data && !Array.isArray(data)) {
    if (Array.isArray(data.tools)) list = data.tools;
    else if (data.result && Array.isArray(data.result.tools)) list = data.result.tools;
    else throw new Error('no tools array found (expected "tools", "result.tools", or a top-level array)');
  }
  if (!Array.isArray(list)) throw new Error("dump is not a list of tools");
  return list.map((t, i) => {
    if (typeof t === "string") return { name: t };
    if (t && typeof t.name === "string") return t;
    throw new Error(`entry ${i} has no string 'name'`);
  });
}

/** Compare a live tool list with the contract. Pure function, used by tests. */
export function diffContract(live, contract) {
  const contractByName = new Map((contract.tools || []).map((t) => [t.name, t]));
  const liveNames = new Set(live.map((t) => t.name));
  const retired = contract.retired || {};
  const unconfirmed = contract.unconfirmed || {};
  const chatgptOnly = new Set((contract.chatgptOnly || []).map((t) => t.name));

  const missing = [...contractByName.keys()].filter((n) => !liveNames.has(n)).sort();
  const retiredLive = [...liveNames].filter((n) => n in retired).sort().map((n) => ({ name: n, use: retired[n] }));
  const fresh = [...liveNames]
    .filter((n) => !contractByName.has(n) && !(n in retired) && !chatgptOnly.has(n))
    .sort()
    .map((n) => ({ name: n, note: unconfirmed[n] || null }));

  const conflicts = [];
  let withAnnotations = 0;
  let withOutputSchema = 0;
  for (const t of live) {
    const a = t.annotations || null;
    if (a) withAnnotations += 1;
    if (t.outputSchema) withOutputSchema += 1;
    const c = contractByName.get(t.name);
    if (!c || !a) continue;
    if (a.readOnlyHint === true && c.class !== "read") {
      conflicts.push(`${t.name}: live says readOnlyHint true, contract class is ${c.class}`);
    }
    if (a.readOnlyHint === false && c.class === "read") {
      conflicts.push(`${t.name}: live says readOnlyHint false, contract class is read`);
    }
    if (a.destructiveHint === true && c.class === "write" && !c.destructiveWhen) {
      conflicts.push(`${t.name}: live says destructiveHint true, contract class is write without destructiveWhen`);
    }
  }
  const badNames = live.map((t) => t.name).filter((n) => !/^[A-Za-z0-9_.-]{1,128}$/.test(n));
  return {
    missing,
    retiredLive,
    fresh,
    conflicts,
    badNames,
    stats: { live: live.length, contract: contractByName.size, withAnnotations, withOutputSchema },
  };
}

function main(argv) {
  const args = argv.filter((a) => !a.startsWith("--"));
  const strict = argv.includes("--strict");
  const asJson = argv.includes("--json");
  if (argv.includes("--help") || args.length !== 1) {
    console.error("usage: node scripts/check-mcp-live.mjs <tools-list.json> [--strict] [--json]");
    process.exit(argv.includes("--help") ? 0 : 2);
  }
  const contractPath = join(ROOT, "docs", "mcp-tools.json");
  if (!existsSync(contractPath)) {
    console.error("docs/mcp-tools.json is missing");
    process.exit(2);
  }
  let live;
  try {
    live = extractTools(JSON.parse(readFileSync(resolve(args[0]), "utf8")));
  } catch (e) {
    console.error(`cannot read ${args[0]}: ${e.message}`);
    process.exit(2);
  }
  const contract = JSON.parse(readFileSync(contractPath, "utf8"));
  const d = diffContract(live, contract);

  if (asJson) {
    console.log(JSON.stringify(d, null, 2));
  } else {
    const list = (title, items, fmt = (x) => x) => {
      console.log(`\n${title} (${items.length})`);
      for (const x of items) console.log("  - " + fmt(x));
    };
    console.log(`Live tools: ${d.stats.live}. Contract tools: ${d.stats.contract} (${contract.contract}).`);
    console.log(`Annotations on ${d.stats.withAnnotations} live tools; outputSchema on ${d.stats.withOutputSchema}.`);
    list("Missing from live (skills may name them)", d.missing);
    list("New in live (add to docs/mcp-tools.json after review)", d.fresh, (x) => (x.note ? `${x.name}  [seen before: ${x.note}]` : x.name));
    list("Retired names still live", d.retiredLive, (x) => `${x.name}  (skills use: ${x.use})`);
    list("Annotation conflicts", d.conflicts);
    if (d.badNames.length) list("Invalid tool names", d.badNames);
  }
  const failed = d.missing.length > 0 || d.retiredLive.length > 0 || d.badNames.length > 0 || (strict && (d.fresh.length > 0 || d.conflicts.length > 0));
  if (!asJson) console.log(failed ? "\n✗ contract and live server differ" : "\n✓ live server matches the contract");
  process.exit(failed ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main(process.argv.slice(2));
