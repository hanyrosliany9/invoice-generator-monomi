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
