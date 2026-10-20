/**
 * checks.mjs - deterministic output-quality checks.
 *
 * A rubric is a list of binary checks. Each check has an id, a type from the
 * registry below, params, and an optional `when` key. Params may reference the
 * scenario with "$expect.<key>", so one rubric serves several scenarios.
 * A check whose `when` key is missing or empty in the scenario is SKIPPED.
 *
 * No dependencies. Node >= 18.
 */

// ---------------------------------------------------------------- helpers

export const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const strip = (s) => String(s ?? '').replace(/^[\s*`_]+|[\s*`_]+$/g, '').trim();

export function resolveParams(v, expect) {
  if (typeof v === 'string' && v.startsWith('$expect.')) return expect?.[v.slice(8)];
  if (Array.isArray(v)) {
    return v.flatMap((x) => {
      const r = resolveParams(x, expect);
      return Array.isArray(r) ? r : [r];
    });
  }
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolveParams(x, expect)]));
  }
  return v;
}

const isEmpty = (v) => v === undefined || v === null || v === false || v === '' || (Array.isArray(v) && v.length === 0);

function rx(p, flags = 'i') {
  return p instanceof RegExp ? p : new RegExp(p, flags);
}

function jsonKey(json, label) {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return undefined;
  const want = label.toLowerCase().replace(/[^a-z0-9]+/g, '');
  for (const k of Object.keys(json)) if (k.toLowerCase().replace(/[^a-z0-9]+/g, '') === want) return json[k];
  return undefined;
}

/** Values that follow "Label:" on a line (markdown or plain text), or a top-level JSON key. */
export function labelValues(ctx, label) {
  const out = [];
  const re = new RegExp(`^[ \\t>#*\\-]*\\**${esc(label)}\\**\\s*:\\**[ \\t]*(.*)$`, 'gim');
  for (const m of ctx.text.matchAll(re)) out.push(strip(m[1]));
  const j = jsonKey(ctx.json, label);
  if (j !== undefined) out.push(strip(typeof j === 'string' ? j : JSON.stringify(j)));
  return out;
}

function pickAllowed(value, allowed) {
  if (value.includes('|')) return null; // an unfilled template echo
  const v = value.toLowerCase();
  const sorted = [...allowed].sort((a, b) => b.length - a.length);
  for (const a of sorted) {
    const al = a.toLowerCase();
    if (v === al) return a;
    // The value may run on after the word ("Medium     Basis: ..."). One space and a letter means a longer phrase ("Ready with risk"), so it does not match "Ready".
    if (v.startsWith(al) && !/^ [a-z]/.test(v.slice(al.length)) && !/^[a-z]/.test(v.slice(al.length))) return a;
  }
  return null;
}

function cut(text, i, len, window) {
  return text.slice(Math.max(0, i - window), Math.min(text.length, i + len + window));
}

function occurrences(text, needle) {
  const out = [];
  const hay = text.toLowerCase();
  const n = String(needle).toLowerCase();
  if (!n) return out;
  for (let i = hay.indexOf(n); i !== -1; i = hay.indexOf(n, i + n.length)) out.push(i);
  return out;
}

// ------------------------------------------------------------- case parsing

const clean = (s) => strip(String(s ?? ''));

export function parseCases(text, json) {
  if (json) {
    const arr = Array.isArray(json) ? json : json.cases ?? json.test_cases ?? json.plan?.cases;
    if (Array.isArray(arr)) {
      return arr.map((c) => ({
        name: clean(c.name ?? c.title),
        description: clean(c.description),
        precondition: clean(c.precondition ?? c.pre_condition ?? c.preCondition ?? c['pre-condition']),
        priority: clean(c.priority),
        steps: (c.steps ?? []).map((s) => ({
          action: clean(s.action ?? s.step ?? s.test_step ?? s.testStep ?? (typeof s === 'string' ? s : '')),
          expected: clean(s.expected ?? s.expectedResult ?? s.expected_result ?? ''),
          data: clean(s.data ?? s.test_data ?? ''),
        })),
      }));
    }
  }
  const lines = text.split('\n');
  const nameRe = /^[ \t>#*\-]*\**Name\**\s*:\**[ \t]*(.+?)\**\s*$/i;
  const cases = [];
  let cur = null;
  for (const line of lines) {
    const nm = line.match(nameRe);
    if (nm) {
      cur = { name: clean(nm[1]), description: '', precondition: '', priority: '', steps: [] };
      cases.push(cur);
      continue;
    }
    if (!cur) continue;
    const field = line.match(/^[ \t>#*\-]*\**(Description|Pre-?condition|Priority)\**\s*:\**[ \t]*(.*)$/i);
    if (field) {
      const k = field[1].toLowerCase().replace('-', '');
      cur[k === 'description' ? 'description' : k === 'priority' ? 'priority' : 'precondition'] = clean(field[2]);
      continue;
    }
    const row = line.match(/^\s*\|(.+)\|\s*$/);
    if (row) {
      const cells = row[1].split('|').map((c) => c.trim());
      if (/^\d+$/.test(cells[0]) && cells.length >= 2) {
        cur.steps.push({ action: clean(cells[1]), expected: clean(cells[2] ?? ''), data: clean(cells[3] ?? '') });
      }
    }
  }
  return cases;
}

// ----------------------------------------------------------- cluster parsing

export function parseClusters(text) {
  const lines = text.split('\n');
  const head = /^\s*(?:#+\s*)?\**Cluster\s+\d+/i;
  const blocks = [];
  let cur = null;
  for (const line of lines) {
    if (head.test(line)) {
      cur = { title: line.trim(), lines: [] };
      blocks.push(cur);
      continue;
    }
    if (cur && /^\s*(?:#+\s|\**No verdict)/i.test(line)) {
      cur = null;
      continue;
    }
    if (cur) cur.lines.push(line);
  }
  return blocks.map((b) => {
    const body = [b.title, ...b.lines].join('\n');
    const f = (label) => {
      const m = body.match(new RegExp(`^[ \\t>*\\-]*\\**${esc(label)}\\**\\s*:\\**[ \\t]*(.*)$`, 'im'));
      return m ? strip(m[1]) : '';
    };
    return { title: b.title, body, classification: f('Classification'), cases: f('Cases'), fields: { cause: f('Likely cause'), evidence: f('Evidence'), action: f('Action') } };
  });
}

function headingBlock(text, heading) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => new RegExp(`^[ \\t>#*\\-]*\\**${esc(heading)}`, 'i').test(l));
  if (start === -1) return null;
  const out = [lines[start]];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^\s*(?:#+\s|\**Cluster\s+\d+)/i.test(lines[i])) break;
    out.push(lines[i]);
  }
  return out.join('\n');
}

// ------------------------------------------------------------ code balance

function stripCode(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/`(?:\\[\s\S]|[^`\\])*`/g, '``')
    .replace(/"(?:\\.|[^"\\\n])*"/g, '""')
    .replace(/'(?:\\.|[^'\\\n])*'/g, "''")
    .replace(/(?<![\w)\]])\/(?![/*])(?:\\.|\[(?:\\.|[^\]\\])*\]|[^/\\\n])+\/[gimsuy]*/g, '/r/');
}

function balanced(src) {
  const s = stripCode(src);
  const pairs = { ')': '(', ']': '[', '}': '{' };
  const stack = [];
  for (const ch of s) {
    if ('([{'.includes(ch)) stack.push(ch);
    else if (pairs[ch]) {
      if (stack.pop() !== pairs[ch]) return false;
    }
  }
  return stack.length === 0;
}

function codeBlocks(text, langs = ['ts', 'typescript', 'tsx', 'js', 'javascript']) {
  const out = [];
  for (const m of text.matchAll(/```([a-z]*)[^\n]*\n([\s\S]*?)```/gi)) {
    if (langs.includes(m[1].toLowerCase())) out.push(m[2]);
  }
  return out;
}

// --------------------------------------------------------------- registry

const ok = (detail = '') => ({ pass: true, detail });
const bad = (detail) => ({ pass: false, detail });

export const CHECK_TYPES = {
  present(ctx, p) {
    const pats = [].concat(p.patterns ?? p.pattern);
    const miss = pats.filter((x) => !rx(x, p.flags).test(ctx.text));
    return miss.length ? bad(`missing: ${miss.join(' ; ')}`) : ok(`${pats.length} pattern(s) found`);
  },

  absent(ctx, p) {
    const pats = [].concat(p.patterns ?? p.pattern);
    const hit = [];
    for (const x of pats) {
      const m = ctx.text.match(rx(x, p.flags));
      if (m) hit.push(`"${m[0].slice(0, 60)}"`);
    }
    return hit.length ? bad(`found: ${hit.join(' ; ')}`) : ok('none found');
  },

  'contains-all'(ctx, p) {
    const vals = (p.values ?? []).map(String);
    const miss = vals.filter((v) => (p.caseSensitive ? !ctx.text.includes(v) : !ctx.text.toLowerCase().includes(v.toLowerCase())));
    return miss.length ? bad(`missing: ${miss.join(' ; ')}`) : ok(`${vals.length} value(s) found`);
  },

  'contains-any'(ctx, p) {
    const vals = (p.values ?? []).map(String);
    const hit = vals.find((v) => ctx.text.toLowerCase().includes(v.toLowerCase()));
    return hit ? ok(`found "${hit}"`) : bad(`none of: ${vals.join(' ; ')}`);
  },

  'sections-present'(ctx, p) {
    const miss = (p.labels ?? []).filter((l) => {
      const label = new RegExp(`^[ \\t>#*\\-]*\\**${esc(l)}\\**\\s*:`, 'im');
      const heading = new RegExp(`^#{1,6}\\s*${esc(l)}\\b`, 'im');
      return !(label.test(ctx.text) || heading.test(ctx.text) || jsonKey(ctx.json, l) !== undefined);
    });
    return miss.length ? bad(`missing section: ${miss.join(' ; ')}`) : ok(`${p.labels.length} section(s) found`);
  },

  'label-in'(ctx, p) {
    const vals = labelValues(ctx, p.label);
    if (!vals.length) return bad(`no "${p.label}:" line`);
    const allowed = p.allowed ?? [];
    const subject = p.all ? vals : [vals[0]];
    const wrong = subject.filter((v) => !pickAllowed(v, allowed));
    return wrong.length ? bad(`"${p.label}" value "${wrong[0].slice(0, 60)}" is not one of: ${allowed.join(' | ')}`) : ok(`${p.label}: ${subject[0].slice(0, 40)}`);
  },

  'label-not-in'(ctx, p) {
    const vals = labelValues(ctx, p.label);
    if (!vals.length) return bad(`no "${p.label}:" line`);
    const hit = pickAllowed(vals[0], [].concat(p.values));
    return hit ? bad(`"${p.label}" is "${hit}", which this scenario forbids`) : ok(`${p.label}: ${vals[0].slice(0, 40)}`);
  },

  count(ctx, p) {
    const flags = p.flags ?? 'gim';
    const n = (ctx.text.match(rx(p.pattern, flags.includes('g') ? flags : flags + 'g')) ?? []).length;
    const min = p.min ?? 0;
    const max = p.max ?? Infinity;
    return n >= min && n <= max ? ok(`${n} match(es)`) : bad(`${n} match(es), want ${min}..${max === Infinity ? 'any' : max}`);
  },

  'near-all'(ctx, p) {
    const window = p.window ?? 400;
    const re = rx(p.pattern, p.flags);
    const fails = [];
    for (const v of p.values ?? []) {
      const idx = occurrences(ctx.text, v);
      const good = idx.some((i) => re.test(cut(ctx.text, i, String(v).length, window)));
      if (!good) fails.push(`${v}${idx.length ? '' : ' (absent)'}`);
    }
    return fails.length ? bad(`no ${re} within ${window} chars of: ${fails.join(' ; ')}`) : ok(`${(p.values ?? []).length} value(s) checked`);
  },

  'not-near-any'(ctx, p) {
    const window = p.window ?? 200;
    const re = rx(p.pattern, p.flags);
    const hits = [];
    for (const v of p.values ?? []) {
      for (const i of occurrences(ctx.text, v)) {
        if (re.test(cut(ctx.text, i, String(v).length, window))) {
          hits.push(v);
          break;
        }
      }
    }
    return hits.length ? bad(`${re} appears near: ${hits.join(' ; ')}`) : ok('none near');
  },

  'numbers-monotone'(ctx, p) {
    const nums = [];
    for (const label of p.labels ?? []) {
      const m = ctx.text.match(new RegExp(`${esc(label)}[^\\d\\n]*?(\\d+(?:\\.\\d+)?)`, 'i'));
      if (!m) return bad(`no number after "${label}"`);
      nums.push(Number(m[1]));
    }
    for (let i = 1; i < nums.length; i++) if (nums[i] < nums[i - 1]) return bad(`not non-decreasing: ${nums.join(' <= ')}`);
    return ok(nums.join(' <= '));
  },

  'buckets-sum'(ctx, p) {
    const num = (re) => {
      const m = ctx.text.match(re);
      return m ? Number(m[1]) : null;
    };
    const parts = {
      A: num(/\bA Design\**\s+(\d+(?:\.\d+)?)/i),
      B: num(/\bB Manual execution\**\s+(\d+(?:\.\d+)?)/i),
      C: num(/\bC Triage\**\s+(\d+(?:\.\d+)?)/i),
      D: num(/\bD Authoring\**\s+(\d+(?:\.\d+)?)/i),
      E: num(/\bE Overhead\**\s*(?:\([^)]*\))?\s*(\d+(?:\.\d+)?)/i),
    };
    const total = num(/\bLikely\**\s+(\d+(?:\.\d+)?)\s*h/i);
    const missing = Object.entries(parts).filter(([, v]) => v === null).map(([k]) => k);
    if (missing.length) return bad(`bucket(s) not found: ${missing.join(', ')}`);
    if (total === null) return bad('no "Likely <n> h" line');
    const sum = Object.values(parts).reduce((a, b) => a + b, 0);
    const tol = p.tolerance ?? 0.6;
    return Math.abs(sum - total) <= tol ? ok(`buckets ${sum.toFixed(1)} h, likely ${total} h`) : bad(`buckets add to ${sum.toFixed(1)} h but Likely is ${total} h`);
  },

  'grounded-ids'(ctx, p) {
    const fixture = (ctx.fixtureText ?? '').toLowerCase();
    const flags = (p.flags ?? 'i').replace('g', '') + 'g';
    const found = [...new Set((ctx.text.match(new RegExp(p.pattern, flags)) ?? []).map((s) => s.toLowerCase()))];
    const ungrounded = found.filter((s) => !fixture.includes(s));
    return ungrounded.length ? bad(`not in the fixture: ${ungrounded.slice(0, 6).join(', ')}`) : ok(`${found.length} id(s), all grounded`);
  },

  'code-balanced'(ctx) {
    const blocks = codeBlocks(ctx.text);
    if (!blocks.length) return bad('no code block');
    const badIdx = blocks.map((b, i) => (balanced(b) ? -1 : i + 1)).filter((i) => i > 0);
    return badIdx.length ? bad(`unbalanced brackets in code block ${badIdx.join(', ')}`) : ok(`${blocks.length} code block(s) balanced`);
  },

  'case-count'(ctx, p) {
    const n = ctx.cases.length;
    const min = p.min ?? 1;
    const max = p.max ?? Infinity;
    return n >= min && n <= max ? ok(`${n} case(s)`) : bad(`${n} case(s) parsed, want ${min}..${max === Infinity ? 'any' : max}`);
  },

  'case-names-charset'(ctx) {
    if (!ctx.cases.length) return bad('no cases parsed (expect "Name:" blocks or a JSON array)');
    const badNames = ctx.cases.map((c) => c.name).filter((n) => !/^[A-Za-z0-9][A-Za-z0-9 ().,_-]*$/.test(n));
    return badNames.length ? bad(`invalid name: "${badNames[0]}"`) : ok(`${ctx.cases.length} name(s) valid`);
  },

  'case-names-unique'(ctx) {
    const seen = new Set();
    for (const c of ctx.cases) {
      const k = c.name.toLowerCase().replace(/\s+/g, ' ');
      if (seen.has(k)) return bad(`duplicate name: "${c.name}"`);
      seen.add(k);
    }
    return ctx.cases.length ? ok('all names unique') : bad('no cases parsed');
  },

  'case-names-not-in'(ctx, p) {
    const existing = new Set((p.titles ?? []).map((t) => String(t).toLowerCase().replace(/\s+/g, ' ')));
    const dup = ctx.cases.find((c) => existing.has(c.name.toLowerCase().replace(/\s+/g, ' ')));
    return dup ? bad(`"${dup.name}" duplicates an existing case`) : ok('no new case repeats an existing title');
  },

  'case-shape'(ctx, p) {
    if (!ctx.cases.length) return bad('no cases parsed');
    const minSteps = p.minSteps ?? 3;
    for (const c of ctx.cases) {
      if (!c.precondition) return bad(`"${c.name}" has no pre-condition`);
      if (c.steps.length < minSteps) return bad(`"${c.name}" has ${c.steps.length} step(s), want at least ${minSteps}`);
      if (!c.steps.some((s) => s.expected)) return bad(`"${c.name}" has no expected result`);
      if (c.steps.some((s) => !s.action)) return bad(`"${c.name}" has an empty step`);
    }
    return ok(`${ctx.cases.length} case(s) have a pre-condition, ${minSteps}+ steps and an expected result`);
  },

  'case-steps-single-action'(ctx) {
    for (const c of ctx.cases) {
      const s = c.steps.find((st) => /\b(and then|then click|then select|then enter)\b|;/i.test(st.action));
      if (s) return bad(`"${c.name}" has a multi-action step: "${s.action.slice(0, 60)}"`);
    }
    return ok('every step holds one action');
  },

  'case-no-vague-expected'(ctx) {
    const vague = /^(works( correctly)?|ok|okay|correct|as expected|page loads|verify everything looks correct|success)\.?$/i;
    for (const c of ctx.cases) {
      const s = c.steps.find((st) => vague.test(st.expected));
      if (s) return bad(`"${c.name}" has a vague expected result: "${s.expected}"`);
    }
    return ok('no vague expected results');
  },

  'case-name-coverage'(ctx, p) {
    const miss = [];
    for (const group of p.groups ?? []) {
      const alts = [].concat(group).map((a) => String(a).toLowerCase());
      const hit = ctx.cases.some((c) => alts.some((a) => `${c.name} ${c.description}`.toLowerCase().includes(a)));
      if (!hit) miss.push(alts[0]);
    }
    return miss.length ? bad(`no case for: ${miss.join(' ; ')}`) : ok(`${(p.groups ?? []).length} condition(s) each have their own case`);
  },

  'cluster-count'(ctx, p) {
    const n = ctx.clusters.length;
    const min = p.min ?? 1;
    const max = p.max ?? Infinity;
    return n >= min && n <= max ? ok(`${n} cluster(s)`) : bad(`${n} cluster(s), want ${min}..${max === Infinity ? 'any' : max}`);
  },

  'cluster-fields'(ctx, p) {
    if (!ctx.clusters.length) return bad('no "Cluster N" blocks');
    const labels = p.labels ?? ['Classification', 'Likely cause', 'Evidence', 'Cases', 'Action'];
    for (const c of ctx.clusters) {
      const miss = labels.filter((l) => !new RegExp(`^[ \\t>*\\-]*\\**${esc(l)}\\**\\s*:\\**[ \\t]*\\S`, 'im').test(c.body));
      if (miss.length) return bad(`${c.title.slice(0, 40)} lacks: ${miss.join(', ')}`);
    }
    return ok(`${ctx.clusters.length} cluster(s) carry every field`);
  },

  'cluster-classification'(ctx, p) {
    const vocab = ['product', 'automation', 'environment'];
    const wrong = [];
    for (const [id, want] of Object.entries(p.map ?? {})) {
      const block = ctx.clusters.find((c) => c.cases.toLowerCase().includes(id.toLowerCase()));
      if (!block) {
        wrong.push(`${id} not in any Cases line`);
        continue;
      }
      const got = pickAllowed(block.classification.toLowerCase(), vocab);
      if (got !== want) wrong.push(`${id}: got "${block.classification.slice(0, 30)}", want ${want}`);
    }
    return wrong.length ? bad(wrong.slice(0, 3).join(' ; ')) : ok(`${Object.keys(p.map ?? {}).length} case(s) classified as expected`);
  },

  'block-contains'(ctx, p) {
    const block = headingBlock(ctx.text, p.heading);
    if (!block) return bad(`no "${p.heading}" block`);
    const miss = (p.ids ?? []).filter((id) => !block.toLowerCase().includes(String(id).toLowerCase()));
    return miss.length ? bad(`"${p.heading}" block lacks: ${miss.join(', ')}`) : ok(`${(p.ids ?? []).length} id(s) listed`);
  },

  'block-excludes'(ctx, p) {
    const leaked = [];
    for (const id of p.ids ?? []) {
      if (ctx.clusters.some((c) => c.cases.toLowerCase().includes(String(id).toLowerCase()))) leaked.push(id);
    }
    return leaked.length ? bad(`forced into a cluster: ${leaked.join(', ')}`) : ok('none forced into a cluster');
  },
};

// ----------------------------------------------------------------- runner

export function buildContext({ text, fixtureText = '', scenario }) {
  let json = null;
  try {
    const t = text.trim();
    if (t.startsWith('{') || t.startsWith('[')) json = JSON.parse(t);
  } catch {
    json = null;
  }
  const ctx = { text, json, fixtureText, scenario, expect: scenario?.expect ?? {} };
  ctx.cases = parseCases(text, json);
  ctx.clusters = parseClusters(text);
  return ctx;
}

export function runChecks(rubric, ctx) {
  const results = [];
  for (const check of rubric.checks) {
    const base = { id: check.id, desc: check.desc ?? '' };
    if (check.when && isEmpty(ctx.expect?.[check.when])) {
      results.push({ ...base, status: 'SKIP', detail: `scenario sets no "${check.when}"` });
      continue;
    }
    const fn = CHECK_TYPES[check.type];
    if (!fn) {
      results.push({ ...base, status: 'FAIL', detail: `unknown check type "${check.type}"` });
      continue;
    }
    try {
      const params = resolveParams(check.params ?? {}, ctx.expect);
      const r = fn(ctx, params);
      results.push({ ...base, status: r.pass ? 'PASS' : 'FAIL', detail: r.detail });
    } catch (e) {
      results.push({ ...base, status: 'FAIL', detail: `check threw: ${e.message}` });
    }
  }
  return results;
}

export function summarize(results) {
  const c = { PASS: 0, FAIL: 0, SKIP: 0 };
  for (const r of results) c[r.status]++;
  return c;
}

