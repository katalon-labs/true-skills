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
 *   6. The role contract (AC-1): every role an INTERFACE entry declares is named
 *      verbatim in that skill's description, every role named in a description is
 *      declared, no non-router skill declares more than two, every role in ROLES is
 *      reachable from at least one description, and each description stays under
 *      1024 characters with no ": " (which would break the unquoted YAML that
 *      build-adapters writes into .cursor/rules/*.mdc).
 *
 * Exits non-zero on any failure. No external dependencies - Node >= 18, ESM.
 * Run: node scripts/validate-skills.mjs
 */

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { INTERFACE, ORDER, ROLES, ROUTER } from "./skills.config.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = join(ROOT, "skills");

const seenRoles = new Set();

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

// Find a real Katalon MCP endpoint, with or without scheme
// (e.g. https://acme.katalon.io/mcp or bare acme.katalon.io/mcp).
// The documented placeholder <your.sub.domain>.katalon.io/mcp never matches
// because '>' is not a valid host-label character, so it cannot sit adjacent
// to '.katalon.io'.
function findEndpointLeak(text) {
  const re = /(?:https?:\/\/)?[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.katalon\.io\/mcp/i;
  const m = text.match(re);
  return m ? m[0] : null;
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

  // 6: role contract (AC-1). Every declared role is named verbatim in the description,
  // every named role is declared, no non-router skill claims more than two, and the
  // description stays inside the format budget and the unquoted-Cursor constraint.
  if (fm.description) {
    if (fm.description.length > 1024) {
      fail(`${name}: description is ${fm.description.length} chars, over the 1024 budget`);
    }
    if (fm.description.includes(": ")) {
      fail(`${name}: description contains ': ', which breaks the unquoted YAML in .cursor/rules/*.mdc`);
    }
    const declared = INTERFACE[name] && INTERFACE[name].roles;
    if (!Array.isArray(declared)) {
      fail(`INTERFACE['${name}'] missing 'roles' (use [] for a role-neutral skill)`);
    } else {
      const lower = fm.description.toLowerCase();
      for (const r of declared) {
        if (!ROLES.includes(r)) fail(`INTERFACE['${name}'] role '${r}' is not one of: ${ROLES.join(", ")}`);
        else if (!lower.includes(r)) fail(`${name}: INTERFACE declares role '${r}' but the description never names it (AC-1)`);
        else seenRoles.add(r);
      }
      for (const r of ROLES) {
        if (!declared.includes(r) && lower.includes(r)) {
          fail(`${name}: description names role '${r}' but INTERFACE does not declare it (AC-1)`);
        }
      }
      if (name !== ROUTER && declared.length > 2) {
        fail(`${name}: declares ${declared.length} roles; only '${ROUTER}' may declare more than two (AC-1)`);
      }
    }
  }

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

// 6b: every role in the vocabulary is reachable from at least one description (AC-1)
for (const r of ROLES) {
  if (!seenRoles.has(r)) fail(`no skill description names the role '${r}' (AC-1)`);
}

// ---- report ----------------------------------------------------------------
if (errors.length) {
  console.error(`✗ validate-skills: ${errors.length} problem(s) found:\n`);
  for (const e of errors) console.error("  - " + e);
  console.error("\nFix the above (see CONTRIBUTING.md), then re-run: node scripts/validate-skills.mjs");
  process.exit(1);
}

console.log(`✓ validate-skills: ${dirs.length} skills consistent with skills.config.mjs`);
