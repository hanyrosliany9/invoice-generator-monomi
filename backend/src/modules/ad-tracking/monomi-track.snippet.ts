/**
 * monomi-track.js — the drop-in landing-page snippet, served by
 * GET /api/v1/public/track/monomi-track.js.
 *
 * Kept as a string so it ships with the backend build (no asset copying) and
 * is covered by tests. Rules for editing it: plain ES2017, no dependencies,
 * no backticks / template literals (this file wraps it in one), never throw,
 * never delay opening WhatsApp, and never put anything secret in it.
 */
export const MONOMI_TRACK_VERSION = "1.0.0";

export const MONOMI_TRACK_JS = String.raw`/*! monomi-track ${MONOMI_TRACK_VERSION} - links WhatsApp clicks on this page to the ad click */
(function () {
  "use strict";
  if (window.MonomiTrack) return;

  var script = document.currentScript;
  if (!script) {
    var all = document.getElementsByTagName("script");
    script = all[all.length - 1];
  }
  var ds = (script && script.dataset) || {};
  var endpoint = ds.endpoint || "";
  if (!endpoint && script && script.src) {
    endpoint = script.src.split("?")[0].replace(/monomi-track\.js$/, "wa-click");
  }
  var defaultCampaign = ds.campaign || "";
  var defaultWhatsapp = (ds.whatsapp || "").replace(/\D/g, "");
  var WA_HOSTS = ["wa.me", "api.whatsapp.com", "web.whatsapp.com", "whatsapp.com", "www.whatsapp.com"];
  var ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  var NS = "monomi_";

  function rand(n) {
    var out = [];
    try {
      var a = new Uint32Array(n);
      window.crypto.getRandomValues(a);
      for (var i = 0; i < n; i++) out.push(a[i]);
    } catch (e) {
      for (var j = 0; j < n; j++) out.push(Math.floor(Math.random() * 4294967296));
    }
    return out;
  }
  function makeRef() {
    var r = rand(6), s = "";
    for (var i = 0; i < 6; i++) s += ALPHABET.charAt(r[i] % ALPHABET.length);
    return s;
  }
  function makeEventId() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    } catch (e) {}
    var r = rand(4), hex = "";
    for (var i = 0; i < 4; i++) hex += ("00000000" + r[i].toString(16)).slice(-8);
    return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-4" + hex.slice(13, 16) + "-a" + hex.slice(17, 20) + "-" + hex.slice(20, 32);
  }

  function getCookie(name) {
    try {
      var m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
      return m ? decodeURIComponent(m[1]) : "";
    } catch (e) { return ""; }
  }
  function setCookie(name, value, days) {
    try {
      var exp = new Date(Date.now() + days * 86400000).toUTCString();
      document.cookie = name + "=" + encodeURIComponent(value) + "; expires=" + exp + "; path=/; SameSite=Lax" +
        (location.protocol === "https:" ? "; Secure" : "");
    } catch (e) {}
  }
  function store(key, value) {
    try { if (value === null) window.sessionStorage.removeItem(NS + key); else window.sessionStorage.setItem(NS + key, value); } catch (e) {}
  }
  function load(key) {
    try { return window.sessionStorage.getItem(NS + key) || ""; } catch (e) { return ""; }
  }

  // ---- capture on load: fbclid -> _fbc, _fbp, utm_* (kept for the session) ----
  var params;
  try { params = new URL(location.href).searchParams; } catch (e) { params = new URLSearchParams(""); }

  var fbclid = params.get("fbclid") || load("fbclid");
  if (params.get("fbclid")) store("fbclid", params.get("fbclid"));
  // Exact fbclid case matters: Meta compares it to the click it issued.
  if (fbclid && !getCookie("_fbc")) setCookie("_fbc", "fb.1." + Date.now() + "." + fbclid, 90);

  var UTM_KEYS = ["source", "medium", "campaign", "content", "term"];
  var utm = {};
  var seenUtm = false;
  UTM_KEYS.forEach(function (k) {
    var v = params.get("utm_" + k);
    if (v) { utm[k] = v; seenUtm = true; }
  });
  if (seenUtm) {
    store("utm", JSON.stringify(utm));
  } else {
    try { utm = JSON.parse(load("utm") || "{}") || {}; } catch (e) { utm = {}; }
  }
  if (!utm.campaign && defaultCampaign) utm.campaign = defaultCampaign;

  // ---- helpers ----
  function isWhatsappUrl(u) {
    return WA_HOSTS.indexOf(u.hostname.toLowerCase()) !== -1;
  }
  function withCode(url, ref) {
    var u = new URL(url, location.href);
    var text = u.searchParams.get("text") || "";
    text = text.replace(/\s*Kode:\s*[A-Za-z0-9]{6}\s*$/i, "");
    text = (text ? text + "\n\n" : "") + "Kode: " + ref;
    var parts = [];
    u.searchParams.forEach(function (v, k) {
      if (k !== "text") parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(v));
    });
    parts.push("text=" + encodeURIComponent(text));
    u.search = "?" + parts.join("&");
    return u.toString();
  }
  function clip(v) {
    return typeof v === "string" ? v.slice(0, 80) : "";
  }
  function cleanMeta(meta) {
    var out = {}, any = false;
    if (meta && typeof meta === "object") {
      ["brandName", "category", "looks"].forEach(function (k) {
        var v = clip(meta[k]);
        if (v) { out[k] = v; any = true; }
      });
    }
    return any ? out : undefined;
  }

  function send(payload) {
    if (!endpoint) return;
    try {
      var body = JSON.stringify(payload);
      var ok = false;
      if (navigator.sendBeacon) {
        // text/plain keeps this a "simple" request: no CORS preflight.
        ok = navigator.sendBeacon(endpoint, new Blob([body], { type: "text/plain;charset=UTF-8" }));
      }
      if (!ok && window.fetch) {
        window.fetch(endpoint, {
          method: "POST", body: body, keepalive: true, mode: "cors", credentials: "omit",
          headers: { "Content-Type": "text/plain;charset=UTF-8" }
        }).catch(function () {});
      }
    } catch (e) {}
  }

  function track(ref, eventId, meta) {
    try {
      var fbc = getCookie("_fbc");
      var pageUrl = location.href.split("#")[0];
      if (typeof window.fbq === "function") {
        window.fbq("track", "Lead", { content_name: ds.contentName || document.title || "WhatsApp" }, { eventID: eventId });
      }
      send({
        ref: ref, eventId: eventId, pageUrl: pageUrl, referrer: document.referrer || undefined,
        utm: utm, fbclid: fbclid || undefined, fbc: fbc || undefined, fbp: getCookie("_fbp") || undefined,
        meta: cleanMeta(meta)
      });
    } catch (e) {}
  }

  // ---- WhatsApp links: add the code, fire the events, never block the open ----
  document.addEventListener("click", function (ev) {
    try {
      var el = ev.target && ev.target.closest ? ev.target.closest("a[href]") : null;
      if (!el || el.hasAttribute("data-monomi-skip")) return;
      var u = new URL(el.getAttribute("href"), location.href);
      if (!isWhatsappUrl(u)) return;
      var ref = makeRef(), eventId = makeEventId();
      el.setAttribute("href", withCode(u.toString(), ref));
      track(ref, eventId, null);
    } catch (e) {}
  }, true);

  // ---- for custom flows (e.g. a qualifier sheet) ----
  function discoverNumber() {
    if (defaultWhatsapp) return defaultWhatsapp;
    try {
      var links = document.querySelectorAll("a[href]");
      for (var i = 0; i < links.length; i++) {
        var u = new URL(links[i].getAttribute("href"), location.href);
        if (isWhatsappUrl(u)) {
          var m = u.pathname.match(/^\/(\d{8,15})/) || [null, (u.searchParams.get("phone") || "").replace(/\D/g, "")];
          if (m[1]) return m[1];
        }
      }
    } catch (e) {}
    return "";
  }

  function openWhatsApp(opts) {
    opts = opts || {};
    var ref = makeRef(), eventId = makeEventId();
    var phone = String(opts.phone || "").replace(/\D/g, "") || discoverNumber();
    var url = "";
    try {
      var base = "https://wa.me/" + phone + (opts.text ? "?text=" + encodeURIComponent(opts.text) : "");
      url = withCode(base, ref);
    } catch (e) { url = "https://wa.me/" + phone; }
    track(ref, eventId, opts.meta);
    var w = null;
    try { w = window.open(url, "_blank"); } catch (e) {}
    if (w) { try { w.opener = null; } catch (e) {} } else { location.href = url; }
    return { ref: ref, eventId: eventId, url: url };
  }

  window.MonomiTrack = { version: "${MONOMI_TRACK_VERSION}", openWhatsApp: openWhatsApp };
})();
`;
