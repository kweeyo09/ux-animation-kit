/*
 * Element playground: pick an element (button, card, dialog, toast) and switch any of
 * the 20 principles on or off. Every principle changes something visible on every
 * element. Uses the shared registry for names and order; nothing runs at load time,
 * so scripts/check-coverage.js can load this file in Node.
 */
(function (root) {
  'use strict';

  /* one line per principle: the change it makes on any element (mirrors the Skill's
   * references/element-recipes.md table) */
  var SPEC = {
    'ux-01': 'Press: compress to scale(1.06, .9) and rebound; land with a small squash on entry.',
    'ux-02': 'Enter: dip 12px the opposite way for the first 20% of the duration, then go.',
    'ux-03': 'Enter: dim the page with a scrim first, keep everything else still, then bring the element in.',
    'ux-04': 'Enter: three explicit poses (start, overshoot, rest) with fixed offsets; interpolate between them.',
    'ux-05': 'Enter: container stops first; header, body and actions arrive 40ms apart with a 3px overshoot.',
    'ux-06': 'Enter: ease-out cubic-bezier(0, 0, .2, 1); exit ease-in. Never linear for position.',
    'ux-07': 'Enter: travel on a curve (x linear, y eased) instead of a straight diagonal.',
    'ux-08': 'Feedback: after success, a check pops and particles burst 60ms after the main change.',
    'ux-09': 'Timing: 240ms entry, 80ms press, 180ms feedback (instead of 700ms).',
    'ux-10': 'Feedback: on error, shake ±10px, red border, icon and a written message.',
    'ux-11': 'Enter: rotateX(28deg) → 0 in 900px perspective, shadow grows as it lifts; hover tilts.',
    'ux-12': 'All parts share one radius, one easing and one duration scale.',
    'ux-13': 'Placement & size: primary action 44px tall and full-width at the bottom (instead of a 24px chip).',
    'ux-14': 'Placement & size: icon buttons stay 16px visually; hit area grows to 44 × 44px.',
    'ux-15': 'Actions: one primary + "More" (5 rarer actions hidden), instead of 6 equal buttons.',
    'ux-16': 'Content: code shown as 3 chunks of 4 digits (4839 2017 5264).',
    'ux-17': 'Feedback: spinner in the button within one frame of the press; result follows after the server.',
    'ux-18': 'Content: date field accepts "12 Mar 2026", "2026-03-12", "tomorrow"… and shows how it read it.',
    'ux-19': 'Placement: close × top-right, primary action right-most, familiar icons with labels.',
    'ux-20': 'Actions: the most-used action ("Copy code") is the primary; rarely used ones move to "More".'
  };

  var ACTIONS = [
    { id: 'copy', label: 'Copy code', freq: 1 },
    { id: 'share', label: 'Share link', freq: 2 },
    { id: 'email', label: 'Email', freq: 3 },
    { id: 'qr', label: 'QR code', freq: 4 },
    { id: 'regen', label: 'Regenerate', freq: 5 },
    { id: 'revoke', label: 'Revoke', freq: 6 }
  ];
  var TYPES = [
    { id: 'button', label: 'Button' },
    { id: 'card', label: 'Card' },
    { id: 'dialog', label: 'Dialog' },
    { id: 'toast', label: 'Toast' }
  ];
  var CODE = '483920175264';
  var LATENCY = 1200;

  function mount(host, ctx) {
    var REG = (root.UX_REGISTRY || []);
    var state = { type: 'card', on: {}, reveal: false };
    ['ux-06', 'ux-09', 'ux-12'].forEach(function (id) { state.on[id] = true; });
    var running = [];
    var feedbackTimer = 0;

    function $(r, s) { return r.querySelector(s); }
    function $$(r, s) { return Array.prototype.slice.call(r.querySelectorAll(s)); }
    function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
    function on(id) { return !!state.on[id]; }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function anim(node, frames, opts) { if (!node) return null; var a = node.animate(frames, opts); running.push(a); return a; }

    /* ---------------- controls ---------------- */
    var ui = el('<div class="pg">' +
      '<div class="pg-side">' +
        '<div class="pg-row" role="group" aria-label="Element"><span class="pg-label">Element</span><div class="seg pg-types"></div></div>' +
        '<fieldset class="pg-set"><legend>Animation principles</legend><div class="pg-chips" data-family="motion"></div></fieldset>' +
        '<fieldset class="pg-set"><legend>UX laws</legend><div class="pg-chips" data-family="ux"></div></fieldset>' +
        '<div class="pg-row"><button type="button" class="btn small" data-all>All on</button><button type="button" class="btn small" data-none>All off</button>' +
        '<label class="ctl"><input type="checkbox" data-reveal> Show hit areas</label></div>' +
      '</div>' +
      '<div class="pg-main">' +
        '<div class="pg-stage" aria-label="Preview of the element with the selected principles"></div>' +
        '<div class="pg-row"><button type="button" class="btn primary" data-replay>&#9654; Replay entrance</button>' +
        '<button type="button" class="btn" data-error>Simulate error</button>' +
        '<span class="pg-hint">Press the element’s main button to see press and feedback.</span></div>' +
        '<div class="pg-spec"><div class="pg-row"><strong>Spec</strong><button type="button" class="btn small" data-copy>Copy spec</button></div><pre></pre></div>' +
        '<p class="readout" role="status" aria-live="polite"></p>' +
      '</div></div>');
    host.append(ui);
    var stage = $(ui, '.pg-stage'), pre = $(ui, '.pg-spec pre'), status = $(ui, '.readout');

    TYPES.forEach(function (t) {
      var b = el('<button type="button" aria-pressed="' + (t.id === state.type) + '">' + t.label + '</button>');
      b.addEventListener('click', function () {
        state.type = t.id;
        $$(ui, '.pg-types button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        render(); replay();
      });
      $(ui, '.pg-types').append(b);
    });
    REG.forEach(function (e) {
      var chip = el('<label class="pg-chip"><input type="checkbox" value="' + e.id + '"' + (on(e.id) ? ' checked' : '') + '><span><b>' + (e.num < 10 ? '0' : '') + e.num + '</b> ' + esc(e.title) + '</span></label>');
      chip.querySelector('input').addEventListener('change', function (ev) { state.on[e.id] = ev.target.checked; render(); replay(); });
      $(ui, '.pg-chips[data-family="' + e.family + '"]').append(chip);
    });
    function setAll(v) {
      REG.forEach(function (e) { state.on[e.id] = v; });
      $$(ui, '.pg-chip input').forEach(function (i) { i.checked = v; });
      render(); replay();
    }
    $(ui, '[data-all]').addEventListener('click', function () { setAll(true); });
    $(ui, '[data-none]').addEventListener('click', function () { setAll(false); });
    $(ui, '[data-reveal]').addEventListener('change', function (ev) { state.reveal = ev.target.checked; stage.classList.toggle('pg-reveal', state.reveal); });
    $(ui, '[data-replay]').addEventListener('click', replay);
    $(ui, '[data-error]').addEventListener('click', showError);
    $(ui, '[data-copy]').addEventListener('click', function () {
      try {
        navigator.clipboard.writeText(pre.textContent).then(function () { status.textContent = 'Spec copied.'; }, function () { status.textContent = 'Copy blocked here: select the spec text instead.'; });
      } catch (e) { status.textContent = 'Copy blocked here: select the spec text instead.'; }
    });

    /* ---------------- element ---------------- */
    var refs = {};
    function render() {
      running.forEach(function (a) { try { a.cancel(); } catch (e) { /* noop */ } });
      running = [];
      clearTimeout(feedbackTimer);
      var t = state.type;
      var ordered = on('ux-20') ? ACTIONS.slice() : [ACTIONS[4], ACTIONS[1], ACTIONS[2], ACTIONS[3], ACTIONS[0], ACTIONS[5]];
      var primary = ordered[0];
      var visible = on('ux-15') ? [primary] : ordered;
      if (t === 'toast' && !on('ux-15')) visible = ordered.slice(0, 3);
      var hidden = on('ux-15') ? ordered.slice(1) : (t === 'toast' ? ordered.slice(3) : []);

      var classes = ['pg-el', 'pg-' + t];
      Object.keys(state.on).forEach(function (id) { if (state.on[id]) classes.push('on-' + id); });
      if (!on('ux-12')) classes.push('pg-mixed');

      var closeBtn = '<button type="button" class="pg-icon-btn pg-close" aria-label="Close">' + (on('ux-19') ? '&#215;' : '&#9711;') + '</button>';
      var moreBtn = hidden.length ? '<button type="button" class="pg-icon-btn pg-more" aria-haspopup="menu" aria-expanded="false" aria-label="More actions">&#8943;</button>' : '';
      var btns = visible.map(function (a, i) {
        var isPrimary = a === primary;
        return '<button type="button" class="pg-btn' + (isPrimary ? ' pg-primary' : '') + (on('ux-13') && isPrimary ? ' pg-big' : '') + '" data-act="' + a.id + '">' +
          (isPrimary ? '<span class="pg-btn-label">' + a.label + '</span>' : a.label) + '</button>';
      });
      if (on('ux-19')) btns.reverse(); // primary right-most
      var menu = hidden.length ? '<div class="pg-menu" role="menu" hidden>' + hidden.map(function (a) { return '<button type="button" role="menuitem" data-act="' + a.id + '">' + a.label + '</button>'; }).join('') + '</div>' : '';
      var code = on('ux-16') ? CODE.replace(/(\d{4})(?=\d)/g, '$1 ') : CODE;

      var head = '<div class="pg-head pg-part"><span class="pg-badge" aria-hidden="true"></span><b class="pg-title">Invite your team</b>' + (on('ux-19') ? closeBtn : '') + '</div>';
      var body = '<div class="pg-body pg-part"><div class="pg-code-row"><span>Invite code</span><code class="pg-code">' + code + '</code></div>' +
        '<label class="pg-field">Expires <input class="pg-input" value="12 Mar 2026" autocomplete="off"></label><div class="pg-interp" aria-live="polite"></div>' +
        '<div class="pg-err" hidden><span class="pg-err-icon" aria-hidden="true">!</span>Couldn’t copy the code. Try again.</div></div>';
      var actions = '<div class="pg-actions pg-part' + (on('ux-13') ? ' pg-fitts' : '') + '">' + (on('ux-19') ? '' : closeBtn) + btns.join('') + moreBtn + menu + '</div>';

      var inner;
      if (t === 'button') inner = '<div class="pg-context">' + body + '</div>' + actions;
      else if (t === 'toast') inner = head + actions;
      else inner = head + body + actions;

      stage.innerHTML =
        '<div class="pg-decoys" aria-hidden="true">' + '<i></i>'.repeat(9) + '</div>' +
        '<div class="pg-scrim" aria-hidden="true"></div>' +
        '<div class="pg-ghosts" aria-hidden="true"></div>' +
        '<div class="pg-shadow" aria-hidden="true"></div>' +
        '<div class="pg-wrap"><div class="' + classes.join(' ') + '" style="--hit:' + (on('ux-14') ? 44 : 16) + 'px">' + inner + '</div></div>';
      refs = {
        wrap: $(stage, '.pg-wrap'), node: $(stage, '.pg-el'), scrim: $(stage, '.pg-scrim'), ghosts: $(stage, '.pg-ghosts'),
        shadow: $(stage, '.pg-shadow'), parts: $$(stage, '.pg-part'), decoys: $$(stage, '.pg-decoys i'),
        primary: $(stage, '.pg-primary'), input: $(stage, '.pg-input'), interp: $(stage, '.pg-interp'), err: $(stage, '.pg-err')
      };
      stage.classList.toggle('pg-reveal', state.reveal);
      stage.classList.toggle('pg-3d', on('ux-11'));
      wire();
      validate();
      writeSpec();
    }

    function wire() {
      if (refs.primary) refs.primary.addEventListener('click', press);
      var more = $(stage, '.pg-more'), menu = $(stage, '.pg-menu');
      if (more && menu) {
        more.addEventListener('click', function () { var open = menu.hidden; menu.hidden = !open; more.setAttribute('aria-expanded', String(open)); if (open) menu.querySelector('button').focus(); });
        menu.addEventListener('keydown', function (e) { if (e.key === 'Escape') { menu.hidden = true; more.setAttribute('aria-expanded', 'false'); more.focus(); } });
        $$(menu, 'button').forEach(function (b) { b.addEventListener('click', function () { menu.hidden = true; more.setAttribute('aria-expanded', 'false'); if (b.dataset.act === 'copy') press(); }); });
      }
      $$(stage, '.pg-btn:not(.pg-primary)').forEach(function (b) { if (b.dataset.act === 'copy') b.addEventListener('click', press); });
      if (refs.input) refs.input.addEventListener('input', validate);
      if (on('ux-11') && refs.node && !ctx.reduced) {
        stage.onpointermove = function (e) {
          var r = stage.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
          refs.wrap.style.transform = 'rotateY(' + (x * 8).toFixed(2) + 'deg) rotateX(' + (-y * 8).toFixed(2) + 'deg)';
        };
        stage.onpointerleave = function () { refs.wrap.style.transform = ''; };
      } else { stage.onpointermove = null; stage.onpointerleave = null; }
    }

    /* Postel: strict DD/MM/YYYY vs lenient parse with confirmation */
    var MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    function valid(y, m, d) { var dt = new Date(y, m - 1, d); return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d ? dt : null; }
    function lenient(raw) {
      var s = raw.toLowerCase().trim().replace(/,/g, ' ').replace(/(\d+)(st|nd|rd|th)\b/g, '$1').replace(/\s+/g, ' ');
      var today = new Date(); today.setHours(0, 0, 0, 0);
      var rel = { today: 0, tomorrow: 1 };
      if (s in rel) { var t = new Date(today); t.setDate(t.getDate() + rel[s]); return t; }
      var m, yr = function (y) { y = +y; return y < 100 ? 2000 + y : y; }, mi = function (w) { return MONTHS.indexOf(w.slice(0, 3)) + 1; };
      if ((m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s))) return valid(+m[1], +m[2], +m[3]);
      if ((m = /^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2}|\d{4})$/.exec(s))) return valid(yr(m[3]), +m[2], +m[1]);
      if ((m = /^(\d{1,2}) ([a-z]+)(?: (\d{2}|\d{4}))?$/.exec(s)) && mi(m[2])) return valid(m[3] ? yr(m[3]) : today.getFullYear(), mi(m[2]), +m[1]);
      if ((m = /^([a-z]+) (\d{1,2})(?: (\d{2}|\d{4}))?$/.exec(s)) && mi(m[1])) return valid(m[3] ? yr(m[3]) : today.getFullYear(), mi(m[1]), +m[2]);
      return null;
    }
    function validate() {
      if (!refs.input) return;
      var v = refs.input.value.trim(), d;
      if (on('ux-18')) {
        d = v ? lenient(v) : null;
        refs.interp.innerHTML = !v ? '' : d ? '<span class="good">&#10003; ' + d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) + '</span>' : '<span class="bad">Couldn’t read that date. Try “12 March”.</span>';
      } else {
        var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
        d = m ? valid(+m[3], +m[2], +m[1]) : null;
        refs.interp.innerHTML = !v ? '' : d ? '<span class="good">&#10003; Accepted</span>' : '<span class="bad">Invalid format. Use DD/MM/YYYY.</span>';
      }
      refs.input.setAttribute('aria-invalid', String(!!v && !d));
    }

    function writeSpec() {
      var t = TYPES.filter(function (x) { return x.id === state.type; })[0].label;
      var lines = REG.filter(function (e) { return on(e.id); }).map(function (e) { return e.id + '  ' + e.title + '\n      ' + SPEC[e.id]; });
      pre.textContent = 'Element: ' + t + '\n' + (lines.length ? lines.join('\n') : 'No principles on: baseline (700ms linear entrance, no feedback design).');
    }

    /* ---------------- motion ---------------- */
    function replay() {
      if (!refs.node) return;
      running.forEach(function (a) { try { a.cancel(); } catch (e) { /* noop */ } });
      running = [];
      if (refs.err) refs.err.hidden = true;
      /* measure the resting pose before anything moves (used for pose-to-pose ghosts) */
      var tilt = refs.wrap.style.transform; refs.wrap.style.transform = '';
      var rest = refs.node.getBoundingClientRect(), box = stage.getBoundingClientRect();
      refs.wrap.style.transform = tilt;
      if (ctx.reduced) { anim(refs.node, [{ opacity: 0 }, { opacity: 1 }], { duration: 150 }); if (on('ux-03')) refs.scrim.style.opacity = '1'; status.textContent = 'Reduced motion is on: entrance shown as a fade.'; return; }
      status.textContent = '';
      var dur = on('ux-09') ? 240 : 700;
      var ease = on('ux-06') ? 'cubic-bezier(0,0,.2,1)' : 'linear';
      var delay = 0;
      var toast = state.type === 'toast';
      var DX = toast ? 0 : -90, DY = toast ? 70 : 60;

      if (on('ux-03')) {
        anim(refs.scrim, [{ opacity: 0 }, { opacity: 1 }], { duration: on('ux-09') ? 180 : 360, easing: 'ease-out', fill: 'both' });
        delay = on('ux-09') ? 160 : 320;
      } else {
        refs.decoys.forEach(function (d, i) {
          anim(d, [{ transform: 'scale(1)' }, { transform: 'scale(1.12) rotate(' + (i % 2 ? 3 : -3) + 'deg)' }, { transform: 'scale(1)' }], { duration: 420, delay: i * 50, iterations: 2, easing: 'ease-in-out' });
        });
      }

      /* wrapper: horizontal travel. Arcs → x linear while y eases (curved path); otherwise same easing (straight line) */
      anim(refs.wrap, [{ transform: 'translateX(' + DX + 'px)' }, { transform: 'translateX(0)' }], { duration: dur, delay: delay, easing: on('ux-07') ? 'linear' : ease, fill: 'both' });

      /* node: vertical travel, poses, squash, 3D */
      var frames = [];
      var tz = on('ux-11') ? ' rotateX(28deg)' : '';
      frames.push({ offset: 0, opacity: 0, transform: 'translateY(' + DY + 'px)' + tz + ' scale(1,1)' });
      if (on('ux-02')) frames.push({ offset: 0.2, opacity: 0.8, transform: 'translateY(' + (DY + 12) + 'px)' + tz + ' scale(1.02,.96)' });
      if (on('ux-04')) frames.push({ offset: 0.72, opacity: 1, transform: 'translateY(-14px) rotateX(0deg) scale(1.02,1.02)' });
      if (on('ux-01')) frames.push({ offset: 0.86, opacity: 1, transform: 'translateY(0) rotateX(0deg) scale(1.05,.93)' });
      frames.push({ offset: 1, opacity: 1, transform: 'translateY(0) rotateX(0deg) scale(1,1)' });
      var yEase = on('ux-07') ? 'cubic-bezier(.2,.8,.2,1)' : ease;
      anim(refs.node, frames, { duration: dur * (on('ux-02') ? 1.2 : 1), delay: delay, easing: yEase, fill: 'both' });

      if (on('ux-11')) anim(refs.shadow, [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1)' }], { duration: dur, delay: delay, easing: ease, fill: 'both' });

      /* children: follow through (lag + overshoot) or, without consistency, mismatched timing */
      refs.parts.forEach(function (p, i) {
        if (!on('ux-12')) {
          var weird = [[150, 'linear', 0], [620, 'cubic-bezier(.5,1.9,.5,.7)', 180], [380, 'ease-in', 60]][i % 3];
          anim(p, [{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: weird[0], delay: delay + weird[2], easing: weird[1], fill: 'both' });
        } else if (on('ux-05')) {
          anim(p, [{ transform: 'translateY(18px)', opacity: 0 }, { transform: 'translateY(-3px)', opacity: 1, offset: 0.7 }, { transform: 'translateY(0)', opacity: 1 }],
            { duration: dur + 120, delay: delay + 40 * (i + 1), easing: 'ease-out', fill: 'both' });
        }
      });

      /* pose to pose: show the key poses as ghosts during the move */
      refs.ghosts.innerHTML = '';
      if (on('ux-04')) {
        [['start', DX, DY], ['overshoot', 0, -14], ['rest', 0, 0]].forEach(function (g) {
          var gh = el('<div class="ghost" style="left:' + (rest.left - box.left + g[1]) + 'px;top:' + (rest.top - box.top + g[2]) + 'px;width:' + rest.width + 'px;height:' + rest.height + 'px"><span>' + g[0] + '</span></div>');
          refs.ghosts.append(gh);
        });
        anim(refs.ghosts, [{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: dur + delay + 900, fill: 'both' });
      }
    }

    function press() {
      var b = refs.primary;
      if (!b || b.dataset.busy === 'true') return;
      var lab = $(b, '.pg-btn-label');
      if (refs.err) refs.err.hidden = true;
      if (on('ux-01') && !ctx.reduced) anim(b, [{ transform: 'scale(1)' }, { transform: 'scale(1.06,.88)', offset: 0.35 }, { transform: 'scale(.98,1.03)', offset: 0.7 }, { transform: 'scale(1)' }], { duration: on('ux-09') ? 220 : 520, easing: 'ease-out' });
      b.dataset.busy = 'true';
      var t0 = performance.now();
      if (on('ux-17')) { lab.innerHTML = '<span class="spinner" aria-hidden="true"></span> Copying…'; }
      clearTimeout(feedbackTimer);
      feedbackTimer = setTimeout(function () {
        lab.innerHTML = '&#10003; Copied';
        status.textContent = on('ux-17') ? 'Acknowledged at once; result after ' + LATENCY + 'ms.' : 'No response for ' + Math.round(performance.now() - t0) + 'ms, then the result.';
        if (on('ux-08') && !ctx.reduced) secondary(b);
        feedbackTimer = setTimeout(function () { lab.textContent = 'Copy code'; b.dataset.busy = 'false'; }, 1600);
      }, LATENCY);
    }

    function secondary(b) {
      var s = stage.getBoundingClientRect(), r = b.getBoundingClientRect();
      var cx = r.left - s.left + r.width / 2, cy = r.top - s.top + r.height / 2;
      for (var i = 0; i < 8; i++) {
        var p = el('<span class="pg-particle" style="left:' + cx + 'px;top:' + cy + 'px"></span>');
        stage.append(p);
        var ang = i / 8 * Math.PI * 2;
        var a = p.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: 'translate(calc(-50% + ' + Math.cos(ang) * 46 + 'px), calc(-50% + ' + Math.sin(ang) * 30 + 'px)) scale(0)', opacity: 0 }], { duration: 560, delay: 60, easing: 'cubic-bezier(0,0,.2,1)', fill: 'both' });
        a.onfinish = (function (n) { return function () { n.remove(); }; })(p);
      }
      anim($(b, '.pg-btn-label'), [{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 280, delay: 60 });
    }

    function showError() {
      if (!refs.node) return;
      var target = refs.primary || refs.node;
      if (on('ux-10')) {
        if (refs.err) refs.err.hidden = false;
        refs.node.classList.add('pg-error');
        if (!ctx.reduced) anim(refs.node, [0, -10, 10, -6, 6, -3, 0].map(function (x) { return { transform: 'translateX(' + x + 'px)' }; }), { duration: 460, easing: 'ease-in-out', composite: 'add' });
        status.textContent = 'Error: shake, red border, icon and message.';
      } else {
        refs.node.classList.remove('pg-error');
        target.classList.add('pg-subtle-error');
        status.textContent = 'Error shown only as a faint border tint. Easy to miss.';
      }
      setTimeout(function () { refs.node && refs.node.classList.remove('pg-error'); target.classList.remove('pg-subtle-error'); }, 2400);
    }

    render();
    ctx.onReducedChange(function () { render(); });
    return { replay: replay, autoplay: function () { if (!ctx.reduced) replay(); } };
  }

  var api = { mount: mount, SPEC: SPEC, ACTIONS: ACTIONS, TYPES: TYPES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.UX_PLAYGROUND = api;
})(typeof window !== 'undefined' ? window : globalThis);
