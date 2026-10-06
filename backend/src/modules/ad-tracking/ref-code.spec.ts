import { extractRefCode, generateRefCode, normalizeRefCode, REF_ALPHABET, REF_RE } from "./ref-code";

describe("ref code generation", () => {
  it("makes 6-char codes from the unambiguous alphabet", () => {
    for (let i = 0; i < 500; i += 1) {
      const code = generateRefCode();
      expect(code).toMatch(REF_RE);
      expect(code).not.toMatch(/[01IO]/);
    }
    expect(new Set(REF_ALPHABET).size).toBe(REF_ALPHABET.length);
  });

  it("normalises case and rejects look-alike or wrong-length codes", () => {
    expect(normalizeRefCode(" k7qm2x ")).toBe("K7QM2X");
    expect(normalizeRefCode("K7QM2")).toBeNull();
    expect(normalizeRefCode("K7QM2XX")).toBeNull();
    expect(normalizeRefCode("K7QM0X")).toBeNull(); // 0 is not in the alphabet
    expect(normalizeRefCode("K7QMOX")).toBeNull(); // nor is O
    expect(normalizeRefCode(123456)).toBeNull();
  });
});

describe("extractRefCode (shared by quick-add, ingest and the manual field)", () => {
  it.each([
    ["Halo, saya mau tanya paket.\n\nKode: K7QM2X", "K7QM2X"],
    ["halo kode K7QM2X", "K7QM2X"],
    ["KODE: k7qm2x", "K7QM2X"],
    ["Ref: K7QM2X", "K7QM2X"],
    ["ref k7qm2x tolong", "K7QM2X"],
    ["Kode:K7QM2X", "K7QM2X"],
    ["Kode = K7QM2X.", "K7QM2X"],
    ["Kode #K7QM2X", "K7QM2X"],
    ["Budi +62 812-3456-7890\nHalo\n\nKode: K7QM2X\n", "K7QM2X"],
  ])("finds %j", (text, code) => {
    expect(extractRefCode(text)).toBe(code);
  });

  it.each([
    "tidak ada kode di sini",
    "Kode: K7QM2", // too short
    "Kode: K7QM2XX", // too long
    "Kode: K7QM0X", // invalid alphabet
    "Kodean K7QM2X", // label must be a whole word
    "K7QM2X tanpa label",
    "[FB-OKT1] halo",
    "",
  ])("ignores %j", (text) => {
    expect(extractRefCode(text)).toBeNull();
  });

  it("skips an invalid candidate and takes the next valid one", () => {
    expect(extractRefCode("kode promo? Kode: K7QM2X")).toBe("K7QM2X");
    expect(extractRefCode(null)).toBeNull();
    expect(extractRefCode(undefined)).toBeNull();
  });
});
