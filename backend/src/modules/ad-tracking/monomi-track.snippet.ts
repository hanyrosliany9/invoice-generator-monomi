/**
 * monomi-track.js — the drop-in landing-page snippet, served by
 * GET /api/v1/public/track/monomi-track.js.
 *
 * It is the ONLY tracker on the page: the landing page does not load Meta's
 * browser Pixel. Every event goes to our backend, which sends it to the
 * Conversions API server-side.
 *
 * Kept as a string so it ships with the backend build (no asset copying) and
 * is covered by tests. Rules for editing it: plain ES2017, no dependencies,
 * no backticks / template literals (this file wraps it in one), never throw,
 * never delay opening WhatsApp, and never put anything secret in it.
 */
export const MONOMI_TRACK_VERSION = "2.0.0";

export const MONOMI_TRACK_JS = String.raw`/*! monomi-track ${MONOMI_TRACK_VERSION} - first-party tracker, events are sent server-side */
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
    endpoint = script.src.split("?")[0].replace(/monomi-track\.js$/, "event");
  }
  var defaultCampaign = ds.campaign || "";
  var defaultWhatsapp = (ds.whatsapp || "").replace(/\D/g, "");
  var WA_HOSTS = ["wa.me", "api.whatsapp.com", "web.whatsapp.com", "whatsapp.com", "www.whatsapp.com"];
  var NAMES = ["PageView", "ViewContent", "EngagedVisit", "Lead"];
  var ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  var NS = "monomi_";
  var COOKIE_DAYS = 90;

  // ---- small helpers ----
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
  function makeUuid() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    } catch (e) {}
    var r = rand(4), hex = "";
    for (var i = 0; i < 4; i++) hex += ("00000000" + r[i].toString(16)).slice(-8);
    return hex.slice(0, 8) + "-" + hex.slice(8, 12) + "-4" + hex.slice(13, 16) + "-a" + hex.slice(17, 20) + "-" + hex.slice(20, 32);
  }
  function digits10() {
    var r = rand(2), s = String(r[0]) + String(r[1]);
    while (s.length < 10) s += "0";
    return s.slice(0, 10);
  }
  function getCookie(name) {
    try {
      var m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
      return m ? decodeURIComponent(m[1]) : "";
    } catch (e) { return ""; }
  }
  // Sets a cookie on the registrable domain (so link.example.com and example.com
  // share it): the shortest parent domain the browser accepts wins (public
  // suffixes such as co.id are refused by the browser), else host-only.
  function setCookie(name, value, days) {
    try {
      var exp = new Date(Date.now() + days * 86400000).toUTCString();
      var base = name + "=" + encodeURIComponent(value) + "; expires=" + exp + "; path=/; SameSite=Lax" +
        (location.protocol === "https:" ? "; Secure" : "");
      var parts = location.hostname.split(".");
      if (parts.length > 1 && !/^[\d.]+$/.test(location.hostname)) {
        for (var i = parts.length - 2; i >= 0; i--) {
          document.cookie = base + "; domain=" + parts.slice(i).join(".");
          if (getCookie(name) === value) return;
        }
      }
      document.cookie = base;
    } catch (e) {}
  }
  function store(area, key, value) {
    try {
      var s = window[area];
      if (value === null) s.removeItem(NS + key); else s.setItem(NS + key, value);
    } catch (e) {}
  }
  function load(area, key) {
    try { return window[area].getItem(NS + key) || ""; } catch (e) { return ""; }
  }

  // ---- identifiers: visit id, _fbp (generated here), _fbc (from fbclid) ----
  var visitId = load("sessionStorage", "visit");
  if (!visitId) {
    visitId = makeUuid();
    store("sessionStorage", "visit", visitId);
  }

  // No Meta Pixel on the page, so nobody else sets _fbp: build it the way
  // Meta's own script does (fb.<subdomain index>.<ms>.<10 random digits>).
  var fbp = getCookie("_fbp") || load("localStorage", "fbp");
  if (!fbp) fbp = "fb.1." + Date.now() + "." + digits10();
  if (!getCookie("_fbp")) setCookie("_fbp", fbp, COOKIE_DAYS);
  store("localStorage", "fbp", fbp);

  var params;
  try { params = new URL(location.href).searchParams; } catch (e) { params = new URLSearchParams(""); }
  var fbclid = params.get("fbclid") || load("sessionStorage", "fbclid");
  if (params.get("fbclid")) store("sessionStorage", "fbclid", params.get("fbclid"));
  // Exact fbclid case matters: Meta compares it to the click it issued.
  if (fbclid && !getCookie("_fbc")) setCookie("_fbc", "fb.1." + Date.now() + "." + fbclid, COOKIE_DAYS);

  var UTM_KEYS = ["source", "medium", "campaign", "content", "term"];
  var utm = {};
  var seenUtm = false;
  UTM_KEYS.forEach(function (k) {
    var v = params.get("utm_" + k);
    if (v) { utm[k] = v; seenUtm = true; }
  });
  if (seenUtm) {
    store("sessionStorage", "utm", JSON.stringify(utm));
  } else {
    try { utm = JSON.parse(load("sessionStorage", "utm") || "{}") || {}; } catch (e) { utm = {}; }
  }
  if (!utm.campaign && defaultCampaign) utm.campaign = defaultCampaign;

  // ---- sending ----
  function isWhatsappUrl(u) {
    return WA_HOSTS.indexOf(u.hostname.toLowerCase()) !== -1;
  }
  function clip(v, n) {
    return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, n) : "";
  }
  // "@Name", "name", "instagram.com/name/" -> "name" (same rules as the server)
  function igHandle(v) {
    if (typeof v !== "string") return "";
    var s = v.trim();
    var m = s.match(/^(?:https?:\/\/)?(?:www\.|m\.)?instagram\.com\/([^\/?#\s]+)/i);
    if (m) s = m[1];
    s = s.replace(/^@+/, "");
    return /^[A-Za-z0-9._]{1,30}$/.test(s) ? s.toLowerCase() : "";
  }
  function cleanMeta(meta) {
    var out = {}, any = false;
    if (meta && typeof meta === "object") {
      var ig = igHandle(meta.instagram);
      if (ig) { out.instagram = ig; any = true; }
      ["brandName", "category"].forEach(function (k) {
        var v = clip(meta[k], 80);
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

  function emit(name, extra) {
    try {
      var payload = {
        name: name, visitId: visitId, eventId: makeUuid(),
        pageUrl: location.href.split("#")[0], referrer: document.referrer || undefined,
        utm: utm, fbclid: fbclid || undefined, fbc: getCookie("_fbc") || undefined, fbp: getCookie("_fbp") || fbp
      };
      if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) payload[k] = extra[k];
      send(payload);
      return payload.eventId;
    } catch (e) { return ""; }
  }

  // MonomiTrack.track("ViewContent") / ("EngagedVisit"); PageView is automatic.
  function track(name) {
    if (NAMES.indexOf(name) === -1 || name === "Lead") return "";
    return emit(name);
  }

  // ---- WhatsApp: add the code, send the Lead, never block the open ----
  function withCode(url, ref, extraText) {
    var u = new URL(url, location.href);
    var text = u.searchParams.get("text") || "";
    text = text.replace(/\s*Kode:\s*[A-Za-z0-9]{6}\s*$/i, "");
    if (extraText) text = (text ? text + "\n" : "") + extraText;
    text = (text ? text + "\n\n" : "") + "Kode: " + ref;
    var parts = [];
    u.searchParams.forEach(function (v, k) {
      if (k !== "text") parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(v));
    });
    parts.push("text=" + encodeURIComponent(text));
    u.search = "?" + parts.join("&");
    return u.toString();
  }

  function trackLead(ref, meta) {
    var m = cleanMeta(meta);
    return emit("Lead", { ref: ref, meta: m });
  }

  document.addEventListener("click", function (ev) {
    try {
      var el = ev.target && ev.target.closest ? ev.target.closest("a[href]") : null;
      if (!el || el.hasAttribute("data-monomi-skip")) return;
      var u = new URL(el.getAttribute("href"), location.href);
      if (!isWhatsappUrl(u)) return;
      var ref = makeRef();
      el.setAttribute("href", withCode(u.toString(), ref));
      trackLead(ref, null);
    } catch (e) {}
  }, true);

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

  // MonomiTrack.openWhatsApp({ text, meta: { instagram, brandName, category } })
  function openWhatsApp(opts) {
    opts = opts || {};
    var ref = makeRef();
    var phone = String(opts.phone || "").replace(/\D/g, "") || discoverNumber();
    var ig = igHandle(opts.meta && opts.meta.instagram);
    var url = "";
    try {
      var base = "https://wa.me/" + phone + (opts.text ? "?text=" + encodeURIComponent(opts.text) : "");
      // the Instagram handle also travels in the message so staff see it in the chat
      url = withCode(base, ref, ig ? "Instagram: @" + ig : "");
    } catch (e) { url = "https://wa.me/" + phone; }
    var eventId = trackLead(ref, opts.meta);
    var w = null;
    try { w = window.open(url, "_blank"); } catch (e) {}
    if (w) { try { w.opener = null; } catch (e) {} } else { location.href = url; }
    return { ref: ref, eventId: eventId, url: url };
  }

  window.MonomiTrack = { version: "${MONOMI_TRACK_VERSION}", visitId: visitId, track: track, openWhatsApp: openWhatsApp };
  emit("PageView");
})();
`;
