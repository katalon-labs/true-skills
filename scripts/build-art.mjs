#!/usr/bin/env node
// Builds the animated ASCII README art in docs/images/art/.
// Each piece is a list of pure-ASCII frames. Frames swap with CSS keyframes
// (hard cuts, no tweens). Reduced motion, or a viewer that ignores the
// animation, sees the static frame (the last one, which carries the full picture).
// Text wrapped in backticks renders in the muted label color.
//
//   node scripts/build-art.mjs
import { readdirSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'docs', 'images', 'art');
const N = readdirSync(join(root, 'skills')).filter((d) =>
  statSync(join(root, 'skills', d)).isDirectory()).length;

const STEP = 0.6; // seconds per frame
const HOLD = 1.4; // seconds on the last frame

const PIECES = {
  hero: {
    maxFs: 24,
    label: 'An agent guesses at requirement CEL-6, gets the skills folder, connects to the Katalon MCP, and returns linked cases',
    frames: [
      "`true-skills`\n\n  [ agent ]    CEL-6 ?\n    (o_o)      guessing...",
      "`true-skills`\n\n  [ agent ] <-- skills/ (" + N + ")\n    (o_o)",
      "`true-skills`\n\n  [ agent ] <-- skills/ (" + N + ")\n    (o_o)   --> katalon mcp",
      "`true-skills`\n\n  [ agent ] <-- skills/ (" + N + ")\n    (^_^)   --> katalon mcp --> [ CEL-6 ]\n                                12 cases, linked\n                                `(0 guessed)`",
    ],
  },
  install: {
    label: 'A terminal types npx skills add katalon-labs/true-skills and installs the skills',
    frames: [
      '$ npx skills add _',
      '$ npx skills add katalon-labs/_',
      '$ npx skills add katalon-labs/true-skills\n`> detected: claude-code codex cursor kiro`',
      '$ npx skills add katalon-labs/true-skills\n`> detected: claude-code codex cursor kiro`\n> ' + N + ' skills installed  [ ok ]',
    ],
  },
  lifecycle: {
    label: 'A marker walks the seven lifecycle stages, then maintenance sends a gap list back to planning',
    frames: (() => {
      const line = '[plan]-[design]-[manage]-[review]-[run]-[analyze]-[maint]';
      const stops = [
        ['[plan]', 'test-plan'],
        ['[design]', 'create-test-cases'],
        ['[manage]', 'test-management'],
        ['[review]', 'test-review'],
        ['[run]', 'execute-test'],
        ['[analyze]', 'release-analyze'],
        ['[maint]', 'test-maintenance'],
      ];
      const frames = stops.map(([stop, skill]) => {
        const col = line.indexOf(stop) + Math.floor(stop.length / 2);
        const marker = ' '.repeat(col) + '^';
        const start = Math.max(0, Math.min(col - Math.floor(skill.length / 2), line.length - skill.length));
        const name = ' '.repeat(start) + '`' + skill + '`';
        return line + '\n' + marker + '\n' + name;
      });
      const a = line.indexOf('[plan]') + 3;
      const b = line.indexOf('[maint]') + 3;
      // Loop arrow: maint drops down, runs left along the bottom, rises into plan.
      const rise = ' '.repeat(a) + '^' + ' '.repeat(b - a - 1) + '|';
      const mid = ('-<' + '-'.repeat(b - a - 5) + '<-').split('');
      const label = ' gaps back to plan ';
      const cut = Math.floor((mid.length - label.length) / 2);
      mid.splice(cut, label.length, ...label);
      const back = ' '.repeat(a) + '+' + mid.join('') + '+';
      frames.push(line + '\n' + rise + '\n' + back);
      return frames;
    })(),
  },
  connect: {
    label: 'The agent calls the Katalon MCP, signs in through the browser, picks a workspace, and gets the tools',
    frames: [
      '[agent] --> /mcp\n            401 ?',
      '[agent] --> /mcp\n            [ browser: sign in ]\n            pick workspace: [v]',
      '[agent] <-- oauth\n            `no keys to paste`',
      '[agent] <-- tools\n            `platform.katalon.io/mcp`\n            connected  [ ok ]',
    ],
  },
  library: {
    label: 'The skills folder fills row by row, then fans out to every agent adapter from one source',
    frames: [
      'skills/\n  platform-setup      [ ]',
      'skills/\n  platform-setup      [x]\n  test-plan           [ ]',
      'skills/\n  platform-setup      [x]\n  test-plan           [x]\n  create-test-cases   [ ]',
      'skills/   `' + N + ' folders, one SKILL.md each`\n  platform-setup      [x]\n  test-plan           [x]\n  create-test-cases   [x]\n  `... +' + (N - 3) + '`',
      // The tree stays put; the 0.5.0 adapter targets (scripts/build-adapters.mjs) accumulate
      // to its right over two frames. The last line notes the six retired rule folders.
      'skills/                   --> .agents/skills\n  platform-setup      [x] --> claude plugin\n  test-plan           [x] --> .kiro/skills\n  create-test-cases   [x]\n  `... +' + (N - 3) + '`',
      'skills/                   --> .agents/skills   .continue\n  platform-setup      [x] --> claude plugin    AGENTS.md\n  test-plan           [x] --> .kiro/skills     .codex\n  create-test-cases   [x] --> .cline/skills    kiro crew app\n  `... +' + (N - 3) + '`' + ' '.repeat(Math.max(1, 45 - ('... +' + (N - 3)).length)) + 'chatgpt/\n\n  `' + N + ' skills, 1 source  (6 old rule folders retired, -1.6 MB)`',
    ],
  },
};

const THEMES = {
  light: { bg: '#f6f8f7', border: '#e2e7e4', art: '#0f8461', muted: '#5b6661' },
  dark: { bg: '#0f1513', border: '#24302b', art: '#3fc495', muted: '#93a29b' },
};

const FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', 'DejaVu Sans Mono', monospace";
const W = 830;
const PAD_X = 40;
const PAD_Y = 30;
const CHAR_W = 0.602; // advance width of a monospace cell, in em
const LINE_H = 1.45;

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const visible = (s) => s.replace(/`/g, '');

function normalize(frames) {
  const split = frames.map((f) => f.split('\n'));
  const h = Math.max(...split.map((l) => l.length));
  const w = Math.max(...split.flat().map((l) => visible(l).length));
  return { lines: split.map((l) => [...l, ...Array(h - l.length).fill('')]), h, w };
}

function renderLine(line) {
  // Backtick spans become muted tspans; the rest inherits the art color.
  const parts = line.split('`');
  return parts.map((p, i) => (i % 2 ? `<tspan class="m">${esc(p)}</tspan>` : esc(p))).join('');
}

function build(name, piece, theme) {
  const t = THEMES[theme];
  const { lines, h, w } = normalize(piece.frames);
  const n = lines.length;
  const fs = Math.min(piece.maxFs || 20, Math.floor(((W - 2 * PAD_X) / (w * CHAR_W)) * 10) / 10);
  const lh = fs * LINE_H;
  // Card height: padding plus line boxes, with the last line trimmed to glyph height
  // so the space above the first cap and below the last descender match.
  const H = Math.round(2 * PAD_Y + (h - 1) * lh + fs * 1.05);
  const x = Math.round((W - w * fs * CHAR_W) / 2);
  const y0 = PAD_Y + fs * 0.82;
  const total = STEP * (n - 1) + HOLD;
  const pct = (s) => +((s / total) * 100).toFixed(3);

  let kf = '';
  for (let k = 0; k < n; k++) {
    const s = pct(k * STEP);
    const e = k === n - 1 ? 100 : pct((k + 1) * STEP);
    const stops = [];
    if (s > 0) stops.push('0%{opacity:0}');
    stops.push(`${s}%{opacity:1}`);
    if (e < 100) stops.push(`${e}%{opacity:0}`, '100%{opacity:0}');
    else stops.push('100%{opacity:1}');
    kf += `@keyframes f${k}{${stops.join('')}}\n.f${k}{animation-name:f${k}}\n`;
  }

  const groups = lines.map((frame, k) => {
    const texts = frame
      .map((l, i) => (l ? `<text x="${x}" y="${(y0 + i * lh).toFixed(1)}" xml:space="preserve">${renderLine(l)}</text>` : ''))
      .filter(Boolean)
      .join('');
    return `<g class="fr f${k}">${texts}</g>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(piece.label)}">
<title>${esc(piece.label)}</title>
<style>
text{font-family:${FONT};font-size:${fs}px;fill:${t.art}}
.m{fill:${t.muted}}
.fr{opacity:0}
.f${n - 1}{opacity:1}
@media (prefers-reduced-motion: no-preference){
.fr{animation-duration:${total.toFixed(2)}s;animation-timing-function:step-end;animation-iteration-count:infinite;animation-fill-mode:both}
${kf}}
@media (prefers-reduced-motion: reduce){.fr{animation:none;opacity:0}.f${n - 1}{opacity:1}}
</style>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="${t.bg}" stroke="${t.border}"/>
${groups.join('\n')}
</svg>
`;
}

mkdirSync(outDir, { recursive: true });
const report = [];
for (const [name, piece] of Object.entries(PIECES)) {
  for (const f of piece.frames) {
    if (/[^\x00-\x7F]/.test(f)) throw new Error(`${name}: non-ASCII character in a frame`);
  }
  for (const theme of Object.keys(THEMES)) {
    const svg = build(name, piece, theme);
    if (svg.length > 60 * 1024) throw new Error(`${name}-${theme}.svg is over 60 KB`);
    writeFileSync(join(outDir, `${name}-${theme}.svg`), svg);
  }
  const n = piece.frames.length;
  report.push(`${name}\t${n}\t${(STEP * (n - 1) + HOLD).toFixed(2)}`);
}
console.log(report.join('\n'));
