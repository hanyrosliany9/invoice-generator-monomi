import { BadRequestException } from "@nestjs/common";
import { ClientsService } from "./clients.service";
import {
  EXCLUDE_INTERNAL_CLIENTS,
  assertNotInternalClient,
} from "./client-scope";

/**
 * Minimal in-memory Prisma double. `$transaction` runs the callback with the
 * same client and (like the advisory lock) serialises concurrent callers.
 */
function makePrisma(initial: any[] = []) {
  const rows: any[] = [...initial];
  let lock: Promise<unknown> = Promise.resolve();
  const client = {
    findFirst: jest.fn(async ({ where }: any) =>
      rows.find((r) => (where?.isInternal === undefined ? true : r.isInternal === where.isInternal)) ?? null,
    ),
    create: jest.fn(async ({ data }: any) => {
      const row = { id: `c${rows.length + 1}`, createdAt: new Date(), ...data };
      rows.push(row);
      return row;
    }),
    findMany: jest.fn(async () => []),
    count: jest.fn(async () => 0),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const companySettings = {
    findUnique: jest.fn(async (_args?: any): Promise<any> => ({
      companyName: "PT Monomi Studio",
      email: "hello@monomi.id",
      phone: "+62 21 000",
      address: "Jakarta",
    })),
  };
  const tx = {
    client,
    $executeRaw: jest.fn(async () => 1),
  };
  const prisma: any = {
    client,
    companySettings,
    $transaction: jest.fn((fn: any) => {
      const run = lock.then(() => fn(tx));
      lock = run.catch(() => undefined);
      return run;
    }),
  };
  return { prisma, rows, client, companySettings };
}

describe("ClientsService internal client", () => {
  it("ensureInternalClient creates Monomi once, from company settings", async () => {
    const { prisma, rows } = makePrisma();
    const service = new ClientsService(prisma);

    const created = await service.ensureInternalClient();

    expect(created.name).toBe("Monomi");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      isInternal: true,
      company: "PT Monomi Studio",
      email: "hello@monomi.id",
    });
  });

  it("is idempotent across repeated and concurrent calls (no duplicates)", async () => {
    const { prisma, rows } = makePrisma();
    const service = new ClientsService(prisma);

    const results = await Promise.all([
      service.ensureInternalClient(),
      service.ensureInternalClient(),
      service.ensureInternalClient(),
    ]);
    await service.ensureInternalClient();

    expect(rows).toHaveLength(1);
    expect(new Set(results.map((r) => r.id)).size).toBe(1);
  });

  it("returns the existing internal client without creating", async () => {
    const { prisma, client } = makePrisma([
      { id: "m1", name: "Monomi", isInternal: true },
    ]);
    const service = new ClientsService(prisma);

    expect(await service.ensureInternalClient()).toMatchObject({ id: "m1", name: "Monomi" });
    expect(client.create).not.toHaveBeenCalled();
  });

  it("onApplicationBootstrap never throws", async () => {
    const { prisma, client } = makePrisma();
    client.findFirst.mockRejectedValue(new Error("db down"));
    await expect(new ClientsService(prisma).onApplicationBootstrap()).resolves.toBeUndefined();
  });

  it("getClientStats excludes internal clients", async () => {
    const { prisma, client } = makePrisma();
    await new ClientsService(prisma).getClientStats();
    expect(client.count).toHaveBeenCalledWith({ where: EXCLUDE_INTERNAL_CLIENTS });
    expect(client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: EXCLUDE_INTERNAL_CLIENTS }),
    );
  });

  it("findAll excludes internal by default and includes it on opt-in", async () => {
    const { prisma, client } = makePrisma([{ id: "m1", name: "Monomi", isInternal: true }]);
    const service = new ClientsService(prisma);

    await service.findAll(1, 10);
    expect((client.findMany.mock.calls as any[][])[0][0].where).toMatchObject({
      isInternal: false,
      status: "active",
    });

    await service.findAll(1, 10, undefined, undefined, true);
    const where = (client.findMany.mock.calls as any[][])[1][0].where;
    expect(where).not.toHaveProperty("isInternal");
  });

  it("findAll(includeInternal) still returns when ensureInternalClient fails", async () => {
    const { prisma, client } = makePrisma();
    client.findFirst.mockRejectedValue(new Error("column does not exist"));
    await expect(
      new ClientsService(prisma).findAll(1, 10, undefined, undefined, true),
    ).resolves.toBeDefined();
  });

  it("selects only needed company settings columns and ignores the default name", async () => {
    const { prisma, rows, companySettings } = makePrisma();
    companySettings.findUnique.mockResolvedValue({
      companyName: "PT Teknologi Indonesia",
      email: null,
      phone: null,
      address: null,
    });
    await new ClientsService(prisma).ensureInternalClient();
    expect(companySettings.findUnique.mock.calls[0][0].select).toEqual({
      companyName: true,
      email: true,
      phone: true,
      address: true,
    });
    expect(rows[0].company).toBe("Monomi");
  });

  it("refuses to delete the internal client", async () => {
    const { prisma, client } = makePrisma();
    const service = new ClientsService(prisma);
    jest.spyOn(service, "findOne").mockResolvedValue({ id: "m1", isInternal: true });
    await expect(service.remove("m1")).rejects.toBeInstanceOf(BadRequestException);
    expect(client.delete).not.toHaveBeenCalled();
  });

  it("update cannot toggle isInternal or deactivate the internal client", async () => {
    const { prisma, client } = makePrisma();
    const service = new ClientsService(prisma);
    jest.spyOn(service, "findOne").mockResolvedValue({ id: "m1", isInternal: true });
    client.update.mockResolvedValue({});

    await expect(service.update("m1", { status: "inactive" } as any)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    await service.update("m1", { isInternal: false, instagramHandle: "@monomi" } as any);
    expect(client.update).toHaveBeenCalledWith({
      where: { id: "m1" },
      data: { instagramHandle: "@monomi" },
    });
  });
});

describe("assertNotInternalClient", () => {
  it("rejects internal clients and allows normal ones", () => {
    expect(() => assertNotInternalClient({ isInternal: true })).toThrow(BadRequestException);
    expect(() => assertNotInternalClient({ isInternal: false })).not.toThrow();
    expect(() => assertNotInternalClient(null)).not.toThrow();
  });
});
