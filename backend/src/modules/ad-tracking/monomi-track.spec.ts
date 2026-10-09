import * as vm from "vm";
import { webcrypto } from "crypto";
import { MONOMI_TRACK_JS } from "./monomi-track.snippet";

type Cookie = { value: string; domain: string | null };

/** Minimal browser: cookie jar with domain rules, storages, beacon capture. */
function makeBrowser(opts: { url: string; cookies?: Record<string, string>; session?: Map<string, string>; local?: Map<string, string>; beacon?: boolean }) {
  const loc = new URL(opts.url);
  const jar = new Map<string, Cookie>();
  for (const [k, v] of Object.entries(opts.cookies ?? {})) jar.set(k, { value: v, domain: null });
  const sent: Array<{ via: string; url: string; body: any }> = [];
  const cookieWrites: string[] = [];
  const listeners: Record<string, Function[]> = {};
  const PUBLIC_SUFFIXES = new Set(["id", "co.id", "com", "net"]);
  const doc: any = {
    currentScript: { dataset: {}, src: "https://admin.example.com/api/v1/public/track/monomi-track.js?v=1" },
    referrer: "https://l.facebook.com/",
    title: "Monomi Landing",
    querySelectorAll: () => [],
    getElementsByTagName: () => [],
    addEventListener: (t: string, f: Function) => { (listeners[t] ??= []).push(f); },
    get cookie() { return [...jar.entries()].map(([k, c]) => `${k}=${c.value}`).join("; "); },
    set cookie(raw: string) {
      cookieWrites.push(raw);
      const parts = raw.split(";").map((s) => s.trim());
      const [k, v] = parts[0].split("=");
      const dom = parts.find((p) => /^domain=/i.test(p))?.split("=")[1] ?? null;
      if (dom) {
        // like a browser: the domain must cover the host and must not be a public suffix
        if (!loc.hostname.endsWith(dom) || PUBLIC_SUFFIXES.has(dom)) return;
      }
      jar.set(k, { value: decodeURIComponent(v), domain: dom });
    },
  };
  const storage = (m: Map<string, string>) => ({
    getItem: (k: string) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  });
  const session = opts.session ?? new Map<string, string>();
  const local = opts.local ?? new Map<string, string>();
  class FakeBlob { constructor(public parts: string[]) {} }
  const sandbox: any = {
    document: doc,
    location: { href: loc.href, hostname: loc.hostname, protocol: loc.protocol },
    navigator: {
      sendBeacon: opts.beacon === false ? () => false : (url: string, blob: FakeBlob) => { sent.push({ via: "beacon", url, body: JSON.parse(blob.parts[0]) }); return true; },
    },
    Blob: FakeBlob,
    fetch: (url: string, init: any) => { sent.push({ via: "fetch", url, body: JSON.parse(init.body) }); return Promise.resolve({}); },
    sessionStorage: storage(session),
    localStorage: storage(local),
    crypto: webcrypto,
    URL, URLSearchParams, Uint32Array, Date, Math, JSON, Object, RegExp, String, encodeURIComponent, decodeURIComponent,
    opened: [] as string[],
  };
  sandbox.window = sandbox;
  sandbox.open = (u: string) => { sandbox.opened.push(u); return {}; };
  // the page must never get a Meta Pixel: any fbq call is a bug
  sandbox.fbq = () => { throw new Error("fbq must not be called"); };
  vm.createContext(sandbox);
  vm.runInContext(MONOMI_TRACK_JS, sandbox);
  return { sandbox, jar, sent, listeners, session, local, doc, cookieWrites };
}

const LANDING = "https://link.monomiagency.com/?utm_source=meta&utm_medium=paid&utm_campaign=FB-OKT1&utm_content=ad1&fbclid=IwAR_Test123";

describe("monomi-track.js (runs without a Meta Pixel)", () => {
  it("generates _fbp in Meta's format as a host-only cookie (no Domain attribute), mirrored to localStorage", () => {
    const b = makeBrowser({ url: LANDING });
    const fbp = b.jar.get("_fbp");
    expect(fbp?.value).toMatch(/^fb\.1\.\d{13}\.\d{10}$/);
    expect(fbp?.domain).toBeNull();
    expect(b.local.get("monomi_fbp")).toBe(fbp?.value);
  });

  it("sets _fbp and _fbc host-only on any host (never on the parent domain)", () => {
    const b = makeBrowser({ url: "https://link.monomi.co.id/?fbclid=IwAR_Host1" });
    expect(b.jar.get("_fbp")?.domain).toBeNull();
    expect(b.jar.get("_fbc")?.domain).toBeNull();
    expect(b.cookieWrites.every((c) => !/;\s*domain=/i.test(c))).toBe(true);
  });

  it("keeps an existing _fbp and restores a lost cookie from localStorage", () => {
    const keep = makeBrowser({ url: LANDING, cookies: { _fbp: "fb.1.1700000000000.1234567890" } });
    expect(keep.jar.get("_fbp")?.value).toBe("fb.1.1700000000000.1234567890");
    const local = new Map([["monomi_fbp", "fb.1.1700000000000.5555555555"]]);
    const restored = makeBrowser({ url: LANDING, local });
    expect(restored.jar.get("_fbp")?.value).toBe("fb.1.1700000000000.5555555555");
  });

  it("builds _fbc from fbclid (exact case) only when none exists", () => {
    const b = makeBrowser({ url: LANDING });
    expect(b.jar.get("_fbc")?.value).toMatch(/^fb\.1\.\d{13}\.IwAR_Test123$/);
    const has = makeBrowser({ url: LANDING, cookies: { _fbc: "fb.1.1.OLD" } });
    expect(has.jar.get("_fbc")?.value).toBe("fb.1.1.OLD");
  });

  it("sends PageView on load with visitId, event id, utm, fbp/fbc, as text/plain via the endpoint next to the script", () => {
    const b = makeBrowser({ url: LANDING });
    expect(b.sent).toHaveLength(1);
    const [pv] = b.sent;
    expect(pv.via).toBe("beacon");
    expect(pv.url).toBe("https://admin.example.com/api/v1/public/track/event");
    expect(pv.body).toMatchObject({
      name: "PageView",
      pageUrl: "https://link.monomiagency.com/?utm_source=meta&utm_medium=paid&utm_campaign=FB-OKT1&utm_content=ad1&fbclid=IwAR_Test123",
      utm: { source: "meta", medium: "paid", campaign: "FB-OKT1", content: "ad1" },
      fbclid: "IwAR_Test123",
    });
    expect(pv.body.visitId).toMatch(/^[0-9a-f-]{36}$/);
    expect(pv.body.eventId).toMatch(/^[0-9a-f-]{36}$/);
    expect(pv.body.eventId).not.toBe(pv.body.visitId);
    expect(pv.body.fbp).toMatch(/^fb\.1\.\d{13}\.\d{10}$/);
    expect(pv.body.fbc).toMatch(/\.IwAR_Test123$/);
  });

  it("keeps the same visitId for the whole session and a new one for a new session", () => {
    const session = new Map<string, string>();
    const first = makeBrowser({ url: LANDING, session });
    const again = makeBrowser({ url: "https://link.monomiagency.com/", session });
    expect(again.sent[0].body.visitId).toBe(first.sent[0].body.visitId);
    expect(again.sandbox.MonomiTrack.visitId).toBe(first.sent[0].body.visitId);
    expect(makeBrowser({ url: LANDING }).sent[0].body.visitId).not.toBe(first.sent[0].body.visitId);
  });

  it("track() sends ViewContent / EngagedVisit and refuses everything else (incl. Lead)", () => {
    const b = makeBrowser({ url: LANDING });
    b.sandbox.MonomiTrack.track("ViewContent");
    b.sandbox.MonomiTrack.track("EngagedVisit");
    b.sandbox.MonomiTrack.track("Lead");
    b.sandbox.MonomiTrack.track("Purchase");
    expect(b.sent.map((s) => s.body.name)).toEqual(["PageView", "ViewContent", "EngagedVisit"]);
    expect(new Set(b.sent.map((s) => s.body.visitId)).size).toBe(1);
    expect(new Set(b.sent.map((s) => s.body.eventId)).size).toBe(3);
  });

  it("falls back to fetch keepalive when sendBeacon refuses", () => {
    const b = makeBrowser({ url: LANDING, beacon: false });
    expect(b.sent[0].via).toBe("fetch");
  });

  it("openWhatsApp: code + normalised Instagram in the text, Lead event with answers, no 'looks'", () => {
    const b = makeBrowser({ url: LANDING });
    const r = b.sandbox.MonomiTrack.openWhatsApp({
      phone: "6285126203934",
      text: "Halo Monomi, saya mau tanya paket.",
      meta: { instagram: "https://www.instagram.com/Kopi.Senja/", brandName: "Kopi Senja", category: "F&B", looks: "3" },
    });
    const text = decodeURIComponent(new URL(r.url).search.replace(/^\?text=/, ""));
    expect(text).toBe(`Halo Monomi, saya mau tanya paket.\nInstagram: @kopi.senja\n\nKode: ${r.ref}`);
    expect(r.ref).toMatch(/^[2-9A-HJ-NP-Z]{6}$/);
    expect(b.sandbox.opened[0]).toBe(r.url);
    const lead = b.sent.find((s) => s.body.name === "Lead")!;
    expect(lead.body).toMatchObject({ ref: r.ref, eventId: r.eventId, meta: { instagram: "kopi.senja", brandName: "Kopi Senja", category: "F&B" } });
    expect(lead.body.meta).not.toHaveProperty("looks");
    expect(lead.body.visitId).toBe(b.sent[0].body.visitId);
  });

  it("a click on a plain wa.me link appends the code, keeps the text and sends the Lead", () => {
    const b = makeBrowser({ url: LANDING });
    const attrs: Record<string, string> = { href: "https://wa.me/6285126203934?text=Halo%20Monomi" };
    const el = { getAttribute: (k: string) => attrs[k], setAttribute: (k: string, v: string) => { attrs[k] = v; }, hasAttribute: () => false };
    b.listeners.click[0]({ target: { closest: () => el } });
    const text = decodeURIComponent(new URL(attrs.href).search.replace(/^\?text=/, ""));
    expect(text).toMatch(/^Halo Monomi\n\nKode: [2-9A-HJ-NP-Z]{6}$/);
    expect(b.sent.filter((s) => s.body.name === "Lead")).toHaveLength(1);
    // other links are left alone
    const other = { getAttribute: () => "https://example.com/x", setAttribute: () => { throw new Error("must not touch"); }, hasAttribute: () => false };
    expect(() => b.listeners.click[0]({ target: { closest: () => other } })).not.toThrow();
  });

  it("only https WhatsApp links get the code (http:// is left alone, no Lead)", () => {
    const b = makeBrowser({ url: LANDING });
    const plain = { getAttribute: () => "http://wa.me/6285126203934?text=Halo", setAttribute: () => { throw new Error("must not touch"); }, hasAttribute: () => false };
    b.listeners.click[0]({ target: { closest: () => plain } });
    expect(b.sent.filter((s) => s.body.name === "Lead")).toHaveLength(0);
  });

  it("never throws, whatever the environment (no storage, no crypto)", () => {
    expect(() => {
      const b = makeBrowser({ url: LANDING });
      b.sandbox.sessionStorage = undefined;
    }).not.toThrow();
  });
});

describe("monomi-track.js - TikTok click id (ttclid) and ad-touch times", () => {
  const TTCLID = "E.C.P.v3fQ2RHacdksKfofPmlyuStIIHJ4Af1tKYxF9zz2c2PLx1Oaw15oHpcfl5AH";
  const TT_LANDING = `https://link.monomiagency.com/?utm_source=tiktok&utm_campaign=1790000000000001&ttclid=${TTCLID}`;
  const DAY = 86_400_000;

  it("persists ttclid in a first-party cookie (>= 28 days, host-only) and localStorage, and sends it with every event", () => {
    const b = makeBrowser({ url: TT_LANDING });
    expect(b.jar.get("monomi_ttclid")).toEqual({ value: TTCLID, domain: null });
    expect(b.local.get("monomi_ttclid")).toBe(TTCLID);
    const write = b.cookieWrites.find((w) => w.startsWith("monomi_ttclid="))!;
    const expires = Date.parse(/expires=([^;]+)/.exec(write)![1]);
    expect(expires - Date.now()).toBeGreaterThan(28 * DAY);
    expect(write).not.toMatch(/domain=/i);
    b.sandbox.MonomiTrack.track("ViewContent");
    b.sandbox.MonomiTrack.openWhatsApp({ phone: "6285126203934" });
    expect(b.sent.length).toBeGreaterThanOrEqual(3);
    for (const s of b.sent) expect(s.body.ttclid).toBe(TTCLID);
  });

  it("never generates _ttp (nothing in the browser sets it without the TikTok Pixel)", () => {
    const b = makeBrowser({ url: TT_LANDING });
    expect(b.jar.has("_ttp")).toBe(false);
    expect(b.cookieWrites.join(";")).not.toMatch(/_ttp/);
    expect(JSON.stringify(b.sent)).not.toMatch(/ttp"/);
  });

  it("a returning direct visit still sends the stored ttclid and the stored touch times", () => {
    const first = makeBrowser({ url: TT_LANDING });
    const cookies = { monomi_ttclid: TTCLID, monomi_ttt: first.jar.get("monomi_ttt")!.value };
    const back = makeBrowser({ url: "https://link.monomiagency.com/", cookies });
    expect(back.sent[0].body.ttclid).toBe(TTCLID);
    expect(back.sent[0].body.ttt).toBe(Number(cookies.monomi_ttt));
    // and when only localStorage survived (cookie cleared), the cookie is restored
    const local = new Map([["monomi_ttclid", TTCLID], ["monomi_ttt", String(Date.now() - DAY)]]);
    const ls = makeBrowser({ url: "https://link.monomiagency.com/", local });
    expect(ls.sent[0].body.ttclid).toBe(TTCLID);
    expect(ls.jar.get("monomi_ttclid")?.value).toBe(TTCLID);
  });

  it("forgets a ttclid older than its 30-day retention", () => {
    const old = String(Date.now() - 40 * DAY);
    const b = makeBrowser({ url: "https://link.monomiagency.com/", cookies: { monomi_ttclid: TTCLID, monomi_ttt: old } });
    expect(b.sent[0].body.ttclid).toBeUndefined();
    expect(b.local.has("monomi_ttclid")).toBe(false);
  });

  it("accepts up to 1000 characters and refuses longer / malformed values", () => {
    const long = "a".repeat(1000);
    expect(makeBrowser({ url: `https://link.monomiagency.com/?ttclid=${long}` }).sent[0].body.ttclid).toBe(long);
    expect(makeBrowser({ url: `https://link.monomiagency.com/?ttclid=${long}b` }).sent[0].body.ttclid).toBeUndefined();
    expect(makeBrowser({ url: "https://link.monomiagency.com/?ttclid=%3Cscript%3E" }).sent[0].body.ttclid).toBeUndefined();
    expect(makeBrowser({ url: "https://link.monomiagency.com/?ttclid=ab" }).sent[0].body.ttclid).toBeUndefined();
  });

  it("records the time of the last Meta / TikTok touch (click id or utm_source) for last-touch attribution", () => {
    const before = Date.now();
    const meta = makeBrowser({ url: LANDING });
    expect(meta.sent[0].body.fbt).toBeGreaterThanOrEqual(before);
    expect(meta.sent[0].body.ttt).toBeUndefined();
    const tt = makeBrowser({ url: TT_LANDING });
    expect(tt.sent[0].body.ttt).toBeGreaterThanOrEqual(before);
    expect(tt.sent[0].body.fbt).toBeUndefined();
    // a Meta utm_source alone is a touch; a bare utm_source=tiktok (profile link) is NOT a TikTok ad touch
    expect(makeBrowser({ url: "https://link.monomiagency.com/?utm_source=instagram" }).sent[0].body.fbt).toBeGreaterThanOrEqual(before);
    expect(makeBrowser({ url: "https://link.monomiagency.com/?utm_source=tiktok" }).sent[0].body.ttt).toBeUndefined();
    expect(makeBrowser({ url: "https://link.monomiagency.com/?utm_source=tiktok&utm_medium=paid" }).sent[0].body.ttt).toBeUndefined();
    const organic = makeBrowser({ url: "https://link.monomiagency.com/" });
    expect(organic.sent[0].body.fbt).toBeUndefined();
    expect(organic.sent[0].body.ttt).toBeUndefined();
  });

  it("keeps both platforms' times side by side so the server can pick the newer one", () => {
    const fbAt = String(Date.now() - 20 * DAY);
    const b = makeBrowser({ url: TT_LANDING, cookies: { _fbc: "fb.1.1.OLD", monomi_fbt: fbAt } });
    expect(b.sent[0].body.fbt).toBe(Number(fbAt));
    expect(b.sent[0].body.ttt).toBeGreaterThan(Number(fbAt));
    expect(b.sent[0].body.fbc).toBe("fb.1.1.OLD");
  });
});

describe("monomi-track.js - ttclid lifetime and size safety", () => {
  const DAY = 86_400_000;
  it("drops a stored ttclid that has no touch time, or an expired one (and clears its storage)", () => {
    const noTime = makeBrowser({ url: "https://link.monomiagency.com/", cookies: { monomi_ttclid: "E.C.P.stored12345" } });
    expect(noTime.sent[0].body.ttclid).toBeUndefined();
    expect(noTime.sent[0].body.ttt).toBeUndefined();
    const local = new Map([["monomi_ttclid", "E.C.P.stored12345"]]);
    expect(makeBrowser({ url: "https://link.monomiagency.com/", local }).sent[0].body.ttclid).toBeUndefined();
    const expired = makeBrowser({ url: "https://link.monomiagency.com/", cookies: { monomi_ttclid: "E.C.P.stored12345", monomi_ttt: String(Date.now() - 31 * DAY) } });
    expect(expired.sent[0].body.ttclid).toBeUndefined();
    const fresh = makeBrowser({ url: "https://link.monomiagency.com/", cookies: { monomi_ttclid: "E.C.P.stored12345", monomi_ttt: String(Date.now() - 2 * DAY) } });
    expect(fresh.sent[0].body.ttclid).toBe("E.C.P.stored12345");
  });

  it("cuts pageUrl (1500) and referrer (500) before sending so the beacon never goes over the server cap", () => {
    const longQuery = "x".repeat(5000);
    const b = makeBrowser({ url: `https://link.monomiagency.com/?ttclid=${"a".repeat(1000)}&q=${longQuery}` });
    const body = b.sent[0].body;
    expect(body.pageUrl.length).toBe(1500);
    // the ttclid itself still travels in full, from the real URL
    expect(body.ttclid).toBe("a".repeat(1000));
    expect(JSON.stringify(body).length).toBeLessThan(8192);
    b.doc.referrer = "https://example.com/" + "r".repeat(2000);
    b.sandbox.MonomiTrack.track("ViewContent");
    expect(b.sent[b.sent.length - 1].body.referrer.length).toBe(500);
  });
});
