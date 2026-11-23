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
    ok((await page.textContent(`#${e.id} .notice`)).includes('What to notice'), `${e.id} has a what-to-notice cue`);
  }

  /* motion demos: replay advances the timeline; frames view renders */
  for (const e of REG.filter(r => r.family === 'motion')) {
    await page.locator(`#${e.id} button:has-text("Replay")`).click();
  }
  await page.waitForTimeout(600);
  for (const e of REG.filter(r => r.family === 'motion')) {
    const v = await page.locator(`#${e.id} .scrub input`).inputValue();
    ok(Number(v) > 0, `${e.id} Replay advanced the timeline (scrub=${v})`);
  }
  await page.waitForTimeout(1600);
  for (const e of REG.filter(r => r.family === 'motion')) {
    await page.locator(`#${e.id} .scrub input`).fill('500');
    const lbl = await page.textContent(`#${e.id} .step-label`);
    ok(/^\d+ \/ \d+ms$/.test(lbl.trim()) && !lbl.startsWith('0 /'), `${e.id} scrubber seeks (${lbl.trim()})`);
    await page.locator(`#${e.id} button[aria-label="Next step"]`).click();
    await page.locator(`#${e.id} button:has-text("Static frames")`).click();
    const frames = await page.locator(`#${e.id} .frames:not([hidden]) :is(.frame, .onion-layer)`).count();
    ok(frames >= 10, `${e.id} static frames view shows ${frames} frames`);
    await page.locator(`#${e.id} button:has-text("Static frames")`).click();
  }

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

  ok(errors.length === 0, `no page or console errors (${errors.length}${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''})`);
  await browser.close();

  const failed = results.filter(r => !r[0]);
  console.log(`\nBrowser smoke test: ${results.length - failed.length}/${results.length} assertions passed`);
  console.log('Screenshots: ' + path.relative(process.cwd(), SHOTS));
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
