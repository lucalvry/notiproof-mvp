/* NotiProof widget runtime (spec v2)
 * Loads widget config + approved proofs, renders per widget.type,
 * and posts impression/interaction events to widget-track.
 */
(function () {
  "use strict";
  if (window.__notiproof_loaded) return;
  window.__notiproof_loaded = true;

  var script = document.currentScript || (function () {
    var s = document.getElementsByTagName("script");
    return s[s.length - 1];
  })();
  var BUSINESS = script.getAttribute("data-business");
  var WIDGET = script.getAttribute("data-widget") || null;
  if (!BUSINESS) return;

  var SUPABASE_URL = "https://ykpvxwwhhdzihjphlohh.supabase.co";
  var FN = SUPABASE_URL + "/functions/v1";

  var VISITOR = (function () {
    try {
      var k = "np_vid";
      var v = localStorage.getItem(k);
      if (!v) {
        v = (crypto.randomUUID && crypto.randomUUID()) ||
          (Date.now().toString(36) + Math.random().toString(36).slice(2));
        localStorage.setItem(k, v);
      }
      return v;
    } catch (_) { return null; }
  })();

  var state = { widget: null, proofs: [], idx: 0, root: null };

  function track(evt, proofId) {
    try {
      fetch(FN + "/widget-track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: BUSINESS,
          widget_id: state.widget && state.widget.id,
          proof_object_id: proofId || null,
          event_type: evt,
          visitor_id: VISITOR,
          page_url: location.href,
        }),
        keepalive: true,
      });
    } catch (_) {}
  }

  function fetchData() {
    var q = "?business=" + encodeURIComponent(BUSINESS) + (WIDGET ? "&widget=" + encodeURIComponent(WIDGET) : "");
    return fetch(FN + "/widget-render" + q).then(function (r) { return r.json(); });
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function injectStyles() {
    if (document.getElementById("np-style")) return;
    var css = '' +
      '.np-root{position:fixed;z-index:2147483600;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}' +
      '.np-pop{left:20px;bottom:20px;max-width:340px}' +
      '.np-banner{left:0;right:0;top:0}' +
      '.np-card{background:#fff;color:#111;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.18);padding:14px 16px;display:flex;gap:12px;align-items:flex-start;cursor:pointer;position:relative;transition:transform .25s ease, opacity .25s ease;opacity:0;transform:translateY(8px)}' +
      '.np-card.np-in{opacity:1;transform:translateY(0)}' +
      '.np-avatar{width:40px;height:40px;border-radius:50%;flex-shrink:0;background:#eee;object-fit:cover}' +
      '.np-body{font-size:13px;line-height:1.4}' +
      '.np-author{font-weight:600;margin-bottom:2px}' +
      '.np-text{color:#333}' +
      '.np-close{position:absolute;top:6px;right:8px;background:none;border:0;font-size:16px;color:#999;cursor:pointer;line-height:1}' +
      '.np-banner .np-card{border-radius:0;justify-content:center;text-align:center}' +
      '.np-inline-host{display:block;margin:8px 0}' +
      '.np-badge{position:fixed;left:16px;bottom:16px;background:#111;color:#fff;font-size:12px;padding:6px 10px;border-radius:999px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.2);z-index:2147483600}';
    var el = document.createElement("style");
    el.id = "np-style";
    el.textContent = css;
    document.head.appendChild(el);
  }

  function renderCard(proof) {
    var avatar = proof.author_avatar_url
      ? '<img class="np-avatar" src="' + escapeHtml(proof.author_avatar_url) + '" alt="">'
      : '<div class="np-avatar"></div>';
    var author = proof.author_name ? '<div class="np-author">' + escapeHtml(proof.author_name) + '</div>' : '';
    var content = proof.content ? '<div class="np-text">' + escapeHtml(proof.content).slice(0, 180) + '</div>' : '';
    return '<div class="np-card" data-proof="' + escapeHtml(proof.id) + '">' +
      '<button class="np-close" aria-label="Close">×</button>' +
      avatar + '<div class="np-body">' + author + content + '</div>' +
      '</div>';
  }

  function bindCard(card, proofId, host) {
    requestAnimationFrame(function () { card.classList.add("np-in"); });
    track("impression", proofId);
    card.addEventListener("click", function (e) {
      if (e.target && e.target.classList && e.target.classList.contains("np-close")) {
        card.classList.remove("np-in");
        if (host) host.innerHTML = "";
        return;
      }
      track("interaction", proofId);
    });
  }

  function mountRotating(className, intervalMs) {
    var host = document.createElement("div");
    host.className = "np-root " + className;
    document.body.appendChild(host);
    state.root = host;
    function tick() {
      if (!state.proofs.length) return;
      var p = state.proofs[state.idx % state.proofs.length];
      state.idx++;
      host.innerHTML = renderCard(p);
      bindCard(host.querySelector(".np-card"), p.id, host);
    }
    tick();
    setInterval(tick, intervalMs);
  }

  function mountBadge() {
    var b = document.createElement("div");
    b.className = "np-badge";
    b.textContent = state.proofs.length + " recent " + (state.proofs.length === 1 ? "review" : "reviews");
    document.body.appendChild(b);
    state.root = b;
    track("impression", null);
    b.addEventListener("click", function () {
      track("interaction", null);
      mountRotating("np-pop", 8000);
    });
  }

  function mountInline() {
    var hosts = document.querySelectorAll("[data-notiproof-inline]");
    if (!hosts.length) return;
    hosts.forEach(function (h) {
      h.classList.add("np-inline-host");
      var p = state.proofs[0];
      if (!p) return;
      h.innerHTML = renderCard(p);
      bindCard(h.querySelector(".np-card"), p.id, h);
    });
  }

  function start(data) {
    state.widget = data && data.widget;
    state.proofs = (data && data.proofs) || [];
    if (!state.widget || !state.proofs.length) return;
    injectStyles();
    var t = state.widget.type;
    if (t === "popup") mountRotating("np-pop", 8000);
    else if (t === "banner") mountRotating("np-banner", 10000);
    else if (t === "wall") mountBadge();
    else if (t === "inline") mountInline();
    else mountRotating("np-pop", 8000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { fetchData().then(start).catch(function () {}); });
  } else {
    fetchData().then(start).catch(function () {});
  }
})();
