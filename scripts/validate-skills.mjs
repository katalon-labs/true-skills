#!/usr/bin/env node
/**
 * validate-skills.mjs - guard the skills/ <-> skills.config.mjs <-> docs/mcp-tools.json contract.
 *
 * Checks (every failure names the file and the fix):
 *   1. Frontmatter. SKILL.md starts with YAML that parses (a small built-in parser handles
 *      nested maps such as `metadata:`). Allowed keys: name, description, license, compatibility,
 *      metadata, allowed-tools. `name` matches the folder, is lowercase kebab-case, at most 64
 *      characters, and holds no XML tag or reserved word. `license` is MIT, `compatibility` is 1-500
 *      characters and names the Katalon True Platform MCP server, `metadata.version` equals
 *      SKILL_VERSION and the root plugin.json version, `metadata.mcp-contract` equals MCP_CONTRACT,
 *      and every metadata value is a string.
 *   2. Description contract (AC-3). 250-600 characters, third person, opens with what the skill does,
 *      contains "Use when", names an adjacent skill, names each declared role verbatim, has no ": "
 *      and no "Written for" tail. All descriptions together stay within 10,000 characters.
 *   3. Role contract (AC-1). Roles declared in INTERFACE are named in the description and the other
 *      way round; only the router declares more than two; every role is reachable.
 *   4. skills/ folders, ORDER and INTERFACE list the same skills.
 *   5. Size. SKILL.md has at most 500 lines and about 5,000 tokens.
 *   6. Reference links. Every relative .md link or references/scripts/assets path in a skill resolves
 *      to a file inside the same skill folder.
 *   7. Shared copies. Each file in SHARED matches shared/references/ under its GENERATED banner.
 *   8. Tool contract (AC-1). No retired tool name anywhere outside docs/mcp-tools.json. Every
 *      backticked tool-shaped name is in docs/mcp-tools.json (or the explicit nonTools list).
 *      ChatGPT-only tools appear only under chatgpt/.
 *   9. No real Katalon subdomain endpoint leaked into any published text.
 *  10. Security. No fetch-and-execute pattern (curl ... | sh and its variants).
 *
 * Exits non-zero on any error. Warnings print but do not fail. No external dependencies - Node >= 18.
 * Run: node scripts/validate-skills.mjs
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as CONFIG from "./skills.config.mjs";
import { findOrphanCopies, planSync } from "./sync-shared.mjs";

const DEFAULT_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------------------------------------
// Minimal YAML subset parser (no dependencies).
//
// Supports what SKILL.md frontmatter needs: nested maps, block lists, plain / single-quoted /
// double-quoted scalars (also across lines), block scalars (| and >), flow lists and flow maps,
// comments. Rejects tabs, duplicate keys, anchors, aliases, tags, and a plain scalar that holds
// ": " (a real YAML parser rejects that too, which is why descriptions must not contain it).
// ---------------------------------------------------------------------------------------------

const KEY_RE = /^("(?:[^"\\]|\\.)*"|'(?:[^']|'')*'|[A-Za-z0-9_][A-Za-z0-9_./-]*)[ ]*:(?:[ ]+(.*)|[ ]*)$/;

function resolvePlain(s) {
  if (s === "" || s === "~" || s === "null") return null;
  if (s === "true") return true;
  if (s === "false") return false;
  if (/^[-+]?(\d+)(\.\d+)?([eE][-+]?\d+)?$/.test(s)) return Number(s);
  return s;
}

function unquote(s, line) {
  if (s.startsWith('"')) {
    try {
      return JSON.parse(s);
    } catch {
      throw new Error(`line ${line}: invalid double-quoted string`);
    }
  }
  return s.slice(1, -1).replace(/''/g, "'");
}

function stripPlainComment(s) {
  const idx = s.search(/(^|\s)#/);
  return (idx === -1 ? s : s.slice(0, idx)).trim();
}

/** Parse a flow collection such as [a, "b", {k: v}] from a string. */
function parseFlow(str, line) {
  let pos = 0;
  const fail = (m) => {
    throw new Error(`line ${line}: ${m} in flow collection`);
  };
  const ws = () => {
    while (pos < str.length && /\s/.test(str[pos])) pos++;
  };
  function value() {
    ws();
    const ch = str[pos];
    if (ch === "[") {
      pos++;
      const arr = [];
      ws();
      if (str[pos] === "]") {
        pos++;
        return arr;
      }
      for (;;) {
        arr.push(value());
        ws();
        if (str[pos] === ",") {
          pos++;
          ws();
          if (str[pos] === "]") {
            pos++;
            return arr;
          }
          continue;
        }
        if (str[pos] === "]") {
          pos++;
          return arr;
        }
        fail("expected ',' or ']'");
      }
    }
    if (ch === "{") {
      pos++;
      const obj = {};
      ws();
      if (str[pos] === "}") {
        pos++;
        return obj;
      }
      for (;;) {
        ws();
        const k = scalar(true);
        ws();
        if (str[pos] !== ":") fail("expected ':'");
        pos++;
        obj[k] = value();
        ws();
        if (str[pos] === ",") {
          pos++;
          continue;
        }
        if (str[pos] === "}") {
          pos++;
          return obj;
        }
        fail("expected ',' or '}'");
      }
    }
    return scalar(false);
  }
  function scalar(isKey) {
    ws();
    const ch = str[pos];
    if (ch === '"' || ch === "'") {
      let end = pos + 1;
      while (end < str.length) {
        if (ch === '"' && str[end] === "\\") end += 2;
        else if (str[end] === ch) {
          if (ch === "'" && str[end + 1] === "'") end += 2;
          else break;
        } else end++;
      }
      if (end >= str.length) fail("unterminated quote");
      const raw = str.slice(pos, end + 1);
      pos = end + 1;
      return unquote(raw, line);
    }
    let end = pos;
    while (end < str.length && !(isKey ? ",}]:".includes(str[end]) : ",}]".includes(str[end]))) end++;
    const raw = str.slice(pos, end).trim();
    pos = end;
    return isKey ? raw : resolvePlain(raw);
  }
  const v = value();
  ws();
  if (pos < str.length) fail("trailing characters");
  return v;
}

export function parseYamlSubset(src) {
  const raw = src.replace(/\r\n?/g, "\n").split("\n");
  let i = 0;
  const err = (msg, n = i) => {
    throw new Error(`line ${n + 1}: ${msg}`);
  };
  const isBlank = (l) => /^\s*(#.*)?$/.test(l);
  const indentOf = (l) => {
    const lead = l.match(/^[ \t]*/)[0];
    if (lead.includes("\t")) err("tab indentation is not allowed");
    return lead.length;
  };
  const skipBlank = () => {
    while (i < raw.length && isBlank(raw[i])) i++;
  };
  const unsupportedStart = (s, n) => {
    if (/^[&*!@`%]/.test(s)) err(`unsupported YAML construct '${s[0]}'`, n);
  };

  function parseBlock(minIndent) {
    skipBlank();
    if (i >= raw.length) return null;
    const ind = indentOf(raw[i]);
    if (ind < minIndent) return null;
    const text = raw[i].slice(ind);
    return text === "-" || text.startsWith("- ") ? parseList(ind) : parseMap(ind);
  }

  function parseMap(ind) {
    const obj = {};
    for (;;) {
      skipBlank();
      if (i >= raw.length) break;
      const cur = indentOf(raw[i]);
      if (cur < ind) break;
      if (cur > ind) err("unexpected indentation");
      const text = raw[i].slice(ind);
      if (text === "-" || text.startsWith("- ")) err("list item where a key was expected");
      const m = text.match(KEY_RE);
      if (!m) err(`cannot read '${text.slice(0, 50)}' as 'key: value'`);
      const key = m[1][0] === '"' || m[1][0] === "'" ? unquote(m[1], i + 1) : m[1];
      if (Object.prototype.hasOwnProperty.call(obj, key)) err(`duplicate key '${key}'`);
      const line = i;
      i++;
      obj[key] = parseValue(m[2] === undefined ? "" : m[2], ind, line, true);
    }
    return obj;
  }

  function parseList(ind) {
    const arr = [];
    for (;;) {
      skipBlank();
      if (i >= raw.length) break;
      const cur = indentOf(raw[i]);
      if (cur < ind) break;
      if (cur > ind) err("unexpected indentation");
      const text = raw[i].slice(ind);
      if (!(text === "-" || text.startsWith("- "))) break;
      const content = text.slice(1).trim();
      const line = i;
      if (content === "" || content.startsWith("#")) {
        i++;
        arr.push(parseBlock(ind + 1));
        continue;
      }
      const offset = ind + (text.length - text.slice(1).trimStart().length);
      if (!/^["'[{|>]/.test(content) && KEY_RE.test(content)) {
        raw[i] = " ".repeat(offset) + content;
        arr.push(parseMap(offset));
        continue;
      }
      i++;
      arr.push(parseValue(content, ind, line, false));
    }
    return arr;
  }

  function parseValue(rest, ind, line, allowNested) {
    const trimmed = rest.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      if (!allowNested) return null;
      skipBlank();
      if (i < raw.length) {
        const next = indentOf(raw[i]);
        if (next > ind) return parseBlock(ind + 1);
        if (next === ind && /^(-$|- )/.test(raw[i].slice(ind))) return parseList(ind);
      }
      return null;
    }
    unsupportedStart(trimmed, line);
    const block = trimmed.match(/^([|>])([+-]?)(\d?)\s*(#.*)?$/);
    if (block) return readBlockScalar(block[1], block[2], block[3] ? Number(block[3]) : 0, ind);
    if (trimmed[0] === "[" || trimmed[0] === "{") {
      let text = trimmed;
      const open = trimmed[0];
      const close = open === "[" ? "]" : "}";
      const depth = (s) => [...s].reduce((d, c) => d + (c === open ? 1 : c === close ? -1 : 0), 0);
      let d = depth(text);
      while (d > 0 && i < raw.length) {
        text += " " + raw[i].trim();
        i++;
        d = depth(text);
      }
      return parseFlow(stripPlainComment(text) || text, line + 1);
    }
    if (trimmed[0] === '"' || trimmed[0] === "'") {
      const q = trimmed[0];
      let text = trimmed;
      const closed = (s) => {
        let k = 1;
        while (k < s.length) {
          if (q === '"' && s[k] === "\\") k += 2;
          else if (s[k] === q) {
            if (q === "'" && s[k + 1] === "'") k += 2;
            else return k;
          } else k++;
        }
        return -1;
      };
      let end = closed(text);
      while (end === -1) {
        if (i >= raw.length) err("unterminated quoted string", line);
        text += " " + raw[i].trim();
        i++;
        end = closed(text);
      }
      const after = text.slice(end + 1).trim();
      if (after && !after.startsWith("#")) err("unexpected text after a quoted string", line);
      return unquote(text.slice(0, end + 1), line + 1);
    }
    // plain scalar, possibly continued on more-indented lines
    let text = stripPlainComment(trimmed);
    while (allowNested && i < raw.length && !isBlank(raw[i]) && indentOf(raw[i]) > ind) {
      text += " " + stripPlainComment(raw[i].trim());
      i++;
    }
    if (/:(\s|$)/.test(text)) err(`plain value contains ': ' (quote the value): ${text.slice(0, 60)}`, line);
    return resolvePlain(text);
  }

  function readBlockScalar(style, chomp, explicit, parentIndent) {
    const body = [];
    let blockIndent = explicit ? parentIndent + explicit : 0;
    while (i < raw.length) {
      const l = raw[i];
      if (l.trim() === "") {
        body.push("");
        i++;
        continue;
      }
      const ind = indentOf(l);
      if (ind <= parentIndent) break;
      if (!blockIndent) blockIndent = ind;
      if (ind < blockIndent) break;
      body.push(l.slice(blockIndent));
      i++;
    }
    let trailing = 0;
    while (body.length && body[body.length - 1] === "") {
      body.pop();
      trailing++;
    }
    let text;
    if (style === "|") text = body.join("\n");
    else {
      const paras = [];
      let cur = [];
      for (const l of body) {
        if (l === "") {
          paras.push(cur.join(" "));
          cur = [];
        } else cur.push(l.trim());
      }
      paras.push(cur.join(" "));
      text = paras.join("\n");
    }
    if (chomp === "-") return text;
    if (chomp === "+") return text + "\n".repeat(trailing + 1);
    return text === "" ? "" : text + "\n";
  }

  const result = parseBlock(0);
  skipBlank();
  if (i < raw.length) err("unexpected content");
  return result ?? {};
}

/** Split a SKILL.md into { fm, body } or { error }. */
export function extractFrontmatter(rawText) {
  const text = rawText.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  if (!text.startsWith("---\n")) return { error: "does not start with a '---' frontmatter fence" };
  const lines = text.split("\n");
  let end = -1;
  for (let k = 1; k < lines.length; k++) {
    if (/^---\s*$/.test(lines[k])) {
      end = k;
      break;
    }
  }
  if (end === -1) return { error: "frontmatter has no closing '---' line" };
  const yaml = lines.slice(1, end).join("\n");
  try {
    return { fm: parseYamlSubset(yaml), body: lines.slice(end + 1).join("\n") };
  } catch (e) {
    return { error: `frontmatter is not valid YAML (${e.message})` };
  }
}

// ---------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------

const TEXT_EXT = new Set([
  ".md", ".json", ".yaml", ".yml", ".txt", ".mjs", ".js", ".ts", ".py", ".sh", ".toml", ".html",
  ".css", ".groovy", ".properties", ".xml", ".csv", ".gradle", ".java", ".ps1",
]);

function walk(dir, filter = () => true) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".git") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, filter));
    else if (e.isFile() && filter(p)) out.push(p);
  }
  return out;
}

const isTextFile = (p) => TEXT_EXT.has(extname(p).toLowerCase());
const isMd = (p) => p.endsWith(".md");

/** Remove fenced code blocks (``` or ~~~), keeping line count so line numbers stay true. */
function stripFences(text) {
  const out = [];
  let fence = null;
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*(`{3,}|~{3,})/);
    if (fence) {
      if (m && m[1][0] === fence[0] && m[1].length >= fence.length) fence = null;
      out.push("");
    } else if (m) {
      fence = m[1];
      out.push("");
    } else out.push(line);
  }
  return out.join("\n");
}

// A real customer endpoint (acme.katalon.io/mcp), with or without scheme. The placeholder
// <your.sub.domain>.katalon.io/mcp never matches because '>' is not a host-label character.
// 'platform' is the public endpoint documented at docs.katalon.com.
const PUBLIC_MCP_HOSTS = new Set(["platform"]);
function findEndpointLeak(text) {
  const re = /(?:https?:\/\/)?([a-z0-9](?:[a-z0-9-]*[a-z0-9])?)\.katalon\.io\/mcp/gi;
  for (const m of text.matchAll(re)) {
    if (!PUBLIC_MCP_HOSTS.has(m[1].toLowerCase())) return m[0];
  }
  return null;
}

const TOOL_PREFIXES = [
  "find", "read", "create", "list", "get", "fetch", "update", "manage", "analyze", "build",
  "prepare", "confirm", "delete", "move", "duplicate", "link", "unlink", "rerun", "search", "stop",
  "schedule",
];
const TOOL_SHAPE = new RegExp(`^(?:${TOOL_PREFIXES.join("|")})_[a-z0-9]+(?:_[a-z0-9]+)*$`);
const IDENT = /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g;

const SECURITY_PATTERNS = [
  [/\b(?:curl|wget)\b[^\n|;]*\|\s*(?:sudo\s+)?(?:sh|bash|zsh|dash|ksh|python3?|node|perl|ruby|pwsh|powershell)\b/i, "pipes a download into an interpreter"],
  [/\b(?:bash|sh|zsh)\s+<\(\s*(?:curl|wget)\b/i, "runs a downloaded script through process substitution"],
  [/\b(?:bash|sh|zsh)\s+-c\s+["']?\$\(\s*(?:curl|wget)\b/i, "runs a downloaded script through sh -c"],
  [/\beval\s+["']?\$\(\s*(?:curl|wget)\b/i, "evals a downloaded script"],
  [/\b(?:iwr|irm|Invoke-WebRequest|Invoke-RestMethod)\b[^\n]*\|\s*(?:iex|Invoke-Expression)\b/i, "pipes a PowerShell download into iex"],
  [/\b(?:iex|Invoke-Expression)\b[^\n]*(?:\b(?:iwr|irm|Invoke-WebRequest|Invoke-RestMethod)\b|DownloadString)/i, "runs a PowerShell download with iex"],
  [/\b(?:npx|pipx\s+run|uvx)\s+(?:-y\s+)?https?:\/\//i, "runs a package straight from a URL"],
];

const RESERVED_NAME_WORDS = ["anthropic", "claude"];

// ---------------------------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------------------------

/**
 * validateRepo({ root, config, tools }) -> { errors, warnings, stats }
 * `config` has the skills.config.mjs exports; `tools` is the parsed docs/mcp-tools.json.
 */
export function validateRepo({ root = DEFAULT_ROOT, config = CONFIG, tools } = {}) {
  const errors = [];
  const warnings = [];
  const fail = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);
  const rel = (p) => relative(root, p).split(sep).join("/");
  const {
    INTERFACE, ORDER, ROLES, ROUTER, SHARED = {}, SKILL_VERSION, MCP_CONTRACT,
    DESCRIPTION_LIMITS, SKILL_LIMITS,
  } = config;

  const skillsDir = join(root, "skills");
  const dirs = existsSync(skillsDir)
    ? readdirSync(skillsDir).filter((d) => statSync(join(skillsDir, d)).isDirectory()).sort()
    : [];
  if (dirs.length === 0) fail("skills/ contains no skill folders");

  // ---- root plugin.json version ------------------------------------------------------------
  let rootVersion = null;
  const rootPlugin = join(root, "plugin.json");
  if (existsSync(rootPlugin)) {
    try {
      rootVersion = JSON.parse(readFileSync(rootPlugin, "utf8")).version ?? null;
    } catch {
      fail("plugin.json is not valid JSON");
    }
    if (rootVersion !== null && rootVersion !== SKILL_VERSION) {
      fail(`plugin.json version '${rootVersion}' does not match SKILL_VERSION '${SKILL_VERSION}' in scripts/skills.config.mjs`);
    }
  }

  // ---- docs/mcp-tools.json -----------------------------------------------------------------
  const toolNames = new Set();
  const retired = new Map();
  const chatgptOnly = new Set();
  const nonTools = new Set();
  const unconfirmed = new Map();
  if (!tools) {
    fail("docs/mcp-tools.json is missing or unreadable; the tool contract cannot be checked");
  } else {
    if (tools.contract !== MCP_CONTRACT) {
      fail(`docs/mcp-tools.json contract '${tools.contract}' does not match MCP_CONTRACT '${MCP_CONTRACT}'`);
    }
    const classes = new Set(["read", "write", "destructive"]);
    for (const t of tools.tools || []) {
      if (!t.name || !/^[A-Za-z0-9_.-]{1,128}$/.test(t.name)) fail(`docs/mcp-tools.json: invalid tool name '${t.name}'`);
      if (toolNames.has(t.name)) fail(`docs/mcp-tools.json: duplicate tool '${t.name}'`);
      toolNames.add(t.name);
      if (!classes.has(t.class)) fail(`docs/mcp-tools.json: tool '${t.name}' has class '${t.class}', expected read, write or destructive`);
      if (!t.group) fail(`docs/mcp-tools.json: tool '${t.name}' has no group`);
    }
    for (const [name, replacement] of Object.entries(tools.retired || {})) {
      retired.set(name, replacement);
      if (toolNames.has(name)) fail(`docs/mcp-tools.json: '${name}' is both a tool and retired`);
      const mentionsLive = [...toolNames].some((n) => new RegExp(`(?<![A-Za-z0-9_])${n}(?![A-Za-z0-9_])`).test(replacement));
      if (!mentionsLive && !/^none:\s*\S/.test(replacement)) fail(`docs/mcp-tools.json: retired '${name}' maps to '${replacement}', which names no contract tool`);
    }
    for (const t of tools.chatgptOnly || []) chatgptOnly.add(t.name);
    for (const t of tools.nonTools || []) nonTools.add(t.name);
    for (const [n, note] of Object.entries(tools.unconfirmed || {})) unconfirmed.set(n, note);
  }

  // ---- per-skill checks --------------------------------------------------------------------
  const seenRoles = new Set();
  const descriptions = [];

  for (const name of dirs) {
    const skillDir = join(skillsDir, name);
    const skillPath = join(skillDir, "SKILL.md");
    const where = `skills/${name}/SKILL.md`;
    if (!existsSync(skillPath)) {
      fail(`skills/${name}: missing SKILL.md`);
      continue;
    }
    const raw = readFileSync(skillPath, "utf8");
    const parsed = extractFrontmatter(raw);
    if (parsed.error) {
      fail(`${where}: ${parsed.error}`);
      continue;
    }
    const { fm, body } = parsed;

    // 1. frontmatter keys and values
    const ALLOWED = new Set(["name", "description", "license", "compatibility", "metadata", "allowed-tools"]);
    for (const k of Object.keys(fm)) {
      if (!ALLOWED.has(k)) fail(`${where}: frontmatter key '${k}' is not portable; allowed keys are ${[...ALLOWED].join(", ")}`);
    }
    if (typeof fm.name !== "string" || !fm.name) fail(`${where}: frontmatter missing 'name'`);
    else {
      if (fm.name !== name) fail(`${where}: frontmatter name '${fm.name}' does not match folder '${name}'`);
      if (fm.name.length > 64) fail(`${where}: name is ${fm.name.length} characters, over 64`);
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fm.name)) fail(`${where}: name '${fm.name}' must be lowercase letters, digits and single hyphens`);
      if (/<[^>]*>/.test(fm.name)) fail(`${where}: name holds an XML tag`);
      for (const w of RESERVED_NAME_WORDS) if (fm.name.includes(w)) fail(`${where}: name holds the reserved word '${w}'`);
    }
    if (fm.license !== "MIT") fail(`${where}: frontmatter 'license' must be MIT (got ${JSON.stringify(fm.license)})`);
    if (typeof fm.compatibility !== "string" || fm.compatibility.trim() === "") {
      fail(`${where}: frontmatter missing 'compatibility'`);
    } else {
      const c = fm.compatibility.trim();
      if (c.length > 500) fail(`${where}: compatibility is ${c.length} characters, over 500`);
      if (!/Katalon True Platform MCP server/.test(c)) fail(`${where}: compatibility must name the Katalon True Platform MCP server`);
    }
    if (fm.metadata === undefined) fail(`${where}: frontmatter missing 'metadata' (version and mcp-contract)`);
    else if (fm.metadata === null || typeof fm.metadata !== "object" || Array.isArray(fm.metadata)) {
      fail(`${where}: 'metadata' must be a map of string values`);
    } else {
      for (const [k, v] of Object.entries(fm.metadata)) {
        if (typeof v !== "string") fail(`${where}: metadata.${k} must be a string; quote it (got ${JSON.stringify(v)})`);
      }
      if (fm.metadata.version !== SKILL_VERSION) fail(`${where}: metadata.version must be "${SKILL_VERSION}" (got ${JSON.stringify(fm.metadata.version)})`);
      if (fm.metadata["mcp-contract"] !== MCP_CONTRACT) fail(`${where}: metadata.mcp-contract must be "${MCP_CONTRACT}" (got ${JSON.stringify(fm.metadata["mcp-contract"])})`);
    }

    // 2. description contract
    if (typeof fm.description !== "string" || !fm.description.trim()) {
      fail(`${where}: frontmatter missing 'description'`);
    } else {
      const d = fm.description.trim();
      descriptions.push(d.length);
      if (d.length < DESCRIPTION_LIMITS.min) fail(`${where}: description is ${d.length} characters, under the ${DESCRIPTION_LIMITS.min} minimum`);
      if (d.length > DESCRIPTION_LIMITS.max) fail(`${where}: description is ${d.length} characters, over the ${DESCRIPTION_LIMITS.max} maximum`);
      if (d.includes(": ") || d.endsWith(":")) fail(`${where}: description contains ': '; rewrite without a colon`);
      if (/<\/?[A-Za-z][^>]*>/.test(d)) fail(`${where}: description holds an XML tag`);
      if (/\b(?:you|your|we|our|my)\b/i.test(d) || /\bI(?:'m|'ll|'ve)?\b/.test(d)) {
        fail(`${where}: description must be third person (found a first or second person pronoun)`);
      }
      if (!/\bUse when\b/.test(d)) fail(`${where}: description must contain "Use when ..."`);
      if (/^(?:use when|use this skill|this skill|a skill|the skill)\b/i.test(d)) {
        fail(`${where}: description must open with what the skill does, not with "Use when" or "This skill"`);
      }
      if (/\bWritten for\b/i.test(d)) fail(`${where}: description has a "Written for ..." tail; move persona text into the body`);
      const adjacent = ORDER.filter((s) => s !== name).some((s) => new RegExp(`(?<![\\w-])${s}(?![\\w-])`).test(d));
      if (!adjacent) fail(`${where}: description must name an adjacent skill it is not (for example "not create-test-cases")`);

      // 3. role contract
      const declared = INTERFACE[name] && INTERFACE[name].roles;
      if (!Array.isArray(declared)) {
        fail(`INTERFACE['${name}'] missing 'roles' (use [] for a role-neutral skill)`);
      } else {
        const lower = d.toLowerCase();
        for (const r of declared) {
          if (!ROLES.includes(r)) fail(`INTERFACE['${name}'] role '${r}' is not one of: ${ROLES.join(", ")}`);
          else if (!lower.includes(r)) fail(`${where}: INTERFACE declares role '${r}' but the description never names it (AC-1)`);
          else seenRoles.add(r);
        }
        for (const r of ROLES) {
          if (!declared.includes(r) && lower.includes(r)) fail(`${where}: description names role '${r}' but INTERFACE does not declare it (AC-1)`);
        }
        if (name !== ROUTER && declared.length > 2) fail(`${where}: declares ${declared.length} roles; only '${ROUTER}' may declare more than two (AC-1)`);
      }
    }

    // 5. size
    const lineCount = raw.replace(/\r\n?/g, "\n").replace(/\n$/, "").split("\n").length;
    const tokens = Math.ceil(raw.length / 4);
    if (lineCount > SKILL_LIMITS.maxLines) fail(`${where}: ${lineCount} lines, over ${SKILL_LIMITS.maxLines}; move depth into references/`);
    if (tokens > SKILL_LIMITS.maxTokens) fail(`${where}: about ${tokens} tokens, over ${SKILL_LIMITS.maxTokens}; move depth into references/`);
    else if (tokens > SKILL_LIMITS.warnTokens) warn(`${where}: about ${tokens} tokens; the target is 5,000`);

    // 6. reference links, plus orphan references (warning)
    const mdFiles = walk(skillDir, isMd);
    const skillRoot = skillDir + sep;
    const referenced = new Set();
    for (const file of mdFiles) {
      const text = stripFences(readFileSync(file, "utf8"));
      const fileDir = dirname(file);
      const candidates = [];
      for (const m of text.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
        const t = m[1].split("#")[0].split("?")[0];
        if (!t || /^[a-z][a-z0-9+.-]*:/i.test(t) || t.startsWith("//")) continue;
        candidates.push(t);
      }
      for (const m of text.matchAll(/`([^`\n]+)`/g)) {
        const t = m[1].trim();
        if (/[\s*<>{}$|()]/.test(t)) continue;
        const clean = t.split("#")[0];
        if (!clean) continue;
        // ./reports or ../data are paths in the user's project; only .md files and
        // skill-layout prefixes count as references.
        if (/^(?:\.\.?\/)/.test(clean)) {
          if (clean.endsWith(".md")) candidates.push(clean);
        } else if (/^(?:skills|shared|references|scripts|assets)\//.test(clean)) candidates.push(clean);
        else if (/^[A-Za-z0-9._-]+\.md$/.test(clean) && !IGNORED_MD.has(clean)) candidates.push(clean);
      }
      for (const t of new Set(candidates)) {
        const a = resolve(fileDir, t);
        const b = resolve(skillDir, t);
        const inside = (p) => p === skillDir || p.startsWith(skillRoot);
        const hit = [a, b].find((p) => inside(p) && existsSync(p));
        if (hit) {
          if (hit.endsWith(".md")) referenced.add(hit);
          continue;
        }
        if ((!inside(a) && !inside(b)) || /^(?:skills|shared)\//.test(t)) {
          fail(`${rel(file)}: '${t}' points outside skills/${name}/; a skill folder must be self-contained (use a local copy, see SHARED)`);
        } else {
          fail(`${rel(file)}: '${t}' does not exist inside skills/${name}/`);
        }
      }
    }
    for (const file of mdFiles) {
      if (file === skillPath) continue;
      if (!referenced.has(file) && !raw.includes(relative(skillDir, file).split(sep).join("/"))) {
        warn(`${rel(file)}: no link from SKILL.md or another reference; add a "read this when" pointer`);
      }
    }
  }

  // total description budget
  const totalDesc = descriptions.reduce((a, b) => a + b, 0);
  if (totalDesc > DESCRIPTION_LIMITS.total) {
    fail(`descriptions total ${totalDesc} characters, over the ${DESCRIPTION_LIMITS.total} budget`);
  }

  // 4. folders, ORDER and INTERFACE
  const dirSet = new Set(dirs);
  const orderSet = new Set(ORDER);
  const interfaceKeys = Object.keys(INTERFACE);
  const interfaceSet = new Set(interfaceKeys);
  for (const name of dirs) {
    if (!orderSet.has(name)) fail(`${name}: folder exists but is missing from ORDER in skills.config.mjs`);
    if (!interfaceSet.has(name)) fail(`${name}: folder exists but is missing from INTERFACE in skills.config.mjs`);
  }
  for (const name of ORDER) if (!dirSet.has(name)) fail(`ORDER lists '${name}' but skills/${name}/ does not exist`);
  for (const name of interfaceKeys) if (!dirSet.has(name)) fail(`INTERFACE lists '${name}' but skills/${name}/ does not exist`);
  if (ORDER.length !== orderSet.size) fail("ORDER contains duplicate entries");
  for (const [name, meta] of Object.entries(INTERFACE)) {
    for (const key of ["title", "short", "prompt"]) if (!meta || !meta[key]) fail(`INTERFACE['${name}'] missing '${key}'`);
  }
  for (const r of ROLES) if (!seenRoles.has(r)) fail(`no skill description names the role '${r}' (AC-1)`);

  // 7. shared copies
  const sync = planSync(root, SHARED);
  for (const p of sync.problems) fail(`shared: ${p}`);
  for (const item of sync.plan) {
    if (item.state === "missing") fail(`${rel(item.target)} is missing; run: node scripts/sync-shared.mjs`);
    else if (item.state === "drift") fail(`${rel(item.target)} differs from shared/references/${item.file}; edit the source, then run: node scripts/sync-shared.mjs`);
  }
  for (const o of findOrphanCopies(root, sync.planned)) {
    fail(`${o} carries a GENERATED banner but no SHARED entry produces it; delete it or add it to SHARED`);
  }

  // ---- text scans: leaks, security, tool contract -----------------------------------------
  const published = [
    ...walk(join(root, "skills"), isTextFile),
    ...walk(join(root, "shared"), isTextFile),
    ...walk(join(root, "chatgpt"), isTextFile),
  ];
  // Files scanned for retired names only (docs, top-level text). The contract file itself is exempt.
  const docsScan = [
    ...["README.md", "AGENTS.md", "CONTRIBUTING.md", "llms.txt"].map((f) => join(root, f)).filter(existsSync),
    ...walk(join(root, "docs"), (p) => isTextFile(p) && rel(p) !== "docs/mcp-tools.json"),
  ];

  const retiredRe = [...retired.keys()].map((n) => [n, new RegExp(`(?<![A-Za-z0-9_])${n}(?![A-Za-z0-9_])`)]);
  const tokenIssues = new Map(); // key -> { message, files:Set }
  const addTokenIssue = (key, message, file) => {
    if (!tokenIssues.has(key)) tokenIssues.set(key, { message, files: new Set() });
    tokenIssues.get(key).files.add(file);
  };

  for (const file of new Set([...published, ...docsScan])) {
    const r = rel(file);
    const text = readFileSync(file, "utf8");
    const inChatgpt = r.startsWith("chatgpt/");
    const isPublished = published.includes(file);

    for (const [n, re] of retiredRe) {
      if (re.test(text)) addTokenIssue(`retired:${n}`, `retired tool '${n}' (use ${retired.get(n)})`, r);
    }
    if (!isPublished) continue;

    const leak = findEndpointLeak(text);
    if (leak) fail(`${r}: real Katalon endpoint '${leak}' committed - use the <your.sub.domain> placeholder`);

    text.split("\n").forEach((line, idx) => {
      for (const [re, why] of SECURITY_PATTERNS) {
        if (re.test(line)) fail(`${r}:${idx + 1}: fetch-and-execute pattern (${why}); download, inspect, then run`);
      }
    });

    if (tools && isMd(file)) {
      const scan = stripFences(text);
      for (const m of scan.matchAll(/`([^`\n]+)`/g)) {
        const parts = m[1].split(/\s*,\s*/);
        for (const part of parts) {
          const id = part.trim().match(/^([a-z][a-z0-9_]*)(?:\(.*\))?$/);
          if (!id || !TOOL_SHAPE.test(id[1])) continue;
          const t = id[1];
          if (retired.has(t) || toolNames.has(t) || nonTools.has(t)) continue;
          if (chatgptOnly.has(t)) {
            if (!inChatgpt) addTokenIssue(`chatgpt:${t}`, `ChatGPT-only tool '${t}' named outside chatgpt/`, r);
            continue;
          }
          if (unconfirmed.has(t)) {
            addTokenIssue(`unknown:${t}`, `tool '${t}' is not in the October 2026 docs contract (${unconfirmed.get(t)})`, r);
          } else {
            addTokenIssue(`unknown:${t}`, `tool-shaped name '${t}' is not in docs/mcp-tools.json; fix the name, or if it is not a tool, ask for it to be added to nonTools`, r);
          }
        }
      }
    }
  }

  // chatgpt/plugin.json review cases name tools in plain text
  const chatgptPlugin = join(root, "chatgpt", "plugin.json");
  if (tools && existsSync(chatgptPlugin)) {
    try {
      const cases = JSON.parse(readFileSync(chatgptPlugin, "utf8"))?.extensions?.["com.openai"]?.review?.test_cases?.positive || [];
      for (const c of cases) {
        for (const t of String(c.tools_triggered || "").match(IDENT) || []) {
          if (toolNames.has(t) || chatgptOnly.has(t) || nonTools.has(t)) continue;
          if (retired.has(t)) addTokenIssue(`retired:${t}`, `retired tool '${t}' (use ${retired.get(t)})`, "chatgpt/plugin.json");
          else addTokenIssue(`unknown:${t}`, `tools_triggered names '${t}', which is in neither docs/mcp-tools.json tools nor chatgptOnly`, "chatgpt/plugin.json");
        }
      }
    } catch {
      /* build-chatgpt-plugin.py reports malformed plugin.json */
    }
  }

  for (const { message, files } of tokenIssues.values()) {
    const list = [...files].sort();
    const shown = list.slice(0, 3).join(", ") + (list.length > 3 ? ` and ${list.length - 3} more` : "");
    fail(`${message}: ${shown}`);
  }

  // Claude-only prefix syntax should appear in one sentence per skill (warning)
  for (const name of dirs) {
    let n = 0;
    for (const f of walk(join(skillsDir, name), isMd)) {
      n += readFileSync(f, "utf8").split("\n").filter((l) => l.includes("mcp__")).length;
    }
    if (n > 2) warn(`skills/${name}: ${n} lines mention the 'mcp__' prefix; name tools bare and explain the prefix once`);
  }

  return {
    errors,
    warnings,
    stats: {
      skills: dirs.length,
      descriptionChars: totalDesc,
      tools: toolNames.size,
      sharedCopies: sync.plan.length,
      scannedFiles: new Set([...published, ...docsScan]).size,
    },
  };
}

// Markdown file names that are not skill-local references (they describe the user's repo).
const IGNORED_MD = new Set([
  "AGENTS.md", "CLAUDE.md", "GEMINI.md", "README.md", "CHANGELOG.md", "CONTRIBUTING.md", "LICENSE.md",
]);

// ---------------------------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------------------------

function main() {
  const root = process.env.TRUE_SKILLS_ROOT ? resolve(process.env.TRUE_SKILLS_ROOT) : DEFAULT_ROOT;
  let tools = null;
  const toolsPath = join(root, "docs", "mcp-tools.json");
  if (existsSync(toolsPath)) {
    try {
      tools = JSON.parse(readFileSync(toolsPath, "utf8"));
    } catch (e) {
      console.error(`✗ validate-skills: docs/mcp-tools.json is not valid JSON (${e.message})`);
      process.exit(1);
    }
  }
  const { errors, warnings, stats } = validateRepo({ root, config: CONFIG, tools });
  for (const w of warnings) console.warn("  warning: " + w);
  if (errors.length) {
    console.error(`✗ validate-skills: ${errors.length} problem(s) found:\n`);
    for (const e of errors) console.error("  - " + e);
    console.error("\nFix the above (see CONTRIBUTING.md), then re-run: node scripts/validate-skills.mjs");
    process.exit(1);
  }
  console.log(
    `✓ validate-skills: ${stats.skills} skills, ${stats.descriptionChars} description characters, ` +
      `${stats.tools} contract tools, ${stats.sharedCopies} shared copies, ${stats.scannedFiles} files scanned`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
