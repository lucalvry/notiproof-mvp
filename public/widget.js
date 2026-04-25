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

  var state = { widget: null, proofs: [], idx: 0, root: null, impressions: 0 };

  function cfg() { return (state.widget && state.widget.config) || {}; }

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

  function isVideoProof(p) {
    if (!p) return false;
    if (p.type && /video/i.test(p.type)) return true;
    var u = (p.media_url || "").toLowerCase().split("?")[0];
    return /\.(webm|mp4|mov|m4v)$/.test(u);
  }

  function positionClass() {
    var pos = (cfg().position || "bottom-left");
    return "np-pos-" + pos;
  }

  function injectStyles() {
    if (document.getElementById("np-style")) return;
    var css = '' +
      '.np-root{position:fixed;z-index:2147483600;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}' +
      '.np-pop{max-width:360px}' +
      '.np-pos-bottom-left{left:20px;bottom:20px}' +
      '.np-pos-bottom-right{right:20px;bottom:20px}' +
      '.np-pos-top-left{left:20px;top:20px}' +
      '.np-pos-top-right{right:20px;top:20px}' +
      '.np-banner{left:0;right:0;top:0;max-width:none}' +
      '.np-card{background:#fff;color:#0f172a;border:1px solid rgba(15,23,42,.06);border-radius:14px;box-shadow:0 12px 32px rgba(15,23,42,.18);padding:14px;display:flex;gap:12px;align-items:flex-start;cursor:pointer;position:relative;transition:transform .25s ease, opacity .25s ease;opacity:0;transform:translateY(8px)}' +
      '.np-card.np-in{opacity:1;transform:translateY(0)}' +
      '.np-media{width:56px;height:56px;border-radius:10px;flex-shrink:0;background:#eef2f7;object-fit:cover;overflow:hidden;position:relative;display:flex;align-items:center;justify-content:center}' +
      '.np-media img,.np-media video{width:100%;height:100%;object-fit:cover;display:block}' +
      '.np-initial{width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:20px}' +
      '.np-play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.28)}' +
      '.np-play-btn{width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,.95);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.25)}' +
      '.np-body{flex:1;min-width:0;font-size:13px;line-height:1.45}' +
      '.np-author{font-weight:600;color:#0f172a;display:flex;align-items:center;gap:6px;flex-wrap:wrap}' +
      '.np-stars{display:inline-flex;gap:1px;margin-top:2px}' +
      '.np-source{font-size:11px;color:#64748b;margin-top:1px}' +
      '.np-text{color:#334155;margin-top:4px}' +
      '.np-footer{margin-top:8px;text-align:right}' +
      '.np-footer a{font-size:10px;color:#94a3b8;text-decoration:none}' +
      '.np-footer a:hover{color:#475569}' +
      '.np-close{position:absolute;top:4px;right:4px;width:24px;height:24px;background:none;border:0;font-size:18px;color:#94a3b8;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center;border-radius:6px}' +
      '.np-close:hover{background:rgba(15,23,42,.06);color:#475569}' +
      '.np-banner .np-card{border-radius:0;justify-content:center;text-align:center;max-width:none}' +
      '.np-inline-host{display:block;margin:8px 0}' +
      '.np-badge{position:fixed;left:16px;bottom:16px;background:#0f172a;color:#fff;font-size:12px;padding:6px 10px;border-radius:999px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.2);z-index:2147483600}' +
      '.np-lightbox{position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:20px}' +
      '.np-lightbox video{max-width:min(960px,100%);max-height:90vh;border-radius:8px;background:#000}' +
      '.np-lightbox-close{position:absolute;top:16px;right:16px;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.15);color:#fff;border:0;font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center}';
    var el = document.createElement("style");
    el.id = "np-style";
    el.textContent = css;
    document.head.appendChild(el);
  }

  function starSvg(filled) {
    var color = filled ? "#F5B400" : "#E5E7EB";
    return '<svg width="12" height="12" viewBox="0 0 20 20" fill="' + color + '" xmlns="http://www.w3.org/2000/svg"><path d="M10 1.5l2.7 5.47 6.04.88-4.37 4.26 1.03 6.01L10 15.27l-5.4 2.85 1.03-6.01L1.26 7.85l6.04-.88L10 1.5z"/></svg>';
  }

  function renderStars(rating) {
    var r = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    var html = '';
    for (var i = 1; i <= 5; i++) html += starSvg(i <= r);
    return '<div class="np-stars" aria-label="' + r + ' out of 5 stars">' + html + '</div>';
  }

  function renderMedia(proof) {
    var c = cfg();
    if (c.show_avatar === false) return '';
    var brand = c.brand_color || "#6366f1";
    if (isVideoProof(proof) && proof.media_url) {
      return '<div class="np-media">' +
        '<video preload="metadata" muted playsinline src="' + escapeHtml(proof.media_url) + '#t=0.1"></video>' +
        '<div class="np-play"><div class="np-play-btn" style="box-shadow:0 0 0 2px ' + escapeHtml(brand) + '55, 0 2px 6px rgba(0,0,0,.25)">' +
        '<svg width="10" height="10" viewBox="0 0 10 10" fill="#0f172a"><path d="M2 1l7 4-7 4z"/></svg>' +
        '</div></div>' +
        '</div>';
    }
    if (proof.author_avatar_url) {
      return '<div class="np-media"><img src="' + escapeHtml(proof.author_avatar_url) + '" alt=""></div>';
    }
    var initial = (proof.author_name || "?").trim().charAt(0).toUpperCase();
    return '<div class="np-media"><div class="np-initial" style="background:' + escapeHtml(brand) + '">' + escapeHtml(initial) + '</div></div>';
  }

  function renderCard(proof) {
    var c = cfg();
    var media = renderMedia(proof);
    var name = proof.author_name ? '<div class="np-author">' + escapeHtml(proof.author_name) + '</div>' : '';
    var stars = (c.show_rating !== false && proof.rating) ? renderStars(proof.rating) : '';
    var source = proof.source === 'testimonial_request' ? '<div class="np-source">Verified testimonial</div>' : '';
    var text = proof.content ? '<div class="np-text">' + escapeHtml(proof.content).slice(0, 160) + (proof.content.length > 160 ? '…' : '') + '</div>' : '';
    var footer = (c.powered_by !== false && state.impressions >= 1)
      ? '<div class="np-footer"><a href="https://notiproof.com" target="_blank" rel="noopener">Powered by NotiProof</a></div>'
      : '';
    return '<div class="np-card" data-proof="' + escapeHtml(proof.id) + '">' +
      '<button class="np-close" aria-label="Close">×</button>' +
      media +
      '<div class="np-body">' + name + stars + source + text + footer + '</div>' +
      '</div>';
  }

  function openLightbox(proof) {
    var lb = document.createElement('div');
    lb.className = 'np-lightbox';
    lb.innerHTML = '<button class="np-lightbox-close" aria-label="Close">×</button>' +
      '<video controls autoplay playsinline src="' + escapeHtml(proof.media_url) + '"></video>';
    document.body.appendChild(lb);
    track('interaction', proof.id);
    function close() {
      if (lb.parentNode) lb.parentNode.removeChild(lb);
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    lb.addEventListener('click', function (e) {
      if (e.target === lb || (e.target.classList && e.target.classList.contains('np-lightbox-close'))) close();
    });
  }

  function bindCard(card, proof, host) {
    requestAnimationFrame(function () { card.classList.add("np-in"); });
    state.impressions++;
    track("impression", proof.id);
    card.addEventListener("click", function (e) {
      if (e.target && e.target.classList && e.target.classList.contains("np-close")) {
        card.classList.remove("np-in");
        if (host) host.innerHTML = "";
        return;
      }
      if (isVideoProof(proof) && proof.media_url) {
        openLightbox(proof);
      } else {
        track("interaction", proof.id);
      }
    });
  }

  function mountRotating(className, defaultIntervalMs) {
    var host = document.createElement("div");
    var posCls = className === 'np-pop' ? positionClass() : '';
    host.className = "np-root " + className + (posCls ? ' ' + posCls : '');
    document.body.appendChild(host);
    state.root = host;
    var interval = (cfg().interval_seconds && Number(cfg().interval_seconds) > 0)
      ? Number(cfg().interval_seconds) * 1000
      : defaultIntervalMs;
    function tick() {
      if (!state.proofs.length) return;
      var p = state.proofs[state.idx % state.proofs.length];
      state.idx++;
      host.innerHTML = renderCard(p);
      bindCard(host.querySelector(".np-card"), p, host);
    }
    tick();
    setInterval(tick, interval);
  }

  function mountBadge() {
    var b = document.createElement("div");
    b.className = "np-badge";
    b.textContent = state.proofs.length + " recent " + (state.proofs.length === 1 ? "review" : "reviews");
    document.body.appendChild(b);
    state.root = b;
    state.impressions++;
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
      bindCard(h.querySelector(".np-card"), p, h);
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
