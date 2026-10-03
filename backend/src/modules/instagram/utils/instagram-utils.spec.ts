import { createHmac, randomBytes } from "crypto";
import { createState, deriveStateKey, verifyState } from "./oauth-state";
import { buildSignedRequest, parseSignedRequest } from "./signed-request";
import { decryptToken, encryptToken, tokenAad } from "./token-crypto";

const SECRET = "app-secret-for-tests-0123456789";

describe("OAuth state", () => {
  const key = deriveStateKey(SECRET);
  const t0 = new Date("2026-10-01T00:00:00Z");

  it("round-trips a fresh state", () => {
    const { state, nonce } = createState(key, t0);
    const r = verifyState(key, state, new Date(t0.getTime() + 60_000));
    expect(r).toEqual(expect.objectContaining({ ok: true, nonce }));
  });

  it("expires after 10 minutes", () => {
    const { state } = createState(key, t0);
    expect(verifyState(key, state, new Date(t0.getTime() + 10 * 60_000 + 1))).toEqual({ ok: false, reason: "expired" });
  });

  it("rejects a state signed with another key, a tampered expiry and junk", () => {
    const { state } = createState(key, t0);
    expect(verifyState(deriveStateKey("other-secret-xxxxxxxxxxxx"), state, t0)).toEqual({ ok: false, reason: "bad_signature" });
    const [n, exp, sig] = state.split(".");
    expect(verifyState(key, `${n}.${Number(exp) + 3600}.${sig}`, t0)).toEqual({ ok: false, reason: "bad_signature" });
    expect(verifyState(key, "abc", t0).ok).toBe(false);
    expect(verifyState(key, undefined, t0).ok).toBe(false);
    expect(verifyState(key, "x".repeat(1000), t0).ok).toBe(false);
  });

  it("does not put anything but nonce/expiry/signature in the state", () => {
    const { state } = createState(key, t0);
    expect(state.split(".")).toHaveLength(3);
    expect(state).not.toMatch(/client|@|http/i);
  });
});

describe("signed_request", () => {
  const payload = { algorithm: "HMAC-SHA256", issued_at: 1790000000, user_id: "17841400000000001" };

  it("accepts a valid request", () => {
    expect(parseSignedRequest(buildSignedRequest(payload, SECRET), SECRET)).toEqual(
      expect.objectContaining({ user_id: "17841400000000001" }),
    );
  });

  it("rejects a wrong secret, tampered payload or signature, bad algorithm and malformed input", () => {
    const good = buildSignedRequest(payload, SECRET);
    expect(parseSignedRequest(good, "another-secret")).toBeNull();

    const [sig] = good.split(".");
    const tamperedPayload = Buffer.from(JSON.stringify({ ...payload, user_id: "999" })).toString("base64url");
    expect(parseSignedRequest(`${sig}.${tamperedPayload}`, SECRET)).toBeNull();

    const [, p] = good.split(".");
    const flipped = (sig[0] === "A" ? "B" : "A") + sig.slice(1);
    expect(parseSignedRequest(`${flipped}.${p}`, SECRET)).toBeNull();

    expect(parseSignedRequest(buildSignedRequest({ ...payload, algorithm: "none" }, SECRET), SECRET)).toBeNull();
    expect(parseSignedRequest(buildSignedRequest({ algorithm: "HMAC-SHA256" }, SECRET), SECRET)).toBeNull();
    expect(parseSignedRequest("no-dot", SECRET)).toBeNull();
    expect(parseSignedRequest("a.b.c", SECRET)).toBeNull();
    expect(parseSignedRequest(123, SECRET)).toBeNull();
    expect(parseSignedRequest(good, "")).toBeNull();
  });

  it("signature check uses the payload segment exactly as received", () => {
    const payloadPart = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const sig = createHmac("sha256", SECRET).update(payloadPart).digest("base64url");
    expect(parseSignedRequest(`${sig}.${payloadPart}`, SECRET)?.user_id).toBe(payload.user_id);
  });
});

describe("token encryption (AES-256-GCM)", () => {
  const key = randomBytes(32);
  const token = "IGAAexampleLongLivedToken_abcdefghijklmnopqrstuvwxyz0123456789";

  it("round-trips and never contains the plaintext", () => {
    const enc = encryptToken(token, key, tokenAad("client-a"));
    expect(enc).toMatch(/^v1:/);
    expect(enc).not.toContain(token);
    expect(decryptToken(enc, key, tokenAad("client-a"))).toBe(token);
  });

  it("uses a fresh IV each time", () => {
    expect(encryptToken(token, key, tokenAad("c"))).not.toBe(encryptToken(token, key, tokenAad("c")));
  });

  it("fails with another client's AAD, another key, or any tampering", () => {
    const enc = encryptToken(token, key, tokenAad("client-a"));
    expect(() => decryptToken(enc, key, tokenAad("client-b"))).toThrow();
    expect(() => decryptToken(enc, randomBytes(32), tokenAad("client-a"))).toThrow();
    const parts = enc.split(":");
    const ct = Buffer.from(parts[3], "base64url");
    ct[0] ^= 1;
    expect(() => decryptToken([parts[0], parts[1], parts[2], ct.toString("base64url")].join(":"), key, tokenAad("client-a"))).toThrow();
    expect(() => decryptToken("v2:x:y:z", key, tokenAad("client-a"))).toThrow();
    expect(() => encryptToken(token, randomBytes(16), tokenAad("x"))).toThrow();
  });
});
