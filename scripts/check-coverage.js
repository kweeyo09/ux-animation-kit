#!/usr/bin/env node
/*
 * Coverage check for the UX & Animation kit. No dependencies (Node 16+).
 *  - The shared registry (gallery/registry.js) holds exactly the 20 expected principles,
 *    in order, with IDs ux-01..ux-20, each appearing exactly once.
 *  - Every ID maps to its own demo implementation in gallery/demos.js, with no extra or
 *    shared mount functions.
 *  - The gallery shell loads registry → demos → app and has a coverage counter.
 *  - The Skill has valid frontmatter, and its reference covers all 20 principles in
 *    registry order, each with the four required parts.
 * Exit code 0 = pass, 1 = fail.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const GALLERY = path.join(ROOT, 'gallery');
const SKILL = path.join(ROOT, 'skill', 'ux-animation-principles');

const EXPECTED = [
  'Squash & stretch', 'Anticipation wind-up', 'Staging the focus', 'Pose to pose', 'Follow through',
  'Slow in & slow out', 'Moving in arcs', 'Secondary action', 'Snappy timing', 'Exaggerated feedback',
  'Solid drawing in 3D', 'Overall appeal', "Fitts's law", 'Bigger hit areas', "Hick's law",
  "Miller's law", 'Doherty threshold', "Postel's law", "Jakob's law", 'Frequency of use'
];
const EXPECTED_IDS = EXPECTED.map((_, i) => 'ux-' + String(i + 1).padStart(2, '0'));

const failures = [];
const passes = [];
function check(ok, msg) { (ok ? passes : failures).push(msg); return ok; }

/* ---------- registry ---------- */
const REG = require(path.join(GALLERY, 'registry.js'));
check(Array.isArray(REG), 'registry exports an array');
check(REG.length === 20, `registry has 20 entries (found ${REG.length})`);
const ids = REG.map(e => e.id);
EXPECTED_IDS.forEach((id, i) => {
  const count = ids.filter(x => x === id).length;
  check(count === 1, `${id} appears exactly once in registry (found ${count})`);
  const e = REG[i] || {};
  check(e.id === id, `position ${i + 1} is ${id} (found ${e.id})`);
  check(e.title === EXPECTED[i], `${id} title is "${EXPECTED[i]}" (found "${e.title}")`);
  check(e.num === i + 1, `${id} num is ${i + 1}`);
  check(typeof e.summary === 'string' && e.summary.length > 20, `${id} has a short explanation`);
  check(typeof e.notice === 'string' && e.notice.length > 20, `${id} has a "what to notice" cue`);
  check(e.family === (i < 12 ? 'motion' : 'ux'), `${id} family is ${i < 12 ? 'motion' : 'ux'}`);
});
check(new Set(REG.map(e => e.title)).size === REG.length, 'registry titles are unique');
check(!!(REG[19] && REG[19].labelNote), 'ux-20 carries the unverified-label note');

/* ---------- demos ---------- */
const { DEMOS } = require(path.join(GALLERY, 'demos.js'));
const demoIds = Object.keys(DEMOS).sort();
check(JSON.stringify(demoIds) === JSON.stringify(EXPECTED_IDS), `demos.js registers exactly ux-01..ux-20 (found ${demoIds.length}: ${demoIds.join(', ')})`);
const mounts = new Set();
EXPECTED_IDS.forEach(id => {
  const d = DEMOS[id];
  check(!!d && typeof d.mount === 'function', `${id} has a mount() implementation`);
  if (d) { check(!mounts.has(d.mount), `${id} has its own mount function (not shared)`); mounts.add(d.mount); }
});
const demoSrc = fs.readFileSync(path.join(GALLERY, 'demos.js'), 'utf8');
EXPECTED_IDS.forEach(id => {
  const n = (demoSrc.match(new RegExp(`register\\('${id}'`, 'g')) || []).length;
  check(n === 1, `${id} registered exactly once in source (found ${n})`);
});

/* ---------- gallery shell ---------- */
const html = fs.readFileSync(path.join(GALLERY, 'index.html'), 'utf8');
const order = ['registry.js', 'demos.js', 'app.js'].map(f => html.indexOf(`src="${f}"`));
check(order.every(i => i > 0) && order[0] < order[1] && order[1] < order[2], 'index.html loads registry.js → demos.js → app.js');
check(/id="coverage"/.test(html), 'index.html has the coverage counter');
check(!/(src|href)="https?:\/\//.test(html), 'index.html loads no remote assets');
['styles.css', 'registry.js', 'demos.js', 'app.js'].forEach(f => check(fs.existsSync(path.join(GALLERY, f)), `gallery/${f} exists`));

/* ---------- skill ---------- */
const skillMd = fs.readFileSync(path.join(SKILL, 'SKILL.md'), 'utf8');
const fm = /^---\n([\s\S]*?)\n---\n/.exec(skillMd);
check(!!fm, 'SKILL.md starts with YAML frontmatter');
if (fm) {
  const lines = fm[1].split('\n');
  const get = k => { const l = lines.find(x => x.startsWith(k + ':')); return l ? l.slice(k.length + 1).trim() : null; };
  const name = get('name'), desc = get('description');
  check(name === path.basename(SKILL), `frontmatter name matches folder (${name})`);
  check(/^[a-z0-9-]{1,64}$/.test(name || ''), 'name is lowercase letters, digits and hyphens, ≤ 64 chars');
  check(!!desc && desc.length <= 1024, `description present and ≤ 1024 chars (${desc ? desc.length : 0})`);
  check(!!desc && !/[<>]/.test(desc), 'description has no angle brackets');
  check(lines.every(l => /^[a-z_-]+:\s/.test(l)), 'frontmatter lines are simple key: value pairs');
}
EXPECTED_IDS.forEach((id, i) => {
  check(skillMd.includes(`| ${id} | ${EXPECTED[i]} |`), `SKILL.md index lists ${id} ${EXPECTED[i]}`);
});
const ref = fs.readFileSync(path.join(SKILL, 'references', 'principles.md'), 'utf8');
const heads = [...ref.matchAll(/^## (ux-\d\d) — (.+)$/gm)].map(m => ({ id: m[1], title: m[2].trim(), index: m.index }));
check(heads.length === 20, `principles.md has 20 principle sections (found ${heads.length})`);
heads.forEach((h, i) => {
  check(h.id === EXPECTED_IDS[i] && h.title === EXPECTED[i], `principles.md section ${i + 1} is ${EXPECTED_IDS[i]} ${EXPECTED[i]} (found ${h.id} ${h.title})`);
  const body = ref.slice(h.index, heads[i + 1] ? heads[i + 1].index : undefined);
  ['**What it does.**', '**When to use.**', '**How to implement.**', '**Common pitfall.**'].forEach(part =>
    check(body.includes(part), `${h.id} reference includes ${part.replace(/\*/g, '')}`));
});
check(fs.existsSync(path.join(SKILL, 'references', 'accessibility-performance.md')), 'accessibility/performance reference exists');

/* ---------- report ---------- */
console.log('\nUX & Animation kit: coverage check\n');
console.log('ID     Principle               Registry  Demo  Reference');
EXPECTED_IDS.forEach((id, i) => {
  const r = REG.filter(e => e.id === id).length === 1 && REG[i] && REG[i].title === EXPECTED[i];
  const d = !!(DEMOS[id] && typeof DEMOS[id].mount === 'function');
  const s = !!heads.find(h => h.id === id && h.title === EXPECTED[i]);
  console.log(`${id}  ${EXPECTED[i].padEnd(22)}  ${r ? 'ok' : 'FAIL'}       ${d ? 'ok' : 'FAIL'}   ${s ? 'ok' : 'FAIL'}`);
});
const covered = EXPECTED_IDS.filter((id, i) => REG[i] && REG[i].id === id && DEMOS[id] && heads[i] && heads[i].id === id).length;
console.log(`\nCoverage: ${covered}/20 · checks passed: ${passes.length} · failed: ${failures.length}`);
if (failures.length) { console.log('\nFailures:'); failures.forEach(f => console.log('  ✗ ' + f)); process.exit(1); }
console.log('All checks passed.');
