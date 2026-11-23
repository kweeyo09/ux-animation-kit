/*
 * 20 standalone demos, one per registry ID. Each demo is registered with
 * register(id, mount). mount(host, ctx) builds the demo inside `host` and may
 * return an API ({ autoplay }) used by the gallery. Nothing here touches the DOM at
 * load time, so scripts/check-coverage.js can load this file in Node.
 */
(function (root) {
  'use strict';

  var DEMOS = {};
  function register(id, mount) {
    if (DEMOS[id]) throw new Error('Duplicate demo id ' + id);
    DEMOS[id] = { id: id, mount: mount };
  }

  /* ------------------------------------------------------------------ utils */
  function el(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function $(r, s) { return r.querySelector(s); }
  function $$(r, s) { return Array.prototype.slice.call(r.querySelectorAll(s)); }
  function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var uid = 0; function nid(p) { uid += 1; return p + '-' + uid; }
  function now() { return performance.now(); }

  /* cubic-bezier evaluator: returns y(x) */
  function cubicBezier(x1, y1, x2, y2) {
    var cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    var cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    function sx(t) { return ((ax * t + bx) * t + cx) * t; }
    function sy(t) { return ((ay * t + by) * t + cy) * t; }
    return function (x) {
      var lo = 0, hi = 1, t = x;
      for (var i = 0; i < 40; i++) { var v = sx(t); if (Math.abs(v - x) < 1e-6) break; if (v < x) lo = t; else hi = t; t = (lo + hi) / 2; }
      return sy(t);
    };
  }
  var EASINGS = {
    'linear': [0, 0, 1, 1],
    'ease-in': [0.42, 0, 1, 1],
    'ease-out': [0, 0, 0.58, 1],
    'ease-in-out': [0.42, 0, 0.58, 1],
    'expressive': [0.2, 0, 0, 1]
  };
  function easingCss(key) { var e = EASINGS[key]; return key === 'linear' ? 'linear' : 'cubic-bezier(' + e.join(',') + ')'; }

  /* generic control: range | select | checkbox */
  function control(p, onChange) {
    var id = nid('ctl'), node, input;
    if (p.type === 'select') {
      node = el('<label class="ctl" for="' + id + '"><span>' + esc(p.label) + '</span><select id="' + id + '"></select></label>');
      input = $(node, 'select');
      p.options.forEach(function (o) { var op = document.createElement('option'); op.value = o.value; op.textContent = o.label; if (String(o.value) === String(p.value)) op.selected = true; input.append(op); });
      input.addEventListener('change', function () { onChange(input.value); });
    } else if (p.type === 'checkbox') {
      node = el('<label class="ctl" for="' + id + '"><input type="checkbox" id="' + id + '"' + (p.value ? ' checked' : '') + '><span>' + esc(p.label) + '</span></label>');
      input = $(node, 'input');
      input.addEventListener('change', function () { onChange(input.checked); });
    } else {
      node = el('<label class="ctl" for="' + id + '"><span>' + esc(p.label) + '</span><input type="range" id="' + id + '" min="' + p.min + '" max="' + p.max + '" step="' + (p.step || 1) + '" value="' + p.value + '"><output for="' + id + '"></output></label>');
      input = $(node, 'input'); var out = $(node, 'output');
      var show = function () { out.textContent = input.value + (p.unit || ''); };
      show();
      input.addEventListener('input', function () { show(); onChange(Number(input.value)); });
    }
    return { node: node, input: input };
  }

  function btn(label, cls, attrs) { var b = el('<button type="button" class="btn ' + (cls || '') + '" ' + (attrs || '') + '>' + label + '</button>'); return b; }

  /* ---------------------------------------------------------- motion lab
   * Shared harness for motion demos: side-by-side lanes, Replay, timeline scrubber
   * with step-through, speed, a static-frames comparison and parameter controls.
   * lane: { tag, label(params), with, html(params, W, H), build(stage, params, W, H) -> Animation[] , alt }
   */
  function motionLab(host, ctx, opts) {
    var params = {};
    (opts.params || []).forEach(function (p) { params[p.key] = p.value; });
    var H = opts.height || 160;
    var nFrames = opts.frames || 6;
    var speed = 1, mode = ctx.reduced ? 'frames' : 'live', userChoseMode = false, hasPlayed = false, raf = 0;

    var wrap = el('<div class="lab"></div>');
    var lanesEl = el('<div class="lanes ' + (opts.layout || 'rows') + '" style="--n:' + opts.lanes.length + '"></div>');
    var framesEl = el('<div class="frames" hidden></div>');
    var lanes = opts.lanes.map(function (def) {
      var fig = el('<figure class="lane"><figcaption></figcaption><div class="stage" style="--h:' + H + 'px"></div><p class="visually-hidden"></p></figure>');
      lanesEl.append(fig);
      return { def: def, fig: fig, cap: $(fig, 'figcaption'), stage: $(fig, '.stage'), alt: $(fig, '.visually-hidden'), anims: [] };
    });

    function caption(L) {
      var label = typeof L.def.label === 'function' ? L.def.label(params) : L.def.label;
      return '<span class="pill ' + (L.def.with ? 'with' : '') + '">' + esc(L.def.tag || (L.def.with ? 'With' : 'Without')) + '</span>' + esc(label);
    }
    function htmlFor(L, W) { return typeof L.def.html === 'function' ? L.def.html(params, W, H) : L.def.html; }
    function laneWidth(L) { var w = L.stage.clientWidth; if (w) L.lastW = w; return L.lastW || lanesEl.clientWidth || framesEl.clientWidth || 480; }

    function allAnims() { var out = []; lanes.forEach(function (L) { out = out.concat(L.anims); }); return out; }
    function total() {
      var t = 0;
      allAnims().forEach(function (a) { var e = a.effect.getComputedTiming().endTime; if (e > t) t = e; });
      return t || 1000;
    }

    function rebuild() {
      if (opts.prepare) opts.prepare(params, laneWidth(lanes[0]), H);
      lanes.forEach(function (L) {
        L.anims.forEach(function (a) { a.cancel(); });
        var W = laneWidth(L);
        L.cap.innerHTML = caption(L);
        L.stage.innerHTML = htmlFor(L, W);
        L.stage.setAttribute('aria-hidden', L.def.interactive ? 'false' : 'true');
        L.alt.textContent = L.def.alt || '';
        L.anims = L.def.build(L.stage, params, W, H) || [];
        L.anims.forEach(function (a) { a.pause(); a.currentTime = 0; });
        if (opts.afterRender) opts.afterRender(L.stage, L, api);
      });
      if (opts.onBuild) opts.onBuild(params, api);
      updateScrub(0);
      if (mode === 'frames') renderFrames();
    }

    function play() {
      if (opts.rebuildOnPlay) rebuild();
      hasPlayed = true;
      if (mode === 'frames') setMode('live');
      allAnims().forEach(function (a) { a.playbackRate = speed; a.currentTime = 0; a.play(); });
      cancelAnimationFrame(raf);
      var T = total();
      (function loop() {
        var t = 0, running = false;
        allAnims().forEach(function (a) { if ((a.currentTime || 0) > t) t = a.currentTime; if (a.playState === 'running') running = true; });
        updateScrub(t / T);
        if (running) raf = requestAnimationFrame(loop);
      })();
    }
    function seek(p) {
      cancelAnimationFrame(raf);
      var T = total();
      allAnims().forEach(function (a) { a.pause(); a.currentTime = p * T; });
      updateScrub(p);
    }

    /* controls */
    var bar = el('<div class="controls"></div>');
    var playBtn = btn('&#9654; Replay', 'primary', 'aria-label="Replay animation: ' + esc(ctx.title) + '"');
    var scrubId = nid('scrub');
    var scrubWrap = el('<span class="scrub"><button type="button" class="btn small" aria-label="Previous step">&#9664;</button><label class="visually-hidden" for="' + scrubId + '">Timeline position</label><input type="range" id="' + scrubId + '" min="0" max="1000" value="0"><button type="button" class="btn small" aria-label="Next step">&#9654;</button></span>');
    var scrub = $(scrubWrap, 'input');
    var stepLabel = el('<span class="step-label"></span>');
    var speedCtl = control({ type: 'select', label: 'Speed', value: '1', options: [{ value: '1', label: '1×' }, { value: '0.5', label: '0.5×' }, { value: '0.25', label: '0.25×' }] }, function (v) {
      speed = Number(v); allAnims().forEach(function (a) { a.playbackRate = speed; });
    });
    var framesBtn = btn('Static frames', '', 'aria-pressed="false"');
    bar.append(playBtn, scrubWrap, stepLabel, speedCtl.node, framesBtn);

    function updateScrub(p) {
      p = Math.max(0, Math.min(1, p));
      scrub.value = String(Math.round(p * 1000));
      var T = total();
      stepLabel.textContent = Math.round(p * T) + ' / ' + Math.round(T) + 'ms';
      scrub.setAttribute('aria-valuetext', Math.round(p * T) + ' of ' + Math.round(T) + ' milliseconds');
    }
    playBtn.addEventListener('click', play);
    scrub.addEventListener('input', function () { seek(Number(scrub.value) / 1000); });
    var steps = function () { return nFrames - 1; };
    $$(scrubWrap, 'button')[0].addEventListener('click', function () {
      var i = Math.round(Number(scrub.value) / 1000 * steps()); seek(Math.max(0, i - 1) / steps());
    });
    $$(scrubWrap, 'button')[1].addEventListener('click', function () {
      var i = Math.round(Number(scrub.value) / 1000 * steps()); seek(Math.min(steps(), i + 1) / steps());
    });
    framesBtn.addEventListener('click', function () { userChoseMode = true; setMode(mode === 'frames' ? 'live' : 'frames'); });

    var paramBar = null;
    if (opts.params && opts.params.length) {
      paramBar = el('<div class="controls"></div>');
      opts.params.forEach(function (p) {
        paramBar.append(control(p, function (v) { params[p.key] = v; rebuild(); if (opts.onParam) opts.onParam(params, api); }).node);
      });
    }
    var extra = opts.extra ? opts.extra(params, function () { rebuild(); }) : null;
    var readout = el('<p class="readout" role="status" aria-live="polite"></p>');

    function setMode(m) {
      mode = m;
      framesBtn.setAttribute('aria-pressed', String(m === 'frames'));
      framesEl.hidden = m !== 'frames';
      lanesEl.hidden = m === 'frames';
      if (m === 'frames') renderFrames();
    }

    /* static frames: clone each lane N times, freeze each clone at a sample time.
     * frameStyle 'onion' overlays the frozen copies in one stage (onion skin), which
     * suits wide, short lanes where spacing or path is the point. */
    function renderFrames() {
      framesEl.innerHTML = '';
      var T = total();
      var times = []; for (var k = 0; k < nFrames; k++) times.push(k / (nFrames - 1) * T);
      lanes.forEach(function (L) {
        var W = laneWidth(L);
        if (opts.frameStyle === 'onion') {
          var ob = el('<div class="frames-lane"><h3>' + caption(L) + '</h3><div class="stage onion" style="--h:' + H + 'px" aria-hidden="true"></div>' +
            '<p class="frame-note">Onion skin: ' + nFrames + ' frames from 0 to ' + Math.round(T) + 'ms, every ' + Math.round(T / (nFrames - 1)) + 'ms. Faint = early, solid = last.</p></div>');
          var st = $(ob, '.stage');
          framesEl.append(ob);
          var w2 = st.clientWidth || W;
          times.forEach(function (t, i) {
            var layer = document.createElement('div');
            layer.className = 'onion-layer';
            layer.style.opacity = i === nFrames - 1 ? '1' : String(0.16 + 0.5 * i / (nFrames - 1));
            layer.innerHTML = htmlFor(L, w2);
            st.append(layer);
            (L.def.build(layer, params, w2, H) || []).forEach(function (a) { a.pause(); a.currentTime = t; });
          });
          return;
        }
        var box = el('<div class="frames-lane"><h3>' + caption(L) + '</h3><div class="frames-row" style="--fw:' + (W > 300 ? 230 : 88) + 'px"></div></div>');
        var row = $(box, '.frames-row');
        framesEl.append(box);
        times.forEach(function (t, i) {
          var fig = el('<figure class="frame"><div class="frame-box" aria-hidden="true"></div><figcaption>' + (i + 1) + ' · ' + Math.round(t) + 'ms</figcaption></figure>');
          var fb = $(fig, '.frame-box');
          var clone = document.createElement('div');
          clone.className = 'stage';
          clone.style.cssText = '--h:' + H + 'px;width:' + W + 'px;height:' + H + 'px';
          clone.innerHTML = htmlFor(L, W);
          fb.append(clone);
          row.append(fig);
          (L.def.build(clone, params, W, H) || []).forEach(function (a) { a.pause(); a.currentTime = t; });
          fb.dataset.w = W;
        });
      });
      fitFrames();
    }
    function fitFrames() {
      $$(framesEl, '.frame-box').forEach(function (fb) {
        var W = Number(fb.dataset.w), s = fb.clientWidth / W, c = fb.firstElementChild;
        c.style.transform = 'scale(' + s + ')';
        fb.style.height = (H * s) + 'px';
      });
    }

    wrap.append(lanesEl, framesEl, bar);
    if (paramBar) wrap.append(paramBar);
    if (extra) wrap.append(extra);
    wrap.append(readout);
    host.append(wrap);

    var api = {
      play: play, seek: seek, rebuild: rebuild, params: params, readout: readout,
      autoplay: function () { if (!ctx.reduced && mode === 'live' && !hasPlayed) play(); },
      setMode: setMode
    };

    ctx.onReducedChange(function (r) { if (!userChoseMode) setMode(r ? 'frames' : 'live'); });
    if (typeof ResizeObserver !== 'undefined') {
      var lastW = 0;
      new ResizeObserver(function () {
        var w = lanesEl.clientWidth || framesEl.clientWidth;
        if (Math.abs(w - lastW) > 2) {
          lastW = w;
          if (opts.widthDependent && mode === 'live') rebuild();
          if (mode === 'frames') { if (opts.frameStyle === 'onion') renderFrames(); else fitFrames(); }
        }
      }).observe(wrap);
    }
    rebuild();
    setMode(mode);
    return api;
  }

  /* before/after panels for UX-law demos */
  function compare(host, a, b) {
    var node = el('<div class="compare">' +
      '<section class="panel" aria-label="Before: ' + esc(a) + '"><h3><span class="pill">Before</span>' + esc(a) + '</h3><div class="pbody"></div></section>' +
      '<section class="panel" aria-label="After: ' + esc(b) + '"><h3><span class="pill with">After</span>' + esc(b) + '</h3><div class="pbody"></div></section></div>');
    host.append(node);
    var bodies = $$(node, '.pbody');
    return { before: bodies[0], after: bodies[1], node: node };
  }

  function seg(transform, extra) { var o = { transform: transform }; for (var k in extra || {}) o[k] = extra[k]; return o; }

  /* ================================================================ 1–12 MOTION */

  /* ux-01 Squash & stretch */
  register('ux-01', function (host, ctx) {
    var Y = [[0, 0], [0.3, 1], [0.52, 0.45], [0.72, 1], [0.82, 0.82], [0.92, 1], [1, 1]];
    function yFrames(drop) {
      return Y.map(function (p, i) {
        var f = { offset: p[0], transform: 'translateY(' + (p[1] * drop) + 'px)' };
        if (i < Y.length - 1) f.easing = Y[i + 1][1] > p[1] ? 'cubic-bezier(.55,0,1,.45)' : 'cubic-bezier(0,.55,.45,1)';
        return f;
      });
    }
    var ballHtml = '<div class="floor"></div><div class="bw" style="position:absolute;left:calc(50% - 17px);top:8px;width:34px;height:34px"><div class="ball" style="left:0;top:0"></div></div>';
    var DUR = 1500;
    function drop(H) { return H - 12 - 34 - 8; }
    motionLab(host, ctx, {
      layout: 'cols', height: 200, frames: 8,
      params: [{ key: 'k', label: 'Squash amount', min: 0, max: 50, value: 30, unit: '%' }],
      lanes: [
        { tag: 'Without', label: 'Rigid ball', html: ballHtml, alt: 'A ball bounces without changing shape.',
          build: function (s, p, W, H) { return [$(s, '.bw').animate(yFrames(drop(H)), { duration: DUR, fill: 'both' })]; } },
        { tag: 'With', with: true, label: 'Squash & stretch', html: ballHtml, alt: 'A ball stretches as it falls and squashes flat on impact.',
          build: function (s, p, W, H) {
            var k = p.k / 100;
            function sc(sx, sy, m) { return 'scale(' + (1 + (sx - 1) * m) + ',' + (1 + (sy - 1) * m) + ')'; }
            var st = [1 - k * 0.4, 1 + k * 0.5], sq = [1 + k, 1 - k];
            return [
              $(s, '.bw').animate(yFrames(drop(H)), { duration: DUR, fill: 'both' }),
              $(s, '.ball').animate([
                { offset: 0, transform: 'scale(1,1)' },
                { offset: 0.26, transform: sc(st[0], st[1], 1) },
                { offset: 0.3, transform: sc(sq[0], sq[1], 1) },
                { offset: 0.36, transform: sc(st[0], st[1], 0.6) },
                { offset: 0.44, transform: 'scale(1,1)' },
                { offset: 0.69, transform: sc(st[0], st[1], 0.5) },
                { offset: 0.72, transform: sc(sq[0], sq[1], 0.6) },
                { offset: 0.77, transform: 'scale(1,1)' },
                { offset: 0.9, transform: 'scale(1,1)' },
                { offset: 0.92, transform: sc(sq[0], sq[1], 0.25) },
                { offset: 1, transform: 'scale(1,1)' }
              ], { duration: DUR, fill: 'both' })
            ];
          } },
        { tag: 'UI', with: true, label: 'Toggle knob', html: '<div class="switch"><div class="knob-wrap"><div class="knob"></div></div></div>', alt: 'A toggle knob stretches wide while travelling, then settles.',
          build: function (s, p) {
            var k = p.k / 100, io = 'cubic-bezier(.4,0,.2,1)';
            var accent = cssVar('--accent') || '#4f46e5';
            return [
              $(s, '.knob-wrap').animate([
                { offset: 0, transform: 'translateX(0)' }, { offset: 0.1, transform: 'translateX(0)', easing: io },
                { offset: 0.4, transform: 'translateX(36px)' }, { offset: 0.6, transform: 'translateX(36px)', easing: io },
                { offset: 0.9, transform: 'translateX(0)' }, { offset: 1, transform: 'translateX(0)' }
              ], { duration: DUR, fill: 'both' }),
              $(s, '.knob').animate([
                { offset: 0, transform: 'scaleX(1)' }, { offset: 0.1, transform: 'scaleX(1)' },
                { offset: 0.25, transform: 'scaleX(' + (1 + k * 1.2) + ')' }, { offset: 0.4, transform: 'scaleX(1)' },
                { offset: 0.44, transform: 'scaleX(' + (1 - k * 0.25) + ')' }, { offset: 0.5, transform: 'scaleX(1)' },
                { offset: 0.6, transform: 'scaleX(1)' }, { offset: 0.75, transform: 'scaleX(' + (1 + k * 1.2) + ')' },
                { offset: 0.9, transform: 'scaleX(1)' }, { offset: 1, transform: 'scaleX(1)' }
              ], { duration: DUR, fill: 'both' }),
              $(s, '.switch').animate([
                { offset: 0, backgroundColor: 'rgba(128,128,128,.45)' }, { offset: 0.25, backgroundColor: 'rgba(128,128,128,.45)' },
                { offset: 0.35, backgroundColor: accent }, { offset: 0.65, backgroundColor: accent },
                { offset: 0.75, backgroundColor: 'rgba(128,128,128,.45)' }, { offset: 1, backgroundColor: 'rgba(128,128,128,.45)' }
              ], { duration: DUR, fill: 'both' })
            ];
          } }
      ]
    });
  });

  /* ux-02 Anticipation wind-up */
  register('ux-02', function (host, ctx) {
    var cardHtml = function (p, W, H) {
      return '<div class="ghost" style="right:12px;top:' + (H / 2 - 30) + 'px;width:70px;height:60px"><span>Sent</span></div>' +
        '<div class="chip" style="left:16px;top:' + (H / 2 - 18) + 'px;width:120px;text-align:center">&#9993; Message</div>';
    };
    motionLab(host, ctx, {
      layout: 'rows', height: 110, frames: 7, widthDependent: true, frameStyle: 'onion',
      params: [{ key: 'w', label: 'Wind-up distance', min: 0, max: 40, value: 24, unit: 'px' }],
      lanes: [
        { label: 'Leaves immediately', html: cardHtml, alt: 'A card slides off to the right with no preparation.',
          build: function (s, p, W) {
            var D = W - 16 + 20;
            return [$(s, '.chip').animate([
              { offset: 0, transform: 'translateX(0)', opacity: 1, easing: 'cubic-bezier(.55,0,1,.45)' },
              { offset: 0.85, transform: 'translateX(' + D * 0.85 + 'px) rotate(5deg)', opacity: 1 },
              { offset: 1, transform: 'translateX(' + D + 'px) rotate(6deg)', opacity: 0 }
            ], { duration: 650, fill: 'both' })];
          } },
        { with: true, label: function (p) { return 'Pulls back ' + p.w + 'px first'; }, html: cardHtml, alt: 'A card pulls back slightly to the left, then slides off to the right.',
          build: function (s, p, W) {
            var D = W - 16 + 20;
            return [$(s, '.chip').animate([
              { offset: 0, transform: 'translateX(0) rotate(0) scale(1)', easing: 'cubic-bezier(0,0,.2,1)' },
              { offset: 0.28, transform: 'translateX(' + (-p.w) + 'px) rotate(-3deg) scale(.97)', easing: 'cubic-bezier(.55,0,1,.45)' },
              { offset: 0.9, transform: 'translateX(' + D * 0.85 + 'px) rotate(5deg) scale(1)', opacity: 1 },
              { offset: 1, transform: 'translateX(' + D + 'px) rotate(6deg)', opacity: 0 }
            ], { duration: 900, fill: 'both' })];
          } }
      ]
    });
  });

  /* ux-03 Staging the focus */
  register('ux-03', function (host, ctx) {
    var html = '<div class="dash">' + '<div class="tile"><i></i></div>'.repeat(6) + '</div><div class="scrim"></div><div class="toast"><b></b>New message from Ana</div>';
    motionLab(host, ctx, {
      layout: 'cols', height: 190, frames: 6,
      lanes: [
        { label: 'Everything moves at once', html: html, alt: 'Dashboard tiles pulse and badges bounce while a message appears among them.',
          build: function (s) {
            var a = [];
            $$(s, '.tile').forEach(function (t, i) {
              a.push(t.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.07) rotate(' + (i % 2 ? 2 : -2) + 'deg)' }, { transform: 'scale(1)' }], { duration: 500, delay: i * 70, iterations: 2, easing: 'ease-in-out', fill: 'both' }));
              a.push($(t, 'i').animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-8px)' }, { transform: 'translateY(0)' }], { duration: 350, delay: 100 + i * 50, iterations: 3, fill: 'both' }));
            });
            a.push($(s, '.toast').animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 200, fill: 'both', easing: 'ease-out' }));
            return a;
          } },
        { with: true, label: 'Still, dim, then reveal', html: html, alt: 'The dashboard stays still and dims, then a message slides in on top.',
          build: function (s) {
            return [
              $(s, '.scrim').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, fill: 'both', easing: 'ease-out' }),
              $(s, '.toast').animate([{ opacity: 0, transform: 'translateY(14px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 320, delay: 300, fill: 'both', easing: 'cubic-bezier(0,0,.2,1)' }),
              $(s, '.dash').animate([{ opacity: 1 }, { opacity: 1 }], { duration: 1200, fill: 'both' })
            ];
          } }
      ]
    });
  });

  /* ux-04 Pose to pose */
  register('ux-04', function (host, ctx) {
    var take = 0;
    function poses(W, H) {
      return [
        { x: 16, y: H - 52, r: 0, name: 'A' },
        { x: W / 2 - 18, y: 22, r: 90, name: 'B' },
        { x: W - 56, y: H - 52, r: 180, name: 'C' }
      ];
    }
    function ghosts(list, show) {
      return list.map(function (q) {
        return '<div class="ghost" style="left:' + q.x + 'px;top:' + q.y + 'px;width:36px;height:36px;' + (show ? '' : 'display:none') + '"><span>' + q.name + '</span></div>';
      }).join('');
    }
    function tr(q) { return 'translate(' + q.x + 'px,' + q.y + 'px) rotate(' + q.r + 'deg)'; }
    var lab = motionLab(host, ctx, {
      layout: 'rows', height: 150, frames: 9, widthDependent: true, rebuildOnPlay: true, frameStyle: 'onion',
      params: [{ key: 'show', type: 'checkbox', label: 'Show key poses', value: true }],
      prepare: function (p, W, H) {
        take += 1;
        var P = poses(W, H), steps = 26, x = P[0].x, y = P[0].y, r = 0, path = [];
        var target = P[2].x - P[0].x;
        for (var i = 0; i <= steps; i++) {
          path.push({ x: x, y: y, r: r });
          x += target / steps * (1 + (Math.random() - 0.35) * 0.9);
          y += (i < steps / 2 ? -1 : 1) * (H - 74) / (steps / 2) * (0.6 + Math.random() * 0.9);
          y = Math.max(4, Math.min(H - 40, y));
          r += 180 / steps * (0.5 + Math.random());
        }
        p.path = path; p.take = take;
        var end = path[path.length - 1];
        p.miss = Math.round(Math.hypot(end.x - P[2].x, end.y - P[2].y));
      },
      lanes: [
        { tag: 'Without', label: 'Straight ahead: incremental nudges', alt: 'A box is nudged step by step and drifts off its target.',
          html: function (p, W, H) { var P = poses(W, H); return ghosts([P[0], P[2]], p.show).replace('>A<', '>start<').replace('>C<', '>target<') + '<div class="box" style="left:0;top:0"></div>'; },
          build: function (s, p) {
            return [$(s, '.box').animate(p.path.map(function (q) { return { transform: tr(q) }; }), { duration: 1400, easing: 'linear', fill: 'both' })];
          } },
        { with: true, label: 'Pose to pose: A → B → C, in-betweens interpolated', alt: 'A box moves through three defined poses and lands exactly on the last one.',
          html: function (p, W, H) { return ghosts(poses(W, H), p.show) + '<div class="box" style="left:0;top:0"></div>'; },
          build: function (s, p, W, H) {
            var P = poses(W, H);
            return [$(s, '.box').animate([
              { transform: tr(P[0]), easing: 'cubic-bezier(.4,0,.2,1)' },
              { transform: tr(P[1]), offset: 0.5, easing: 'cubic-bezier(.4,0,.2,1)' },
              { transform: tr(P[2]) }
            ], { duration: 1400, fill: 'both' })];
          } }
      ],
      onBuild: function (p, api) {
        api.readout.innerHTML = 'This take: the straight-ahead box ended <strong>' + p.miss + 'px</strong> from its target. The pose-to-pose box ended <strong>0px</strong> away. Replay for a new take: the drift changes every time.';
      }
    });
    return lab;
  });

  /* ux-05 Follow through */
  register('ux-05', function (host, ctx) {
    var html = '<div class="drawer"><div class="line"></div><div class="line"></div><div class="line"></div><div class="line"></div></div>';
    function drawer(s) { return $(s, '.drawer').animate([{ transform: 'translateX(-110%)' }, { transform: 'translateX(0)' }], { duration: 600, easing: 'cubic-bezier(.2,0,0,1)', fill: 'both' }); }
    motionLab(host, ctx, {
      layout: 'rows', height: 150, frames: 7,
      params: [
        { key: 'o', label: 'Overshoot', min: 0, max: 16, value: 8, unit: 'px' },
        { key: 'st', label: 'Stagger', min: 0, max: 80, value: 45, unit: 'ms' }
      ],
      lanes: [
        { label: 'Contents locked to the container', html: html, alt: 'A drawer slides in and everything inside stops at the same instant.',
          build: function (s) { return [drawer(s)]; } },
        { with: true, label: function (p) { return 'Contents lag, overshoot ' + p.o + 'px, settle'; }, html: html, alt: 'A drawer slides in; its content lines trail behind, overshoot slightly and settle after the drawer stops.',
          build: function (s, p) {
            var a = [drawer(s)];
            $$(s, '.line').forEach(function (l, i) {
              a.push(l.animate([
                { transform: 'translateX(-46px)', offset: 0 },
                { transform: 'translateX(' + p.o + 'px)', offset: 0.68 },
                { transform: 'translateX(' + (-p.o * 0.3) + 'px)', offset: 0.85 },
                { transform: 'translateX(0)' }
              ], { duration: 820, delay: i * p.st, easing: 'ease-out', fill: 'both' }));
            });
            return a;
          } }
      ]
    });
  });

  /* ux-06 Ease in & ease out */
  register('ux-06', function (host, ctx) {
    var DUR = 1300;
    function laneHtml(key) {
      return function (p, W) {
        var f = cubicBezier.apply(null, EASINGS[key]), x0 = 10, x1 = W - 46, ticks = '';
        for (var i = 0; i <= 10; i++) ticks += '<div class="tick" style="left:' + (x0 + 18 + f(i / 10) * (x1 - x0)) + 'px"></div>';
        return ticks + '<div class="box" style="left:0;top:18px"></div>';
      };
    }
    function build(key) {
      return function (s, p, W) {
        return [$(s, '.box').animate([{ transform: 'translateX(10px)' }, { transform: 'translateX(' + (W - 46) + 'px)' }], { duration: DUR, easing: easingCss(key), fill: 'both' })];
      };
    }
    var curve = el('<svg class="curve" width="150" height="110" viewBox="-14 -12 128 134" role="img" aria-label="Easing curve: position over time"></svg>');
    function drawCurve(key) {
      var f = cubicBezier.apply(null, EASINGS[key]), d = '';
      for (var i = 0; i <= 40; i++) { var t = i / 40; d += (i ? 'L' : 'M') + (t * 100).toFixed(1) + ',' + (100 - f(t) * 100).toFixed(1); }
      curve.setAttribute('aria-label', 'Easing curve for ' + key + ' (dashed: linear), position over time');
      curve.innerHTML = '<path d="M0,100 L100,0" stroke="currentColor" stroke-opacity=".35" stroke-dasharray="4 4" fill="none"/>' +
        '<path d="' + d + '" stroke="' + (cssVar('--accent') || '#4f46e5') + '" stroke-width="3" fill="none"/>' +
        '<text x="0" y="114" font-size="9" fill="currentColor">time →</text><text x="-8" y="-2" font-size="9" fill="currentColor">pos</text>';
    }
    var lab = motionLab(host, ctx, {
      layout: 'rows', height: 76, frames: 11, widthDependent: true, frameStyle: 'onion',
      params: [{ key: 'e', type: 'select', label: 'Easing', value: 'ease-in-out', options: [
        { value: 'ease-in-out', label: 'ease-in-out (move)' }, { value: 'ease-out', label: 'ease-out (enter)' },
        { value: 'ease-in', label: 'ease-in (exit)' }, { value: 'expressive', label: 'cubic-bezier(.2,0,0,1)' }] }],
      lanes: [
        { label: 'linear: constant speed', html: laneHtml('linear'), build: build('linear'), alt: 'Box moves at constant speed; time-marker dots are evenly spaced.' },
        { with: true, label: function (p) { return easingCss(p.e); }, html: function (p, W, H) { return laneHtml(p.e)(p, W, H); },
          build: function (s, p, W) { return build(p.e)(s, p, W); }, alt: 'Box eases out of rest and into rest; time-marker dots bunch at both ends.' }
      ],
      extra: function (p) { var w = el('<div class="controls"></div>'); w.append(curve, el('<span class="readout">Curve: position against time. Steep = fast, flat = slow.</span>')); drawCurve(p.e); return w; },
      onParam: function (p) { drawCurve(p.e); }
    });
    return lab;
  });

  /* ux-07 Arcs */
  register('ux-07', function (host, ctx) {
    function pts(W, H) { return { x0: 36, y0: H - 30, x1: W - 36, y1: 34 }; }
    function d(kind, p, W, H) {
      var q = pts(W, H);
      if (kind === 'line') return 'M ' + q.x0 + ' ' + q.y0 + ' L ' + q.x1 + ' ' + q.y1;
      var dx = q.x1 - q.x0, dy = q.y1 - q.y0, len = Math.hypot(dx, dy), off = p.arc * 2;
      var cx = (q.x0 + q.x1) / 2 + dy / len * off, cy = (q.y0 + q.y1) / 2 - dx / len * off;
      return 'M ' + q.x0 + ' ' + q.y0 + ' Q ' + cx + ' ' + cy + ' ' + q.x1 + ' ' + q.y1;
    }
    var cartSvg = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 4h2l2.4 10.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="10" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></svg>';
    function html(kind) {
      return function (p, W, H) {
        var q = pts(W, H);
        return '<svg class="trace" aria-hidden="true"><path d="' + d(kind, p, W, H) + '"/></svg>' +
          '<div class="product" style="left:' + (q.x0 - 20) + 'px;top:' + (q.y0 - 20) + 'px">&#128085;</div>' +
          '<div class="cart" style="left:' + (q.x1 - 20) + 'px;top:' + (q.y1 - 20) + 'px">' + cartSvg + '</div>' +
          '<div class="flyer" style="offset-path:path(\'' + d(kind, p, W, H) + '\')"></div>';
      };
    }
    function build(s) {
      return [
        $(s, '.flyer').animate([{ offsetDistance: '0%', transform: 'scale(1)' }, { offsetDistance: '100%', transform: 'scale(.6)' }], { duration: 900, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' }),
        $(s, '.cart').animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 260, delay: 880, easing: 'ease-out', fill: 'both' })
      ];
    }
    motionLab(host, ctx, {
      layout: 'rows', height: 170, frames: 9, widthDependent: true, frameStyle: 'onion',
      params: [{ key: 'arc', label: 'Arc bulge', min: 0, max: 60, value: 40, unit: 'px' }],
      lanes: [
        { label: 'Straight line', html: html('line'), build: build, alt: 'A dot travels in a straight diagonal line from product to cart.' },
        { with: true, label: 'Arc (quadratic curve)', html: html('arc'), build: build, alt: 'A dot is tossed in a curved arc from product to cart.' }
      ]
    });
  });

  /* ux-08 Secondary action */
  register('ux-08', function (host, ctx) {
    var heart = 'M12 21s-7.5-4.6-10-9.3C.4 8.4 2.4 4.5 6.2 4.5c2.2 0 3.6 1.2 4.4 2.5h.8c.8-1.3 2.2-2.5 4.4-2.5 3.8 0 5.8 3.9 4.2 7.2C19.5 16.4 12 21 12 21z';
    function html(name) {
      return function () {
        var parts = ''; for (var i = 0; i < 8; i++) parts += '<span class="particle"></span>';
        return '<button type="button" class="like" aria-label="Like: replay ' + name + '"><span class="heart">' +
          '<svg viewBox="0 0 24 24" class="outline"><path d="' + heart + '" fill="none" stroke="currentColor" stroke-width="2"/></svg>' +
          '<svg viewBox="0 0 24 24" class="fill"><path d="' + heart + '" fill="' + (cssVar('--actor') || '#f05a28') + '"/></svg>' + parts +
          '</span><span class="count"><span class="old">128</span><span class="new" style="opacity:0">129</span></span></button>';
      };
    }
    var T0 = 150;
    function primary(s, pop) {
      var a = [$(s, '.fill').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1, delay: T0, fill: 'both' })];
      if (pop) a.push($(s, '.heart').animate([{ transform: 'scale(1)' }, { transform: 'scale(1.38)', offset: 0.4 }, { transform: 'scale(.94)', offset: 0.75 }, { transform: 'scale(1)' }], { duration: 340, delay: T0, easing: 'ease-out', fill: 'both' }));
      return a;
    }
    motionLab(host, ctx, {
      layout: 'cols', height: 150, frames: 6,
      lanes: [
        { label: 'Primary only: fill + number swap', interactive: true, html: html('without secondary action'),
          build: function (s) {
            return primary(s, false).concat([
              $(s, '.old').animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1, delay: T0, fill: 'both' }),
              $(s, '.new').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1, delay: T0, fill: 'both' }),
              $(s, '.like').animate([{ opacity: 1 }, { opacity: 1 }], { duration: 750, fill: 'both' })
            ]);
          } },
        { with: true, label: 'Pop + burst + rolling count', interactive: true, html: html('with secondary action'),
          build: function (s) {
            var a = primary(s, true);
            $$(s, '.particle').forEach(function (pt, i) {
              var ang = i / 8 * Math.PI * 2, r = 26;
              a.push(pt.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: 'translate(' + Math.cos(ang) * r + 'px,' + Math.sin(ang) * r + 'px) scale(0)', opacity: 0 }], { duration: 520, delay: T0 + 70, easing: 'cubic-bezier(0,0,.2,1)', fill: 'both' }));
            });
            a.push($(s, '.old').animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-18px)', opacity: 0 }], { duration: 300, delay: T0 + 90, easing: 'ease-in', fill: 'both' }));
            a.push($(s, '.new').animate([{ transform: 'translateY(18px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 300, delay: T0 + 90, easing: 'ease-out', fill: 'both' }));
            return a;
          } }
      ],
      afterRender: function (s, L, api) { $(s, '.like').addEventListener('click', function () { api.play(); }); }
    });
  });

  /* ux-09 Snappy timing */
  register('ux-09', function (host, ctx) {
    var HOLD = 700;
    var html = '<button type="button" class="dd-btn">Menu &#9662;</button><div class="dd"><div></div><div></div><div></div><div></div></div>';
    function menu(s, d, ease) {
      var total = d + HOLD + d * 0.75, a = d / total, b = (d + HOLD) / total;
      return [$(s, '.dd').animate([
        { offset: 0, opacity: 0, transform: 'translateY(-6px) scaleY(.7)', easing: ease },
        { offset: a, opacity: 1, transform: 'none' },
        { offset: b, opacity: 1, transform: 'none', easing: 'cubic-bezier(.4,0,1,1)' },
        { offset: 1, opacity: 0, transform: 'translateY(-4px) scaleY(.85)' }
      ], { duration: total, fill: 'both' })];
    }
    function feel(ms) { return ms <= 100 ? 'instant' : ms <= 300 ? 'snappy' : ms <= 500 ? 'noticeable' : 'sluggish'; }
    motionLab(host, ctx, {
      layout: 'cols', height: 170, frames: 6,
      params: [{ key: 'd', label: 'Snappy duration', min: 60, max: 800, step: 10, value: 160, unit: 'ms' }],
      lanes: [
        { label: 'Sluggish · 700ms ease-in-out', interactive: true, html: html, build: function (s) { return menu(s, 700, 'cubic-bezier(.42,0,.58,1)'); } },
        { with: true, label: function (p) { return 'Snappy · ' + p.d + 'ms ease-out'; }, interactive: true, html: html, build: function (s, p) { return menu(s, p.d, 'cubic-bezier(0,0,.2,1)'); } }
      ],
      afterRender: function (s, L, api) {
        var b = $(s, '.dd-btn'); b.setAttribute('aria-label', 'Open menu: replay ' + (L.def.with ? 'snappy' : 'sluggish') + ' timing');
        b.addEventListener('click', function () { api.play(); });
      },
      onBuild: function (p, api) { api.readout.innerHTML = p.d + 'ms reads as <strong>' + feel(p.d) + '</strong>. Typical small-element range: 100–200ms; menus and dialogs: 200–300ms. Exit is 75% of entry.'; }
    });
  });

  /* ux-10 Exaggerated feedback */
  register('ux-10', function (host, ctx) {
    var html = '<div class="pw"><div class="field"><span>&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;</span><span class="err-icon" style="margin-left:auto;opacity:0">!</span></div><div class="err"><span class="err-icon">!</span>Incorrect password. Try again or reset it.</div></div>';
    var T0 = 200;
    motionLab(host, ctx, {
      layout: 'rows', height: 96, frames: 7,
      params: [{ key: 'amp', label: 'Shake amplitude', min: 0, max: 18, value: 10, unit: 'px' }],
      lanes: [
        { label: 'Subtle: border tint only', html: html, alt: 'After submit, the password field border turns faintly pink. Nothing else changes.',
          build: function (s) { return [$(s, '.field').animate([{ borderColor: cssVar('--line') || '#ddd' }, { borderColor: 'rgba(214,120,110,.55)' }], { duration: 200, delay: T0, fill: 'both' })]; } },
        { with: true, label: function (p) { return 'Shake ' + p.amp + 'px + colour + icon + message'; }, html: html, alt: 'After submit, the field shakes, its border turns red, and an error icon and message appear.',
          build: function (s, p) {
            var A = p.amp, bad = cssVar('--bad') || '#b42318';
            return [
              $(s, '.field').animate([{ transform: 'translateX(0)' }, { transform: 'translateX(' + (-A) + 'px)' }, { transform: 'translateX(' + A + 'px)' }, { transform: 'translateX(' + (-A * 0.6) + 'px)' }, { transform: 'translateX(' + (A * 0.6) + 'px)' }, { transform: 'translateX(' + (-A * 0.25) + 'px)' }, { transform: 'translateX(0)' }], { duration: 460, delay: T0, easing: 'ease-in-out', fill: 'both' }),
              $(s, '.field').animate([{ borderColor: cssVar('--line') || '#ddd' }, { borderColor: bad }], { duration: 120, delay: T0, fill: 'both' }),
              $(s, '.field .err-icon').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120, delay: T0, fill: 'both' }),
              $(s, '.err').animate([{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], { duration: 200, delay: T0 + 60, fill: 'both' }),
              $(s, '.pw').animate([{ opacity: 1 }, { opacity: 1 }], { duration: 900, fill: 'both' })
            ];
          } }
      ],
      onBuild: function (p, api) { api.readout.textContent = 'With reduced motion, the shake should be removed. The red border, the icon and the message still carry the error.'; }
    });
  });

  /* ux-11 Solid 3D models */
  register('ux-11', function (host, ctx) {
    function html(kind) {
      return function (p) {
        return '<div class="shadow"></div><div class="scene ' + kind + '" style="perspective:' + p.persp + 'px"><div class="flip"><div class="face front">A&#9824;</div><div class="face back">Back</div></div></div>';
      };
    }
    motionLab(host, ctx, {
      layout: 'cols', height: 180, frames: 7,
      params: [{ key: 'persp', label: 'Perspective', min: 200, max: 1600, step: 50, value: 600, unit: 'px' }],
      lanes: [
        { label: 'Flat: scaleX fake', html: html('flat'), alt: 'A card squashes to a thin line horizontally, then expands showing its back. No depth.',
          build: function (s) {
            return [
              $(s, '.flip').animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)', offset: 0.5 }, { transform: 'scaleX(1)' }], { duration: 1000, easing: 'ease-in-out', fill: 'both' }),
              $(s, '.front').animate([{ opacity: 1 }, { opacity: 1, offset: 0.5 }, { opacity: 0, offset: 0.501 }, { opacity: 0 }], { duration: 1000, fill: 'both' }),
              $(s, '.back').animate([{ opacity: 0 }, { opacity: 0, offset: 0.5 }, { opacity: 1, offset: 0.501 }, { opacity: 1 }], { duration: 1000, fill: 'both' })
            ];
          } },
        { with: true, label: function (p) { return '3D: rotateY, perspective ' + p.persp + 'px'; }, html: html('td'), alt: 'A card rotates through space in perspective, lifting toward the viewer; its shadow shrinks and fades as it rises.',
          build: function (s) {
            return [
              $(s, '.flip').animate([{ transform: 'translateZ(0) rotateY(0deg)' }, { transform: 'translateZ(40px) rotateY(90deg)', offset: 0.5 }, { transform: 'translateZ(0) rotateY(180deg)' }], { duration: 1000, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' }),
              $(s, '.shadow').animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.65)', opacity: 0.45, offset: 0.5 }, { transform: 'scale(1)', opacity: 1 }], { duration: 1000, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' })
            ];
          } }
      ]
    });
  });

  /* ux-12 Consistency */
  register('ux-12', function (host, ctx) {
    var texts = ['Payment received', 'New follower: Sam', 'Backup complete'];
    function html(kind) { return '<div class="' + kind + '" style="position:absolute;inset:0">' + texts.map(function (t) { return '<div class="note"><b></b>' + t + '</div>'; }).join('') + '</div>'; }
    motionLab(host, ctx, {
      layout: 'cols', height: 165, frames: 7,
      lanes: [
        { label: 'Mixed timing, easing and style', html: html('before'), alt: 'Three notifications enter with different speeds, bounces and visual styles.',
          build: function (s) {
            var n = $$(s, '.note');
            return [
              n[0].animate([{ opacity: 0, transform: 'translateX(-60px)' }, { opacity: 1, transform: 'none' }], { duration: 120, delay: 0, easing: 'linear', fill: 'both' }),
              n[1].animate([{ opacity: 0, transform: 'translateY(-30px) scale(.6)' }, { opacity: 1, transform: 'none' }], { duration: 650, delay: 380, easing: 'cubic-bezier(.5,1.9,.5,.7)', fill: 'both' }),
              n[2].animate([{ opacity: 0, transform: 'scale(.4) rotate(-6deg)' }, { opacity: 1, transform: 'none' }], { duration: 350, delay: 90, easing: 'ease-in', fill: 'both' })
            ];
          } },
        { with: true, label: 'One token set: 240ms ease-out, 60ms stagger', html: html('after'), alt: 'Three matching notifications rise gently into place one after another with identical timing.',
          build: function (s) {
            return $$(s, '.note').map(function (nn, i) {
              return nn.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 240, delay: 120 + i * 60, easing: 'cubic-bezier(0,0,.2,1)', fill: 'both' });
            }).concat([$(s, '.after').animate([{ opacity: 1 }, { opacity: 1 }], { duration: 1030, fill: 'both' })]);
          } }
      ]
    });
  });

  /* ================================================================ 13–20 UX LAWS */

  /* ux-13 Fitts's law */
  register('ux-13', function (host) {
    var A = 150, B = 150; // illustrative constants (ms, ms/bit)
    var state = { W: 24, D: 380, active: false, t0: 0, misses: 0, trials: [] };
    var wrap = el('<div class="lab"></div>');
    var arena = el('<div class="arena" aria-label="Target acquisition arena"></div>');
    var start = el('<button type="button" class="f-start">Start</button>');
    var target = el('<button type="button" class="f-target" disabled aria-label="Target">&#9675;</button>');
    var line = el('<div class="dist-line" aria-hidden="true"></div>');
    arena.append(line, start, target);
    var ctl = el('<div class="controls"></div>');
    var wC = control({ label: 'Target size W', min: 12, max: 100, value: state.W, unit: 'px' }, function (v) { state.W = v; layout(); });
    var dC = control({ label: 'Distance D', min: 80, max: 600, step: 10, value: state.D, unit: 'px' }, function (v) { state.D = v; layout(); });
    var hard = btn('Before: small &amp; far', 'small'), easy = btn('After: big &amp; near', 'small'), reset = btn('Clear trials', 'small');
    ctl.append(wC.node, dC.node, hard, easy, reset);
    var info = el('<p class="readout" role="status" aria-live="polite"></p>');
    var table = el('<table class="trials"><caption class="visually-hidden">Recent trials</caption><thead><tr><th scope="col">#</th><th scope="col">W</th><th scope="col">D</th><th scope="col">ID (bits)</th><th scope="col">Predicted</th><th scope="col">Measured</th><th scope="col">Misses</th></tr></thead><tbody></tbody></table>');
    var plot = el('<svg class="plot" viewBox="0 0 320 130" width="100%" height="130" role="img" aria-label="Plot of measured time against index of difficulty"></svg>');
    var row = el('<div style="display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:10px;align-items:start"></div>');
    row.append(table, plot);
    wrap.append(arena, ctl, info, row);
    host.append(wrap);

    function effD() { var maxD = (arena.clientWidth || 520) - 20 - 28 - state.W / 2 - 10; return Math.max(40, Math.min(state.D, maxD)); }
    function id(D, W) { return Math.log2(D / W + 1); }
    function layout() {
      var H = arena.clientHeight || 200, D = effD(), W = state.W, cx = 20 + 28;
      start.style.left = '20px'; start.style.top = (H / 2 - 28) + 'px';
      target.style.width = W + 'px'; target.style.height = W + 'px';
      target.style.left = (cx + D - W / 2) + 'px'; target.style.top = (H / 2 - W / 2) + 'px';
      target.style.fontSize = Math.max(8, W * 0.5) + 'px';
      line.style.left = cx + 'px'; line.style.width = D + 'px'; line.style.top = (H / 2) + 'px';
      var I = id(D, W);
      info.innerHTML = 'D = ' + Math.round(D) + 'px, W = ' + W + 'px → ID = log2(D/W + 1) = <strong>' + I.toFixed(2) + ' bits</strong> → predicted ≈ ' + Math.round(A + B * I) + 'ms <span title="Illustrative constants a=150ms, b=150ms/bit">(illustrative a, b)</span>. ' +
        (state.active ? '<strong>Go: click the target.</strong>' : 'Press Start, then hit the target as fast as you can.');
    }
    function draw() {
      var pts = state.trials.map(function (t) {
        var x = 30 + t.id / 7 * 280, y = 115 - Math.min(t.ms, 2000) / 2000 * 105;
        return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="4" fill="' + (t.kbd ? 'none' : (cssVar('--actor') || '#f05a28')) + '" stroke="' + (cssVar('--actor') || '#f05a28') + '"/>';
      }).join('');
      var pred = 'M30,' + (115 - A / 2000 * 105) + ' L310,' + (115 - (A + B * 7) / 2000 * 105);
      plot.innerHTML = '<path d="M30,10 V115 H310" stroke="currentColor" stroke-opacity=".4" fill="none"/>' +
        '<path d="' + pred + '" stroke="' + (cssVar('--accent') || '#4f46e5') + '" stroke-dasharray="4 4" fill="none"/>' + pts +
        '<text x="300" y="127" font-size="9" fill="currentColor" text-anchor="end">ID (bits) 0–7 →</text><text x="4" y="12" font-size="9" fill="currentColor">ms</text><text x="34" y="20" font-size="9" fill="currentColor">2000</text>' +
        '<text x="200" y="' + (110 - (A + B * 5) / 2000 * 105) + '" font-size="9" fill="currentColor">predicted</text>';
      var tb = $(table, 'tbody');
      tb.innerHTML = state.trials.slice(-6).reverse().map(function (t) {
        return '<tr><td>' + t.n + (t.kbd ? ' ⌨' : '') + '</td><td>' + t.W + '</td><td>' + Math.round(t.D) + '</td><td>' + t.id.toFixed(2) + '</td><td>' + Math.round(A + B * t.id) + '</td><td>' + Math.round(t.ms) + '</td><td>' + t.miss + '</td></tr>';
      }).join('') || '<tr><td colspan="7">No trials yet</td></tr>';
    }
    start.addEventListener('click', function (e) {
      e.stopPropagation();
      state.active = true; state.misses = 0; state.t0 = now(); target.disabled = false; layout();
    });
    target.addEventListener('click', function (e) {
      e.stopPropagation();
      if (!state.active) return;
      var ms = now() - state.t0, D = effD();
      state.active = false; target.disabled = true;
      state.trials.push({ n: state.trials.length + 1, W: state.W, D: D, id: id(D, state.W), ms: ms, miss: state.misses, kbd: e.detail === 0 });
      draw(); layout();
      info.innerHTML += ' Last: <strong>' + Math.round(ms) + 'ms</strong>' + (e.detail === 0 ? ' (keyboard: not a pointing time)' : '') + '.';
      start.focus();
    });
    arena.addEventListener('click', function () { if (state.active) { state.misses += 1; } });
    hard.addEventListener('click', function () { state.W = 14; state.D = 600; wC.input.value = 14; dC.input.value = 600; wC.input.dispatchEvent(new Event('input')); dC.input.dispatchEvent(new Event('input')); });
    easy.addEventListener('click', function () { state.W = 80; state.D = 120; wC.input.value = 80; dC.input.value = 120; wC.input.dispatchEvent(new Event('input')); dC.input.dispatchEvent(new Event('input')); });
    reset.addEventListener('click', function () { state.trials = []; draw(); });
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(layout).observe(arena);
    layout(); draw();
    return {};
  });

  /* ux-14 Bigger hit areas */
  register('ux-14', function (host) {
    var ICONS = {
      star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
      heart: '<path d="M12 20s-7-4.4-9.3-8.7C1.2 8.2 3 4.8 6.4 4.8c2 0 3.2 1.1 4 2.3h1.2c.8-1.2 2-2.3 4-2.3 3.4 0 5.2 3.4 3.7 6.5C19 15.6 12 20 12 20z"/>',
      bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20h4"/>',
      trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
      gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>'
    };
    var names = Object.keys(ICONS);
    var hitAfter = 44, PITCH = 48;
    var panels = compare(host, 'Hit area = icon (16px)', 'Same 16px icon, invisible hit area enlarged');
    var ctl = el('<div class="controls"></div>');
    var rev = control({ type: 'checkbox', label: 'Reveal hit areas', value: false }, function (v) { panels.node.classList.toggle('reveal', v); });
    var hc = control({ label: '“After” hit area', min: 16, max: 64, value: hitAfter, unit: 'px' }, function (v) { hitAfter = v; apply(); });
    ctl.append(rev.node, hc.node);
    var warn = el('<p class="readout" role="status" aria-live="polite"></p>');
    host.append(ctl, warn);

    function bar(hit) {
      var s = { hit: hit, target: pick(names), hits: 0, misses: 0, wrong: 0 };
      var box = el('<div></div>');
      var task = el('<p class="task"></p>');
      var tb = el('<div class="toolbar-demo" style="--hit:' + hit + 'px"></div>');
      names.forEach(function (n) { tb.append(el('<button type="button" class="icon-btn" data-n="' + n + '" aria-label="' + n + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true">' + ICONS[n] + '</svg></button>')); });
      var score = el('<p class="readout" aria-live="polite"></p>');
      function paint() {
        $$(tb, '.icon-btn').forEach(function (b) { b.classList.toggle('is-target', b.dataset.n === s.target); });
        task.innerHTML = 'Click the <strong>' + s.target + '</strong> icon (highlighted).';
        score.innerHTML = 'Visible icon 16×16px · hit area <strong>' + s.hit + '×' + s.hit + 'px</strong><br>Hits <span class="good">' + s.hits + '</span> · misses <span class="bad">' + s.misses + '</span> · wrong icon <span class="bad">' + s.wrong + '</span>';
      }
      tb.addEventListener('click', function (e) {
        var b = e.target.closest('.icon-btn');
        if (!b) s.misses += 1;
        else if (b.dataset.n !== s.target) s.wrong += 1;
        else { s.hits += 1; var next = names.filter(function (n) { return n !== s.target; }); s.target = pick(next); }
        paint();
      });
      box.append(task, tb, score);
      s.box = box; s.tb = tb; s.paint = paint;
      paint();
      return s;
    }
    var before = bar(16), after = bar(hitAfter);
    panels.before.append(before.box); panels.after.append(after.box);
    function apply() {
      after.hit = hitAfter; after.tb.style.setProperty('--hit', hitAfter + 'px'); after.paint();
      warn.innerHTML = hitAfter > PITCH ? '<span class="bad">Overlap: icons sit 48px apart, so a ' + hitAfter + 'px hit area spills into its neighbour and taps land on the wrong icon.</span>' :
        hitAfter >= 44 ? '<span class="good">≥ 44px: meets WCAG 2.5.5 (AAA) and Apple’s 44pt guidance, with no overlap.</span>' :
        hitAfter >= 24 ? '24–43px: meets WCAG 2.2 SC 2.5.8 (AA) minimum.' : '<span class="bad">Below 24px: fails WCAG 2.2 SC 2.5.8 (AA) unless spacing compensates.</span>';
    }
    apply();
    return {};
  });

  /* ux-15 Hick's law */
  register('ux-15', function (host) {
    var FREQ = ['Share link', 'Export as PDF', 'Duplicate'];
    var RARE = [
      ['Export as PNG', 'Export'], ['Export as CSV', 'Export'], ['Download offline', 'Export'], ['Print', 'Export'], ['Publish to web', 'Export'], ['Embed code', 'Export'],
      ['Rename', 'Organise'], ['Move to folder', 'Organise'], ['Add to favourites', 'Organise'], ['Add shortcut', 'Organise'], ['Archive', 'Organise'], ['Lock file', 'Organise'], ['Restore', 'Organise'], ['Delete', 'Organise'],
      ['Request access', 'Sharing'], ['Transfer ownership', 'Sharing'], ['Notification settings', 'Sharing'], ['Copy for a colleague', 'Sharing'],
      ['Version history', 'Other'], ['Compare versions', 'Other'], ['Show details', 'Other'], ['Word count', 'Other'], ['Page setup', 'Other'], ['Translate', 'Other'], ['Report a problem', 'Other'], ['Keyboard shortcuts', 'Other'], ['Accessibility check', 'Other']
    ];
    var N = 18, includeRare = false;
    var ctl = el('<div class="controls"></div>');
    var nC = control({ label: 'Options in flat list', min: 6, max: 30, value: N }, function (v) { N = v; });
    var rC = control({ type: 'checkbox', label: 'Sometimes ask for a rare action', value: false }, function (v) { includeRare = v; });
    ctl.append(nC.node, rC.node);
    host.append(ctl);
    var panels = compare(host, 'Flat list of every option', '3 frequent options + “More”');
    function pred(n) { return Math.round(200 + 150 * Math.log2(n + 1)); }

    function trial(body, kind) {
      var s = { running: false };
      var startB = btn('Start trial', 'primary small');
      var task = el('<p class="task">Press start, then click the requested action.</p>');
      var area = el('<div></div>');
      var out = el('<p class="readout" role="status" aria-live="polite"></p>');
      body.append(startB, task, area, out);
      function finish(ok, label) {
        if (!s.running) return;
        if (!ok) { s.wrong += 1; return; }
        s.running = false;
        var ms = now() - s.t0;
        out.innerHTML = 'Found “' + esc(label) + '” in <strong>' + Math.round(ms) + 'ms</strong>, ' + s.wrong + ' wrong click(s), ' + s.clicks + ' click(s) total.';
        area.innerHTML = '';
        startB.focus();
      }
      function opt(label, cls) {
        var b = btn(esc(label), 'opt ' + (cls || ''));
        b.addEventListener('click', function () { s.clicks += 1; finish(label === s.goal, label); });
        return b;
      }
      startB.addEventListener('click', function () {
        var rarePool = RARE.slice(0, Math.max(0, N - 3));
        s.goal = includeRare && rarePool.length && Math.random() < 0.4 ? pick(rarePool)[0] : pick(FREQ);
        s.running = true; s.wrong = 0; s.clicks = 0;
        task.innerHTML = 'Find: <strong>' + esc(s.goal) + '</strong>';
        area.innerHTML = '';
        if (kind === 'flat') {
          var grid = el('<div class="options"></div>');
          shuffle(FREQ.concat(rarePool.map(function (r) { return r[0]; }))).forEach(function (l) { grid.append(opt(l)); });
          area.append(grid);
          out.textContent = N + ' options at once. Hick–Hyman estimate ≈ ' + pred(N) + 'ms (illustrative), plus scanning time.';
        } else {
          var top = el('<div class="options"></div>');
          FREQ.forEach(function (l, i) { top.append(opt(l, 'big' + (i === 0 ? ' rec' : ''))); });
          var more = btn('More options (' + rarePool.length + ') &#9662;', 'opt', 'aria-expanded="false"');
          var drawer = el('<div hidden></div>');
          var groups = {};
          rarePool.forEach(function (r) { (groups[r[1]] = groups[r[1]] || []).push(r[0]); });
          Object.keys(groups).forEach(function (g) {
            var sec = el('<div class="more-group"><h4>' + g + '</h4><div class="options"></div></div>');
            groups[g].forEach(function (l) { $(sec, '.options').append(opt(l)); });
            drawer.append(sec);
          });
          more.addEventListener('click', function () { s.clicks += 1; var open = drawer.hidden; drawer.hidden = !open; more.setAttribute('aria-expanded', String(open)); });
          top.append(more);
          area.append(top, drawer);
          out.textContent = '4 choices first (≈ ' + pred(4) + 'ms, illustrative). A rare action costs one extra click.';
        }
        s.t0 = now();
        var first = area.querySelector('button'); if (first) first.focus();
      });
    }
    trial(panels.before, 'flat');
    trial(panels.after, 'grouped');
    return {};
  });

  /* ux-16 Miller's law */
  register('ux-16', function (host) {
    var secs = 3;
    var ctl = el('<div class="controls"></div>');
    ctl.append(control({ label: 'Show code for', min: 1, max: 8, value: secs, unit: 's' }, function (v) { secs = v; }).node);
    host.append(ctl);
    var panels = compare(host, '12 digits, unchunked', 'Same length, 3 chunks of 4');
    function digits() { var s = ''; for (var i = 0; i < 12; i++) s += Math.floor(Math.random() * 10); return s; }
    function test(body, chunked) {
      var code = '', timer = 0;
      var show = btn('Show code', 'primary small'), hide = btn('Hide now', 'small');
      var disp = el('<div class="code' + (chunked ? ' chunked' : '') + '" aria-live="polite">––––</div>');
      var id = nid('mem');
      var lab = el('<label for="' + id + '" class="ctl">Type it back</label>');
      var inp = el('<input class="text-in" id="' + id + '" inputmode="numeric" autocomplete="off" disabled>');
      var check = btn('Check', 'small');
      var out = el('<p class="readout" role="status" aria-live="polite"></p>');
      var row = el('<div class="controls"></div>'); row.append(show, hide);
      var row2 = el('<div class="controls"></div>'); row2.append(check);
      body.append(row, disp, lab, inp, row2, out);
      function conceal() { clearTimeout(timer); if (!code) return; disp.textContent = 'Hidden. Type it back below.'; inp.disabled = false; inp.focus(); }
      show.addEventListener('click', function () {
        code = digits(); inp.value = ''; inp.disabled = true; out.textContent = '';
        disp.textContent = chunked ? code.replace(/(\d{4})(?=\d)/g, '$1 ') : code;
        clearTimeout(timer); timer = setTimeout(conceal, secs * 1000);
      });
      hide.addEventListener('click', conceal);
      function score() {
        if (!code) return;
        var got = inp.value.replace(/\D/g, ''), ok = 0;
        for (var i = 0; i < 12; i++) if (got[i] === code[i]) ok += 1;
        out.innerHTML = '<strong>' + ok + '/12</strong> digits in the right position. Code was ' + code.replace(/(\d{4})(?=\d)/g, '$1 ') + '.';
      }
      check.addEventListener('click', score);
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') score(); });
    }
    test(panels.before, false);
    test(panels.after, true);
    host.append(el('<p class="readout">Input ignores spaces and dashes in both panels. Accept unchunked input; chunk only the display.</p>'));
    return {};
  });

  /* ux-17 Doherty threshold */
  register('ux-17', function (host) {
    var latency = 1500;
    var ctl = el('<div class="controls"></div>');
    var th = el('<div class="thresh" aria-hidden="true" style="flex:1;min-width:200px"><span style="left:4px">0</span><span style="left:calc(13.33% + 4px)">400ms threshold</span><span style="right:4px">3s</span><div class="mark"></div></div>');
    ctl.append(control({ label: 'Simulated server latency', min: 0, max: 3000, step: 50, value: latency, unit: 'ms' }, function (v) { latency = v; mark(); }).node, th);
    host.append(ctl);
    function mark() { $(th, '.mark').style.left = 'calc(' + (latency / 3000 * 100) + '% - 1px)'; }
    mark();
    var panels = compare(host, 'No feedback until the result', 'Instant acknowledgement + skeleton');
    function panel(body, instant) {
      var b = btn('Save document', 'save-btn primary');
      var list = el('<div class="inbox" aria-live="polite"></div>');
      var out = el('<p class="readout" role="status" aria-live="polite">Click Save.</p>');
      var row = el('<div class="save-row"></div>'); row.append(b);
      body.append(row, list, out);
      var pending = false, extra = 0, n = 0;
      b.addEventListener('click', function () {
        if (pending) { extra += 1; out.innerHTML = 'Still waiting… you clicked <strong>' + extra + '</strong> extra time(s).'; return; }
        pending = true; extra = 0; n += 1;
        var t0 = now(), firstFeedback = null;
        if (instant) {
          b.dataset.busy = 'true';
          b.innerHTML = '<span class="spinner" aria-hidden="true"></span> Saving…';
          var sk = el('<div class="skeleton" aria-label="Saving"></div>');
          list.prepend(sk);
          requestAnimationFrame(function () { firstFeedback = now() - t0; out.innerHTML = 'Acknowledged in <strong>' + Math.round(firstFeedback) + 'ms</strong>. Waiting for server…'; });
        }
        setTimeout(function () {
          var total = now() - t0;
          if (firstFeedback === null) firstFeedback = total;
          var sk2 = $(list, '.skeleton'); if (sk2) sk2.remove();
          list.prepend(el('<div class="doc-row">&#10003; Draft v' + n + ' saved</div>'));
          b.dataset.busy = 'false'; b.innerHTML = 'Save document';
          out.innerHTML = 'First feedback: <strong class="' + (firstFeedback <= 400 ? 'good' : 'bad') + '">' + Math.round(firstFeedback) + 'ms</strong> · result: ' + Math.round(total) + 'ms' + (extra ? ' · ' + extra + ' extra click(s) while waiting' : '');
          pending = false;
        }, latency);
      });
    }
    panel(panels.before, false);
    panel(panels.after, true);
    return {};
  });

  /* ux-18 Postel's law */
  register('ux-18', function (host) {
    var MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    function valid(y, m, d) { var dt = new Date(y, m - 1, d); return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d ? dt : null; }
    function strict(s) { var m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s); return m ? valid(+m[3], +m[2], +m[1]) : null; }
    function lenient(raw) {
      var s = raw.toLowerCase().trim().replace(/,/g, ' ').replace(/(\d+)(st|nd|rd|th)\b/g, '$1').replace(/\s+/g, ' ');
      var today = new Date(); today.setHours(0, 0, 0, 0);
      var rel = { today: 0, tomorrow: 1, yesterday: -1 };
      if (s in rel) { var t = new Date(today); t.setDate(t.getDate() + rel[s]); return { date: t, note: 'relative' }; }
      var m, yr = function (y) { y = +y; return y < 100 ? 2000 + y : y; };
      if ((m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(s))) return { date: valid(+m[1], +m[2], +m[3]), note: 'ISO order' };
      if ((m = /^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2}|\d{4})$/.exec(s))) return { date: valid(yr(m[3]), +m[2], +m[1]), note: +m[1] <= 12 && +m[2] <= 12 && m[1] !== m[2] ? 'ambiguous: read day-first (en-GB)' : 'day-first' };
      if ((m = /^(\d{2})(\d{2})(\d{4})$/.exec(s))) return { date: valid(+m[3], +m[2], +m[1]), note: 'DDMMYYYY' };
      var mi = function (w) { return MONTHS.indexOf(w.slice(0, 3)) + 1; };
      if ((m = /^(\d{1,2}) ([a-z]+)(?: (\d{2}|\d{4}))?$/.exec(s)) && mi(m[2])) return { date: valid(m[3] ? yr(m[3]) : today.getFullYear(), mi(m[2]), +m[1]), note: m[3] ? '' : 'year assumed' };
      if ((m = /^([a-z]+) (\d{1,2})(?: (\d{2}|\d{4}))?$/.exec(s)) && mi(m[1])) return { date: valid(m[3] ? yr(m[3]) : today.getFullYear(), mi(m[1]), +m[2]), note: m[3] ? '' : 'year assumed' };
      return { date: null };
    }
    var SAMPLES = ['12/03/2026', '12/3/2026', '2026-03-12', '12 Mar 2026', 'March 12, 2026', '12th march', '12.03.26', 'tomorrow', '03/04/2026'];
    var chips = el('<div class="chips" role="group" aria-label="Sample inputs"></div>');
    var tally = el('<p class="readout" role="status" aria-live="polite"></p>');
    host.append(el('<p class="readout">Try a sample, or type your own in either field:</p>'), chips);
    var panels = compare(host, 'Strict: DD/MM/YYYY only', 'Lenient: parse, normalise, confirm');
    host.append(tally);
    var tried = {};
    function field(body, label) {
      var id = nid('date');
      body.append(el('<label class="ctl" for="' + id + '">' + label + '</label>'));
      var inp = el('<input class="text-in" id="' + id + '" autocomplete="off" aria-describedby="' + id + '-m">');
      var msg = el('<p class="interp" id="' + id + '-m" aria-live="polite"></p>');
      body.append(inp, msg);
      return { inp: inp, msg: msg };
    }
    var A = field(panels.before, 'Date (DD/MM/YYYY)'), B = field(panels.after, 'Date');
    var fmt = function (d) { return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); };
    function runA() {
      var v = A.inp.value.trim(), d = strict(v);
      A.inp.setAttribute('aria-invalid', String(!!v && !d)); A.inp.dataset.ok = String(!!d);
      A.msg.innerHTML = !v ? '' : d ? '<span class="good">&#10003; Accepted</span>' : '<span class="bad">&#10007; Invalid format. Use DD/MM/YYYY.</span>';
      return !!d;
    }
    function runB() {
      var v = B.inp.value.trim(), r = lenient(v);
      B.inp.setAttribute('aria-invalid', String(!!v && !r.date)); B.inp.dataset.ok = String(!!r.date);
      B.msg.innerHTML = !v ? '' : r.date ? '<span class="good">&#10003; ' + fmt(r.date) + '</span>' + (r.note ? ' <span class="bad" style="color:var(--warn)">(' + r.note + ')</span>' : '') : '<span class="bad">&#10007; Couldn’t read that date. Try “12 March 2026”.</span>';
      return !!r.date;
    }
    function paintTally() {
      var keys = Object.keys(tried), a = 0, b = 0;
      keys.forEach(function (k) { if (tried[k][0]) a++; if (tried[k][1]) b++; });
      tally.innerHTML = keys.length ? 'Samples tried: ' + keys.length + ' · strict accepted <strong>' + a + '</strong> · lenient accepted <strong>' + b + '</strong>' : '';
    }
    SAMPLES.forEach(function (s) {
      var c = btn(esc(s), 'small');
      c.addEventListener('click', function () { A.inp.value = s; B.inp.value = s; tried[s] = [runA(), runB()]; paintTally(); });
      chips.append(c);
    });
    A.inp.addEventListener('input', runA); B.inp.addEventListener('input', runB);
    return {};
  });

  /* ux-19 Jakob's law */
  register('ux-19', function (host) {
    var svg = {
      cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 4h2l2.4 10.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="10" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></svg>',
      gem: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3l7 9-7 9-7-9z"/></svg>',
      search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/></svg>'
    };
    var TASKS = [{ role: 'cart', text: 'Open the shopping cart' }, { role: 'search', text: 'Search for a product' }, { role: 'home', text: 'Go to the home page' }];
    var panels = compare(host, 'Novel layout', 'Conventional layout');
    var B_SITE = '<div class="site"><div class="bar" style="bottom:0;border-top:1px solid var(--line)">' +
      '<button data-r="x">Lookbook</button><button data-r="x">Journal</button><button data-r="search">Explore</button>' +
      '<button data-r="cart" aria-label="Bag">' + svg.gem + '</button><button data-r="home" class="logo" style="margin-left:auto">nūvo</button></div>' +
      '<div class="content" style="top:12px">' + '<div></div>'.repeat(6) + '</div></div>';
    var A_SITE = '<div class="site"><div class="bar" style="top:0;border-bottom:1px solid var(--line)">' +
      '<button data-r="home" class="logo">nūvo</button><button data-r="x">Shop</button><button data-r="x">Sale</button>' +
      '<button data-r="search" class="search">' + svg.search + ' Search</button>' +
      '<button data-r="cart" style="margin-left:auto">' + svg.cart + ' Cart</button></div>' +
      '<div class="content">' + '<div></div>'.repeat(6) + '</div></div>';
    function run(body, html) {
      var startB = btn('Start task', 'primary small');
      var task = el('<p class="task">Press start to get a task.</p>');
      var site = el(html);
      var out = el('<p class="readout" role="status" aria-live="polite"></p>');
      body.append(startB, task, site, out);
      var s = { running: false };
      startB.addEventListener('click', function () {
        s.goal = pick(TASKS); s.running = true; s.miss = 0; s.t0 = now();
        task.innerHTML = 'Task: <strong>' + s.goal.text + '</strong>';
        out.textContent = '';
        var first = site.querySelector('button'); if (first) first.focus();
      });
      site.addEventListener('click', function (e) {
        if (!s.running) return;
        var b = e.target.closest('button');
        if (!b || b.dataset.r !== s.goal.role) { s.miss += 1; out.textContent = 'Not that… (' + s.miss + ' miss)'; return; }
        s.running = false;
        out.innerHTML = 'Done in <strong>' + Math.round(now() - s.t0) + 'ms</strong> with ' + s.miss + ' wrong click(s).';
        startB.focus();
      });
    }
    run(panels.before, B_SITE);
    run(panels.after, A_SITE);
    return {};
  });

  /* ux-20 Frequency of use */
  register('ux-20', function (host) {
    var SUBJ = ['Invoice #2041 for November', 'Can we move Thursday’s call?', 'Draft deck: comments inside', 'Lunch next week?', 'Your order has shipped'];
    var RARE = ['Forward', 'Archive', 'Mark as unread', 'Move to…', 'Report spam', 'Delete'];
    var panels = compare(host, 'Reply hidden in the ⋯ menu', 'Reply promoted; rare actions stay in ⋯');
    function inbox(body, promoted) {
      var s = { clicks: 0, dist: 0, last: null, t0: 0, done: 0 };
      var reset = btn('Reset', 'small');
      var box = el('<div class="inbox"></div>');
      var out = el('<p class="readout" role="status" aria-live="polite">Task: reply to all 5 messages.</p>');
      body.append(box, out, reset);
      function closeMenus(except) { $$(box, '.menu').forEach(function (m) { if (m !== except) { m.hidden = true; m.previousElementSibling.setAttribute('aria-expanded', 'false'); } }); }
      function paint() {
        out.innerHTML = s.done === 5 ? 'All replied: <strong>' + s.clicks + ' clicks</strong>, ~' + Math.round(s.dist) + 'px pointer travel, ' + (s.t0 ? Math.round(now() - s.t0) : 0) + 'ms.' :
          'Replied ' + s.done + '/5 · clicks so far: <strong>' + s.clicks + '</strong> · pointer travel ~' + Math.round(s.dist) + 'px';
      }
      function reply(row) {
        if (row.classList.contains('done')) return;
        row.classList.add('done'); $(row, '.subj').textContent = '↩ Replied: ' + $(row, '.subj').dataset.s; s.done += 1; paint();
      }
      function build() {
        box.innerHTML = ''; s.clicks = 0; s.dist = 0; s.t0 = 0; s.done = 0; s.last = null;
        SUBJ.forEach(function (subj, i) {
          var row = el('<div class="msg"><span class="subj" data-s="' + esc(subj) + '">' + esc(subj) + '</span></div>');
          if (promoted) {
            var r = btn('Reply', 'small primary', 'aria-label="Reply to: ' + esc(subj) + '"');
            r.addEventListener('click', function () { reply(row); });
            row.append(r);
          }
          var mid = nid('menu');
          var more = btn('&#8943;', 'small', 'aria-haspopup="menu" aria-expanded="false" aria-controls="' + mid + '" aria-label="More actions for: ' + esc(subj) + '"');
          var menu = el('<div class="menu" role="menu" id="' + mid + '" hidden></div>');
          var items = promoted ? RARE : RARE.slice(0, 3).concat(['Reply']).concat(RARE.slice(3));
          items.forEach(function (it) {
            var mb = el('<button type="button" role="menuitem">' + esc(it) + '</button>');
            mb.addEventListener('click', function () { menu.hidden = true; more.setAttribute('aria-expanded', 'false'); if (it === 'Reply') reply(row); more.focus(); });
            menu.append(mb);
          });
          menu.addEventListener('keydown', function (e) {
            var list = $$(menu, 'button'), k = list.indexOf(document.activeElement);
            if (e.key === 'Escape') { menu.hidden = true; more.setAttribute('aria-expanded', 'false'); more.focus(); }
            if (e.key === 'ArrowDown') { e.preventDefault(); list[(k + 1) % list.length].focus(); }
            if (e.key === 'ArrowUp') { e.preventDefault(); list[(k - 1 + list.length) % list.length].focus(); }
          });
          more.addEventListener('click', function () {
            var open = menu.hidden; closeMenus(menu); menu.hidden = !open; more.setAttribute('aria-expanded', String(open));
            if (open) $(menu, 'button').focus();
          });
          row.append(more, menu);
          box.append(row);
        });
        paint();
      }
      body.addEventListener('click', function (e) { if (e.target === reset) return; s.clicks += 1; if (!s.t0) s.t0 = now(); if (!e.target.closest('.msg')) closeMenus(null); paint(); }, true);
      body.addEventListener('pointermove', function (e) { if (s.last && s.t0 && s.done < 5) s.dist += Math.hypot(e.clientX - s.last[0], e.clientY - s.last[1]); s.last = [e.clientX, e.clientY]; });
      reset.addEventListener('click', build);
      build();
    }
    inbox(panels.before, false);
    inbox(panels.after, true);
    return {};
  });

  /* ------------------------------------------------------------------ export */
  var api = { DEMOS: DEMOS, register: register };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.UX_DEMOS = DEMOS;
})(typeof window !== 'undefined' ? window : globalThis);
