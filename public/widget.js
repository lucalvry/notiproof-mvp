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

  var state = { widget: null, business: null, proofs: [], idx: 0, root: null, impressions: 0 };

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
      '.np-pop{max-width:420px}' +
      '.np-pos-bottom-left{left:20px;bottom:20px}' +
      '.np-pos-bottom-right{right:20px;bottom:20px}' +
      '.np-pos-top-left{left:20px;top:20px}' +
      '.np-pos-top-right{right:20px;top:20px}' +
      '.np-banner{left:0;right:0;top:0;max-width:none}' +
      '.np-card{background:#fff;color:#0f172a;border:1px solid rgba(15,23,42,.06);border-radius:14px;box-shadow:0 12px 32px rgba(15,23,42,.18);padding:14px;display:flex;gap:12px;align-items:stretch;cursor:pointer;position:relative;transition:transform .25s ease, opacity .25s ease;opacity:0;transform:translateY(8px);width:420px;max-width:calc(100vw - 24px);box-sizing:border-box}' +
      '.np-card.np-in{opacity:1;transform:translateY(0)}' +
      '.np-media{align-self:stretch;aspect-ratio:1/1;min-height:96px;max-height:140px;border-radius:10px;flex-shrink:0;background:#eef2f7;overflow:hidden;position:relative;display:flex;align-items:center;justify-content:center}' +
      '.np-media img,.np-media video{width:100%;height:100%;object-fit:cover;display:block}' +
      '.np-initial{width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:28px}' +
      '.np-play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.28);pointer-events:none}' +
      '.np-play-btn{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.95);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.3)}' +
      '.np-body{flex:1;min-width:0;font-size:13px;line-height:1.45;display:flex;flex-direction:column}' +
      '.np-author-row{display:flex;align-items:center;gap:6px;min-width:0}' +
      '.np-author{font-weight:600;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:0 1 auto;min-width:0}' +
      '.np-stars{display:inline-flex;gap:1px;flex-shrink:0}' +
      '.np-source{font-size:11px;color:#64748b;margin-top:1px}' +
      '.np-text{color:#334155;margin-top:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}' +
      '.np-footer{margin-top:auto;padding-top:4px;text-align:right}' +
      '.np-footer a{font-size:10px;color:#94a3b8;text-decoration:none}' +
      '.np-footer a:hover{color:#475569}' +
      '.np-close{position:absolute;top:4px;right:4px;width:24px;height:24px;background:none;border:0;font-size:18px;color:#94a3b8;cursor:pointer;line-height:1;display:flex;align-items:center;justify-content:center;border-radius:6px}' +
      '.np-close:hover{background:rgba(15,23,42,.06);color:#475569}' +
      '.np-banner .np-card{border-radius:0;justify-content:center;text-align:center;max-width:none;width:auto}' +
      '.np-inline-host{display:block;margin:8px 0}' +
      '.np-badge{position:fixed;left:16px;bottom:16px;background:#0f172a;color:#fff;font-size:12px;padding:6px 10px;border-radius:999px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.2);z-index:2147483600}' +
      // Mobile (≤480px): edge-to-edge popup with 8px gutters
      '@media (max-width:480px){' +
        '.np-pop.np-pos-bottom-left,.np-pop.np-pos-bottom-right{left:8px;right:8px;bottom:8px;top:auto}' +
        '.np-pop.np-pos-top-left,.np-pop.np-pos-top-right{left:8px;right:8px;top:8px;bottom:auto}' +
        '.np-pop .np-card{width:auto;max-width:none;padding:10px;gap:10px;border-radius:12px}' +
        '.np-pop .np-media{min-height:72px;max-height:96px}' +
        '.np-pop .np-text{font-size:12px;-webkit-line-clamp:2}' +
        '.np-pop .np-author{font-size:13px}' +
        '.np-pop .np-footer a{font-size:9px}' +
      '}' +
      // Lightbox
      '.np-lightbox{position:fixed;inset:0;background:rgba(8,11,20,.88);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:24px;opacity:0;transition:opacity .18s ease-out;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}' +
      '.np-lightbox.np-lb-in{opacity:1}' +
      '.np-lb-frame{position:relative;width:min(880px,94vw);max-height:90vh;background:#fff;color:#0f172a;border-radius:18px;overflow:hidden;display:grid;grid-template-columns:1.1fr 1fr;transform:scale(.96);transition:transform .18s ease-out;box-shadow:0 30px 80px rgba(0,0,0,.5)}' +
      '.np-lightbox.np-lb-in .np-lb-frame{transform:scale(1)}' +
      '@media (max-width:720px){.np-lb-frame{grid-template-columns:1fr;max-height:92vh;overflow-y:auto}}' +
      '.np-lb-media{background:#0f172a;display:flex;align-items:center;justify-content:center;min-height:280px;position:relative}' +
      '.np-lb-media video{width:100%;height:100%;max-height:90vh;object-fit:cover;display:block}' +
      '.np-lb-media img.np-lb-photo{width:100%;height:100%;max-height:90vh;object-fit:cover}' +
      '.np-lb-info{padding:28px 28px 24px;display:flex;flex-direction:column;gap:14px;overflow-y:auto;max-height:90vh}' +
      '.np-lb-quote{font-size:18px;line-height:1.55;color:#0f172a;font-weight:500}' +
      '.np-lb-quote::before{content:"\\201C";font-size:48px;color:#cbd5e1;line-height:0;vertical-align:-12px;margin-right:4px;font-family:Georgia,serif}' +
      '.np-lb-attribution{display:flex;align-items:center;gap:12px;border-top:1px solid #e2e8f0;padding-top:14px;margin-top:auto}' +
      '.np-lb-avatar{width:48px;height:48px;border-radius:50%;object-fit:cover;flex-shrink:0;background:#e2e8f0}' +
      '.np-lb-avatar-fallback{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:20px;flex-shrink:0}' +
      '.np-lb-who{min-width:0;flex:1}' +
      '.np-lb-name{font-weight:700;color:#0f172a;font-size:15px}' +
      '.np-lb-role{font-size:13px;color:#475569;margin-top:1px}' +
      '.np-lb-role a{color:#475569;text-decoration:none}.np-lb-role a:hover{text-decoration:underline}' +
      '.np-lb-company-logo{height:28px;max-width:90px;object-fit:contain;flex-shrink:0;margin-left:auto;opacity:.85}' +
      '.np-lb-meta{display:flex;align-items:center;gap:10px;flex-wrap:wrap}' +
      '.np-lb-verified{font-size:11px;color:#16a34a;background:#dcfce7;padding:3px 9px;border-radius:999px;font-weight:600;display:inline-flex;align-items:center;gap:4px}' +
      '.np-lb-cta{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 18px;border-radius:10px;background:#0f172a;color:#fff;text-decoration:none;font-weight:600;font-size:14px;transition:transform .12s ease, box-shadow .12s ease;margin-top:4px}' +
      '.np-lb-cta:hover{transform:translateY(-1px);box-shadow:0 8px 18px rgba(15,23,42,.25)}' +
      '.np-lightbox-close{position:absolute;top:14px;right:14px;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.92);color:#0f172a;border:0;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(0,0,0,.4);transition:transform .15s ease;z-index:2}' +
      '.np-lightbox-close:hover{transform:scale(1.06)}' +
      '.np-lightbox-close:focus-visible{outline:3px solid #6366f1;outline-offset:2px}';
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
    var playOverlay = '<div class="np-play"><div class="np-play-btn" style="box-shadow:0 0 0 2px ' + escapeHtml(brand) + '55, 0 2px 8px rgba(0,0,0,.3)">' +
      '<svg width="14" height="14" viewBox="0 0 10 10" fill="#0f172a"><path d="M2 1l7 4-7 4z"/></svg>' +
      '</div></div>';
    if (isVideoProof(proof) && proof.media_url) {
      // Prefer pre-generated poster (no runtime decoding required).
      if (proof.poster_url) {
        return '<div class="np-media"><img src="' + escapeHtml(proof.poster_url) + '" alt="">' + playOverlay + '</div>';
      }
      return '<div class="np-media" data-np-video="' + escapeHtml(proof.media_url) + '">' +
        '<video preload="metadata" muted playsinline crossorigin="anonymous" src="' + escapeHtml(proof.media_url) + '#t=0.1"></video>' +
        playOverlay +
        '</div>';
    }
    if (proof.author_avatar_url) {
      return '<div class="np-media"><img src="' + escapeHtml(proof.author_avatar_url) + '" alt=""></div>';
    }
    var initial = (proof.author_name || "?").trim().charAt(0).toUpperCase();
    return '<div class="np-media"><div class="np-initial" style="background:' + escapeHtml(brand) + '">' + escapeHtml(initial) + '</div></div>';
  }

  function enhanceVideoThumb(scope) {
    var media = scope && scope.querySelector ? scope.querySelector('.np-media[data-np-video]') : null;
    if (!media) return;
    var video = media.querySelector('video');
    if (!video) return;
    var captured = false;
    function capture() {
      if (captured) return;
      try {
        var w = video.videoWidth, h = video.videoHeight;
        if (!w || !h) return;
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, w, h);
        var url = canvas.toDataURL('image/jpeg', 0.82);
        var img = document.createElement('img');
        img.alt = '';
        img.src = url;
        video.replaceWith(img);
        captured = true;
      } catch (_) { /* tainted canvas — keep video frame as-is */ }
    }
    video.addEventListener('loadeddata', function () {
      try { video.currentTime = 0.1; } catch (_) {}
      setTimeout(capture, 60);
    });
    video.addEventListener('seeked', capture);
  }

  function renderCard(proof) {
    var c = cfg();
    var media = renderMedia(proof);
    var stars = (c.show_rating !== false && proof.rating) ? renderStars(proof.rating) : '';
    var nameRow = (proof.author_name || stars)
      ? '<div class="np-author-row">' +
          (proof.author_name ? '<span class="np-author">' + escapeHtml(proof.author_name) + '</span>' : '') +
          stars +
        '</div>'
      : '';
    var source = proof.source === 'testimonial_request' ? '<div class="np-source">Verified testimonial</div>' : '';
    var rawText = proof.content ? String(proof.content) : '';
    var text = rawText
      ? '<div class="np-text">' + escapeHtml(rawText.slice(0, 110)) + (rawText.length > 110 ? '…' : '') + '</div>'
      : '';
    var footer = (c.powered_by !== false && state.impressions >= 1)
      ? '<div class="np-footer"><a href="https://notiproof.com" target="_blank" rel="noopener">Powered by NotiProof</a></div>'
      : '';
    return '<div class="np-card" data-proof="' + escapeHtml(proof.id) + '">' +
      '<button class="np-close" aria-label="Close">×</button>' +
      media +
      '<div class="np-body">' + nameRow + source + text + footer + '</div>' +
      '</div>';
  }

  function safeUrl(u) {
    if (!u || typeof u !== 'string') return null;
    if (!/^https?:\/\//i.test(u)) return null;
    return u;
  }

  function openLightbox(proof) {
    var c = cfg();
    var brand = c.brand_color || '#6366f1';
    var prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    var lb = document.createElement('div');
    lb.className = 'np-lightbox';

    var stars = (c.show_rating !== false && proof.rating) ? renderStars(proof.rating) : '';
    var verified = proof.source === 'testimonial_request'
      ? '<span class="np-lb-verified">✓ Verified</span>' : '';

    var mediaHtml = '';
    if (isVideoProof(proof) && proof.media_url) {
      mediaHtml = '<video controls autoplay playsinline src="' + escapeHtml(proof.media_url) + '"></video>';
    } else if (proof.author_photo_url) {
      mediaHtml = '<img class="np-lb-photo" src="' + escapeHtml(proof.author_photo_url) + '" alt="">';
    } else if (proof.author_avatar_url) {
      mediaHtml = '<img class="np-lb-photo" src="' + escapeHtml(proof.author_avatar_url) + '" alt="">';
    } else {
      var initial = (proof.author_name || '?').trim().charAt(0).toUpperCase();
      mediaHtml = '<div style="width:100%;height:100%;min-height:280px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:96px;font-weight:700;background:' + escapeHtml(brand) + '">' + escapeHtml(initial) + '</div>';
    }

    var avatarSrc = proof.author_photo_url || proof.author_avatar_url;
    var avatarHtml = avatarSrc
      ? '<img class="np-lb-avatar" src="' + escapeHtml(avatarSrc) + '" alt="">'
      : '<div class="np-lb-avatar-fallback" style="background:' + escapeHtml(brand) + '">' +
          escapeHtml((proof.author_name || '?').trim().charAt(0).toUpperCase()) + '</div>';

    var roleParts = [];
    if (proof.author_role) roleParts.push(escapeHtml(proof.author_role));
    if (proof.author_company) {
      var siteUrl = safeUrl(proof.author_website_url);
      roleParts.push(siteUrl
        ? '<a href="' + escapeHtml(siteUrl) + '" target="_blank" rel="noopener">' + escapeHtml(proof.author_company) + '</a>'
        : escapeHtml(proof.author_company));
    }
    var roleHtml = roleParts.length ? '<div class="np-lb-role">' + roleParts.join(' · ') + '</div>' : '';

    var companyLogo = proof.author_company_logo_url
      ? '<img class="np-lb-company-logo" src="' + escapeHtml(proof.author_company_logo_url) + '" alt="">'
      : '';

    var ctaUrl = safeUrl(proof.cta_url) || safeUrl(c.default_cta_url) || safeUrl(state.business && state.business.website_url);
    var ctaLabel = (proof.cta_label && proof.cta_label.trim())
      || (c.default_cta_label && String(c.default_cta_label).trim())
      || 'Visit website';
    var ctaHtml = ctaUrl
      ? '<a class="np-lb-cta" href="' + escapeHtml(ctaUrl) + '" target="_blank" rel="noopener" data-np-cta="1" style="background:' + escapeHtml(brand) + '">' +
          escapeHtml(ctaLabel) +
          ' <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M5 10h10m0 0l-4-4m4 4l-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
        '</a>'
      : '';

    var quoteText = proof.content ? escapeHtml(String(proof.content)) : '';
    var quote = quoteText ? '<div class="np-lb-quote">' + quoteText + '</div>' : '';

    lb.innerHTML =
      '<div class="np-lb-frame" role="dialog" aria-modal="true">' +
        '<button class="np-lightbox-close" aria-label="Close">×</button>' +
        '<div class="np-lb-media">' + mediaHtml + '</div>' +
        '<div class="np-lb-info">' +
          (stars || verified ? '<div class="np-lb-meta">' + stars + verified + '</div>' : '') +
          quote +
          ctaHtml +
          '<div class="np-lb-attribution">' +
            avatarHtml +
            '<div class="np-lb-who">' +
              (proof.author_name ? '<div class="np-lb-name">' + escapeHtml(proof.author_name) + '</div>' : '') +
              roleHtml +
            '</div>' +
            companyLogo +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(lb);
    requestAnimationFrame(function () { lb.classList.add('np-lb-in'); });
    var btn = lb.querySelector('.np-lightbox-close');
    if (btn) try { btn.focus(); } catch (_) {}
    track('interaction', proof.id);

    function close() {
      lb.classList.remove('np-lb-in');
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
      setTimeout(function () { if (lb.parentNode) lb.parentNode.removeChild(lb); }, 180);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    lb.addEventListener('click', function (e) {
      var t = e.target;
      if (t === lb || (t.classList && t.classList.contains('np-lightbox-close'))) close();
      if (t && t.closest && t.closest('[data-np-cta]')) {
        track('conversion', proof.id);
      }
    });
  }

  function bindCard(card, proof, host) {
    requestAnimationFrame(function () { card.classList.add("np-in"); });
    state.impressions++;
    track("impression", proof.id);
    enhanceVideoThumb(card);
    card.addEventListener("click", function (e) {
      if (e.target && e.target.classList && e.target.classList.contains("np-close")) {
        card.classList.remove("np-in");
        if (host) host.innerHTML = "";
        return;
      }
      // Open the rich lightbox for every proof (video, photo, or text).
      openLightbox(proof);
    });
  }

  // --- Pacing helpers (cooldown + frequency cap) ---
  function dayKey() {
    var d = new Date();
    return d.getUTCFullYear() + '-' + (d.getUTCMonth() + 1) + '-' + d.getUTCDate();
  }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (_) {} }

  function canShow() {
    var c = cfg();
    var wid = (state.widget && state.widget.id) || 'w';
    // Cooldown between consecutive shows for this visitor.
    var cooldownSec = Number(c.cooldown_seconds);
    if (cooldownSec > 0) {
      var last = Number(lsGet('np_last_' + wid)) || 0;
      if (Date.now() - last < cooldownSec * 1000) return false;
    }
    // Daily frequency cap per visitor.
    var cap = Number(c.frequency_cap);
    if (cap > 0) {
      var k = 'np_count_' + wid + '_' + dayKey();
      var n = Number(lsGet(k)) || 0;
      if (n >= cap) return false;
    }
    return true;
  }

  function recordShow() {
    var wid = (state.widget && state.widget.id) || 'w';
    lsSet('np_last_' + wid, String(Date.now()));
    var c = cfg();
    if (Number(c.frequency_cap) > 0) {
      var k = 'np_count_' + wid + '_' + dayKey();
      var n = Number(lsGet(k)) || 0;
      lsSet(k, String(n + 1));
    }
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
      if (!canShow()) { host.innerHTML = ''; return; }
      var p = state.proofs[state.idx % state.proofs.length];
      state.idx++;
      host.innerHTML = renderCard(p);
      bindCard(host.querySelector(".np-card"), p, host);
      recordShow();
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
    state.business = (data && data.business) || null;
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
