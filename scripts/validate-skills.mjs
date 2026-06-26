#!/usr/bin/env node
/**
 * validate-skills.mjs - guard the skills/ <-> skills.config.mjs contract.
 *
 * Adding a skill touches two places: the skills/<name>/ folder and the
 * INTERFACE + ORDER maps in scripts/skills.config.mjs. It is easy to update one
 * and forget the other, and the symptom (a skill silently missing from a
 * generated adapter, or a build crash) only shows up later. This script fails
 * fast with a precise message instead.
 *
 * Checks:
 *   1. Every skills/<name>/ has a SKILL.md with `name` and `description` frontmatter.
 *   2. The frontmatter `name` matches the folder name.
 *   3. Every skill folder appears in INTERFACE and in ORDER (and vice versa).
 *   4. ORDER has no duplicates; INTERFACE entries have title/short/prompt.
 *   5. No real Katalon subdomain leaked into any skill .md (SKILL.md or
 *      references/*.md), with or without an http(s):// scheme. Placeholder stays.
 *
 * Exits non-zero on any failure. No external dependencies - Node >= 18, ESM.
 * Run: node scripts/validate-skills.mjs
 */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { INTERFACE, ORDER } from "./skills.config.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = join(ROOT, "skills");

const errors = [];
const fail = (msg) => errors.push(msg);

// All *.md files under a directory (recursive) - SKILL.md plus references/.
function listMarkdown(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...listMarkdown(p));
    else if (e.isFile() && e.name.endsWith(".md")) out.push(p);
  }
  return out;
}

// Canonical shared endpoints that are SAFE to commit. These are not
// per-workspace subdomains: connecting routes through Katalon OAuth and a
// workspace picker, so the same host serves every customer.
const ALLOWED_HOSTS = new Set(["platform.katalon.io"]);

// Find a real per-workspace Katalon MCP endpoint, with or without scheme
// (e.g. https://acme.katalon.io/mcp or bare acme.katalon.io/mcp). Hosts in
// ALLOWED_HOSTS are skipped. The documented placeholder
// <your.sub.domain>.katalon.io/mcp never matches because '>' is not a valid
// host-label character, so it cannot sit adjacent to '.katalon.io'.
function findEndpointLeak(text) {
  const re = /(?:https?:\/\/)?([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.katalon\.io)\/mcp/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (!ALLOWED_HOSTS.has(m[1].toLowerCase())) return m[0];
  }
  return null;
}

// Folders actually present under skills/
const dirs = readdirSync(SKILLS_DIR)
  .filter((d) => statSync(join(SKILLS_DIR, d)).isDirectory())
  .sort();

if (dirs.length === 0) fail("skills/ contains no skill folders");

// 1 + 2: every folder has a valid SKILL.md whose name matches the folder
for (const name of dirs) {
  const skillPath = join(SKILLS_DIR, name, "SKILL.md");
  if (!existsSync(skillPath)) {
    fail(`${name}: missing SKILL.md`);
    continue;
  }
  const raw = readFileSync(skillPath, "utf8");
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) {
    fail(`${name}: SKILL.md has no YAML frontmatter`);
    continue;
  }
  const fm = {};
  for (const line of m[1].split("\n")) {
    const mm = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (mm) fm[mm[1]] = mm[2].trim();
  }
  if (!fm.name) fail(`${name}: frontmatter missing 'name'`);
  else if (fm.name !== name) fail(`${name}: frontmatter name '${fm.name}' does not match folder '${name}'`);
  if (!fm.description) fail(`${name}: frontmatter missing 'description'`);
  else if (fm.description.length < 40) fail(`${name}: description is too short to route on (${fm.description.length} chars)`);

  // 5: no real subdomain leaked (placeholder must remain). Scans SKILL.md AND
  // references/*.md - both are published (references are inlined into adapters
  // by build-adapters' inlineBody), so either could leak an endpoint.
  for (const file of listMarkdown(join(SKILLS_DIR, name))) {
    const leak = findEndpointLeak(readFileSync(file, "utf8"));
    if (leak) {
      fail(`${relative(ROOT, file)}: real Katalon endpoint '${leak}' committed - use the <your.sub.domain> placeholder`);
    }
  }
}

// 3: skills/ folders and config maps must be the same set
const interfaceKeys = Object.keys(INTERFACE);
const dirSet = new Set(dirs);
const orderSet = new Set(ORDER);
const interfaceSet = new Set(interfaceKeys);

for (const name of dirs) {
  if (!orderSet.has(name)) fail(`${name}: folder exists but is missing from ORDER in skills.config.mjs`);
  if (!interfaceSet.has(name)) fail(`${name}: folder exists but is missing from INTERFACE in skills.config.mjs`);
}
for (const name of ORDER) {
  if (!dirSet.has(name)) fail(`ORDER lists '${name}' but skills/${name}/ does not exist`);
}
for (const name of interfaceKeys) {
  if (!dirSet.has(name)) fail(`INTERFACE lists '${name}' but skills/${name}/ does not exist`);
}

// 4: ORDER unique; INTERFACE entries complete
if (ORDER.length !== orderSet.size) fail("ORDER contains duplicate entries");
for (const [name, meta] of Object.entries(INTERFACE)) {
  for (const key of ["title", "short", "prompt"]) {
    if (!meta || !meta[key]) fail(`INTERFACE['${name}'] missing '${key}'`);
  }
}

// ---- report ----------------------------------------------------------------
if (errors.length) {
  console.error(`✗ validate-skills: ${errors.length} problem(s) found:\n`);
  for (const e of errors) console.error("  - " + e);
  console.error("\nFix the above (see CONTRIBUTING.md), then re-run: node scripts/validate-skills.mjs");
  process.exit(1);
}

console.log(`✓ validate-skills: ${dirs.length} skills consistent with skills.config.mjs`);
