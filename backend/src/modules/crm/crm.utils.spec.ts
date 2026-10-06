import {
  buildFunnel,
  endOfTodayWib,
  findDropOff,
  median,
  normalizePhone,
  parseQuickAdd,
  prorateSpend,
  startOfTodayWib,
  waIdFromPhone,
} from "./crm.utils";

describe("normalizePhone", () => {
  it.each([
    ["08123456789", "+628123456789"],
    ["0812-3456-789", "+628123456789"],
    ["+62 812-3456-789", "+628123456789"],
    ["628123456789", "+628123456789"],
    ["62 812 3456 789", "+628123456789"],
    ["8123456789", "+628123456789"],
    ["0062 812 3456 789", "+628123456789"],
    ["(0812) 3456.789", "+628123456789"],
    ["+1 415 555 2671", "+14155552671"],
  ])("%s -> %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each([[""], [null], [undefined], ["abc"], ["123"], ["+62 12"], ["0812345678901234567"]])(
    "rejects %p",
    (input) => {
      expect(normalizePhone(input as any)).toBeNull();
    },
  );

  it("derives the WhatsApp id without the plus", () => {
    expect(waIdFromPhone("+628123456789")).toBe("628123456789");
    expect(waIdFromPhone(null)).toBeNull();
  });
});

describe("parseQuickAdd", () => {
  it("parses name + phone on the first line and a [CODE] in the message", () => {
    const r = parseQuickAdd(
      "Budi Santoso +62 857-1234-9921\nHi Monomi, I'm interested in a product photo package [IG-REELS2]",
    );
    expect(r.name).toBe("Budi Santoso");
    expect(r.phone).toBe("+6285712349921");
    expect(r.campaignCode).toBe("IG-REELS2");
    expect(r.message).toContain("product photo package");
    expect(r.message).not.toContain("Budi Santoso");
  });

  it("finds a bare campaign code from the known list (case-insensitive)", () => {
    const r = parseQuickAdd("Halo kak, mau tanya paket fb-okt1 ya. 081234567890", ["FB-OKT1", "IG-REELS2"]);
    expect(r.campaignCode).toBe("FB-OKT1");
    expect(r.phone).toBe("+6281234567890");
  });

  it("does not match a known code inside a longer token", () => {
    const r = parseQuickAdd("see XFB-OKT19 please", ["FB-OKT1"]);
    expect(r.campaignCode).toBeNull();
  });

  it("prefers bracket codes and ignores unknown bare words", () => {
    expect(parseQuickAdd("hi [fb-lain]").campaignCode).toBe("FB-LAIN");
    expect(parseQuickAdd("hi there", ["FB-OKT1"]).campaignCode).toBeNull();
  });

  it("reads labelled names and wa.me links", () => {
    const r = parseQuickAdd("Nama: Rina Wijaya\nhttps://wa.me/6281299991204");
    expect(r.name).toBe("Rina Wijaya");
    expect(r.phone).toBe("+6281299991204");
  });

  it("returns nulls for empty or number-free text", () => {
    expect(parseQuickAdd("")).toEqual({ name: null, phone: null, campaignCode: null, message: null });
    expect(parseQuickAdd("just a question").phone).toBeNull();
  });

  it("does not treat a long sentence as a name", () => {
    const r = parseQuickAdd("Hi I would like to ask about the video package price 08123456789");
    expect(r.phone).toBe("+628123456789");
    expect(r.name).toBeNull();
  });
});

describe("stats helpers", () => {
  it("median/average edge cases", () => {
    expect(median([])).toBeNull();
    expect(median([5])).toBe(5);
    expect(median([1, 9, 3])).toBe(3);
    expect(median([1, 3, 5, 9])).toBe(4);
  });

  it("prorates a spend range across the reporting window", () => {
    const d = (s: string) => new Date(s + "T00:00:00Z");
    // Oct 1-10 (10 days) 1,000,000: window Oct 6-30 covers 5 days -> 500,000
    expect(prorateSpend(1_000_000, d("2026-10-01"), d("2026-10-10"), d("2026-10-06"), d("2026-10-30"))).toBeCloseTo(500_000);
    expect(prorateSpend(1_000_000, d("2026-10-01"), d("2026-10-10"), d("2026-11-01"), d("2026-11-30"))).toBe(0);
    expect(prorateSpend(300_000, d("2026-10-05"), d("2026-10-05"), d("2026-10-01"), d("2026-10-31"))).toBe(300_000);
  });

  const stages = [
    { id: "s1", key: "NEW", name: "New", order: 1, type: "OPEN" as const },
    { id: "s2", key: "QUALIFIED", name: "Qualified", order: 2, type: "OPEN" as const },
    { id: "s3", key: "MEETING", name: "Meeting", order: 3, type: "OPEN" as const },
    { id: "s5", key: "WON", name: "Won", order: 5, type: "WON" as const },
    { id: "s6", key: "LOST", name: "Lost", order: 6, type: "LOST" as const },
  ];

  it("builds a monotonic progression funnel and a drop-off insight", () => {
    const leads = [
      { maxReachedOrder: 1, currentStageType: "OPEN" as const },
      { maxReachedOrder: 1, currentStageType: "OPEN" as const },
      { maxReachedOrder: 1, currentStageType: "LOST" as const },
      { maxReachedOrder: 2, currentStageType: "OPEN" as const },
      { maxReachedOrder: 3, currentStageType: "OPEN" as const },
      { maxReachedOrder: 5, currentStageType: "WON" as const },
    ];
    const f = buildFunnel(stages, leads);
    expect(f.map((s) => s.count)).toEqual([6, 3, 2, 1]); // New, Qualified, Meeting, Won (Lost excluded)
    expect(f[1].continuePct).toBe(50);
    const d = findDropOff(f);
    expect(d?.fromKey).toBe("NEW");
    expect(d?.toKey).toBe("QUALIFIED");
    expect(d?.dropPct).toBe(50);
    expect(d?.lost).toBe(3);
  });

  it("drop-off is null for an empty funnel", () => {
    expect(findDropOff(buildFunnel(stages, []))).toBeNull();
  });

  it("computes WIB day boundaries", () => {
    // 2026-10-06 20:00 UTC is 03:00 WIB on Oct 7
    const now = new Date("2026-10-06T20:00:00Z");
    expect(endOfTodayWib(now).toISOString()).toBe("2026-10-07T16:59:59.999Z");
    expect(startOfTodayWib(now).toISOString()).toBe("2026-10-06T17:00:00.000Z");
  });
});
