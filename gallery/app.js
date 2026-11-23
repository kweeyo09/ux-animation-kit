/* Gallery shell: renders cards from the shared registry, mounts each demo by ID,
 * manages motion preference, filtering, navigation and the coverage count. */
(function () {
  'use strict';
  var REG = window.UX_REGISTRY || [];
  var DEMOS = window.UX_DEMOS || {};
  var root = document.documentElement;
  var mq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false, addEventListener: function () {} };

  /* ---------- motion preference ---------- */
  var pref = 'system';
  try { pref = localStorage.getItem('ux-motion-pref') || 'system'; } catch (e) { /* storage unavailable */ }
  var listeners = [];
  function reduced() { return pref === 'reduce' || (pref === 'system' && mq.matches); }
  function applyMotion() {
    root.dataset.reduced = String(reduced());
    document.querySelectorAll('#motion-pref button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === pref)); });
    listeners.forEach(function (fn) { try { fn(reduced()); } catch (e) { console.error(e); } });
  }
  document.querySelectorAll('#motion-pref button').forEach(function (b) {
    b.addEventListener('click', function () {
      pref = b.dataset.v;
      try { localStorage.setItem('ux-motion-pref', pref); } catch (e) { /* ignore */ }
      applyMotion();
    });
  });
  if (mq.addEventListener) mq.addEventListener('change', applyMotion);
  root.dataset.reduced = String(reduced());

  /* ---------- render ---------- */
  var main = document.getElementById('main');
  var jump = document.getElementById('jump');
  var apis = {};
  var mounted = [];
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var lastFamily = null;
  REG.forEach(function (e) {
    if (e.family !== lastFamily) {
      var gt = document.createElement('h2');
      gt.className = 'group-title'; gt.dataset.family = e.family;
      gt.textContent = e.family === 'motion' ? 'Animation principles · 1–12' : 'UX laws · 13–20';
      main.appendChild(gt);
      lastFamily = e.family;
    }
    var card = document.createElement('section');
    card.className = 'card';
    card.id = e.id;
    card.dataset.family = e.family;
    card.setAttribute('aria-labelledby', e.id + '-title');
    card.innerHTML =
      '<div class="card-head"><span class="card-num" aria-hidden="true">' + pad(e.num) + '</span>' +
      '<h2 id="' + e.id + '-title" tabindex="-1"><span class="visually-hidden">' + e.num + '. </span>' + esc(e.title) + '</h2>' +
      '<span class="tag">' + (e.family === 'motion' ? 'Motion' : 'UX law') + '</span></div>' +
      '<span class="card-id">' + e.id + '</span>' +
      '<p class="summary">' + esc(e.summary) + '</p>' +
      '<p class="notice"><strong>What to notice:</strong> ' + esc(e.notice) + '</p>' +
      (e.labelNote ? '<p class="label-note"><strong>Label unverified:</strong> ' + esc(e.labelNote) + '</p>' : '') +
      '<div class="demo" data-demo="' + e.id + '"></div>';
    main.appendChild(card);

    var li = document.createElement('li');
    li.innerHTML = '<a href="#' + e.id + '" data-id="' + e.id + '"><span class="n">' + pad(e.num) + '</span>' + esc(e.title) + '</a>';
    document.getElementById(e.family === 'motion' ? 'toc-list-motion' : 'toc-list-ux').appendChild(li);
    var op = document.createElement('option'); op.value = e.id; op.textContent = pad(e.num) + ' · ' + e.title; jump.appendChild(op);
  });

  /* mount each demo in isolation, so one failure cannot take down the others */
  REG.forEach(function (e) {
    var host = document.querySelector('[data-demo="' + e.id + '"]');
    var demo = DEMOS[e.id];
    try {
      if (!demo || typeof demo.mount !== 'function') throw new Error('No demo registered for ' + e.id);
      var ctx = {
        id: e.id, title: e.title,
        get reduced() { return reduced(); },
        onReducedChange: function (fn) { listeners.push(fn); }
      };
      apis[e.id] = demo.mount(host, ctx) || {};
      if (!host.children.length) throw new Error('Demo ' + e.id + ' rendered nothing');
      mounted.push(e.id);
    } catch (err) {
      console.error(err);
      host.innerHTML = '<p class="demo-error">Demo failed to load: ' + esc(err.message) + '</p>';
    }
  });

  /* ---------- coverage ---------- */
  var unique = REG.filter(function (e) { return document.querySelectorAll('[id="' + e.id + '"]').length === 1; }).map(function (e) { return e.id; });
  var ok = mounted.filter(function (id) { return unique.indexOf(id) !== -1; });
  var cov = document.getElementById('coverage');
  cov.textContent = ok.length + '/' + REG.length + ' demos';
  cov.dataset.ok = String(ok.length === REG.length && REG.length === 20);
  cov.title = ok.length === REG.length ? 'Every registry ID mounted exactly one demo' : 'Missing: ' + REG.filter(function (e) { return ok.indexOf(e.id) === -1; }).map(function (e) { return e.id; }).join(', ');
  window.UX_COVERAGE = { expected: REG.length, mounted: ok.length, ids: ok };

  /* ---------- filter ---------- */
  var filter = 'all';
  document.querySelectorAll('#filter button').forEach(function (b) {
    b.addEventListener('click', function () {
      filter = b.dataset.v;
      document.querySelectorAll('#filter button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      document.querySelectorAll('.card, .group-title').forEach(function (c) { c.hidden = filter !== 'all' && c.dataset.family !== filter; });
      document.querySelectorAll('.toc a').forEach(function (a) { a.parentNode.hidden = filter !== 'all' && document.getElementById(a.dataset.id).dataset.family !== filter; });
    });
  });

  /* ---------- navigation ---------- */
  function goTo(id) {
    var card = document.getElementById(id);
    if (!card) return;
    if (card.hidden) document.querySelector('#filter button[data-v="all"]').click();
    card.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
    document.getElementById(id + '-title').focus({ preventScroll: true });
    history.replaceState(null, '', '#' + id);
  }
  jump.addEventListener('change', function () { goTo(jump.value); });
  document.querySelectorAll('.toc a').forEach(function (a) {
    a.addEventListener('click', function (ev) { ev.preventDefault(); goTo(a.dataset.id); });
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.altKey || ev.ctrlKey || ev.metaKey) return;
    var t = ev.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    if (ev.key !== 'n' && ev.key !== 'p') return;
    var cards = Array.prototype.filter.call(document.querySelectorAll('.card'), function (c) { return !c.hidden; });
    var cur = t && t.closest ? t.closest('.card') : null;
    var idx = cur ? cards.indexOf(cur) : -1;
    if (idx === -1) { // nearest to the top of the viewport
      idx = 0; cards.forEach(function (c, i) { if (c.getBoundingClientRect().top < 120) idx = i; });
      if (ev.key === 'n' && cards[idx].getBoundingClientRect().top > 120) idx -= 1;
    }
    var next = ev.key === 'n' ? Math.min(cards.length - 1, idx + 1) : Math.max(0, idx - 1);
    ev.preventDefault();
    goTo(cards[next].id);
  });

  /* autoplay a motion demo once when it is mostly in view (never with reduced motion) */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = en.target.id;
        if (apis[id] && apis[id].autoplay) apis[id].autoplay();
        document.querySelectorAll('.toc a').forEach(function (a) { a.setAttribute('aria-current', String(a.dataset.id === id)); });
        jump.value = id;
      });
    }, { threshold: 0.6 });
    document.querySelectorAll('.card').forEach(function (c) { io.observe(c); });
  }

  applyMotion();
  if (location.hash && document.getElementById(location.hash.slice(1))) {
    setTimeout(function () { goTo(location.hash.slice(1)); }, 0);
  }
})();
