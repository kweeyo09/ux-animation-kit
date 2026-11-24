#!/usr/bin/env node
/*
 * Optional browser smoke test (needs Playwright: `npm i -D playwright` or a global install,
 * plus Chromium/Chrome). Loads the gallery from disk and exercises every demo.
 *   node scripts/smoke-test.js            # uses Playwright's Chromium or system Chrome
 *   CHROME_PATH=/path/to/chrome node scripts/smoke-test.js
 */
'use strict';
const path = require('path');
const fs = require('fs');
let pw;
try { pw = require('playwright'); } catch (e) {
  try { pw = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright'); } catch (e2) {
    console.error('Playwright not found. Install with: npm i -D playwright && npx playwright install chromium'); process.exit(2);
  }
}
const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'gallery', 'index.html');
const SHOTS = path.join(ROOT, 'dist', 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });
const REG = require(path.join(ROOT, 'gallery', 'registry.js'));

const results = [];
function ok(cond, msg) { results.push([!!cond, msg]); if (!cond) console.log('  ✗ ' + msg); return cond; }

async function launch() {
  const exe = process.env.CHROME_PATH || ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(p => fs.existsSync(p));
  try { return await pw.chromium.launch(); } catch (e) { return pw.chromium.launch({ executablePath: exe }); }
}

(async () => {
  const browser = await launch();
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(URL);
  await page.waitForTimeout(400);

  /* structure + coverage */
  ok((await page.textContent('#coverage')).trim() === '20/20 demos', 'coverage badge reads 20/20 demos');
  const cov = await page.evaluate(() => window.UX_COVERAGE);
  ok(cov && cov.mounted === 20 && cov.expected === 20, 'window.UX_COVERAGE reports 20 mounted');
  for (const e of REG) {
    const n = await page.locator(`[id="${e.id}"]`).count();
    ok(n === 1, `${e.id} card exists exactly once`);
    const title = (await page.textContent(`#${e.id}-title`)).replace(/^\d+\.\s*/, '').trim();
    ok(title === e.title, `${e.id} heading is "${e.title}" (got "${title}")`);
    ok(await page.locator(`#${e.id} .demo > *`).count() > 0, `${e.id} demo rendered content`);
    ok(await page.locator(`#${e.id} .demo-error`).count() === 0, `${e.id} has no mount error`);
  }

  /* motion demos: replay advances the timeline; frames view renders */
  for (const e of REG.filter(r => r.family === 'motion')) {
    await page.locator(`#${e.id} button[aria-label^="Replay animation"]`).click();
  }
  await page.waitForTimeout(600);
  for (const e of REG.filter(r => r.family === 'motion')) {
    const v = await page.locator(`#${e.id} .lab`).getAttribute('data-progress');
    ok(Number(v) > 0, `${e.id} Replay advanced the animation (progress=${v})`);
  }
  await page.waitForTimeout(1600);
  for (const e of REG.filter(r => r.family === 'motion')) {
    const bar = await page.locator(`#${e.id} .lab > .controls`).first().locator('button').allTextContents();
    ok(bar.length === 2 && bar[1].trim() === 'Static frames' && bar[0].trim() === '▶', `${e.id} control bar is icon-only Replay + Static frames (${bar.map(b => b.trim()).join(' | ')})`);
    await page.locator(`#${e.id} button:has-text("Static frames")`).click();
    const frames = await page.locator(`#${e.id} .frames:not([hidden]) :is(.frame, .onion-layer)`).count();
    ok(frames >= 10, `${e.id} static frames view shows ${frames} frames`);
    await page.locator(`#${e.id} button:has-text("Static frames")`).click();
  }

  /* every motion demo hands the gallery a controller (needed for autoplay and the record loop) */
  const ctrl = await page.evaluate(() => document.querySelectorAll('.lab').length);
  ok(ctrl >= 12, `motion labs rendered (${ctrl})`);

  /* playground: any principle on any element */
  ok(await page.locator('#playground .pg-chip').count() === 20, 'playground: 20 principle toggles');
  ok(await page.locator('#playground .pg-types button').count() === 4, 'playground: 4 element types');
  const pg = page.locator('#playground');
  const chip = id => pg.locator(`.pg-chip input[value="${id}"]`);
  await pg.locator('[data-none]').click();
  ok((await pg.locator('.pg-code').textContent()) === '483920175264', 'playground ux-16 off: code unchunked');
  ok(await pg.locator('.pg-actions .pg-btn').count() === 6, 'playground ux-15 off: 6 equal actions');
  ok((await pg.locator('.pg-primary').getAttribute('data-act')) === 'regen', 'playground ux-20 off: a rare action is primary');
  ok((await pg.locator('.pg-primary').boundingBox()).height < 30, 'playground ux-13 off: small primary');
  ok(await pg.locator('.pg-el.pg-mixed').count() === 1, 'playground ux-12 off: mixed styles');
  ok((await pg.locator('.pg-interp').textContent()).includes('Invalid'), 'playground ux-18 off: strict date rejects "12 Mar 2026"');
  ok(await pg.locator('.pg-head .pg-close').count() === 0, 'playground ux-19 off: close button not top-right');
  for (const id of ['ux-16', 'ux-15', 'ux-20', 'ux-13', 'ux-12', 'ux-18', 'ux-19', 'ux-14', 'ux-17', 'ux-10']) await chip(id).check();
  ok((await pg.locator('.pg-code').textContent()) === '4839 2017 5264', 'playground ux-16 on: code chunked');
  ok(await pg.locator('.pg-actions .pg-btn').count() === 1, 'playground ux-15 on: one primary + More');
  ok((await pg.locator('.pg-primary').getAttribute('data-act')) === 'copy', 'playground ux-20 on: most-used action is primary');
  ok((await pg.locator('.pg-primary').boundingBox()).height >= 44, 'playground ux-13 on: 44px primary');
  ok(await pg.locator('.pg-el.pg-mixed').count() === 0, 'playground ux-12 on: consistent styles');
  ok((await pg.locator('.pg-interp').textContent()).includes('March 2026'), 'playground ux-18 on: lenient date read back');
  ok(await pg.locator('.pg-head .pg-close').count() === 1, 'playground ux-19 on: close top-right');
  ok(await pg.evaluate(el => getComputedStyle(el.querySelector('.pg-close'), '::before').width) === '44px', 'playground ux-14 on: 44px hit area on 16px icon');
  await pg.locator('.pg-primary').click();
  await page.waitForTimeout(60);
  ok((await pg.locator('.pg-primary').textContent()).includes('Copying'), 'playground ux-17 on: instant acknowledgement');
  await pg.locator('[data-error]').click();
  ok(await pg.locator('.pg-err:not([hidden])').count() === 1, 'playground ux-10 on: error message shown');
  for (const t of ['Button', 'Dialog', 'Toast', 'Card']) {
    await pg.locator('.pg-types button', { hasText: t }).click();
    ok(await pg.locator('.pg-el.pg-' + t.toLowerCase()).count() === 1, `playground renders ${t}`);
  }
  await pg.locator('[data-all]').click();
  await page.waitForTimeout(400);
  ok((await pg.locator('.pg-spec pre').textContent()).split('\n').filter(l => /^ux-\d\d/.test(l)).length === 20, 'playground spec lists all 20 when all on');
  await pg.screenshot({ path: path.join(SHOTS, 'playground.png') });

  /* ux-13 Fitts */
  await page.click('#ux-13 button:has-text("small")');
  await page.click('#ux-13 .f-start'); await page.waitForTimeout(150); await page.click('#ux-13 .f-target');
  await page.click('#ux-13 button:has-text("big")');
  await page.click('#ux-13 .f-start'); await page.waitForTimeout(150); await page.click('#ux-13 .f-target');
  ok(await page.locator('#ux-13 .trials tbody tr').count() === 2, 'ux-13 records two Fitts trials');
  ok(await page.locator('#ux-13 .plot circle').count() === 2, 'ux-13 plots two points');

  /* ux-14 hit areas: click target icon in each toolbar; click just outside a 16px icon in the "after" panel */
  for (const side of [0, 1]) {
    const panel = page.locator('#ux-14 .panel').nth(side);
    await panel.locator('.icon-btn.is-target').click();
    ok((await panel.locator('.readout').textContent()).includes('Hits 1'), `ux-14 panel ${side} registers a hit`);
  }
  const afterPanel = page.locator('#ux-14 .panel').nth(1);
  const tgt = afterPanel.locator('.icon-btn.is-target');
  const box = await tgt.boundingBox();
  await page.mouse.click(box.x + box.width / 2 + 16, box.y + box.height / 2); // 16px right of centre: outside icon, inside 44px area
  ok((await afterPanel.locator('.readout').textContent()).includes('Hits 2'), 'ux-14 invisible 44px hit area catches an off-icon click');
  const beforePanel = page.locator('#ux-14 .panel').nth(0);
  const tb = await beforePanel.locator('.icon-btn.is-target').boundingBox();
  await page.mouse.click(tb.x + tb.width / 2 + 16, tb.y + tb.height / 2);
  ok((await beforePanel.locator('.readout').textContent()).includes('misses 1'), 'ux-14 same off-icon click misses the 16px area');

  /* ux-15 Hick */
  for (const side of [0, 1]) {
    const panel = page.locator('#ux-15 .panel').nth(side);
    await panel.locator('button:has-text("Start trial")').click();
    const goal = (await panel.locator('.task strong').textContent()).trim();
    await panel.locator('button.opt', { hasText: goal }).first().click();
    ok((await panel.locator('.readout').textContent()).includes('Found'), `ux-15 panel ${side} completes a trial`);
  }
  ok(await page.locator('#ux-15 .panel').nth(0).locator('button.opt').count() === 0, 'ux-15 clears options after the trial');

  /* ux-16 Miller */
  for (const side of [0, 1]) {
    const panel = page.locator('#ux-16 .panel').nth(side);
    await panel.locator('button:has-text("Show code")').click();
    const code = (await panel.locator('.code').textContent()).replace(/\D/g, '');
    ok(code.length === 12, `ux-16 panel ${side} shows a 12-digit code`);
    ok(side === 0 ? !/\s/.test(await panel.locator('.code').textContent()) : /\d{4} \d{4} \d{4}/.test(await panel.locator('.code').textContent()), `ux-16 panel ${side} ${side ? 'chunks' : 'does not chunk'} the code`);
    await panel.locator('button:has-text("Hide now")').click();
    await panel.locator('input').fill(code.replace(/(\d{4})/g, '$1-'));
    await panel.locator('button:has-text("Check")').click();
    ok((await panel.locator('.readout').textContent()).includes('12/12'), `ux-16 panel ${side} scores 12/12 for correct recall`);
  }

  /* ux-17 Doherty */
  await page.locator('#ux-17 input[type=range]').fill('900');
  await page.locator('#ux-17 .panel').nth(0).locator('.save-btn').click();
  await page.locator('#ux-17 .panel').nth(1).locator('.save-btn').click();
  await page.waitForTimeout(150);
  ok((await page.locator('#ux-17 .panel').nth(1).locator('.readout').textContent()).includes('Acknowledged'), 'ux-17 "after" acknowledges instantly');
  ok(await page.locator('#ux-17 .panel').nth(1).locator('.skeleton').count() === 1, 'ux-17 "after" shows a skeleton');
  ok((await page.locator('#ux-17 .panel').nth(0).locator('.readout').textContent()).includes('Click Save'), 'ux-17 "before" shows no feedback yet');
  await page.waitForTimeout(1000);
  const t17 = await page.locator('#ux-17 .panel').nth(0).locator('.readout').textContent();
  ok(/First feedback: \d+ms/.test(t17) && Number(t17.match(/First feedback: (\d+)/)[1]) >= 850, `ux-17 "before" first feedback ≈ latency (${t17.trim()})`);

  /* ux-18 Postel */
  const chips = page.locator('#ux-18 .chips button');
  const nChips = await chips.count();
  for (let i = 0; i < nChips; i++) await chips.nth(i).click();
  const tally = await page.textContent('#ux-18 .compare + .readout');
  const m = tally.match(/strict accepted (\d+) · lenient accepted (\d+)/);
  ok(m && Number(m[2]) === nChips && Number(m[1]) < Number(m[2]), `ux-18 lenient accepts all ${nChips} samples, strict fewer (${tally.trim()})`);
  ok((await page.locator('#ux-18 .panel').nth(1).locator('.interp').textContent()).includes('April'), 'ux-18 shows the interpretation of an ambiguous date (03/04 → April)');

  /* ux-19 Jakob */
  for (const side of [0, 1]) {
    const panel = page.locator('#ux-19 .panel').nth(side);
    await panel.locator('button:has-text("Start task")').click();
    const goal = (await panel.locator('.task strong').textContent()).trim();
    const role = goal.includes('cart') ? 'cart' : goal.includes('Search') ? 'search' : 'home';
    await panel.locator(`.site button[data-r="${role}"]`).click();
    ok((await panel.locator('.readout').textContent()).includes('Done in'), `ux-19 panel ${side} completes "${goal}"`);
  }

  /* ux-20 Frequency of use */
  const before20 = page.locator('#ux-20 .panel').nth(0), after20 = page.locator('#ux-20 .panel').nth(1);
  for (let i = 0; i < 5; i++) {
    await before20.locator('.msg').nth(i).locator('button[aria-haspopup]').click();
    await before20.locator('.msg').nth(i).locator('[role=menuitem]:has-text("Reply")').click();
    await after20.locator('.msg').nth(i).locator('button:has-text("Reply")').click();
  }
  const b20 = await before20.locator('.readout').textContent(), a20 = await after20.locator('.readout').textContent();
  ok(/All replied: 10 clicks/.test(b20), `ux-20 buried Reply takes 10 clicks (${b20.trim()})`);
  ok(/All replied: 5 clicks/.test(a20), `ux-20 promoted Reply takes 5 clicks (${a20.trim()})`);

  /* keyboard: n / p navigation and visible focus */
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('n');
  ok(await page.evaluate(() => document.activeElement && document.activeElement.id === 'ux-01-title'), 'n moves focus to the first demo heading');
  await page.keyboard.press('n');
  ok(await page.evaluate(() => document.activeElement.id === 'ux-02-title'), 'n again moves to ux-02');
  await page.keyboard.press('p');
  ok(await page.evaluate(() => document.activeElement.id === 'ux-01-title'), 'p moves back to ux-01');
  await page.keyboard.press('Tab');
  const focusShadow = await page.evaluate(() => getComputedStyle(document.activeElement).boxShadow);
  ok(focusShadow && focusShadow !== 'none', 'Tab-focused control has a visible focus ring');
  const unnamed = await page.evaluate(() => Array.from(document.querySelectorAll('button, input, select')).filter(el => {
    if (el.closest('[aria-hidden="true"]') || el.closest('[hidden]')) return false;
    const name = (el.getAttribute('aria-label') || el.textContent || '').trim() || (el.labels && el.labels.length && el.labels[0].textContent.trim()) || el.getAttribute('aria-labelledby');
    return !name;
  }).map(el => el.outerHTML.slice(0, 80)));
  ok(unnamed.length === 0, `all visible controls have accessible names (${unnamed.length} unnamed${unnamed.length ? ': ' + unnamed.slice(0, 3).join(' | ') : ''})`);

  /* filter */
  await page.click('#filter button[data-v="ux"]');
  ok(await page.locator('.card:not([hidden])').count() === 8, 'filter "UX laws" shows 8 cards');
  await page.click('#filter button[data-v="all"]');
  ok(await page.locator('.card:not([hidden])').count() === 20, 'filter "All" shows 20 cards');

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(SHOTS, 'desktop-full.png'), fullPage: true });
  for (const id of ['ux-01', 'ux-04', 'ux-07', 'ux-13', 'ux-14', 'ux-20']) await page.locator('#' + id).screenshot({ path: path.join(SHOTS, id + '.png') });

  /* reduced motion */
  const rctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, reducedMotion: 'reduce' });
  const rp = await rctx.newPage();
  rp.on('pageerror', e => errors.push('reduced pageerror: ' + e.message));
  await rp.goto(URL); await rp.waitForTimeout(400);
  ok(await rp.evaluate(() => document.documentElement.dataset.reduced) === 'true', 'prefers-reduced-motion sets data-reduced=true');
  for (const e of REG.filter(r => r.family === 'motion')) {
    ok(await rp.locator(`#${e.id} .frames:not([hidden]) :is(.frame, .onion-layer)`).count() >= 10, `${e.id} opens on static frames under reduced motion`);
    ok(await rp.locator(`#${e.id} .lanes[hidden]`).count() === 1, `${e.id} live lanes hidden under reduced motion (no autoplay)`);
  }
  for (const id of ['ux-05', 'ux-06', 'ux-07', 'ux-11']) await rp.locator('#' + id).screenshot({ path: path.join(SHOTS, id + '-reduced-frames.png') });
  await rp.click('#motion-pref button[data-v="full"]');
  ok(await rp.evaluate(() => document.documentElement.dataset.reduced) === 'false', '"Full" overrides the system reduced-motion preference');

  /* mobile */
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mp = await mctx.newPage();
  mp.on('pageerror', e => errors.push('mobile pageerror: ' + e.message));
  await mp.goto(URL); await mp.waitForTimeout(400);
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(overflow <= 1, `mobile: no horizontal page overflow (${overflow}px)`);
  ok(await mp.locator('#jump').isVisible(), 'mobile: jump-to menu replaces the sidebar');
  await mp.screenshot({ path: path.join(SHOTS, 'mobile-top.png') });
  await mp.locator('#ux-14').screenshot({ path: path.join(SHOTS, 'mobile-ux-14.png') });

  /* record view: just the 20 boxes on beige, motion looping */
  const rec = await (await browser.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  rec.on('pageerror', e => errors.push('record pageerror: ' + e.message));
  await rec.goto('file://' + path.join(ROOT, 'gallery', 'record.html'));
  await rec.waitForTimeout(500);
  ok(await rec.locator('.card').count() === 20, 'record: 20 boxes');
  ok(await rec.evaluate(() => getComputedStyle(document.body).backgroundColor) === 'rgb(241, 234, 220)', 'record: beige background');
  const visibleText = await rec.evaluate(() => Array.from(document.querySelectorAll('.summary, .card-id, .tag, .label-note, .group-title, header, nav, .lab > .controls, .demo > .controls, .demo > .readout, .lab > .readout')).filter(e => e.offsetParent !== null).length);
  ok(visibleText === 0, `record: no descriptive text, chrome or control bars visible (${visibleText})`);
  const loopA = await rec.locator('#ux-01 .lab').getAttribute('data-progress');
  await rec.waitForTimeout(2600);
  const loopB = await rec.locator('#ux-01 .lab').getAttribute('data-progress');
  await rec.waitForTimeout(700);
  const loopC = await rec.locator('#ux-01 .lab').getAttribute('data-progress');
  ok(new Set([loopA, loopB, loopC]).size > 1, `record: motion demos loop (${loopA}, ${loopB}, ${loopC})`);
  const moving = new Set();
  for (let k = 0; k < 4; k++) {
    (await rec.evaluate(() => Array.from(document.querySelectorAll('.card')).filter(c => { const l = c.querySelector('.lab'); return l && Number(l.dataset.progress) > 0; }).map(c => c.id))).forEach(id => moving.add(id));
    await rec.waitForTimeout(500);
  }
  ok(moving.size === 12, `record: all 12 motion demos are playing (${moving.size})`);
  await rec.screenshot({ path: path.join(SHOTS, 'record-view.png') });

  ok(errors.length === 0, `no page or console errors (${errors.length}${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''})`);
  await browser.close();

  const failed = results.filter(r => !r[0]);
  console.log(`\nBrowser smoke test: ${results.length - failed.length}/${results.length} assertions passed`);
  console.log('Screenshots: ' + path.relative(process.cwd(), SHOTS));
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
