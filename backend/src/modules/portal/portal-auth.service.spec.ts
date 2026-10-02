import { BadRequestException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PortalAuthService } from "./portal-auth.service";
import {
  PORTAL_CODE_MAX_ACTIVE,
  PORTAL_CODE_MAX_ATTEMPTS,
  PORTAL_CODE_MAX_PER_DAY,
  PORTAL_CODE_MAX_PER_HOUR,
  PORTAL_VERIFY_MAX_FAILURES,
  PORTAL_MAX_PENDING_CODE_REQUESTS,
  PORTAL_INVALID_CODE_MESSAGE,
  PORTAL_JWT_AUDIENCE,
  getPortalJwtSecret,
} from "./portal.config";

/**
 * Client portal login: no enumeration (body or timing) on request-code,
 * per-email rate limit, several live codes per email, per-code attempt limit /
 * expiry / single use on verify-code, and session revocation (deactivation,
 * tokenVersion bump, staff tokens).
 */

const STAFF_SECRET = "staff-secret-for-tests-0123456789abcdef";
const PORTAL_SECRET = "portal-secret-for-tests-0123456789abcdef-xyz";

type Client = { id: string; name: string; isInternal: boolean; status: string };
type Contact = {
  id: string;
  clientId: string;
  email: string;
  name: string;
  isActive: boolean;
  tokenVersion: number;
  lastLoginAt: Date | null;
};
type Code = {
  id: string;
  email: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  consumedAt: Date | null;
  requestIp: string | null;
  createdAt: Date;
};

/** Tiny matcher for the where-shapes PortalAuthService uses. */
function matches(row: any, where: any): boolean {
  return Object.entries(where ?? {}).every(([k, cond]: [string, any]) => {
    const v = row[k];
    if (cond === null) return v === null;
    if (cond instanceof Date) return v?.getTime() === cond.getTime();
    if (typeof cond === "object") {
      if ("in" in cond) return cond.in.includes(v);
      if ("gt" in cond) return v > cond.gt;
      if ("gte" in cond) return v >= cond.gte;
      if ("lt" in cond) return v < cond.lt;
      return matches(v ?? {}, cond);
    }
    return v === cond;
  });
}

type Failure = { id: string; email: string; createdAt: Date };

function createFakePrisma(
  clients: Client[],
  contacts: Contact[],
  codes: Code[],
  failures: Failure[] = [],
) {
  let seq = 0;
  const withClient = (c: Contact) => ({
    ...c,
    client: clients.find((cl) => cl.id === c.clientId)!,
  });
  const apply = (row: any, data: any) => {
    for (const [k, v] of Object.entries<any>(data)) {
      row[k] = v && typeof v === "object" && "increment" in v ? row[k] + v.increment : v;
    }
  };
  return {
    clientPortalContact: {
      findMany: jest.fn(async ({ where }: any) =>
        contacts
          .map(withClient)
          .filter((c) => matches(c, where))
          .map((c) => ({
            id: c.id,
            clientId: c.clientId,
            name: c.name,
            email: c.email,
            tokenVersion: c.tokenVersion,
            client: {
              id: c.client.id,
              name: c.client.name,
              instagramHandle: null,
              instagramAvatarUrl: null,
              tiktokHandle: null,
            },
          })),
      ),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const rows = contacts.filter((c) => matches(c, where));
        rows.forEach((r) => apply(r, data));
        return { count: rows.length };
      }),
    },
    clientPortalLoginCode: {
      count: jest.fn(async ({ where }: any) => codes.filter((c) => matches(c, where)).length),
      findFirst: jest.fn(async ({ where }: any) => {
        const rows = codes
          .filter((c) => matches(c, where))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return rows[0] ?? null;
      }),
      findMany: jest.fn(async ({ where, take }: any) => {
        const rows = codes
          .filter((c) => matches(c, where))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return (take === undefined ? rows : rows.slice(0, take)).map((r) => ({
          id: r.id,
          codeHash: r.codeHash,
        }));
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const rows = codes.filter((c) => matches(c, where));
        rows.forEach((r) => apply(r, data));
        return { count: rows.length };
      }),
      create: jest.fn(async ({ data }: any) => {
        const row: Code = {
          id: `code-${++seq}`,
          attempts: 0,
          consumedAt: null,
          requestIp: null,
          // strictly increasing createdAt so "latest" is deterministic
          createdAt: new Date(Date.now() + seq),
          ...data,
        };
        codes.push(row);
        return row;
      }),
    },
    clientPortalLoginFailure: {
      count: jest.fn(async ({ where }: any) => failures.filter((f) => matches(f, where)).length),
      create: jest.fn(async ({ data }: any) => {
        const row: Failure = { id: `fail-${++seq}`, createdAt: new Date(), ...data };
        failures.push(row);
        return row;
      }),
      deleteMany: jest.fn(async ({ where }: any) => {
        const keep = failures.filter((f) => !matches(f, where));
        const count = failures.length - keep.length;
        failures.splice(0, failures.length, ...keep);
        return { count };
      }),
    },
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };
}

describe("PortalAuthService", () => {
  const OLD_ENV = process.env;
  let clients: Client[];
  let contacts: Contact[];
  let codes: Code[];
  let failures: Failure[];
  let prisma: ReturnType<typeof createFakePrisma>;
  let notifications: { sendPortalLoginCode: jest.Mock };
  let service: PortalAuthService;
  let jwt: JwtService;
  let warnSpy: jest.SpyInstance;

  /** Codes are logged in non-production; capture them from the logger. */
  const lastLoggedCode = (): string => {
    const calls = warnSpy.mock.calls.map((c) => String(c[0]));
    const line = [...calls].reverse().find((l) => l.includes("Portal login code for"));
    return line!.split(": ").pop()!;
  };

  beforeEach(() => {
    process.env = {
      ...OLD_ENV,
      NODE_ENV: "test",
      JWT_SECRET: STAFF_SECRET,
      PORTAL_JWT_SECRET: PORTAL_SECRET,
    };
    clients = [
      { id: "client-a", name: "Alpha", isInternal: false, status: "active" },
      { id: "client-b", name: "Beta", isInternal: false, status: "active" },
      { id: "client-internal", name: "Monomi", isInternal: true, status: "active" },
      { id: "client-inactive", name: "Gone", isInternal: false, status: "inactive" },
    ];
    contacts = [
      { id: "ct-a", clientId: "client-a", email: "budi@alpha.co", name: "Budi", isActive: true, tokenVersion: 0, lastLoginAt: null },
      { id: "ct-b", clientId: "client-b", email: "budi@alpha.co", name: "Budi B", isActive: true, tokenVersion: 0, lastLoginAt: null },
      { id: "ct-off", clientId: "client-a", email: "off@alpha.co", name: "Off", isActive: false, tokenVersion: 0, lastLoginAt: null },
      { id: "ct-int", clientId: "client-internal", email: "staff@monomi.id", name: "Int", isActive: true, tokenVersion: 0, lastLoginAt: null },
      { id: "ct-inact", clientId: "client-inactive", email: "gone@x.co", name: "Gone", isActive: true, tokenVersion: 0, lastLoginAt: null },
    ];
    codes = [];
    failures = [];
    prisma = createFakePrisma(clients, contacts, codes, failures);
    notifications = { sendPortalLoginCode: jest.fn().mockResolvedValue(undefined) };
    jwt = new JwtService({});
    service = new PortalAuthService(prisma as any, jwt, notifications as any);
    warnSpy = jest.spyOn((service as any).logger, "warn").mockImplementation(() => undefined);
    jest.spyOn((service as any).logger, "log").mockImplementation(() => undefined);
    jest.spyOn((service as any).logger, "error").mockImplementation(() => undefined);
  });

  afterEach(async () => {
    await service.whenIdle();
    process.env = OLD_ENV;
    jest.restoreAllMocks();
  });

  /** request-code + wait for its background issuance to finish. */
  const request = async (email: unknown, ip?: string) => {
    const result = await service.requestCode(email, ip);
    await service.whenIdle();
    return result;
  };

  /** Insert a known code directly (deterministic verify tests). */
  let seedSeq = 0;
  const seedCode = (email: string, code: string, extra: Partial<Code> = {}) => {
    seedSeq++;
    const row: Code = {
      id: `seed-${seedSeq}`,
      email,
      codeHash: service.hashCode(email, code),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
      consumedAt: null,
      requestIp: null,
      createdAt: new Date(Date.now() - 60_000 + seedSeq),
      ...extra,
    };
    codes.push(row);
    return row;
  };

  describe("request-code", () => {
    it.each([
      ["unknown email", "nobody@nowhere.co"],
      ["deactivated contact", "off@alpha.co"],
      ["contact of an internal client", "staff@monomi.id"],
      ["contact of an inactive client", "gone@x.co"],
    ])("returns { sent: true } and sends nothing for %s", async (_label, email) => {
      await expect(request(email, "1.2.3.4")).resolves.toEqual({ sent: true });
      expect(prisma.clientPortalLoginCode.create).not.toHaveBeenCalled();
      expect(notifications.sendPortalLoginCode).not.toHaveBeenCalled();
    });

    it("issues a hashed code for an active contact (email normalised)", async () => {
      await expect(request("  BUDI@Alpha.co ", "1.2.3.4")).resolves.toEqual({ sent: true });
      expect(codes).toHaveLength(1);
      const code = lastLoggedCode();
      expect(code).toMatch(/^\d{6}$/);
      expect(codes[0].email).toBe("budi@alpha.co");
      expect(codes[0].codeHash).not.toContain(code);
      expect(codes[0].codeHash).toBe(service.hashCode("budi@alpha.co", code));
      expect(codes[0].requestIp).toBe("1.2.3.4");
      expect(notifications.sendPortalLoginCode).toHaveBeenCalledWith(
        "budi@alpha.co",
        expect.objectContaining({ code, expiresInMinutes: 10 }),
      );
    });

    it("still answers { sent: true } when SMTP fails (failure only logged)", async () => {
      const errorSpy = (service as any).logger.error as jest.Mock;
      notifications.sendPortalLoginCode.mockRejectedValueOnce(new Error("535 BadCredentials"));
      await expect(request("budi@alpha.co")).resolves.toEqual({ sent: true });
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("FAILED"));
    });

    describe("response is independent of the eligibility lookup (timing)", () => {
      const allDbCalls = () =>
        prisma.clientPortalContact.findMany.mock.calls.length +
        prisma.clientPortalLoginCode.count.mock.calls.length +
        prisma.clientPortalLoginCode.create.mock.calls.length;

      it.each([
        ["unknown email", "nobody@nowhere.co", false],
        ["real contact", "budi@alpha.co", false],
        ["rate-limited contact", "budi@alpha.co", true],
      ])("%s: resolves before ANY lookup / rate-limit / code work starts", async (_l, email, limited) => {
        if (limited) {
          for (let i = 0; i < PORTAL_CODE_MAX_PER_HOUR; i++) seedCode(email as string, "000000");
        }
        prisma.clientPortalContact.findMany.mockClear();
        prisma.clientPortalLoginCode.count.mockClear();
        prisma.clientPortalLoginCode.create.mockClear();
        await expect(service.requestCode(email, "1.2.3.4")).resolves.toEqual({ sent: true });
        // The response settled with zero DB work done...
        expect(allDbCalls()).toBe(0);
        expect(notifications.sendPortalLoginCode).not.toHaveBeenCalled();
        // ...and the work happens afterwards, in the background.
        await service.whenIdle();
        expect(prisma.clientPortalContact.findMany).toHaveBeenCalledTimes(1);
        expect(prisma.clientPortalLoginCode.create).toHaveBeenCalledTimes(
          email === "budi@alpha.co" && !limited ? 1 : 0,
        );
      });

      it("a failing lookup is logged, never an unhandled rejection", async () => {
        const errorSpy = (service as any).logger.error as jest.Mock;
        prisma.clientPortalContact.findMany.mockRejectedValueOnce(new Error("db down"));
        await expect(request("budi@alpha.co")).resolves.toEqual({ sent: true });
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("db down"));
      });

      it("malformed input answers { sent: true } and schedules nothing", async () => {
        for (const bad of ["not-an-email", "", undefined, 42, `${"a".repeat(250)}@x.co`]) {
          await expect(request(bad)).resolves.toEqual({ sent: true });
        }
        expect(prisma.clientPortalContact.findMany).not.toHaveBeenCalled();
      });

      it(`drops (with a warning) beyond ${PORTAL_MAX_PENDING_CODE_REQUESTS} pending issuances`, async () => {
        const n = PORTAL_MAX_PENDING_CODE_REQUESTS + 5;
        const results = Array.from({ length: n }, (_, i) =>
          service.requestCode(`user${i}@nowhere.co`),
        );
        await expect(Promise.all(results)).resolves.toHaveLength(n);
        await service.whenIdle();
        expect(prisma.clientPortalContact.findMany).toHaveBeenCalledTimes(
          PORTAL_MAX_PENDING_CODE_REQUESTS,
        );
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("dropped"));
      });
    });

    it(`rate limits to ${PORTAL_CODE_MAX_PER_HOUR} codes per email per hour (silently)`, async () => {
      for (let i = 0; i < PORTAL_CODE_MAX_PER_HOUR; i++) {
        await request("budi@alpha.co");
      }
      expect(codes).toHaveLength(PORTAL_CODE_MAX_PER_HOUR);
      notifications.sendPortalLoginCode.mockClear();

      await expect(request("budi@alpha.co")).resolves.toEqual({ sent: true });
      expect(codes).toHaveLength(PORTAL_CODE_MAX_PER_HOUR);
      expect(notifications.sendPortalLoginCode).not.toHaveBeenCalled();
    });

    it("codes older than an hour do not count toward the limit", async () => {
      for (let i = 0; i < PORTAL_CODE_MAX_PER_HOUR; i++) {
        codes.push({
          id: `old-${i}`, email: "budi@alpha.co", codeHash: "x",
          expiresAt: new Date(Date.now() - 3_000_000), attempts: 0, consumedAt: null,
          requestIp: null, createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        });
      }
      await request("budi@alpha.co");
      expect(prisma.clientPortalLoginCode.create).toHaveBeenCalledTimes(1);
    });

    it("does NOT invalidate earlier codes when a new one is requested", async () => {
      await request("budi@alpha.co");
      await request("budi@alpha.co");
      expect(codes).toHaveLength(2);
      expect(prisma.clientPortalLoginCode.updateMany).not.toHaveBeenCalled();
      for (const c of codes) {
        expect(c.consumedAt).toBeNull();
        expect(c.expiresAt.getTime()).toBeGreaterThan(Date.now());
      }
    });
  });

  describe("verify-code", () => {
    const issue = async (email = "budi@alpha.co") => {
      await request(email);
      return lastLoggedCode();
    };
    const wrong = (code: string) => String((Number(code) + 1) % 1_000_000).padStart(6, "0");

    it("logs in with the right code and returns the session view for all clients", async () => {
      const code = await issue();
      const result = await service.verifyCode("Budi@Alpha.co", code);

      expect(result.view.email).toBe("budi@alpha.co");
      expect(result.view.clients.map((c) => c.id).sort()).toEqual(["client-a", "client-b"]);
      expect(result.maxAgeMs).toBe(30 * 24 * 60 * 60 * 1000);
      expect(contacts.find((c) => c.id === "ct-a")!.lastLoginAt).toBeInstanceOf(Date);

      const payload: any = jwt.decode(result.token);
      expect(payload.sub).toBe("budi@alpha.co");
      expect(payload.aud).toBe(PORTAL_JWT_AUDIENCE);
      expect(payload.ver).toEqual({ "ct-a": 0, "ct-b": 0 });
    });

    it("a code is single-use", async () => {
      const code = await issue();
      await service.verifyCode("budi@alpha.co", code);
      await expect(service.verifyCode("budi@alpha.co", code)).rejects.toThrow(
        PORTAL_INVALID_CODE_MESSAGE,
      );
    });

    it(`kills the code after ${PORTAL_CODE_MAX_ATTEMPTS} attempts, even if the right code follows`, async () => {
      const code = await issue();
      for (let i = 0; i < PORTAL_CODE_MAX_ATTEMPTS; i++) {
        await expect(service.verifyCode("budi@alpha.co", wrong(code))).rejects.toThrow(
          PORTAL_INVALID_CODE_MESSAGE,
        );
      }
      await expect(service.verifyCode("budi@alpha.co", code)).rejects.toThrow(
        PORTAL_INVALID_CODE_MESSAGE,
      );
      expect(codes[0].attempts).toBe(PORTAL_CODE_MAX_ATTEMPTS);
    });

    it("the right code within the attempt budget still works", async () => {
      const code = await issue();
      for (let i = 0; i < PORTAL_CODE_MAX_ATTEMPTS - 1; i++) {
        await expect(service.verifyCode("budi@alpha.co", wrong(code))).rejects.toThrow();
      }
      await expect(service.verifyCode("budi@alpha.co", code)).resolves.toHaveProperty("token");
    });

    it("rejects an expired code", async () => {
      const code = await issue();
      codes[0].expiresAt = new Date(Date.now() - 1000);
      await expect(service.verifyCode("budi@alpha.co", code)).rejects.toThrow(
        PORTAL_INVALID_CODE_MESSAGE,
      );
    });

    it("rejects a valid code if the contact was deactivated after it was issued", async () => {
      const code = await issue();
      contacts.forEach((c) => (c.isActive = false));
      await expect(service.verifyCode("budi@alpha.co", code)).rejects.toThrow(
        PORTAL_INVALID_CODE_MESSAGE,
      );
    });

    it("a code is bound to its email", async () => {
      const code = await issue("budi@alpha.co");
      contacts.push({ id: "ct-x", clientId: "client-a", email: "eve@alpha.co", name: "Eve", isActive: true, tokenVersion: 0, lastLoginAt: null });
      // Eve has no code of her own; Budi's code must not work for her.
      await expect(service.verifyCode("eve@alpha.co", code)).rejects.toThrow(
        PORTAL_INVALID_CODE_MESSAGE,
      );
    });

    describe(`up to ${PORTAL_CODE_MAX_ACTIVE} live codes per email (targeted-lockout mitigation)`, () => {
      const EMAIL = "budi@alpha.co";

      it("codes requested by someone else do not void the victim's pending code", async () => {
        const mine = seedCode(EMAIL, "111111");
        seedCode(EMAIL, "222222"); // attacker-triggered request
        seedCode(EMAIL, "333333"); // attacker-triggered request
        await expect(service.verifyCode(EMAIL, "111111")).resolves.toHaveProperty("token");
        expect(mine.consumedAt).toBeInstanceOf(Date);
      });

      it(`only the ${PORTAL_CODE_MAX_ACTIVE} most recent unconsumed, unexpired codes verify`, async () => {
        seedCode(EMAIL, "111111"); // 4th most recent -> outside the window
        seedCode(EMAIL, "222222");
        seedCode(EMAIL, "333333");
        seedCode(EMAIL, "444444");
        await expect(service.verifyCode(EMAIL, "111111")).rejects.toThrow(PORTAL_INVALID_CODE_MESSAGE);
        expect(prisma.clientPortalLoginCode.findMany).toHaveBeenLastCalledWith(
          expect.objectContaining({ take: PORTAL_CODE_MAX_ACTIVE, orderBy: { createdAt: "desc" } }),
        );
        await expect(service.verifyCode(EMAIL, "222222")).resolves.toHaveProperty("token");
      });

      it("expired and consumed codes do not take a slot", async () => {
        seedCode(EMAIL, "111111");
        seedCode(EMAIL, "222222", { expiresAt: new Date(Date.now() - 1000) });
        seedCode(EMAIL, "333333", { consumedAt: new Date() });
        seedCode(EMAIL, "444444");
        await expect(service.verifyCode(EMAIL, "111111")).resolves.toHaveProperty("token");
      });

      it("consuming one code invalidates every other outstanding code for the email", async () => {
        const others = [seedCode(EMAIL, "111111"), seedCode(EMAIL, "222222")];
        seedCode(EMAIL, "333333");
        await service.verifyCode(EMAIL, "333333");
        for (const o of others) expect(o.consumedAt).toBeInstanceOf(Date);
        await expect(service.verifyCode(EMAIL, "111111")).rejects.toThrow(PORTAL_INVALID_CODE_MESSAGE);
        await expect(service.verifyCode(EMAIL, "222222")).rejects.toThrow(PORTAL_INVALID_CODE_MESSAGE);
      });

      it("each code has its own attempt counter", async () => {
        const a = seedCode(EMAIL, "111111");
        for (let i = 0; i < PORTAL_CODE_MAX_ATTEMPTS - 1; i++) {
          await expect(service.verifyCode(EMAIL, "999999")).rejects.toThrow();
        }
        const b = seedCode(EMAIL, "222222");
        await expect(service.verifyCode(EMAIL, "999999")).rejects.toThrow();
        expect(a.attempts).toBe(PORTAL_CODE_MAX_ATTEMPTS);
        expect(b.attempts).toBe(1);
        // a's budget is spent (even with the right code); b still works.
        await expect(service.verifyCode(EMAIL, "111111")).rejects.toThrow(PORTAL_INVALID_CODE_MESSAGE);
        expect(a.attempts).toBe(PORTAL_CODE_MAX_ATTEMPTS);
        await expect(service.verifyCode(EMAIL, "222222")).resolves.toHaveProperty("token");
      });

      it("parallel guesses never exceed any code's attempt budget", async () => {
        const rows = [seedCode(EMAIL, "111111"), seedCode(EMAIL, "222222"), seedCode(EMAIL, "333333")];
        await Promise.allSettled(
          Array.from({ length: 20 }, () => service.verifyCode(EMAIL, "999999")),
        );
        for (const r of rows) expect(r.attempts).toBe(PORTAL_CODE_MAX_ATTEMPTS);
        await expect(service.verifyCode(EMAIL, "111111")).rejects.toThrow(PORTAL_INVALID_CODE_MESSAGE);
      });

      it("bounded work: at most one reservation per candidate per request", async () => {
        for (let i = 0; i < 6; i++) seedCode(EMAIL, String(100000 + i));
        prisma.clientPortalLoginCode.updateMany.mockClear();
        await expect(service.verifyCode(EMAIL, "999999")).rejects.toThrow();
        expect(prisma.clientPortalLoginCode.updateMany).toHaveBeenCalledTimes(PORTAL_CODE_MAX_ACTIVE);
      });
    });

    it("answers every failure with the same generic 400", async () => {
      const code = await issue();
      const failures = [
        service.verifyCode("nobody@nowhere.co", "123456"), // unknown email
        service.verifyCode("budi@alpha.co", "12ab"), // malformed code
        service.verifyCode("not-an-email", code), // malformed email
        service.verifyCode("budi@alpha.co", wrong(code)), // wrong code
      ];
      for (const p of failures) {
        const err = await p.catch((e) => e);
        expect(err).toBeInstanceOf(BadRequestException);
        expect(err.message).toBe(PORTAL_INVALID_CODE_MESSAGE);
      }
    });
  });

  describe("per-email daily cap and failed-verification lockout", () => {
    const HOUR = 60 * 60 * 1000;
    const wrong = (code: string) => String((Number(code) + 1) % 1_000_000).padStart(6, "0");
    const verifyErr = (email: string, code: string) =>
      service.verifyCode(email, code).then(
        () => null,
        (e) => e,
      );

    it(`issues at most ${PORTAL_CODE_MAX_PER_DAY} codes per email per 24h (silently)`, async () => {
      // Spread over the day, none in the last hour, so only the daily cap applies.
      for (let i = 0; i < PORTAL_CODE_MAX_PER_DAY; i++) {
        codes.push({
          id: `day-${i}`, email: "budi@alpha.co", codeHash: "x",
          expiresAt: new Date(Date.now() - HOUR), attempts: 0, consumedAt: null,
          requestIp: null, createdAt: new Date(Date.now() - 2 * HOUR - i * 60_000),
        });
      }
      await expect(request("budi@alpha.co")).resolves.toEqual({ sent: true });
      expect(prisma.clientPortalLoginCode.create).not.toHaveBeenCalled();
      expect(notifications.sendPortalLoginCode).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("daily limit"));

      // Codes older than 24h no longer count.
      codes.forEach((c) => (c.createdAt = new Date(Date.now() - 25 * HOUR)));
      await request("budi@alpha.co");
      expect(prisma.clientPortalLoginCode.create).toHaveBeenCalledTimes(1);
    });

    it(`locks verification after ${PORTAL_VERIFY_MAX_FAILURES} failures across codes, even for the right code`, async () => {
      // Fresh codes keep arriving (each dies after its own attempt budget),
      // but failures add up per email across all of them.
      let n = 0;
      while (failures.length < PORTAL_VERIFY_MAX_FAILURES) {
        const good = String(100000 + n++);
        seedCode("budi@alpha.co", good);
        const err = await verifyErr("budi@alpha.co", wrong(good));
        expect(err?.message).toBe(PORTAL_INVALID_CODE_MESSAGE);
      }
      const right = seedCode("budi@alpha.co", "424242");
      prisma.clientPortalLoginCode.findMany.mockClear();
      const err = await verifyErr("budi@alpha.co", "424242");
      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.message).toBe(PORTAL_INVALID_CODE_MESSAGE);
      // Locked requests never look at, or spend attempts on, the codes.
      expect(prisma.clientPortalLoginCode.findMany).not.toHaveBeenCalled();
      expect(right.attempts).toBe(0);
      expect(right.consumedAt).toBeNull();
    });

    it("locks unknown emails exactly like contacts (no enumeration via the lockout)", async () => {
      for (const email of ["budi@alpha.co", "nobody@nowhere.co"]) {
        for (let i = 0; i < PORTAL_VERIFY_MAX_FAILURES; i++) {
          const err = await verifyErr(email, "000000");
          expect(err?.message).toBe(PORTAL_INVALID_CODE_MESSAGE);
        }
      }
      expect(failures.filter((f) => f.email === "budi@alpha.co")).toHaveLength(PORTAL_VERIFY_MAX_FAILURES);
      expect(failures.filter((f) => f.email === "nobody@nowhere.co")).toHaveLength(PORTAL_VERIFY_MAX_FAILURES);
      prisma.clientPortalLoginCode.findMany.mockClear();
      for (const email of ["budi@alpha.co", "nobody@nowhere.co"]) {
        const err = await verifyErr(email, "123456");
        expect(err.message).toBe(PORTAL_INVALID_CODE_MESSAGE);
      }
      expect(prisma.clientPortalLoginCode.findMany).not.toHaveBeenCalled();
    });

    it("does not mail new codes while locked", async () => {
      for (let i = 0; i < PORTAL_VERIFY_MAX_FAILURES; i++) await verifyErr("budi@alpha.co", "000000");
      await request("budi@alpha.co");
      expect(prisma.clientPortalLoginCode.create).not.toHaveBeenCalled();
      expect(notifications.sendPortalLoginCode).not.toHaveBeenCalled();
    });

    it("lifts the lock once the failures are older than an hour, and prunes old rows", async () => {
      for (let i = 0; i < PORTAL_VERIFY_MAX_FAILURES; i++) {
        failures.push({ id: `old-${i}`, email: "budi@alpha.co", createdAt: new Date(Date.now() - HOUR - 1000) });
      }
      failures.push({ id: "ancient", email: "x@y.co", createdAt: new Date(Date.now() - 25 * HOUR) });
      seedCode("budi@alpha.co", "777777");
      await expect(service.verifyCode("budi@alpha.co", "777777")).resolves.toHaveProperty("token");

      // One more failure prunes rows past the 24h retention.
      await verifyErr("budi@alpha.co", "000000");
      expect(failures.some((f) => f.id === "ancient")).toBe(false);
      expect(failures.some((f) => f.id === "old-0")).toBe(true);
    });

    it("fewer than the threshold of failures still allows the right code", async () => {
      for (let i = 0; i < PORTAL_VERIFY_MAX_FAILURES - 1; i++) await verifyErr("budi@alpha.co", "000000");
      seedCode("budi@alpha.co", "565656");
      await expect(service.verifyCode("budi@alpha.co", "565656")).resolves.toHaveProperty("token");
    });

    it("malformed input is rejected without touching the database", async () => {
      for (const [e, c] of [["not-an-email", "123456"], ["budi@alpha.co", "12345"], ["budi@alpha.co", 123456]]) {
        const err = await verifyErr(e as string, c as string);
        expect(err.message).toBe(PORTAL_INVALID_CODE_MESSAGE);
      }
      expect(prisma.clientPortalLoginFailure.count).not.toHaveBeenCalled();
      expect(prisma.clientPortalLoginFailure.create).not.toHaveBeenCalled();
    });
  });

  describe("resolveSession", () => {
    const login = async () => {
      await request("budi@alpha.co");
      return (await service.verifyCode("budi@alpha.co", lastLoggedCode())).token;
    };

    it("accepts a fresh portal session", async () => {
      const session = await service.resolveSession(await login());
      expect(session?.email).toBe("budi@alpha.co");
      expect(session?.contacts.map((c) => c.clientId).sort()).toEqual(["client-a", "client-b"]);
    });

    it("rejects a staff JWT (signed with JWT_SECRET)", async () => {
      const staffToken = jwt.sign(
        { email: "admin@monomi.id", sub: "user-1", role: "ADMIN" },
        { secret: STAFF_SECRET, expiresIn: "15m" },
      );
      await expect(service.resolveSession(staffToken)).resolves.toBeNull();
    });

    it("rejects a portal-shaped token signed with the staff secret", async () => {
      const forged = jwt.sign(
        { sub: "budi@alpha.co", ver: { "ct-a": 0 } },
        { secret: STAFF_SECRET, audience: PORTAL_JWT_AUDIENCE, issuer: "monomi-client-portal", expiresIn: "1h" },
      );
      await expect(service.resolveSession(forged)).resolves.toBeNull();
    });

    it("rejects a token with the right secret but the wrong audience", async () => {
      const token = jwt.sign(
        { sub: "budi@alpha.co", ver: { "ct-a": 0 } },
        { secret: getPortalJwtSecret(), audience: "something-else", issuer: "monomi-client-portal", expiresIn: "1h" },
      );
      await expect(service.resolveSession(token)).resolves.toBeNull();
    });

    it("drops a contact whose tokenVersion was bumped, and rejects when none remain", async () => {
      const token = await login();
      contacts.find((c) => c.id === "ct-a")!.tokenVersion++;
      const partial = await service.resolveSession(token);
      expect(partial?.contacts.map((c) => c.clientId)).toEqual(["client-b"]);

      contacts.find((c) => c.id === "ct-b")!.tokenVersion++;
      await expect(service.resolveSession(token)).resolves.toBeNull();
    });

    it("rejects the session of a deactivated contact immediately", async () => {
      const token = await login();
      contacts.forEach((c) => (c.isActive = false));
      await expect(service.resolveSession(token)).resolves.toBeNull();
    });

    it("drops access when the client becomes internal or inactive", async () => {
      const token = await login();
      clients.find((c) => c.id === "client-a")!.isInternal = true;
      clients.find((c) => c.id === "client-b")!.status = "inactive";
      await expect(service.resolveSession(token)).resolves.toBeNull();
    });

    it("does not grant contacts created after login (re-login required)", async () => {
      const token = await login();
      clients.push({ id: "client-c", name: "Gamma", isInternal: false, status: "active" });
      contacts.push({ id: "ct-c", clientId: "client-c", email: "budi@alpha.co", name: "Budi C", isActive: true, tokenVersion: 0, lastLoginAt: null });
      const session = await service.resolveSession(token);
      expect(session?.contacts.map((c) => c.clientId)).not.toContain("client-c");
    });

    it.each([undefined, "", "garbage", 42])("rejects %p", async (token) => {
      await expect(service.resolveSession(token)).resolves.toBeNull();
    });
  });
});

describe("getPortalJwtSecret", () => {
  it("fails fast in production when PORTAL_JWT_SECRET is missing", () => {
    expect(() =>
      getPortalJwtSecret({ NODE_ENV: "production", JWT_SECRET: STAFF_SECRET } as any),
    ).toThrow(/PORTAL_JWT_SECRET is required/);
  });

  it("refuses a portal secret equal to JWT_SECRET", () => {
    expect(() =>
      getPortalJwtSecret({ NODE_ENV: "production", JWT_SECRET: STAFF_SECRET, PORTAL_JWT_SECRET: STAFF_SECRET } as any),
    ).toThrow(/must be different/);
  });

  it("refuses a short secret in production", () => {
    expect(() =>
      getPortalJwtSecret({ NODE_ENV: "production", PORTAL_JWT_SECRET: "short" } as any),
    ).toThrow(/at least 32/);
  });

  it.each([
    ["the .env.example value", "change-me-to-a-different-long-random-secret"],
    ["a change-me variant", "CHANGE-ME-please-0123456789abcdefghijklmnop"],
    ["a placeholder", "your_very_secure_jwt_secret_key_here_portal_x"],
    ["a single repeated character", "a".repeat(64)],
    ["a repeated pattern", "abcdefghij".repeat(5)],
    ["few distinct characters", "0101010110101101010010101010101011"],
  ])("refuses %s in production", (_label, value) => {
    expect(() =>
      getPortalJwtSecret({ NODE_ENV: "production", JWT_SECRET: STAFF_SECRET, PORTAL_JWT_SECRET: value } as any),
    ).toThrow(/PORTAL_JWT_SECRET looks like .*openssl rand -base64 48/);
  });

  it("accepts real random secrets in production (base64 and hex)", () => {
    const { randomBytes } = require("crypto");
    for (let i = 0; i < 50; i++) {
      for (const value of [
        randomBytes(48).toString("base64"),
        randomBytes(16).toString("hex"), // 32 hex chars, the minimum length
      ]) {
        expect(
          getPortalJwtSecret({ NODE_ENV: "production", JWT_SECRET: STAFF_SECRET, PORTAL_JWT_SECRET: value } as any),
        ).toBe(value);
      }
    }
  });

  it("does not apply the placeholder check outside production", () => {
    expect(
      getPortalJwtSecret({ NODE_ENV: "development", PORTAL_JWT_SECRET: "change-me-to-a-different-long-random-secret" } as any),
    ).toBe("change-me-to-a-different-long-random-secret");
  });

  it("in development derives a fallback that differs from JWT_SECRET", () => {
    const s = getPortalJwtSecret({ NODE_ENV: "development", JWT_SECRET: STAFF_SECRET } as any);
    expect(s).toBeTruthy();
    expect(s).not.toBe(STAFF_SECRET);
  });
});
