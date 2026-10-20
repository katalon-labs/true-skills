#!/usr/bin/env node
/**
 * sync-shared.mjs - copy shared reference files into the skills that use them.
 *
 * One canonical copy of each shared reference lives in shared/references/. The SHARED map in
 * scripts/skills.config.mjs lists which skills receive it. This script writes each copy to
 * skills/<skill>/references/<file> with a one-line banner, so the skill folder stays
 * self-contained (an installed skill cannot reach outside its own folder).
 *
 *   node scripts/sync-shared.mjs           write every copy
 *   node scripts/sync-shared.mjs --check   write nothing; exit 1 if any copy drifted
 *
 * The banner is `<!-- GENERATED from shared/references/<file> - edit the source -->`. The
 * validator (scripts/validate-skills.mjs) runs the same check and fails on drift.
 *
 * No external dependencies - Node >= 18, ESM.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { SHARED } from "./skills.config.mjs";

export const DEFAULT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const BANNER_PREFIX = "<!-- GENERATED from shared/references/";

export const bannerFor = (file) => `${BANNER_PREFIX}${file} - edit the source -->`;

/** Exact text a skill copy must contain: banner line, blank-free join, canonical body. */
export function expectedCopy(file, canonicalText) {
  const body = canonicalText.replace(/\r\n/g, "\n").replace(/^﻿/, "");
  return `${bannerFor(file)}\n${body}`;
}

/**
 * Compare every planned copy with what is on disk.
 * Returns { problems: string[], plan: [{ file, skill, target, text, state }] } where state is
 * "ok", "missing" or "drift". A missing canonical file is a problem and yields no plan entry.
 */
export function planSync(root = DEFAULT_ROOT, shared = SHARED) {
  const problems = [];
  const plan = [];
  const seen = new Map();
  for (const [file, skills] of Object.entries(shared)) {
    if (!/^[a-z0-9][a-z0-9.-]*\.md$/.test(file)) {
      problems.push(`SHARED key '${file}' must be a lowercase file name ending in .md`);
      continue;
    }
    const source = join(root, "shared", "references", file);
    if (!existsSync(source)) {
      problems.push(`shared/references/${file} is listed in SHARED but does not exist`);
      continue;
    }
    if (!Array.isArray(skills) || skills.length === 0) {
      problems.push(`SHARED['${file}'] must list at least one skill`);
      continue;
    }
    const text = readFileSync(source, "utf8");
    if (text.startsWith(BANNER_PREFIX)) {
      problems.push(`shared/references/${file} starts with a GENERATED banner; the source must not`);
    }
    const dupes = skills.filter((s, i) => skills.indexOf(s) !== i);
    if (dupes.length) problems.push(`SHARED['${file}'] lists ${[...new Set(dupes)].join(", ")} more than once`);
    for (const skill of new Set(skills)) {
      if (!existsSync(join(root, "skills", skill))) {
        problems.push(`SHARED['${file}'] lists skill '${skill}' but skills/${skill}/ does not exist`);
        continue;
      }
      const target = join(root, "skills", skill, "references", file);
      const want = expectedCopy(file, text);
      seen.set(relative(root, target), file);
      let state = "missing";
      if (existsSync(target)) state = readFileSync(target, "utf8") === want ? "ok" : "drift";
      plan.push({ file, skill, target, text: want, state });
    }
  }
  return { problems, plan, planned: seen };
}

/** Generated copies on disk that no SHARED entry accounts for (a stale copy or a hand-made banner). */
export function findOrphanCopies(root = DEFAULT_ROOT, planned = new Map()) {
  const orphans = [];
  const skillsDir = join(root, "skills");
  if (!existsSync(skillsDir)) return orphans;
  for (const skill of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!skill.isDirectory()) continue;
    const refs = join(skillsDir, skill.name, "references");
    if (!existsSync(refs)) continue;
    for (const f of readdirSync(refs, { withFileTypes: true })) {
      if (!f.isFile() || !f.name.endsWith(".md")) continue;
      const path = join(refs, f.name);
      const rel = relative(root, path);
      if (planned.has(rel)) continue;
      const first = readFileSync(path, "utf8").split("\n", 1)[0];
      if (first.startsWith(BANNER_PREFIX)) orphans.push(rel);
    }
  }
  return orphans;
}

function main(argv) {
  const check = argv.includes("--check");
  const rootArg = argv.find((a) => a.startsWith("--root="));
  const root = rootArg ? resolve(rootArg.slice("--root=".length)) : DEFAULT_ROOT;
  const { problems, plan, planned } = planSync(root);
  const orphans = findOrphanCopies(root, planned);
  for (const o of orphans) problems.push(`${o} carries a GENERATED banner but no SHARED entry produces it; delete it or add it to SHARED`);

  let changed = 0;
  for (const item of plan) {
    if (item.state === "ok") continue;
    const rel = relative(root, item.target);
    if (check) {
      problems.push(`${rel} is ${item.state === "missing" ? "missing" : "out of date"}; run: node scripts/sync-shared.mjs`);
    } else {
      mkdirSync(dirname(item.target), { recursive: true });
      writeFileSync(item.target, item.text);
      console.log(`  wrote ${rel}`);
      changed += 1;
    }
  }

  if (problems.length) {
    console.error(`✗ sync-shared: ${problems.length} problem(s):\n`);
    for (const p of problems) console.error("  - " + p);
    process.exit(1);
  }
  console.log(
    check
      ? `✓ sync-shared: ${plan.length} shared copies match shared/references/`
      : `✓ sync-shared: ${plan.length} shared copies, ${changed} written`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main(process.argv.slice(2));
